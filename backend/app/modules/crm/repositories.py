from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from uuid import UUID
from app.modules.crm.models import Patient, PatientTimelineEvent
from app.core.middleware import get_current_tenant_id

class PatientRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, patient: Patient) -> Patient:
        self.db.add(patient)
        await self.db.flush() # Flush to get the ID without committing yet
        return patient

    async def get_by_id(self, patient_id: UUID) -> Optional[Patient]:
        tenant_id = get_current_tenant_id()
        result = await self.db.execute(
            select(Patient).where(Patient.id == patient_id, Patient.tenant_id == tenant_id)
        )
        return result.scalars().first()

    async def list_patients(self, skip: int = 0, limit: int = 50, search: Optional[str] = None) -> List[Patient]:
        tenant_id = get_current_tenant_id()
        query = select(Patient).where(Patient.tenant_id == tenant_id)
        
        if search:
            # Simple ILIKE search for demonstration
            search_term = f"%{search}%"
            query = query.where(
                (Patient.first_name.ilike(search_term)) | 
                (Patient.last_name.ilike(search_term)) | 
                (Patient.phone.ilike(search_term))
            )
            
        query = query.order_by(desc(Patient.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

class TimelineRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_event(self, event: PatientTimelineEvent) -> PatientTimelineEvent:
        self.db.add(event)
        await self.db.flush()
        return event

    async def get_patient_timeline(self, patient_id: UUID, limit: int = 20) -> List[PatientTimelineEvent]:
        tenant_id = get_current_tenant_id()
        query = (
            select(PatientTimelineEvent)
            .where(
                PatientTimelineEvent.patient_id == patient_id, 
                PatientTimelineEvent.tenant_id == tenant_id
            )
            .order_by(desc(PatientTimelineEvent.created_at))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return result.scalars().all()
