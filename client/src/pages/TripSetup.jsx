import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { tripService } from "../services/tripService";
import { getCurrentLocation, isWithinRadius } from "../utils/geolocationUtils";
import "../App.css";

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// MapEvents component to handle map interactions
function MapEvents({ onLocationSet }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSet({
        lat,
        lng,
        placeName: "Selected Location",
      });
    },
  });
  return null;
}

function TripSetup() {
  const navigate = useNavigate();
  const [tripTitle, setTripTitle] = useState("");
  const [destination, setDestination] = useState(null);
  const [radius, setRadius] = useState(500);
  const [etaOffset, setEtaOffset] = useState(0);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isTripActive, setIsTripActive] = useState(false);
  const [distanceToDestination, setDistanceToDestination] = useState(null);

  const mapRef = useRef(null);
  const alarmAudioRef = useRef(null);
  const watchIdRef = useRef(null);
  const searchContainerRef = useRef(null);
  const alarmVibrateRef = useRef(null);

  // Load settings and initialize location on component mount
  useEffect(() => {
    // Initialize audio with wind-up clock sound
    alarmAudioRef.current = new Audio("/wind-up-clock-alarm-bell-64219.mp3");
    alarmAudioRef.current.loop = true; // Enable looping
    alarmAudioRef.current.preload = "auto";

    // Load settings
    const savedSettings = localStorage.getItem("wakeme-settings");
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      setRadius(parsedSettings.defaultRadius || 500);
      alarmAudioRef.current.volume = parsedSettings.alarmVolume || 0.8;
    } else {
      const defaultSettings = {
        defaultRadius: 500,
        alarmVolume: 0.8,
        vibrateEnabled: true,
        highAccuracy: true,
      };
      setSettings(defaultSettings);
      alarmAudioRef.current.volume = 0.8;
    }

    // Load the audio file
    alarmAudioRef.current.load();

    // Check for existing trip
    const savedTrip = localStorage.getItem("current-trip");
    if (savedTrip) {
      const tripData = JSON.parse(savedTrip);
      setTripTitle(tripData.title);
      setDestination(tripData.destination);
      setRadius(tripData.radiusMeters);
      setEtaOffset(tripData.etaOffsetMinutes);
      setIsTripActive(true);
    }

    // Cleanup
    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current = null;
      }
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Initialize location
  useEffect(() => {
    const initLocation = async () => {
      try {
        setLoading(true);
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        setLoading(false);
      } catch (err) {
        setError("Failed to get location");
        console.error(err);
        setLoading(false);
      }
    };

    initLocation();
  }, []);

  // Start monitoring location when trip is active
  useEffect(() => {
    if (!isTripActive || !destination || !currentLocation) return;

    const audio = alarmAudioRef.current;

    // Function to calculate distance using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371000; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Function to check distance and trigger alarm
    const checkDistance = (position) => {
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // Update current location marker
      if (mapRef.current) {
        setCurrentLocation(userLocation);
      }

      // Calculate distance to destination
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        destination.lat,
        destination.lng
      );
      setDistanceToDestination(distance);

      // Check if within radius and trigger alarm
      if (distance <= radius) {
        if (!isAlarmActive) {
          setIsAlarmActive(true);
          // Try to play the alarm with loop
          audio.loop = true;
          audio.play().catch((error) => {
            console.error("Failed to play alarm:", error);
            // If autoplay is blocked, try again after user interaction with the stop button
            if (error.name === "NotAllowedError") {
              audio
                .play()
                .catch((e) => console.error("Second play attempt failed:", e));
            }
          });

          // Vibrate if supported (will loop)
          if (navigator.vibrate && settings?.vibrateEnabled) {
            const vibrateInterval = setInterval(() => {
              navigator.vibrate([200, 100, 200]);
            }, 1000);
            // Store the interval ID for cleanup
            alarmVibrateRef.current = vibrateInterval;
          }

          // Show notification
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("Wake Up!", {
              body: "You're near your destination!",
              icon: "/vite.svg",
              requireInteraction: true, // Keep notification until user interacts
            });
          }
        }
      } else if (isAlarmActive) {
        setIsAlarmActive(false);
        handleStopAlarm(); // Use the centralized stop function
      }
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      checkDistance,
      (error) => console.error("Error watching position:", error),
      {
        enableHighAccuracy: settings?.highAccuracy !== false,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    // Cleanup
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (isAlarmActive) {
        setIsAlarmActive(false);
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [destination, radius, currentLocation, isAlarmActive]);

  // Handle click outside search results to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle location search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5`,
        {
          headers: {
            "User-Agent": "WakeMeUp/1.0",
          },
        }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setSearchResults(data);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error("Error searching for location:", error);
      setError("Failed to search for location");
    }
  };

  // Handle selecting a search result
  const handleSelectSearchResult = (result) => {
    setDestination({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      placeName: result.display_name,
    });
    setSearchQuery(result.display_name);
    setShowSearchResults(false);
    setError("");
  };

  // Handle stopping the alarm
  const handleStopAlarm = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }

    // Stop vibration
    if (alarmVibrateRef.current) {
      clearInterval(alarmVibrateRef.current);
      alarmVibrateRef.current = null;
      if (navigator.vibrate) {
        navigator.vibrate(0); // Stop any ongoing vibration
      }
    }

    setIsAlarmActive(false);
  };

  // Handle stopping the trip
  const handleStopTrip = (e) => {
    e.preventDefault();
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Save completed trip to history
    const currentTrip = JSON.parse(localStorage.getItem("current-trip"));
    if (currentTrip) {
      const completedTrip = {
        ...currentTrip,
        endTime: new Date().toISOString(),
        _id: Date.now().toString(), // Generate a unique ID
        createdAt: currentTrip.startTime,
        endedAt: new Date().toISOString(),
      };

      // Get existing trips from history
      const existingTrips = JSON.parse(
        localStorage.getItem("trip-history") || "[]"
      );

      // Add new trip to history
      existingTrips.push(completedTrip);
      localStorage.setItem("trip-history", JSON.stringify(existingTrips));
    }

    setIsTripActive(false);
    handleStopAlarm();
    localStorage.removeItem("current-trip");
  };

  // Handle trip submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!destination) {
      setError("Please select a destination");
      return;
    }

    try {
      // Request notification permission if not granted
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }

      setLoading(true);
      setError("");

      // Start trip tracking
      setIsTripActive(true);

      // Store trip data in localStorage
      const tripData = {
        title:
          tripTitle ||
          "Trip to " + (destination.placeName || "Selected Location"),
        start: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          placeName: destination.placeName || "Selected Location",
        },
        radiusMeters: radius,
        etaOffsetMinutes: etaOffset,
        startTime: new Date().toISOString(),
      };

      localStorage.setItem("current-trip", JSON.stringify(tripData));
      console.log("Trip tracking started:", tripData);

      setLoading(false);
    } catch (err) {
      setError("Failed to start trip: " + (err.message || "Unknown error"));
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-7xl mx-auto bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        <div className="p-8">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Wake-Me-Up Alarm
          </h1>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Map Section */}
            <div className="relative">
              <div className="h-96 lg:h-[600px] rounded-xl overflow-hidden shadow-lg ring-2 ring-blue-200/50 hover:ring-blue-300/70 transition-all duration-300">
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600 font-medium">
                        Loading map...
                      </p>
                    </div>
                  </div>
                )}
                {currentLocation && (
                  <MapContainer
                    center={[currentLocation.lat, currentLocation.lng]}
                    zoom={15}
                    className="w-full h-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MapEvents onLocationSet={setDestination} />

                    {/* Current location marker */}
                    <Marker
                      position={[currentLocation.lat, currentLocation.lng]}
                    >
                      <Popup>Your Location</Popup>
                    </Marker>

                    {/* Destination marker and circle */}
                    {destination && (
                      <>
                        <Marker position={[destination.lat, destination.lng]}>
                          <Popup>
                            {destination.placeName || "Destination"}
                          </Popup>
                        </Marker>
                        <Circle
                          center={[destination.lat, destination.lng]}
                          radius={radius}
                          pathOptions={{
                            fillColor: "#e74c3c",
                            fillOpacity: 0.2,
                            color: "#e74c3c",
                            weight: 2,
                          }}
                        />
                      </>
                    )}
                  </MapContainer>
                )}
              </div>
            </div>

            {/* Form Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Set Up Your Trip
              </h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3 animate-pulse-ring">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Trip Title */}
                <div className="space-y-2">
                  <label
                    htmlFor="trip-title"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Trip Title
                  </label>
                  <input
                    type="text"
                    id="trip-title"
                    value={tripTitle}
                    onChange={(e) => setTripTitle(e.target.value)}
                    placeholder="e.g. 'Work Commute'"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
                  />
                </div>

                {/* Destination Search */}
                <div className="space-y-2" ref={searchContainerRef}>
                  <label
                    htmlFor="destination-search"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Search for Destination
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="destination-search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery && setShowSearchResults(true)}
                      placeholder="Type to search places..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </button>
                  </div>

                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                          onClick={() => handleSelectSearchResult(result)}
                        >
                          <p className="text-gray-800 text-sm">
                            {result.display_name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Destination */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Selected Destination
                  </label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    {destination ? (
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">
                          {destination.placeName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {destination.lat.toFixed(6)},{" "}
                          {destination.lng.toFixed(6)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">
                        Click on the map or search to select a destination
                      </p>
                    )}
                  </div>
                </div>

                {/* Wake-up Radius */}
                <div className="space-y-3">
                  <label
                    htmlFor="radius"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Wake-up Radius:{" "}
                    <span className="font-semibold text-blue-600">
                      {radius} meters
                    </span>
                  </label>
                  <input
                    type="range"
                    id="radius"
                    min="100"
                    max="2000"
                    step="50"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>100m</span>
                    <span>1000m</span>
                    <span>2000m</span>
                  </div>
                </div>

                {/* ETA Offset */}
                <div className="space-y-3">
                  <label
                    htmlFor="eta-offset"
                    className="block text-sm font-medium text-gray-700"
                  >
                    ETA Offset:{" "}
                    <span className="font-semibold text-blue-600">
                      {etaOffset} minutes
                    </span>
                  </label>
                  <input
                    type="range"
                    id="eta-offset"
                    min="0"
                    max="30"
                    step="5"
                    value={etaOffset}
                    onChange={(e) => setEtaOffset(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span>15</span>
                    <span>30</span>
                  </div>
                </div>

                {/* Distance Display */}
                {isTripActive && distanceToDestination !== null && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="text-blue-800 font-medium">
                      Distance to destination:{" "}
                      {Math.round(distanceToDestination)} meters
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || (!destination && !isTripActive)}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 transform ${
                    loading || (!destination && !isTripActive)
                      ? "bg-gray-400 cursor-not-allowed"
                      : isTripActive
                      ? "bg-red-600 hover:bg-red-700 hover:scale-105 hover:shadow-lg active:scale-95 ring-4 ring-red-200/50 hover:ring-red-300/70"
                      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 hover:shadow-lg active:scale-95 ring-4 ring-blue-200/50 hover:ring-blue-300/70"
                  }`}
                  onClick={isTripActive ? handleStopTrip : undefined}
                >
                  {loading ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>
                        {isTripActive ? "Stopping Trip..." : "Starting Trip..."}
                      </span>
                    </span>
                  ) : isTripActive ? (
                    "Stop Trip"
                  ) : (
                    "Start Trip"
                  )}
                </button>
              </form>

              {/* Trip History Link */}
              <div className="text-center pt-4">
                <a
                  href="/trip-history"
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 hover:underline"
                >
                  View Past Trips
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alarm Stop Button Overlay */}
      {isAlarmActive && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={handleStopAlarm}
            className="px-6 py-4 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg flex items-center space-x-2"
          >
            <span>🔕</span>
            <span>Stop Alarm</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default TripSetup;
