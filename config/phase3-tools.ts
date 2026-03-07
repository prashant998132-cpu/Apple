// config/phase3-tools.ts
// Phase 3 additions — India-specific tools for Gemini function calling

export const PHASE3_TOOLS = [
  {
    name: 'lookup_vehicle_rto',
    description: 'Look up any Indian vehicle registration number. Get owner state, RTO, make, model, insurance validity, challan info.',
    parameters: {
      type: 'object',
      properties: {
        registration: { type: 'string', description: 'Vehicle registration like MP20AB1234' },
        check_challan: { type: 'boolean', description: 'Also check pending challans' }
      },
      required: ['registration']
    }
  },
  {
    name: 'search_trains',
    description: 'Search trains between any two Indian cities. Returns train list, timings, class, booking link. Rewa trains pre-loaded.',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Source city. Default: Rewa' },
        to: { type: 'string', description: 'Destination city' },
      },
      required: ['to']
    }
  },
  {
    name: 'get_bus_info',
    description: 'Get bus routes from Rewa, timings, fares, frequency. Links to RedBus/AbhiBus booking.',
    parameters: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Bus destination city' }
      },
      required: ['destination']
    }
  },
  {
    name: 'get_municipal_service',
    description: 'Get Rewa Nagar Palika or MP Government service info: water bill, property tax, bijli, certificates, Sambal, Ladli Laxmi, scholarships.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Service needed: water bill, property tax, birth certificate, ration card, scholarship, etc.' }
      },
      required: ['query']
    }
  },
  {
    name: 'send_telegram_notification',
    description: 'Send a message via Telegram Bot to the configured chat. Use for important alerts or reminders.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to send via Telegram' }
      },
      required: ['message']
    }
  },
  {
    name: 'get_whatsapp_link',
    description: 'Generate a WhatsApp link to send message to any phone number. Opens WhatsApp directly.',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Indian phone number (10 digits)' },
        message: { type: 'string', description: 'Message text' }
      },
      required: ['phone', 'message']
    }
  },
];

// Auto-trigger keywords for Phase 3 tools
export const PHASE3_KEYWORDS: Record<string, string[]> = {
  lookup_vehicle_rto: ['RC', 'registration', 'vehicle', 'गाड़ी नंबर', 'challan', 'चालान', 'RTO', 'insurance check', 'MP20', 'number plate'],
  search_trains: ['train', 'ट्रेन', 'railway', 'IRCTC', 'रेलवे', 'Rewa se', 'Delhi जाना', 'Mumbai train', '139', 'Mahakoshal', 'Shridham'],
  get_bus_info: ['bus', 'बस', 'MSRTC', 'SRTC', 'redbus', 'ticket', 'Bhopal bus', 'Jabalpur bus'],
  get_municipal_service: ['nagar palika', 'नगर पालिका', 'water bill', 'पानी का बिल', 'bijli bill', 'property tax', 'birth certificate', 'ration', 'sambal', 'ladli', 'scholarship', 'सरकारी', 'e-district'],
  send_telegram_notification: ['telegram', 'notify me', 'send message', 'alert', 'notification भेजो'],
  get_whatsapp_link: ['whatsapp', 'wa.me', 'whatsapp send', 'WhatsApp पर भेजो'],
};
