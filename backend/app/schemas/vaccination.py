"""
Vaccination module schemas.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime


# ── Vaccine profile (child / patient) ────────────────────────────────────────
class VaccineProfileCreate(BaseModel):
    name:        str  = Field(..., min_length=1, max_length=100, examples=["Arjun"])
    date_of_birth: str = Field(..., description="YYYY-MM-DD", examples=["2023-06-15"])
    gender:      str  = Field(..., pattern="^(male|female|other)$")
    relation:    str  = Field("child", examples=["child", "self", "spouse", "parent"])
    blood_group: Optional[str] = None
    notes:       Optional[str] = None


class VaccineProfileUpdate(BaseModel):
    name:        Optional[str] = None
    gender:      Optional[str] = None
    relation:    Optional[str] = None
    blood_group: Optional[str] = None
    notes:       Optional[str] = None


class VaccineProfileResponse(BaseModel):
    id:            str
    user_id:       str
    name:          str
    date_of_birth: str
    gender:        str
    relation:      str
    blood_group:   Optional[str] = None
    notes:         Optional[str] = None
    age_text:      str            # "2 years 3 months"
    created_at:    datetime


# ── Vaccine record (administered dose) ───────────────────────────────────────
class VaccineRecordCreate(BaseModel):
    vaccine_name:  str  = Field(..., min_length=1, max_length=200)
    dose_number:   int  = Field(1, ge=1, le=10)
    date_given:    str  = Field(..., description="YYYY-MM-DD")
    given_by:      Optional[str] = None   # doctor / nurse name
    facility:      Optional[str] = None
    batch_number:  Optional[str] = None
    notes:         Optional[str] = None


class VaccineRecordResponse(VaccineRecordCreate):
    id:         str
    profile_id: str
    created_at: datetime


# ── Schedule item (due / upcoming / completed) ───────────────────────────────
class ScheduleItem(BaseModel):
    vaccine_name:  str
    dose_number:   int
    due_date:      str            # YYYY-MM-DD
    due_age_text:  str            # "6 weeks", "3 months"
    status:        str            # "completed" | "due" | "upcoming" | "overdue"
    given_date:    Optional[str] = None
    days_until:    Optional[int] = None   # negative = overdue


class VaccinationScheduleResponse(BaseModel):
    profile:   VaccineProfileResponse
    schedule:  List[ScheduleItem]
    completed: int
    due:       int
    overdue:   int
    upcoming:  int
    total:     int


# ── Dashboard summary ─────────────────────────────────────────────────────────
class VaccinationSummary(BaseModel):
    total_profiles:    int
    total_due:         int
    total_overdue:     int
    next_due_name:     Optional[str] = None
    next_due_date:     Optional[str] = None
    next_due_profile:  Optional[str] = None
