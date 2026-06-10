from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.hazard_report import HazardStatus 

class HazardReportCreate(BaseModel):
    description: str = Field(..., min_length=5, description="Hazard description")
    image_url: str | None = Field(default=None, max_length=512)
    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")

class HazardReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    image_url: str | None
    latitude: float
    longitude: float    
    status: HazardStatus
    user_id: UUID

