"""
Location / Places request and response schemas.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class NearbySearchRequest(BaseModel):
    lat:      float = Field(..., ge=-90,  le=90,  description="Latitude")
    lng:      float = Field(..., ge=-180, le=180, description="Longitude")
    radius:   int   = Field(5000, ge=500, le=50000, description="Search radius in metres")
    category: str   = Field("hospital", description="hospital | clinic | pharmacy | ambulance")
    keyword:  Optional[str] = Field(None, description="Optional keyword filter")


class PlaceLocation(BaseModel):
    lat: float
    lng: float


class PlaceResult(BaseModel):
    place_id:     str
    name:         str
    address:      str
    location:     PlaceLocation
    rating:       Optional[float] = None
    total_ratings: Optional[int]  = None
    open_now:     Optional[bool]  = None
    phone:        Optional[str]   = None
    distance_m:   Optional[float] = None   # straight-line metres from user
    distance_text: Optional[str]  = None   # "1.2 km"
    category:     str = "hospital"
    icon_color:   str = "#dc2626"          # hex for map marker


class NearbySearchResponse(BaseModel):
    results:  List[PlaceResult]
    total:    int
    lat:      float
    lng:      float
    radius:   int


class PlaceDetailResponse(PlaceResult):
    website:       Optional[str] = None
    opening_hours: Optional[List[str]] = None
    reviews_count: Optional[int] = None


class GeocodeRequest(BaseModel):
    address: str = Field(..., min_length=2)


class GeocodeResponse(BaseModel):
    address:       str
    formatted:     str
    lat:           float
    lng:           float
