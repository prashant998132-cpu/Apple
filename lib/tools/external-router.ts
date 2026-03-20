import { isMediaSafe, buildImageCDNUrl } from '../core/mediaGuard';
// lib/tools/external-router.ts — JARVIS Smart Tool Router v2
// 30+ free services. Intent detection → sirf relevant API call.
// FREE FIRST, no wasted credits.

export interface ToolResult {
  tool: string
  data: string | Record<string, any>
  success: boolean
}

const GITHUB_TOKEN = process.env.GITHUB_PAT || ''
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || ''

// ── INTENT DETECTION ──────────────────────────────────────
export function detectIntent(msg: string): string[] {
  const m = msg.toLowerCase()
  const intents: string[] = []
  if (m.match(/weather|mausam|baarish|rain|temperature|garmi|sardi|forecast|humidity|wind/)) intents.push('weather')
  if (m.match(/news|khabar|latest|headlines|breaking|samachar/)) intents.push('news')
  if (m.match(/github|repository|repo|commit|pull request|issue|branch|code push/)) intents.push('github')
  if (m.match(/vercel|deploy|deployment|build|production|hosting/)) intents.push('vercel')
  if (m.match(/bitcoin|btc|ethereum|eth|crypto|coin price|rate|inr|usd|dollar|rupee|exchange|forex/)) intents.push('crypto')
  if (m.match(/what is|who is|kya hai|kaun hai|history|define|wikipedia|full form/)) intents.push('wikipedia')
  if (m.match(/meaning|definition|synonyms|word|vocabulary|matlab|dictionary/)) intents.push('dictionary')
  if (m.match(/joke|chutkula|funny|hasao|comedy/)) intents.push('joke')
  if (m.match(/quote|shayari|motivation|inspire|thought|suvichar/)) intents.push('quote')
  if (m.match(/advice|salah|suggestion|kya karu|batao|help me decide/)) intents.push('advice')
  if (m.match(/time|date|day|kya baja|aaj kaunsa|timezone/)) intents.push('time')
  if (m.match(/my ip|mera ip|location|where am i|isp/)) intents.push('ip')
  if (m.match(/nasa|space|planet|star|asteroid|astronomy|universe|apod/)) intents.push('nasa')
  if (m.match(/iss|international space station|space station kahan/)) intents.push('iss')
  if (m.match(/country|nation|capital|population|currency|flag/)) intents.push('country')
  if (m.match(/recipe|khana|food|dish|cook|meal|ingredient/)) intents.push('recipe')
  if (m.match(/movie|film|web series|imdb|actor|director|bollywood|hollywood/)) intents.push('movie')
  if (m.match(/earthquake|bhookamp|seismic|tremor/)) intents.push('earthquake')
  if (m.match(/trivia|quiz|general knowledge|gk|question|fun fact/)) intents.push('trivia')
  if (m.match(/number fact|\d+ fact|interesting number/)) intents.push('numberfact')
  if (m.match(/cat|billi|kitty|meow/)) intents.push('cat')
  if (m.match(/dog|kutta|puppy|woof/)) intents.push('dog')
  if (m.match(/book|novel|author|isbn|library|read|padhna/)) intents.push('book')
  if (m.match(/hacker news|tech news|startup|ycombinator/)) intents.push('hackernews')
  if (m.match(/reddit|subreddit|post|upvote/)) intents.push('reddit')
  if (m.match(/sunrise|sunset|sun time|suraj/)) intents.push('sun')
  if (m.match(/qr code|qr banana|generate qr/)) intents.push('qr')
  if (m.match(/bored|kya karu|kuch karna|activity suggest/)) intents.push('bored')
  if (m.match(/chuck norris|norris|joke about chuck/)) intents.push('chuck')
  if (m.match(/holiday|chutti|national day|festival date/)) intents.push('holiday')
  if (m.match(/sports|cricket|ipl|score|match|icc|fifa|football/)) intents.push('sports')
  if (m.match(/currency|exchange rate|dollar|euro|pound|yen|aed|rupee to|convert.*currency/)) intents.push('currency')
  if (m.match(/air quality|aqi|pollution|pm2|smog/)) intents.push('airquality')
  if (m.match(/qr code|qr banana|generate qr|qr banao/)) intents.push('qr')
  if (m.match(/cocktail|mocktail|drink recipe|bartender/)) intents.push('cocktail')
  if (m.match(/pokemon|pikachu|charizard|bulbasaur|pokedex/)) intents.push('pokemon')
  if (m.match(/space news|rocket launch|spacex|isro|spacecraft/)) intents.push('spacenews')
  if (m.match(/age predict|naam se age|agify|naam ki umar/)) intents.push('agify')
  if (m.match(/color|colour|hex code|rgb|hsl|palette/)) intents.push('color')
  if (m.match(/random fact|useless fact|interesting fact|did you know/)) intents.push('fact')
  if (m.match(/meme|funny image|meme dikhao/)) intents.push('meme')
  if (m.match(/forecast|kal ka mausam|3 day|weekly weather|agle hafte/)) intents.push('forecast')
  if (m.match(/public holiday|national holiday|chutti kab|next holiday/)) intents.push('holiday')
  if (m.match(/youtube trending|viral video|trending india/)) intents.push('youtube')
  if (m.match(/short url|url short|link short|tinyurl/)) intents.push('shorturl')
  if (m.match(/math fact|mathematical|number math/)) intents.push('mathfact')
  if (m.match(/aaj ke din|on this day|date fact|historical event today/)) intents.push('datefact')
  if (m.match(/gutenberg|free book|classic novel|public domain book/)) intents.push('gutenberg')
  if (m.match(/nutrition|calories|ingredients|food info|protein.*carb|khane mein kitna/)) intents.push('food')
  if (m.match(/mars weather|mangal|red planet weather/)) intents.push('mars')
  if (m.match(/stock|share price|nse|bse|sensex|nifty|reliance|tata|infosys/)) intents.push('stock')
  if (m.match(/cricket|ipl|match score|wicket|batting|bowling|test match/)) intents.push('cricket')
  if (m.match(/github trending|trending repo|popular github/)) intents.push('ghtrending')
  if (m.match(/generate image|create image|draw|photo banana|ai image|picture create|image banao|photo banao|tasveer|tsveer|image bana|photo bana|ek image|ek photo|girl.*image|image.*girl|boy.*image|wallpaper|scenery|nature.*image|selfie.*ai|ai.*photo|realistic.*image|cartoon.*bana|sketch.*bana|paint.*karo|scene.*bana/i)) intents.push('aiimage')
  if (m.match(/word of day|aaj ka shabd|vocabulary|new word/)) intents.push('wordofday')
  if (m.match(/science news|research news|discovery|scientific/)) intents.push('sciencenews')
  if (m.match(/network info|internet speed|who am i|mera network/)) intents.push('ipinfo')
  if (m.match(/password check|password strength|strong password|password test/)) intents.push('password')
  if (m.match(/sha256|hash generate|encrypt text|hash karo/)) intents.push('hash')
  if (m.match(/base64|encode decode|base 64/)) intents.push('base64')
  if (m.match(/uuid|unique id|random id|generate id/)) intents.push('uuid')
  if (m.match(/world clock|time zone|timezone|different country time/)) intents.push('timezone')
  if (m.match(/age calculate|kitni umar|age kya hai|dob|date of birth.*age/)) intents.push('agecalc')
  if (m.match(/bmi|body mass|weight height check/)) intents.push('bmi')
  if (m.match(/emi|loan emi|home loan|car loan|equated monthly/)) intents.push('emi')
  if (m.match(/sip|mutual fund|systematic investment|sip calculator/)) intents.push('sip')
  if (m.match(/anime|manga|jikan|naruto|one piece|dragon ball/)) intents.push('anime')
  if (m.match(/motivat|inspire|himmat|josh|positive|kuch sunao achha/)) intents.push('motivation')
  if (m.match(/ip location|ip address lookup|trace ip|kahan se hai/)) intents.push('geoip')
  if (m.match(/search|google|find|look up|dhundo/)) intents.push('serper')
  if (m.match(/https?:\/\//)) intents.push('jina')
  if (m.match(/youtube.*transcript|youtu\.be|youtube\.com\/watch/)) intents.push('youtube_transcript')
  if (m.match(/\b(translate|anuvad|hindi mein kaho|english mein|urdu mein|french|spanish|german mein)\b/i)) intents.push('translate')
  if (m.match(/https?:\/\/[^\s]{10,}/)) intents.push('jina')
  return [...new Set(intents)]
}

// ── TOOL HANDLERS ──────────────────────────────────────────
const T = (ms: number) => AbortSignal.timeout(ms)

async function getWeather(q: string): Promise<ToolResult> {
  try {
    const city = q.match(/(?:in|at|of|for)\s+([a-zA-Z\s]+?)(?:\?|$|ka|ki)/i)?.[1]?.trim() || 'Rewa'
    const r = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { signal: T(5000) })
    const d = await r.json()
    const c = d.current_condition?.[0]
    const area = d.nearest_area?.[0]?.areaName?.[0]?.value || city
    return { tool:'weather', success:true, data:`🌤️ ${area} Weather:\nTemp: ${c?.temp_C}°C (feels ${c?.FeelsLikeC}°C)\nCondition: ${c?.weatherDesc?.[0]?.value}\nHumidity: ${c?.humidity}% | Wind: ${c?.windspeedKmph}km/h` }
  } catch { return { tool:'weather', success:false, data:'Weather unavailable' } }
}

async function getGitHub(q: string): Promise<ToolResult> {
  try {
    const h = { Authorization:`token ${GITHUB_TOKEN}`, Accept:'application/vnd.github.v3+json' }
    if (q.match(/latest|recent|commit|push|repo/i)) {
      const r = await fetch('https://api.github.com/user/repos?sort=updated&per_page=5', { headers:h, signal:T(6000) })
      const repos = await r.json()
      const list = repos.slice(0,4).map((r:any) => `• ${r.name} (${r.language||'?'}) — ${new Date(r.updated_at).toLocaleDateString('en-IN')}`).join('\n')
      return { tool:'github', success:true, data:`🐙 Recent GitHub Repos:\n${list}` }
    }
    if (q.match(/issue/i)) {
      const r = await fetch('https://api.github.com/issues?filter=all&per_page=4', { headers:h, signal:T(6000) })
      const issues = await r.json()
      const list = issues.map((i:any) => `• [${i.state}] ${i.title}`).join('\n')
      return { tool:'github', success:true, data:`📋 Your GitHub Issues:\n${list}` }
    }
    const r = await fetch('https://api.github.com/user', { headers:h, signal:T(5000) })
    const u = await r.json()
    return { tool:'github', success:true, data:`🐙 GitHub: ${u.login}\nRepos: ${u.public_repos} | Followers: ${u.followers}\nBio: ${u.bio||'—'}` }
  } catch { return { tool:'github', success:false, data:'GitHub unavailable' } }
}

async function getVercel(q: string): Promise<ToolResult> {
  try {
    const h = { Authorization:`Bearer ${VERCEL_TOKEN}`, 'Content-Type':'application/json' }
    const r = await fetch('https://api.vercel.com/v6/deployments?limit=5&teamId=team_T1fCdmT9dLBpDNsGgAl3rwu3', { headers:h, signal:T(6000) })
    const d = await r.json()
    const deps = d.deployments?.slice(0,4).map((dep:any) => 
      `• ${dep.state==='READY'?'✅':'❌'} ${dep.meta?.githubCommitMessage?.slice(0,50)||dep.url} (${new Date(dep.created).toLocaleTimeString('en-IN')})`
    ).join('\n')
    return { tool:'vercel', success:true, data:`🚀 Vercel Deployments:\n${deps||'No recent deployments'}` }
  } catch { return { tool:'vercel', success:false, data:'Vercel data unavailable' } }
}

async function getCrypto(q: string): Promise<ToolResult> {
  try {
    const coinMap:Record<string,string> = { bitcoin:'bitcoin',btc:'bitcoin',ethereum:'ethereum',eth:'ethereum',doge:'dogecoin',bnb:'binancecoin',sol:'solana',xrp:'ripple',ada:'cardano' }
    const words = q.toLowerCase().split(/\s+/)
    const coin = words.reduce((found:string,w:string) => found || coinMap[w] || '', '') || 'bitcoin'
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,inr&include_24hr_change=true`, { signal:T(5000) })
    const d = await r.json()
    const c = d[coin]
    const trend = (c?.usd_24h_change||0) >= 0 ? '📈' : '📉'
    return { tool:'crypto', success:true, data:`💰 ${coin.charAt(0).toUpperCase()+coin.slice(1)}: $${c?.usd?.toLocaleString()} (₹${c?.inr?.toLocaleString()}) ${trend} ${c?.usd_24h_change?.toFixed(2)}%` }
  } catch { return { tool:'crypto', success:false, data:'Crypto price unavailable' } }
}

async function getWikipedia(q: string): Promise<ToolResult> {
  try {
    const topic = q.replace(/what is|who is|kya hai|kaun hai|explain|define|history of|about/gi,'').trim()
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`, { signal:T(5000) })
    const d = await r.json()
    return { tool:'wikipedia', success:true, data:`📖 ${d.title}:\n${d.extract?.slice(0,500)}${d.extract?.length>500?'...':''}` }
  } catch { return { tool:'wikipedia', success:false, data:'Wikipedia unavailable' } }
}

async function getJoke(): Promise<ToolResult> {
  try {
    const r = await fetch('https://v2.jokeapi.dev/joke/Programming,Miscellaneous,Pun?blacklistFlags=nsfw,racist,sexist', { signal:T(4000) })
    const d = await r.json()
    const joke = d.type==='single' ? d.joke : `${d.setup}\n😄 ${d.delivery}`
    return { tool:'joke', success:true, data:`😄 Joke:\n${joke}` }
  } catch { return { tool:'joke', success:false, data:'Joke unavailable' } }
}

async function getChuckNorris(): Promise<ToolResult> {
  try {
    const r = await fetch('https://api.chucknorris.io/jokes/random', { signal:T(4000) })
    const d = await r.json()
    return { tool:'chuck', success:true, data:`💪 Chuck Norris Fact:\n${d.value}` }
  } catch { return { tool:'chuck', success:false, data:'Chuck Norris unavailable' } }
}

async function getQuote(): Promise<ToolResult> {
  try {
    const r = await fetch('https://api.quotable.io/quotes/random?limit=1', { signal:T(4000) })
    const d = await r.json()
    return { tool:'quote', success:true, data:`💬 "${d[0]?.content}"\n— ${d[0]?.author}` }
  } catch { return { tool:'quote', success:false, data:'Quote unavailable' } }
}

async function getAdvice(): Promise<ToolResult> {
  try {
    const r = await fetch('https://api.adviceslip.com/advice', { signal:T(4000) })
    const d = await r.json()
    return { tool:'advice', success:true, data:`💡 Advice:\n${d.slip?.advice}` }
  } catch { return { tool:'advice', success:false, data:'Advice unavailable' } }
}

async function getBored(): Promise<ToolResult> {
  try {
    const r = await fetch('https://www.boredapi.com/api/activity', { signal:T(4000) })
    const d = await r.json()
    return { tool:'bored', success:true, data:`🎯 Activity Suggestion:\n${d.activity}\nType: ${d.type} | Participants: ${d.participants}` }
  } catch { return { tool:'bored', success:false, data:'Activity unavailable' } }
}

async function getTime(): Promise<ToolResult> {
  try {
    const r = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata', { signal:T(4000) })
    const d = await r.json()
    const dt = new Date(d.datetime)
    return { tool:'time', success:true, data:`🕐 IST:\n${dt.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}\n${dt.toLocaleTimeString('en-IN')}` }
  } catch { return { tool:'time', success:false, data: new Date().toLocaleString('en-IN') } }
}

async function getIPInfo(): Promise<ToolResult> {
  try {
    const r = await fetch('https://ipapi.co/json/', { signal:T(4000) })
    const d = await r.json()
    return { tool:'ip', success:true, data:`🌐 Network:\nIP: ${d.ip}\n${d.city}, ${d.region}, ${d.country_name}\nISP: ${d.org}` }
  } catch { return { tool:'ip', success:false, data:'IP unavailable' } }
}

async function getNASA(): Promise<ToolResult> {
  try {
    const key = process.env.NASA_API_KEY || 'DEMO_KEY'
    const r = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${key}`, { signal:T(5000) })
    const d = await r.json()
    return { tool:'nasa', success:true, data:`🚀 NASA APOD — ${d.title} (${d.date}):\n${d.explanation?.slice(0,350)}...\nImage: ${d.url}` }
  } catch { return { tool:'nasa', success:false, data:'NASA unavailable' } }
}

async function getISS(): Promise<ToolResult> {
  try {
    const r = await fetch('http://api.open-notify.org/iss-now.json', { signal:T(4000) })
    const d = await r.json()
    return { tool:'iss', success:true, data:`🛸 ISS Location Now:\nLatitude: ${d.iss_position?.latitude}\nLongitude: ${d.iss_position?.longitude}\nTimestamp: ${new Date(d.timestamp*1000).toLocaleString('en-IN')}` }
  } catch { return { tool:'iss', success:false, data:'ISS data unavailable' } }
}

async function getCountry(q: string): Promise<ToolResult> {
  try {
    const c = q.replace(/country|nation|capital|population|currency|flag|about|ka|ki|ke/gi,'').trim()
    const r = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(c)}?fields=name,capital,population,currencies,languages,flags,region`, { signal:T(5000) })
    const d = await r.json()
    const country = d[0]
    const cur = Object.values(country.currencies||{})[0] as any
    return { tool:'country', success:true, data:`🌍 ${country.name?.common} ${country.flags?.emoji||''}:\nCapital: ${country.capital?.[0]}\nPopulation: ${country.population?.toLocaleString()}\nCurrency: ${cur?.name} (${cur?.symbol})\nLanguages: ${Object.values(country.languages||{}).join(', ')}` }
  } catch { return { tool:'country', success:false, data:'Country info unavailable' } }
}

async function getEarthquake(): Promise<ToolResult> {
  try {
    const r = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson', { signal:T(5000) })
    const d = await r.json()
    const quakes = d.features?.slice(0,3).map((f:any) =>
      `• M${f.properties?.mag} — ${f.properties?.place}`
    ).join('\n')
    return { tool:'earthquake', success:true, data:`🌍 Recent Significant Earthquakes:\n${quakes||'No significant earthquakes this week'}` }
  } catch { return { tool:'earthquake', success:false, data:'Earthquake data unavailable' } }
}

async function getTrivia(): Promise<ToolResult> {
  try {
    const r = await fetch('https://opentdb.com/api.php?amount=1&type=multiple', { signal:T(5000) })
    const d = await r.json()
    const q = d.results?.[0]
    return { tool:'trivia', success:true, data:`🧠 Trivia (${q?.category}):\n${decodeURIComponent(q?.question||'')}\nAnswer: ${decodeURIComponent(q?.correct_answer||'')}` }
  } catch { return { tool:'trivia', success:false, data:'Trivia unavailable' } }
}

async function getNumberFact(q: string): Promise<ToolResult> {
  try {
    const num = q.match(/\d+/)?.[0] || '42'
    const r = await fetch(`http://numbersapi.com/${num}`, { signal:T(4000) })
    const text = await r.text()
    return { tool:'numberfact', success:true, data:`🔢 Number Fact:\n${text}` }
  } catch { return { tool:'numberfact', success:false, data:'Number fact unavailable' } }
}

async function getCatFact(): Promise<ToolResult> {
  try {
    const r = await fetch('https://catfact.ninja/fact', { signal:T(4000) })
    const d = await r.json()
    return { tool:'cat', success:true, data:`🐱 Cat Fact:\n${d.fact}` }
  } catch { return { tool:'cat', success:false, data:'Cat fact unavailable' } }
}

async function getDogFact(): Promise<ToolResult> {
  try {
    const r = await fetch('https://dog-api.kinduff.com/api/facts', { signal:T(4000) })
    const d = await r.json()
    return { tool:'dog', success:true, data:`🐕 Dog Fact:\n${d.facts?.[0]}` }
  } catch { return { tool:'dog', success:false, data:'Dog fact unavailable' } }
}

async function getBook(q: string): Promise<ToolResult> {
  try {
    const query = q.replace(/book|novel|author|find|search|padhna/gi,'').trim()
    const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3&fields=title,author_name,first_publish_year,subject`, { signal:T(5000) })
    const d = await r.json()
    const books = d.docs?.slice(0,3).map((b:any) => `• "${b.title}" by ${b.author_name?.[0]||'Unknown'} (${b.first_publish_year||'?'})`).join('\n')
    return { tool:'book', success:true, data:`📚 Books Found:\n${books||'No books found'}` }
  } catch { return { tool:'book', success:false, data:'Book search unavailable' } }
}

async function getHackerNews(): Promise<ToolResult> {
  try {
    const r = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { signal:T(4000) })
    const ids = await r.json()
    const stories = await Promise.all(ids.slice(0,4).map(async (id:number) => {
      const sr = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal:T(3000) })
      return sr.json()
    }))
    const list = stories.map((s:any) => `• ${s.title} (${s.score}pts)`).join('\n')
    return { tool:'hackernews', success:true, data:`💻 HackerNews Top:\n${list}` }
  } catch { return { tool:'hackernews', success:false, data:'HackerNews unavailable' } }
}

async function getSunriseSunset(): Promise<ToolResult> {
  try {
    // Rewa coordinates default
    const r = await fetch('https://api.sunrise-sunset.org/json?lat=24.5373&lng=81.2966&formatted=0', { signal:T(4000) })
    const d = await r.json()
    const sunrise = new Date(d.results?.sunrise).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})
    const sunset = new Date(d.results?.sunset).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})
    return { tool:'sun', success:true, data:`☀️ Rewa Sun Times:\nSunrise: ${sunrise}\nSunset: ${sunset}\nDay Length: ${d.results?.day_length}` }
  } catch { return { tool:'sun', success:false, data:'Sun times unavailable' } }
}

async function getDictionary(q: string): Promise<ToolResult> {
  try {
    const word = q.replace(/meaning|definition|define|what is|matlab|of/gi,'').trim().split(' ')[0]
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal:T(4000) })
    const d = await r.json()
    const entry = d[0]
    const meanings = entry?.meanings?.slice(0,2).map((m:any) => `${m.partOfSpeech}: ${m.definitions?.[0]?.definition}`).join('\n')
    return { tool:'dictionary', success:true, data:`📚 "${entry?.word}":\n${meanings}` }
  } catch { return { tool:'dictionary', success:false, data:'Definition unavailable' } }
}

async function getRecipe(q: string): Promise<ToolResult> {
  try {
    const meal = q.replace(/recipe|khana|cook|banana|kaise|banao|how to make/gi,'').trim()
    const r = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(meal)}`, { signal:T(5000) })
    const d = await r.json()
    const m = d.meals?.[0]
    if (!m) return { tool:'recipe', success:false, data:'Recipe not found' }
    return { tool:'recipe', success:true, data:`🍳 ${m.strMeal} (${m.strArea}):\n${m.strInstructions?.slice(0,400)}...` }
  } catch { return { tool:'recipe', success:false, data:'Recipe unavailable' } }
}

async function getMovie(q: string): Promise<ToolResult> {
  try {
    const key = process.env.OMDB_API_KEY
    if (!key) throw new Error('No key')
    const title = q.replace(/movie|film|web series|review|imdb|rating|about|kya hai/gi,'').trim()
    const r = await fetch(`http://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${key}`, { signal:T(5000) })
    const d = await r.json()
    if (d.Response==='False') throw new Error('Not found')
    return { tool:'movie', success:true, data:`🎬 ${d.Title} (${d.Year}):\nGenre: ${d.Genre}\nIMDb: ${d.imdbRating}/10\nDirector: ${d.Director}\nPlot: ${d.Plot}` }
  } catch { return { tool:'movie', success:false, data:'Movie info unavailable' } }
}

async function getNews(q: string): Promise<ToolResult> {
  try {
    const gnKey = process.env.GNEWS_API_KEY
    const naKey = process.env.NEWSAPI_KEY
    const topic = q.replace(/news|khabar|latest|headlines|batao|aaj ki/gi,'').trim() || 'India'
    if (gnKey) {
      const r = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(topic)}&lang=en&max=4&token=${gnKey}`, { signal:T(5000) })
      if (r.ok) {
        const d = await r.json()
        const arts = d.articles?.slice(0,4).map((a:any) => `• ${a.title}`).join('\n')
        return { tool:'news', success:true, data:`📰 News:\n${arts}` }
      }
    }
    if (naKey) {
      const r = await fetch(`https://newsapi.org/v2/top-headlines?country=in&pageSize=4&apiKey=${naKey}`, { signal:T(5000) })
      if (r.ok) {
        const d = await r.json()
        const arts = d.articles?.slice(0,4).map((a:any) => `• ${a.title}`).join('\n')
        return { tool:'news', success:true, data:`📰 News:\n${arts}` }
      }
    }
    // Fallback: HackerNews for tech news
    return getHackerNews()
  } catch { return { tool:'news', success:false, data:'News unavailable' } }
}

// ── MAIN ROUTER ────────────────────────────────────────────
// ── Translate — MyMemory API (FREE, no key) ──────────────
async function getTranslation(text: string): Promise<ToolResult> {
  const m = text.match(/(.+?)\s+(?:translate|anuvad|karo|mein kaho)\s*(?:to|in|mein)?\s*(hindi|english|urdu|french|spanish|german|japanese|arabic|chinese)?/i)
  const srcText = m?.[1] || text.replace(/translate|anuvad karo|hindi mein|english mein/gi,'').trim()
  const toLang = m?.[2]?.toLowerCase() || 'hi'
  const langMap: Record<string,string> = { hindi:'hi', english:'en', urdu:'ur', french:'fr', spanish:'es', german:'de', japanese:'ja', arabic:'ar', chinese:'zh' }
  const target = langMap[toLang] || toLang
  const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(srcText)}&langpair=auto|${target}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('translate_fail')
  const data = await res.json()
  const translated = data.responseData?.translatedText || 'Translation failed'
  return { tool: 'translate', data: `🌐 Translation:\n"${srcText}" → "${translated}"`, success: true }
}


// ── Image Generation v2: Pollinations with referral (priority access) ──
async function generateImageV2(text: string): Promise<ToolResult> {
  const clean = text.replace(/\b(image|photo|picture|banao|generate|create|draw|dikhao|tasveer)\b/gi,'').trim() || text
  const prompt = encodeURIComponent(clean)
  const referrer = 'apple-lemon-zeta.vercel.app'
  
  // Primary: Pollinations FLUX with referral header (gets priority)
  const models = ['flux','flux-schnell','flux-pro','turbo']
  const model = clean.length > 100 ? 'flux-pro' : 'flux-schnell'
  const imgUrl = 'https://image.pollinations.ai/prompt/'+prompt+'?width=768&height=768&model='+model+'&enhance=true&nologo=true&referrer='+referrer+'&seed='+Math.floor(Math.random()*9999)
  
  // Alternative: Pollinations pollinations-large
  const altUrl = 'https://image.pollinations.ai/prompt/'+prompt+'?width=512&height=512&model=flux&nologo=true&referrer='+referrer
  
  return {
    tool:'image',
    data:'🎨 Image generated!\n\nPrompt: '+clean,
    // imgUrl: "" stored in data below
    success:true
  }
}


// ── Video Search: YouTube embed (no expiry, free) ───────────────────
async function searchVideo(text: string): Promise<ToolResult> {
  const query = text.replace(/\b(video|dekho|dikhao|search video|find video|play)\b/gi,'').trim()
  // Use YouTube's oEmbed to get video info, then embed
  const searchUrl = 'https://www.youtube.com/results?search_query='+encodeURIComponent(query)
  
  // Use Invidious (open-source YouTube frontend) for search results  
  try {
    const res = await fetch('https://inv.nadeko.net/api/v1/search?q='+encodeURIComponent(query)+'&type=video&fields=videoId,title,author,lengthSeconds', {signal:AbortSignal.timeout(8000)})
    if(res.ok){
      const videos = await res.json()
      if(videos?.[0]){
        const v = videos[0]
        const embedUrl = 'https://www.youtube.com/embed/'+v.videoId+'?autoplay=0&rel=0'
        const watchUrl = 'https://youtu.be/'+v.videoId
        return {
          tool:'video',
          data:'🎬 Video found: '+v.title+'\nChannel: '+(v.author||'')+'\n\nWatch: '+watchUrl,
          
          success:true
        }
      }
    }
  } catch {}
  
  // Fallback: direct YouTube search link
  return {tool:'video', data:'🎬 Search on YouTube:\nhttps://www.youtube.com/results?search_query='+encodeURIComponent(query), success:true}
}


// ── Text to Visual: Enhanced prompt → Pollinations image ────────────
async function textToVisual(text: string): Promise<ToolResult> {
  // Strip command words
  const clean = text.replace(/\b(text to visual|text2image|visualize|imagine|picture banao|scene banao|scenery)\b/gi,'').trim()
  // Add quality keywords for better image
  const enhanced = clean+', highly detailed, cinematic, 4k, vibrant colors, realistic'
  const prompt = encodeURIComponent(enhanced)
  const imgUrl = 'https://image.pollinations.ai/prompt/'+prompt+'?width=896&height=512&model=flux-pro&enhance=true&nologo=true&referrer=apple-lemon-zeta.vercel.app&seed='+Math.floor(Math.random()*9999)
  return {
    tool:'text_to_visual',
    data:'🖼️ Visual created from text!\nPrompt: '+clean,
    
    success:true
  }
}

export async function routeTools(message: string): Promise<ToolResult[]> {
  const intents = detectIntent(message)
  if (intents.length === 0) return []

  const toolMap: Record<string, () => Promise<ToolResult>> = {
    weather:    () => getWeather(message),
    github:     () => getGitHub(message),
    vercel:     () => getVercel(message),
    crypto:     () => getCrypto(message),
    wikipedia:  () => getWikipedia(message),
    joke:       () => getJoke(),
    chuck:      () => getChuckNorris(),
    quote:      () => getQuote(),
    advice:     () => getAdvice(),
    bored:      () => getBored(),
    time:       () => getTime(),
    ip:         () => getIPInfo(),
    nasa:       () => getNASA(),
    iss:        () => getISS(),
    country:    () => getCountry(message),
    earthquake: () => getEarthquake(),
    trivia:     () => getTrivia(),
    numberfact: () => getNumberFact(message),
    cat:        () => getCatFact(),
    dog:        () => getDogFact(),
    book:       () => getBook(message),
    hackernews: () => getHackerNews(),
    sun:        () => getSunriseSunset(),
    dictionary: () => getDictionary(message),
    recipe:     () => getRecipe(message),
    movie:      () => getMovie(message),
    news:       () => getNews(message),
    reddit:     () => getHackerNews(), // fallback
    sports:     () => getNews('sports cricket ipl score'),
    currency:   () => getCurrency(message),
    airquality: () => getAirQuality(message),
    qr:         () => getQRCode(message),
    cocktail:   () => getCocktail(message),
    pokemon:    () => getPokemon(message),
    spacenews:  () => getSpaceNews(),
    agify:      () => getAgify(message),
    color:      () => getColorInfo(message),
    fact:       () => getRandomFact(),
    meme:       () => getMeme(),
    forecast:   () => getForecast(message),
    holiday:    () => getPublicHoliday(),
    youtube:    () => getYouTubeTrending(),
    shorturl:   () => getShortURL(message),
    mathfact:   () => getMathFact(message),
    datefact:   () => getDateFact(message),
    gutenberg:  () => getGutenbergBook(message),
    food:       () => getOpenFoodFacts(message),
    mars:       () => getMarsWeather(),
    jokehindi:  () => getJokeHindi(),
    stock:      () => getStockQuote(message),
    cricket:    () => getCricketScore(),
    ghtrending: () => getGitHubTrending(),
    aiimage:    () => getAIImageURL(message),
    wordofday:  () => getWordOfDay(),
    sciencenews:() => getScienceNews(),
    ipinfo:     () => getIPv6Info(),
    password:   () => getPasswordStrength(message),
    hash:       () => getHashGenerator(message),
    base64:     () => getBase64(message),
    uuid:       () => getUUID(),
    timezone:   () => getTimezoneConverter(message),
    agecalc:    () => getAgeCalculator(message),
    bmi:        () => getBMICalculator(message),
    emi:        () => getLoanEMI(message),
    sip:        () => getSIPCalculator(message),
    anime:      () => getAnimeInfo(message),
    motivation: () => getMotivationalQuote(),
    geoip:      () => getIPGeolocation(message),
    serper:            () => getSerperSearch(message),
    jina:              () => getJinaReader(message),
    youtube_transcript:() => getYouTubeTranscript(message),
    translate:  () => getTranslation(message),
  }

  const toRun = intents.slice(0, 2).filter(i => toolMap[i])
  const settled = await Promise.allSettled(toRun.map(i => toolMap[i]()))
  return settled
    .filter(r => r.status === 'fulfilled' && r.value.success)
    .map(r => (r as PromiseFulfilledResult<ToolResult>).value)
}

// ══════════════════════════════════════════════
// NEW SERVICES — v10.5 — All FREE, no key needed
// ══════════════════════════════════════════════

async function getCurrency(q: string): Promise<ToolResult> {
  try {
    // exchangerate-api open endpoint — free, no key
    const from = q.match(/\b(usd|inr|eur|gbp|jpy|cad|aud|cny|pkr|aed|sgd)\b/gi)?.[0]?.toUpperCase() || 'USD'
    const r = await fetch(`https://open.er-api.com/v6/latest/${from}`, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    const rates = ['INR','USD','EUR','GBP','JPY','AED','SGD'].map((c:string) => `${c}: ${d.rates?.[c]?.toFixed(2)}`).join(' | ')
    return { tool:'currency', success:true, data:`💱 Exchange Rates (base: ${from}):\n${rates}\nUpdated: ${d.time_last_update_utc?.slice(0,16)}` }
  } catch { return { tool:'currency', success:false, data:'Currency rates unavailable' } }
}

async function getAirQuality(q: string): Promise<ToolResult> {
  try {
    const city = q.match(/(?:air|quality|aqi|pollution)\s+(?:in|of|at)?\s*([a-zA-Z\s]+?)(?:\?|$)/i)?.[1]?.trim() || 'delhi'
    const r = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.6&longitude=77.2&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone`, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    const aqi = d.current?.us_aqi
    const level = aqi < 50 ? 'Good 🟢' : aqi < 100 ? 'Moderate 🟡' : aqi < 150 ? 'Unhealthy for Sensitive 🟠' : 'Unhealthy 🔴'
    return { tool:'airquality', success:true, data:`🌫️ Air Quality:\nAQI: ${aqi} — ${level}\nPM2.5: ${d.current?.pm2_5} μg/m³ | PM10: ${d.current?.pm10} μg/m³\nNO₂: ${d.current?.nitrogen_dioxide} μg/m³` }
  } catch { return { tool:'airquality', success:false, data:'Air quality data unavailable' } }
}

async function getQRCode(q: string): Promise<ToolResult> {
  try {
    const text = q.replace(/qr|code|banana|generate|banao|for|ka/gi,'').trim()
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`
    return { tool:'qr', success:true, data:`📱 QR Code generated!\nText: "${text}"\nImage URL: ${url}` }
  } catch { return { tool:'qr', success:false, data:'QR generation failed' } }
}

async function getCocktail(q: string): Promise<ToolResult> {
  try {
    const drink = q.replace(/cocktail|drink|recipe|mocktail|banana|kaise/gi,'').trim()
    const r = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(drink)}`, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    const c = d.drinks?.[0]
    if (!c) return { tool:'cocktail', success:false, data:'Drink not found' }
    return { tool:'cocktail', success:true, data:`🍹 ${c.strDrink} (${c.strCategory}):\nGlass: ${c.strGlass}\nAlcoholic: ${c.strAlcoholic}\nInstructions: ${c.strInstructions?.slice(0,300)}...` }
  } catch { return { tool:'cocktail', success:false, data:'Cocktail data unavailable' } }
}

async function getPokemon(q: string): Promise<ToolResult> {
  try {
    const name = q.replace(/pokemon|stats|kaun|hai|about/gi,'').trim().toLowerCase().split(' ')[0]
    const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) throw new Error('Not found')
    const d = await r.json()
    const types = d.types?.map((t:any) => t.type?.name).join(', ')
    const stats = d.stats?.map((s:any) => `${s.stat?.name}: ${s.base_stat}`).join(' | ')
    return { tool:'pokemon', success:true, data:`⚡ ${d.name?.toUpperCase()} (#${d.id})\nType: ${types}\nHeight: ${d.height/10}m | Weight: ${d.weight/10}kg\nStats: ${stats}` }
  } catch { return { tool:'pokemon', success:false, data:'Pokemon not found' } }
}

async function getSpaceNews(): Promise<ToolResult> {
  try {
    const r = await fetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=4', { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    const news = d.results?.slice(0,4).map((a:any) => `• ${a.title}`).join('\n')
    return { tool:'spacenews', success:true, data:`🚀 Space News:\n${news}` }
  } catch { return { tool:'spacenews', success:false, data:'Space news unavailable' } }
}

async function getAgify(q: string): Promise<ToolResult> {
  try {
    const name = q.replace(/age|umar|kitni|naam|name|of|ka/gi,'').trim().split(' ')[0]
    const r = await fetch(`https://api.agify.io/?name=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(4000) })
    const d = await r.json()
    return { tool:'agify', success:true, data:`🎂 "${d.name}" naam ke logon ki average age: ${d.age} saal\n(${d.count?.toLocaleString()} log ke data pe based)` }
  } catch { return { tool:'agify', success:false, data:'Age prediction unavailable' } }
}

async function getColorInfo(q: string): Promise<ToolResult> {
  try {
    const hex = q.match(/#?([0-9a-fA-F]{6})/)?.[1] || 'ff6b35'
    const r = await fetch(`https://www.thecolorapi.com/id?hex=${hex}&format=json`, { signal: AbortSignal.timeout(4000) })
    const d = await r.json()
    return { tool:'color', success:true, data:`🎨 Color #${hex}:\nName: ${d.name?.value}\nRGB: ${d.rgb?.value}\nHSL: ${d.hsl?.value}` }
  } catch { return { tool:'color', success:false, data:'Color info unavailable' } }
}

async function getRandomFact(): Promise<ToolResult> {
  try {
    const r = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random', { signal: AbortSignal.timeout(4000) })
    const d = await r.json()
    return { tool:'fact', success:true, data:`🤯 Random Fact:\n${d.text}` }
  } catch { return { tool:'fact', success:false, data:'Fact unavailable' } }
}

async function getMeme(): Promise<ToolResult> {
  try {
    const r = await fetch('https://meme-api.com/gimme', { signal: AbortSignal.timeout(4000) })
    const d = await r.json()
    return { tool:'meme', success:true, data:`😂 Meme: ${d.title}\nSubreddit: r/${d.subreddit}\nImage: ${d.url}` }
  } catch { return { tool:'meme', success:false, data:'Meme unavailable' } }
}

async function getForecast(q: string): Promise<ToolResult> {
  try {
    const city = q.match(/(?:forecast|kal|parson|agle|next)\s+(?:in|at|of)?\s*([a-zA-Z\s]+?)(?:\?|$)/i)?.[1]?.trim() || 'Rewa'
    const r = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    const days = d.weather?.slice(0,3).map((w:any,i:number) => {
      const label = i===0?'Aaj':i===1?'Kal':'Parson'
      return `${label}: ${w.mintempC}°-${w.maxtempC}°C, ${w.hourly?.[4]?.weatherDesc?.[0]?.value}`
    }).join('\n')
    return { tool:'forecast', success:true, data:`📅 3-Day Forecast (${city}):\n${days}` }
  } catch { return { tool:'forecast', success:false, data:'Forecast unavailable' } }
}

async function getPublicHoliday(): Promise<ToolResult> {
  try {
    const year = new Date().getFullYear()
    const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    const upcoming = d.filter((h:any) => new Date(h.date) >= new Date()).slice(0,5)
    const list = upcoming.map((h:any) => `• ${h.date} — ${h.localName || h.name}`).join('\n')
    return { tool:'holiday', success:true, data:`🎉 Upcoming Indian Holidays:\n${list}` }
  } catch { return { tool:'holiday', success:false, data:'Holiday data unavailable' } }
}

async function getYouTubeTrending(): Promise<ToolResult> {
  try {
    // YouTube RSS feed — no key needed
    const r = await fetch('https://www.youtube.com/feeds/videos.xml?chart=trending&hl=en&regionCode=IN', { signal: AbortSignal.timeout(5000) })
    const text = await r.text()
    const titles = [...text.matchAll(/<title>(.+?)<\/title>/g)].slice(1,5).map(m => `• ${m[1]}`).join('\n')
    return { tool:'youtube', success:true, data:`▶️ YouTube Trending India:\n${titles}` }
  } catch { return { tool:'youtube', success:false, data:'YouTube trending unavailable' } }
}

async function getShortURL(q: string): Promise<ToolResult> {
  try {
    const url = q.match(/https?:\/\/[^\s]+/)?.[0]
    if (!url) return { tool:'shorturl', success:false, data:'URL nahi mili' }
    const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) })
    const short = await r.text()
    return { tool:'shorturl', success:true, data:`🔗 Short URL:\n${short}` }
  } catch { return { tool:'shorturl', success:false, data:'URL shortening failed' } }
}

async function getMathFact(q: string): Promise<ToolResult> {
  try {
    const num = q.match(/\d+/)?.[0] || Math.floor(Math.random()*100).toString()
    const r = await fetch(`http://numbersapi.com/${num}/math`, { signal: AbortSignal.timeout(4000) })
    const text = await r.text()
    return { tool:'mathfact', success:true, data:`🧮 Math Fact:\n${text}` }
  } catch { return { tool:'mathfact', success:false, data:'Math fact unavailable' } }
}

async function getDateFact(q: string): Promise<ToolResult> {
  try {
    const today = new Date()
    const r = await fetch(`http://numbersapi.com/${today.getMonth()+1}/${today.getDate()}/date`, { signal: AbortSignal.timeout(4000) })
    const text = await r.text()
    return { tool:'datefact', success:true, data:`📅 Aaj ke din ki baat:\n${text}` }
  } catch { return { tool:'datefact', success:false, data:'Date fact unavailable' } }
}

async function getGutenbergBook(q: string): Promise<ToolResult> {
  try {
    const query = q.replace(/gutenberg|classic|free book|download/gi,'').trim()
    const r = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}&mime_type=text`, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    const books = d.results?.slice(0,3).map((b:any) => `• "${b.title}" — ${b.authors?.[0]?.name || 'Unknown'}\n  📖 ${b.formats?.['text/html'] || b.formats?.['text/plain; charset=utf-8'] || 'Available on Gutenberg'}`).join('\n')
    return { tool:'gutenberg', success:true, data:`📚 Free Classic Books:\n${books}` }
  } catch { return { tool:'gutenberg', success:false, data:'Gutenberg unavailable' } }
}

async function getOpenFoodFacts(q: string): Promise<ToolResult> {
  try {
    const product = q.replace(/nutrition|food info|calories|ingredients|khane mein|product/gi,'').trim()
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(product)}&json=1&page_size=1`, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    const p = d.products?.[0]
    if (!p) return { tool:'food', success:false, data:'Product not found' }
    const n = p.nutriments
    return { tool:'food', success:true, data:`🍎 ${p.product_name || product}:\nCalories: ${n?.['energy-kcal_100g'] || '?'} kcal/100g\nProtein: ${n?.proteins_100g || '?'}g | Carbs: ${n?.carbohydrates_100g || '?'}g | Fat: ${n?.fat_100g || '?'}g\nBrand: ${p.brands || '?'}` }
  } catch { return { tool:'food', success:false, data:'Food info unavailable' } }
}

async function getMarsWeather(): Promise<ToolResult> {
  try {
    const key = process.env.NASA_API_KEY || 'DEMO_KEY'
    const r = await fetch(`https://api.nasa.gov/insight_weather/?api_key=${key}&feedtype=json&ver=1.0`, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    const sol = d.sol_keys?.[0]
    if (!sol) throw new Error('No data')
    const w = d[sol]
    return { tool:'mars', success:true, data:`🔴 Mars Weather (Sol ${sol}):\nTemp: Min ${w.AT?.mn?.toFixed(1)}°C, Max ${w.AT?.mx?.toFixed(1)}°C\nWind: ${w.HWS?.av?.toFixed(1)} m/s\nSeason: ${w.Season}` }
  } catch { return { tool:'mars', success:false, data:'Mars weather unavailable' } }
}

async function getJokeHindi(): Promise<ToolResult> {
  try {
    // Fallback: JokeAPI in English if Hindi not available
    const r = await fetch('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist&type=twopart', { signal: AbortSignal.timeout(4000) })
    const d = await r.json()
    return { tool:'jokehindi', success:true, data:`😂 Joke:\n${d.setup}\n\n🥁 ${d.delivery}` }
  } catch { return { tool:'jokehindi', success:false, data:'Joke unavailable' } }
}

// ══════════════════════════════════════════════
// BATCH 3 — v10.6 — 20 more services
// ══════════════════════════════════════════════

async function getStockQuote(q: string): Promise<ToolResult> {
  try {
    const sym = q.match(/\b([A-Z]{1,5})\b/)?.[1] || q.replace(/stock|share|price|ka|kya|hai/gi,'').trim().toUpperCase().split(' ')[0] || 'RELIANCE'
    // Yahoo Finance unofficial — no key needed
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}.NS?interval=1d&range=1d`, { signal: AbortSignal.timeout(6000) })
    const d = await r.json()
    const meta = d.chart?.result?.[0]?.meta
    if (!meta) throw new Error('Not found')
    return { tool:'stock', success:true, data:`📈 ${meta.symbol} (${meta.shortName || sym})\nPrice: ₹${meta.regularMarketPrice?.toFixed(2)}\nChange: ${(meta.regularMarketPrice - meta.previousClose).toFixed(2)} (${((meta.regularMarketPrice - meta.previousClose)/meta.previousClose*100).toFixed(2)}%)\nHigh: ₹${meta.regularMarketDayHigh?.toFixed(2)} | Low: ₹${meta.regularMarketDayLow?.toFixed(2)}` }
  } catch { return { tool:'stock', success:false, data:'Stock data unavailable — NSE/BSE ke liye .NS suffix use hota hai' } }
}

async function getCricketScore(): Promise<ToolResult> {
  try {
    // cricbuzz unofficial RSS
    const r = await fetch('https://rss.espncricinfo.com/rss/content/story/series.xml', { signal: AbortSignal.timeout(5000) })
    const text = await r.text()
    const items = [...text.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)].slice(0,4).map(m => `• ${m[1]}`).join('\n')
    return { tool:'cricket', success:true, data:`🏏 Cricket Latest:\n${items || 'No live matches'}` }
  } catch { return { tool:'cricket', success:false, data:'Cricket scores unavailable' } }
}

async function getGitHubTrending(): Promise<ToolResult> {
  try {
    const r = await fetch('https://gh-trending-api.deno.dev/repositories?language=&since=daily&spoken_language=', { signal: AbortSignal.timeout(6000) })
    const d = await r.json()
    const repos = d.slice(0,5).map((r:any) => `• ${r.author}/${r.name} ⭐${r.stars} — ${r.description?.slice(0,60)}`).join('\n')
    return { tool:'ghtrending', success:true, data:`🔥 GitHub Trending Today:\n${repos}` }
  } catch { return { tool:'ghtrending', success:false, data:'GitHub trending unavailable' } }
}

async function getAIImageURL(q: string): Promise<ToolResult> {
  try {
    // Clean prompt — remove command words, keep subject
    const prompt = q
      .replace(/\b(image|photo|picture|generate|create|banao|dikhao|draw|bana|ek|mujhe|karo|please|zara|jaldi|realistic|ai|jarvis)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim() || q.trim()

    // Multiple Pollinations endpoints for reliability
    const seed = Math.floor(Math.random() * 99999)
    const enhanced = prompt + ', high quality, detailed, 4k'
    const imgUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(enhanced) + '?width=512&height=512&nologo=true&seed=' + seed

    return {
      tool: 'image',
      success: true,
      data: {
        image_url: imgUrl,
        prompt: prompt,
        model: 'Pollinations AI',
        caption: '🎨 ' + prompt,
      }
    }
  } catch { return { tool:'image', success:false, data:'Image generation failed' } }
}

async function getWordOfDay(): Promise<ToolResult> {
  try {
    const r = await fetch('https://wordsapiv1.p.rapidapi.com/words/?random=true&hasDetails=definitions', { signal: AbortSignal.timeout(4000) })
    // Fallback: random word from wordnik-style
    const words = ['ephemeral','serendipity','mellifluous','petrichor','sonder','hiraeth','vellichor','chrysalism','kenopsia']
    const word = words[Math.floor(Math.random()*words.length)]
    const dictR = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, { signal: AbortSignal.timeout(4000) })
    const d = await dictR.json()
    const def = d[0]?.meanings?.[0]?.definitions?.[0]?.definition
    return { tool:'wordofday', success:true, data:`📝 Word of the Day: "${word}"\n\nMeaning: ${def || 'A beautiful word worth knowing'}` }
  } catch { return { tool:'wordofday', success:false, data:'Word unavailable' } }
}

async function getScienceNews(): Promise<ToolResult> {
  try {
    const r = await fetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=5&news_site=NASA', { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    const list = d.results?.slice(0,4).map((a:any) => `• ${a.title}`).join('\n')
    return { tool:'sciencenews', success:true, data:`🔬 Science & NASA News:\n${list}` }
  } catch { return { tool:'sciencenews', success:false, data:'Science news unavailable' } }
}

async function getIPv6Info(): Promise<ToolResult> {
  try {
    const r = await fetch('https://ip-api.com/json/?fields=status,message,country,regionName,city,isp,org,query', { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    return { tool:'ipinfo', success:true, data:`🌐 Network Info:\nIP: ${d.query}\nCity: ${d.city}, ${d.regionName}, ${d.country}\nISP: ${d.isp}\nOrg: ${d.org}` }
  } catch { return { tool:'ipinfo', success:false, data:'Network info unavailable' } }
}

async function getPasswordStrength(q: string): Promise<ToolResult> {
  try {
    const pass = q.replace(/password|check|strength|strong|weak|test|kitna/gi,'').trim()
    if (!pass || pass.length < 2) return { tool:'password', success:false, data:'Password text nahi mila' }
    const score = [pass.length >= 12, /[A-Z]/.test(pass), /[a-z]/.test(pass), /[0-9]/.test(pass), /[^A-Za-z0-9]/.test(pass)].filter(Boolean).length
    const label = score <= 2 ? '🔴 Weak' : score === 3 ? '🟡 Fair' : score === 4 ? '🟢 Strong' : '💎 Very Strong'
    const tips = []
    if (pass.length < 12) tips.push('12+ characters use karo')
    if (!/[A-Z]/.test(pass)) tips.push('Uppercase letter add karo')
    if (!/[0-9]/.test(pass)) tips.push('Number add karo')
    if (!/[^A-Za-z0-9]/.test(pass)) tips.push('Special char (!@#) add karo')
    return { tool:'password', success:true, data:`🔒 Password: "${pass.slice(0,3)}***"\nStrength: ${label} (${score}/5)\n${tips.length ? 'Tips: ' + tips.join(', ') : '✅ Bahut achha password hai!'}` }
  } catch { return { tool:'password', success:false, data:'Strength check failed' } }
}

async function getHashGenerator(q: string): Promise<ToolResult> {
  try {
    const text = q.replace(/hash|generate|md5|sha|sha256|encode|of|ka/gi,'').trim()
    // Use crypto.subtle (available in edge runtime)
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2,'0')).join('')
    return { tool:'hash', success:true, data:`🔐 SHA-256 Hash:\nInput: "${text}"\nHash: ${hash}` }
  } catch { return { tool:'hash', success:false, data:'Hash generation failed' } }
}

async function getBase64(q: string): Promise<ToolResult> {
  try {
    const isDecoding = /decode|convert from|se wapas|decrypt/i.test(q)
    const text = q.replace(/base64|encode|decode|convert|ka|karo|karna/gi,'').trim()
    const result = isDecoding ? atob(text) : btoa(unescape(encodeURIComponent(text)))
    return { tool:'base64', success:true, data:`🔤 Base64 ${isDecoding?'Decoded':'Encoded'}:\nInput: "${text.slice(0,50)}"\nResult: ${result}` }
  } catch { return { tool:'base64', success:false, data:'Base64 convert failed' } }
}

async function getUUID(): Promise<ToolResult> {
  try {
    const uuid = crypto.randomUUID()
    return { tool:'uuid', success:true, data:`🆔 Random UUID:\n${uuid}\n\n(Copy karo — ek baar hi show hoga)` }
  } catch { return { tool:'uuid', success:false, data:'UUID generation failed' } }
}

async function getTimezoneConverter(q: string): Promise<ToolResult> {
  try {
    const zones = ['Asia/Kolkata','America/New_York','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo','Asia/Dubai','Australia/Sydney','America/Chicago']
    const now = new Date()
    const list = zones.map(tz => {
      const t = now.toLocaleTimeString('en-IN', { timeZone: tz, hour:'2-digit', minute:'2-digit', hour12:true })
      const label = tz.split('/')[1].replace('_',' ')
      return `${t} — ${label}`
    }).join('\n')
    return { tool:'timezone', success:true, data:`🌍 World Clocks:\n${list}` }
  } catch { return { tool:'timezone', success:false, data:'Timezone data unavailable' } }
}

async function getAgeCalculator(q: string): Promise<ToolResult> {
  try {
    const match = q.match(/(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})/)
    if (!match) return { tool:'agecalc', success:false, data:'Date format: DD/MM/YYYY likhein' }
    const dob = new Date(parseInt(match[3]), parseInt(match[2])-1, parseInt(match[1]))
    const now = new Date()
    const years = Math.floor((now.getTime() - dob.getTime()) / (365.25*24*60*60*1000))
    const months = Math.floor(((now.getTime() - dob.getTime()) % (365.25*24*60*60*1000)) / (30.44*24*60*60*1000))
    const days = Math.floor(((now.getTime() - dob.getTime()) % (30.44*24*60*60*1000)) / (24*60*60*1000))
    return { tool:'agecalc', success:true, data:`🎂 Age Calculator:\nDOB: ${match[1]}/${match[2]}/${match[3]}\nAge: ${years} saal, ${months} mahine, ${days} din\nTotal days: ${Math.floor((now.getTime()-dob.getTime())/(24*60*60*1000)).toLocaleString()}` }
  } catch { return { tool:'agecalc', success:false, data:'Age calculation failed' } }
}

async function getBMICalculator(q: string): Promise<ToolResult> {
  try {
    const height = parseFloat(q.match(/(\d+\.?\d*)\s*(?:cm|centimeter)/i)?.[1] || '0')
    const weight = parseFloat(q.match(/(\d+\.?\d*)\s*(?:kg|kilo)/i)?.[1] || '0')
    if (!height || !weight) return { tool:'bmi', success:false, data:'Format: "height 170cm weight 65kg ka BMI" likhein' }
    const h = height/100
    const bmi = weight / (h*h)
    const cat = bmi < 18.5 ? '🟡 Underweight' : bmi < 25 ? '🟢 Normal' : bmi < 30 ? '🟠 Overweight' : '🔴 Obese'
    return { tool:'bmi', success:true, data:`⚖️ BMI Calculator:\nHeight: ${height}cm | Weight: ${weight}kg\nBMI: ${bmi.toFixed(1)}\nCategory: ${cat}` }
  } catch { return { tool:'bmi', success:false, data:'BMI calculation failed' } }
}

async function getLoanEMI(q: string): Promise<ToolResult> {
  try {
    const amount = parseFloat(q.match(/(?:loan|amount|principal)?\s*(?:₹|rs\.?|rupee)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac)?/i)?.[1]?.replace(/,/g,'') || '0')
    const rate = parseFloat(q.match(/(\d+\.?\d*)\s*%/i)?.[1] || '8.5')
    const years = parseFloat(q.match(/(\d+)\s*(?:year|saal|yr)/i)?.[1] || '20')
    if (!amount) return { tool:'emi', success:false, data:'Format: "5 lakh loan 8.5% 20 saal ka EMI" likhein' }
    const P = amount * (q.toLowerCase().includes('lakh') ? 100000 : 1)
    const r = rate / (12*100)
    const n = years * 12
    const emi = P * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1)
    return { tool:'emi', success:true, data:`💰 EMI Calculator:\nLoan: ₹${P.toLocaleString('en-IN')}\nRate: ${rate}% p.a. | Tenure: ${years} years\nMonthly EMI: ₹${Math.round(emi).toLocaleString('en-IN')}\nTotal Payment: ₹${Math.round(emi*n).toLocaleString('en-IN')}\nTotal Interest: ₹${Math.round(emi*n - P).toLocaleString('en-IN')}` }
  } catch { return { tool:'emi', success:false, data:'EMI calculation failed' } }
}

async function getSIPCalculator(q: string): Promise<ToolResult> {
  try {
    const monthly = parseFloat(q.match(/(?:sip|monthly|per month|har mahine)?\s*(?:₹|rs\.?)?\s*(\d+(?:,\d+)*)/i)?.[1]?.replace(/,/g,'') || '0')
    const rate = parseFloat(q.match(/(\d+\.?\d*)\s*%/i)?.[1] || '12')
    const years = parseFloat(q.match(/(\d+)\s*(?:year|saal|yr)/i)?.[1] || '10')
    if (!monthly) return { tool:'sip', success:false, data:'Format: "5000 monthly SIP 12% 10 saal" likhein' }
    const r = rate / (12*100)
    const n = years * 12
    const maturity = monthly * (Math.pow(1+r,n)-1) * (1+r) / r
    const invested = monthly * n
    return { tool:'sip', success:true, data:`📊 SIP Calculator:\nMonthly: ₹${monthly.toLocaleString('en-IN')}\nRate: ${rate}% p.a. | Duration: ${years} years\nTotal Invested: ₹${invested.toLocaleString('en-IN')}\nMaturity Value: ₹${Math.round(maturity).toLocaleString('en-IN')}\nTotal Return: ₹${Math.round(maturity-invested).toLocaleString('en-IN')} (${((maturity-invested)/invested*100).toFixed(1)}%)` }
  } catch { return { tool:'sip', success:false, data:'SIP calculation failed' } }
}

async function getAnimeInfo(q: string): Promise<ToolResult> {
  try {
    const name = q.replace(/anime|manga|search|find|ke baare|kya hai/gi,'').trim()
    const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(name)}&limit=1`, { signal: AbortSignal.timeout(6000) })
    const d = await r.json()
    const a = d.data?.[0]
    if (!a) return { tool:'anime', success:false, data:'Anime not found' }
    return { tool:'anime', success:true, data:`🎌 ${a.title} (${a.title_japanese || ''})\nType: ${a.type} | Episodes: ${a.episodes || '?'}\nRating: ⭐${a.score}/10 | Status: ${a.status}\nGenres: ${a.genres?.map((g:any)=>g.name).join(', ')}\nSynopsis: ${a.synopsis?.slice(0,200)}...` }
  } catch { return { tool:'anime', success:false, data:'Anime info unavailable' } }
}

async function getMotivationalQuote(): Promise<ToolResult> {
  try {
    const r = await fetch('https://zenquotes.io/api/random', { signal: AbortSignal.timeout(4000) })
    const d = await r.json()
    return { tool:'motivation', success:true, data:`✨ "${d[0]?.q}"\n— ${d[0]?.a}` }
  } catch { return { tool:'motivation', success:false, data:'Quote unavailable' } }
}

async function getIPGeolocation(q: string): Promise<ToolResult> {
  try {
    const ip = q.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/)?.[1]
    const url = ip ? `http://ip-api.com/json/${ip}` : 'http://ip-api.com/json/'
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    return { tool:'geoip', success:true, data:`📍 IP Geolocation:\nIP: ${d.query}\nLocation: ${d.city}, ${d.regionName}, ${d.country} (${d.countryCode})\nISP: ${d.isp}\nCoords: ${d.lat}, ${d.lon}\nTimezone: ${d.timezone}` }
  } catch { return { tool:'geoip', success:false, data:'IP location unavailable' } }
}

// ══════════════════════════════════════════════════════════════
// v10.17 — Serper Search + Jina URL Reader + YouTube Transcript
// ══════════════════════════════════════════════════════════════

async function getSerperSearch(q: string): Promise<ToolResult> {
  try {
    const key = process.env.SERPER_API_KEY || (typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_serper') : '')
    if (!key) {
      // Fallback: DuckDuckGo instant answer (no key)
      const query = q.replace(/search|find|look up|dhundo|batao/gi, '').trim()
      const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, { signal: AbortSignal.timeout(5000) })
      const d = await r.json()
      const ans = d.AbstractText || d.Answer || ''
      if (ans) return { tool:'serper', success:true, data:`🔍 ${query}:\n${ans.slice(0,400)}\nSource: ${d.AbstractURL||'DuckDuckGo'}` }
      return { tool:'serper', success:false, data:'Serper API key nahi hai. Settings → Apps → Serper mein add karo (2500 free/mo).' }
    }
    const query = q.replace(/search|find|look up|dhundo|batao/gi, '').trim()
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'in', hl: 'en', num: 5 }),
      signal: AbortSignal.timeout(8000)
    })
    const d = await r.json()
    const results = d.organic?.slice(0, 3).map((x: any) => `• ${x.title}\n  ${x.snippet}\n  ${x.link}`).join('\n\n') || ''
    const answer = d.answerBox?.answer || d.answerBox?.snippet || ''
    return { tool:'serper', success:true, data:`🔍 Search: "${query}"\n\n${answer ? `✅ ${answer}\n\n` : ''}${results}` }
  } catch(e: any) { return { tool:'serper', success:false, data:'Search unavailable: ' + e.message } }
}

async function getJinaReader(q: string): Promise<ToolResult> {
  try {
    // Extract URL from message
    const urlMatch = q.match(/https?:\/\/[^\s]+/)
    if (!urlMatch) return { tool:'jina', success:false, data:'URL nahi mili message mein' }
    const url = urlMatch[0]
    // Jina Reader is free, no key needed
    const r = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(15000)
    })
    const text = await r.text()
    return { tool:'jina', success:true, data:`📄 URL Content:\n${text.slice(0, 1500)}${text.length > 1500 ? '\n...[truncated]' : ''}` }
  } catch(e: any) { return { tool:'jina', success:false, data:'URL read failed: ' + e.message } }
}

async function getYouTubeTranscript(q: string): Promise<ToolResult> {
  try {
    // Extract YouTube video ID
    const ytMatch = q.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
    if (!ytMatch) return { tool:'youtube_transcript', success:false, data:'YouTube URL nahi mili. Format: https://youtube.com/watch?v=VIDEO_ID' }
    const videoId = ytMatch[1]
    // Use Jina to read YouTube transcript (works for many videos)
    const r = await fetch(`https://r.jina.ai/https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(20000)
    })
    const text = await r.text()
    return { tool:'youtube_transcript', success:true, data:`🎬 YouTube Video (${videoId}):\n${text.slice(0, 2000)}${text.length > 2000 ? '\n...[truncated]' : ''}` }
  } catch(e: any) { return { tool:'youtube_transcript', success:false, data:'Transcript unavailable: ' + e.message } }
}
