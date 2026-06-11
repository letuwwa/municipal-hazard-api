import base64
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.v1.schemas.hazard_report import HazardReportRead, HazardReportPostResponse
from app.core.security import get_current_user, require_admin
from app.db.models import HazardReport, HazardStatus, User

router = APIRouter(prefix="/hazards", tags=["hazards"])


def serialize_hazard_report(report: HazardReport) -> HazardReportRead:
    image_bytes = (
        base64.b64encode(report.image_bytes).decode("utf-8")
        if report.image_bytes
        else None
    )
    return HazardReportRead(
        id=report.id,
        description=report.description,
        image_bytes=image_bytes,
        latitude=report.latitude,
        longitude=report.longitude,
        status=report.status,
        user_id=report.user_id,
    )


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
    image: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
) -> HazardReportPostResponse:

    image_data = None
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
    response_model=list[HazardReportRead],
)
def read_all_hazard_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[HazardReportRead]:
    """
    Get all active hazard reports in the system.
    Accessible by any authenticated user.
    """
    reports = db.scalars(
        select(HazardReport).where(HazardReport.is_active.is_(True))
    ).all()

    return [serialize_hazard_report(report) for report in reports]


@router.get(
    "/me",
    response_model=list[HazardReportRead],
)
def read_my_hazard_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[HazardReportRead]:
    reports = db.scalars(
        select(HazardReport).where(
            HazardReport.user_id == current_user.id,
            HazardReport.is_active.is_(True),
        )
    ).all()

    return [serialize_hazard_report(report) for report in reports]


@router.patch(
    "/{report_id}/status",
    response_model=HazardReportRead,
)
def update_hazard_status(
    report_id: UUID,
    new_status: HazardStatus,
    current_user: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
) -> HazardReportRead:

    hazard = db.scalar(select(HazardReport).where(HazardReport.id == report_id))

    if hazard is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hazard report not found",
        )

    hazard.status = new_status
    db.commit()
    db.refresh(hazard)
    return serialize_hazard_report(hazard)
