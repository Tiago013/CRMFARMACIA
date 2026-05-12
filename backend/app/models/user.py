from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Uuid
from app.models.base import Base, TenantAwareMixin
import uuid

class User(Base, TenantAwareMixin):
    __tablename__ = "users"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="pharmacist")

    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="users")
