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
  const alarmAudioRef = useRef(new Audio("/alarm.mp3"));
  const watchIdRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Load settings and initialize location on component mount
  useEffect(() => {
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

  // Start monitoring location when destination is set
  useEffect(() => {
    if (!destination || !currentLocation) return;

    const audio = alarmAudioRef.current;

    // Function to check distance and trigger alarm
    const checkDistance = (position) => {
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      if (
        isWithinRadius(
          userLocation.lat,
          userLocation.lng,
          destination.lat,
          destination.lng,
          radius
        )
      ) {
        if (!isAlarmActive) {
          setIsAlarmActive(true);
          audio.play();
        }
      } else if (isAlarmActive) {
        setIsAlarmActive(false);
        audio.pause();
        audio.currentTime = 0;
      }
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      checkDistance,
      (error) => console.error("Error watching position:", error),
      { 
        enableHighAccuracy: settings?.highAccuracy !== false,
        maximumAge: 10000,
        timeout: 15000
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
    if (isAlarmActive) {
      setIsAlarmActive(false);
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
  };

  // Handle trip submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tripTitle || !destination) {
      setError("Please provide a trip title and select a destination");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const tripData = {
        title: tripTitle,
        start: currentLocation,
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          placeName: destination.placeName || "Selected Location",
        },
        radiusMeters: radius,
        etaOffsetMinutes: etaOffset,
      };

      const createdTrip = await tripService.createTrip(tripData);

      // Redirect to active trip page
      navigate(`/active-trip/${createdTrip._id}`);
    } catch (err) {
      setError("Failed to create trip: " + (err.message || "Unknown error"));
      console.error(err);
    } finally {
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
                      <p className="text-gray-600 font-medium">Loading map...</p>
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
                    <Marker position={[currentLocation.lat, currentLocation.lng]}>
                      <Popup>Your Location</Popup>
                    </Marker>

                    {/* Destination marker and circle */}
                    {destination && (
                      <>
                        <Marker position={[destination.lat, destination.lng]}>
                          <Popup>{destination.placeName || "Destination"}</Popup>
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
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Set Up Your Trip</h2>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3 animate-pulse-ring">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Trip Title */}
                <div className="space-y-2">
                  <label htmlFor="trip-title" className="block text-sm font-medium text-gray-700">
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
                  <label htmlFor="destination-search" className="block text-sm font-medium text-gray-700">
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
                          <p className="text-gray-800 text-sm">{result.display_name}</p>
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
                        <p className="font-medium text-gray-900">{destination.placeName}</p>
                        <p className="text-sm text-gray-500">
                          {destination.lat.toFixed(6)}, {destination.lng.toFixed(6)}
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
                  <label htmlFor="radius" className="block text-sm font-medium text-gray-700">
                    Wake-up Radius: <span className="font-semibold text-blue-600">{radius} meters</span>
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
                  <label htmlFor="eta-offset" className="block text-sm font-medium text-gray-700">
                    ETA Offset: <span className="font-semibold text-blue-600">{etaOffset} minutes</span>
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !destination}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 transform ${
                    loading || !destination
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 hover:shadow-lg active:scale-95 ring-4 ring-blue-200/50 hover:ring-blue-300/70'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating Trip...</span>
                    </span>
                  ) : (
                    'Start Trip'
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
      
      {/* Alarm Active Overlay */}
      {isAlarmActive && (
        <div className="fixed inset-0 z-50 bg-red-600 flex items-center justify-center animate-pulse-ring">
          <div className="text-center text-white p-8 rounded-2xl bg-red-700/90 backdrop-blur-lg shadow-2xl ring-4 ring-white/30">
            <h2 className="text-3xl font-bold mb-6 animate-bounce-soft">
              🚨 Wake up! You're near your destination! 🚨
            </h2>
            <button 
              onClick={handleStopAlarm}
              className="px-8 py-4 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              Stop Alarm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TripSetup;
