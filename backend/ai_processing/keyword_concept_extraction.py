# backend/ai_processing/keyword_concept_extraction.py
import os
from pathlib import Path
import pymupdf
from dotenv import load_dotenv
from google import genai

# config
PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env", override=True)

API_KEY = os.getenv("GEMINI_API_KEY")
PDF_PATH = os.getenv("PDF_PATH")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=API_KEY)


# pdf analysis
def analyze_pdf(pdf_path: str) -> str:
    """
    INPUT:
        pdf_path: Path to the PDF file

    OUTPUT:
        str: Generated keywords and key concepts
    """

    # Extract text from PDF
    with pymupdf.open(pdf_path) as pdf:
        text = "\n".join(
            page.get_text() for page in pdf
        )

    if not text.strip():
        raise ValueError("No readable text found in PDF.")

    # Generate keywords and concepts
    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=f"""
You are an AI study assistant.

Analyze the following study material.

Extract:

KEYWORDS:
- Important keywords with short definitions.

KEY CONCEPTS:
- Main concepts with simple explanations.

Only use information from the document.

DOCUMENT:
{text}
"""
    )

    if not response.text:
        raise ValueError("Gemini returned an empty response.")

    return response.text


# local QA testing
if __name__ == "__main__":

    if not PDF_PATH:
        raise ValueError("PDF_PATH not found in .env")

    result = analyze_pdf(PDF_PATH)

    print(result)
