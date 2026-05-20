/**
 * useNearbyPlaces — Smart Hospital Finder hook.
 *
 * KEY BEHAVIOUR: User GPS location is ALWAYS used for hospital search.
 * Searching a place only pans the map — it never changes the search origin.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../lib/axios'

export const CATEGORIES = [
  { id: 'hospital',  label: 'Hospitals',   emoji: '🏥', color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    active: 'bg-red-600 text-white' },
  { id: 'clinic',    label: 'Clinics',     emoji: '🩺', color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   active: 'bg-blue-600 text-white' },
  { id: 'pharmacy',  label: 'Pharmacies',  emoji: '💊', color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  active: 'bg-green-600 text-white' },
  { id: 'ambulance', label: 'Ambulance',   emoji: '🚑', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', active: 'bg-orange-600 text-white' },
]

const DEFAULT_LOCATION = { lat: 12.9716, lng: 77.5946 }  // Bengaluru fallback

export function useNearbyPlaces() {
  // ── User GPS location (NEVER changes based on search) ─────────────────────
  const [userLocation,  setUserLocation]  = useState(null)
  const [locLoading,    setLocLoading]    = useState(true)
  const [locError,      setLocError]      = useState(null)

  // ── Map view location (changes when user searches a place) ────────────────
  const [mapCenter,     setMapCenter]     = useState(null)

  const [category,      setCategory]      = useState('hospital')
  const [radius,        setRadius]        = useState(10000)
  const [keyword,       setKeyword]       = useState('')

  const refreshTimerRef = useRef(null)

  // ── Get user GPS location ─────────────────────────────────────────────────
  const fetchUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setUserLocation(DEFAULT_LOCATION)
      setMapCenter(DEFAULT_LOCATION)
      setLocLoading(false)
      setLocError('Geolocation not supported.')
      return
    }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setMapCenter(loc)   // initially centre map on user
        setLocLoading(false)
        setLocError(null)
      },
      () => {
        setUserLocation(DEFAULT_LOCATION)
        setMapCenter(DEFAULT_LOCATION)
        setLocLoading(false)
        setLocError('Location access denied. Showing Bengaluru.')
        toast.error('Location access denied. Using Bengaluru as default.')
      },
      { timeout: 8000, maximumAge: 30000 }
    )
  }, [])

  // Get location on mount
  useEffect(() => {
    fetchUserLocation()
  }, [fetchUserLocation])

  // ── Auto-refresh location every 30 seconds ────────────────────────────────
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {}  // silent fail on refresh
      )
    }, 30000)
    return () => clearInterval(refreshTimerRef.current)
  }, [])

  // ── Search location: starts as user GPS, changes when user searches a place ─
  const [searchLocation, setSearchLocation] = useState(null)

  // The active search location — searched place if set, otherwise user GPS
  const activeLocation = searchLocation || userLocation

  // ── Hospital search — uses searchLocation if set, else userLocation ────────
  const placesQuery = useQuery({
    queryKey: ['nearby-places', activeLocation, category, radius, keyword],
    queryFn: async () => {
      if (!activeLocation) return { results: [], total: 0 }
      const params = new URLSearchParams({
        lat: activeLocation.lat,
        lng: activeLocation.lng,
        radius,
        category,
        ...(keyword ? { keyword } : {}),
      })
      const { data } = await api.get(`/location/nearby?${params}`)
      return data
    },
    enabled: !!activeLocation && !locLoading,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  // ── Geocode search — moves map AND updates search location ────────────────
  const geocodeMutation = useMutation({
    mutationFn: (address) =>
      api.get(`/location/geocode?address=${encodeURIComponent(address)}`).then(r => r.data),
    onSuccess: (data) => {
      const loc = { lat: data.lat, lng: data.lng }
      setSearchLocation(loc)   // update search origin
      setMapCenter(loc)        // pan map
      toast.success(`Showing hospitals near ${data.formatted}`)
    },
    onError: () => toast.error('Address not found. Please try a different search.'),
  })

  const searchByAddress = useCallback((address) => {
    if (address.trim()) geocodeMutation.mutate(address)
  }, [geocodeMutation])

  const resetToUserLocation = useCallback(() => {
    setSearchLocation(null)   // clear searched place → revert to GPS
    if (userLocation) setMapCenter(userLocation)
    fetchUserLocation()
  }, [userLocation, fetchUserLocation])

  return {
    userLocation,
    activeLocation,           // what's being searched (GPS or searched place)
    isSearchingPlace: !!searchLocation,  // true when showing a searched place
    mapCenter,
    locLoading,
    locError,
    category,   setCategory,
    radius,     setRadius,
    keyword,    setKeyword,
    places:     placesQuery.data?.results ?? [],
    total:      placesQuery.data?.total   ?? 0,
    isLoading:  placesQuery.isLoading || locLoading,
    isError:    placesQuery.isError,
    searchByAddress,
    isGeocoding: geocodeMutation.isPending,
    resetToUserLocation,
    refreshLocation: fetchUserLocation,
  }
}
