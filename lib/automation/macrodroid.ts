// lib/automation/macrodroid.ts
// MacroDroid Bridge — JARVIS → Android phone control
// User sets webhook URL in Settings → MacroDroid tab
// MacroDroid creates matching macros on phone

export interface MacroAction {
  action: string
  params?: Record<string, string>
}

// Actions JARVIS can trigger on phone via MacroDroid webhook
export const PHONE_ACTIONS: Record<string, MacroAction> = {
  wifi_on:       { action: 'wifi_on' },
  wifi_off:      { action: 'wifi_off' },
  bt_on:         { action: 'bluetooth_on' },
  bt_off:        { action: 'bluetooth_off' },
  torch_on:      { action: 'torch_on' },
  torch_off:     { action: 'torch_off' },
  hotspot_on:    { action: 'hotspot_on' },
  hotspot_off:   { action: 'hotspot_off' },
  dnd_on:        { action: 'dnd_on' },
  dnd_off:       { action: 'dnd_off' },
  silent:        { action: 'silent_mode' },
  ringer:        { action: 'ringer_mode' },
  screen_on:     { action: 'screen_on' },
  screen_off:    { action: 'screen_off' },
}

// Detect phone control intent from natural language
export function detectPhoneIntent(msg: string): MacroAction | null {
  const m = msg.toLowerCase()

  if (m.match(/wifi\s*(on|chalu|kholo|enable|band mat karo)/)) return PHONE_ACTIONS.wifi_on
  if (m.match(/wifi\s*(off|band|disable|bund)/)) return PHONE_ACTIONS.wifi_off
  if (m.match(/(bluetooth|bt)\s*(on|chalu|kholo)/)) return PHONE_ACTIONS.bt_on
  if (m.match(/(bluetooth|bt)\s*(off|band)/)) return PHONE_ACTIONS.bt_off
  if (m.match(/(torch|flashlight|light|roshni)\s*(on|jala|kholo)/)) return PHONE_ACTIONS.torch_on
  if (m.match(/(torch|flashlight|light|roshni)\s*(off|band)/)) return PHONE_ACTIONS.torch_off
  if (m.match(/(hotspot|personal hotspot)\s*(on|chalu)/)) return PHONE_ACTIONS.hotspot_on
  if (m.match(/(hotspot|personal hotspot)\s*(off|band)/)) return PHONE_ACTIONS.hotspot_off
  if (m.match(/(dnd|do not disturb|disturb mat|mute|chup)\s*(on|kar|laga)/)) return PHONE_ACTIONS.dnd_on
  if (m.match(/(dnd|do not disturb)\s*(off|hata|band)/)) return PHONE_ACTIONS.dnd_off
  if (m.match(/silent\s*(mode|kar|karo)/)) return PHONE_ACTIONS.silent
  if (m.match(/(ringer|sound|ring)\s*(mode|on|chalu)/)) return PHONE_ACTIONS.ringer
  if (m.match(/screen\s*(on|kholo|jaga)/)) return PHONE_ACTIONS.screen_on
  if (m.match(/screen\s*(off|band|so ja)/)) return PHONE_ACTIONS.screen_off

  // Open app intent
  const appMatch = m.match(/(?:open|kholo|launch|start|chalo|chalao)\s+(\w+)/i)
  if (appMatch) {
    return { action: 'open_app', params: { name: appMatch[1] } }
  }

  // Alarm intent
  const alarmMatch = m.match(/alarm\s+(?:set|laga|baja)?\s*(?:at\s+)?(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm|baje))?)/i)
  if (alarmMatch) {
    return { action: 'set_alarm', params: { time: alarmMatch[1] } }
  }

  // Volume intent
  const volMatch = m.match(/(?:volume|awaaz)\s*(?:set|karo)?\s*(?:to|par)?\s*(\d+)/i)
  if (volMatch) {
    return { action: 'set_volume', params: { level: volMatch[1] } }
  }

  return null
}

// Trigger MacroDroid webhook (called from external-router or page.tsx client-side)
// webhookUrl stored in localStorage: jarvis_macrodroid_url
export async function triggerMacrodroid(
  webhookUrl: string,
  action: MacroAction
): Promise<{ success: boolean; message: string }> {
  try {
    const params = new URLSearchParams({ action: action.action, ...(action.params || {}) })
    const url = webhookUrl.includes('?')
      ? `${webhookUrl}&${params}`
      : `${webhookUrl}?${params}`
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) })
    return {
      success: res.ok,
      message: res.ok
        ? `✅ Phone command sent: ${action.action.replace(/_/g, ' ')}`
        : `❌ MacroDroid error: ${res.status}`,
    }
  } catch (e: any) {
    return { success: false, message: `❌ MacroDroid unreachable: ${e.message}` }
  }
}

// Action descriptions for user-facing messages
export const ACTION_LABELS: Record<string, string> = {
  wifi_on:     'WiFi on kar raha hoon',
  wifi_off:    'WiFi off kar raha hoon',
  bluetooth_on:'Bluetooth on kar raha hoon',
  bluetooth_off:'Bluetooth off kar raha hoon',
  torch_on:    'Torch jala raha hoon',
  torch_off:   'Torch band kar raha hoon',
  hotspot_on:  'Hotspot on kar raha hoon',
  hotspot_off: 'Hotspot off kar raha hoon',
  dnd_on:      'Do Not Disturb on kar raha hoon',
  dnd_off:     'DND off kar raha hoon',
  silent_mode: 'Silent mode on kar raha hoon',
  ringer_mode: 'Ringer mode on kar raha hoon',
  screen_on:   'Screen on kar raha hoon',
  screen_off:  'Screen off kar raha hoon',
  open_app:    'App khol raha hoon',
  set_alarm:   'Alarm set kar raha hoon',
  set_volume:  'Volume set kar raha hoon',
}
