// config/creative-tools.ts — Creative Function Calling Tools
// Add these to JARVIS Gemini's tool list

export const CREATIVE_TOOLS = [
  {
    name: 'text_to_speech',
    description: 'Convert text to realistic speech audio. Supports Hindi and English. ElevenLabs/Google Cloud/Azure quality voices. User can hear the response.',
    parameters: {
      type: 'object',
      properties: {
        text:    { type: 'string', description: 'Text to convert to speech (max 500 chars for fast)' },
        lang:    { type: 'string', enum: ['hi', 'en', 'mixed'], description: 'Language: hi for Hindi, en for English' },
        speed:   { type: 'number', description: 'Speaking speed 0.5-2.0, default 1.0' },
        quality: { type: 'string', enum: ['fast', 'high'], description: 'fast=Standard voice, high=WaveNet/Neural voice' },
      },
      required: ['text']
    }
  },
  {
    name: 'generate_image',
    description: 'Generate an AI image from text description. Uses Gemini Imagen/FLUX/Pollinations. Good for creating illustrations, portraits, scenes.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Image description in English (auto-translated if Hindi)' },
        style:  { type: 'string', enum: ['realistic','anime','artistic','cinematic','3d','bollywood','nature','minimal'], description: 'Image style' },
      },
      required: ['prompt']
    }
  },
  {
    name: 'generate_music',
    description: 'Generate instrumental music or get links to song creation sites like Suno/Udio. Good for study music, Bollywood beats, devotional music.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Music description or mood' },
        style:  { type: 'string', enum: ['bollywood_sad','bollywood_happy','devotional','lofi_study','classical','folk_mp','neet_focus','party'], description: 'Music style preset' },
        duration: { type: 'number', description: 'Duration in seconds (10-30)' },
      },
      required: ['style']
    }
  },
  {
    name: 'post_to_social',
    description: 'Post content to Instagram, Facebook, or Twitter. Requires user to be connected in Settings.',
    parameters: {
      type: 'object',
      properties: {
        content:   { type: 'string', description: 'Post caption or tweet text' },
        platform:  { type: 'string', enum: ['instagram','facebook','twitter','whatsapp'], description: 'Social platform' },
        image_url: { type: 'string', description: 'Public image URL (required for Instagram)' },
      },
      required: ['content', 'platform']
    }
  },
  {
    name: 'add_calendar_event',
    description: 'Add an event to Google Calendar. Requires Google to be connected. Good for NEET exam dates, study sessions, important deadlines.',
    parameters: {
      type: 'object',
      properties: {
        title:    { type: 'string', description: 'Event title' },
        date:     { type: 'string', description: 'Date in YYYY-MM-DD format' },
        time:     { type: 'string', description: 'Time in HH:MM format (24hr, IST)' },
        duration: { type: 'number', description: 'Duration in minutes, default 60' },
        description: { type: 'string', description: 'Event description' },
      },
      required: ['title', 'date', 'time']
    }
  },
  {
    name: 'get_calendar_events',
    description: 'Get upcoming Google Calendar events for the next N days.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days to look ahead (1-30)' }
      },
      required: []
    }
  },
  {
    name: 'get_video_links',
    description: 'Get links to AI video generation sites like Runway, Pika, Kling for a given prompt.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Video description' },
      },
      required: ['prompt']
    }
  },
];

// Keywords to auto-route to creative tools
export const CREATIVE_KEYWORDS: Record<string, string[]> = {
  text_to_speech:  ['bol', 'bolo', 'speak', 'tts', 'awaaz', 'आवाज़', 'पढ़कर बोलो', 'sun', 'सुनाओ', 'voice', 'read aloud'],
  generate_image:  ['image', 'photo', 'picture', 'तस्वीर', 'बनाओ', 'draw', 'generate image', 'create image', 'illustration'],
  generate_music:  ['music', 'song', 'gaana', 'गाना', 'beat', 'संगीत', 'bhajan', 'suno', 'udio', 'musicgen', 'melody'],
  post_to_social:  ['instagram', 'post karo', 'tweet', 'facebook', 'share', 'social media post'],
  add_calendar_event: ['calendar', 'event add', 'remind', 'schedule', 'याद दिलाओ', 'Google Calendar mein'],
  get_calendar_events: ['calendar dekho', 'upcoming events', 'aaj kya hai', 'schedule dekho', 'next exam'],
  get_video_links: ['video', 'वीडियो बनाओ', 'animation', 'reel', 'runway', 'pika'],
};
