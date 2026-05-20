import { useState, useCallback, useEffect, useRef, Component } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import {
  FaSearch, FaMapMarkerAlt, FaSpinner, FaCrosshairs,
  FaList, FaMap, FaFilter, FaTimesCircle, FaPhone,
  FaDirections, FaHospital, FaExclamationTriangle,
  FaSync, FaInfoCircle, FaCopy, FaLink, FaCheckCircle,
} from 'react-icons/fa'
import { useNearbyPlaces, CATEGORIES } from '../hooks/useNearbyPlaces'

// ── Fix Leaflet default icon ──────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CATEGORY_COLORS = {
  hospital: '#dc2626', clinic: '#2563eb',
  pharmacy: '#16a34a', ambulance: '#ea580c',
}

const makePlaceIcon = (color, isEmergency = false) => L.divIcon({
  className: '',
  html: `<div style="width:${isEmergency?36:30}px;height:${isEmergency?36:30}px;border-radius:50%;background:${color};border:${isEmergency?'4px solid #fbbf24':'3px solid white'};box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:${isEmergency?16:13}px;">🏥</div>`,
  iconSize: [isEmergency?36:30, isEmergency?36:30],
  iconAnchor: [isEmergency?18:15, isEmergency?18:15],
  popupAnchor: [0, -18],
})

const USER_ICON = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,.6);position:relative;"><div style="position:absolute;top:-8px;left:-8px;width:36px;height:36px;border-radius:50%;background:rgba(37,99,235,.2);animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;"></div></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
})

const RADIUS_OPTIONS = [
  { value: 2000, label: '2 km' }, { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' }, { value: 20000, label: '20 km' },
  { value: 50000, label: '50 km' },
]

// ── Map error boundary — prevents Leaflet crash from killing the whole page ───
class MapErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
          <span className="text-4xl">🗺️</span>
          <p className="font-semibold text-gray-700">Map failed to load</p>
          <p className="text-sm text-gray-500">Use the list view to see nearby facilities</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            Retry Map
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Clipboard utility ─────────────────────────────────────────────────────────
async function copyToClipboard(text, successMsg) {
  // Method 1: Modern Clipboard API (works on HTTPS and localhost)
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(successMsg || 'Copied!')
      return
    } catch {
      // Fall through to method 2
    }
  }
  // Method 2: execCommand fallback (works on http://)
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (ok) {
      toast.success(successMsg || 'Copied!')
    } else {
      throw new Error('execCommand returned false')
    }
  } catch (err) {
    // Method 3: Show the text in a prompt so user can manually copy
    window.prompt('Copy this text (Ctrl+C / Cmd+C):', text)
  }
}

// ── Map controller ────────────────────────────────────────────────────────────
function MapViewController({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 })
  }, [center, zoom, map])
  return null
}

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
function fmtDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km` }

// ── Loading skeleton ──────────────────────────────────────────────────────────
function HospitalSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
        <div className="w-14 h-6 bg-gray-200 rounded-full flex-shrink-0" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="flex-1 h-8 bg-gray-100 rounded-lg" />
        <div className="flex-1 h-8 bg-gray-100 rounded-lg" />
        <div className="flex-1 h-8 bg-gray-100 rounded-lg" />
      </div>
    </div>
  )
}

// ── Hospital card ─────────────────────────────────────────────────────────────
function HospitalCard({ place, isSelected, onClick, userLocation, rank }) {
  const [copied, setCopied] = useState(null) // 'address' | 'phone' | 'link'

  const dist = userLocation
    ? haversine(userLocation.lat, userLocation.lng, place.location.lat, place.location.lng)
    : null
  const isEmergency = dist !== null && dist < 1000

  // Build the best possible address string
  const addressText = place.address && place.address.trim()
    ? place.address
    : place.name  // fallback to name if address is empty

  const destCoords = `${place.location.lat},${place.location.lng}`
  const originCoords = userLocation ? `${userLocation.lat},${userLocation.lng}` : ''

  // Build destination string: use address if available (Google Maps resolves it correctly),
  // fall back to coordinates only when no address exists
  const destQuery = place.address && place.address.trim()
    ? encodeURIComponent(`${place.name}, ${place.address}`)
    : destCoords

  // Directions: pass user GPS as origin explicitly so Google Maps doesn't show "Your location"
  const directionsUrl = userLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${destQuery}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${destQuery}&travelmode=driving`

  // Copy Link — search by name+address near coordinates
  const mapsUrl = place.address && place.address.trim()
    ? `https://www.google.com/maps/search/${encodeURIComponent(`${place.name}, ${place.address}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${destCoords}`

  // Copy Address — name + address if available, else coordinates
  const fullAddress = place.address && place.address.trim()
    ? `${place.name}, ${place.address}`
    : `${place.name} — ${place.location.lat}, ${place.location.lng}`

  const handleCopy = async (type, text, msg) => {
    await copyToClipboard(text, msg)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div onClick={onClick} className={clsx(
      'cursor-pointer rounded-2xl border bg-white p-4 transition-all duration-200',
      isEmergency && !isSelected && 'border-amber-300 bg-amber-50',
      isSelected ? 'border-primary-400 shadow-lg ring-2 ring-primary-200'
        : 'border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5'
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={clsx(
          'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl text-white text-sm font-bold',
          isEmergency ? 'bg-amber-500' : 'bg-red-500'
        )}>{rank}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 leading-snug">{place.name}</h3>
            {isEmergency && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-700">
                <FaExclamationTriangle className="h-2.5 w-2.5" /> Nearest
              </span>
            )}
          </div>
          {place.address && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <FaMapMarkerAlt className="h-3 w-3 flex-shrink-0 text-gray-400" />
              <span className="truncate">{addressText}</span>
            </p>
          )}
          {place.phone && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
              <FaPhone className="h-3 w-3 flex-shrink-0 text-gray-400" />
              <span>{place.phone}</span>
            </p>
          )}
          {place.rating && (
            <p className="mt-0.5 text-xs text-amber-600 font-medium">
              ⭐ {place.rating.toFixed(1)}
              {place.total_ratings && <span className="text-gray-400 font-normal"> ({place.total_ratings})</span>}
            </p>
          )}
          {place.open_now !== null && place.open_now !== undefined && (
            <span className={clsx(
              'inline-flex items-center gap-1 mt-0.5 rounded-full px-2 py-0.5 text-2xs font-semibold',
              place.open_now ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            )}>
              <span className={clsx('h-1.5 w-1.5 rounded-full', place.open_now ? 'bg-green-500' : 'bg-red-500')} />
              {place.open_now ? 'Open now' : 'Closed'}
            </span>
          )}
        </div>
        <div className={clsx(
          'flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
          isEmergency ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'
        )}>
          {dist !== null ? fmtDist(dist) : (place.distance_text || '—')}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
        {/* Directions */}
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors">
          <FaDirections className="h-3.5 w-3.5" /> Directions
        </a>
        {/* Call */}
        {place.phone ? (
          <a href={`tel:${place.phone}`}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors">
            <FaPhone className="h-3.5 w-3.5" /> Call
          </a>
        ) : (
          <a href={`https://www.google.com/search?q=${encodeURIComponent(place.name + ' hospital phone')}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <FaSearch className="h-3.5 w-3.5" /> Find Number
          </a>
        )}
        {/* Copy Address */}
        <button
          onClick={() => handleCopy('address', fullAddress, 'Hospital address copied!')}
          className={clsx(
            'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
            copied === 'address'
              ? 'bg-green-500 text-white'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          )}>
          {copied === 'address' ? <FaCheckCircle className="h-3.5 w-3.5" /> : <FaCopy className="h-3.5 w-3.5" />}
          {copied === 'address' ? 'Copied!' : 'Copy Address'}
        </button>
        {/* Copy Map Link */}
        <button
          onClick={() => handleCopy('link', mapsUrl, 'Map link copied!')}
          className={clsx(
            'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
            copied === 'link'
              ? 'bg-green-500 text-white'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          )}>
          {copied === 'link' ? <FaCheckCircle className="h-3.5 w-3.5" /> : <FaLink className="h-3.5 w-3.5" />}
          {copied === 'link' ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClinicFinderPage() {
  const { t } = useTranslation()
  const {
    userLocation, activeLocation, isSearchingPlace, mapCenter, locLoading, locError,
    category, setCategory, radius, setRadius, setKeyword,
    places, total, isLoading, isError,
    searchByAddress, isGeocoding,
    resetToUserLocation, refreshLocation,
  } = useNearbyPlaces()

  const [searchInput,   setSearchInput]   = useState('')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [mobileView,    setMobileView]    = useState('list')
  const [showFilters,   setShowFilters]   = useState(false)
  const [mapFlyTo,      setMapFlyTo]      = useState(null)
  const debounceRef = useRef(null)

  const catInfo = CATEGORIES.find(c => c.id === category) || CATEGORIES[0]
  const sortedPlaces = [...places].sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0))

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchInput.trim()) searchByAddress(searchInput.trim())
  }

  // Debounced search
  const handleSearchInput = (val) => {
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    if (val.trim().length > 3) {
      debounceRef.current = setTimeout(() => searchByAddress(val.trim()), 600)
    }
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setKeyword('')
    resetToUserLocation()
    setMapFlyTo(null)
  }

  const handleSelectPlace = useCallback((place) => {
    setSelectedPlace(place)
    setMapFlyTo({ lat: place.location.lat, lng: place.location.lng, zoom: 16 })
    setMobileView('map')
  }, [])

  const mapCenterArr = mapCenter ? [mapCenter.lat, mapCenter.lng] : [12.9716, 77.5946]
  const userArr = userLocation ? [userLocation.lat, userLocation.lng] : null

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-3">
          {/* Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FaHospital className="text-red-500" /> {t('clinicFinder.title')}
              </h1>
              <p className="text-xs text-gray-500">
                {isLoading ? t('clinicFinder.searching')
                  : `${total} ${catInfo.label.toLowerCase()} found ${isSearchingPlace ? 'near searched place' : 'near your location'}`}
                {locError && <span className="ml-2 text-amber-600">· {locError}</span>}
              </p>
            </div>
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5 lg:hidden">
              {['list','map'].map(v => (
                <button key={v} onClick={() => setMobileView(v)}
                  className={clsx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    mobileView === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
                  {v === 'map' ? <FaMap className="h-3 w-3" /> : <FaList className="h-3 w-3" />}
                  {v === 'map' ? 'Map' : 'List'}
                </button>
              ))}
            </div>
          </div>

          {/* Mode banner */}
          {isSearchingPlace ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2">
              <FaMapMarkerAlt className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
              <p className="text-xs text-green-800 flex-1">
                Showing hospitals near <strong>searched place</strong>
              </p>
              <button onClick={() => { handleClearSearch(); resetToUserLocation() }}
                className="flex-shrink-0 rounded-lg bg-green-600 text-white px-2.5 py-1 text-xs font-semibold hover:bg-green-700 transition-colors">
                Back to My Location
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
              <FaCrosshairs className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700">
                Showing hospitals near <strong>your current GPS location</strong>.
                Search any place to see hospitals there.
                {userLocation && <span className="text-blue-400 ml-1">({userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)})</span>}
              </p>
            </div>
          )}

          {/* Search row */}
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" value={searchInput}
                onChange={e => handleSearchInput(e.target.value)}
                placeholder="Search any place (Mandya, Mysore, Tumkur…)"
                className="input-field pl-9 pr-8 text-sm" />
              {searchInput && (
                <button type="button" onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <FaTimesCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
            <button onClick={handleSearch} disabled={isGeocoding} className="btn-primary px-4 text-sm">
              {isGeocoding ? <FaSpinner className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
            <button onClick={() => { refreshLocation(); toast.success('Refreshing location…') }}
              title="Refresh my location"
              className="btn-secondary px-3 gap-1.5 text-xs hidden sm:flex items-center">
              <FaSync className={clsx('h-3.5 w-3.5', locLoading && 'animate-spin')} />
              <span>My Location</span>
            </button>
            <button onClick={() => setShowFilters(v => !v)}
              className={clsx('btn-secondary px-3', showFilters && 'bg-primary-50 border-primary-300 text-primary-700')}>
              <FaFilter className="h-4 w-4" />
            </button>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => { setCategory(cat.id); setSelectedPlace(null) }}
                className={clsx(
                  'flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                  category === cat.id ? cat.active : `${cat.bg} ${cat.border} ${cat.color} hover:opacity-80`
                )}>
                <span>{cat.emoji}</span>{cat.label}
              </button>
            ))}
          </div>

          {/* Radius filter */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 p-3 animate-fade-in">
              <span className="text-xs font-medium text-gray-600">Search radius:</span>
              {RADIUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setRadius(opt.value)}
                  className={clsx('rounded-full border px-3 py-1 text-xs font-medium transition-all',
                    radius === opt.value
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300')}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Results list */}
        <div className={clsx(
          'flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50',
          'w-full lg:w-[440px] xl:w-[480px]',
          mobileView === 'list' ? 'flex flex-col lg:flex' : 'hidden lg:flex lg:flex-col'
        )}>
          <div className="p-3 space-y-2">
            {isLoading ? (
              // Loading skeletons
              <>
                <p className="px-1 text-xs font-medium text-gray-400 pb-1 animate-pulse">Finding nearest facilities…</p>
                {[1,2,3,4,5].map(i => <HospitalSkeleton key={i} />)}
              </>
            ) : isError ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <FaMapMarkerAlt className="h-10 w-10 text-gray-200" />
                <p className="text-sm font-medium text-gray-600">Failed to load results</p>
                <p className="text-xs text-gray-400">Check your connection or try a larger radius</p>
                <button onClick={() => setRadius(Math.min(radius * 2, 50000))}
                  className="btn-primary text-sm px-4 py-2 mt-1">
                  Try {Math.min(radius * 2, 50000) / 1000} km radius
                </button>
              </div>
            ) : sortedPlaces.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="text-5xl">{catInfo.emoji}</span>
                <p className="font-semibold text-gray-700">No {catInfo.label.toLowerCase()} found nearby</p>
                <p className="text-sm text-gray-500">Currently searching within {radius/1000} km</p>
                <button onClick={() => setRadius(Math.min(radius * 2, 50000))}
                  className="btn-primary text-sm px-4 py-2">
                  Expand to {Math.min(radius * 2, 50000) / 1000} km
                </button>
              </div>
            ) : (
              <>
                <p className="px-1 text-xs font-medium text-gray-500 pb-1">
                  {sortedPlaces.length} nearest — sorted by distance from {isSearchingPlace ? 'searched place' : 'your GPS location'}
                  {!isSearchingPlace && userLocation && (
                    <span className="text-gray-400"> ({userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)})</span>
                  )}
                </p>
                {sortedPlaces.map((place, i) => (
                  <HospitalCard key={place.place_id} place={place} rank={i + 1}
                    isSelected={selectedPlace?.place_id === place.place_id}
                    onClick={() => handleSelectPlace(place)}
                    userLocation={activeLocation} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Leaflet Map */}
        <div className={clsx('relative flex-1', mobileView === 'map' ? 'flex' : 'hidden lg:flex')}>
          {locLoading ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-50">
              <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
              <p className="text-sm text-gray-500">Getting your location…</p>
            </div>
          ) : (
            <MapErrorBoundary>
            <MapContainer center={mapCenterArr} zoom={13}
              style={{ height: '100%', width: '100%' }} zoomControl={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {mapFlyTo && <MapViewController center={[mapFlyTo.lat, mapFlyTo.lng]} zoom={mapFlyTo.zoom} />}
              {!mapFlyTo && mapCenter && <MapViewController center={[mapCenter.lat, mapCenter.lng]} />}

              {/* User location */}
              {userArr && (
                <>
                  <Circle center={userArr} radius={200}
                    pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.1, weight: 1 }} />
                  <Marker position={userArr} icon={USER_ICON}>
                    <Popup>
                      <div style={{ minWidth: 140 }}>
                        <p style={{ fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>📍 Your Location</p>
                        <p style={{ fontSize: 11, color: '#6b7280' }}>Hospitals sorted by distance from here</p>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}

              {/* Hospital markers */}
              {sortedPlaces.map((place, i) => {
                const dist = activeLocation
                  ? haversine(activeLocation.lat, activeLocation.lng, place.location.lat, place.location.lng)
                  : null
                const isEmergency = dist !== null && dist < 1000
                const icon = makePlaceIcon(CATEGORY_COLORS[place.category] || '#dc2626', isEmergency)
                const destCoords = `${place.location.lat},${place.location.lng}`
                const originCoords = userLocation ? `${userLocation.lat},${userLocation.lng}` : ''
                const destQuery = place.address && place.address.trim()
                  ? encodeURIComponent(`${place.name}, ${place.address}`)
                  : destCoords
                const directionsUrl = userLocation
                  ? `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${destQuery}&travelmode=driving`
                  : `https://www.google.com/maps/dir/?api=1&destination=${destQuery}&travelmode=driving`
                return (
                  <Marker key={place.place_id}
                    position={[place.location.lat, place.location.lng]}
                    icon={icon}
                    eventHandlers={{ click: () => handleSelectPlace(place) }}>
                    <Popup>
                      <div style={{ minWidth: 210, fontFamily: 'Inter, sans-serif' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ background: '#dc2626', color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i+1}</span>
                          <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{place.name}</p>
                        </div>
                        {place.address && <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{place.address}</p>}
                        <p style={{ fontSize: 12, fontWeight: 600, color: isEmergency ? '#d97706' : '#374151', marginBottom: 4 }}>
                          📍 {dist !== null ? fmtDist(dist) : place.distance_text} from you
                        </p>
                        {place.rating && <p style={{ fontSize: 11, marginBottom: 4 }}>⭐ {place.rating.toFixed(1)}</p>}
                        {place.phone && <p style={{ fontSize: 11, marginBottom: 6 }}>📞 {place.phone}</p>}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, textAlign: 'center', background: '#eff6ff', color: '#2563eb', padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none', minWidth: 80 }}>
                            🗺 Directions
                          </a>
                          {place.phone && (
                            <a href={`tel:${place.phone}`}
                              style={{ flex: 1, textAlign: 'center', background: '#f0fdf4', color: '#16a34a', padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none', minWidth: 60 }}>
                              📞 Call
                            </a>
                          )}
                          <button onClick={() => copyToClipboard(place.address ? `${place.name}, ${place.address}` : place.name, 'Address copied!')}
                            style={{ flex: 1, textAlign: 'center', background: '#f9fafb', color: '#374151', padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', minWidth: 80 }}>
                            📋 Copy Address
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
            </MapErrorBoundary>
          )}

          {/* Badges */}
          {!isLoading && sortedPlaces.length > 0 && (
            <div className="absolute left-3 top-3 z-[1000] rounded-full bg-white px-3 py-1.5 shadow-card text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <FaHospital className="h-3 w-3 text-red-500" />
              {total} {catInfo.label.toLowerCase()} nearby
            </div>
          )}
          <button onClick={() => { resetToUserLocation(); setMapFlyTo(null) }}
            className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 shadow-card text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <FaCrosshairs className="h-3.5 w-3.5 text-primary-600" /> My Location
          </button>
          <div className="absolute bottom-6 right-3 z-[1000] rounded-lg bg-white/90 px-2 py-1 text-2xs text-gray-400 shadow-sm">
            Map: OpenStreetMap · Data: Overpass API
          </div>
        </div>
      </div>
    </div>
  )
}
