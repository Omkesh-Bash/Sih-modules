import os
from functools import lru_cache
from typing import Any

from google import genai
from google.genai import types
from dotenv import load_dotenv

from .schemas import ExtractedRecord


load_dotenv(override=True)

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

SYSTEM_INSTRUCTION = (
    "You are a careful clinical document extraction assistant for a doctor review workflow. "
    "Extract medical entities accurately. If doctor handwriting is ambiguous, DO NOT guess. "
    "Record illegible phrases in unclear_or_illegible_segments and lower the overall_confidence."
)

USER_PROMPT = """
Extract the clinical data from this uploaded medical document.

Rules:
- Return only facts visible in the document.
- Use empty strings for medication or lab fields that are present as rows/items but unreadable.
- Use empty arrays when a category is not present.
- Mark abnormal_flag true only when the result is explicitly marked abnormal or is clearly outside the printed reference range.
- Put any ambiguous handwriting, smudged values, cropped text, or unreadable phrases in unclear_or_illegible_segments.
- Set overall_confidence below 0.85 whenever any clinically important value is uncertain.
"""


class GeminiConfigurationError(RuntimeError):
    pass


class GeminiExtractionError(RuntimeError):
    pass


def _gemini_response_schema() -> dict[str, Any]:
    schema = ExtractedRecord.model_json_schema()

    def remove_unsupported_fields(value: Any) -> None:
        if isinstance(value, dict):
            value.pop("additionalProperties", None)
            for child in value.values():
                remove_unsupported_fields(child)
        elif isinstance(value, list):
            for child in value:
                remove_unsupported_fields(child)

    remove_unsupported_fields(schema)
    return schema


@lru_cache(maxsize=1)
def get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise GeminiConfigurationError(
            "Set GEMINI_API_KEY or GOOGLE_API_KEY before calling the extraction endpoint."
        )
    return genai.Client(api_key=api_key)


def extract_medical_document(file_bytes: bytes, mime_type: str) -> ExtractedRecord:
    try:
        response = get_client().models.generate_content(
            model=MODEL_NAME,
            contents=[
                types.Part.from_text(text=USER_PROMPT),
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0,
                response_mime_type="application/json",
                response_schema=_gemini_response_schema(),
            ),
        )
    except GeminiConfigurationError:
        raise
    except Exception as exc:
        raise GeminiExtractionError(f"Gemini extraction failed: {exc}") from exc

    try:
        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, ExtractedRecord):
            return parsed
        if isinstance(parsed, dict):
            return ExtractedRecord.model_validate(parsed)

        response_text = getattr(response, "text", None)
        if not response_text:
            raise ValueError("Gemini response did not include parsed JSON or text.")
        return ExtractedRecord.model_validate_json(response_text)
    except Exception as exc:
        raise GeminiExtractionError(f"Gemini returned data that did not match the schema: {exc}") from exc
