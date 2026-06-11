from typing import Annotated
from uuid import UUID
import base64
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile

from app.api.deps import get_db
from app.db.models import User, HazardReport, HazardStatus
from app.api.v1.schemas.hazard_report import HazardReportRead, HazardReportPostResponse
from app.core.security import get_current_user, require_admin

router = APIRouter(prefix="/hazards", tags=["hazards"])


@router.post(
    "/",
    response_model=HazardReportPostResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_hazard_report(
    current_user: Annotated[User, Depends(get_current_user)],
    description: str = Form(..., min_length=5),
    latitude: float = Form(..., ge=-90, le=90),
    longitude: float = Form(..., ge=-180, le=180),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
) -> HazardReport:

    if image:
        image_data = await image.read()

    hazard = HazardReport(
        description=description,
        image_bytes=image_data,
        latitude=latitude,
        longitude=longitude,
        user_id=current_user.id,
    )

    db.add(hazard)
    db.commit()
    db.refresh(hazard)
    return HazardReportPostResponse(id=hazard.id, has_photo=bool(image))


@router.get(
    "/",
    response_model=None,
)
def read_all_hazard_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[HazardReport]:
    """
    Get all active hazard reports in the system.
    Accessible by any authenticated user.
    """
    reports = db.scalars(
        select(HazardReport).where(HazardReport.is_active == True)
    ).all()

    edited_reports = []
    for report in reports:
        edited_reports.append(
            {
                "id": report.id,
                "description": report.description,
                "latitude": report.latitude,
                "longitude": report.longitude,
                "image_bytes": base64.b64encode(report.image_bytes).decode("utf-8")
                if report.image_bytes
                else None,
            }
        )

    return edited_reports


@router.get(
    "/me",
    response_model=None,
)
def read_my_hazard_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[HazardReport]:
    reports = db.scalars(
        select(HazardReport).where(
            HazardReport.user_id == current_user.id, HazardReport.is_active == True
        )
    ).all()

    edited_reports = []
    for report in reports:
        edited_reports.append(
            {
                "id": report.id,
                "description": report.description,
                "latitude": report.latitude,
                "longitude": report.longitude,
                "image_bytes": base64.b64encode(report.image_bytes).decode("utf-8")
                if report.image_bytes
                else None,
            }
        )

    return edited_reports


@router.patch(
    "/{report_id}/status",
    response_model=HazardReportRead,
)
def update_hazard_status(
    report_id: UUID,
    new_status: HazardStatus,
    current_user: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
) -> HazardReport:

    hazard = db.scalar(select(HazardReport).where(HazardReport.id == report_id))

    if hazard is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hazard report not found",
        )

    hazard.status = new_status
    db.commit()
    db.refresh(hazard)
    return hazard
