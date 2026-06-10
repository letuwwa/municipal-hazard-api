from typing import Annotated
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_db
from app.db.models import User, HazardReport, HazardStatus
from app.api.v1.schemas.hazard_report import HazardReportCreate, HazardReportRead
from app.core.security import get_current_user, require_admin

router = APIRouter(prefix="/hazards", tags=["hazards"])


@router.post(
    "/",
    response_model=HazardReportRead,
    status_code=status.HTTP_201_CREATED,
)
def create_hazard_report(
    report_in: HazardReportCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> HazardReport:
   
    hazard = HazardReport(
        description=report_in.description,
        image_url=report_in.image_url,
        location=report_in.location.model_dump(),
        user_id=current_user.id, 
    )

    db.add(hazard)
    db.commit()
    db.refresh(hazard)
    return hazard

@router.get(
    "/",
    response_model=list[HazardReportRead],
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
    
    return list(reports)

@router.get(
    "/me",
    response_model=list[HazardReportRead],
)
def read_my_hazard_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[HazardReport]:
    reports = db.scalars(
        select(HazardReport).where(
            HazardReport.user_id == current_user.id,
            HazardReport.is_active == True
        )
    ).all()
    
    return list(reports)


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
  
    hazard = db.scalar(
        select(HazardReport).where(HazardReport.id == report_id)
    )
    
    if hazard is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hazard report not found",
        )

    hazard.status = new_status
    db.commit()
    db.refresh(hazard)
    return hazard

