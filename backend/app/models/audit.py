from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey, Uuid, DateTime
from sqlalchemy.sql import func
from app.models.base import Base, TenantAwareMixin
import uuid

class AuditLog(Base, TenantAwareMixin):
    __tablename__ = "audit_log"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_type: Mapped[str] = mapped_column(String(50), nullable=True)
    target_id: Mapped[str] = mapped_column(String(50), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
