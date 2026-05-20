"""
Location / Places endpoints.

Routes:
  GET  /location/nearby          — nearby healthcare search
  GET  /location/place/{id}      — place detail
  GET  /location/geocode         — address → lat/lng
  GET  /location/config          — return Maps API key for frontend
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.config.settings import settings
from app.schemas.location import (
    NearbySearchRequest, NearbySearchResponse,
    PlaceDetailResponse, GeocodeResponse,
)
from app.services.location_service import location_service
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


"""
Location / Places endpoints.

Routes:
  GET  /location/nearby              — nearby healthcare search
  GET  /location/hospitals/nearby    — smart hospital finder (always uses user GPS location)
  GET  /location/place/{id}          — place detail
  GET  /location/geocode             — address → lat/lng
  GET  /location/config              — return Maps API key for frontend
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List

from app.api.deps import get_current_user
from app.config.settings import settings
from app.schemas.location import (
    NearbySearchRequest, NearbySearchResponse,
    PlaceDetailResponse, GeocodeResponse, PlaceResult,
)
from app.services.location_service import location_service
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/nearby", response_model=NearbySearchResponse,
            summary="Search for nearby healthcare facilities")
async def nearby_search(
    lat:      float = Query(..., ge=-90,  le=90),
    lng:      float = Query(..., ge=-180, le=180),
    radius:   int   = Query(5000, ge=500, le=50000),
    category: str   = Query("hospital",
                            description="hospital | clinic | pharmacy | ambulance"),
    keyword:  str   = Query(None),
    current_user: dict = Depends(get_current_user),
):
    req = NearbySearchRequest(lat=lat, lng=lng, radius=radius,
                              category=category, keyword=keyword)
    logger.info("Nearby search", extra={
        "user_id": current_user["id"],
        "lat": lat, "lng": lng, "category": category,
    })
    return await location_service.nearby_search(req)


@router.get("/hospitals/nearby", summary="Smart hospital finder — always uses user GPS location")
async def hospitals_nearby(
    user_lat:  float = Query(..., ge=-90,  le=90,  description="User's current GPS latitude"),
    user_lng:  float = Query(..., ge=-180, le=180, description="User's current GPS longitude"),
    radius:    int   = Query(10000, ge=1000, le=50000, description="Search radius in metres (default 10 km)"),
    limit:     int   = Query(10,   ge=1,   le=30,    description="Max results to return"),
    current_user: dict = Depends(get_current_user),
):
    """
    Smart Hospital Finder.

    KEY BEHAVIOUR: Always searches around the USER'S CURRENT GPS LOCATION,
    regardless of any place the user may have searched on the map.
    Results are sorted by distance from the user (nearest first).
    """
    req = NearbySearchRequest(
        lat=user_lat, lng=user_lng,
        radius=radius, category="hospital",
    )
    logger.info("Smart hospital finder", extra={
        "user_id": current_user["id"],
        "user_lat": user_lat, "user_lng": user_lng, "radius": radius,
    })
    result = await location_service.nearby_search(req)

    # Return top N sorted by distance
    hospitals = sorted(result.results, key=lambda p: p.distance_m or 0)[:limit]

    return {
        "success": True,
        "user_location": {"lat": user_lat, "lng": user_lng},
        "radius_m": radius,
        "total": len(hospitals),
        "hospitals": [h.model_dump() for h in hospitals],
    }


@router.get("/place/{place_id}", response_model=PlaceDetailResponse,
            summary="Get details for a specific place")
async def get_place(
    place_id: str,
    lat:      float = Query(...),
    lng:      float = Query(...),
    category: str   = Query("hospital"),
    current_user: dict = Depends(get_current_user),
):
    detail = await location_service.get_place_detail(place_id, lat, lng, category)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Place not found or Maps API not configured.")
    return detail


@router.get("/geocode", response_model=GeocodeResponse,
            summary="Convert address to coordinates")
async def geocode(
    address: str = Query(..., min_length=2),
    current_user: dict = Depends(get_current_user),
):
    result = await location_service.geocode(address)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Address not found or Maps API not configured.")
    return result


@router.get("/config", summary="Get Maps configuration for the frontend")
async def maps_config(current_user: dict = Depends(get_current_user)):
    """Return whether Maps API is configured (never expose the key itself)."""
    return {
        "configured": bool(settings.GOOGLE_MAPS_API_KEY
                           and settings.GOOGLE_MAPS_API_KEY != "your_google_maps_api_key_here"),
        "default_radius": settings.PLACES_SEARCH_RADIUS_M,
    }
