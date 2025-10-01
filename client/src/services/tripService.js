// Trip service to handle API calls
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'; // Changed from 5000 to 5001

// Helper function for API requests
const fetchWithHeaders = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Trip service object with all methods
export const tripService = {
  // Create a new trip
  createTrip: async (tripData) => {
    return fetchWithHeaders('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
  },

  // Get all trips
  getAllTrips: async () => {
    return fetchWithHeaders('/trips');
  },

  // Get a single trip by ID
  getTripById: async (tripId) => {
    return fetchWithHeaders(`/trips/${tripId}`);
  },

  // Update a trip
  updateTrip: async (tripId, tripData) => {
    return fetchWithHeaders(`/trips/${tripId}`, {
      method: 'PUT',
      body: JSON.stringify(tripData),
    });
  },

  // Delete a trip
  deleteTrip: async (tripId) => {
    return fetchWithHeaders(`/trips/${tripId}`, {
      method: 'DELETE',
    });
  },

  // Add a location point to a trip
  addLocationPoint: async (tripId, pointData) => {
    return fetchWithHeaders(`/trips/${tripId}/point`, {
      method: 'POST',
      body: JSON.stringify(pointData),
    });
  },

  // End a trip
  endTrip: async (tripId) => {
    return fetchWithHeaders(`/trips/${tripId}/end`, {
      method: 'POST',
    });
  },
};