"""Exercise real document readers; replace only remote AI calls."""

from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, call

import pymupdf
import pytest
from docx import Document
from PIL import Image, UnidentifiedImageError
from pptx import Presentation
from pptx.util import Inches

from ai_processing import keyword_concept_extraction as ai
from tests.material_files import image_bytes


@pytest.fixture(autouse=True)
def no_external_ai(monkeypatch):
    # A missed mock must fail locally rather than use the developer's API key.
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr("ai_processing.utils.retry_ai_decorator.time.sleep", lambda _: None)


def test_gemini_requires_configuration():
    with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
        ai.get_gemini_client()


def test_gemini_client_uses_configured_key(monkeypatch):
    constructor = Mock()
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(ai.genai, "Client", constructor)
    assert ai.get_gemini_client() is constructor.return_value
    constructor.assert_called_once_with(api_key="test-key")


@pytest.mark.parametrize("first", [RuntimeError("rate limited"), SimpleNamespace(text="  ")])
def test_generation_falls_back_after_error_or_empty_response(monkeypatch, first):
    client = MagicMock()
    client.__enter__.return_value = client
    client.models.generate_content.side_effect = [first, SimpleNamespace(text="  Explanation  ")]
    monkeypatch.setattr(ai, "get_gemini_client", lambda: client)
    assert ai._generate_with_fallback("source") == "Explanation"
    assert client.models.generate_content.call_args_list == [
        call(model=ai.MODEL, contents="source"),
        call(model=ai.FALLBACK_MODEL[0], contents="source"),
    ]
    client.__exit__.assert_called_once()


def test_primary_model_success_does_not_call_fallback(monkeypatch):
    client = MagicMock()
    client.__enter__.return_value = client
    client.models.generate_content.return_value.text = "Answer"
    monkeypatch.setattr(ai, "get_gemini_client", lambda: client)
    assert ai._generate_with_fallback("source") == "Answer"
    client.models.generate_content.assert_called_once_with(model=ai.MODEL, contents="source")


def test_all_models_failing_preserves_cause_and_closes_client(monkeypatch):
    client = MagicMock()
    client.__enter__.return_value = client
    error = RuntimeError("provider unavailable")
    client.models.generate_content.side_effect = error
    monkeypatch.setattr(ai, "get_gemini_client", lambda: client)
    with pytest.raises(RuntimeError, match="All Gemini models failed") as caught:
        ai._generate_with_fallback("source")
    assert caught.value.__cause__ is error
    assert client.models.generate_content.call_count == 1 + len(ai.FALLBACK_MODEL)
    client.__exit__.assert_called_once()


@pytest.mark.parametrize("extension,mime", [(".png", ""), (".unknown", "image/png")])
def test_supported_images_are_passed_through(extension, mime):
    data = image_bytes()
    assert ai._normalize_image(data, extension, mime) == (data, "image/png")


def test_bitmap_is_converted_to_readable_png():
    data, mime = ai._normalize_image(image_bytes("BMP"), ".bmp")
    assert mime == "image/png"
    with Image.open(BytesIO(data)) as image:
        assert (image.format, image.mode, image.size) == ("PNG", "RGB", (40, 30))


def test_empty_image_is_rejected():
    with pytest.raises(ValueError, match="empty"):
        ai._normalize_image(b"", ".png")


@pytest.mark.parametrize("result,expected", [("OCR text", "OCR text"), ("NO_TEXT_FOUND", "")])
def test_ocr_sends_image_and_handles_no_text(monkeypatch, result, expected):
    generate = Mock(return_value=result)
    monkeypatch.setattr(ai, "_generate_with_fallback", generate)
    data = image_bytes()
    assert ai._ocr_image(data, ".png") == expected
    part = generate.call_args.kwargs["contents"][1]
    assert part.inline_data.data == data
    assert part.inline_data.mime_type == "image/png"


@pytest.mark.parametrize("error", [ValueError("bad"), OSError("bad"), UnidentifiedImageError("bad")])
def test_unreadable_embedded_images_do_not_discard_document(monkeypatch, error):
    monkeypatch.setattr(ai, "_ocr_image", Mock(side_effect=error))
    assert ai._ocr_embedded_image(b"bad", "picture.png") == ""


def test_pdf_uses_text_first_and_ocr_for_sparse_pages(tmp_path, monkeypatch):
    path = tmp_path / "lecture.pdf"
    with pymupdf.open() as pdf:
        pdf.new_page().insert_text((30, 40), "Photosynthesis converts sunlight into chemical energy in plants.")
        pdf.new_page().insert_text((30, 40), "Diagram")
        pdf.new_page()
        pdf.save(path)
    ocr = Mock(side_effect=["Diagram transcription", ""])
    monkeypatch.setattr(ai, "_ocr_image", ocr)
    text = ai.extract_document_text(str(path))
    assert "[Page 1]\nPhotosynthesis" in text
    assert "[Page 2]\nDiagram transcription" in text
    assert "[Page 3]" not in text
    assert ocr.call_count == 2
    assert all(args.args[0].startswith(b"\x89PNG") for args in ocr.call_args_list)


def test_pdf_keeps_sparse_text_when_ocr_finds_nothing(tmp_path, monkeypatch):
    path = tmp_path / "sparse.pdf"
    with pymupdf.open() as pdf:
        pdf.new_page().insert_text((30, 40), "Title")
        pdf.save(path)
    monkeypatch.setattr(ai, "_ocr_image", lambda *_: "")
    assert ai.extract_document_text(str(path)) == "[Page 1]\nTitle"


def test_word_preserves_paragraph_table_order_and_reads_embedded_images(tmp_path, monkeypatch):
    path = tmp_path / "notes.docx"
    document = Document()
    document.add_paragraph("Before table")
    table = document.add_table(rows=2, cols=2)
    table.cell(0, 0).text = "Term"
    table.cell(0, 1).text = "Definition"
    document.add_paragraph("After table")
    document.add_picture(BytesIO(image_bytes()))
    document.save(path)
    ocr = Mock(return_value="Diagram label")
    monkeypatch.setattr(ai, "_ocr_embedded_image", ocr)
    assert ai.extract_document_text(str(path)) == (
        "Before table\nTerm | Definition\nAfter table\n[Text in embedded image]\nDiagram label"
    )
    assert ocr.call_args.args[0] == image_bytes()


def test_powerpoint_reads_grouped_text_tables_images_and_skips_empty_slides(tmp_path, monkeypatch):
    path = tmp_path / "slides.pptx"
    deck = Presentation()
    slide = deck.slides.add_slide(deck.slide_layouts[6])
    group = slide.shapes.add_group_shape()
    group.shapes.add_textbox(0, 0, Inches(2), Inches(1)).text = "Grouped heading"
    table = slide.shapes.add_table(1, 2, 0, 0, Inches(4), Inches(1)).table
    table.cell(0, 0).text, table.cell(0, 1).text = "Cell", "Function"
    slide.shapes.add_picture(BytesIO(image_bytes()), 0, 0)
    deck.slides.add_slide(deck.slide_layouts[6])
    deck.save(path)
    monkeypatch.setattr(ai, "_ocr_embedded_image", lambda *_: "Cell diagram")
    assert ai.extract_document_text(str(path)) == (
        "[Slide 1]\nGrouped heading\nCell | Function\n[Text in slide image]\nCell diagram"
    )


def test_text_reader_accepts_bom_and_rejects_empty_or_unsupported_files(tmp_path):
    path = tmp_path / "notes.TXT"
    path.write_text("  Biology notes  ", encoding="utf-8-sig")
    assert ai.extract_document_text(str(path)) == "Biology notes"
    path.write_text(" \n ")
    with pytest.raises(ValueError, match="No readable text"):
        ai.extract_document_text(str(path))
    with pytest.raises(ValueError, match="Unsupported"):
        ai.extract_document_text(str(tmp_path / "notes.exe"))


def test_standalone_image_is_sent_to_ocr(tmp_path, monkeypatch):
    path = tmp_path / "diagram.png"
    path.write_bytes(image_bytes())
    ocr = Mock(return_value="  Diagram text  ")
    monkeypatch.setattr(ai, "_ocr_image", ocr)
    assert ai.extract_document_text(str(path)) == "Diagram text"
    ocr.assert_called_once_with(path.read_bytes(), ".png")


@pytest.mark.parametrize("processor,instructions", [
    (ai.analyze_pdf, ai.SUMMARY_PROMPT), (ai.generate_study_guide, ai.GUIDE_PROMPT),
])
def test_generation_includes_real_document_and_correct_instructions(tmp_path, monkeypatch, processor, instructions):
    path = tmp_path / "notes.txt"
    path.write_text("Mitochondria produce ATP.")
    generate = Mock(return_value="Generated study material")
    monkeypatch.setattr(ai, "_generate_with_fallback", generate)
    assert processor(str(path)) == "Generated study material"
    prompt = generate.call_args.kwargs["contents"]
    assert instructions in prompt
    assert "<document>\nMitochondria produce ATP.\n</document>" in prompt
