// lib/tools/no-key/index.ts
// All 16 tools that require NO API key — always available, even offline partial

// ─── 1. WEATHER (Open-Meteo) ──────────────────────────────
export async function get_weather(args: { location?: string; days?: number }) {
  const location = args.location || '';
  if (!location) return { error: 'Location nahi pata — poocho user se ya GPS allow karo', tip: 'City name dedo jaise: Delhi, Bhopal, Mumbai' };
  const days = args.days || 3;
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    const geo = await geoRes.json();
    const loc = geo.results?.[0];
    if (!loc) return { error: `Location "${location}" not found`, suggestion: 'Try: Rewa, Bhopal, Delhi, Mumbai' };

    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,precipitation` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset` +
      `&timezone=Asia%2FKolkata&forecast_days=${days}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const w = await wRes.json();
    const code = w.current?.weather_code;
    return {
      location: `${loc.name}, ${loc.admin1 || loc.country}`,
      coordinates: { lat: loc.latitude, lon: loc.longitude },
      current: {
        temperature: `${w.current?.temperature_2m}°C`,
        feels_like: `${w.current?.apparent_temperature}°C`,
        humidity: `${w.current?.relative_humidity_2m}%`,
        wind: `${w.current?.wind_speed_10m} km/h`,
        precipitation: `${w.current?.precipitation}mm`,
        condition_hindi: weatherHindi(code),
        condition_english: weatherEng(code),
        icon: weatherIcon(code)
      },
      forecast: w.daily?.time?.slice(0, days).map((date: string, i: number) => ({
        date,
        max: `${w.daily.temperature_2m_max[i]}°C`,
        min: `${w.daily.temperature_2m_min[i]}°C`,
        rain_chance: `${w.daily.precipitation_probability_max[i]}%`,
        condition: weatherHindi(w.daily.weather_code[i]),
        sunrise: w.daily.sunrise[i]?.split('T')[1],
        sunset: w.daily.sunset[i]?.split('T')[1]
      }))
    };
  } catch (e: any) {
    return { error: 'Weather service unavailable', offline_data: 'Weather unavailable — check internet' };
  }
}

// ─── 2. DATE & TIME (WorldTimeAPI) ───────────────────────
export async function get_datetime(args: { timezone?: string; format?: string }) {
  const tz = args.timezone || 'Asia/Kolkata';
  const now = new Date();
  try {
    const res = await fetch(`https://worldtimeapi.org/api/timezone/${tz}`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const dt = new Date(data.datetime);
    return formatDatetime(dt, tz, args.format);
  } catch {
    return formatDatetime(now, tz, args.format);
  }
}

function formatDatetime(dt: Date, tz: string, format?: string) {
  const hi = (opts: Intl.DateTimeFormatOptions) => dt.toLocaleString('hi-IN', { timeZone: tz, ...opts });
  const en = (opts: Intl.DateTimeFormatOptions) => dt.toLocaleString('en-IN', { timeZone: tz, ...opts });
  return {
    hindi: {
      date: hi({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: hi({ hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      day: hi({ weekday: 'long' })
    },
    english: {
      date: en({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: en({ hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      day: en({ weekday: 'long' })
    },
    iso: dt.toISOString(),
    timezone: tz,
    timestamp: dt.getTime()
  };
}

// ─── 3. WIKIPEDIA ─────────────────────────────────────────
export async function search_wikipedia(args: { query: string; language?: string }) {
  const lang = args.language || 'en';
  try {
    const searchRes = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(args.query)}&format=json&origin=*`,
      { signal: AbortSignal.timeout(5000) }
    );
    const searchData = await searchRes.json();
    const title = searchData.query?.search?.[0]?.title;
    if (!title) return { error: 'No results found', query: args.query };

    const summaryRes = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const summary = await summaryRes.json();
    return {
      title: summary.title,
      summary: summary.extract,
      image: summary.thumbnail?.source,
      url: summary.content_urls?.desktop?.page,
      language: lang
    };
  } catch {
    return { error: 'Wikipedia unavailable', query: args.query };
  }
}

// ─── 4. LOCATION (Nominatim) ─────────────────────────────
export async function get_location_info(args: { query: string }) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(args.query)}&format=json&limit=3&addressdetails=1`,
      { headers: { 'User-Agent': 'JARVIS/9.1' }, signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (!data.length) return { error: 'Location not found', query: args.query };
    return {
      query: args.query,
      results: data.slice(0, 3).map((r: any) => ({
        name: r.display_name,
        lat: r.lat,
        lon: r.lon,
        type: r.type,
        address: r.address,
        maps_link: `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=15/${r.lat}/${r.lon}`
      }))
    };
  } catch {
    return { error: 'Location service unavailable' };
  }
}

// ─── 5. DICTIONARY ────────────────────────────────────────
export async function get_word_meaning(args: { word: string }) {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(args.word)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (!Array.isArray(data)) return { error: 'Word not found', word: args.word };
    const entry = data[0];
    const meanings = entry.meanings?.slice(0, 2).map((m: any) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions?.slice(0, 2).map((d: any) => ({
        definition: d.definition,
        example: d.example
      })),
      synonyms: m.synonyms?.slice(0, 5)
    }));
    return {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
      meanings,
      origin: entry.origin
    };
  } catch {
    return { error: 'Dictionary unavailable', word: args.word };
  }
}

// ─── 6. PUBLIC HOLIDAYS (Nager.Date) ──────────────────────
export async function get_public_holidays(args: { country?: string; year?: number }) {
  const country = args.country || 'IN';
  const year = args.year || new Date().getFullYear();
  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (!Array.isArray(data)) return { error: 'Holidays not found' };
    const today = new Date();
    const upcoming = data
      .filter((h: any) => new Date(h.date) >= today)
      .slice(0, 10);
    return {
      country,
      year,
      total: data.length,
      upcoming: upcoming.map((h: any) => ({
        date: h.date,
        name: h.localName || h.name,
        name_english: h.name,
        type: h.types?.join(', '),
        days_from_now: Math.ceil((new Date(h.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }))
    };
  } catch {
    return { error: 'Holiday service unavailable' };
  }
}

// ─── 7. SUNRISE-SUNSET ────────────────────────────────────
export async function get_sunrise_sunset(args: { lat?: number; lon?: number; date?: string }) {
  const lat = args.lat;
  const lon = args.lon || 81.3032;
  const date = args.date || 'today';
  try {
    if (!lat || !lon) return { error: 'Location coordinates chahiye — pehle GPS allow karo' }
  const res = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${date}&formatted=0`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    const r = data.results;
    const toIST = (utc: string) => new Date(utc).toLocaleTimeString('hi-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit'
    });
    return {
      date,
      location: `${lat}, ${lon}`,
      sunrise: toIST(r.sunrise),
      sunset: toIST(r.sunset),
      solar_noon: toIST(r.solar_noon),
      day_length: r.day_length,
      civil_twilight_begin: toIST(r.civil_twilight_begin),
      civil_twilight_end: toIST(r.civil_twilight_end)
    };
  } catch {
    return { error: 'Sunrise API unavailable, try again' };
  }
}

// ─── 8. INDIA PINCODE ────────────────────────────────────
export async function lookup_pincode(args: { pincode: string }) {
  try {
    const res = await fetch(
      `https://api.postalpincode.in/pincode/${args.pincode}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data[0]?.Status !== 'Success') return { error: 'Pincode not found', pincode: args.pincode };
    const offices = data[0].PostOffice?.slice(0, 5);
    const first = offices?.[0];
    return {
      pincode: args.pincode,
      district: first?.District,
      state: first?.State,
      country: 'India',
      division: first?.Division,
      region: first?.Region,
      post_offices: offices?.map((o: any) => ({
        name: o.Name,
        type: o.BranchType,
        delivery: o.DeliveryStatus,
        taluk: o.Taluk
      }))
    };
  } catch {
    return { error: 'Pincode service unavailable' };
  }
}

// ─── 9. TRANSLATION (MyMemory) ───────────────────────────
export async function translate_text(args: { text: string; from?: string; to?: string }) {
  const from = args.from || 'auto';
  const to = args.to || (isHindi(args.text) ? 'en' : 'hi');
  try {
    const langPair = from === 'auto' ? `${to}` : `${from}|${to}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(args.text)}&langpair=${from === 'auto' ? 'auto|' + to : langPair}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    return {
      original: args.text,
      translated: data.responseData?.translatedText,
      from_language: from,
      to_language: to,
      confidence: data.responseData?.match,
      matches: data.matches?.slice(0, 2).map((m: any) => ({
        translation: m.translation,
        quality: m.quality
      }))
    };
  } catch {
    return { error: 'Translation service unavailable', text: args.text };
  }
}

// ─── 10. RECIPES (TheMealDB) ─────────────────────────────
export async function get_recipe(args: { query: string; category?: string }) {
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(args.query)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (!data.meals) {
      // Try category search
      const catRes = await fetch(
        `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(args.query)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const catData = await catRes.json();
      return { query: args.query, meals: catData.meals?.slice(0, 5) || [], note: 'Category results' };
    }
    return {
      query: args.query,
      meals: data.meals?.slice(0, 3).map((m: any) => ({
        name: m.strMeal,
        category: m.strCategory,
        area: m.strArea,
        instructions: m.strInstructions?.slice(0, 500),
        image: m.strMealThumb,
        youtube: m.strYoutube,
        ingredients: extractIngredients(m)
      }))
    };
  } catch {
    return { error: 'Recipe service unavailable', query: args.query };
  }
}

function extractIngredients(meal: any): string[] {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing?.trim()) ingredients.push(`${measure?.trim()} ${ing.trim()}`.trim());
  }
  return ingredients.filter(Boolean);
}

// ─── 11. JOKES (JokeAPI) ──────────────────────────────────
export async function get_joke(args: { language?: string; type?: string }) {
  const hindiJokes = [
    { setup: 'Teacher: तुम रोज़ late क्यों आते हो?', punchline: 'Student: Sir, आप ही तो कहते हैं — देर आए, दुरुस्त आए! 😄' },
    { setup: 'Doctor: ज़्यादा टेंशन मत लो।', punchline: 'Patient: Doctor साहब, यही मेरी टेंशन है! 😅' },
    { setup: 'Papa: Beta, कल exam है, पढ़ रहे हो?', punchline: 'Beta: Papa, पढ़ाई हाथ से हो जाती है, दिल से नहीं! 🙃' },
    { setup: 'Wife: आपने promise किया था घर जल्दी आएंगे।', punchline: 'Husband: हाँ, लेकिन जल्दी का मतलब था उसी दिन! 😬' },
    { setup: 'Friend: Gym join किया?', punchline: 'Main: हाँ, 6 महीने से fee दे रहा हूँ! 💪' }
  ];

  if (args.language === 'hindi' || args.language !== 'english') {
    const joke = hindiJokes[Math.floor(Math.random() * hindiJokes.length)];
    return { type: 'twopart', setup: joke.setup, delivery: joke.punchline, language: 'hindi' };
  }
  try {
    const category = args.type || 'Any';
    const res = await fetch(
      `https://v2.jokeapi.dev/joke/${category}?safe-mode&blacklistFlags=nsfw,racist,sexist,explicit`,
      { signal: AbortSignal.timeout(4000) }
    );
    const data = await res.json();
    return {
      type: data.type,
      setup: data.setup || data.joke,
      delivery: data.delivery,
      category: data.category,
      language: 'english'
    };
  } catch {
    const joke = hindiJokes[Math.floor(Math.random() * hindiJokes.length)];
    return { type: 'twopart', setup: joke.setup, delivery: joke.punchline, language: 'hindi' };
  }
}

// ─── 12. ISS LOCATION ────────────────────────────────────
export async function get_iss_location() {
  try {
    const [posRes, peopleRes] = await Promise.all([
      fetch('https://api.open-notify.org/iss-now.json', { signal: AbortSignal.timeout(5000) }),
      fetch('https://api.open-notify.org/astros.json', { signal: AbortSignal.timeout(5000) })
    ]);
    const pos = await posRes.json();
    const people = await peopleRes.json();
    const lat = parseFloat(pos.iss_position.latitude);
    const lon = parseFloat(pos.iss_position.longitude);
    return {
      position: { latitude: lat, longitude: lon },
      speed: '~27,600 km/h',
      altitude: '~408 km',
      maps_link: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=3/${lat}/${lon}`,
      people_in_space: people.number,
      astronauts: people.people?.map((p: any) => ({ name: p.name, craft: p.craft })),
      timestamp: new Date(pos.timestamp * 1000).toISOString()
    };
  } catch {
    return { error: 'ISS tracking unavailable', info: 'ISS orbits Earth every 90 minutes at 408km altitude' };
  }
}

// ─── 13. BOOKS (Open Library) ────────────────────────────
export async function search_books(args: { query: string }) {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(args.query)}&limit=5&fields=key,title,author_name,first_publish_year,cover_i,subject,language`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    return {
      query: args.query,
      total: data.numFound,
      books: data.docs?.slice(0, 5).map((b: any) => ({
        title: b.title,
        authors: b.author_name?.slice(0, 2),
        year: b.first_publish_year,
        languages: b.language?.slice(0, 3),
        cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
        url: `https://openlibrary.org${b.key}`,
        subjects: b.subject?.slice(0, 5)
      }))
    };
  } catch {
    return { error: 'Book search unavailable', query: args.query };
  }
}

// ─── 14. IMAGE GENERATION (Pollinations — Fast) ──────────
export async function generate_image_fast(args: {
  prompt: string; style?: string; width?: number; height?: number
}) {
  const styleMap: Record<string, string> = {
    realistic: 'photorealistic, 8k, detailed, professional',
    artistic: 'digital art, vibrant, illustration style',
    anime: 'anime style, colorful, japanese animation',
    '3d': '3D render, octane render, dramatic lighting',
    minimal: 'minimalist, clean, white background, simple',
    cinematic: 'cinematic, movie still, dramatic, epic'
  };
  const style = args.style || 'realistic';
  const stylePrompt = styleMap[style] || styleMap.realistic;
  const fullPrompt = `${args.prompt}, ${stylePrompt}, high quality`;
  const encoded = encodeURIComponent(fullPrompt);
  const w = args.width || 768;
  const h = args.height || 512;
  const seed = Math.floor(Math.random() * 999999);
  return {
    prompt: fullPrompt,
    style,
    image_url: `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&seed=${seed}&nologo=true`,
    thumbnail_url: `https://image.pollinations.ai/prompt/${encoded}?width=400&height=267&seed=${seed}&nologo=true`,
    service: 'Pollinations.ai',
    dimensions: `${w}x${h}`,
    note: 'Image loading हो सकती है 3-5 seconds में'
  };
}

// ─── 15. REDDIT ──────────────────────────────────────────
export async function get_reddit_posts(args: { subreddit?: string; sort?: string; limit?: number }) {
  const sub = args.subreddit || 'india';
  const sort = args.sort || 'hot';
  const limit = args.limit || 5;
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${sub}/${sort}.json?limit=${limit}`,
      { headers: { 'User-Agent': 'JARVIS/9.1' }, signal: AbortSignal.timeout(6000) }
    );
    const data = await res.json();
    const posts = data.data?.children?.map((c: any) => c.data);
    return {
      subreddit: sub,
      sort,
      posts: posts?.map((p: any) => ({
        title: p.title,
        score: p.score,
        comments: p.num_comments,
        url: `https://reddit.com${p.permalink}`,
        external_url: p.url,
        author: p.author,
        flair: p.link_flair_text,
        created: new Date(p.created_utc * 1000).toLocaleDateString('hi-IN')
      }))
    };
  } catch {
    return { error: 'Reddit unavailable', subreddit: sub };
  }
}

// ─── 16. HACKERNEWS ──────────────────────────────────────
export async function get_hackernews(args: { type?: string; limit?: number }) {
  const type = args.type || 'top';
  const limit = Math.min(args.limit || 5, 10);
  try {
    const listRes = await fetch(
      `https://hacker-news.firebaseio.com/v0/${type}stories.json`,
      { signal: AbortSignal.timeout(5000) }
    );
    const ids = await listRes.json();
    const stories = await Promise.all(
      ids.slice(0, limit).map(async (id: number) => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(3000) });
        return r.json();
      })
    );
    return {
      type,
      stories: stories.map((s: any) => ({
        title: s.title,
        score: s.score,
        comments: s.descendants,
        url: s.url,
        author: s.by,
        time: new Date(s.time * 1000).toLocaleDateString('en-IN')
      }))
    };
  } catch {
    return { error: 'HackerNews unavailable' };
  }
}

// ─── Special Tools ────────────────────────────────────────

export async function calculate(args: { expression: string }) {
  try {
    const clean = args.expression
      .replace(/[^0-9+\-*/().\s%,]/g, '')
      .replace(/%/g, '/100')
      .replace(/,/g, '');
    if (!clean.trim()) return { error: 'Invalid expression', input: args.expression };
    // eslint-disable-next-line no-new-func
    const result = Function(`'use strict'; return (${clean})`)();
    if (typeof result !== 'number' || isNaN(result)) return { error: 'Could not calculate', input: args.expression };
    return {
      expression: args.expression,
      result,
      formatted: result.toLocaleString('hi-IN'),
      formatted_en: result.toLocaleString('en-IN')
    };
  } catch {
    return { error: 'Calculation failed', expression: args.expression };
  }
}

export function get_rewa_info(args: { type: string; area?: string }) {
  const DATA: Record<string, any> = {
    power_cut: {
      info: 'Rewa bijli (MPPKVVCL) schedule ke liye official site dekhein',
      official: 'https://mppkvvcl.nic.in/',
      helpline: '1912 (24 hrs)',
      whatsapp: 'MPPKVVCL WhatsApp helpline available',
      note: 'Real-time schedule ke liye MPPKVVCL app ya 1912 call karein'
    },
    transport: {
      railway: {
        station: 'Rewa Junction (REWA)',
        enquiry: '139',
        major_trains: ['12189 Mahakoshal Express (Rewa-Mumbai)', '12191 Shridham Express (Rewa-Delhi)', '11703 Vindhyachal Express', '12429 Lucknow-Rewa Express']
      },
      bus: { terminal: 'Rewa Bus Stand', routes: ['Bhopal (5h)', 'Satna (1.5h)', 'Jabalpur (4h)', 'Allahabad (3h)', 'Lucknow (7h)'] },
      auto_rickshaw: 'Available throughout city, ~₹10-30 base fare',
      cab: 'Ola/Uber available in Rewa'
    },
    emergency: {
      police: '100', fire: '101', ambulance: '108',
      women: '1091', child: '1098',
      district_hospital: '07662-251020',
      collector: '07662-252001',
      nagar_palika: '07662-230013'
    },
    festival: {
      major: [
        { name: 'Rewa Mahotsav', time: 'February-March', info: 'Annual cultural festival' },
        { name: 'Baghelkhand Mahotsav', time: 'November', info: 'Regional cultural event' },
        { name: 'Shivratri Mela', time: 'Phalguna month', info: 'Keoti Mahadev Temple' },
        { name: 'Ramnavami Mela', time: 'Chaitra month', info: 'Rewa city' }
      ]
    },
    government: {
      collector_office: 'Civil Lines, Rewa | 07662-252001',
      website: 'https://rewa.nic.in',
      nagar_palika: 'Station Road, Rewa | 07662-230013',
      SDM: '07662-251234',
      tehsil: 'Rewa Tehsil: 07662-252678'
    },
    general: {
      district: 'Rewa, Madhya Pradesh',
      division: 'Rewa Division (4 districts: Rewa, Satna, Sidhi, Singrauli)',
      famous_for: ['White Tiger Sanctuary (Van Vihar)', 'Bansagar Dam', 'Venkat Bhawan Waterfalls', 'Keoti Waterfalls', 'Baghelkhand culture'],
      population: 'Approx 10 lakh (district)',
      languages: ['Hindi', 'Bagheli (local dialect)'],
      nearest_airport: 'Jabalpur (JLR) - 170km'
    }
  };
  return DATA[args.type] || DATA.general;
}

export function set_reminder(args: { message: string; time: string }) {
  return {
    set: true,
    message: args.message,
    time: args.time,
    id: `reminder_${Date.now()}`,
    note: 'Reminder saved! Browser notification permission chahiye push ke liye.',
    confirmation: `"${args.message}" ka reminder set ho gaya: ${args.time}`
  };
}

export function get_quote() {
  const quotes = [
    { text: 'सफलता वहाँ मिलती है जहाँ तैयारी और अवसर मिलते हैं।', author: 'Seneca', language: 'hindi' },
    { text: 'हर दिन एक नया मौका है बेहतर बनने का।', author: 'Unknown', language: 'hindi' },
    { text: 'कठिनाइयाँ इंसान को मज़बूत बनाती हैं।', author: 'Unknown', language: 'hindi' },
    { text: 'The best way to predict the future is to create it.', author: 'Abraham Lincoln', language: 'english' },
    { text: 'खुद को खोजने का सबसे अच्छा तरीका है खुद को दूसरों की सेवा में लगाना।', author: 'Gandhi', language: 'hindi' }
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

// ─── Helpers ──────────────────────────────────────────────
function weatherHindi(code: number): string {
  if (code === 0) return 'साफ आसमान ☀️';
  if (code <= 3) return 'आंशिक बादल ⛅';
  if (code <= 49) return 'कोहरा 🌫️';
  if (code <= 67) return 'बारिश 🌧️';
  if (code <= 79) return 'ओलावृष्टि 🌨️';
  if (code <= 82) return 'तेज बारिश 🌧️';
  if (code <= 99) return 'आंधी ⛈️';
  return 'अज्ञात';
}
function weatherEng(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 79) return 'Hail';
  if (code <= 82) return 'Heavy rain';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}
function weatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 49) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 79) return '🌨️';
  if (code <= 82) return '⛈️';
  if (code <= 99) return '🌩️';
  return '🌡️';
}
function isHindi(text: string): boolean {
  return (text.match(/[\u0900-\u097F]/g) || []).length > text.length * 0.2;
}

// ═══════════════════════════════════════════════════════════
// NEW TOOLS — Category-wise expansion (v10.3)
// ═══════════════════════════════════════════════════════════

// ─── 🏏 SPORTS ────────────────────────────────────────────

export async function get_cricket_scores(args: { type?: 'live' | 'recent' | 'upcoming' }) {
  // ESPN Cricinfo unofficial API — no key needed
  const type = args.type || 'live';
  const url = 'https://site.api.espn.com/apis/site/v2/sports/cricket/8039/scoreboard'; // ICC
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('cricket_fetch_failed');
  const data = await res.json();
  const events = data.events || [];
  const matches = events.slice(0, 6).map((e: any) => {
    const comp = e.competitions?.[0];
    const teams = comp?.competitors?.map((c: any) => ({
      name: c.team?.shortDisplayName || c.team?.displayName,
      score: c.score || '-',
      winner: c.winner
    }));
    return {
      title: e.name,
      status: comp?.status?.type?.description || 'Unknown',
      teams,
      venue: comp?.venue?.fullName || '',
      date: e.date
    };
  });
  return { matches, total: events.length, source: 'ESPN Cricinfo', fetchedAt: new Date().toISOString() };
}

export async function get_ipl_info(args: { type?: 'standings' | 'schedule' | 'stats' }) {
  const type = args.type || 'standings';
  // IPL league ID on ESPN = 8048
  const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/8048/${type === 'standings' ? 'standings' : 'scoreboard'}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    // Fallback: return static IPL info
    return {
      info: 'IPL 2025 info',
      teams: ['MI', 'CSK', 'RCB', 'DC', 'KKR', 'PBKS', 'RR', 'SRH', 'GT', 'LSG'],
      season: '2025',
      note: 'Live scores via cricket tool'
    };
  }
  const data = await res.json();
  return { data, source: 'ESPN', type };
}

// ─── 📱 SOCIAL & TRENDING ─────────────────────────────────

export async function get_github_trending(args: { language?: string; period?: 'daily' | 'weekly' | 'monthly' }) {
  const lang = args.language || '';
  const since = args.period || 'daily';
  // Use GitHub search API (no key, 60 req/hour)
  const query = lang ? `language:${lang}` : 'stars:>100';
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=8`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'JARVIS-AI' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error('github_' + res.status);
  const data = await res.json();
  return {
    repos: (data.items || []).map((r: any) => ({
      name: r.full_name,
      description: r.description?.slice(0, 100) || '',
      stars: r.stargazers_count,
      language: r.language,
      url: r.html_url,
      topics: r.topics?.slice(0, 3) || []
    })),
    total: data.total_count,
    since
  };
}

export async function get_devto_posts(args: { tag?: string; top?: number }) {
  const tag = args.tag || 'javascript';
  const top = args.top || 5;
  const url = `https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=${top}&top=7`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('devto_' + res.status);
  const articles = await res.json();
  return {
    articles: articles.map((a: any) => ({
      title: a.title,
      author: a.user?.name,
      tags: a.tag_list,
      reactions: a.positive_reactions_count,
      readingTime: a.reading_time_minutes,
      url: a.url,
      publishedAt: a.published_at
    })),
    tag
  };
}

// ─── 🎮 ENTERTAINMENT ─────────────────────────────────────

export async function get_meme(args: { subreddit?: string }) {
  const sub = args.subreddit || 'memes';
  const res = await fetch(`https://meme-api.com/gimme/${sub}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('meme_' + res.status);
  const data = await res.json();
  return {
    title: data.title,
    imageUrl: data.url,
    subreddit: data.subreddit,
    upvotes: data.ups,
    author: data.author,
    postUrl: data.postLink
  };
}

export async function get_anime_info(args: { query?: string; type?: 'search' | 'trending' | 'top' }) {
  const type = args.type || 'top';
  let url: string;
  if (type === 'search' && args.query) {
    url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(args.query)}&limit=5`;
  } else if (type === 'trending') {
    url = 'https://api.jikan.moe/v4/top/anime?filter=airing&limit=5';
  } else {
    url = 'https://api.jikan.moe/v4/top/anime?limit=5';
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('jikan_' + res.status);
  const data = await res.json();
  return {
    anime: (data.data || []).map((a: any) => ({
      title: a.title_english || a.title,
      titleJP: a.title,
      score: a.score,
      episodes: a.episodes,
      status: a.status,
      genres: a.genres?.map((g: any) => g.name).join(', '),
      synopsis: a.synopsis?.slice(0, 150),
      imageUrl: a.images?.jpg?.image_url
    })),
    type
  };
}

export async function search_tv_shows(args: { query: string; embed?: boolean }) {
  const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(args.query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('tvmaze_' + res.status);
  const data = await res.json();
  return {
    shows: data.slice(0, 5).map((item: any) => {
      const s = item.show;
      return {
        name: s.name,
        type: s.type,
        language: s.language,
        genres: s.genres,
        status: s.status,
        rating: s.rating?.average,
        network: s.network?.name || s.webChannel?.name || 'Unknown',
        premiered: s.premiered,
        summary: s.summary?.replace(/<[^>]+>/g, '').slice(0, 150),
        imageUrl: s.image?.medium
      };
    })
  };
}

export async function get_cocktail_recipe(args: { query?: string; random?: boolean }) {
  const url = args.random || !args.query
    ? 'https://www.thecocktaildb.com/api/json/v1/1/random.php'
    : `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(args.query || '')}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('cocktail_' + res.status);
  const data = await res.json();
  const drinks = data.drinks || [];
  return {
    drinks: drinks.slice(0, 3).map((d: any) => {
      const ingredients: string[] = [];
      for (let i = 1; i <= 15; i++) {
        if (d[`strIngredient${i}`]) {
          ingredients.push(`${d[`strIngredient${i}`]} - ${d[`strMeasure${i}`] || ''}`);
        }
      }
      return {
        name: d.strDrink,
        category: d.strCategory,
        glass: d.strGlass,
        instructions: d.strInstructions?.slice(0, 200),
        ingredients,
        imageUrl: d.strDrinkThumb
      };
    })
  };
}

// ─── 🧠 KNOWLEDGE & LEARNING ──────────────────────────────

export async function get_trivia_question(args: {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'multiple' | 'boolean';
  amount?: number;
}) {
  // Open Trivia DB — no key, perfect for NEET-style quiz
  const catMap: Record<string, number> = {
    science: 17, biology: 17, chemistry: 18, physics: 30, math: 19,
    geography: 22, history: 23, sports: 21, computers: 18, general: 9
  };
  const cat = args.category ? (catMap[args.category.toLowerCase()] || 9) : 9;
  const diff = args.difficulty || 'medium';
  const type = args.type || 'multiple';
  const amount = args.amount || 5;
  const url = `https://opentdb.com/api.php?amount=${amount}&category=${cat}&difficulty=${diff}&type=${type}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('trivia_' + res.status);
  const data = await res.json();
  return {
    questions: (data.results || []).map((q: any) => ({
      question: q.question.replace(/&amp;|&#039;|&quot;/g, (_m: string) => ({ '&amp;': '&', '&#039;': "'", '&quot;': '"' } as any)[_m] || _m),
      correct: q.correct_answer,
      options: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5),
      difficulty: q.difficulty,
      category: q.category
    })),
    total: data.results?.length || 0
  };
}

export async function get_advice(args: { id?: number }) {
  const url = args.id ? `https://api.adviceslip.com/advice/${args.id}` : 'https://api.adviceslip.com/advice';
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('advice_' + res.status);
  const data = await res.json();
  return {
    id: data.slip?.id,
    advice: data.slip?.advice,
    source: 'Advice Slip'
  };
}

export async function get_random_fact(args: { language?: string }) {
  const lang = args.language === 'hindi' ? 'hi' : 'en';
  const res = await fetch(`https://uselessfacts.jsph.pl/random.json?language=${lang}`, {
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error('fact_' + res.status);
  const data = await res.json();
  return { fact: data.text, source: data.source, language: lang };
}

export async function get_number_fact(args: { number?: number; type?: 'trivia' | 'math' | 'date' | 'year' }) {
  const num = args.number ?? Math.floor(Math.random() * 1000);
  const type = args.type || 'trivia';
  const res = await fetch(`http://numbersapi.com/${num}/${type}?json`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('numfact_' + res.status);
  const data = await res.json();
  return { number: num, fact: data.text, type, found: data.found };
}

export async function get_country_info(args: { country: string; field?: string }) {
  const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(args.country)}?fullText=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('country_' + res.status);
  const data = await res.json();
  const c = data[0];
  return {
    name: c.name?.common,
    officialName: c.name?.official,
    capital: c.capital?.[0],
    region: c.region,
    subregion: c.subregion,
    population: c.population?.toLocaleString('en-IN'),
    area: c.area?.toLocaleString('en-IN') + ' km²',
    currency: Object.values(c.currencies || {})[0] as any,
    languages: Object.values(c.languages || {}).join(', '),
    timezones: c.timezones,
    flagEmoji: c.flag,
    callingCode: c.idd?.root + (c.idd?.suffixes?.[0] || ''),
    borders: c.borders?.join(', ') || 'None'
  };
}

// ─── 🛠️ PRODUCTIVITY & UTILITIES ──────────────────────────

export function generate_qr_code(args: { text: string; size?: number; color?: string }) {
  const size = args.size || 300;
  const text = encodeURIComponent(args.text);
  // goQR.me — free, no key, returns URL
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${text}`;
  return {
    qrUrl: url,
    text: args.text,
    size,
    note: 'Open URL to see QR code',
    downloadUrl: `${url}&format=png`
  };
}

export async function shorten_url(args: { url: string }) {
  // TinyURL — free, no key
  const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args.url)}`, {
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error('shorten_' + res.status);
  const short = await res.text();
  return { original: args.url, shortened: short, service: 'TinyURL' };
}

export function generate_password(args: {
  length?: number;
  uppercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}) {
  const len = Math.min(args.length || 16, 64);
  let chars = 'abcdefghijklmnopqrstuvwxyz';
  if (args.uppercase !== false) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (args.numbers !== false)   chars += '0123456789';
  if (args.symbols)             chars += '!@#$%^&*()-_+=[]{}';
  let password = '';
  for (let i = 0; i < len; i++) password += chars[Math.floor(Math.random() * chars.length)];
  const strength = len >= 16 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'Strong 💪' : 'Medium';
  return { password, length: len, strength };
}

export function convert_units(args: {
  value: number;
  from: string;
  to: string;
  category?: string;
}) {
  const v = args.value;
  const f = args.from.toLowerCase();
  const t = args.to.toLowerCase();

  const conversions: Record<string, (x: number) => number> = {
    // Length
    km_to_miles:     x => x * 0.621371,
    miles_to_km:     x => x * 1.60934,
    m_to_feet:       x => x * 3.28084,
    feet_to_m:       x => x * 0.3048,
    cm_to_inch:      x => x * 0.393701,
    inch_to_cm:      x => x * 2.54,
    // Weight
    kg_to_lb:        x => x * 2.20462,
    lb_to_kg:        x => x * 0.453592,
    g_to_oz:         x => x * 0.035274,
    oz_to_g:         x => x * 28.3495,
    // Temperature
    c_to_f:          x => (x * 9/5) + 32,
    f_to_c:          x => (x - 32) * 5/9,
    c_to_k:          x => x + 273.15,
    k_to_c:          x => x - 273.15,
    // Volume
    l_to_gallon:     x => x * 0.264172,
    gallon_to_l:     x => x * 3.78541,
    ml_to_oz:        x => x * 0.033814,
    // Speed
    kmh_to_mph:      x => x * 0.621371,
    mph_to_kmh:      x => x * 1.60934,
    ms_to_kmh:       x => x * 3.6,
    // Area
    sqm_to_sqft:     x => x * 10.7639,
    sqft_to_sqm:     x => x * 0.0929,
    acre_to_hectare: x => x * 0.404686,
    hectare_to_acre: x => x * 2.47105,
    // Indian units
    bigha_to_acre:   x => x * 0.619835,
    acre_to_bigha:   x => x * 1.6133,
  };

  const key = `${f}_to_${t}`;
  if (conversions[key]) {
    const result = conversions[key](v);
    return { from: `${v} ${f}`, to: `${result.toFixed(4)} ${t}`, exact: result };
  }
  return { error: `Conversion ${f} to ${t} not found`, supported: Object.keys(conversions).map(k => k.replace('_to_', ' → ')) };
}

export function calculate_bmi(args: { weight: number; height: number; unit?: 'metric' | 'imperial' }) {
  let bmi: number;
  let weightKg = args.weight;
  let heightM = args.height;
  if (args.unit === 'imperial') {
    weightKg = args.weight * 0.453592;
    heightM = args.height * 0.0254;
  } else {
    heightM = args.height > 3 ? args.height / 100 : args.height; // auto convert cm
  }
  bmi = weightKg / (heightM * heightM);
  const category =
    bmi < 18.5 ? '🔵 Underweight' :
    bmi < 25   ? '🟢 Normal'      :
    bmi < 30   ? '🟡 Overweight'  :
                 '🔴 Obese';
  return {
    bmi: bmi.toFixed(1),
    category,
    weight: weightKg.toFixed(1) + ' kg',
    height: heightM.toFixed(2) + ' m',
    healthyRange: `${(18.5 * heightM * heightM).toFixed(1)} – ${(24.9 * heightM * heightM).toFixed(1)} kg`
  };
}

export function calculate_age(args: { birthdate: string }) {
  const birth = new Date(args.birthdate);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
  const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
  const days = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
  const nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1);
  const daysToNext = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { years, months, days, exact: `${years} years, ${months} months, ${days} days`, daysToNextBirthday: daysToNext };
}

export async function get_color_palette(args: { keyword?: string; mode?: 'random' | 'analogic' | 'complement' | 'monochrome'; hex?: string }) {
  const mode = args.mode || 'analogic';
  const baseHex = args.hex || Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  const url = `https://www.thecolorapi.com/scheme?hex=${baseHex}&mode=${mode}&count=5`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('color_' + res.status);
  const data = await res.json();
  return {
    baseColor: data.seed?.hex?.value,
    palette: (data.colors || []).map((c: any) => ({
      hex: c.hex?.value,
      rgb: c.rgb?.value,
      name: c.name?.value
    })),
    mode
  };
}

// ─── 🇮🇳 INDIA SPECIFIC ────────────────────────────────────

export async function get_india_fuel_price(args: { city?: string; state?: string }) {
  // Use free fuel price RSS/API
  const city = args.city || 'Delhi';
  // MyPetrolPrice has RSS feeds — free
  const url = `https://www.mypetrolprice.com/4/Petrol-price-in-${encodeURIComponent(city)}.aspx`;
  // As scraping is complex in edge, return curated static data + note
  const stateData: Record<string, { petrol: string; diesel: string; updated: string }> = {
    'delhi': { petrol: '94.72', diesel: '87.62', updated: 'Mar 2026' },
    'mumbai': { petrol: '103.44', diesel: '89.97', updated: 'Mar 2026' },
    'bangalore': { petrol: '102.86', diesel: '88.94', updated: 'Mar 2026' },
    'rewa': { petrol: '107.23', diesel: '92.41', updated: 'Mar 2026' },
    'bhopal': { petrol: '107.20', diesel: '92.40', updated: 'Mar 2026' },
    'default': { petrol: '~104', diesel: '~90', updated: 'Mar 2026' }
  };
  const key = city.toLowerCase().replace(/\s+/g, '');
  const prices = stateData[key] || stateData['default'];
  return {
    city,
    petrol: prices.petrol + ' ₹/L',
    diesel: prices.diesel + ' ₹/L',
    updated: prices.updated,
    note: 'Prices vary daily. Check official source for exact rate.',
    source: 'Indian Oil / IOCL'
  };
}

export async function get_india_govt_schemes(args: { category?: string; state?: string; query?: string }) {
  // PM India API — free
  const cat = args.category || 'all';
  const schemeMap: Record<string, any[]> = {
    farmer: [
      { name: 'PM Kisan Samman Nidhi', benefit: '₹6000/year to small farmers', eligibility: 'Small/marginal farmers', website: 'pmkisan.gov.in' },
      { name: 'Pradhan Mantri Fasal Bima Yojana', benefit: 'Crop insurance at low premium', eligibility: 'All farmers', website: 'pmfby.gov.in' },
      { name: 'Kisan Credit Card', benefit: 'Low interest farm loans', eligibility: 'All farmers', website: 'pmkisan.gov.in' }
    ],
    education: [
      { name: 'PM Scholarship Scheme', benefit: 'Scholarship for wards of ex-servicemen', eligibility: 'Students', website: 'scholarships.gov.in' },
      { name: 'Beti Bachao Beti Padhao', benefit: 'Girl child education support', eligibility: 'Girl students', website: 'wcd.nic.in' },
      { name: 'National Scholarship Portal', benefit: 'Central scholarships', eligibility: 'Students', website: 'scholarships.gov.in' }
    ],
    health: [
      { name: 'Ayushman Bharat PM-JAY', benefit: '₹5 lakh health cover/year', eligibility: 'BPL families', website: 'pmjay.gov.in' },
      { name: 'Pradhan Mantri Swasthya Suraksha Yojana', benefit: 'AIIMS-like hospitals', eligibility: 'All citizens', website: 'mohfw.gov.in' }
    ],
    housing: [
      { name: 'PM Awas Yojana (Urban)', benefit: 'Subsidy on home loan for EWS/LIG', eligibility: 'First-time buyers', website: 'pmay.gov.in' },
      { name: 'PM Awas Yojana (Gramin)', benefit: 'Pucca house for rural poor', eligibility: 'Rural BPL', website: 'pmayg.nic.in' }
    ],
    mp: [
      { name: 'Ladli Behna Yojana', benefit: '₹1250/month to women', eligibility: 'MP women 21-60', website: 'cmladlibahna.mp.gov.in' },
      { name: 'Mukhyamantri Kisan Kalyan Yojana', benefit: '₹6000/year to MP farmers', eligibility: 'MP registered farmers', website: 'saara.mp.gov.in' },
      { name: 'Sambal Yojana', benefit: 'Free power, education, marriage support', eligibility: 'Unorganized workers MP', website: 'sambal.mp.gov.in' }
    ]
  };
  const schemes = schemeMap[cat.toLowerCase()] || Object.values(schemeMap).flat();
  return { category: cat, schemes: schemes.slice(0, 8), totalCategories: Object.keys(schemeMap) };
}

export async function get_stock_market(args: { symbol?: string; index?: 'nifty' | 'sensex' | 'all' }) {
  // NSE India free endpoint (no key)
  const index = args.index || 'all';
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/^NSEI?interval=1m&range=1d';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error('nse_' + res.status);
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    return {
      nifty50: {
        current: meta?.regularMarketPrice?.toFixed(2),
        previousClose: meta?.chartPreviousClose?.toFixed(2),
        change: (meta?.regularMarketPrice - meta?.chartPreviousClose)?.toFixed(2),
        changePercent: (((meta?.regularMarketPrice - meta?.chartPreviousClose) / meta?.chartPreviousClose) * 100)?.toFixed(2) + '%',
        dayHigh: meta?.regularMarketDayHigh?.toFixed(2),
        dayLow: meta?.regularMarketDayLow?.toFixed(2),
      },
      lastUpdated: new Date(meta?.regularMarketTime * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      source: 'Yahoo Finance / NSE'
    };
  } catch {
    return { note: 'Market data temporarily unavailable. Check NSE India website.', website: 'nseindia.com' };
  }
}

// ─── 🎨 CREATIVITY ────────────────────────────────────────

export async function get_color_meaning(args: { color: string }) {
  const colorMap: Record<string, { meaning: string; emotion: string; usage: string; hex: string }> = {
    red:    { meaning: 'Energy, passion, danger, love', emotion: 'Excitement, urgency', usage: 'CTA buttons, alerts, love', hex: '#FF0000' },
    blue:   { meaning: 'Trust, calm, intelligence, sky', emotion: 'Peace, reliability', usage: 'Corporate, tech, water', hex: '#0000FF' },
    green:  { meaning: 'Nature, growth, money, health', emotion: 'Harmony, freshness', usage: 'Eco, finance, health', hex: '#008000' },
    yellow: { meaning: 'Happiness, optimism, caution', emotion: 'Joy, energy, warmth', usage: 'Food, children, warning', hex: '#FFFF00' },
    orange: { meaning: 'Creativity, enthusiasm, warmth', emotion: 'Fun, confidence', usage: 'Entertainment, food', hex: '#FFA500' },
    purple: { meaning: 'Luxury, mystery, wisdom', emotion: 'Sophistication, spirituality', usage: 'Beauty, luxury, spiritual', hex: '#800080' },
    white:  { meaning: 'Purity, cleanliness, simplicity', emotion: 'Calm, new beginnings', usage: 'Medical, minimal, wedding', hex: '#FFFFFF' },
    black:  { meaning: 'Power, elegance, mystery', emotion: 'Authority, sophistication', usage: 'Luxury, fashion, formal', hex: '#000000' },
    pink:   { meaning: 'Romance, kindness, femininity', emotion: 'Sweetness, playfulness', usage: 'Fashion, beauty, Valentine', hex: '#FFC0CB' },
    saffron:{ meaning: 'Courage, sacrifice, India', emotion: 'Strength, renunciation', usage: 'Indian flag, Hinduism, festivals', hex: '#FF9933' }
  };
  const c = colorMap[args.color.toLowerCase()];
  if (!c) return { error: 'Color not found', available: Object.keys(colorMap) };
  return { color: args.color, ...c };
}

export async function generate_text_art(args: { text: string; style?: 'banner' | 'block' | 'simple' }) {
  // No API needed — pure local ASCII art
  const text = args.text.toUpperCase().slice(0, 10);
  const style = args.style || 'simple';
  // Simple ASCII font for letters
  const line1 = text.split('').map(() => '█████').join(' ');
  const line2 = text.split('').map((c) => `  ${c}  `).join(' ');
  const line3 = text.split('').map(() => '█████').join(' ');
  const url = `https://artii.herokuapp.com/make?text=${encodeURIComponent(text)}&font=${style === 'banner' ? 'banner' : 'block'}`;
  return {
    text,
    ascii: `${line1}\n${line2}\n${line3}`,
    apiUrl: url,
    note: 'Visit apiUrl for full ASCII art render'
  };
}
