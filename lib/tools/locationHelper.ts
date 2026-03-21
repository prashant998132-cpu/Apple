// lib/tools/locationHelper.ts
// Fix: lat/lon se proper city name get karo

export async function getCityFromCoords(lat: number, lon: number): Promise<string> {
  try {
    // Open-Meteo geocoding reverse lookup
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'User-Agent': 'JARVIS-AI/1.0' } }
    )
    if (!r.ok) throw new Error('API fail')
    const d = await r.json()
    const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || 'Unknown'
    const state = d.address?.state || ''
    return `${city}, ${state}`.replace(', ', city && state ? ', ' : '')
  } catch {
    // Fallback: approximate from coordinates
    if (lat >= 23 && lat <= 25 && lon >= 81 && lon <= 83) return 'Rewa, MP'
    if (lat >= 28 && lat <= 29 && lon >= 76 && lon <= 78) return 'Delhi'
    if (lat >= 18 && lat <= 20 && lon >= 72 && lon <= 73) return 'Mumbai'
    if (lat >= 12 && lat <= 13 && lon >= 77 && lon <= 78) return 'Bangalore'
    return `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`
  }
}
