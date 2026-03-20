'use client'
// lib/client/nativeWebApis.ts — Fixed null checks

let wakeLock: any = null
export async function requestWakeLock(): Promise<boolean> {
  try {
    if (!('wakeLock' in navigator)) return false
    wakeLock = await (navigator as any).wakeLock.request('screen')
    wakeLock.addEventListener('release', () => { wakeLock = null })
    return true
  } catch { return false }
}
export function releaseWakeLock() { wakeLock?.release(); wakeLock = null }
export function isWakeLockActive() { return !!wakeLock }

export async function getBatteryStatus(): Promise<{level:number;charging:boolean}|null> {
  try {
    if (!('getBattery' in navigator)) return null
    const bat = await (navigator as any).getBattery()
    return { level: Math.round(bat.level * 100), charging: bat.charging }
  } catch { return null }
}

export function getNetworkInfo(): {type:string;online:boolean;downlink:number}|null {
  try {
    const conn = (navigator as any).connection
    return { type: conn?.effectiveType || 'unknown', online: navigator.onLine, downlink: conn?.downlink || 0 }
  } catch { return null }
}

export async function isBTSupported(): Promise<boolean> {
  try {
    if (!('bluetooth' in navigator)) return false
    return await (navigator as any).bluetooth.getAvailability()
  } catch { return false }
}

export async function scanBluetooth(): Promise<{name:string;id:string}|null> {
  try {
    if (!('bluetooth' in navigator)) return null
    const device = await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true })
    return { name: device.name || 'Unknown', id: device.id }
  } catch { return null }
}

export function isNFCSupported(): boolean { return 'NDEFReader' in window }

export async function readNFC(onRead: (data: string) => void): Promise<boolean> {
  try {
    if (!('NDEFReader' in window)) return false
    const reader = new (window as any).NDEFReader()
    await reader.scan()
    reader.addEventListener('reading', ({ message }: any) => {
      for (const record of message.records) {
        const text = new TextDecoder().decode(record.data)
        onRead(text)
      }
    })
    return true
  } catch { return false }
}

export async function openFilePicker(): Promise<{name:string;content:string}|null> {
  try {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.onchange = () => {
        const file = input.files?.[0]
        if (!file) { resolve(null); return }
        const reader = new FileReader()
        reader.onload = () => resolve({ name: file.name, content: reader.result as string })
        reader.readAsText(file)
      }
      input.click()
    })
  } catch { return null }
}

export async function saveFile(content: string, filename: string): Promise<boolean> {
  try {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    a.download = filename
    a.click()
    return true
  } catch { return false }
}

let screenStream: MediaStream | null = null
export async function startScreenCapture(): Promise<boolean> {
  try {
    if (!('getDisplayMedia' in navigator.mediaDevices)) return false
    screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true })
    return true
  } catch { return false }
}

export async function captureScreenshot(): Promise<string|null> {
  try {
    if (!screenStream) {
      screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true })
    }
    if (!screenStream) return null  // Fixed: null check
    const track = screenStream.getVideoTracks()[0]
    const cap = new (window as any).ImageCapture(track)
    const bitmap = await cap.grabFrame()
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.8)
  } catch { return null }
}

export function stopScreenCapture() {
  screenStream?.getTracks().forEach(t => t.stop())
  screenStream = null
}

export async function pickContact(): Promise<{name:string;phone:string}[]> {
  try {
    if (!('contacts' in navigator)) return []
    const contacts = await (navigator as any).contacts.select(['name','tel'], { multiple: false })
    return contacts.map((c: any) => ({ name: c.name?.[0] || '', phone: c.tel?.[0] || '' }))
  } catch { return [] }
}

export function isContactPickerSupported(): boolean { return 'contacts' in navigator }

export async function readClipboard(): Promise<string> {
  try { return await navigator.clipboard.readText() } catch { return '' }
}

export async function writeClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

export function getHardwareInfo(): {ram?:number;cores:number;touch:boolean} {
  return {
    ram: (navigator as any).deviceMemory,
    cores: navigator.hardwareConcurrency || 1,
    touch: 'ontouchstart' in window
  }
}

export async function enterFullscreen(): Promise<boolean> {
  try { await document.documentElement.requestFullscreen(); return true } catch { return false }
}

export function getSupportedNativeAPIs(): Record<string, boolean> {
  return {
    wakeLock: 'wakeLock' in navigator,
    battery: 'getBattery' in navigator,
    networkInfo: !!(navigator as any).connection,
    bluetooth: 'bluetooth' in navigator,
    nfc: 'NDEFReader' in window,
    screenCapture: 'getDisplayMedia' in navigator.mediaDevices,
    contactPicker: 'contacts' in navigator,
    clipboard: 'clipboard' in navigator,
    vibration: 'vibrate' in navigator,
    geolocation: 'geolocation' in navigator,
    camera: !!(navigator.mediaDevices?.getUserMedia),
    speech: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    notifications: 'Notification' in window,
    share: 'share' in navigator,
  }
}
