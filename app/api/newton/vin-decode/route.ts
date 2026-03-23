import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get('vin');
  if (!vin || vin.length < 11) {
    return NextResponse.json({ error: 'Invalid VIN' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`,
      { next: { revalidate: 86400 } } // cache for 24 hours
    );
    const data = await res.json();

    const results = data.Results as { Variable: string; Value: string | null }[];
    const get = (name: string) => results?.find((r) => r.Variable === name)?.Value || null;

    const decoded = {
      make: get('Make'),
      model: get('Model'),
      modelYear: get('Model Year'),
      fuelTypePrimary: get('Fuel Type - Primary'),
      fuelTypeSecondary: get('Fuel Type - Secondary'),
      electrificationLevel: get('Electrification Level'),
      engineConfig: get('Engine Configuration'),
      driveType: get('Drive Type'),
      vehicleType: get('Vehicle Type'),
      displacementL: get('Displacement (L)'),
      engineCylinders: get('Engine Number of Cylinders'),
    };

    // Determine vehicle category
    const isHybrid = !!(
      decoded.electrificationLevel?.toLowerCase().includes('hybrid') ||
      decoded.electrificationLevel?.toLowerCase().includes('hev') ||
      decoded.fuelTypeSecondary?.toLowerCase().includes('electric')
    );
    const isElectric = !!(
      decoded.electrificationLevel?.toLowerCase().includes('bev') ||
      decoded.electrificationLevel?.toLowerCase().includes('battery') ||
      (decoded.fuelTypePrimary?.toLowerCase().includes('electric') && !isHybrid)
    );

    return NextResponse.json({
      ...decoded,
      isHybrid,
      isElectric,
      displayName: [decoded.modelYear, decoded.make, decoded.model].filter(Boolean).join(' '),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
