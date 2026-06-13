from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid, os, shutil

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.extraction import ColumnTemplate
from app.api.deps import get_current_user
from app.services.pdf.extractor import PDFExtractor

router = APIRouter(prefix="/templates", tags=["Column Templates"])


class ColumnDefinition(BaseModel):
    name: str
    description: Optional[str] = None
    data_type: str = "text"  # text | number | date | boolean
    extraction_hint: Optional[str] = None


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    columns: List[ColumnDefinition]


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    columns: List[Dict[str, Any]]
    created_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[TemplateResponse])
async def list_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ColumnTemplate).where(ColumnTemplate.user_id == current_user.id)
    )
    templates = result.scalars().all()
    return [
        TemplateResponse(
            id=str(t.id),
            name=t.name,
            description=t.description,
            columns=t.columns,
            created_at=t.created_at.isoformat(),
        )
        for t in templates
    ]


@router.post("/", response_model=TemplateResponse, status_code=201)
async def create_template(
    payload: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = ColumnTemplate(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        columns=[c.dict() for c in payload.columns],
    )
    db.add(template)
    await db.flush()
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description,
        columns=template.columns,
        created_at=template.created_at.isoformat(),
    )


@router.post("/upload-sample")
async def upload_sample_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a sample PDF and return AI-suggested column definitions."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")
    if file.size and file.size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    upload_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"sample_{uuid.uuid4()}.pdf")

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    extractor = PDFExtractor()
    suggested_columns = await extractor.suggest_columns(file_path)
    return {"file_path": file_path, "suggested_columns": suggested_columns}


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ColumnTemplate).where(
            ColumnTemplate.id == template_id,
            ColumnTemplate.user_id == current_user.id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description,
        columns=template.columns,
        created_at=template.created_at.isoformat(),
    )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    payload: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ColumnTemplate).where(
            ColumnTemplate.id == template_id,
            ColumnTemplate.user_id == current_user.id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template.name = payload.name
    template.description = payload.description
    template.columns = [c.dict() for c in payload.columns]
    await db.flush()
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description,
        columns=template.columns,
        created_at=template.created_at.isoformat(),
    )


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ColumnTemplate).where(
            ColumnTemplate.id == template_id,
            ColumnTemplate.user_id == current_user.id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
