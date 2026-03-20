// lib/client/nativeWebApis.ts
// Native Web APIs — works in Chrome Android PWA, no MacroDroid needed
// Bluetooth, NFC, Gyroscope, Wake Lock, File System, Screen Capture etc.

'use client'

// ── 1. SCREEN WAKE LOCK — screen band na ho ────────────────
let wakeLock: any = null
export async function requestWakeLock(): Promise<boolean> {
  try {
    if (!('wakeLock' in navigator)) return false
    wakeLock = await (navigator as any).wakeLock.request('screen')
    wakeLock.addEventListener('release', () => { wakeLock = null })
    return true
  } catch { return false }
}
export function releaseWakeLock() {
  wakeLock?.release()
  wakeLock = null
}
export function isWakeLockActive() { return !!wakeLock }

// ── 2. BATTERY STATUS ──────────────────────────────────────
export async function getBatteryStatus(): Promise<{level:number;charging:boolean;chargingTime:number;dischargingTime:number}|null> {
  try {
    if (!('getBattery' in navigator)) return null
    const bat = await (navigator as any).getBattery()
    return {
      level: Math.round(bat.level * 100),
      charging: bat.charging,
      chargingTime: bat.chargingTime,
      dischargingTime: bat.dischargingTime
    }
  } catch { return null }
}

// ── 3. NETWORK INFORMATION ────────────────────────────────
export function getNetworkInfo(): {type:string;speed:string;downlink:number;rtt:number;online:boolean}|null {
  try {
    const conn = (navigator as any).connection || (navigator as any).mozConnection
    return {
      type: conn?.effectiveType || 'unknown',
      speed: conn?.effectiveType === '4g' ? 'Fast (4G)' : conn?.effectiveType === '3g' ? 'Medium (3G)' : conn?.effectiveType || 'unknown',
      downlink: conn?.downlink || 0,
      rtt: conn?.rtt || 0,
      online: navigator.onLine
    }
  } catch { return null }
}

// ── 4. DEVICE MOTION — gyroscope + accelerometer ──────────
type MotionCallback = (data: {alpha:number;beta:number;gamma:number;accel:{x:number;y:number;z:number}}) => void
let motionListener: ((e:any)=>void) | null = null

export async function startMotionSensor(cb: MotionCallback): Promise<boolean> {
  try {
    // Request permission on iOS 13+
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      const perm = await (DeviceOrientationEvent as any).requestPermission()
      if (perm !== 'granted') return false
    }
    
    const motionHandler = (e: DeviceMotionEvent) => {
      cb({
        alpha: 0, beta: 0, gamma: 0,
        accel: {
          x: Math.round((e.acceleration?.x || 0) * 100) / 100,
          y: Math.round((e.acceleration?.y || 0) * 100) / 100,
          z: Math.round((e.acceleration?.z || 0) * 100) / 100
        }
      })
    }
    motionListener = motionHandler
    window.addEventListener('devicemotion', motionHandler)
    return true
  } catch { return false }
}

export function stopMotionSensor() {
  if (motionListener) window.removeEventListener('devicemotion', motionListener)
  motionListener = null
}

// ── 5. WEB BLUETOOTH — BLE devices connect ────────────────
export async function scanBluetooth(serviceUUID?: string): Promise<{name:string;id:string}|null> {
  try {
    if (!('bluetooth' in navigator)) return null
    const filters: any[] = serviceUUID 
      ? [{ services: [serviceUUID] }] 
      : [{ acceptAllDevices: true }]
    
    const device = await (navigator as any).bluetooth.requestDevice({
      ...(serviceUUID ? { filters } : { acceptAllDevices: true }),
      optionalServices: ['battery_service', 'device_information']
    })
    
    return { name: device.name || 'Unknown Device', id: device.id }
  } catch (e: any) {
    if (e.name === 'NotFoundError') return null // user cancelled
    throw e
  }
}

export async function isBTSupported(): Promise<boolean> {
  try {
    if (!('bluetooth' in navigator)) return false
    return await (navigator as any).bluetooth.getAvailability()
  } catch { return false }
}

// ── 6. WEB NFC — NFC tags read/write ─────────────────────
export async function readNFC(onRead: (data: string) => void): Promise<boolean> {
  try {
    if (!('NDEFReader' in window)) return false
    const reader = new (window as any).NDEFReader()
    await reader.scan()
    reader.addEventListener('reading', ({ message }: any) => {
      for (const record of message.records) {
        if (record.recordType === 'text') {
          const text = new TextDecoder().decode(record.data)
          onRead(text)
        } else if (record.recordType === 'url') {
          const url = new TextDecoder().decode(record.data)
          onRead(url)
        }
      }
    })
    return true
  } catch { return false }
}

export async function writeNFC(text: string): Promise<boolean> {
  try {
    if (!('NDEFReader' in window)) return false
    const writer = new (window as any).NDEFReader()
    await writer.write({ records: [{ recordType: 'text', data: text }] })
    return true
  } catch { return false }
}

export function isNFCSupported(): boolean {
  return 'NDEFReader' in window
}

// ── 7. FILE SYSTEM ACCESS API ─────────────────────────────
export async function openFilePicker(accept?: string[]): Promise<{name:string;content:string}|null> {
  try {
    if (!('showOpenFilePicker' in window)) {
      // Fallback: input element
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        if (accept) input.accept = accept.join(',')
        input.onchange = () => {
          const file = input.files?.[0]
          if (!file) { resolve(null); return }
          const reader = new FileReader()
          reader.onload = () => resolve({ name: file.name, content: reader.result as string })
          reader.readAsText(file)
        }
        input.click()
      })
    }
    
    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: accept ? [{ description: 'Files', accept: { '*/*': accept } }] : undefined
    })
    const file = await fileHandle.getFile()
    const content = await file.text()
    return { name: file.name, content }
  } catch { return null }
}

export async function saveFile(content: string, filename: string, mimeType = 'text/plain'): Promise<boolean> {
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'File', accept: { [mimeType]: ['.' + filename.split('.').pop()] } }]
      })
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      return true
    } else {
      // Fallback download
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([content], { type: mimeType }))
      a.download = filename
      a.click()
      return true
    }
  } catch { return false }
}

// ── 8. SCREEN CAPTURE ────────────────────────────────────
let screenStream: MediaStream | null = null

export async function startScreenCapture(): Promise<boolean> {
  try {
    if (!('getDisplayMedia' in navigator.mediaDevices)) return false
    screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
      video: { mediaSource: 'screen' }
    })
    return true
  } catch { return false }
}

export async function captureScreenshot(): Promise<string|null> {
  try {
    if (!screenStream) {
      screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true })
    }
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

// ── 9. CONTACT PICKER ────────────────────────────────────
export async function pickContact(): Promise<{name:string;phone:string;email:string}[]> {
  try {
    if (!('contacts' in navigator && 'ContactsManager' in window)) return []
    const props = ['name', 'tel', 'email']
    const contacts = await (navigator as any).contacts.select(props, { multiple: false })
    return contacts.map((c: any) => ({
      name: c.name?.[0] || '',
      phone: c.tel?.[0] || '',
      email: c.email?.[0] || ''
    }))
  } catch { return [] }
}

export function isContactPickerSupported(): boolean {
  return 'contacts' in navigator
}

// ── 10. CLIPBOARD ────────────────────────────────────────
export async function readClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText()
  } catch { return '' }
}

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch { return false }
}

// ── 11. DEVICE MEMORY + HARDWARE INFO ────────────────────
export function getHardwareInfo(): {ram?:number;cores:number;platform:string;touch:boolean;gpu?:string} {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl') as WebGLRenderingContext | null
  const ext = gl?.getExtension('WEBGL_debug_renderer_info')
  
  return {
    ram: (navigator as any).deviceMemory,
    cores: navigator.hardwareConcurrency || 1,
    platform: navigator.platform || 'unknown',
    touch: 'ontouchstart' in window,
    gpu: ext ? gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL) : undefined
  }
}

// ── 12. AMBIENT LIGHT SENSOR ─────────────────────────────
export function startAmbientLight(cb: (lux: number) => void): boolean {
  try {
    if (!('AmbientLightSensor' in window)) return false
    const sensor = new (window as any).AmbientLightSensor()
    sensor.addEventListener('reading', () => cb(sensor.illuminance))
    sensor.start()
    return true
  } catch { return false }
}

// ── 13. FULLSCREEN ───────────────────────────────────────
export async function enterFullscreen(): Promise<boolean> {
  try {
    await document.documentElement.requestFullscreen()
    return true
  } catch { return false }
}
export function exitFullscreen() { document.exitFullscreen?.() }

// ── UTILITY: Get all supported native APIs ────────────────
export function getSupportedNativeAPIs(): Record<string, boolean> {
  return {
    wakeLock: 'wakeLock' in navigator,
    battery: 'getBattery' in navigator,
    networkInfo: !!(navigator as any).connection,
    deviceMotion: 'DeviceMotionEvent' in window,
    bluetooth: 'bluetooth' in navigator,
    nfc: 'NDEFReader' in window,
    fileSystem: 'showOpenFilePicker' in window,
    screenCapture: 'getDisplayMedia' in navigator.mediaDevices,
    contactPicker: 'contacts' in navigator,
    clipboard: 'clipboard' in navigator,
    ambientLight: 'AmbientLightSensor' in window,
    vibration: 'vibrate' in navigator,
    geolocation: 'geolocation' in navigator,
    camera: !!(navigator.mediaDevices?.getUserMedia),
    speech: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    notifications: 'Notification' in window,
    share: 'share' in navigator,
    fullscreen: 'requestFullscreen' in document.documentElement,
  }
}
