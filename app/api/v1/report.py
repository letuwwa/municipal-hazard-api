from typing import Annotated
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.deps import get_db
from app.db.models import Report
from app.api.schemas import ReportRead


router = APIRouter(prefix="/reports", tags=["reports"])


def read_image(image: UploadFile | None) -> tuple[bytes | None, str | None]:
    if image is None:
        return None, None

    if image.content_type is None or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image",
        )

    image_data = image.file.read()
    if len(image_data) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size must be 5MB or smaller",
        )

    return image_data, image.content_type


@router.post(
    "",
    response_model=ReportRead,
    status_code=status.HTTP_201_CREATED,
)
def create_report(
    name: Annotated[str, Form(max_length=55)],
    description: Annotated[str, Form(max_length=255)],
    latitude: Annotated[float, Form(ge=-90, le=90)],
    longitude: Annotated[float, Form(ge=-180, le=180)],
    image: Annotated[UploadFile | None, File()] = None,
    db: Session = Depends(get_db),
) -> Report:
    image_data, image_content_type = read_image(image)
    report = Report(
        name=name,
        description=description,
        latitude=latitude,
        longitude=longitude,
        image_data=image_data,
        image_content_type=image_content_type,
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


@router.get("", response_model=list[ReportRead])
def get_all_reports(db: Session = Depends(get_db)) -> list[Report]:
    return [
        record
        for record in db.scalars(
            select(Report)
            .where(Report.is_active.is_(True))
            .order_by(Report.created_at.desc())
        )
    ]
