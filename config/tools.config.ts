// config/tools.config.ts
// All 33 tool definitions — Claude/Gemini function calling format
// Auto-trigger keywords for invisible routing

import type { ToolDefinition } from '../types/jarvis.types';

export const TOOLS_CONFIG: ToolDefinition[] = [

  // ══════════════════════════════════════════════════════
  // NO-KEY TOOLS (16) — Zero setup, always available
  // ══════════════════════════════════════════════════════

  {
    name: 'get_weather',
    description: 'Get current weather and 7-day forecast for any location. Default: Rewa, MP. Returns temperature, humidity, rain chance, wind speed in Hindi-friendly format.',
    category: 'weather',
    requiresKey: false,
    autoTrigger: ['मौसम', 'weather', 'बारिश', 'rain', 'ठंड', 'गर्मी', 'तापमान', 'temperature', 'forecast', 'धूप', 'आंधी', 'बादल', 'humidity'],
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name. Default: Rewa, Madhya Pradesh' },
        days: { type: 'number', description: 'Forecast days 1-7. Default: 3' }
      },
      required: []
    }
  },

  {
    name: 'get_datetime',
    description: 'Get current date, time, day in IST. Returns Hindi and English formats.',
    category: 'time',
    requiresKey: false,
    autoTrigger: ['समय', 'time', 'वक्त', 'बजे', 'date', 'तारीख', 'आज', 'कल', 'day', 'दिन', 'घड़ी', 'clock', 'अभी'],
    inputSchema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'Timezone. Default: Asia/Kolkata' },
        format: { type: 'string', enum: ['full', 'date', 'time', 'day'], description: 'What to return' }
      },
      required: []
    }
  },

  {
    name: 'search_wikipedia',
    description: 'Search Wikipedia for information about any topic, person, place, event. Returns summary and key facts.',
    category: 'knowledge',
    requiresKey: false,
    autoTrigger: ['कौन है', 'क्या है', 'who is', 'what is', 'बताओ', 'जानकारी', 'information', 'history', 'इतिहास', 'explain', 'define', 'wikipedia'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        language: { type: 'string', enum: ['en', 'hi'], description: 'Wikipedia language. Default: en' }
      },
      required: ['query']
    }
  },

  {
    name: 'get_location_info',
    description: 'Get details about any location: coordinates, address, nearby places. Works for Rewa areas too.',
    category: 'location',
    requiresKey: false,
    autoTrigger: ['कहाँ है', 'where is', 'location', 'address', 'map', 'nearby', 'पास में', 'ढूंढो', 'नक्शा'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Place name or address to look up' }
      },
      required: ['query']
    }
  },

  {
    name: 'get_word_meaning',
    description: 'Get definition, pronunciation, examples, synonyms for any English word.',
    category: 'knowledge',
    requiresKey: false,
    autoTrigger: ['meaning', 'मतलब', 'definition', 'define', 'word', 'शब्द', 'pronunciation', 'synonym', 'अर्थ'],
    inputSchema: {
      type: 'object',
      properties: {
        word: { type: 'string', description: 'English word to look up' }
      },
      required: ['word']
    }
  },

  {
    name: 'get_public_holidays',
    description: 'Get public holidays for India or any country for current or specific year.',
    category: 'time',
    requiresKey: false,
    autoTrigger: ['holiday', 'छुट्टी', 'holidays', 'छुट्टियाँ', 'bank holiday', 'national holiday', 'राष्ट्रीय', 'अवकाश', 'calendar'],
    inputSchema: {
      type: 'object',
      properties: {
        country: { type: 'string', description: 'Country code. Default: IN (India)' },
        year: { type: 'number', description: 'Year. Default: current year' }
      },
      required: []
    }
  },

  {
    name: 'get_sunrise_sunset',
    description: 'Get exact sunrise and sunset times for Rewa or any location. Useful for prayer times, farming, daily planning.',
    category: 'time',
    requiresKey: false,
    autoTrigger: ['sunrise', 'sunset', 'सूर्योदय', 'सूर्यास्त', 'उगना', 'डूबना', 'sun', 'सूरज', 'namaz', 'नमाज़', 'prayer time'],
    inputSchema: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: 'Latitude. Default: 24.5362 (Rewa)' },
        lon: { type: 'number', description: 'Longitude. Default: 81.3032 (Rewa)' },
        date: { type: 'string', description: 'Date YYYY-MM-DD. Default: today' }
      },
      required: []
    }
  },

  {
    name: 'lookup_pincode',
    description: 'Look up any Indian postal pincode to get city, district, state, post office info.',
    category: 'india',
    requiresKey: false,
    autoTrigger: ['pincode', 'पिनकोड', 'postal', 'zip', 'post office', 'डाकघर', 'area code'],
    inputSchema: {
      type: 'object',
      properties: {
        pincode: { type: 'string', description: '6-digit Indian postal pincode' }
      },
      required: ['pincode']
    }
  },

  {
    name: 'translate_text',
    description: 'Translate text between Hindi, English, and 100+ languages. 5000 chars per request.',
    category: 'knowledge',
    requiresKey: false,
    autoTrigger: ['translate', 'अनुवाद', 'translation', 'hindi mein', 'english mein', 'हिंदी में', 'अंग्रेजी में', 'meaning in', 'convert language'],
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to translate' },
        from: { type: 'string', description: 'Source language code. Default: auto-detect' },
        to: { type: 'string', description: 'Target language code. Default: en or hi based on input' }
      },
      required: ['text']
    }
  },

  {
    name: 'get_recipe',
    description: 'Find recipes for any dish. Strong Indian/Hindi food support. Returns ingredients and steps.',
    category: 'fun',
    requiresKey: false,
    autoTrigger: ['recipe', 'रेसिपी', 'बनाना', 'cook', 'खाना', 'dish', 'food', 'खाने', 'ingredients', 'सामग्री', 'banana hai', 'kaise banate'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Dish name in Hindi or English' },
        category: { type: 'string', description: 'Optional: vegetarian, chicken, dessert, etc.' }
      },
      required: ['query']
    }
  },

  {
    name: 'get_joke',
    description: 'Get a funny joke in Hindi or English. Clean, family-friendly humor.',
    category: 'fun',
    requiresKey: false,
    autoTrigger: ['joke', 'जोक', 'funny', 'मजाक', 'हंसाओ', 'comedy', 'चुटकुला', 'laugh', 'हंसी', 'entertainment', 'मनोरंजन'],
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['hindi', 'english', 'any'], description: 'Joke language. Default: hindi' },
        type: { type: 'string', enum: ['general', 'programming', 'pun'], description: 'Joke type' }
      },
      required: []
    }
  },

  {
    name: 'get_iss_location',
    description: 'Get current location of International Space Station and astronauts in space right now.',
    category: 'science',
    requiresKey: false,
    autoTrigger: ['ISS', 'space station', 'अंतरिक्ष स्टेशन', 'satellite', 'astronaut', 'अंतरिक्ष यात्री', 'space station location'],
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  {
    name: 'search_books',
    description: 'Search for books, get details, author info, summaries from Open Library.',
    category: 'knowledge',
    requiresKey: false,
    autoTrigger: ['book', 'किताब', 'novel', 'author', 'लेखक', 'read', 'पढ़ना', 'library', 'publish', 'ISBN'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Book title or author name' }
      },
      required: ['query']
    }
  },

  {
    name: 'generate_image_fast',
    description: 'Generate any image instantly using Pollinations.ai. Fast, free, no limits. Good for quick generations.',
    category: 'image-gen',
    requiresKey: false,
    autoTrigger: ['image', 'तस्वीर', 'photo', 'generate', 'बनाओ', 'create picture', 'draw', 'art', 'design', 'फोटो', 'चित्र'],
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Image description. Can be in Hindi or English.' },
        style: { type: 'string', enum: ['realistic', 'artistic', 'anime', '3d', 'minimal', 'cinematic'], description: 'Image style. Default: realistic' },
        width: { type: 'number', description: 'Width in pixels. Default: 768' },
        height: { type: 'number', description: 'Height in pixels. Default: 512' }
      },
      required: ['prompt']
    }
  },

  {
    name: 'get_reddit_posts',
    description: 'Get trending posts from Reddit. India-focused subreddits by default.',
    category: 'news',
    requiresKey: false,
    autoTrigger: ['reddit', 'trending', 'viral', 'community', 'discussion', 'people saying', 'social media', 'चर्चा'],
    inputSchema: {
      type: 'object',
      properties: {
        subreddit: { type: 'string', description: 'Subreddit name. Default: india' },
        sort: { type: 'string', enum: ['hot', 'new', 'top'], description: 'Sort by. Default: hot' },
        limit: { type: 'number', description: 'Number of posts 1-10. Default: 5' }
      },
      required: []
    }
  },

  {
    name: 'get_hackernews',
    description: 'Get top tech stories from Hacker News. Good for tech news and startup updates.',
    category: 'news',
    requiresKey: false,
    autoTrigger: ['tech news', 'startup', 'technology', 'hacker news', 'silicon valley', 'AI news', 'programming news'],
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['top', 'new', 'best', 'ask', 'show'], description: 'Story type. Default: top' },
        limit: { type: 'number', description: 'Number of stories 1-10. Default: 5' }
      },
      required: []
    }
  },

  // ══════════════════════════════════════════════════════
  // FREE KEY TOOLS (11) — Free account needed
  // ══════════════════════════════════════════════════════

  {
    name: 'get_nasa_content',
    description: 'Get NASA Astronomy Picture of the Day, Mars rover photos, asteroid data, space news.',
    category: 'science',
    requiresKey: true,
    envKey: 'NASA_API_KEY',
    autoTrigger: ['NASA', 'space', 'अंतरिक्ष', 'planet', 'ग्रह', 'asteroid', 'mars', 'मंगल', 'moon', 'चाँद', 'galaxy', 'star', 'तारा', 'cosmos'],
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['apod', 'mars', 'asteroid', 'earth'], description: 'Content type. Default: apod' },
        date: { type: 'string', description: 'Date YYYY-MM-DD for APOD. Default: today' }
      },
      required: []
    }
  },

  {
    name: 'get_india_news',
    description: 'Get latest India news, MP/Rewa local news, Hindi news. 200 requests/day free.',
    category: 'news',
    requiresKey: true,
    envKey: 'NEWSDATA_API_KEY',
    autoTrigger: ['news', 'खबर', 'समाचार', 'ताजा', 'latest', 'breaking', 'आज की खबर', 'India news', 'रीवा', 'Rewa', 'MP news', 'headlines'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'News topic or keywords' },
        country: { type: 'string', description: 'Country code. Default: in (India)' },
        language: { type: 'string', enum: ['hi', 'en'], description: 'News language. Default: hi' },
        category: { type: 'string', description: 'Category: politics, sports, tech, entertainment, etc.' }
      },
      required: []
    }
  },

  {
    name: 'search_youtube',
    description: 'Search YouTube for videos, songs, tutorials. Returns video list with links. India-focused.',
    category: 'entertainment',
    requiresKey: true,
    envKey: 'NEXT_PUBLIC_YOUTUBE_API_KEY',
    autoTrigger: ['youtube', 'video', 'song', 'गाना', 'music', 'संगीत', 'watch', 'देखना', 'tutorial', 'bhajan', 'भजन', 'film', 'movie clip', 'trending video'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query in Hindi or English' },
        max_results: { type: 'number', description: 'Number of results 1-10. Default: 5' },
        language: { type: 'string', description: 'Preferred language: hi or en' },
        type: { type: 'string', enum: ['video', 'channel', 'playlist'], description: 'Search type. Default: video' }
      },
      required: ['query']
    }
  },

  {
    name: 'search_movies',
    description: 'Search Bollywood and Hollywood movies, TV shows. Get ratings, cast, synopsis, trailers. Hindi film strong support.',
    category: 'entertainment',
    requiresKey: true,
    envKey: 'TMDB_API_KEY',
    autoTrigger: ['movie', 'film', 'फिल्म', 'bollywood', 'hollywood', 'series', 'web series', 'TV show', 'OTT', 'Netflix', 'Amazon', 'rating', 'cast', 'actor', 'actress'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Movie or show name' },
        type: { type: 'string', enum: ['movie', 'tv', 'trending'], description: 'Search type. Default: movie' },
        language: { type: 'string', description: 'Language: hi for Hindi. Default: hi' }
      },
      required: ['query']
    }
  },

  {
    name: 'get_exchange_rate',
    description: 'Get live currency exchange rates. INR to USD/EUR and all major currencies. 1500 req/month free.',
    category: 'finance',
    requiresKey: true,
    envKey: 'EXCHANGERATE_API_KEY',
    autoTrigger: ['exchange rate', 'currency', 'dollar', 'डॉलर', 'rupee', 'रुपया', 'euro', 'pound', 'rate', 'conversion', 'convert', 'forex', 'USD', 'INR', 'EUR'],
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'From currency code. Default: USD' },
        to: { type: 'string', description: 'To currency code. Default: INR' },
        amount: { type: 'number', description: 'Amount to convert. Default: 1' }
      },
      required: []
    }
  },

  {
    name: 'get_crypto_price',
    description: 'Get live cryptocurrency prices in INR and USD. Bitcoin, Ethereum, and all major coins.',
    category: 'finance',
    requiresKey: false,
    autoTrigger: ['crypto', 'bitcoin', 'ethereum', 'BTC', 'ETH', 'cryptocurrency', 'coin', 'dogecoin', 'price', 'market cap', 'crypto price'],
    inputSchema: {
      type: 'object',
      properties: {
        coin: { type: 'string', description: 'Coin name or ID. Examples: bitcoin, ethereum, dogecoin' },
        currency: { type: 'string', description: 'Price in currency. Default: inr' }
      },
      required: ['coin']
    }
  },

  {
    name: 'get_user_location',
    description: 'Auto-detect user location from IP address. Used for weather, local info personalization.',
    category: 'location',
    requiresKey: true,
    envKey: 'IPINFO_TOKEN',
    autoTrigger: ['my location', 'where am i', 'मेरी location', 'current location', 'detect location', 'IP location'],
    inputSchema: {
      type: 'object',
      properties: {
        ip: { type: 'string', description: 'IP address. Default: requester IP' }
      },
      required: []
    }
  },

  {
    name: 'get_air_quality',
    description: 'Get air quality index (AQI) for any Indian city. Health recommendations included.',
    category: 'weather',
    requiresKey: true,
    envKey: 'WAQI_API_KEY',
    autoTrigger: ['air quality', 'AQI', 'pollution', 'प्रदूषण', 'air pollution', 'हवा', 'smog', 'PM2.5', 'breathe', 'सांस'],
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name. Default: Rewa' }
      },
      required: []
    }
  },

  {
    name: 'get_photos',
    description: 'Get high-quality stock photos for any topic from Unsplash. HD, free to use.',
    category: 'image-gen',
    requiresKey: true,
    envKey: 'UNSPLASH_ACCESS_KEY',
    autoTrigger: ['photo', 'image search', 'picture', 'stock photo', 'find image', 'show me photo', 'real photo'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for' },
        count: { type: 'number', description: 'Number of photos 1-10. Default: 3' },
        orientation: { type: 'string', enum: ['landscape', 'portrait', 'squarish'] }
      },
      required: ['query']
    }
  },

  {
    name: 'get_stock_video',
    description: 'Get free stock videos for any topic from Pexels. HD quality, free to use.',
    category: 'video',
    requiresKey: true,
    envKey: 'PEXELS_API_KEY',
    autoTrigger: ['video', 'stock video', 'clip', 'footage', 'video of', 'show video', 'find video'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Video topic to search' },
        count: { type: 'number', description: 'Number of videos 1-5. Default: 3' }
      },
      required: ['query']
    }
  },

  {
    name: 'generate_image_quality',
    description: 'Generate high-quality AI images using Gemini Imagen or HuggingFace Flux. Better quality than fast generation. Use for important/detailed requests.',
    category: 'image-gen',
    requiresKey: true,
    envKey: 'NEXT_PUBLIC_GEMINI_API_KEY',
    autoTrigger: ['high quality image', 'realistic image', 'detailed image', 'best image', 'AI art', 'flux', 'stable diffusion', 'बढ़िया तस्वीर'],
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed image description' },
        style: { type: 'string', enum: ['realistic', 'artistic', 'anime', '3d', 'minimal', 'cinematic'] },
        model: { type: 'string', enum: ['gemini', 'flux', 'auto'], description: 'Which model to use. Default: auto' }
      },
      required: ['prompt']
    }
  },

  // ══════════════════════════════════════════════════════
  // SPECIAL TOOLS (6) — Memory + India + Productivity
  // ══════════════════════════════════════════════════════

  {
    name: 'save_memory',
    description: 'Save important information to JARVIS memory for future use.',
    category: 'productivity',
    requiresKey: false,
    autoTrigger: ['remember', 'याद रखो', 'save', 'note', 'don\'t forget', 'भूलना नहीं', 'store', 'keep in mind'],
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'What to remember' },
        type: { type: 'string', enum: ['preference', 'fact', 'reminder', 'personal'], description: 'Memory type' },
        importance: { type: 'number', description: 'Importance 1-10. Default: 5' }
      },
      required: ['content', 'type']
    }
  },

  {
    name: 'recall_memory',
    description: 'Search past memories for relevant information about the user or previous conversations.',
    category: 'productivity',
    requiresKey: false,
    autoTrigger: ['remember when', 'याद है', 'i told you', 'previously', 'last time', 'पहले बताया था', 'recall', 'history'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for in memory' }
      },
      required: ['query']
    }
  },

  {
    name: 'get_rewa_info',
    description: 'Get Rewa/MP-specific local information: power cuts, local news, transport, emergency numbers, government offices.',
    category: 'india',
    requiresKey: false,
    autoTrigger: ['रीवा', 'Rewa', 'MP', 'मध्यप्रदेश', 'bijli', 'बिजली', 'power cut', 'local', 'district', 'collector', 'nagar palika', 'नगर पालिका'],
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['power_cut', 'transport', 'emergency', 'festival', 'government', 'general'] },
        area: { type: 'string', description: 'Area within Rewa (optional)' }
      },
      required: ['type']
    }
  },

  {
    name: 'calculate',
    description: 'Perform mathematical calculations, unit conversions, percentage calculations.',
    category: 'productivity',
    requiresKey: false,
    autoTrigger: ['calculate', 'हिसाब', 'math', 'plus', 'minus', 'multiply', 'divide', 'percent', 'जोड़', 'घटाओ', 'गुणा', 'भाग', 'कितना', 'total', 'sum', '₹', 'rupees'],
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression or word problem to solve' }
      },
      required: ['expression']
    }
  },

  {
    name: 'set_reminder',
    description: 'Set a reminder for a specific time. JARVIS will notify at the right time.',
    category: 'productivity',
    requiresKey: false,
    autoTrigger: ['reminder', 'remind', 'याद दिलाओ', 'alarm', 'alert', 'notify', 'set reminder', 'बजे बताना', 'forget'],
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'What to remind about' },
        time: { type: 'string', description: 'When to remind. Natural language OK: "1 ghante mein", "kal subah 8 baje"' }
      },
      required: ['message', 'time']
    }
  },

  {
    name: 'get_quote',
    description: 'Get an inspirational or motivational quote. Used in morning briefings.',
    category: 'fun',
    requiresKey: false,
    autoTrigger: ['quote', 'motivation', 'inspire', 'प्रेरणा', 'thought', 'विचार', 'morning', 'good morning', 'सुप्रभात'],
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Quote category: motivational, life, success, etc.' }
      },
      required: []
    }
  }

];

// ── Tool lookup helpers ────────────────────────────────────

export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOLS_CONFIG.find(t => t.name === name);
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return TOOLS_CONFIG.filter(t => t.category === category);
}

export function getNoKeyTools(): ToolDefinition[] {
  return TOOLS_CONFIG.filter(t => !t.requiresKey);
}

export function getKeyTools(): ToolDefinition[] {
  return TOOLS_CONFIG.filter(t => t.requiresKey);
}

// Auto-trigger: find which tools match a query
export function matchTools(query: string): string[] {
  const lower = query.toLowerCase();
  const matched: string[] = [];
  for (const tool of TOOLS_CONFIG) {
    if (tool.autoTrigger.some(kw => lower.includes(kw.toLowerCase()))) {
      matched.push(tool.name);
    }
  }
  return matched;
}

// Convert to Gemini function declarations format
export function toGeminiFunctions(tools: ToolDefinition[] = TOOLS_CONFIG) {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema
  }));
}

// ══════════════════════════════════════════════════════════
// NEW TOOLS v10.3 — Category-wise expansion (25 new tools)
// ══════════════════════════════════════════════════════════

TOOLS_CONFIG.push(

  // ─── 🏏 SPORTS ──────────────────────────────────────────
  {
    name: 'get_cricket_scores',
    description: 'Get live cricket scores, recent results and upcoming matches. Uses ESPN Cricinfo. No key needed.',
    category: 'sports',
    requiresKey: false,
    autoTrigger: ['cricket', 'क्रिकेट', 'score', 'match', 'india vs', 'test match', 'odi', 't20', 'ipl', 'live score', 'विकेट', 'रन'],
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['live', 'recent', 'upcoming'], description: 'Type of matches to fetch' }
      }, required: []
    }
  },

  {
    name: 'get_ipl_info',
    description: 'IPL 2025 info — standings, schedule, team scores. No key needed.',
    category: 'sports',
    requiresKey: false,
    autoTrigger: ['ipl', 'इंडियन प्रीमियर लीग', 'ipl 2025', 'csk', 'mi mumbai', 'rcb', 'kkr', 'dc delhi', 'ipl standings', 'ipl schedule'],
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['standings', 'schedule', 'stats'], description: 'What IPL info to fetch' }
      }, required: []
    }
  },

  // ─── 📱 SOCIAL & TRENDING ───────────────────────────────
  {
    name: 'get_github_trending',
    description: 'Get trending GitHub repositories. Filter by programming language. Shows stars, description, topics.',
    category: 'social',
    requiresKey: false,
    autoTrigger: ['github trending', 'trending repos', 'popular code', 'open source trending', 'github stars', 'hot repos', 'trending projects'],
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Programming language filter e.g. Python, JavaScript, TypeScript' },
        period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'Trending period' }
      }, required: []
    }
  },

  {
    name: 'get_devto_posts',
    description: 'Get popular developer articles from dev.to by tag. Shows title, author, reactions, reading time.',
    category: 'social',
    requiresKey: false,
    autoTrigger: ['dev.to', 'developer articles', 'coding articles', 'tech blog', 'devto', 'programming posts'],
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'Article tag: javascript, python, ai, webdev, beginners, etc.' },
        top: { type: 'number', description: 'Number of articles (1-10). Default: 5' }
      }, required: []
    }
  },

  // ─── 🎮 ENTERTAINMENT ───────────────────────────────────
  {
    name: 'get_meme',
    description: 'Get a random meme from Reddit. Returns meme image URL, title and upvotes.',
    category: 'entertainment',
    requiresKey: false,
    autoTrigger: ['meme', 'मीम', 'funny', 'हँसाओ', 'joke image', 'memes bhejo', 'random meme', 'funny image'],
    inputSchema: {
      type: 'object',
      properties: {
        subreddit: { type: 'string', description: 'Reddit subreddit for memes. Default: memes. Try: dankmemes, ProgrammerHumor, memes_of_the_dank' }
      }, required: []
    }
  },

  {
    name: 'get_anime_info',
    description: 'Search anime info or get top/trending anime. Returns title, score, episodes, genres, synopsis.',
    category: 'entertainment',
    requiresKey: false,
    autoTrigger: ['anime', 'एनिमे', 'manga', 'naruto', 'dragon ball', 'one piece', 'attack on titan', 'demon slayer', 'jujutsu kaisen', 'top anime', 'trending anime'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Anime title to search' },
        type: { type: 'string', enum: ['search', 'trending', 'top'], description: 'What to fetch. Default: top' }
      }, required: []
    }
  },

  {
    name: 'search_tv_shows',
    description: 'Search TV shows and web series info — rating, genre, network, status, synopsis.',
    category: 'entertainment',
    requiresKey: false,
    autoTrigger: ['tv show', 'web series', 'series', 'show info', 'breaking bad', 'stranger things', 'mirzapur', 'scam 1992', 'family man', 'show details'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'TV show name to search' }
      }, required: ['query']
    }
  },

  {
    name: 'get_cocktail_recipe',
    description: 'Get cocktail/mocktail recipes with ingredients and instructions. Can search by name or get random.',
    category: 'entertainment',
    requiresKey: false,
    autoTrigger: ['cocktail', 'mocktail', 'drink recipe', 'bartender', 'पीने की recipe', 'cold drink recipe', 'random drink'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Cocktail/drink name' },
        random: { type: 'boolean', description: 'Get a random drink' }
      }, required: []
    }
  },

  // ─── 🧠 KNOWLEDGE & EDUCATION ───────────────────────────
  {
    name: 'get_trivia_question',
    description: 'Get quiz/trivia questions by category and difficulty. Perfect for NEET prep, GK practice, competitive exams.',
    category: 'education',
    requiresKey: false,
    autoTrigger: ['quiz', 'trivia', 'question', 'test me', 'mcq', 'multiple choice', 'gk question', 'science question', 'biology question', 'chemistry question', 'क्विज', 'सवाल पूछो'],
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Category: science, biology, chemistry, physics, math, geography, history, sports, computers, general' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], description: 'Question difficulty' },
        type: { type: 'string', enum: ['multiple', 'boolean'], description: 'MCQ or true/false' },
        amount: { type: 'number', description: 'Number of questions (1-10). Default: 5' }
      }, required: []
    }
  },

  {
    name: 'get_advice',
    description: 'Get wise advice or life tips. Random or by specific ID.',
    category: 'knowledge',
    requiresKey: false,
    autoTrigger: ['advice', 'सलाह', 'life tips', 'tip do', 'कोई सलाह', 'guidance', 'wise words'],
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Specific advice ID (optional)' }
      }, required: []
    }
  },

  {
    name: 'get_random_fact',
    description: 'Get an interesting random fact. Works in Hindi and English.',
    category: 'knowledge',
    requiresKey: false,
    autoTrigger: ['random fact', 'interesting fact', 'did you know', 'fun fact', 'रोचक तथ्य', 'interesting', 'fact bolo'],
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['hindi', 'english'], description: 'Response language' }
      }, required: []
    }
  },

  {
    name: 'get_number_fact',
    description: 'Get interesting trivia about any number — math, history, trivia.',
    category: 'knowledge',
    requiresKey: false,
    autoTrigger: ['number fact', 'number trivia', 'about number', 'संख्या तथ्य', 'math fact'],
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number', description: 'The number to get facts about' },
        type: { type: 'string', enum: ['trivia', 'math', 'date', 'year'], description: 'Type of fact' }
      }, required: []
    }
  },

  {
    name: 'get_country_info',
    description: 'Get detailed info about any country — capital, population, language, currency, timezone, borders.',
    category: 'knowledge',
    requiresKey: false,
    autoTrigger: ['country info', 'देश की जानकारी', 'capital of', 'population of', 'currency of', 'about country', 'which country', 'राष्ट्र'],
    inputSchema: {
      type: 'object',
      properties: {
        country: { type: 'string', description: 'Country name' },
        field: { type: 'string', description: 'Specific field: capital, population, currency, etc.' }
      }, required: ['country']
    }
  },

  // ─── 🛠️ PRODUCTIVITY & UTILITIES ────────────────────────
  {
    name: 'generate_qr_code',
    description: 'Generate QR code for any text, URL, contact info, UPI ID. Returns QR code image URL.',
    category: 'utility',
    requiresKey: false,
    autoTrigger: ['qr code', 'qr बनाओ', 'qr generate', 'qr for', 'qr बनाना', 'scan code', 'make qr'],
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text/URL/contact/UPI ID to encode in QR' },
        size: { type: 'number', description: 'QR size in pixels. Default: 300' }
      }, required: ['text']
    }
  },

  {
    name: 'shorten_url',
    description: 'Shorten any long URL using TinyURL. Returns short link.',
    category: 'utility',
    requiresKey: false,
    autoTrigger: ['shorten url', 'short link', 'url छोटा', 'link short karo', 'tinyurl', 'link shorten'],
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Long URL to shorten' }
      }, required: ['url']
    }
  },

  {
    name: 'generate_password',
    description: 'Generate strong random password with custom length, uppercase, numbers, symbols.',
    category: 'utility',
    requiresKey: false,
    autoTrigger: ['password generate', 'strong password', 'पासवर्ड बनाओ', 'random password', 'secure password', 'password chahiye'],
    inputSchema: {
      type: 'object',
      properties: {
        length: { type: 'number', description: 'Password length (8-64). Default: 16' },
        uppercase: { type: 'boolean', description: 'Include uppercase. Default: true' },
        numbers: { type: 'boolean', description: 'Include numbers. Default: true' },
        symbols: { type: 'boolean', description: 'Include symbols like !@#. Default: false' }
      }, required: []
    }
  },

  {
    name: 'convert_units',
    description: 'Convert units: length, weight, temperature, volume, speed, area (including Indian units like bigha, acre). Returns converted value.',
    category: 'utility',
    requiresKey: false,
    autoTrigger: ['convert', 'कन्वर्ट', 'km to miles', 'celsius to fahrenheit', 'kg to lb', 'unit convert', 'बदलो', 'meter to feet', 'bigha to acre', 'inch to cm'],
    inputSchema: {
      type: 'object',
      properties: {
        value: { type: 'number', description: 'Value to convert' },
        from: { type: 'string', description: 'Unit to convert from: km, miles, kg, lb, c, f, l, gallon, km/h, mph, sqm, sqft, bigha, acre' },
        to: { type: 'string', description: 'Unit to convert to' }
      }, required: ['value', 'from', 'to']
    }
  },

  {
    name: 'calculate_bmi',
    description: 'Calculate BMI (Body Mass Index) and health category. Supports metric and imperial.',
    category: 'health',
    requiresKey: false,
    autoTrigger: ['bmi', 'body mass', 'weight height', 'मेरा bmi', 'bmi calculate', 'healthy weight', 'overweight check'],
    inputSchema: {
      type: 'object',
      properties: {
        weight: { type: 'number', description: 'Weight in kg (or lbs if imperial)' },
        height: { type: 'number', description: 'Height in cm (or inches if imperial)' },
        unit: { type: 'string', enum: ['metric', 'imperial'], description: 'Unit system. Default: metric' }
      }, required: ['weight', 'height']
    }
  },

  {
    name: 'calculate_age',
    description: 'Calculate exact age from birthdate. Shows years, months, days and days until next birthday.',
    category: 'utility',
    requiresKey: false,
    autoTrigger: ['my age', 'age calculate', 'birthday', 'जन्मदिन', 'उम्र', 'age from birthdate', 'how old', 'born on', 'जन्म तारीख'],
    inputSchema: {
      type: 'object',
      properties: {
        birthdate: { type: 'string', description: 'Birthdate in YYYY-MM-DD format' }
      }, required: ['birthdate']
    }
  },

  // ─── 🎨 CREATIVITY ──────────────────────────────────────
  {
    name: 'get_color_palette',
    description: 'Generate beautiful color palettes for design — analogic, complementary, monochrome modes.',
    category: 'creativity',
    requiresKey: false,
    autoTrigger: ['color palette', 'रंग', 'color scheme', 'design colors', 'hex colors', 'palette generate', 'color combination'],
    inputSchema: {
      type: 'object',
      properties: {
        hex: { type: 'string', description: 'Base hex color (without #). Random if not provided.' },
        mode: { type: 'string', enum: ['random', 'analogic', 'complement', 'monochrome'], description: 'Palette type. Default: analogic' }
      }, required: []
    }
  },

  {
    name: 'get_color_meaning',
    description: 'Get psychology and meaning of colors — useful for design, marketing, branding decisions.',
    category: 'creativity',
    requiresKey: false,
    autoTrigger: ['color meaning', 'what does red mean', 'blue color psychology', 'रंग का मतलब', 'color psychology', 'brand color'],
    inputSchema: {
      type: 'object',
      properties: {
        color: { type: 'string', description: 'Color name: red, blue, green, yellow, orange, purple, white, black, pink, saffron' }
      }, required: ['color']
    }
  },

  {
    name: 'generate_text_art',
    description: 'Generate ASCII text art from any text. Good for headers, banners, fun messages.',
    category: 'creativity',
    requiresKey: false,
    autoTrigger: ['ascii art', 'text art', 'ascii text', 'banner art', 'cool text', 'text banner'],
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to convert (max 10 chars)' },
        style: { type: 'string', enum: ['banner', 'block', 'simple'], description: 'Art style' }
      }, required: ['text']
    }
  },

  // ─── 🇮🇳 INDIA SPECIFIC ──────────────────────────────────
  {
    name: 'get_india_fuel_price',
    description: 'Get petrol and diesel prices for Indian cities. Includes Rewa, Bhopal, Delhi, Mumbai, Bangalore.',
    category: 'india',
    requiresKey: false,
    autoTrigger: ['petrol price', 'diesel price', 'fuel rate', 'पेट्रोल', 'डीजल', 'petrol ka daam', 'fuel price today', 'petrol rate rewa'],
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Indian city name. Default: Delhi' }
      }, required: []
    }
  },

  {
    name: 'get_india_govt_schemes',
    description: 'Get information about Indian government schemes — PM Kisan, Ayushman Bharat, Ladli Behna, housing, education.',
    category: 'india',
    requiresKey: false,
    autoTrigger: ['government scheme', 'सरकारी योजना', 'pm kisan', 'ayushman', 'ladli behna', 'yojana', 'sambal', 'scholarship', 'pm awas', 'सरकारी मदद'],
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Scheme category: farmer, education, health, housing, mp (MP-specific)' },
        state: { type: 'string', description: 'State filter (optional)' },
        query: { type: 'string', description: 'Search keyword' }
      }, required: []
    }
  },

  {
    name: 'get_stock_market',
    description: 'Get Nifty 50 and Indian stock market data — current price, change, day high/low.',
    category: 'finance',
    requiresKey: false,
    autoTrigger: ['nifty', 'sensex', 'stock market', 'share market', 'शेयर बाजार', 'nse', 'bse', 'market today', 'stock price'],
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Stock symbol e.g. RELIANCE.NS, TCS.NS (optional)' },
        index: { type: 'string', enum: ['nifty', 'sensex', 'all'], description: 'Index to check. Default: all' }
      }, required: []
    }
  }

); // end TOOLS_CONFIG.push

export default TOOLS_CONFIG;
