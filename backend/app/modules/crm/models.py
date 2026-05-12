from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Uuid, Boolean, DateTime
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.models.base import Base, TenantAwareMixin
from datetime import datetime
import uuid

class Patient(Base, TenantAwareMixin):
    __tablename__ = "patients"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), index=True, nullable=True)
    document_id: Mapped[str] = mapped_column(String(50), index=True, nullable=True)
    
    status: Mapped[str] = mapped_column(String(20), default="active") # active, inactive, churned
    last_purchase_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Flexible structured data
    preferences: Mapped[dict] = mapped_column(JSONB, nullable=True, server_default='{}')
    tags: Mapped[list] = mapped_column(ARRAY(String), nullable=True, server_default='{}')

    timeline_events = relationship("PatientTimelineEvent", back_populates="patient", cascade="all, delete-orphan")

class PatientTimelineEvent(Base, TenantAwareMixin):
    __tablename__ = "patient_timeline_events"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("patients.id"), index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True) # Who triggered the event (null if automated)
    
    event_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g., sale_completed, note_added, whatsapp_sent
    event_data: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default='{}')
    
    patient = relationship("Patient", back_populates="timeline_events")
