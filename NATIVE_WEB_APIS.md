# JARVIS Native Web APIs
Added: 2026-03-20T18:50:59.551Z

## What works via browser (no MacroDroid/Termux):
- Web Bluetooth (BLE) — lib/client/nativeWebApis.ts
- Web NFC — read/write tags
- DeviceMotion — gyroscope/accelerometer  
- Screen Wake Lock — keep display on
- Battery Status API
- Network Information API (4G/WiFi)
- File System Access API — open/save files
- Screen Capture — getDisplayMedia
- Contact Picker API
- Clipboard API — read/write
- Ambient Light Sensor
- Hardware Info (RAM, CPU, GPU)
- Fullscreen API

## Usage in JARVIS chat:
- "Screen on rakh" -> requestWakeLock()
- "Battery kitni hai" -> getBatteryStatus()
- "Network check" -> getNetworkInfo()
- "File kholo" -> openFilePicker()
- "Bluetooth scan" -> scanBluetooth()
- "NFC check" -> isNFCSupported()

## Component:
<NativeFeatureDemo /> — test panel with all APIs
