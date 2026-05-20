"""
Guidance API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.api.deps import get_db, get_current_user
from app.schemas.guidance import GuidanceArticleResponse, GuidanceCategoryResponse, GuidanceArticleCreate
from app.services.guidance_service import GuidanceService

router = APIRouter()

def _svc(db) -> GuidanceService:
    return GuidanceService(db)

@router.get("/categories", response_model=List[GuidanceCategoryResponse], summary="Get all guidance categories")
async def get_categories(lang: str = "en", db=Depends(get_db)):
    """List all categories with their article counts."""
    return await _svc(db).get_categories(lang)

@router.get("/category/{category}", response_model=List[GuidanceArticleResponse], summary="Get articles by category")
async def get_articles_by_category(category: str, lang: str = "en", db=Depends(get_db)):
    """Get all articles belonging to a specific category."""
    articles = await _svc(db).get_articles_by_category(category, lang)
    return articles

@router.get("/article/{article_id}", response_model=GuidanceArticleResponse, summary="Get article by ID")
async def get_article(article_id: str, db=Depends(get_db)):
    """Get a specific article by its ID."""
    article = await _svc(db).get_article(article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return article

@router.post("/article", status_code=status.HTTP_201_CREATED, summary="Create a new guidance article")
async def create_article(
    payload: GuidanceArticleCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Admin endpoint to create a new guidance article. For now, any authenticated user can create."""
    return await _svc(db).create_article(payload)
