
-- Study Companion - Development Seed Data
-- Purpose: Add minimal test data for local development.

BEGIN;

-- STEP 1: Create a test student.
-- Only insert the student if the email does not exist.
-- The password_hash value is a test placeholder,
-- NOT a real password hash or usable login credential.

INSERT INTO users (name, email, password_hash, role)
VALUES (
    'Demo Student',
    'demo.student@example.com',
    'NOT_A_REAL_PASSWORD_HASH',
    'STUDENT'
)
ON CONFLICT (email) DO NOTHING;


-- STEP 2: Create a sample course for that student.
-- Use the student's ID to establish the foreign key.
-- Avoid inserting the same demo course twice.

INSERT INTO courses (user_id, name, description)
SELECT
    id,
    'Introduction to Algorithms',
    'Sample course for Study Companion development'
FROM users
WHERE email = 'demo.student@example.com'
AND NOT EXISTS (
    SELECT 1
    FROM courses
    WHERE user_id = users.id
      AND name = 'Introduction to Algorithms'
);

-- STEP 3: Save both inserts permanently.
COMMIT;
