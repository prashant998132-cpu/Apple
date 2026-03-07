// lib/tools/india/executor.ts
// Phase 3 India Tool Executors — plugs into existing tools-executor pattern

import { lookupVehicle, checkChallan } from '../../india/rto';
import { searchTrains, getBusInfo, getFlightInfo } from '../../india/transport';
import { getMunicipalInfo } from '../../india/municipal';
import { sendTelegram, getWhatsAppLink } from '../../india/notifications';

export async function executeIndiaTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'lookup_vehicle_rto': {
      const result = await lookupVehicle(args.registration);
      if (args.check_challan) {
        const challan = await checkChallan(args.registration);
        return { ...result, challan_check: challan };
      }
      return result;
    }
    case 'search_trains':
      return searchTrains(args.from || 'Rewa', args.to);
    case 'get_bus_info':
      return getBusInfo(args.destination);
    case 'get_flight_info':
      return getFlightInfo(args.destination);
    case 'get_municipal_service':
      return getMunicipalInfo(args.query);
    case 'send_telegram_notification': {
      const sent = await sendTelegram(args.message);
      return { sent, message: args.message, note: sent ? 'Telegram पर message गया!' : 'Telegram token set नहीं है।' };
    }
    case 'get_whatsapp_link': {
      const link = getWhatsAppLink(args.phone, args.message);
      return { link, phone: args.phone, message: args.message, note: 'Link खोलो → WhatsApp direct open होगा' };
    }
    default:
      return { error: `Unknown india tool: ${name}` };
  }
}

// Add Phase 3 keywords to router matching
export function matchPhase3Tools(query: string): string[] {
  const lower = query.toLowerCase();
  const matched: string[] = [];
  const keywords: Record<string, string[]> = {
    lookup_vehicle_rto: ['rc ', 'registration', 'vehicle', 'गाड़ी नंबर', 'challan', 'rto', 'mp20', 'mp09', 'number plate', 'insurance check'],
    search_trains: ['train', 'ट्रेन', 'railway', 'irctc', 'रेलवे', 'mahakoshal', 'shridham', 'lucknow express', 'jabalpur train'],
    get_bus_info: ['bus', 'बस', 'redbus', 'bus ticket', 'bhopal bus', 'jabalpur bus'],
    get_municipal_service: ['nagar palika', 'नगर पालिका', 'water bill', 'पानी का बिल', 'property tax', 'birth certificate', 'ration', 'sambal', 'ladli', 'scholarship', 'सरकारी सेवा', 'e-district', 'bijli bill'],
    send_telegram_notification: ['telegram', 'send alert', 'notify me', 'notification भेजो'],
    get_whatsapp_link: ['whatsapp', 'wa.me', 'whatsapp पर भेजो'],
  };
  for (const [tool, kws] of Object.entries(keywords)) {
    if (kws.some(kw => lower.includes(kw))) matched.push(tool);
  }
  return matched;
}
