import { NextResponse } from 'next/server'

// Free weather API — OpenMeteo (no API key needed!)
// Geocoding via Nominatim (OpenStreetMap)

const CONDITION_MAP: Record<number, { text: string; emoji: string }> = {
  0:  { text: 'Clear sky', emoji: '☀️' },
  1:  { text: 'Mainly clear', emoji: '🌤️' },
  2:  { text: 'Partly cloudy', emoji: '⛅' },
  3:  { text: 'Overcast', emoji: '☁️' },
  45: { text: 'Foggy', emoji: '🌫️' },
  48: { text: 'Depositing rime fog', emoji: '🌫️' },
  51: { text: 'Light drizzle', emoji: '🌦️' },
  53: { text: 'Moderate drizzle', emoji: '🌦️' },
  55: { text: 'Dense drizzle', emoji: '🌧️' },
  61: { text: 'Slight rain', emoji: '🌧️' },
  63: { text: 'Moderate rain', emoji: '🌧️' },
  65: { text: 'Heavy rain', emoji: '🌧️' },
  71: { text: 'Slight snow', emoji: '🌨️' },
  73: { text: 'Moderate snow', emoji: '❄️' },
  75: { text: 'Heavy snow', emoji: '❄️' },
  77: { text: 'Snow grains', emoji: '🌨️' },
  80: { text: 'Slight showers', emoji: '🌦️' },
  81: { text: 'Moderate showers', emoji: '🌧️' },
  82: { text: 'Violent showers', emoji: '⛈️' },
  85: { text: 'Snow showers', emoji: '🌨️' },
  86: { text: 'Heavy snow showers', emoji: '❄️' },
  95: { text: 'Thunderstorm', emoji: '⛈️' },
  96: { text: 'Thunderstorm w/ hail', emoji: '⛈️' },
  99: { text: 'Thunderstorm w/ heavy hail', emoji: '⛈️' },
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get('city') || 'Rewa'

    // Geocoding
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'JARVIS-AI/11.0' }, next: { revalidate: 3600 } }
    )
    const geoData = await geoRes.json()
    if (!geoData.length) return NextResponse.json({ error: 'City not found' }, { status: 404 })

    const { lat, lon, display_name } = geoData[0]

    // Weather
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum` +
      `&timezone=auto&forecast_days=3`,
      { next: { revalidate: 1800 } }
    )
    const wData = await wRes.json()

    const cur = wData.current
    const cond = CONDITION_MAP[cur.weather_code] || { text: 'Unknown', emoji: '🌡️' }

    // Format 3-day forecast
    const forecast = wData.daily.time.slice(0, 3).map((date: string, i: number) => ({
      date,
      maxTemp: Math.round(wData.daily.temperature_2m_max[i]),
      minTemp: Math.round(wData.daily.temperature_2m_min[i]),
      condition: CONDITION_MAP[wData.daily.weather_code[i]] || { text: 'Unknown', emoji: '🌡️' },
      precipitation: wData.daily.precipitation_sum[i],
    }))

    return NextResponse.json({
      city: city,
      displayName: display_name.split(',').slice(0, 2).join(',').trim(),
      temperature: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      windSpeed: Math.round(cur.wind_speed_10m),
      precipitation: cur.precipitation,
      condition: cond,
      forecast,
      lat, lon,
      updatedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Weather fetch failed' }, { status: 500 })
  }
}
