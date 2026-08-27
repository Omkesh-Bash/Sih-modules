from pydantic import BaseModel, ConfigDict, Field


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Medication(StrictBaseModel):
    name: str = Field(description="Medication or drug name as written on the document.")
    dosage: str = Field(description="Dose strength or quantity, for example 500 mg or 1 tablet.")
    frequency: str = Field(description="How often the medication should be taken.")
    duration: str = Field(description="How long the medication should be taken.")
    instructions: str = Field(description="Additional administration or safety instructions.")


class LabInvestigation(StrictBaseModel):
    test_name: str = Field(description="Name of the laboratory test or investigation.")
    observed_value: str = Field(description="Observed result value with units when visible.")
    reference_range: str = Field(description="Reference range with units when visible.")
    abnormal_flag: bool = Field(description="True when the value is marked abnormal or outside range.")


class ExtractedRecord(StrictBaseModel):
    document_type: str = Field(
        description="Document category, such as handwritten_prescription, printed_lab_report, mixed, or unknown."
    )
    diagnoses: list[str] = Field(description="Diagnoses, symptoms, impressions, or provisional diagnoses.")
    medications: list[Medication] = Field(description="Medication orders extracted from the document.")
    lab_investigations: list[LabInvestigation] = Field(description="Lab tests and observed results.")
    unclear_or_illegible_segments: list[str] = Field(
        description="Exact words, phrases, or regions that could not be read confidently."
    )
    overall_confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Overall extraction confidence from 0.0 to 1.0.",
    )
