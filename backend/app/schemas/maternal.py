"""
Maternal care schemas.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ── Pregnancy profile ─────────────────────────────────────────────────────────
class PregnancyProfileCreate(BaseModel):
    lmp_date:        str  = Field(..., description="Last Menstrual Period date YYYY-MM-DD")
    mother_name:     str  = Field(..., min_length=1, max_length=100)
    mother_age:      int  = Field(..., ge=10, le=60)
    blood_group:     Optional[str] = None
    doctor_name:     Optional[str] = None
    hospital:        Optional[str] = None
    emergency_phone: Optional[str] = None
    notes:           Optional[str] = None


class PregnancyProfileUpdate(BaseModel):
    doctor_name:     Optional[str] = None
    hospital:        Optional[str] = None
    emergency_phone: Optional[str] = None
    notes:           Optional[str] = None
    blood_group:     Optional[str] = None


class PregnancyProfileResponse(BaseModel):
    id:              str
    user_id:         str
    lmp_date:        str
    mother_name:     str
    mother_age:      int
    blood_group:     Optional[str] = None
    doctor_name:     Optional[str] = None
    hospital:        Optional[str] = None
    emergency_phone: Optional[str] = None
    notes:           Optional[str] = None
    current_week:    int
    trimester:       int
    due_date:        str
    days_remaining:  int
    is_active:       bool
    created_at:      datetime


# ── Doctor visit ──────────────────────────────────────────────────────────────
class DoctorVisitCreate(BaseModel):
    visit_date:  str  = Field(..., description="YYYY-MM-DD")
    visit_type:  str  = Field("ANC", description="ANC | Ultrasound | Lab | Emergency | Other")
    doctor_name: Optional[str] = None
    hospital:    Optional[str] = None
    notes:       Optional[str] = None
    next_visit:  Optional[str] = None


class DoctorVisitResponse(DoctorVisitCreate):
    id:          str
    profile_id:  str
    week_number: int
    created_at:  datetime


# ── Water intake log ──────────────────────────────────────────────────────────
class WaterLogCreate(BaseModel):
    glasses: int = Field(..., ge=1, le=20)
    date:    str = Field(..., description="YYYY-MM-DD")


class WaterLogResponse(WaterLogCreate):
    id:         str
    profile_id: str
    created_at: datetime


# ── Week info (computed, not stored) ─────────────────────────────────────────
class WeekInfo(BaseModel):
    week:          int
    trimester:     int
    baby_size:     str
    baby_size_emoji: str
    development:   str
    mother_tips:   List[str]
    nutrition:     List[str]
    warning_signs: List[str]


# ── Dashboard response ────────────────────────────────────────────────────────
class MaternalDashboardResponse(BaseModel):
    profile:        PregnancyProfileResponse
    week_info:      WeekInfo
    today_water:    int
    water_goal:     int
    upcoming_visits: List[DoctorVisitResponse]
    recent_visits:   List[DoctorVisitResponse]
    daily_tip:      str
    nutrition_tip:  str
