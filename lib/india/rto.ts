// lib/india/rto.ts
// RTO Vehicle Registration Lookup — Free, no key needed
// Uses public Vahaan/RTO data via DuckDuckGo + direct APIs

export interface VehicleInfo {
  registration: string;
  owner?: string;
  make?: string;
  model?: string;
  color?: string;
  fuel?: string;
  rto?: string;
  state?: string;
  registrationDate?: string;
  validity?: string;
  insurance?: string;
  fitness?: string;
  taxValid?: string;
  vehicleClass?: string;
  status?: string;
}

// Indian state codes from registration number
const STATE_CODES: Record<string, string> = {
  MP: 'Madhya Pradesh', UP: 'Uttar Pradesh', MH: 'Maharashtra',
  DL: 'Delhi', RJ: 'Rajasthan', GJ: 'Gujarat', KA: 'Karnataka',
  TN: 'Tamil Nadu', WB: 'West Bengal', AP: 'Andhra Pradesh',
  HR: 'Haryana', PB: 'Punjab', BR: 'Bihar', OR: 'Odisha',
  KL: 'Kerala', AS: 'Assam', JH: 'Jharkhand', CG: 'Chhattisgarh',
  UK: 'Uttarakhand', HP: 'Himachal Pradesh', JK: 'Jammu & Kashmir',
  GA: 'Goa', MN: 'Manipur', ML: 'Meghalaya', NL: 'Nagaland',
  SK: 'Sikkim', TR: 'Tripura', AR: 'Arunachal Pradesh', MZ: 'Mizoram',
};

// MP RTO codes
const MP_RTO_CODES: Record<string, string> = {
  'MP20': 'Rewa', 'MP21': 'Satna', 'MP22': 'Sidhi', 'MP23': 'Singrauli',
  'MP04': 'Bhopal', 'MP09': 'Indore', 'MP12': 'Jabalpur', 'MP19': 'Gwalior',
  'MP30': 'Sagar', 'MP48': 'Umaria', 'MP49': 'Anuppur', 'MP50': 'Shahdol',
};

export function parseRegistration(reg: string): { state: string; rto: string; series: string; number: string } | null {
  const clean = reg.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
  const match = clean.match(/^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{4})$/);
  if (!match) return null;
  
  const [, stateCode, rtoNum, series, num] = match;
  const rtoCode = stateCode + rtoNum;
  
  return {
    state: STATE_CODES[stateCode] || stateCode,
    rto: MP_RTO_CODES[rtoCode] || `RTO ${rtoCode}`,
    series,
    number: num
  };
}

export async function lookupVehicle(registration: string): Promise<VehicleInfo> {
  const clean = registration.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
  const parsed = parseRegistration(clean);
  
  // Try Vahaan API (Government of India - public)
  try {
    const res = await fetch(
      `https://vahan.parivahan.gov.in/vahan4dashboard/vahan/api/vehicleDetail?regNo=${clean}`,
      {
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        signal: AbortSignal.timeout(8000)
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.vehicleDetails) {
        const v = data.vehicleDetails;
        return {
          registration: clean,
          make: v.maker_desc || v.model?.split(' ')[0],
          model: v.model,
          color: v.color,
          fuel: v.fuel_desc || v.fuel_type,
          rto: v.office_name || parsed?.rto,
          state: v.state_name || parsed?.state,
          registrationDate: v.reg_date,
          validity: v.reg_valid_upto,
          insurance: v.insurance_upto,
          fitness: v.fitness_upto,
          taxValid: v.tax_upto,
          vehicleClass: v.vch_class_desc,
          status: v.status
        };
      }
    }
  } catch {}

  // Fallback — provide what we can from registration number
  if (parsed) {
    return {
      registration: clean,
      state: parsed.state,
      rto: `${parsed.rto} RTO`,
      status: 'Basic info only — Vahaan API unavailable',
      make: 'Check on https://parivahan.gov.in',
    };
  }

  return {
    registration: clean,
    status: 'Invalid registration format',
    make: 'Format: MP20AB1234'
  };
}

// Challan check (traffic fines)
export async function checkChallan(registration: string): Promise<any> {
  const clean = registration.toUpperCase().replace(/\s+/g, '');
  return {
    registration: clean,
    challan_check_url: `https://echallan.parivahan.gov.in/index/accused-challan?regNo=${clean}`,
    note: 'Official Government challan portal link',
    how_to: 'Link खोलो → Registration number enter करो → Pending challans देखो'
  };
}

// Driving License verification  
export async function verifyDL(dlNumber: string): Promise<any> {
  return {
    dl_number: dlNumber,
    verify_url: `https://sarathi.parivahan.gov.in/sarathiservice/dlSearchGridDetail.do`,
    note: 'Sarathi portal pe verify karo',
    how_to: 'Link खोलो → DL number enter करो → Details देखो'
  };
}
