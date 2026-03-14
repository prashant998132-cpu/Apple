'use client'
// lib/client/androidBridge.ts — JARVIS Android/PWA Deep Integration
// All Web APIs that work in Chrome Android + TWA APK
// Zero cost, pure browser APIs

// ══════════════════════════════════════════════════════════
// 1. CONTACT PICKER — User se contacts lo (read-only, user selects)
// Works in Chrome Android + TWA APK
// ══════════════════════════════════════════════════════════

export interface ContactResult {
  name?: string[]
  tel?: string[]
  email?: string[]
}

export async function pickContacts(): Promise<ContactResult[]> {
  try {
    if (!('contacts' in navigator)) throw new Error('Contact Picker not supported')
    const contacts = await (navigator as any).contacts.select(
      ['name', 'tel', 'email'],
      { multiple: true }
    )
    return contacts as ContactResult[]
  } catch (e: any) {
    throw new Error('Contact Picker: ' + (e?.message || 'unavailable'))
  }
}

export function isContactPickerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'contacts' in navigator
}

// ══════════════════════════════════════════════════════════
// 2. WEB BLUETOOTH — Nearby devices detect + connect
// Works in Chrome Android + TWA APK
// ══════════════════════════════════════════════════════════

export interface BluetoothDeviceInfo {
  id: string
  name: string | null
}

export async function scanBluetooth(): Promise<BluetoothDeviceInfo> {
  if (!('bluetooth' in navigator)) throw new Error('Web Bluetooth not supported')
  const device = await (navigator as any).bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ['battery_service', 'device_information'],
  })
  return { id: device.id, name: device.name || null }
}

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

// ══════════════════════════════════════════════════════════
// 3. WEB NFC — NFC tags read/write
// Works in Chrome Android 89+
// ══════════════════════════════════════════════════════════

export async function readNFC(): Promise<string> {
  if (!('NDEFReader' in window)) throw new Error('NFC not supported')
  const ndef = new (window as any).NDEFReader()
  await ndef.scan()
  return new Promise((resolve) => {
    ndef.onreading = (event: any) => {
      const decoder = new TextDecoder()
      for (const record of event.message.records) {
        if (record.recordType === 'text') {
          resolve(decoder.decode(record.data))
          return
        }
      }
      resolve('NFC tag scanned')
    }
  })
}

export async function writeNFC(text: string): Promise<void> {
  if (!('NDEFReader' in window)) throw new Error('NFC not supported')
  const ndef = new (window as any).NDEFReader()
  await ndef.write({ records: [{ recordType: 'text', data: text }] })
}

export function isNFCSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window
}

// ══════════════════════════════════════════════════════════
// 4. DEVICE MOTION — Accelerometer (step detect, shake)
// Works everywhere on mobile
// ══════════════════════════════════════════════════════════

export interface MotionData {
  x: number; y: number; z: number
  total: number
}

let shakeCallback: (() => void) | null = null
let lastMotion = 0

export function startShakeDetect(onShake: () => void, threshold = 15): void {
  shakeCallback = onShake
  const handler = (e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity
    if (!acc) return
    const total = Math.sqrt((acc.x||0)**2 + (acc.y||0)**2 + (acc.z||0)**2)
    const now = Date.now()
    if (total > threshold && now - lastMotion > 1000) {
      lastMotion = now
      shakeCallback?.()
    }
  }
  window.addEventListener('devicemotion', handler)
}

export function getDeviceOrientation(): Promise<{alpha:number;beta:number;gamma:number}> {
  return new Promise((resolve) => {
    window.addEventListener('deviceorientation', (e) => {
      resolve({ alpha: e.alpha||0, beta: e.beta||0, gamma: e.gamma||0 })
    }, { once: true })
  })
}

// ══════════════════════════════════════════════════════════
// 5. SCREEN WAKE LOCK — Screen off nahi hogi
// Works in Chrome Android + TWA APK
// ══════════════════════════════════════════════════════════

let wakeLockRef: any = null

export async function keepScreenOn(): Promise<boolean> {
  try {
    if (!('wakeLock' in navigator)) return false
    wakeLockRef = await (navigator as any).wakeLock.request('screen')
    wakeLockRef.addEventListener('release', () => { wakeLockRef = null })
    return true
  } catch { return false }
}

export function releaseScreenLock(): void {
  wakeLockRef?.release()
  wakeLockRef = null
}

export function isScreenLocked(): boolean {
  return wakeLockRef !== null
}

// ══════════════════════════════════════════════════════════
// 6. WEB SHARE TARGET — JARVIS ko share target banao
// Doosre apps se directly JARVIS pe share ho
// ══════════════════════════════════════════════════════════

export function getSharedContent(): { title?: string; text?: string; url?: string } | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const title = params.get('title')
  const text = params.get('text')
  const url = params.get('url')
  if (title || text || url) return { title: title||undefined, text: text||undefined, url: url||undefined }
  return null
}

// ══════════════════════════════════════════════════════════
// 7. NATIVE SHARE — Share JARVIS content to any app
// ══════════════════════════════════════════════════════════

export async function nativeShare(data: { title: string; text: string; url?: string }): Promise<boolean> {
  try {
    if (navigator.share) { await navigator.share(data); return true }
    // Fallback: copy to clipboard
    await navigator.clipboard?.writeText(data.text + (data.url ? '\n' + data.url : ''))
    return true
  } catch { return false }
}

// ══════════════════════════════════════════════════════════
// 8. WEB OTP — Auto-fill OTP from SMS
// Works in Chrome Android
// ══════════════════════════════════════════════════════════

export async function listenForOTP(): Promise<string | null> {
  try {
    if (!('OTPCredential' in window)) return null
    const ac = new AbortController()
    setTimeout(() => ac.abort(), 60000) // 60s timeout
    const cred = await (navigator as any).credentials.get({
      otp: { transport: ['sms'] },
      signal: ac.signal,
    })
    return cred?.code || null
  } catch { return null }
}

// ══════════════════════════════════════════════════════════
// 9. GEOFENCING-STYLE — Location-based reminders
// Pure JavaScript — no native geofencing API needed
// ══════════════════════════════════════════════════════════

export interface GeoFence {
  id: string
  lat: number
  lon: number
  radiusM: number
  label: string
  action: string  // what JARVIS does when you enter
}

const FENCE_KEY = 'jarvis_geofences'

export function addGeoFence(fence: GeoFence): void {
  const fences: GeoFence[] = JSON.parse(localStorage.getItem(FENCE_KEY) || '[]')
  fences.push(fence)
  localStorage.setItem(FENCE_KEY, JSON.stringify(fences))
}

export function getGeoFences(): GeoFence[] {
  return JSON.parse(localStorage.getItem(FENCE_KEY) || '[]')
}

function geoDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function checkGeoFences(lat: number, lon: number): GeoFence[] {
  return getGeoFences().filter(f => geoDistance(lat, lon, f.lat, f.lon) <= f.radiusM)
}

// ══════════════════════════════════════════════════════════
// 10. FILE ACCESS — Files read/analyze
// Works with user permission in Chrome Android
// ══════════════════════════════════════════════════════════

export async function pickFile(accept = '*/*'): Promise<{ name: string; content: string; type: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, content: reader.result as string, type: file.type })
      reader.onerror = () => resolve(null)
      if (file.type.startsWith('image/')) reader.readAsDataURL(file)
      else reader.readAsText(file)
    }
    input.click()
  })
}

// ══════════════════════════════════════════════════════════
// 11. CAMERA CAPTURE — Direct camera photo/video
// ══════════════════════════════════════════════════════════

export async function capturePhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.setAttribute('capture', 'environment')
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    }
    input.click()
  })
}

// ══════════════════════════════════════════════════════════
// 12. NETWORK INFO — Connection quality detect
// ══════════════════════════════════════════════════════════

export function getNetworkInfo(): { type: string; speed: string; saveData: boolean } {
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  if (!conn) return { type: 'unknown', speed: 'unknown', saveData: false }
  return {
    type: conn.effectiveType || conn.type || 'unknown',
    speed: conn.downlink ? conn.downlink + ' Mbps' : 'unknown',
    saveData: conn.saveData || false,
  }
}

// ══════════════════════════════════════════════════════════
// 13. CLIPBOARD — Read/write
// ══════════════════════════════════════════════════════════

export async function readClipboard(): Promise<string> {
  try { return await navigator.clipboard.readText() }
  catch { return '' }
}

export async function writeClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true }
  catch { return false }
}

// ══════════════════════════════════════════════════════════
// 14. PHONE CALLS via tel: links (TWA handles natively)
// ══════════════════════════════════════════════════════════

export function makeCall(number: string): void {
  window.location.href = 'tel:' + number.replace(/[^0-9+]/g, '')
}

export function sendSMSIntent(number: string, body?: string): void {
  const encoded = body ? '?body=' + encodeURIComponent(body) : ''
  window.location.href = 'sms:' + number + encoded
}

// ══════════════════════════════════════════════════════════
// 15. SPEECH RECOGNITION — Built-in, FREE, no API cost
// ══════════════════════════════════════════════════════════

export function startVoiceInput(onResult: (text: string) => void, onEnd?: () => void): (() => void) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) throw new Error('Speech recognition not supported')
  const recognition = new SR()
  recognition.lang = 'hi-IN'
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.onresult = (e: any) => onResult(e.results[0][0].transcript)
  recognition.onend = onEnd || (() => {})
  recognition.start()
  return () => recognition.stop()
}
