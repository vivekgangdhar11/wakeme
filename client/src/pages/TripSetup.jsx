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

  // Initialize location on component mount
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
      { enableHighAccuracy: true }
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
    <div className="trip-setup-container">
      <h1 className="page-title">Wake-Me-Up Alarm</h1>
      <div className="setup-content">
        <div className="map-section">
          {loading && <div className="map-loading">Loading map...</div>}
          {currentLocation && (
            <MapContainer
              center={[currentLocation.lat, currentLocation.lng]}
              zoom={15}
              className="map-container"
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

        <div className="form-section">
          <h2>Set Up Your Trip</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit} className="trip-form">
            <div className="form-group">
              <label htmlFor="trip-title">Trip Title</label>
              <input
                type="text"
                id="trip-title"
                value={tripTitle}
                onChange={(e) => setTripTitle(e.target.value)}
                placeholder="e.g. 'Work Commute'"
                required
              />
            </div>

            <div className="form-group" ref={searchContainerRef}>
              <label htmlFor="destination-search">Search for Destination</label>
              <div className="search-container">
                <input
                  type="text"
                  id="destination-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowSearchResults(true)}
                  placeholder="Type to search places..."
                  className="search-input"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="search-button"
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
                <div className="search-results">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="search-result-item"
                      onClick={() => handleSelectSearchResult(result)}
                    >
                      {result.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="destination">Selected Destination</label>
              <div className="destination-info">
                {destination ? (
                  <div>
                    <p className="place-name">{destination.placeName}</p>
                    <p className="coordinates">
                      {destination.lat.toFixed(6)}, {destination.lng.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="placeholder">
                    Click on the map or search to select a destination
                  </p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="radius">Wake-up Radius: {radius} meters</label>
              <input
                type="range"
                id="radius"
                min="100"
                max="2000"
                step="50"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
              <div className="range-labels">
                <span>100m</span>
                <span>1000m</span>
                <span>2000m</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="eta-offset">
                ETA Offset (minutes): {etaOffset}
              </label>
              <input
                type="range"
                id="eta-offset"
                min="0"
                max="30"
                step="5"
                value={etaOffset}
                onChange={(e) => setEtaOffset(Number(e.target.value))}
              />
              <div className="range-labels">
                <span>0</span>
                <span>15</span>
                <span>30</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !destination}
              className="submit-button"
            >
              {loading ? "Creating Trip..." : "Start Trip"}
            </button>
          </form>

          <div className="trip-history-link">
            <a href="/trip-history">View Past Trips</a>
          </div>
        </div>
      </div>
      {isAlarmActive && (
        <div className="alarm-active">
          <h2>Wake up! You're near your destination!</h2>
          <button onClick={handleStopAlarm}>Stop Alarm</button>
        </div>
      )}
    </div>
  );
}

export default TripSetup;
