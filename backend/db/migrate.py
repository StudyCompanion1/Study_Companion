
# Study Companion - Database Migration Runner
# Applies versioned SQL files and records successful migrations.

from pathlib import Path
from psycopg import sql
from app.database import get_database_connection


# Find the folder containing this script.
DB_DIR = Path(__file__).resolve().parent

# Find numbered SQL migration files.
MIGRATIONS = sorted(DB_DIR.glob("[0-9][0-9][0-9]_*.sql"))


def run_migrations():
    # Open a connection to PostgreSQL.
    with get_database_connection() as conn:

        # Create the migration tracking table if missing.
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(50) PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)

        # Commit the tracking table before processing migrations.
        conn.commit()

        for migration in MIGRATIONS:
            version = migration.stem

            # Check whether this migration was already applied.
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM schema_migrations WHERE version = %s",
                    (version,)
                )

                if cursor.fetchone():
                    print(f"Skipping {version}: already applied")
                    continue

            # Apply migration and record its version together.
            # If either operation fails, both are rolled back.
            with conn.transaction():
                with conn.cursor() as cursor:
                    cursor.execute(migration.read_text(encoding="utf-8"))
                    cursor.execute(
                        "INSERT INTO schema_migrations (version) VALUES (%s)",
                        (version,)
                    )

            print(f"Applied migration: {version}")


if __name__ == "__main__":
    run_migrations()
