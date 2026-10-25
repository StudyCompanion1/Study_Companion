
# Study Companion — Database Initialization

## Overview

This directory contains the initial PostgreSQL schema
for the Study Companion backend.

## Technology

- PostgreSQL 17
- Docker Compose
- Python / FastAPI
- psycopg 3
- python-dotenv

## Initial Tables

### users
Stores basic user account information.

### courses
Stores courses associated with users.

Relationship:
- One user can own multiple courses.
- Each course references a user through user_id.

## Setup Instructions

Run these commands from the repository root.

### 1. Start PostgreSQL

docker compose up -d

### 2. Initialize the schema

Get-Content .\backend\db\001_initial_schema.sql -Raw |
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U study_companion -d study_companion

Note: The command above is for Windows PowerShell.

### 3. Verify tables

docker compose exec db psql -U study_companion -d study_companion -c "\dt"

Expected tables:
- users
- courses

## Testing

Verified:
- PostgreSQL connection from Python
- Table creation
- User and course insertion
- JOIN between users and courses
- Transaction rollback
- Foreign key constraint enforcement

## Security

- Never commit the .env file.
- Store database passwords in environment variables.
- Store password hashes, never plaintext passwords.

## Current Scope

This is the initial database foundation for T1.

Additional tables will be added as the Study Companion
application develops.

## Database Migration

Run migrations from the backend directory:

    uv run python -m db.migrate

The migration runner:
- Finds numbered SQL migration files.
- Checks the schema_migrations table.
- Applies migrations that have not been recorded.
- Records successfully applied migrations.
- Skips migrations that have already been applied.

## Verification

The initial database schema was tested on a separate
PostgreSQL database.

Verified:
- Successful creation of users and courses tables.
- Successful INSERT and JOIN operations.
- Foreign key constraint enforcement.
- Transaction rollback.
- Repeatable seed data insertion.
- Migration version tracking.

