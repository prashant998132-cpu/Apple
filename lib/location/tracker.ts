import { saveCurrentLocation, loadCurrentLocation, appendLocationHistory, loadLocationHistory, savePlaces, loadPlaces as _loadPlaces } from '../storage'
export { loadCurrentLocation }
// lib/location/tracker.ts — v10.1
// GPS → Reverse Geocode → Auto home detection
// Storage: uses unified lib/storage (jarvis_v10 DB)

export interface LocationPoint {
  lat: number
  lon: number
  accuracy: number
  city?: string
  area?: string
  district?: string
  state?: string
  address?: string
  timestamp: number
  label?: 'home' | 'frequent' | 'unknown'
}

export interface SavedPlace {
  id: string
  name: string
  emoji: string
  lat: number
  lon: number
  radiusMeters: number
  visitCount?: number
  lastVisit?: number
}

// IDB ops via ../storage/index.ts

// ─── Distance (Haversine) ────────────────────────────────
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ─── GPS ─────────────────────────────────────────────────
export function getCurrentGPS(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('GPS not available')); return }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    })
  })
}

// ─── Reverse geocode — Nominatim (free, no key) ──────────
export async function reverseGeocode(lat: number, lon: number): Promise<Partial<LocationPoint>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=hi`,
      { headers: { 'User-Agent': 'JARVIS/9.8' }, signal: AbortSignal.timeout(5000) }
    )
    const d = await res.json()
    const a = d.address || {}
    return {
      city:     a.city || a.town || a.village || a.hamlet || a.municipality || '',
      area:     a.suburb || a.neighbourhood || a.county || a.village || '',
      district: a.county || a.state_district || '',
      state:    a.state || '',
      address:  d.display_name?.split(',').slice(0, 4).join(', ') || ''
    }
  } catch { return {} }
}

// ─── Auto home detection — zyada time kahan spend hota hai
export async function detectHome(): Promise<SavedPlace | null> {
  try {
    const history: LocationPoint[] = await loadLocationHistory()
    if (history.length < 10) return null // not enough data

    // Cluster points — find most frequent cluster
    const clusters: { lat: number; lon: number; count: number; totalTime: number }[] = []
    
    for (const point of history) {
      let found = false
      for (const cluster of clusters) {
        const dist = distanceKm(point.lat, point.lon, cluster.lat, cluster.lon) * 1000
        if (dist < 200) { // within 200m = same cluster
          cluster.count++
          cluster.lat = (cluster.lat + point.lat) / 2 // average
          cluster.lon = (cluster.lon + point.lon) / 2
          found = true
          break
        }
      }
      if (!found) clusters.push({ lat: point.lat, lon: point.lon, count: 1, totalTime: 0 })
    }

    // Most visited cluster = home
    clusters.sort((a, b) => b.count - a.count)
    const homeCluster = clusters[0]
    if (!homeCluster || homeCluster.count < 5) return null

    const geo = await reverseGeocode(homeCluster.lat, homeCluster.lon)
    return {
      id: 'home',
      name: `🏠 ${geo.city || geo.area || 'Ghar'}`,
      emoji: '🏠',
      lat: homeCluster.lat,
      lon: homeCluster.lon,
      radiusMeters: 200,
      visitCount: homeCluster.count,
      lastVisit: Date.now()
    }
  } catch { return null }
}

// ─── Get/Save places ──────────────────────────────────────


export async function loadPlaces(): Promise<SavedPlace[]> {
  return _loadPlaces()
}

export async function savePlace(place: SavedPlace): Promise<void> {
  const places = await loadPlaces()
  const idx = places.findIndex((p: any) => p.id === place.id)
  if (idx >= 0) places[idx] = place; else places.push(place)
  await savePlaces(places)
}

export async function saveHome(lat: number, lon: number): Promise<void> {
  const geo = await reverseGeocode(lat, lon)
  const places = await loadPlaces()
  const home = { id: 'home', emoji: '🏠', name: `🏠 ${geo.city || geo.area || 'Ghar'}`, lat, lon, radiusMeters: 200 }
  const idx = places.findIndex((p:any) => p.id === 'home')
  if (idx >= 0) places[idx] = home; else places.unshift(home)
  await savePlaces(places)
}

// ─── Match current location to saved place ───────────────
export async function matchPlace(lat: number, lon: number): Promise<SavedPlace | null> {
  const places: SavedPlace[] = await loadPlaces()
  for (const p of places) {
    if (distanceKm(lat, lon, p.lat, p.lon) * 1000 <= p.radiusMeters) return p
  }
  return null
}

// ─── Full location fetch (main function) ─────────────────
export async function getFullLocation(): Promise<LocationPoint | null> {
  try {
    const pos = await getCurrentGPS()
    const { latitude: lat, longitude: lon, accuracy } = pos.coords

    const geo = await reverseGeocode(lat, lon)
    const place = await matchPlace(lat, lon)

    const point: LocationPoint = {
      lat, lon, accuracy,
      timestamp: Date.now(),
      label: place?.id === 'home' ? 'home' : 'unknown',
      ...geo
    }

    // Save to IndexedDB
    await saveCurrentLocation(point)
    await appendLocationHistory(point)

    // Update place visit count
    if (place) {
      const ps = await loadPlaces(); const pi = ps.findIndex((p:any)=>p.id===place.id); if(pi>=0){ps[pi]={...place,visitCount:(place.visitCount||0)+1,lastVisit:Date.now()};await savePlaces(ps)}
    }

    // Periodically try to auto-detect home (every 20 points)
    const history = await idbGetAll('history')
    if (history.length % 20 === 0 && history.length > 0) {
      detectHome().then(async (home) => {
        if (home) {
          const existing = await idbGet('places', 'home')
          if (!existing) await savePlace(home) // only set if not manually set
        }
      }).catch(() => {})
    }

    return point
  } catch { return null }
}

// ─── Load cached location ────────────────────────────────


// ─── Format for AI context ───────────────────────────────
export async function formatLocationContext(): Promise<string> {
  const loc = await loadCurrentLocation()
  if (!loc) return ''
  
  const place = await matchPlace(loc.lat, loc.lon)
  const parts: string[] = []
  
  if (place) {
    parts.push(`${place.emoji} ${place.name} pe hai`)
  } else {
    const name = [loc.city, loc.area, loc.district].filter(Boolean).join(', ')
    parts.push(`${name || `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}`} mein hai`)
  }
  
  if (loc.state) parts.push(loc.state)
  
  const ageMin = Math.round((Date.now() - loc.timestamp) / 60000)
  if (ageMin < 60) parts.push(`${ageMin}m pehle updated`)
  
  return parts.join(' · ')
}

// ─── Get dynamic default city (for tools) ────────────────
export async function getDynamicCity(): Promise<string> {
  const loc = await loadCurrentLocation()
  if (loc?.city) return loc.city
  if (loc?.area) return loc.area
  return '' // no fallback — let AI handle
}

// Backward compat
export function syncLocationToCloud() { return Promise.resolve() }
