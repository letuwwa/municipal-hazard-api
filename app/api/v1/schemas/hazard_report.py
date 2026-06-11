from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.db.models.hazard_report import HazardStatus


class HazardReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    image_bytes: str | None
    latitude: float
    longitude: float
    status: HazardStatus
    user_id: UUID


class HazardReportPostResponse(BaseModel):
    id: UUID
    has_photo: bool
