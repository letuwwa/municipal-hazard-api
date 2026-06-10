import enum
from sqlalchemy import Enum, String, Text, Float, JSON, ForeignKey
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

    image_url: Mapped[str] = mapped_column(
        String(512),
        nullable=True,
    )
    
    # example: {"lat": 32.0853, "lng": 34.7818}
    location: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    status: Mapped[HazardStatus] = mapped_column(
        Enum(HazardStatus, name="hazard_status"),
        default=HazardStatus.OPEN,
        nullable=False,
    )