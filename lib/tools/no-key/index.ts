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
