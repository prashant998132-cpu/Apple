// app/api/india/transport/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { searchTrains, getBusInfo, getFlightInfo } from '../../../../lib/india/transport';

export async function POST(req: NextRequest) {
  const { from, to, type } = await req.json();
  if (!to) return NextResponse.json({ error: 'Destination required' }, { status: 400 });
  if (type === 'bus') return NextResponse.json(getBusInfo(to));
  if (type === 'flight') return NextResponse.json(getFlightInfo(to));
  return NextResponse.json(await searchTrains(from || 'Rewa', to));
}
