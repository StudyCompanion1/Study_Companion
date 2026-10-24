"""Database-level tests for the SQLModel tables in app/models.

Most of these models have no API routes yet, so they're tested straight against the database.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

import app.models
from app.models import (
    AccessibilityPreferences,
    ChatMessage,
    ContrastPolarity,
    CourseMaterial,
    FileType,
    Highlight,
    Note,
    ProgressLog,
    StudyGroup,
    StudyGroupMember,
    User,
    UserRole,
)


@pytest.fixture
def db():
    """Like the shared `session` fixture, but with foreign keys enforced.

    SQLite ignores foreign keys unless asked, so without this the ondelete rules never run.
    """
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def add(db, obj):
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def make_user(db, email="maya@example.com", **kwargs):
    return add(db, User(name="Maya", email=email, password_hash="hash", **kwargs))


def make_material(db, user, title="Lecture 1"):
    return add(db, CourseMaterial(user_id=user.id, title=title, file_type=FileType.PDF, file_path="uploads/l1.pdf"))


def count(db, model):
    return len(db.exec(select(model)).all())


# Registration of tables


def test_every_table_is_registered():
    assert set(SQLModel.metadata.tables) >= {
        "users",
        "course_materials",
        "notes",
        "highlights",
        "progress_logs",
        "accessibility_preferences",
        "study_groups",
        "study_group_members",
        "chat_messages",
    }


def test_models_package_exports_every_table():
    exported = {getattr(app.models, name) for name in app.models.__all__}
    table_models = {m.class_ for m in SQLModel._sa_registry.mappers if m.class_.__module__.startswith("app.models")}
    assert table_models <= exported


# User


def test_user_defaults(db):
    user = make_user(db)

    assert isinstance(user.id, uuid.UUID)
    assert user.role == UserRole.STUDENT
    assert user.created_at is not None


def test_new_rows_get_distinct_ids(db):
    assert make_user(db, "a@example.com").id != make_user(db, "b@example.com").id


def test_user_email_is_unique(db):
    make_user(db)

    with pytest.raises(IntegrityError):
        make_user(db)


@pytest.mark.parametrize("role", list(UserRole))
def test_user_role_round_trips(db, role):
    user_id = make_user(db, role=role).id
    db.expire_all()

    assert db.get(User, user_id).role == role


def test_deleting_user_removes_everything_they_own(db):
    user = make_user(db)
    material = make_material(db, user)
    group = add(db, StudyGroup(name="Algebra"))
    add(db, Note(user_id=user.id, material_id=material.id, text="note"))
    add(db, Highlight(user_id=user.id, material_id=material.id, text_snippet="snippet"))
    add(db, ProgressLog(user_id=user.id, material_id=material.id))
    add(db, AccessibilityPreferences(user_id=user.id))
    add(db, StudyGroupMember(group_id=group.id, user_id=user.id))
    add(db, ChatMessage(group_id=group.id, user_id=user.id, content="hi"))

    db.delete(user)
    db.commit()

    for model in (CourseMaterial, Note, Highlight, ProgressLog, AccessibilityPreferences, StudyGroupMember, ChatMessage):
        assert count(db, model) == 0, model.__name__
    assert count(db, StudyGroup) == 1  # groups aren't owned by one user


def test_deleting_user_leaves_other_users_data_alone(db):
    maya = make_user(db, "maya@example.com")
    sam = make_user(db, "sam@example.com")
    make_material(db, sam)

    db.delete(maya)
    db.commit()

    assert count(db, CourseMaterial) == 1


# CourseMaterial


@pytest.mark.parametrize("file_type", list(FileType))
def test_material_file_type_round_trips(db, file_type):
    user = make_user(db)
    material = add(db, CourseMaterial(user_id=user.id, title="t", file_type=file_type, file_path="p"))
    db.expire_all()

    assert db.get(CourseMaterial, material.id).file_type == file_type


def test_material_needs_an_existing_user(db):
    with pytest.raises(IntegrityError):
        add(db, CourseMaterial(user_id=uuid.uuid4(), title="t", file_type=FileType.TXT, file_path="p"))


def test_deleting_material_removes_its_highlights_and_progress(db):
    user = make_user(db)
    material = make_material(db, user)
    add(db, Highlight(user_id=user.id, material_id=material.id, text_snippet="snippet"))
    add(db, ProgressLog(user_id=user.id, material_id=material.id))

    db.delete(material)
    db.commit()

    assert count(db, Highlight) == 0
    assert count(db, ProgressLog) == 0
    assert count(db, User) == 1


@pytest.mark.xfail(strict=True, reason="max_length isn't enforced by table models or SQLite")
def test_material_title_longer_than_200_is_rejected(db):
    user = make_user(db)

    with pytest.raises(Exception):
        make_material(db, user, title="x" * 201)


# Note


def test_note_without_material(db):
    user = make_user(db)
    note = add(db, Note(user_id=user.id, text="standalone"))

    assert note.material_id is None


def test_note_survives_material_deletion(db):
    user = make_user(db)
    material = make_material(db, user)
    note = add(db, Note(user_id=user.id, material_id=material.id, text="keep me"))

    db.delete(material)
    db.commit()
    db.refresh(note)

    assert note.material_id is None
    assert note.text == "keep me"


def test_note_needs_an_existing_material_when_given(db):
    user = make_user(db)

    with pytest.raises(IntegrityError):
        add(db, Note(user_id=user.id, material_id=uuid.uuid4(), text="t"))


# Highlight


def test_highlight_needs_an_existing_material(db):
    user = make_user(db)

    with pytest.raises(IntegrityError):
        add(db, Highlight(user_id=user.id, material_id=uuid.uuid4(), text_snippet="s"))


def test_highlight_needs_an_existing_user(db):
    owner = make_user(db)
    material = make_material(db, owner)

    with pytest.raises(IntegrityError):
        add(db, Highlight(user_id=uuid.uuid4(), material_id=material.id, text_snippet="s"))


# ProgressLog


def test_progress_defaults_to_zero(db):
    user = make_user(db)
    log = add(db, ProgressLog(user_id=user.id, material_id=make_material(db, user).id))

    assert log.completion_percentage == 0.0


def test_one_progress_log_per_user_per_material(db):
    user = make_user(db)
    material = make_material(db, user)
    add(db, ProgressLog(user_id=user.id, material_id=material.id))

    with pytest.raises(IntegrityError):
        add(db, ProgressLog(user_id=user.id, material_id=material.id))


def test_progress_logs_allowed_for_other_pairs(db):
    maya = make_user(db, "maya@example.com")
    sam = make_user(db, "sam@example.com")
    lecture1 = make_material(db, maya, "Lecture 1")
    lecture2 = make_material(db, maya, "Lecture 2")

    add(db, ProgressLog(user_id=maya.id, material_id=lecture1.id))
    add(db, ProgressLog(user_id=maya.id, material_id=lecture2.id))
    add(db, ProgressLog(user_id=sam.id, material_id=lecture1.id))

    assert count(db, ProgressLog) == 3


@pytest.mark.xfail(strict=True, reason="0 to 100 range isn't enforced yet")
def test_progress_over_100_is_rejected(db):
    user = make_user(db)

    with pytest.raises(Exception):
        add(db, ProgressLog(user_id=user.id, material_id=make_material(db, user).id, completion_percentage=250))


# AccessibilityPreferences


def test_preferences_defaults(db):
    prefs = add(db, AccessibilityPreferences(user_id=make_user(db).id))

    assert prefs.font_size == 16
    assert prefs.font_family == "system-ui"
    assert prefs.line_spacing == 1.5
    assert prefs.contrast_polarity == ContrastPolarity.LIGHT


def test_one_preferences_row_per_user(db):
    user = make_user(db)
    add(db, AccessibilityPreferences(user_id=user.id))

    with pytest.raises(IntegrityError):
        add(db, AccessibilityPreferences(user_id=user.id, font_size=20))


@pytest.mark.parametrize("polarity", list(ContrastPolarity))
def test_contrast_polarity_round_trips(db, polarity):
    prefs = add(db, AccessibilityPreferences(user_id=make_user(db).id, contrast_polarity=polarity))
    db.expire_all()

    assert db.get(AccessibilityPreferences, prefs.id).contrast_polarity == polarity


# StudyGroup, StudyGroupMember, ChatMessage


def test_user_cannot_join_same_group_twice(db):
    user = make_user(db)
    group = add(db, StudyGroup(name="Algebra"))
    add(db, StudyGroupMember(group_id=group.id, user_id=user.id))

    with pytest.raises(IntegrityError):
        add(db, StudyGroupMember(group_id=group.id, user_id=user.id))


def test_membership_is_many_to_many(db):
    maya = make_user(db, "maya@example.com")
    sam = make_user(db, "sam@example.com")
    algebra = add(db, StudyGroup(name="Algebra"))
    biology = add(db, StudyGroup(name="Biology"))

    for group in (algebra, biology):
        for user in (maya, sam):
            add(db, StudyGroupMember(group_id=group.id, user_id=user.id))

    maya_groups = db.exec(select(StudyGroupMember).where(StudyGroupMember.user_id == maya.id)).all()
    algebra_members = db.exec(select(StudyGroupMember).where(StudyGroupMember.group_id == algebra.id)).all()
    assert len(maya_groups) == 2
    assert len(algebra_members) == 2


def test_membership_needs_an_existing_group(db):
    user = make_user(db)

    with pytest.raises(IntegrityError):
        add(db, StudyGroupMember(group_id=uuid.uuid4(), user_id=user.id))


def test_deleting_group_removes_members_and_messages_but_not_users(db):
    user = make_user(db)
    group = add(db, StudyGroup(name="Algebra"))
    add(db, StudyGroupMember(group_id=group.id, user_id=user.id))
    add(db, ChatMessage(group_id=group.id, user_id=user.id, content="hi"))

    db.delete(group)
    db.commit()

    assert count(db, StudyGroupMember) == 0
    assert count(db, ChatMessage) == 0
    assert count(db, User) == 1


def test_chat_messages_listed_per_group_in_order(db):
    user = make_user(db)
    algebra = add(db, StudyGroup(name="Algebra"))
    biology = add(db, StudyGroup(name="Biology"))
    start = datetime.now(UTC)
    add(db, ChatMessage(group_id=algebra.id, user_id=user.id, content="second", created_at=start + timedelta(seconds=1)))
    add(db, ChatMessage(group_id=algebra.id, user_id=user.id, content="first", created_at=start))
    add(db, ChatMessage(group_id=biology.id, user_id=user.id, content="other group"))

    messages = db.exec(
        select(ChatMessage).where(ChatMessage.group_id == algebra.id).order_by(ChatMessage.created_at)
    ).all()

    assert [m.content for m in messages] == ["first", "second"]
