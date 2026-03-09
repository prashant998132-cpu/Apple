// lib/core/deviceContext.ts
// All mobile device APIs — feeds JARVIS context
// Battery, Network, Screen, Clipboard, Vibration, Share, etc.
// ─────────────────────────────────────────────────────────

export interface DeviceContext {
  battery: {
    level: number        // 0-100
    charging: boolean
    chargingTime: number // seconds, Infinity if not charging
    dischargingTime: number
  } | null
  network: {
    online: boolean
    type: string         // '4g'|'3g'|'2g'|'slow-2g'|'wifi'|'unknown'
    downlink: number     // Mbps
    rtt: number          // ms
    saveData: boolean
  }
  screen: {
    width: number
    height: number
    orientation: string
    wakeLockSupported: boolean
  }
  memory: number | null   // GB
  cores: number | null
  platform: string
  standalone: boolean     // PWA mode?
  locale: string
}

let _wakeLock: WakeLockSentinel | null = null

// ── Battery ──────────────────────────────────────────────
export async function getBatteryInfo(): Promise<DeviceContext['battery']> {
  try {
    const bat = await (navigator as any).getBattery?.()
    if (!bat) return null
    return {
      level: Math.round(bat.level * 100),
      charging: bat.charging,
      chargingTime: bat.chargingTime,
      dischargingTime: bat.dischargingTime,
    }
  } catch { return null }
}

// ── Network ──────────────────────────────────────────────
export function getNetworkInfo(): DeviceContext['network'] {
  const conn = (navigator as any).connection
  return {
    online: navigator.onLine,
    type: conn?.effectiveType ?? (navigator.onLine ? 'unknown' : 'offline'),
    downlink: conn?.downlink ?? 0,
    rtt: conn?.rtt ?? 0,
    saveData: conn?.saveData ?? false,
  }
}

// ── Full context ──────────────────────────────────────────
export async function getDeviceContext(): Promise<DeviceContext> {
  const battery = await getBatteryInfo()
  const network = getNetworkInfo()
  return {
    battery,
    network,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      orientation: screen.orientation?.type ?? 'portrait-primary',
      wakeLockSupported: 'wakeLock' in navigator,
    },
    memory: (navigator as any).deviceMemory ?? null,
    cores: navigator.hardwareConcurrency ?? null,
    platform: navigator.platform ?? navigator.userAgent.includes('Android') ? 'Android' : 'Unknown',
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    locale: navigator.language ?? 'hi-IN',
  }
}

// ── Screen wake lock (prevent sleep during long tasks) ───
export async function requestWakeLock(): Promise<boolean> {
  try {
    _wakeLock = await (navigator as any).wakeLock?.request('screen')
    return true
  } catch { return false }
}

export function releaseWakeLock(): void {
  _wakeLock?.release?.()
  _wakeLock = null
}

// ── Vibration ────────────────────────────────────────────
export function vibrate(pattern: number | number[] = 100): boolean {
  return navigator.vibrate?.(pattern) ?? false
}

// notification sound + vibrate
export function notifyVibrate() {
  vibrate([50, 50, 100])
}

// ── Share ────────────────────────────────────────────────
export async function shareContent(title: string, text: string, url?: string): Promise<boolean> {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return true }
    catch { return false }
  }
  // Fallback: copy to clipboard
  return copyToClipboard(text)
}

// ── Clipboard ────────────────────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // legacy fallback
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  }
}

export async function readFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText()
  } catch { return '' }
}

// ── Context string for JARVIS system prompt ──────────────
export function deviceContextToPrompt(ctx: DeviceContext): string {
  const parts: string[] = []

  if (ctx.battery) {
    const b = ctx.battery
    const pct = b.level
    const status = b.charging ? `charging` : `${pct}% battery`
    if (pct <= 20 && !b.charging) parts.push(`⚠️ Battery low (${pct}%) — keep responses concise`)
    else parts.push(`Battery: ${status}`)
  }

  if (!ctx.network.online) {
    parts.push(`📵 Device is OFFLINE — only use cached/local tools`)
  } else if (ctx.network.type === '2g' || ctx.network.type === 'slow-2g') {
    parts.push(`🐌 Slow network (${ctx.network.type}) — avoid large responses`)
  } else {
    parts.push(`Network: ${ctx.network.type} online`)
  }

  if (ctx.standalone) parts.push(`Running as PWA (installed app)`)
  if (ctx.memory && ctx.memory <= 2) parts.push(`Low RAM device (${ctx.memory}GB) — keep memory usage minimal`)

  return parts.join(' · ')
}

// ── Battery-aware response length hint ───────────────────
export function getBatteryHint(level: number | null): string {
  if (!level) return ''
  if (level <= 10) return 'CRITICAL BATTERY: Single sentence answers only.'
  if (level <= 20) return 'LOW BATTERY: Keep responses very short.'
  if (level <= 40) return 'MODERATE BATTERY: Concise responses preferred.'
  return ''
}
