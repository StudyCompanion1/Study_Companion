# backend/app/main.py
import os
import tempfile
import shutil

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ai_processing.keyword_concept_extraction import analyze_pdf

app = FastAPI()

# react / vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# health check
@app.get("/api/health")
def health():
    return {"status": "ok"}


# pdf analysis call
@app.post("/api/analyze")
def analyze(file: UploadFile = File(...)):

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF"
        )

    pdf_path = None

    try:
        # saves uploaded PDF temporarily
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".pdf"
        ) as temp:
            pdf_path = temp.name
            shutil.copyfileobj(file.file, temp)

        # call pdf llm function
        result = analyze_pdf(pdf_path)

        # return output
        return {"result": result}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        file.file.close()
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)
