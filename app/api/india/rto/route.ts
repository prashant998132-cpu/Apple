// app/api/india/rto/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { lookupVehicle, checkChallan } from '../../../../lib/india/rto';

export async function POST(req: NextRequest) {
  const { registration, type } = await req.json();
  if (!registration) return NextResponse.json({ error: 'Registration required' }, { status: 400 });
  if (type === 'challan') return NextResponse.json(await checkChallan(registration));
  return NextResponse.json(await lookupVehicle(registration));
}
