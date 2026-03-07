// lib/india/transport.ts
// MP Transport Hub — Train + Bus + IRCTC + Routes
// Rewa-focused, free APIs

// ─── Train Data ───────────────────────────────────────────
export const REWA_TRAINS = [
  { name: 'Mahakoshal Express', number: '12189/12190', route: 'Rewa ↔ Mumbai CST', days: 'Daily', departs: '06:10', arrives: 'Next day 09:35', class: 'SL/3A/2A/1A' },
  { name: 'Shridham Express', number: '12191/12192', route: 'Rewa ↔ Delhi Hazrat Nizamuddin', days: 'Daily', departs: '14:30', arrives: 'Next day 06:45', class: 'SL/3A/2A' },
  { name: 'Vindhyachal Express', number: '11703/11704', route: 'Rewa ↔ Indore', days: 'Daily', departs: '20:00', arrives: 'Next day 11:30', class: 'SL/3A/2A' },
  { name: 'Lucknow-Rewa Express', number: '12429/12430', route: 'Rewa ↔ Lucknow', days: 'Daily', departs: '23:45', arrives: '09:30', class: 'SL/3A/2A' },
  { name: 'Rewa-Jabalpur Express', number: '11755/11756', route: 'Rewa ↔ Jabalpur', days: 'Daily', departs: '07:15', arrives: '12:30', class: 'SL/2S' },
  { name: 'Rewa-Patna Express', number: '15233/15234', route: 'Rewa ↔ Patna', days: 'Mon/Thu', departs: '08:00', arrives: '21:00', class: 'SL/3A' },
  { name: 'Satna-Rewa Passenger', number: '51193/51194', route: 'Rewa ↔ Satna', days: 'Daily', departs: 'Multiple', arrives: 'Multiple', class: '2S only' },
  { name: 'Baghmati Express', number: '12578', route: 'Rewa → Anand Vihar Delhi', days: 'Tue/Fri/Sun', departs: '18:45', arrives: '09:15', class: 'SL/3A/2A' },
];

// ─── Bus Routes from Rewa ─────────────────────────────────
export const REWA_BUS_ROUTES = [
  { destination: 'Bhopal', distance: '499 km', duration: '8-9 hrs', frequency: 'Every 30 min', fare_approx: '₹350-500', terminal: 'Rewa Bus Stand' },
  { destination: 'Jabalpur', distance: '215 km', duration: '4-5 hrs', frequency: 'Every 1 hr', fare_approx: '₹180-250', terminal: 'Rewa Bus Stand' },
  { destination: 'Satna', distance: '91 km', duration: '1.5-2 hrs', frequency: 'Every 20 min', fare_approx: '₹60-90', terminal: 'Rewa Bus Stand' },
  { destination: 'Allahabad/Prayagraj', distance: '204 km', duration: '4 hrs', frequency: 'Every 2 hrs', fare_approx: '₹150-200', terminal: 'Rewa Bus Stand' },
  { destination: 'Lucknow', distance: '482 km', duration: '8-9 hrs', frequency: 'Every 3-4 hrs', fare_approx: '₹300-400', terminal: 'Rewa Bus Stand' },
  { destination: 'Varanasi', distance: '260 km', duration: '5-6 hrs', frequency: 'Every 2 hrs', fare_approx: '₹200-280', terminal: 'Rewa Bus Stand' },
  { destination: 'Sidhi', distance: '108 km', duration: '2 hrs', frequency: 'Every 1 hr', fare_approx: '₹80-120', terminal: 'Rewa Bus Stand' },
  { destination: 'Singrauli', distance: '187 km', duration: '3.5 hrs', frequency: 'Every 2 hrs', fare_approx: '₹130-180', terminal: 'Rewa Bus Stand' },
  { destination: 'Chitrakoot', distance: '132 km', duration: '2.5 hrs', frequency: 'Every 2 hrs', fare_approx: '₹100-140', terminal: 'Rewa Bus Stand' },
  { destination: 'Delhi', distance: '1087 km', duration: '18-20 hrs', frequency: 'Evening only', fare_approx: '₹600-900', terminal: 'Rewa Bus Stand', note: 'Night bus available' },
];

// ─── IRCTC Booking Links ──────────────────────────────────
export function getIRCTCLink(from: string, to: string, date?: string): string {
  const today = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
  const fromCode = STATION_CODES[from.toUpperCase()] || from.toUpperCase();
  const toCode = STATION_CODES[to.toUpperCase()] || to.toUpperCase();
  return `https://www.irctc.co.in/nget/train-search?fromStation=${fromCode}&toStation=${toCode}&journeyDate=${today}`;
}

export const STATION_CODES: Record<string, string> = {
  REWA: 'REWA', DELHI: 'NDLS', MUMBAI: 'CSTM', JABALPUR: 'JBP',
  BHOPAL: 'BPL', SATNA: 'STA', LUCKNOW: 'LKO', PATNA: 'PNBE',
  VARANASI: 'BSB', ALLAHABAD: 'ALD', PRAYAGRAJ: 'ALD', INDORE: 'INDB',
  KOLKATA: 'HWH', BANGALORE: 'SBC', HYDERABAD: 'HYB', CHENNAI: 'MAS',
  AGRA: 'AGC', JAIPUR: 'JP', AHMEDABAD: 'ADI', PUNE: 'PUNE',
};

// ─── Train Search ─────────────────────────────────────────
export async function searchTrains(from: string, to: string): Promise<any> {
  const fromNorm = from.toUpperCase();
  const toNorm = to.toUpperCase();
  
  // Check our local data first
  const localResults = REWA_TRAINS.filter(t => 
    t.route.toUpperCase().includes(fromNorm) || 
    t.route.toUpperCase().includes(toNorm) ||
    fromNorm.includes('REWA') || toNorm.includes('REWA')
  );

  const irctcLink = getIRCTCLink(from, to);
  
  if (localResults.length > 0) {
    return {
      from, to,
      trains: localResults,
      book_link: irctcLink,
      pnr_check: 'https://www.indianrail.gov.in/pnr_Enq.html',
      live_status: 'https://etrain.info/',
      note: 'Book करने के लिए IRCTC link use करो'
    };
  }

  // Try IRCTC/RailwayAPI
  try {
    const fromCode = STATION_CODES[fromNorm] || fromNorm.slice(0, 5);
    const toCode = STATION_CODES[toNorm] || toNorm.slice(0, 5);
    const today = new Date().toISOString().split('T')[0];
    
    const res = await fetch(
      `https://indianrailways.sashidhar.com/trains/between?src=${fromCode}&dst=${toCode}&date=${today}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const data = await res.json();
      return { from, to, trains: data.trains?.slice(0, 5), book_link: irctcLink };
    }
  } catch {}

  return {
    from, to,
    message: `${from} → ${to} trains`,
    book_link: irctcLink,
    search_link: `https://etrain.info/trains-between-stations?src=${from}&dst=${to}`,
    note: 'IRCTC link pe book karo, ya 139 call karo'
  };
}

// ─── Bus Booking ──────────────────────────────────────────
export function getBusInfo(destination: string): any {
  const dest = destination.toLowerCase();
  const route = REWA_BUS_ROUTES.find(r => 
    r.destination.toLowerCase().includes(dest) || dest.includes(r.destination.toLowerCase())
  );
  
  return {
    found: !!route,
    route,
    all_routes: !route ? REWA_BUS_ROUTES.slice(0, 5) : undefined,
    book_online: {
      redbus: `https://www.redbus.in/bus-tickets/rewa-to-${destination.toLowerCase()}`,
      abhibus: `https://www.abhibus.com/bus/rewa/${destination.toLowerCase()}`,
    },
    terminal: 'Rewa Bus Stand, Station Road',
    helpline: 'MPSRTC: 0755-2570030'
  };
}

// ─── Flight Info (nearest airports) ─────────────────────
export const NEAREST_AIRPORTS = [
  { name: 'Jabalpur Airport (JLR)', distance: '170 km', drive: '3 hrs', airlines: ['Air India', 'IndiGo', 'SpiceJet'] },
  { name: 'Allahabad Airport (IXD)', distance: '200 km', drive: '4 hrs', airlines: ['Air India', 'IndiGo'] },
  { name: 'Bhopal Airport (BHO)', distance: '500 km', drive: '8 hrs', airlines: ['Air India', 'IndiGo', 'Vistara', 'SpiceJet'] },
  { name: 'Varanasi Airport (VNS)', distance: '260 km', drive: '5 hrs', airlines: ['Air India', 'IndiGo', 'SpiceJet', 'Vistara'] },
];

export function getFlightInfo(destination: string): any {
  return {
    nearest_airports: NEAREST_AIRPORTS,
    search_flights: {
      google_flights: `https://www.google.com/flights?from=JLR&to=${destination}&hl=hi`,
      makemytrip: `https://www.makemytrip.com/flights/domestic/fly-from-jlr-to-${destination.toLowerCase()}.html`,
      ixigo: `https://www.ixigo.com/flights/search?from=JLR&to=${destination}`,
    },
    tip: 'रीवा का closest airport Jabalpur (JLR) है — 3 घंटे की drive'
  };
}
