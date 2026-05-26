from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey, Uuid, DateTime
from sqlalchemy.sql import func
from app.models.base import Base, TenantAwareMixin
import uuid

class EventLog(Base, TenantAwareMixin):
    """
    Registro inmutable de eventos procesados para garantizar idempotencia.
    Cualquier listener que consuma un evento debe registrarlo aquí.
    """
    __tablename__ = "event_log"

    event_id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    processed_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
