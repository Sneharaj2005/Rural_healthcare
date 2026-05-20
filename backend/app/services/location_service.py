"""
Google Places API service — async HTTP calls via httpx.
Falls back to OpenStreetMap Overpass API when no Google Maps key is configured.

Handles:
  - Nearby search (hospital, clinic, pharmacy, ambulance)
  - Place detail (phone, hours, website)
  - Geocoding (address → lat/lng)
  - Distance calculation (Haversine formula)
"""
import math
import httpx
from typing import Optional

from app.config.settings import settings
from app.schemas.location import (
    NearbySearchRequest, NearbySearchResponse,
    PlaceResult, PlaceLocation,
    PlaceDetailResponse, GeocodeResponse,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

PLACES_BASE   = "https://maps.googleapis.com/maps/api/place"
GEOCODE_BASE  = "https://maps.googleapis.com/maps/api/geocode/json"
OVERPASS_URL  = "https://overpass-api.de/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org"

# Map app category → Google Places type(s) + keyword
CATEGORY_MAP = {
    "hospital":  {"type": "hospital",  "keyword": "hospital"},
    "clinic":    {"type": "doctor",    "keyword": "clinic"},
    "pharmacy":  {"type": "pharmacy",  "keyword": "pharmacy"},
    "ambulance": {"type": "hospital",  "keyword": "ambulance emergency"},
}

# Map app category → OpenStreetMap amenity tags
OSM_CATEGORY_MAP = {
    "hospital":  ["hospital", "clinic", "doctors", "health_post", "dispensary"],
    "clinic":    ["clinic", "doctors", "health_post", "dispensary"],
    "pharmacy":  ["pharmacy", "chemist"],
    "ambulance": ["hospital", "clinic", "health_post"],
}

CATEGORY_COLORS = {
    "hospital":  "#dc2626",
    "clinic":    "#2563eb",
    "pharmacy":  "#16a34a",
    "ambulance": "#ea580c",
}


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi  = math.radians(lat2 - lat1)
    dlam  = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _fmt_distance(metres: float) -> str:
    if metres < 1000:
        return f"{int(metres)} m"
    return f"{metres / 1000:.1f} km"


def _parse_place(raw: dict, user_lat: float, user_lng: float, category: str) -> PlaceResult:
    loc = raw.get("geometry", {}).get("location", {})
    lat, lng = loc.get("lat", 0.0), loc.get("lng", 0.0)
    dist_m = _haversine_m(user_lat, user_lng, lat, lng)

    oh = raw.get("opening_hours", {})
    return PlaceResult(
        place_id      = raw.get("place_id", ""),
        name          = raw.get("name", "Unknown"),
        address       = raw.get("vicinity", raw.get("formatted_address", "")),
        location      = PlaceLocation(lat=lat, lng=lng),
        rating        = raw.get("rating"),
        total_ratings = raw.get("user_ratings_total"),
        open_now      = oh.get("open_now") if oh else None,
        distance_m    = round(dist_m, 1),
        distance_text = _fmt_distance(dist_m),
        category      = category,
        icon_color    = CATEGORY_COLORS.get(category, "#dc2626"),
    )


def _parse_osm_element(el: dict, user_lat: float, user_lng: float, category: str) -> Optional[PlaceResult]:
    """Parse an Overpass API element into a PlaceResult."""
    tags = el.get("tags", {})
    name = tags.get("name") or tags.get("name:en") or tags.get("amenity", "Unknown")
    if not name or name == "Unknown":
        return None

    # Get coordinates
    if el.get("type") == "node":
        lat, lng = el.get("lat", 0.0), el.get("lon", 0.0)
    elif el.get("type") in ("way", "relation"):
        center = el.get("center", {})
        lat, lng = center.get("lat", 0.0), center.get("lon", 0.0)
    else:
        return None

    if not lat or not lng:
        return None

    dist_m = _haversine_m(user_lat, user_lng, lat, lng)

    # Build address from OSM tags
    addr_parts = []
    for key in ("addr:housenumber", "addr:street", "addr:suburb", "addr:city", "addr:state"):
        val = tags.get(key)
        if val:
            addr_parts.append(val)
    address = ", ".join(addr_parts) if addr_parts else tags.get("addr:full", tags.get("addr:state", ""))

    # Extract phone number
    phone = tags.get("phone") or tags.get("contact:phone") or tags.get("contact:mobile")

    return PlaceResult(
        place_id      = f"osm_{el.get('type', 'n')}_{el.get('id', 0)}",
        name          = name,
        address       = address,
        location      = PlaceLocation(lat=lat, lng=lng),
        rating        = None,
        total_ratings = None,
        open_now      = None,
        phone         = phone,
        distance_m    = round(dist_m, 1),
        distance_text = _fmt_distance(dist_m),
        category      = category,
        icon_color    = CATEGORY_COLORS.get(category, "#dc2626"),
    )


class LocationService:
    def __init__(self):
        self._key = settings.GOOGLE_MAPS_API_KEY

    def _has_key(self) -> bool:
        return bool(self._key and self._key != "your_google_maps_api_key_here")

    # ── OpenStreetMap fallback ────────────────────────────────────────────────
    async def _osm_nearby_search(self, req: NearbySearchRequest) -> NearbySearchResponse:
        """Use Overpass API to find nearby healthcare facilities (no API key needed)."""
        amenities = OSM_CATEGORY_MAP.get(req.category, ["hospital"])
        # Build amenity regex for broader matching
        amenity_regex = "|".join(amenities)

        # Broad query covering amenity tags, healthcare tags, and building=hospital
        # Uses regex match to catch all variants used in Indian OSM data
        query = f"""
[out:json][timeout:25];
(
  node["amenity"~"{amenity_regex}"](around:{req.radius},{req.lat},{req.lng});
  way["amenity"~"{amenity_regex}"](around:{req.radius},{req.lat},{req.lng});
  node["healthcare"](around:{req.radius},{req.lat},{req.lng});
  way["healthcare"](around:{req.radius},{req.lat},{req.lng});
  node["building"="hospital"](around:{req.radius},{req.lat},{req.lng});
  way["building"="hospital"](around:{req.radius},{req.lat},{req.lng});
);
out center 40;
"""
        try:
            async with httpx.AsyncClient(timeout=25, headers={"User-Agent": "RHC-AI-Lite/1.0"}) as client:
                resp = await client.post(OVERPASS_URL, data={"data": query})
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.error("Overpass API search failed", exc_info=exc)
            return NearbySearchResponse(results=[], total=0, lat=req.lat, lng=req.lng, radius=req.radius)

        results = []
        seen_names = set()
        for el in data.get("elements", []):
            place = _parse_osm_element(el, req.lat, req.lng, req.category)
            if place and place.name not in seen_names:
                seen_names.add(place.name)
                results.append(place)

        results.sort(key=lambda p: p.distance_m or 0)
        logger.info(f"OSM search returned {len(results)} results for {req.category}")
        return NearbySearchResponse(results=results, total=len(results), lat=req.lat, lng=req.lng, radius=req.radius)

    async def _osm_geocode(self, address: str) -> Optional[GeocodeResponse]:
        """Use Nominatim for geocoding (no API key needed)."""
        params = {"q": address, "format": "json", "limit": 1}
        try:
            async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "RHC-AI-Lite/1.0"}) as client:
                resp = await client.get(f"{NOMINATIM_URL}/search", params=params)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.error("Nominatim geocode failed", exc_info=exc)
            return None

        if not data:
            return None

        r = data[0]
        return GeocodeResponse(
            address=address,
            formatted=r.get("display_name", address),
            lat=float(r["lat"]),
            lng=float(r["lon"]),
        )

    # ── Google Places (when key is available) ─────────────────────────────────
    async def nearby_search(self, req: NearbySearchRequest) -> NearbySearchResponse:
        if not self._has_key():
            return await self._osm_nearby_search(req)

        cat    = CATEGORY_MAP.get(req.category, CATEGORY_MAP["hospital"])
        params = {
            "location": f"{req.lat},{req.lng}",
            "radius":   req.radius,
            "type":     cat["type"],
            "keyword":  req.keyword or cat["keyword"],
            "key":      self._key,
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{PLACES_BASE}/nearbysearch/json", params=params)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.error("Places nearby search failed — falling back to OSM", exc_info=exc)
            return await self._osm_nearby_search(req)

        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            logger.warning("Places API error — falling back to OSM", extra={"status": data.get("status")})
            return await self._osm_nearby_search(req)

        results = [
            _parse_place(p, req.lat, req.lng, req.category)
            for p in data.get("results", [])
        ]
        results.sort(key=lambda p: p.distance_m or 0)
        return NearbySearchResponse(results=results, total=len(results), lat=req.lat, lng=req.lng, radius=req.radius)

    async def get_place_detail(self, place_id: str,
                               user_lat: float, user_lng: float,
                               category: str = "hospital") -> Optional[PlaceDetailResponse]:
        if not self._has_key():
            return None

        fields = "place_id,name,formatted_address,geometry,rating,user_ratings_total," \
                 "opening_hours,formatted_phone_number,website,reviews"
        params = {"place_id": place_id, "fields": fields, "key": self._key}

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{PLACES_BASE}/details/json", params=params)
                resp.raise_for_status()
                data = resp.json().get("result", {})
        except Exception as exc:
            logger.error("Places detail failed", exc_info=exc)
            return None

        base = _parse_place(data, user_lat, user_lng, category)
        oh   = data.get("opening_hours", {})
        return PlaceDetailResponse(
            **base.model_dump(),
            phone          = data.get("formatted_phone_number"),
            website        = data.get("website"),
            opening_hours  = oh.get("weekday_text"),
            reviews_count  = data.get("user_ratings_total"),
        )

    async def geocode(self, address: str) -> Optional[GeocodeResponse]:
        if not self._has_key():
            return await self._osm_geocode(address)

        params = {"address": address, "key": self._key}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(GEOCODE_BASE, params=params)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.error("Geocode failed — falling back to Nominatim", exc_info=exc)
            return await self._osm_geocode(address)

        if data.get("status") != "OK" or not data.get("results"):
            return await self._osm_geocode(address)

        r   = data["results"][0]
        loc = r["geometry"]["location"]
        return GeocodeResponse(
            address   = address,
            formatted = r.get("formatted_address", address),
            lat       = loc["lat"],
            lng       = loc["lng"],
        )


# Singleton
location_service = LocationService()
