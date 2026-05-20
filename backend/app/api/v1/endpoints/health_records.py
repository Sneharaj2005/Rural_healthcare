"""
Health records CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_db, get_current_user
from app.schemas.health_record import HealthRecordCreateRequest, HealthRecordsListResponse
from app.services.health_record_service import HealthRecordService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get(
    "",
    summary="List all health records for the current user",
)
async def list_records(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    service = HealthRecordService(db)
    records = await service.get_by_user(current_user["id"])
    return {"records": records, "total": len(records)}


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new health record",
)
async def create_record(
    payload: HealthRecordCreateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    service = HealthRecordService(db)
    record  = await service.create(current_user["id"], payload)
    return record


@router.get(
    "/{record_id}",
    summary="Get a single health record by ID",
)
async def get_record(
    record_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    service = HealthRecordService(db)
    record  = await service.get_by_id(record_id, current_user["id"])
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found.")
    return record


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a health record",
)
async def delete_record(
    record_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    service = HealthRecordService(db)
    deleted = await service.delete(record_id, current_user["id"])
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found or you don't have permission to delete it.",
        )
