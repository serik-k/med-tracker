const DEFAULT_TIMEOUT_MS = 5_000;
const DEVELOPMENT_PROVIDER_URL = 'https://router.project-osrm.org';
let providerWarningEmitted = false;

const isLocation = value => value
  && value.lat !== '' && value.lat !== null && value.lat !== undefined
  && value.lng !== '' && value.lng !== null && value.lng !== undefined
  && Number.isFinite(Number(value.lat))
  && Number.isFinite(Number(value.lng))
  && Math.abs(Number(value.lat)) <= 90
  && Math.abs(Number(value.lng)) <= 180;
const providerBaseUrl = override => {
  const configured = String(override ?? process.env.OSRM_BASE_URL ?? '').trim();
  const candidate = configured || (process.env.NODE_ENV === 'production' ? '' : DEVELOPMENT_PROVIDER_URL);
  if (!candidate) {
    if (!providerWarningEmitted) console.warn('[Routing] Disabled: OSRM_BASE_URL is required in production to avoid leaking patient coordinates to an unapproved provider');
    providerWarningEmitted = true;
    return null;
  }
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
    return candidate.replace(/\/$/, '');
  } catch {
    if (!providerWarningEmitted) console.warn('[Routing] Disabled: OSRM_BASE_URL must be a valid HTTP(S) URL');
    providerWarningEmitted = true;
    return null;
  }
};
if (process.env.NODE_ENV === 'production' && !process.env.OSRM_BASE_URL) providerBaseUrl();

/**
 * Calculate a road route. No synthetic distance or ETA is returned when OSRM
 * is unavailable; stale/fabricated medical arrival estimates are unsafe.
 */
export async function fetchRealRoadRoute(startLoc, endLoc, options = {}) {
  if (!isLocation(startLoc) || !isLocation(endLoc)) return null;

  const start = { lat: Number(startLoc.lat), lng: Number(startLoc.lng) };
  const end = { lat: Number(endLoc.lat), lng: Number(endLoc.lng) };
  const timeoutMs = Number(options.timeoutMs || process.env.ROUTING_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const baseUrl = providerBaseUrl(options.baseUrl);
  if (!baseUrl) return null;
  const url = `${baseUrl}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json', 'User-Agent': 'MedTracker-Ambulance-App/1.0' }
    });
    if (!response.ok) return null;

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route || !Array.isArray(route.geometry?.coordinates)) return null;
    if (!Number.isFinite(route.distance) || !Number.isFinite(route.duration)) return null;

    const path = route.geometry.coordinates
      .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
      .filter(isLocation);
    if (path.length < 2) return null;

    return {
      path,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      distanceKm: Number((route.distance / 1000).toFixed(1)),
      etaMinutes: Math.max(1, Math.ceil(route.duration / 60))
    };
  } catch (error) {
    console.warn('[Routing] Route unavailable:', error.message);
    return null;
  }
}
