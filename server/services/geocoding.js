const DEFAULT_TIMEOUT_MS = 5_000;
const DEVELOPMENT_PROVIDER_URL = 'https://nominatim.openstreetmap.org';
let providerWarningEmitted = false;

const validCoordinate = (value, max) => Number.isFinite(value) && Math.abs(value) <= max;
const providerBaseUrl = override => {
  const configured = String(override ?? process.env.GEOCODING_BASE_URL ?? '').trim();
  const candidate = configured || (process.env.NODE_ENV === 'production' ? '' : DEVELOPMENT_PROVIDER_URL);
  if (!candidate) {
    if (!providerWarningEmitted) console.warn('[Geocoding] Disabled: GEOCODING_BASE_URL is required in production to avoid leaking patient addresses to an unapproved provider');
    providerWarningEmitted = true;
    return null;
  }
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
    return candidate.replace(/\/$/, '');
  } catch {
    if (!providerWarningEmitted) console.warn('[Geocoding] Disabled: GEOCODING_BASE_URL must be a valid HTTP(S) URL');
    providerWarningEmitted = true;
    return null;
  }
};
if (process.env.NODE_ENV === 'production' && !process.env.GEOCODING_BASE_URL) providerBaseUrl();

/**
 * Resolve an address through Nominatim. A failed or ambiguous lookup returns
 * null: callers must ask for coordinates instead of inventing a location.
 */
export async function geocodeAddress(addressText, options = {}) {
  const address = String(addressText || '').trim();
  if (!address) return null;

  const timeoutMs = Number(options.timeoutMs || process.env.GEOCODING_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const city = String(options.city ?? process.env.DEFAULT_CITY ?? '').trim();
  const country = String(options.country ?? process.env.DEFAULT_COUNTRY ?? '').trim();
  const query = encodeURIComponent([address, city, country].filter(Boolean).join(', '));
  const baseUrl = providerBaseUrl(options.baseUrl);
  if (!baseUrl) return null;
  const url = `${baseUrl}/search?format=json&addressdetails=1&q=${query}&limit=1`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json',
        'User-Agent': process.env.GEOCODING_USER_AGENT || 'MedTracker-Ambulance-App/1.0'
      }
    });
    if (!response.ok) return null;

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;
    if (first?.lat === '' || first?.lat === null || first?.lat === undefined || first?.lon === '' || first?.lon === null || first?.lon === undefined) return null;
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (!validCoordinate(lat, 90) || !validCoordinate(lng, 180)) return null;

    return { lat, lng, displayName: String(first.display_name || address) };
  } catch (error) {
    console.warn('[Geocoding] Lookup failed:', error.message);
    return null;
  }
}
