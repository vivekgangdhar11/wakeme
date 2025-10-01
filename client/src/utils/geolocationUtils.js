// Calculate distance between two points using Haversine formula
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = 
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Check if a point is within a radius of another point
export const isWithinRadius = (lat1, lng1, lat2, lng2, radiusMeters) => {
  const distance = calculateDistance(lat1, lng1, lat2, lng2);
  return distance <= radiusMeters;
};

// Format coordinates for display
export const formatCoordinates = (lat, lng) => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

// Format distance for display
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
};

// Mock location data for testing
export const getMockLocation = () => {
  // Random location near a sample area
  const baseLat = 40.7128; // New York City
  const baseLng = -74.0060;
  
  const randomOffset = 0.02; // Approximately 2km offset
  const lat = baseLat + (Math.random() - 0.5) * randomOffset;
  const lng = baseLng + (Math.random() - 0.5) * randomOffset;
  
  return { lat, lng };
};

// Get current location with fallback
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      // Fallback to mock location if geolocation is not available
      resolve(getMockLocation());
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Fallback to mock location on error
          resolve(getMockLocation());
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    }
  });
};