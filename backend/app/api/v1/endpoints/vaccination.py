"""
Vaccination endpoints.

Routes:
  GET    /vaccination/summary                          — dashboard summary
  GET    /vaccination/profiles                         — list profiles
  POST   /vaccination/profiles                         — create profile
  GET    /vaccination/profiles/{id}                    — get profile
  PUT    /vaccination/profiles/{id}                    — update profile
  DELETE /vaccination/profiles/{id}                    — delete profile
  GET    /vaccination/profiles/{id}/schedule           — full schedule
  GET    /vaccination/profiles/{id}/records            — list records
  POST   /vaccination/profiles/{id}/records            — add record
  DELETE /vaccination/profiles/{id}/records/{rec_id}   — delete record
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_db, get_current_user
from app.schemas.vaccination import (
    VaccineProfileCreate, VaccineProfileUpdate,
    VaccineRecordCreate,
    VaccinationSummary,
)
from app.services.vaccination_service import VaccinationService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _svc(db) -> VaccinationService:
    return VaccinationService(db)


# ── Dashboard summary ─────────────────────────────────────────────────────────
@router.get("/summary", response_model=VaccinationSummary,
            summary="Get vaccination summary for dashboard")
async def get_summary(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    return await _svc(db).get_summary(current_user["id"])


# ── Profiles ──────────────────────────────────────────────────────────────────
@router.get("/profiles", summary="List all vaccine profiles")
async def list_profiles(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    profiles = await _svc(db).list_profiles(current_user["id"])
    return {"profiles": profiles, "total": len(profiles)}


@router.post("/profiles", status_code=status.HTTP_201_CREATED,
             summary="Create a new vaccine profile")
async def create_profile(
    payload: VaccineProfileCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    return await _svc(db).create_profile(current_user["id"], payload)


@router.get("/profiles/{profile_id}", summary="Get a vaccine profile")
async def get_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    profile = await _svc(db).get_profile(profile_id, current_user["id"])
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return profile


@router.put("/profiles/{profile_id}", summary="Update a vaccine profile")
async def update_profile(
    profile_id: str,
    payload: VaccineProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    updated = await _svc(db).update_profile(profile_id, current_user["id"], payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return updated


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete a vaccine profile")
async def delete_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    deleted = await _svc(db).delete_profile(profile_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")


# ── Schedule ──────────────────────────────────────────────────────────────────
@router.get("/profiles/{profile_id}/schedule", summary="Get vaccination schedule")
async def get_schedule(
    profile_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    sched = await _svc(db).get_schedule(profile_id, current_user["id"])
    if not sched:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return sched


# ── Records ───────────────────────────────────────────────────────────────────
@router.get("/profiles/{profile_id}/records", summary="List vaccine records")
async def list_records(
    profile_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    records = await _svc(db).list_records(profile_id, current_user["id"])
    return {"records": records, "total": len(records)}


@router.post("/profiles/{profile_id}/records",
             status_code=status.HTTP_201_CREATED,
             summary="Add a vaccine record")
async def add_record(
    profile_id: str,
    payload: VaccineRecordCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    record = await _svc(db).add_record(profile_id, current_user["id"], payload)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return record


@router.delete("/profiles/{profile_id}/records/{record_id}",
               status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete a vaccine record")
async def delete_record(
    profile_id: str,
    record_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    deleted = await _svc(db).delete_record(record_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found.")
