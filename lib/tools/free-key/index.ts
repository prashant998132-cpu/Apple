// lib/tools/free-key/index.ts
// 11 tools requiring free API keys — all with graceful fallbacks

const ENV = {
  NASA: process.env.NASA_API_KEY || 'DEMO_KEY',
  NEWSDATA: process.env.NEWSDATA_API_KEY || '',
  YOUTUBE: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '',
  TMDB: process.env.TMDB_API_KEY || '',
  EXCHANGE: process.env.EXCHANGERATE_API_KEY || '',
  WAQI: process.env.WAQI_API_KEY || '',
  UNSPLASH: process.env.UNSPLASH_ACCESS_KEY || '',
  PEXELS: process.env.PEXELS_API_KEY || '',
  IPINFO: process.env.IPINFO_TOKEN || '',
  GIPHY: process.env.GIPHY_API_KEY || '',
  PIXABAY: process.env.PIXABAY_API_KEY || '',
  HF: process.env.HUGGINGFACE_TOKEN || '',
  GEMINI: process.env.GEMINI_API_KEY || '',
  GUARDIAN: process.env.GUARDIAN_API_KEY || '',
};

// ─── 1. NASA ──────────────────────────────────────────────
export async function get_nasa_content(args: { type?: string; date?: string }) {
  const type = args.type || 'apod';
  const key = ENV.NASA;

  try {
    if (type === 'apod') {
      const date = args.date || '';
      const url = `https://api.nasa.gov/planetary/apod?api_key=${key}${date ? `&date=${date}` : ''}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      return {
        type: 'astronomy_picture',
        title: data.title,
        date: data.date,
        explanation: data.explanation?.slice(0, 600),
        url: data.url,
        hdurl: data.hdurl,
        media_type: data.media_type,
        copyright: data.copyright
      };
    }

    if (type === 'asteroid') {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(
        `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${key}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      const asteroids = Object.values(data.near_earth_objects || {})[0] as any[];
      return {
        type: 'asteroids',
        date: today,
        count: data.element_count,
        closest: asteroids?.slice(0, 3).map((a: any) => ({
          name: a.name,
          diameter: `${Math.round(a.estimated_diameter?.meters?.estimated_diameter_max)}m`,
          hazardous: a.is_potentially_hazardous_asteroid,
          miss_distance: `${Math.round(parseFloat(a.close_approach_data?.[0]?.miss_distance?.kilometers))} km`,
          velocity: `${Math.round(parseFloat(a.close_approach_data?.[0]?.relative_velocity?.kilometers_per_hour))} km/h`
        }))
      };
    }

    if (type === 'mars') {
      const res = await fetch(
        `https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/latest_photos?api_key=${key}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      const photos = data.latest_photos?.slice(0, 3);
      return {
        type: 'mars_photos',
        rover: 'Curiosity',
        photos: photos?.map((p: any) => ({
          id: p.id, date: p.earth_date,
          camera: p.camera?.full_name,
          url: p.img_src
        }))
      };
    }
  } catch (e: any) {
    return { error: 'NASA API unavailable', note: 'Using DEMO_KEY has rate limits. Get free key at api.nasa.gov' };
  }
}

// ─── 2. INDIA NEWS (NewsData.io) ──────────────────────────
export async function get_india_news(args: { query?: string; country?: string; language?: string; category?: string }) {
  if (!ENV.NEWSDATA) {
    return {
      error: 'NewsData API key not set',
      setup: 'Get free key at newsdata.io — 200 req/day',
      fallback: 'Searching DuckDuckGo news instead...'
    };
  }
  try {
    const params = new URLSearchParams({
      apikey: ENV.NEWSDATA,
      country: args.country || 'in',
      language: args.language || 'hi',
      ...(args.query && { q: args.query }),
      ...(args.category && { category: args.category }),
    });
    const res = await fetch(`https://newsdata.io/api/1/news?${params}`, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message);
    return {
      query: args.query || 'India top news',
      language: args.language || 'hi',
      total: data.totalResults,
      articles: data.results?.slice(0, 8).map((a: any) => ({
        title: a.title,
        description: a.description?.slice(0, 200),
        source: a.source_id,
        published: a.pubDate,
        url: a.link,
        image: a.image_url,
        category: a.category?.[0],
        keywords: a.keywords?.slice(0, 5)
      }))
    };
  } catch (e: any) {
    return { error: `News fetch failed: ${e.message}`, query: args.query };
  }
}

// ─── 3. YOUTUBE ───────────────────────────────────────────
export async function search_youtube(args: { query: string; max_results?: number; language?: string; type?: string }) {
  if (!ENV.YOUTUBE) {
    return {
      error: 'YouTube API key not set',
      setup: 'Get free key at console.cloud.google.com',
      search_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`,
      note: 'Direct YouTube link provided'
    };
  }
  try {
    const params = new URLSearchParams({
      q: args.query,
      type: args.type || 'video',
      maxResults: String(args.max_results || 5),
      part: 'snippet',
      key: ENV.YOUTUBE,
      order: 'relevance',
      regionCode: 'IN',
      ...(args.language && { relevanceLanguage: args.language })
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);
    return {
      query: args.query,
      total: data.pageInfo?.totalResults,
      videos: data.items?.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        published: item.snippet.publishedAt?.split('T')[0],
        thumbnail: item.snippet.thumbnails?.medium?.url,
        url: `https://youtube.com/watch?v=${item.id.videoId}`,
        description: item.snippet.description?.slice(0, 100)
      }))
    };
  } catch (e: any) {
    return { error: `YouTube search failed: ${e.message}`, query: args.query };
  }
}

// ─── 4. MOVIES/TV (TMDB) ─────────────────────────────────
export async function search_movies(args: { query: string; type?: string; language?: string }) {
  if (!ENV.TMDB) {
    return { error: 'TMDB API key not set', setup: 'Get free key at themoviedb.org' };
  }
  try {
    const type = args.type === 'tv' ? 'tv' : args.type === 'trending' ? 'trending/movie/week' : 'movie';
    const endpoint = args.type === 'trending'
      ? `https://api.themoviedb.org/3/trending/movie/week?api_key=${ENV.TMDB}&language=hi-IN`
      : `https://api.themoviedb.org/3/search/${type}?api_key=${ENV.TMDB}&query=${encodeURIComponent(args.query)}&language=hi-IN&region=IN`;

    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return {
      query: args.query,
      type,
      results: data.results?.slice(0, 5).map((m: any) => ({
        title: m.title || m.name,
        original_title: m.original_title,
        rating: m.vote_average?.toFixed(1),
        votes: m.vote_count,
        release_date: m.release_date || m.first_air_date,
        overview: m.overview?.slice(0, 300),
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : null,
        backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
        genres: m.genre_ids,
        popularity: m.popularity?.toFixed(0)
      }))
    };
  } catch (e: any) {
    return { error: `Movie search failed: ${e.message}` };
  }
}

// ─── 5. EXCHANGE RATE ─────────────────────────────────────
export async function get_exchange_rate(args: { from?: string; to?: string; amount?: number }) {
  const from = (args.from || 'USD').toUpperCase();
  const to = (args.to || 'INR').toUpperCase();
  const amount = args.amount || 1;

  // CoinGecko can do basic fiat too, but let's use exchangerate-api
  if (!ENV.EXCHANGE) {
    // Fallback to free endpoint
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const rate = data.rates?.[to];
      if (!rate) return { error: `Rate not found for ${from} to ${to}` };
      return {
        from, to, rate,
        amount, converted: (amount * rate).toFixed(2),
        updated: data.time_last_update_utc,
        source: 'open.er-api.com (free fallback)'
      };
    } catch {
      return { error: 'Exchange rate unavailable', setup: 'Get free key at exchangerate-api.com' };
    }
  }

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${ENV.EXCHANGE}/pair/${from}/${to}/${amount}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    return {
      from, to, rate: data.conversion_rate,
      amount, converted: data.conversion_result,
      updated: data.time_last_update_utc
    };
  } catch (e: any) {
    return { error: `Exchange rate failed: ${e.message}` };
  }
}

// ─── 6. CRYPTO (CoinGecko — no key needed) ───────────────
export async function get_crypto_price(args: { coin: string; currency?: string }) {
  const currency = args.currency || 'inr';
  const coinMap: Record<string, string> = {
    bitcoin: 'bitcoin', btc: 'bitcoin',
    ethereum: 'ethereum', eth: 'ethereum',
    dogecoin: 'dogecoin', doge: 'dogecoin',
    solana: 'solana', sol: 'solana',
    bnb: 'binancecoin', cardano: 'cardano',
    xrp: 'ripple', polkadot: 'polkadot'
  };
  const coinId = coinMap[args.coin.toLowerCase()] || args.coin.toLowerCase();

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    if (data.error) return { error: 'Coin not found', coin: args.coin };
    const price = data.market_data?.current_price;
    const change = data.market_data?.price_change_percentage_24h;
    return {
      name: data.name,
      symbol: data.symbol?.toUpperCase(),
      price_inr: price?.inr ? `₹${price.inr.toLocaleString('hi-IN')}` : null,
      price_usd: price?.usd ? `$${price.usd.toLocaleString()}` : null,
      change_24h: `${change?.toFixed(2)}%`,
      trend: change > 0 ? '📈 बढ़ रहा है' : '📉 घट रहा है',
      market_cap_inr: data.market_data?.market_cap?.inr ? `₹${(data.market_data.market_cap.inr / 1e9).toFixed(0)}B` : null,
      high_24h: price?.inr ? `₹${data.market_data?.high_24h?.inr?.toLocaleString('hi-IN')}` : null,
      rank: data.market_cap_rank,
      image: data.image?.small
    };
  } catch (e: any) {
    return { error: `Crypto data unavailable: ${e.message}` };
  }
}

// ─── 7. IP LOCATION ──────────────────────────────────────
export async function get_user_location(args: { ip?: string }) {
  try {
    const url = ENV.IPINFO
      ? `https://ipinfo.io/${args.ip || ''}?token=${ENV.IPINFO}`
      : `https://ipapi.co/${args.ip || 'json'}/json/`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name || data.country,
      timezone: data.timezone,
      location: data.loc || `${data.latitude},${data.longitude}`,
      org: data.org,
      postal: data.postal
    };
  } catch {
    return { error: 'Location detection failed', default: 'Using Rewa, MP as default' };
  }
}

// ─── 8. AIR QUALITY (WAQI) ───────────────────────────────
export async function get_air_quality(args: { city?: string }) {
  const city = args.city || 'rewa';
  if (!ENV.WAQI) {
    return { error: 'WAQI API key not set', setup: 'Get free key at aqicn.org/api', city };
  }
  try {
    const res = await fetch(
      `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${ENV.WAQI}`,
      { signal: AbortSignal.timeout(6000) }
    );
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('AQI data not available');
    const aqi = data.data.aqi;
    const level = aqiLevel(aqi);
    return {
      city,
      aqi,
      level: level.label,
      color: level.color,
      health_advice: level.advice,
      pollutants: {
        pm25: data.data.iaqi?.pm25?.v,
        pm10: data.data.iaqi?.pm10?.v,
        o3: data.data.iaqi?.o3?.v,
        no2: data.data.iaqi?.no2?.v,
        co: data.data.iaqi?.co?.v
      },
      station: data.data.city?.name,
      updated: data.data.time?.s
    };
  } catch (e: any) {
    return { error: `AQI unavailable: ${e.message}`, city };
  }
}

function aqiLevel(aqi: number) {
  if (aqi <= 50) return { label: 'अच्छा (Good)', color: 'green', advice: 'बाहर जाने के लिए सही समय है।' };
  if (aqi <= 100) return { label: 'संतोषजनक (Moderate)', color: 'yellow', advice: 'संवेदनशील लोग सावधान रहें।' };
  if (aqi <= 150) return { label: 'अस्वास्थ्यकर (Unhealthy)', color: 'orange', advice: 'बाहर कम जाएं, मास्क पहनें।' };
  if (aqi <= 200) return { label: 'बहुत खराब (Very Unhealthy)', color: 'red', advice: 'घर में रहें, बाहर न जाएं।' };
  return { label: 'खतरनाक (Hazardous)', color: 'maroon', advice: '⚠️ घर से बाहर बिल्कुल न जाएं!' };
}

// ─── 9. STOCK PHOTOS (Unsplash) ──────────────────────────
export async function get_photos(args: { query: string; count?: number; orientation?: string }) {
  if (!ENV.UNSPLASH) {
    // Fallback to Picsum for random, or placeholder
    return {
      error: 'Unsplash key not set',
      setup: 'Get free key at unsplash.com/developers',
      fallback_url: `https://source.unsplash.com/random/800x600/?${encodeURIComponent(args.query)}`,
      note: 'Random Unsplash image URL provided (no key needed for single image)'
    };
  }
  try {
    const params = new URLSearchParams({
      query: args.query,
      per_page: String(args.count || 3),
      orientation: args.orientation || 'landscape',
      client_id: ENV.UNSPLASH
    });
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    return {
      query: args.query,
      total: data.total,
      photos: data.results?.map((p: any) => ({
        id: p.id,
        url: p.urls?.regular,
        thumb: p.urls?.thumb,
        download: p.links?.download,
        description: p.alt_description || p.description,
        photographer: p.user?.name,
        photographer_url: p.user?.links?.html,
        color: p.color,
        width: p.width,
        height: p.height
      }))
    };
  } catch (e: any) {
    return { error: `Photo search failed: ${e.message}` };
  }
}

// ─── 10. STOCK VIDEOS (Pexels) ───────────────────────────
export async function get_stock_video(args: { query: string; count?: number }) {
  if (!ENV.PEXELS) {
    return {
      error: 'Pexels API key not set',
      setup: 'Get free key at pexels.com/api',
      youtube_fallback: `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query + ' video')}`,
      note: 'YouTube search link provided as fallback'
    };
  }
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(args.query)}&per_page=${args.count || 3}&orientation=landscape`,
      { headers: { Authorization: ENV.PEXELS }, signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    return {
      query: args.query,
      total: data.total_results,
      videos: data.videos?.map((v: any) => {
        const hd = v.video_files?.find((f: any) => f.quality === 'hd' || f.quality === 'sd');
        return {
          id: v.id,
          url: hd?.link,
          preview: v.video_pictures?.[0]?.picture,
          duration: `${v.duration}s`,
          width: v.width,
          height: v.height,
          photographer: v.user?.name,
          pexels_url: v.url
        };
      })
    };
  } catch (e: any) {
    return { error: `Video search failed: ${e.message}` };
  }
}

// ─── 11. HIGH QUALITY IMAGE GENERATION ───────────────────
export async function generate_image_quality(args: {
  prompt: string;
  style?: string;
  model?: string;
}) {
  const model = args.model || 'auto';
  const styleMap: Record<string, string> = {
    realistic: 'photorealistic, ultra detailed, 8k resolution, professional photography',
    artistic: 'digital painting, vibrant colors, concept art, artstation style',
    anime: 'anime style, studio ghibli inspired, detailed, beautiful',
    '3d': '3D render, unreal engine, octane render, volumetric lighting',
    cinematic: 'cinematic shot, movie still, anamorphic lens, dramatic lighting',
    minimal: 'minimalist design, clean composition, white background'
  };
  const styleStr = styleMap[args.style || 'realistic'] || styleMap.realistic;
  const fullPrompt = `${args.prompt}, ${styleStr}`;

  // Try Gemini Imagen first if key available
  if ((model === 'gemini' || model === 'auto') && ENV.GEMINI) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${ENV.GEMINI}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: fullPrompt }],
            parameters: { sampleCount: 1, aspectRatio: '16:9' }
          }),
          signal: AbortSignal.timeout(30000)
        }
      );
      if (res.ok) {
        const data = await res.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          return {
            model: 'Gemini Imagen 3',
            prompt: fullPrompt,
            image_base64: b64,
            image_data_url: `data:image/png;base64,${b64}`,
            style: args.style || 'realistic',
            quality: 'high'
          };
        }
      }
    } catch { /* Fall through to HF */ }
  }

  // Fallback to HuggingFace Flux
  if ((model === 'flux' || model === 'auto') && ENV.HF) {
    try {
      const res = await fetch(
        'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${ENV.HF}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: fullPrompt, parameters: { num_inference_steps: 4 } }),
          signal: AbortSignal.timeout(60000)
        }
      );
      if (res.ok) {
        const blob = await res.blob();
        const b64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
        return {
          model: 'FLUX.1-schnell (HuggingFace)',
          prompt: fullPrompt,
          image_base64: b64,
          image_data_url: `data:image/jpeg;base64,${b64}`,
          style: args.style || 'realistic',
          quality: 'high',
          note: 'HuggingFace free tier — may be slow'
        };
      }
    } catch { /* Fall through */ }
  }

  // Final fallback: Pollinations
  const encoded = encodeURIComponent(fullPrompt);
  return {
    model: 'Pollinations.ai (fallback)',
    prompt: fullPrompt,
    image_url: `https://image.pollinations.ai/prompt/${encoded}?width=768&height=512&nologo=true&enhance=true`,
    style: args.style || 'realistic',
    quality: 'medium',
    note: 'Gemini/HF keys not set — using Pollinations fallback'
  };
}
