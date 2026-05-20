"""
Maternal care endpoints.

Routes:
  GET    /maternal/dashboard                    — full dashboard data
  GET    /maternal/profile                      — get active profile
  POST   /maternal/profile                      — create/replace profile
  PUT    /maternal/profile/{id}                 — update profile
  GET    /maternal/profile/{id}/visits          — list doctor visits
  POST   /maternal/profile/{id}/visits          — add visit
  DELETE /maternal/profile/{id}/visits/{vid}    — delete visit
  GET    /maternal/profile/{id}/water           — water history
  POST   /maternal/profile/{id}/water           — log water intake
  GET    /maternal/week/{week}                  — week info (no auth needed for preview)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_db, get_current_user
from app.schemas.maternal import (
    PregnancyProfileCreate, PregnancyProfileUpdate,
    DoctorVisitCreate, WaterLogCreate,
)
from app.services.maternal_service import MaternalService, _get_week_info
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _svc(db) -> MaternalService:
    return MaternalService(db)


# ── Dashboard ─────────────────────────────────────────────────────────────────
@router.get("/dashboard", summary="Get maternal care dashboard")
async def get_dashboard(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    data = await _svc(db).get_dashboard(current_user["id"])
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active pregnancy profile found. Please create one first.",
        )
    return data


# ── Profile ───────────────────────────────────────────────────────────────────
@router.get("/profile", summary="Get active pregnancy profile")
async def get_profile(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    profile = await _svc(db).get_active_profile(current_user["id"])
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="No active pregnancy profile found.")
    return profile


@router.post("/profile", status_code=status.HTTP_201_CREATED,
             summary="Create pregnancy profile")
async def create_profile(
    payload: PregnancyProfileCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    return await _svc(db).create_profile(current_user["id"], payload)


@router.put("/profile/{profile_id}", summary="Update pregnancy profile")
async def update_profile(
    profile_id: str,
    payload: PregnancyProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    updated = await _svc(db).update_profile(profile_id, current_user["id"], payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return updated


# ── Doctor visits ─────────────────────────────────────────────────────────────
@router.get("/profile/{profile_id}/visits", summary="List doctor visits")
async def list_visits(
    profile_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    visits = await _svc(db).list_visits(profile_id, current_user["id"])
    return {"visits": visits, "total": len(visits)}


@router.post("/profile/{profile_id}/visits",
             status_code=status.HTTP_201_CREATED,
             summary="Add a doctor visit")
async def add_visit(
    profile_id: str,
    payload: DoctorVisitCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    visit = await _svc(db).add_visit(profile_id, current_user["id"], payload)
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return visit


@router.delete("/profile/{profile_id}/visits/{visit_id}",
               status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete a doctor visit")
async def delete_visit(
    profile_id: str,
    visit_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    deleted = await _svc(db).delete_visit(visit_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found.")


# ── Water intake ──────────────────────────────────────────────────────────────
@router.get("/profile/{profile_id}/water", summary="Get water intake history")
async def get_water(
    profile_id: str,
    days: int = Query(7, ge=1, le=30),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    history = await _svc(db).get_water_history(profile_id, days)
    return {"history": history, "total": len(history)}


@router.post("/profile/{profile_id}/water", summary="Log water intake")
async def log_water(
    profile_id: str,
    payload: WaterLogCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    log = await _svc(db).log_water(profile_id, current_user["id"], payload)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return log


# ── Week info ─────────────────────────────────────────────────────────────────
@router.get("/week/{week}", summary="Get week-specific pregnancy information")
async def get_week_info(
    week: int,
):
    if not 1 <= week <= 42:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Week must be between 1 and 42.")
    trimester = 1 if week <= 13 else (2 if week <= 26 else 3)
    return _get_week_info(week, trimester)
