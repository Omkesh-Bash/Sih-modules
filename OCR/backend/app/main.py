from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from .gemini_service import (
    GeminiConfigurationError,
    GeminiExtractionError,
    extract_medical_document,
)
from .schemas import ExtractedRecord


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
EXTENSION_MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".pdf": "application/pdf",
}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
}
MAX_UPLOAD_BYTES = 20 * 1024 * 1024


app = FastAPI(
    title="Medical Document OCR API",
    description="Extracts structured clinical data from prescriptions and lab reports.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/extract-document", response_model=ExtractedRecord)
async def extract_document(file: UploadFile = File(...)) -> ExtractedRecord:
    extension = Path(file.filename or "").suffix.lower()
    content_type = file.content_type or ""

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Upload a .jpg, .png, or .pdf file.")
    if content_type not in ALLOWED_MIME_TYPES and content_type not in {"", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    mime_type = content_type if content_type in ALLOWED_MIME_TYPES else EXTENSION_MIME_TYPES[extension]

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 20 MB prototype limit.")

    try:
        return await run_in_threadpool(extract_medical_document, file_bytes, mime_type)
    except GeminiConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GeminiExtractionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
