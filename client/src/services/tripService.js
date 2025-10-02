// Trip service to handle API calls
const getApiUrl = async () => {
  const ports = [5001, 5002, 5003]; // Potential ports
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost";

  // Try each port
  for (const port of ports) {
    try {
      const response = await fetch(`${baseUrl}:${port}/`);
      if (response.ok) {
        return `${baseUrl}:${port}/api`;
      }
    } catch (err) {
      console.log(`Port ${port} not available`);
    }
  }
  throw new Error("Unable to connect to server");
};

let API_URL = null;

// Helper function for API requests
const fetchWithHeaders = async (endpoint, options = {}) => {
  // Get API URL if not already set
  if (!API_URL) {
    API_URL = await getApiUrl();
  }
  try {
    console.log(`Making API request to: ${API_URL}${endpoint}`);
    console.log("Request options:", options);

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || "Unknown error occurred";
      } catch (e) {
        errorMessage = (await response.text()) || "Failed to create trip";
      }
      console.error("API error response:", errorMessage);
      throw new Error(errorMessage);
    }

    const jsonResponse = await response.json();
    console.log("API response:", jsonResponse);
    return jsonResponse;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
};

// Trip service object with all methods
export const tripService = {
  // Create a new trip
  createTrip: async (tripData) => {
    return fetchWithHeaders("/trips", {
      method: "POST",
      body: JSON.stringify(tripData),
    });
  },

  // Get all trips
  getAllTrips: async () => {
    return fetchWithHeaders("/trips");
  },

  // Get a single trip by ID
  getTripById: async (tripId) => {
    return fetchWithHeaders(`/trips/${tripId}`);
  },

  // Update a trip
  updateTrip: async (tripId, tripData) => {
    return fetchWithHeaders(`/trips/${tripId}`, {
      method: "PUT",
      body: JSON.stringify(tripData),
    });
  },

  // Delete a trip
  deleteTrip: async (tripId) => {
    return fetchWithHeaders(`/trips/${tripId}`, {
      method: "DELETE",
    });
  },

  // Add a location point to a trip
  addLocationPoint: async (tripId, pointData) => {
    return fetchWithHeaders(`/trips/${tripId}/point`, {
      method: "POST",
      body: JSON.stringify(pointData),
    });
  },

  // End a trip
  endTrip: async (tripId) => {
    return fetchWithHeaders(`/trips/${tripId}/end`, {
      method: "POST",
    });
  },
};
