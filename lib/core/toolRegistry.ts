/**
 * JARVIS Tool Registry — Lazy loading, category-based, 150+ tool ready
 * Tools load only when their category is needed — zero memory waste
 */

export type ToolCategory =
  | 'utilities'     // calc, QR, password, converter — NO API
  | 'finance'       // crypto, stocks, EMI, SIP
  | 'weather'       // weather, air quality
  | 'news'          // news, headlines
  | 'india'         // IPL, railway, holidays, RTI
  | 'education'     // wiki, facts, dictionary
  | 'productivity'  // github, notion, calendar
  | 'media'         // youtube transcript, anime, music
  | 'ai_tools'      // image gen, TTS, translate
  | 'health'        // BMI, calorie, medicine
  | 'location'      // maps, places, timezone
  | 'social'        // telegram, twitter trends
  | 'developer'     // UUID, hash, base64, regex test
  | 'general';      // fallback

export interface ToolMeta {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  apiRequired: boolean;         // false = local function, no credits
  envKey?: string;              // which API key needed
  keywords: string[];           // for intent matching
  cacheTTL?: number;            // ms, if cacheable
  local?: boolean;              // purely local, zero API
}

// ── Tool Registry (150+ slots, lazy) ─────────────────────────────────────────
const REGISTRY: ToolMeta[] = [
  // UTILITIES (local, no API)
  { id:'calculator',      name:'Calculator',        category:'utilities',   apiRequired:false, local:true,  keywords:['calculate','math','equation','solve','compute','+','-','*','/','='], description:'Math calculator' },
  { id:'qr_generator',    name:'QR Generator',      category:'utilities',   apiRequired:false, local:true,  keywords:['qr','qr code','barcode','scan'], description:'Generate QR codes' },
  { id:'password_gen',    name:'Password Generator',category:'utilities',   apiRequired:false, local:true,  keywords:['password','passphrase','secure password','strong password'], description:'Generate secure passwords' },
  { id:'unit_converter',  name:'Unit Converter',    category:'utilities',   apiRequired:false, local:true,  keywords:['convert','meter','kg','celsius','fahrenheit','miles','km','unit'], description:'Convert units' },
  { id:'color_picker',    name:'Color Tools',       category:'utilities',   apiRequired:false, local:true,  keywords:['color','hex','rgb','hsl','palette'], description:'Color converter' },
  { id:'text_tools',      name:'Text Utilities',    category:'utilities',   apiRequired:false, local:true,  keywords:['word count','character count','uppercase','lowercase','reverse text'], description:'Text manipulation' },
  { id:'json_formatter',  name:'JSON Formatter',    category:'developer',   apiRequired:false, local:true,  keywords:['json','format json','parse json','validate json'], description:'Format/validate JSON' },
  { id:'uuid',            name:'UUID Generator',    category:'developer',   apiRequired:false, local:true,  keywords:['uuid','guid','unique id'], description:'Generate UUIDs' },
  { id:'hash',            name:'Hash Generator',    category:'developer',   apiRequired:false, local:true,  keywords:['hash','md5','sha256','sha1','sha512'], description:'Generate hashes' },
  { id:'base64',          name:'Base64 Tool',       category:'developer',   apiRequired:false, local:true,  keywords:['base64','encode','decode'], description:'Base64 encode/decode' },
  { id:'regex_test',      name:'Regex Tester',      category:'developer',   apiRequired:false, local:true,  keywords:['regex','regular expression','regexp test'], description:'Test regex patterns' },
  { id:'diff_tool',       name:'Text Diff',         category:'developer',   apiRequired:false, local:true,  keywords:['diff','compare text','difference'], description:'Compare text' },
  // FINANCE
  { id:'crypto',          name:'Crypto Prices',     category:'finance',     apiRequired:false, envKey:'none', cacheTTL:30000,  keywords:['bitcoin','btc','eth','crypto','coin price','usdt'], description:'Crypto prices' },
  { id:'stocks',          name:'Stock Prices',      category:'finance',     apiRequired:true,  envKey:'ALPHAVANTAGE_API_KEY', cacheTTL:60000, keywords:['stock','nifty','sensex','share price','market','NSE','BSE'], description:'Stock data' },
  { id:'emi_calc',        name:'EMI Calculator',    category:'finance',     apiRequired:false, local:true,  keywords:['emi','loan','interest','principal'], description:'Loan EMI calculator' },
  { id:'sip_calc',        name:'SIP Calculator',    category:'finance',     apiRequired:false, local:true,  keywords:['sip','mutual fund','investment','returns','lumpsum'], description:'SIP return calculator' },
  { id:'currency',        name:'Currency Exchange',  category:'finance',     apiRequired:false, cacheTTL:300000, keywords:['currency','exchange rate','usd','inr','dollar','rupee','forex'], description:'Currency rates' },
  // WEATHER
  { id:'weather',         name:'Weather',           category:'weather',     apiRequired:false, cacheTTL:600000, keywords:['weather','temperature','rain','forecast','mausam','baarish','garmi','sardi'], description:'Weather info' },
  { id:'air_quality',     name:'Air Quality',       category:'weather',     apiRequired:false, cacheTTL:600000, keywords:['aqi','air quality','pollution','pm2.5'], description:'Air quality index' },
  // NEWS
  { id:'news',            name:'News',              category:'news',        apiRequired:false, cacheTTL:300000, keywords:['news','khabar','headline','today news','breaking','samachar'], description:'Latest news' },
  { id:'tech_news',       name:'Tech News',         category:'news',        apiRequired:false, cacheTTL:300000, keywords:['tech news','technology','gadget','startup'], description:'Tech headlines' },
  // INDIA SPECIFIC
  { id:'ipl',             name:'IPL/Cricket',       category:'india',       apiRequired:false, cacheTTL:60000,  keywords:['ipl','cricket','match score','t20','odi','test match','rcb','csk','mi'], description:'Cricket scores' },
  { id:'railway',         name:'Indian Railways',   category:'india',       apiRequired:true,  envKey:'RAILWAYAPI_KEY', keywords:['train','railway','pnr','station','irctc','schedule'], description:'Train info' },
  { id:'holidays',        name:'Indian Holidays',   category:'india',       apiRequired:false, local:true, cacheTTL:86400000, keywords:['holiday','festival','diwali','holi','public holiday'], description:'Indian holidays' },
  { id:'indian_news',     name:'India News',        category:'india',       apiRequired:false, cacheTTL:300000, keywords:['india news','bharat','desh ki khabar','modi','government'], description:'India-specific news' },
  // EDUCATION
  { id:'wikipedia',       name:'Wikipedia',         category:'education',   apiRequired:false, cacheTTL:3600000, keywords:['wiki','wikipedia','what is','kya hai','explain','definition','history of'], description:'Wikipedia search' },
  { id:'dictionary',      name:'Dictionary',        category:'education',   apiRequired:false, cacheTTL:86400000, keywords:['meaning','definition','synonym','antonym','dictionary','word meaning'], description:'Word definitions' },
  { id:'facts',           name:'Facts',             category:'education',   apiRequired:false, cacheTTL:86400000, keywords:['fact','interesting fact','did you know','trivia'], description:'Random facts' },
  { id:'math_solver',     name:'Math Solver',       category:'education',   apiRequired:false, local:true,  keywords:['equation','quadratic','algebra','geometry','integral','derivative'], description:'Math problem solver' },
  // PRODUCTIVITY
  { id:'github',          name:'GitHub',            category:'productivity',apiRequired:true,  envKey:'GITHUB_TOKEN', keywords:['github','repo','commit','pull request','issue','code','repository'], description:'GitHub integration' },
  { id:'notion',          name:'Notion',            category:'productivity',apiRequired:true,  envKey:'NOTION_TOKEN', keywords:['notion','page','database','note'], description:'Notion integration' },
  // MEDIA
  { id:'youtube',         name:'YouTube Transcript',category:'media',       apiRequired:false, cacheTTL:3600000, keywords:['youtube','video','transcript','subtitles','yt link'], description:'YouTube transcript' },
  { id:'anime',           name:'Anime Info',        category:'media',       apiRequired:false, cacheTTL:3600000, keywords:['anime','manga','jujutsu','one piece','naruto','attack on titan'], description:'Anime info' },
  // AI TOOLS
  { id:'image_gen',       name:'Image Generation',  category:'ai_tools',    apiRequired:false, keywords:['image','generate image','create image','draw','photo banao','picture'], description:'AI image generation' },
  { id:'translate',       name:'Translate',         category:'ai_tools',    apiRequired:false, keywords:['translate','translation','hindi mein','english mein','anuvad'], description:'Translation' },
  // HEALTH
  { id:'bmi',             name:'BMI Calculator',    category:'health',      apiRequired:false, local:true,  keywords:['bmi','body mass','weight height','obesity'], description:'BMI calculator' },
  { id:'calorie',         name:'Calorie Counter',   category:'health',      apiRequired:false, local:true,  keywords:['calorie','calories','food nutrition','diet'], description:'Calorie info' },
  // DEVELOPER TOOLS (additional)
  { id:'ip_lookup',       name:'IP Lookup',         category:'developer',   apiRequired:false, cacheTTL:3600000, keywords:['ip address','my ip','ip lookup','geolocation ip'], description:'IP address info' },
  { id:'url_shortener',   name:'URL Shortener',     category:'utilities',   apiRequired:false, keywords:['shorten url','short link','tinyurl'], description:'URL shortener' },
];

// ── Category → Tool Map (lazy) ────────────────────────────────────────────────
const categoryMap = new Map<ToolCategory, ToolMeta[]>();

export function getToolsByCategory(cat: ToolCategory): ToolMeta[] {
  if (!categoryMap.has(cat)) {
    categoryMap.set(cat, REGISTRY.filter(t => t.category === cat));
  }
  return categoryMap.get(cat)!;
}

export function getAllLocalTools(): ToolMeta[] {
  return REGISTRY.filter(t => t.local === true);
}

export function findToolByIntent(text: string): ToolMeta | null {
  const lower = text.toLowerCase();
  let best: ToolMeta | null = null;
  let bestScore = 0;
  for (const tool of REGISTRY) {
    let score = 0;
    for (const kw of tool.keywords) {
      if (lower.includes(kw)) score += kw.length; // longer match = more specific
    }
    if (score > bestScore) { bestScore = score; best = tool; }
  }
  return bestScore > 2 ? best : null;
}

export function getToolById(id: string): ToolMeta | undefined {
  return REGISTRY.find(t => t.id === id);
}

export function getRegistryStats() {
  const local = REGISTRY.filter(t => t.local).length;
  const cats = new Set(REGISTRY.map(t => t.category)).size;
  return { total: REGISTRY.length, local, api: REGISTRY.length - local, categories: cats };
}

export { REGISTRY };
