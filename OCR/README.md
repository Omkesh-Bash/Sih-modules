# Medical OCR Module

Hackathon prototype for extracting structured clinical data from prescriptions and lab reports with FastAPI, React, and Google Gemini.

## Backend

```bash
cd /home/omkesh/Desktop/Granding/Projects/SIH/47/modules/OCR/backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend loads `GEMINI_API_KEY` from the local `.env` file. Do not export a different `GEMINI_API_KEY` in the terminal, because shell variables take precedence over `.env`.

API:

- `GET /api/health`
- `POST /api/extract-document` with multipart field `file`

The extraction endpoint accepts `.jpg`, `.jpeg`, `.png`, and `.pdf` files up to 20 MB. It returns the strict `ExtractedRecord` Pydantic schema.

## Frontend

```bash
cd /home/omkesh/Desktop/Granding/Projects/SIH/47/modules/OCR/frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Set `VITE_API_BASE_URL` if the FastAPI server runs somewhere other than `http://localhost:8000`.

## Schema

The backend uses one Pydantic schema source for Gemini structured output and FastAPI response validation:

- `Medication`: `name`, `dosage`, `frequency`, `duration`, `instructions`
- `LabInvestigation`: `test_name`, `observed_value`, `reference_range`, `abnormal_flag`
- `ExtractedRecord`: `document_type`, `diagnoses`, `medications`, `lab_investigations`, `unclear_or_illegible_segments`, `overall_confidence`
