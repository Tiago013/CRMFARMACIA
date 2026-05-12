from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.modules.crm.schemas import PatientCreate, PatientResponse, TimelineEventCreate
from app.modules.crm.services import CRMService
from app.modules.crm.repositories import PatientRepository
import uuid

router = APIRouter(prefix="/crm", tags=["crm"])

# Dummy dependency
async def get_current_user_id() -> uuid.UUID:
    return uuid.uuid4()

@router.post("/patients", response_model=PatientResponse)
async def create_patient(
    patient: PatientCreate,
    db: AsyncSession = Depends(get_db)
):
    crm_service = CRMService(db)
    return await crm_service.create_patient(patient)

@router.get("/patients", response_model=List[PatientResponse])
async def search_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    repo = PatientRepository(db)
    return await repo.list_patients(skip=skip, limit=limit, search=search)

@router.get("/patients/{patient_id}")
async def get_patient_profile(
    patient_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db)
):
    crm_service = CRMService(db)
    return await crm_service.get_patient_profile(patient_id)

@router.post("/patients/{patient_id}/notes")
async def add_patient_note(
    patient_id: UUID,
    note: str,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    crm_service = CRMService(db)
    event_data = TimelineEventCreate(
        patient_id=patient_id,
        user_id=user_id,
        event_type="note_added",
        event_data={"note": note}
    )
    await crm_service.add_timeline_event(event_data)
    await db.commit()
    return {"status": "success"}
