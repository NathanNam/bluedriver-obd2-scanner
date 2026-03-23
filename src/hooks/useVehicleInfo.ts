import { useState, useEffect } from 'react';

export interface VehicleInfo {
  make: string | null;
  model: string | null;
  modelYear: string | null;
  fuelTypePrimary: string | null;
  fuelTypeSecondary: string | null;
  electrificationLevel: string | null;
  engineConfig: string | null;
  driveType: string | null;
  displacementL: string | null;
  engineCylinders: string | null;
  isHybrid: boolean;
  isElectric: boolean;
  displayName: string;
}

let cachedInfo: VehicleInfo | null = null;
let cachedVin: string | null = null;

export function useVehicleInfo(vin: string | null) {
  const [info, setInfo] = useState<VehicleInfo | null>(cachedVin === vin ? cachedInfo : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vin || vin.length < 11) return;
    if (cachedVin === vin && cachedInfo) { setInfo(cachedInfo); return; }

    setLoading(true);
    fetch(`/api/newton/vin-decode?vin=${encodeURIComponent(vin)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          cachedInfo = data;
          cachedVin = vin;
          setInfo(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vin]);

  return { info, loading };
}
