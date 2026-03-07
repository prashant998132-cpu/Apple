// lib/creative/executor.ts — Execute creative tool calls from Gemini
// Plugs into main app/api/jarvis/route.ts

export async function executeCreativeTool(name: string, args: Record<string, any>, baseUrl: string): Promise<any> {
  switch (name) {

    case 'text_to_speech': {
      try {
        const res = await fetch(`${baseUrl}/api/tts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: args.text, lang: args.lang || 'hi', speed: args.speed || 1, quality: args.quality || 'fast' })
        });
        const data = await res.json();
        return { ...data, _type: 'tts', text: args.text };
      } catch (e: any) {
        return { error: e.message, useBrowser: true, text: args.text, lang: args.lang || 'hi' };
      }
    }

    case 'generate_image': {
      try {
        const res = await fetch(`${baseUrl}/api/image`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: args.prompt, style: args.style || 'realistic' })
        });
        const data = await res.json();
        return { ...data, _type: 'image' };
      } catch (e: any) {
        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(args.prompt)}?nologo=true`;
        return { imageUrl: pollUrl, provider: 'Pollinations.ai', _type: 'image', prompt: args.prompt };
      }
    }

    case 'generate_music': {
      try {
        const res = await fetch(`${baseUrl}/api/music`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: args.prompt || '', style: args.style, duration: args.duration || 15 })
        });
        const data = await res.json();
        return { ...data, _type: 'music' };
      } catch (e: any) {
        const enc = encodeURIComponent(args.prompt || args.style || 'music');
        return {
          _type: 'music', isLink: true,
          links: [
            { name: '🎵 Suno AI', url: `https://suno.com/create?prompt=${enc}`, limit: '~50/day free' },
            { name: '🎵 Udio AI', url: `https://www.udio.com/create?prompt=${enc}`, limit: 'Free' },
          ]
        };
      }
    }

    case 'post_to_social': {
      if (args.platform === 'whatsapp') {
        const link = `https://wa.me/?text=${encodeURIComponent(args.content)}`;
        return { _type: 'whatsapp_link', link, content: args.content };
      }
      return {
        _type: 'social_post_pending',
        platform: args.platform,
        content: args.content,
        image_url: args.image_url,
        note: 'Settings → Social → Connect mein account connect karo, phir post karo.'
      };
    }

    case 'add_calendar_event': {
      // Need Google token from client — return structured data for client to handle
      const dateTime = args.date && args.time ? `${args.date}T${args.time}:00+05:30` : null;
      const endTime  = dateTime ? new Date(new Date(dateTime).getTime() + (args.duration || 60) * 60000).toISOString() : null;
      return {
        _type: 'calendar_event',
        event: { title: args.title, description: args.description, start: dateTime, end: endTime },
        note: 'Google Calendar connected hai? Settings → Social → Connect mein connect karo.'
      };
    }

    case 'get_calendar_events': {
      return {
        _type: 'calendar_request',
        action: 'list',
        days: args.days || 7,
        note: 'Google Calendar data browser se load hoga.'
      };
    }

    case 'get_video_links': {
      const enc = encodeURIComponent(args.prompt || '');
      return {
        _type: 'video_links',
        prompt: args.prompt,
        links: [
          { name: '🎬 Runway ML', url: 'https://runwayml.com/', limit: '125 credits free', recommended: true },
          { name: '🎬 Pika Labs', url: 'https://pika.art/', limit: 'Free tier' },
          { name: '🎬 Kling AI', url: 'https://klingai.com/', limit: 'Free credits' },
          { name: '🎬 Luma Dream Machine', url: 'https://lumalabs.ai/dream-machine', limit: 'Free tier' },
          { name: '✂️ CapCut AI', url: 'https://www.capcut.com/', limit: 'Free editing' },
        ]
      };
    }

    default:
      return { error: `Unknown creative tool: ${name}` };
  }
}

// Check if a tool name is creative
export function isCreativeTool(name: string): boolean {
  return ['text_to_speech','generate_image','generate_music','post_to_social',
    'add_calendar_event','get_calendar_events','get_video_links'].includes(name);
}

// Match creative tools from query
export function matchCreativeTools(query: string): string[] {
  const q = query.toLowerCase();
  const keywords: Record<string, string[]> = {
    text_to_speech:  ['bol', 'bolo', 'speak', 'tts', 'awaaz', 'आवाज़', 'पढ़कर बोलो', 'सुनाओ', 'voice', 'sun ', 'bolke'],
    generate_image:  ['image', 'photo', 'picture', 'तस्वीर', 'draw', 'generate image', 'create image', 'illustration', 'poster'],
    generate_music:  ['music', 'song', 'gaana', 'गाना', 'beat ', 'संगीत', 'bhajan', 'suno', 'udio', 'melody', 'guitar', 'piano'],
    post_to_social:  ['instagram', 'post karo', 'tweet', 'facebook post', 'share on', 'social media'],
    add_calendar_event: ['calendar mein', 'event add', 'schedule karo', 'yaad dila', 'reminder set', 'google calendar'],
    get_calendar_events: ['calendar dekho', 'upcoming events', 'aaj schedule', 'kya hai aaj', 'next exam'],
    get_video_links: ['video banao', 'video generate', 'animation', 'reel banao', 'runway', 'pika labs'],
  };
  return Object.entries(keywords)
    .filter(([, kws]) => kws.some(kw => q.includes(kw)))
    .map(([tool]) => tool);
}
