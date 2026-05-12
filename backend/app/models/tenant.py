from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
from app.models.base import Base, UUIDMixin, TimestampMixin

class Pharmacy(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "pharmacies"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tax_id: Mapped[str] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="CO")

    # Relationships
    users = relationship("User", back_populates="pharmacy", cascade="all, delete-orphan")
