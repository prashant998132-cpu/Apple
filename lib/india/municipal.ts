// lib/india/municipal.ts
// Rewa Municipal Corporation + MP Government Services
// Water bill, property tax, complaint, contacts

export interface MunicipalService {
  name: string;
  description: string;
  url: string;
  phone?: string;
  howTo?: string;
}

// ─── Rewa Nagar Palika Services ───────────────────────────
export const REWA_MUNICIPAL: Record<string, MunicipalService> = {
  water_bill: {
    name: 'जल बिल',
    description: 'पानी का बिल online देखो और भरो',
    url: 'https://mpwrd.gov.in/',
    phone: '07662-230013',
    howTo: 'Site खोलो → Consumer Number डालो → Bill देखो → Online pay करो'
  },
  property_tax: {
    name: 'संपत्ति कर',
    description: 'Property tax view और payment',
    url: 'https://www.mpenagarpalika.gov.in/',
    phone: '07662-230013',
    howTo: 'mpenagarpalika.gov.in → Rewa select करो → Property ID enter करो'
  },
  birth_certificate: {
    name: 'जन्म प्रमाणपत्र',
    description: 'Birth certificate apply/download',
    url: 'https://mpenagarpalika.gov.in/irj/portal',
    phone: '07662-230013',
    howTo: 'Portal → Birth Certificate → Application form भरो'
  },
  death_certificate: {
    name: 'मृत्यु प्रमाणपत्र',
    description: 'Death certificate apply/download',
    url: 'https://mpenagarpalika.gov.in/',
    phone: '07662-230013',
    howTo: 'Portal → Death Certificate → Details भरो'
  },
  trade_license: {
    name: 'व्यापार लाइसेंस',
    description: 'Shop/business trade license',
    url: 'https://mpenagarpalika.gov.in/',
    phone: '07662-230013',
    howTo: 'Portal → Trade License → Application भरो → Fee pay करो'
  },
  complaint: {
    name: 'शिकायत',
    description: 'Nagar Palika complaint register करो',
    url: 'https://cmhelpline.mp.gov.in/',
    phone: '181',
    howTo: 'CM Helpline 181 call करो या online complaint दर्ज करो'
  },
  grievance: {
    name: 'MP CM Helpline',
    description: 'कोई भी सरकारी शिकायत',
    url: 'https://cmhelpline.mp.gov.in/',
    phone: '181',
    howTo: '181 toll-free call करो — 24/7 available'
  },
};

// ─── MP Government Services ───────────────────────────────
export const MP_GOVT_SERVICES: Record<string, MunicipalService> = {
  sambal: {
    name: 'संबल योजना',
    description: 'असंगठित मजदूरों के लिए सरकारी योजना',
    url: 'https://sambal.mp.gov.in/',
    phone: '181',
    howTo: 'sambal.mp.gov.in → Registration number → Status check'
  },
  ladli_laxmi: {
    name: 'लाड़ली लक्ष्मी योजना',
    description: 'बेटियों के लिए financial security scheme',
    url: 'https://ladlilaxmi.mp.gov.in/',
    phone: '07552-550-340',
    howTo: 'ladlilaxmi.mp.gov.in → Certificate download → Registration number डालो'
  },
  ration_card: {
    name: 'राशन कार्ड',
    description: 'Ration card status, new application, correction',
    url: 'https://rationmitra.nic.in/',
    phone: '181',
    howTo: 'rationmitra.nic.in → MP select → Ration card number डालो'
  },
  digilocker: {
    name: 'DigiLocker',
    description: 'Documents digitally store करो (Aadhar, DL, RC)',
    url: 'https://digilocker.gov.in/',
    phone: '1800-3000-3468',
    howTo: 'App download करो → Aadhar से login करो → Documents add करो'
  },
  udyam: {
    name: 'उद्यम Registration',
    description: 'MSME/Business registration',
    url: 'https://udyamregistration.gov.in/',
    howTo: 'Aadhar number → OTP → Business details → Certificate instant'
  },
  e_district: {
    name: 'E-District MP',
    description: 'Domicile, Income, Caste certificate',
    url: 'https://mpedistrict.gov.in/',
    phone: '0755-2700800',
    howTo: 'Portal → Apply → Documents upload → Status track'
  },
  pm_kisan: {
    name: 'PM Kisan योजना',
    description: 'किसान beneficiary status check',
    url: 'https://pmkisan.gov.in/',
    howTo: 'pmkisan.gov.in → Beneficiary Status → Aadhar/Account number'
  },
  scholarship: {
    name: 'MP Scholarship',
    description: 'School/College scholarship status',
    url: 'https://scholarshipportal.mp.nic.in/',
    phone: '0755-2550762',
    howTo: 'Portal → Track Application → Registration ID डालो'
  },
};

// ─── MPPKVVCL (Bijli) ────────────────────────────────────
export const BIJLI_SERVICES = {
  name: 'MPPKVVCL — Rewa Bijli',
  bill_pay: {
    url: 'https://mpez.co.in/',
    description: 'Online bijli bill payment',
    howTo: 'mpez.co.in → Pay Bill → Consumer ID डालो → Pay'
  },
  new_connection: {
    url: 'https://mppkvvcl.nic.in/',
    description: 'नया बिजली connection',
    phone: '1912',
    howTo: 'Online apply या helpline call करो'
  },
  complaint: {
    description: 'Power cut, fault complaint',
    phone: '1912',
    whatsapp: 'WhatsApp: 7024999090',
    helpline: '1912 (24 hrs free)',
    app: 'MPPKVVCL Mobile App available'
  },
  outage_schedule: {
    description: 'Planned maintenance schedule',
    url: 'https://mppkvvcl.nic.in/',
    note: 'Daily schedule website pe ya helpline pe available'
  }
};

// ─── Lookup function ─────────────────────────────────────
export function getMunicipalInfo(query: string): any {
  const q = query.toLowerCase();
  
  if (q.includes('water') || q.includes('पानी') || q.includes('jal') || q.includes('जल')) return REWA_MUNICIPAL.water_bill;
  if (q.includes('property') || q.includes('संपत्ति') || q.includes('tax') || q.includes('ghar ka tax')) return REWA_MUNICIPAL.property_tax;
  if (q.includes('birth') || q.includes('जन्म')) return REWA_MUNICIPAL.birth_certificate;
  if (q.includes('death') || q.includes('मृत्यु')) return REWA_MUNICIPAL.death_certificate;
  if (q.includes('bijli') || q.includes('बिजली') || q.includes('light') || q.includes('power')) return BIJLI_SERVICES;
  if (q.includes('ration') || q.includes('राशन')) return MP_GOVT_SERVICES.ration_card;
  if (q.includes('sambal') || q.includes('संबल')) return MP_GOVT_SERVICES.sambal;
  if (q.includes('ladli') || q.includes('लाड़ली')) return MP_GOVT_SERVICES.ladli_laxmi;
  if (q.includes('complaint') || q.includes('शिकायत') || q.includes('complain')) return REWA_MUNICIPAL.complaint;
  if (q.includes('scholarship') || q.includes('छात्रवृत्ति')) return MP_GOVT_SERVICES.scholarship;
  if (q.includes('certificate') || q.includes('प्रमाणपत्र')) return MP_GOVT_SERVICES.e_district;
  if (q.includes('kisan') || q.includes('farmer') || q.includes('किसान')) return MP_GOVT_SERVICES.pm_kisan;
  
  // Return all services list
  return {
    rewa_services: Object.values(REWA_MUNICIPAL).map(s => ({ name: s.name, url: s.url, phone: s.phone })),
    mp_services: Object.values(MP_GOVT_SERVICES).map(s => ({ name: s.name, url: s.url })),
    bijli: { phone: '1912', url: BIJLI_SERVICES.bill_pay.url },
    helpline: 'CM Helpline: 181 (24/7)'
  };
}
