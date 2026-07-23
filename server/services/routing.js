/**
 * Real Road Routing Service using OSRM (Open Source Routing Machine) API
 * Calculates actual driving geometry along real streets in Almaty, Kazakhstan
 */

export async function fetchRealRoadRoute(startLoc, endLoc) {
  try {
    // OSRM expects coordinates in lng,lat format
    const url = `https://router.project-osrm.org/route/v1/driving/${startLoc.lng},${startLoc.lat};${endLoc.lng},${endLoc.lat}?overview=full&geometries=geojson`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MedTracker-Ambulance-App'
      }
    });

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // Convert OSRM GeoJSON [lng, lat] back to [lat, lng] for Leaflet
      const routeCoordinates = route.geometry.coordinates.map(coord => ({
        lat: coord[1],
        lng: coord[0]
      }));

      return {
        path: routeCoordinates,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        distanceKm: parseFloat((route.distance / 1000).toFixed(1)),
        etaMinutes: Math.ceil(route.duration / 60)
      };
    }
  } catch (error) {
    console.warn('[Routing Service] OSRM fallback activated:', error.message);
  }

  // Fallback linear interpolation if OSRM is unreachable
  return {
    path: [
      { lat: startLoc.lat, lng: startLoc.lng },
      { lat: (startLoc.lat + endLoc.lat) / 2, lng: (startLoc.lng + endLoc.lng) / 2 },
      { lat: endLoc.lat, lng: endLoc.lng }
    ],
    distanceKm: 2.5,
    etaMinutes: 7
  };
}
