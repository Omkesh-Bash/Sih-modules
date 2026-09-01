# Medical OCR Module

A focused OCR module for extracting structured clinical data from prescriptions and lab reports. This module is designed to work as a standalone feature inside a larger project and can also be run independently for local development and demo purposes.

## Overview

This project combines:

- A FastAPI backend for document upload and extraction
- A React + Vite frontend for previewing uploaded documents and reviewing extracted results
- Google Gemini for OCR and structured clinical data extraction

It is intended for workflows such as:

- extracting medications from prescriptions
- reading lab test values and reference ranges
- identifying diagnoses or clinical notes from uploaded documents
- highlighting ambiguous or unreadable text for human review

## What this module does

The application accepts a medical document image or PDF, sends it to the backend, and returns a structured JSON payload with fields like:

- `document_type`
- `diagnoses`
- `medications`
- `lab_investigations`
- `unclear_or_illegible_segments`
- `overall_confidence`

This makes it suitable for review dashboards, doctor-facing interfaces, or downstream clinical data processing pipelines.

## Project structure

```text
OCR/
├── README.md
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── gemini_service.py
│   │   ├── main.py
│   │   └── schemas.py
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        └── main.jsx
```

## Tech stack

- Python 3.11+
- FastAPI
- Pydantic v2
- Google GenAI SDK
- React 19
- Vite
- Tailwind CSS

## Prerequisites

Before running this module locally, make sure you have:

- Python installed
- Node.js and npm installed
- A Google Gemini API key

## Environment setup

Create a `.env` file inside the backend folder and add your own Gemini API key:

```bash
cd backend
cat > .env <<'EOF'
GEMINI_API_KEY=your_own_google_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
EOF
```

Important:

- Replace `your_own_google_gemini_api_key_here` with your actual Gemini API key.
- Use a valid Gemini model name supported by Google AI. For example: `gemini-2.5-flash` or another model available in your Google AI account.
- The backend reads `GEMINI_API_KEY` from `.env` automatically.
- Do not export a different `GEMINI_API_KEY` in your shell if you want the `.env` value to be used.
- If you use a different environment variable name, update the code accordingly.

## Run the backend locally

```bash
cd OCR/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will run at:

- http://localhost:8000

### Backend API

- `GET /api/health` — checks backend health
- `POST /api/extract-document` — uploads a document and returns extracted JSON

Accepted file types:

- `.jpg`
- `.jpeg`
- `.png`
- `.pdf`

Maximum upload size: 20 MB

## Run the frontend locally

Open a new terminal and run:

```bash
cd OCR/frontend
npm install
npm run dev
```

Then open:

- http://localhost:5173

If your backend is not running on the default url, set the frontend environment variable:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

You can configure this in your local shell or in a `.env` file in the frontend project if needed.

## Example API request

A sample request is sent as multipart form data with a file named `document.pdf`:

```bash
curl -X POST "http://localhost:8000/api/extract-document" \
  -F "file=@/path/to/document.pdf"
```

Example response structure:

```json
{
  "document_type": "printed_lab_report",
  "diagnoses": ["Hypertension"],
  "medications": [
    {
      "name": "Amlodipine",
      "dosage": "5 mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "instructions": "After breakfast"
    }
  ],
  "lab_investigations": [
    {
      "test_name": "Hemoglobin",
      "observed_value": "12.8 g/dL",
      "reference_range": "13-17 g/dL",
      "abnormal_flag": false
    }
  ],
  "unclear_or_illegible_segments": [],
  "overall_confidence": 0.92
}
```

## Notes for this module

This repository is a module inside a larger system, not a complete end-to-end application by itself. It is meant to be integrated into a larger project or used as a reusable feature for:

- healthcare dashboards
- document review workflows
- clinical automation tools
- AI-assisted record extraction systems

## Recommended local development flow

1. Start the backend
2. Start the frontend
3. Upload a prescription or report image/PDF from the UI
4. Review the structured output and verify the extracted fields
5. Integrate the backend endpoint into a bigger application flow if needed

## License

This project is currently structured as a module for internal development and may be updated with a specific license later depending on the overall project ownership and deployment requirements.

## Maintainer

This module is intended to be used within the broader SIH project and may be connected to other application modules as part of the larger solution.
