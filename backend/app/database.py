
# Import os to access environment variables, such as the database password.
import os

# Import Path to locate files and folders in our project.
from pathlib import Path

# Import psycopg to allow Python to communicate with PostgreSQL.
import psycopg

# Import load_dotenv to read environment variables from our .env file.
from dotenv import load_dotenv


# STEP 1: Locate the project's root directory.
# __file__ represents the current file (database.py).
# parents[0] = app folder
# parents[1] = backend folder
# parents[2] = Study_Companion root folder
PROJECT_ROOT = Path(__file__).resolve().parents[2]


# STEP 2: Load the environment variables.
# The .env file stores sensitive information, such as database passwords.
# This keeps passwords out of our Python source code.
load_dotenv(PROJECT_ROOT / ".env")


# STEP 3: Create a function to connect to PostgreSQL.
def get_database_connection():
    """
    Establish a connection to the Study Companion database.

    Returns:
        A PostgreSQL connection object.

    Raises:
        RuntimeError: If the database password is missing.
        psycopg.OperationalError: If the connection fails.
    """

    # Read the PostgreSQL password from the environment.
    password = os.getenv("POSTGRES_PASSWORD")

    # Stop if the password has not been configured.
    if not password:
        raise RuntimeError(
            "POSTGRES_PASSWORD is not set in the environment."
        )

    # STEP 4: Connect to the PostgreSQL database.
    connection = psycopg.connect(

        # PostgreSQL runs locally through Docker.
        host="127.0.0.1",

        # Default PostgreSQL port.
        port=5432,

        # Name of our Study Companion database.
        dbname="study_companion",

        # Username configured in compose.yaml.
        user="study_companion",

        # Password loaded securely from the environment.
        password=password,

        # Stop trying after 5 seconds if the server is unreachable.
        connect_timeout=5,
    )

    # STEP 5: Return the connection.
    # Other backend functions can use it to execute SQL queries.
    return connection
