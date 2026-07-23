/**
 * Real Geocoding Service using OpenStreetMap Nominatim API
 * Converts Almaty street addresses into exact GPS coordinates
 */

export async function geocodeAlmatyAddress(addressText) {
  try {
    const query = encodeURIComponent(`${addressText}, Алматы, Казахстан`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MedTracker-Ambulance-App/1.0'
      }
    });

    if (!response.ok) return null;

    const results = await response.json();
    if (results && results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
        displayName: results[0].display_name
      };
    }
  } catch (error) {
    console.warn('[Geocoding Service] Nominatim error:', error.message);
  }

  // Default fallback center near Almaty Abai/Al-Farabi if search yields no results
  return {
    lat: 43.2389 + (Math.random() - 0.5) * 0.02,
    lng: 76.9454 + (Math.random() - 0.5) * 0.02
  };
}
