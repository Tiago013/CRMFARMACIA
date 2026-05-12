from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.modules.crm.repositories import PatientRepository, TimelineRepository
from app.modules.crm.schemas import PatientCreate, TimelineEventCreate
from app.modules.crm.models import Patient, PatientTimelineEvent
from app.core.middleware import get_current_tenant_id
from fastapi import HTTPException

class CRMService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.patient_repo = PatientRepository(db)
        self.timeline_repo = TimelineRepository(db)

    async def create_patient(self, data: PatientCreate) -> Patient:
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            raise HTTPException(status_code=401, detail="Tenant context required")

        patient = Patient(
            tenant_id=tenant_id,
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
            document_id=data.document_id,
            preferences=data.preferences,
            tags=data.tags
        )
        
        patient = await self.patient_repo.create(patient)
        
        # Log creation in timeline
        await self.add_timeline_event(TimelineEventCreate(
            patient_id=patient.id,
            event_type="patient_created",
            event_data={"source": "manual_entry"}
        ))
        
        await self.db.commit()
        return patient

    async def add_timeline_event(self, data: TimelineEventCreate) -> PatientTimelineEvent:
        tenant_id = get_current_tenant_id()
        event = PatientTimelineEvent(
            tenant_id=tenant_id,
            patient_id=data.patient_id,
            user_id=data.user_id,
            event_type=data.event_type,
            event_data=data.event_data
        )
        return await self.timeline_repo.add_event(event)

    async def get_patient_profile(self, patient_id: UUID):
        patient = await self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
            
        timeline = await self.timeline_repo.get_patient_timeline(patient_id)
        
        return {
            "patient": patient,
            "timeline": timeline
        }
