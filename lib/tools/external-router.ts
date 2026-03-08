// lib/tools/external-router.ts — JARVIS Smart Tool Router v2
// 30+ free services. Intent detection → sirf relevant API call.
// FREE FIRST, no wasted credits.

export interface ToolResult {
  tool: string
  data: string
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
    const coin = words.reduce((found,w) => found || coinMap[w], '') || 'bitcoin'
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,inr&include_24hr_change=true`, { signal:T(5000) })
    const d = await r.json()
    const c = d[coin]
    return { tool:'crypto', success:true, data:`💰 ${coin.charAt(0).toUpperCase()+coin.slice(1)}:\nUSD: $${c?.usd?.toLocaleString()}\nINR: ₹${c?.inr?.toLocaleString()}\n24h: ${c?.usd_24h_change?.toFixed(2)}%` }
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
    holiday:    () => getCountry(message),
    sports:     () => getNews('sports cricket ipl score'),
  }

  const toRun = intents.slice(0, 2).filter(i => toolMap[i])
  const settled = await Promise.allSettled(toRun.map(i => toolMap[i]()))
  return settled
    .filter(r => r.status === 'fulfilled' && r.value.success)
    .map(r => (r as PromiseFulfilledResult<ToolResult>).value)
}
