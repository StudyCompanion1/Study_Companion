
-- Study Companion
-- T1: Initial database schema

-- Enable UUID generation.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- TABLE 1: USERS
-- Stores basic information about each student.

CREATE TABLE IF NOT EXISTS users (

    -- Unique identifier for each user.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Student's name.
    name VARCHAR(255) NOT NULL,

    -- Each account must have a unique email.
    email VARCHAR(255) NOT NULL UNIQUE,

    -- Store a password hash, never the actual password.
    password_hash TEXT NOT NULL,

    -- User role in the application.
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT',

    -- Record when the account was created.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only allow roles defined by the class diagram.
    CONSTRAINT valid_user_role
        CHECK (role IN ('STUDENT', 'ADMIN', 'INSTRUCTOR'))
);


-- TABLE 2: COURSES
-- Each course belongs to one user.
-- One user can have multiple courses.

CREATE TABLE IF NOT EXISTS courses (

    -- Unique identifier for each course.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifies the user who owns the course.
    user_id UUID NOT NULL,

    -- Course name.
    name VARCHAR(255) NOT NULL,

    -- Optional course description.
    description TEXT,

    -- Record when the course was created.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Connect courses to users.
    CONSTRAINT fk_course_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);
