"""
Guidance schemas.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class GuidanceArticleCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=50, description="e.g., 'Warning Signs', 'Nutrition', 'Exercise'")
    title: str = Field(..., min_length=1, max_length=150)
    content: str = Field(..., min_length=1)
    icon: Optional[str] = Field(None, description="Emoji or icon identifier")
    tags: List[str] = Field(default_factory=list)

class GuidanceArticleUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    icon: Optional[str] = None
    tags: Optional[List[str]] = None

class GuidanceArticleResponse(GuidanceArticleCreate):
    id: str
    created_at: datetime
    updated_at: datetime

class GuidanceCategoryResponse(BaseModel):
    category: str
    article_count: int
    icon: Optional[str] = None
