import enum
from sqlalchemy import Enum, String, Text, Float, ForeignKey, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base_model import BaseModel
from uuid import UUID


class HazardStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class HazardReport(BaseModel):
    __tablename__ = "hazard_reports"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    image_bytes: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=True,
    )

    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    status: Mapped[HazardStatus] = mapped_column(
        Enum(HazardStatus, name="hazard_status"),
        default=HazardStatus.OPEN,
        nullable=False,
    )
