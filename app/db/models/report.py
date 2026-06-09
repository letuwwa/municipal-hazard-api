import enum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import CheckConstraint, Enum, Float, String, LargeBinary

from app.db.models.base_model import BaseModel


class ReportStatus(str, enum.Enum):
    CREATED = "CREATED"
    COMPLETED = "COMPLETED"
    IN_PROCESS = "IN_PROCESS"


class Report(BaseModel):
    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint(
            "latitude >= -90 AND latitude <= 90",
            name="ck_reports_latitude_range",
        ),
        CheckConstraint(
            "longitude >= -180 AND longitude <= 180",
            name="ck_reports_longitude_range",
        ),
    )

    name: Mapped[str] = mapped_column(
        String(55),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"),
        default=ReportStatus.CREATED,
        nullable=False,
    )

    image_data: Mapped[bytes | None] = mapped_column(
        LargeBinary,
        nullable=True,
    )

    image_content_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )