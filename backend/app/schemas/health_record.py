"""
Health record request / response schemas.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

VALID_RECORD_TYPES = [
    "Consultation", "Lab Result", "Prescription",
    "Vaccination", "Surgery", "Other",
]


class HealthRecordCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, examples=["Annual Blood Panel"])
    record_type: str = Field(..., examples=["Lab Result"])
    date: str = Field(..., description="YYYY-MM-DD", examples=["2024-06-01"])
    description: Optional[str] = Field(None, max_length=2000)
    doctor_name: Optional[str] = Field(None, max_length=100)
    facility: Optional[str] = Field(None, max_length=200)


class HealthRecordResponse(BaseModel):
    id: str
    title: str
    record_type: str
    date: str
    description: Optional[str] = None
    doctor_name: Optional[str] = None
    facility: Optional[str] = None
    user_id: str
    created_at: datetime


class HealthRecordsListResponse(BaseModel):
    records: List[HealthRecordResponse]
    total: int
