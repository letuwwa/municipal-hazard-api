import enum
from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base_model import BaseModel


class ReportStatus(str, enum.Enum):
    CREATED = "CREATED"
    COMPLETED = "COMPLETED"
    IN_PROCESS = "IN_PROCESS"


class Report(BaseModel):
    __tablename__ = "reports"

    name: Mapped[str] = mapped_column(
        String(55),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"),
        default=ReportStatus.CREATED,
        nullable=False,
    )