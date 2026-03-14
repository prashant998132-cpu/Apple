// lib/automation/macrodroid.ts — JARVIS MacroDroid Bridge v2
// Tumhara webhook URL: Settings → Phone tab mein save karo
// Source code mein KABHI NAHI — localStorage mein safe
//
// Webhook format (tumhara):
// https://trigger.macrodroid.com/{YOUR_ID}/pranshu9179?zoxipro=WIFION
// https://trigger.macrodroid.com/{YOUR_ID}/pranshu9179?Tempvar=flashon
// https://trigger.macrodroid.com/{YOUR_ID}/pranshu9179?speak=Hello_World

export interface MacroAction {
  action: string
  params?: Record<string, string>
  // zoxipro = network vars, Tempvar = system vars
  zoxipro?: string
  Tempvar?: string
  speak?: string
  ytsearch?: string
  scrnblink?: string
  sendfullinfo?: string
}

// ══════════════════════════════════════════════════════════
// COMMAND DICTIONARY — Tumhare MacroDroid macros ke saath
// ══════════════════════════════════════════════════════════

export const MACRO_COMMANDS: Record<string, MacroAction> = {
  // Network (zoxipro variable)
  wifi_on:       { action: 'wifi_on',       zoxipro: 'WIFION' },
  wifi_off:      { action: 'wifi_off',      zoxipro: 'WIFIOFF' },
  bt_on:         { action: 'bt_on',         zoxipro: 'BTON' },
  bt_off:        { action: 'bt_off',        zoxipro: 'BTOFF' },
  data_on:       { action: 'data_on',       zoxipro: 'DATAON' },
  data_off:      { action: 'data_off',      zoxipro: 'DATAOFF' },
  hotspot_on:    { action: 'hotspot_on',    zoxipro: 'HOTSPOTON' },
  hotspot_off:   { action: 'hotspot_off',   zoxipro: 'HOTSPOTOFF' },

  // System (Tempvar variable)
  torch_on:      { action: 'torch_on',      Tempvar: 'flashon' },
  torch_off:     { action: 'torch_off',     Tempvar: 'flashoff' },
  dnd_on:        { action: 'dnd_on',        Tempvar: 'dndon' },
  dnd_off:       { action: 'dnd_off',       Tempvar: 'dndoff' },
  brightness:    { action: 'brightness',    Tempvar: 'bright' },
  open_photo:    { action: 'open_photo',    Tempvar: 'openpic' },
  play_music:    { action: 'play_music',    Tempvar: 'playmusic' },
  get_location:  { action: 'get_location',  Tempvar: 'location' },
  device_info:   { action: 'device_info',   sendfullinfo: '1' },
}

// Human-readable labels
export const ACTION_LABELS: Record<string, string> = {
  wifi_on:      '📶 WiFi ON',
  wifi_off:     '📶 WiFi OFF',
  bt_on:        '🔵 Bluetooth ON',
  bt_off:       '🔵 Bluetooth OFF',
  data_on:      '📱 Mobile Data ON',
  data_off:     '📱 Mobile Data OFF',
  hotspot_on:   '🔥 Hotspot ON',
  hotspot_off:  '🔥 Hotspot OFF',
  torch_on:     '🔦 Torch ON',
  torch_off:    '🔦 Torch OFF',
  dnd_on:       '🔕 DND ON',
  dnd_off:      '🔔 DND OFF',
  brightness:   '☀️ Brightness Adjust',
  open_photo:   '📷 Opening Last Photo',
  play_music:   '🎵 Playing Music',
  get_location: '📍 Getting Location',
  device_info:  'ℹ️ Getting Device Info',
  speak:        '🔊 Phone Speaking',
  youtube:      '▶️ YouTube Search',
  screen_blink: '✨ Screen Blink',
}

// ══════════════════════════════════════════════════════════
// NATURAL LANGUAGE DETECTOR — Deep Hindi/Hinglish support
// ══════════════════════════════════════════════════════════

export function detectPhoneIntent(msg: string): MacroAction | null {
  const m = msg.toLowerCase().trim()

  // ── WiFi ─────────────────────────────────────────────────
  if (m.match(/wifi\s*(on|chalu|kholo|enable|laga|start|chal)/i)) return MACRO_COMMANDS.wifi_on
  if (m.match(/wifi\s*(off|band|bund|disable|hat|rok)/i)) return MACRO_COMMANDS.wifi_off
  if (m.match(/(net|internet|connection)\s*(chalu|on|laga)/i)) return MACRO_COMMANDS.wifi_on

  // ── Bluetooth ─────────────────────────────────────────────
  if (m.match(/(bluetooth|bt|blutooth)\s*(on|chalu|kholo|joda)/i)) return MACRO_COMMANDS.bt_on
  if (m.match(/(bluetooth|bt|blutooth)\s*(off|band|bund|disconnect)/i)) return MACRO_COMMANDS.bt_off

  // ── Mobile Data ──────────────────────────────────────────
  if (m.match(/(mobile\s*data|cellular|4g|5g|data)\s*(on|chalu|laga)/i)) return MACRO_COMMANDS.data_on
  if (m.match(/(mobile\s*data|cellular|4g|5g|data)\s*(off|band|bund)/i)) return MACRO_COMMANDS.data_off

  // ── Hotspot ───────────────────────────────────────────────
  if (m.match(/(hotspot|hot.?spot|personal hotspot|tethering)\s*(on|chalu|kholo|start)/i)) return MACRO_COMMANDS.hotspot_on
  if (m.match(/(hotspot|hot.?spot|personal hotspot|tethering)\s*(off|band|bund|stop)/i)) return MACRO_COMMANDS.hotspot_off

  // ── Torch/Flashlight ─────────────────────────────────────
  if (m.match(/(torch|flashlight|light|roshni|roshan|andhera hai|andhere|chamak)\s*(on|jala|kholo|chalu|karo|start)/i)) return MACRO_COMMANDS.torch_on
  if (m.match(/andhera\s*(hai|ho gaya)/i)) return MACRO_COMMANDS.torch_on  // contextual
  if (m.match(/(torch|flashlight|light|roshni)\s*(off|band|bujha|bund)/i)) return MACRO_COMMANDS.torch_off
  if (m.match(/light\s*(band|bujha|off)/i)) return MACRO_COMMANDS.torch_off

  // ── DND / Silent ─────────────────────────────────────────
  if (m.match(/(dnd|do not disturb|disturb mat|mute|silent|chup)\s*(on|kar|laga|karo|mode)/i)) return MACRO_COMMANDS.dnd_on
  if (m.match(/(sone\s*(ja raha|ja rahi|wala)|so\s*(raha|rahi)|neend\s*(aa rahi|aane wali))/i)) return MACRO_COMMANDS.dnd_on
  if (m.match(/(dnd|do not disturb|silent)\s*(off|hat|bund|khatam)/i)) return MACRO_COMMANDS.dnd_off

  // ── Brightness ───────────────────────────────────────────
  if (m.match(/(brightness|ujala|screen\s*dark|aankhein\s*dukh)/i)) return MACRO_COMMANDS.brightness

  // ── Media ─────────────────────────────────────────────────
  if (m.match(/(last|aakhri|latest)\s*(photo|picture|tasveer|image)/i)) return MACRO_COMMANDS.open_photo
  if (m.match(/(music|gaana|song|gana)\s*(chala|play|baja|start)/i)) return MACRO_COMMANDS.play_music
  if (m.match(/(chala\s*gaana|gaana\s*laga)/i)) return MACRO_COMMANDS.play_music

  // ── Location ─────────────────────────────────────────────
  if (m.match(/(location|gps|meri\s*location|main\s*kahan|where\s*am\s*i)\s*(bhejo|do|send|share|batao)/i)) return MACRO_COMMANDS.get_location

  // ── Device Info ──────────────────────────────────────────
  if (m.match(/(battery|signal|device\s*info|phone\s*info|kitni\s*battery|phone\s*ki\s*jankari)/i)) return MACRO_COMMANDS.device_info
  if (m.match(/sendfullinfo/i)) return MACRO_COMMANDS.device_info

  // ── Speak (phone bolunga) ────────────────────────────────
  const speakMatch = m.match(/(?:phone\s*(?:se|ko|mein)|bol(?:o|na|do|dena)?|speak|say)\s+["']?(.{3,80})["']?/i)
  if (speakMatch) {
    const text = speakMatch[1].trim().replace(/\s+/g, '_')
    return { action: 'speak', speak: text }
  }

  // ── YouTube ───────────────────────────────────────────────
  const ytMatch = m.match(/(?:youtube|yt)\s*(?:pe|par|mein|on)?\s*(?:search|dhundho|play|chalao|baja[oe])?\s+(.{3,60})/i)
  if (ytMatch) {
    const query = ytMatch[1].trim().replace(/\s+/g, '_')
    return { action: 'youtube', ytsearch: query }
  }

  // ── Screen Blink ─────────────────────────────────────────
  const blinkMatch = m.match(/screen\s*(?:blink|flash|chamkao)\s*(\d*)/i)
  if (blinkMatch) {
    return { action: 'screen_blink', scrnblink: blinkMatch[1] || '3' }
  }

  return null
}

// ══════════════════════════════════════════════════════════
// WEBHOOK TRIGGER — tumhare MacroDroid URL format ke saath
// ══════════════════════════════════════════════════════════

export async function triggerMacrodroid(
  webhookUrl: string,
  action: MacroAction
): Promise<{ success: boolean; message: string }> {
  try {
    if (!webhookUrl) throw new Error('Webhook URL not set')

    // Build URL with correct variable names
    const base = webhookUrl.includes('?') ? webhookUrl : webhookUrl + '?'
    const params = new URLSearchParams()

    if (action.zoxipro)     params.set('zoxipro', action.zoxipro)
    if (action.Tempvar)     params.set('Tempvar', action.Tempvar)
    if (action.speak)       params.set('speak', action.speak)
    if (action.ytsearch)    params.set('ytsearch', action.ytsearch)
    if (action.scrnblink)   params.set('scrnblink', action.scrnblink)
    if (action.sendfullinfo) params.set('sendfullinfo', action.sendfullinfo)
    if (action.params) {
      Object.entries(action.params).forEach(([k, v]) => params.set(k, v))
    }

    const url = base.endsWith('?')
      ? base + params.toString()
      : base + '&' + params.toString()

    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) })

    if (res.ok) {
      const label = ACTION_LABELS[action.action] || action.action
      return { success: true, message: label + ' — Task Complete, Sir. ✅' }
    } else {
      return { success: false, message: 'MacroDroid ne response nahi diya. Phone on hai? MacroDroid chal raha hai?' }
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') return { success: false, message: 'Timeout — phone reachable nahi hai.' }
    return { success: false, message: 'Error: ' + (e?.message || 'unknown') }
  }
}
