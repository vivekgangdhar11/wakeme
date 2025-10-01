import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { tripService } from "../services/tripService";
import { calculateDistance } from "../utils/geolocationUtils";
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

// MapController component to handle map updates
function MapController({ currentLocation, destination }) {
  const map = useMap();

  useEffect(() => {
    if (currentLocation) {
      map.setView([currentLocation.latitude, currentLocation.longitude], 15);
    }
  }, [currentLocation, map]);

  return null;
}

const ActiveTrip = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isAlarmTriggered, setIsAlarmTriggered] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const alarmAudioRef = useRef(new Audio("/alarm.mp3"));

  // Fetch trip data
  useEffect(() => {
    const fetchTrip = async () => {
      try {
        setIsLoading(true);
        const tripData = await tripService.getTripById(id);
        setTrip(tripData);
        setTimeElapsed(Date.now() - new Date(tripData.createdAt).getTime());
        setError("");
      } catch (err) {
        setError("Failed to load trip data. Please try again.");
        console.error("Error fetching trip:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrip();

    // Cleanup function
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [id]);

  // Setup timer for elapsed time
  useEffect(() => {
    if (trip) {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1000);
      }, 1000);

      return () => {
        if (timerRef.current !== null) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [trip]);

  // Watch location and handle alarm
  useEffect(() => {
    if (!trip || isLoading) return;

    const audio = alarmAudioRef.current;

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString(),
          };

          setCurrentLocation(newLocation);

          // Check if user is within the destination radius
          const distance = calculateDistance(
            newLocation.latitude,
            newLocation.longitude,
            trip.destination.lat,
            trip.destination.lng
          );

          if (distance <= trip.radius) {
            if (!isAlarmTriggered) {
              setIsAlarmTriggered(true);
              audio.play();
              await tripService.addLocationPoint(id, newLocation);
            }
          } else if (isAlarmTriggered) {
            setIsAlarmTriggered(false);
            audio.pause();
            audio.currentTime = 0;
          }

          // Periodically save location points (every 30 seconds)
          if (timeElapsed % 30000 < 1000) {
            await tripService.addLocationPoint(id, newLocation);
          }
        },
        (error) => {
          console.error("Error watching location:", error);
          setError(
            "Failed to track your location. Please check your location settings."
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000,
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }

    // Cleanup function
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (isAlarmTriggered) {
        setIsAlarmTriggered(false);
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [trip, isAlarmTriggered, timeElapsed, isLoading, id]);

  // Format time elapsed
  const formatTimeElapsed = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Format coordinates
  const formatCoordinates = (lat, lng) => {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  // Calculate distance to destination
  const getDistanceToDestination = () => {
    if (!currentLocation || !trip) return "Calculating...";

    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      trip.destination.latitude,
      trip.destination.longitude
    );

    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} m`;
    }
    return `${distance.toFixed(2)} km`;
  };

  // Handle stopping the alarm
  const handleStopAlarm = () => {
    if (isAlarmTriggered) {
      setIsAlarmTriggered(false);
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
  };

  // End trip
  const handleEndTrip = async () => {
    if (!currentLocation) {
      setError("Unable to get your current location. Please try again.");
      return;
    }

    try {
      // Add final location point
      await tripService.addLocationPoint(id, currentLocation);

      // End the trip
      await tripService.endTrip(id);

      // Redirect to trip history
      navigate("/trip-history");
    } catch (err) {
      setError("Failed to end the trip. Please try again.");
      console.error("Error ending trip:", err);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="active-trip-container">
        <h1 className="page-title">Active Trip</h1>
        <div className="loading">Loading trip data...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="active-trip-container">
        <h1 className="page-title">Active Trip</h1>
        <div className="error-message">{error}</div>
        <div className="back-link">
          <button
            className="submit-button"
            onClick={() => navigate("/trip-history")}
          >
            View Trip History
          </button>
        </div>
      </div>
    );
  }

  // Render trip not found
  if (!trip) {
    return (
      <div className="active-trip-container">
        <h1 className="page-title">Active Trip</h1>
        <div className="error-message">Trip not found</div>
        <div className="back-link">
          <button className="submit-button" onClick={() => navigate("/")}>
            Create New Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="active-trip-container">
      <div className="trip-header">
        <h1 className="page-title">{trip.title}</h1>
        <button className="end-trip-btn" onClick={handleEndTrip}>
          End Trip
        </button>
      </div>

      {isAlarmTriggered && (
        <div className="alarm-notification">
          <h2>🎉 Destination Reached!</h2>
          <p>You've arrived at your destination.</p>
          <button onClick={handleStopAlarm} className="stop-alarm-btn">
            Stop Alarm
          </button>
        </div>
      )}

      <div className="trip-info">
        <div className="info-item">
          <span className="label">Started At:</span>
          <span className="value">{formatDate(trip.createdAt)}</span>
        </div>
        <div className="info-item">
          <span className="label">Elapsed Time:</span>
          <span className="value">{formatTimeElapsed(timeElapsed)}</span>
        </div>
        <div className="info-item">
          <span className="label">Current Location:</span>
          <span className="value">
            {currentLocation
              ? formatCoordinates(
                  currentLocation.latitude,
                  currentLocation.longitude
                )
              : "Locating..."}
          </span>
        </div>
        <div className="info-item">
          <span className="label">Destination:</span>
          <span className="value">
            {formatCoordinates(trip.destination.lat, trip.destination.lng)}
          </span>
        </div>
        <div
          className={`info-item ${isAlarmTriggered ? "alarm-triggered" : ""}`}
        >
          <span className="label">Distance to Destination:</span>
          <span className="value">{getDistanceToDestination()}</span>
        </div>
        <div className="info-item">
          <span className="label">Alert Radius:</span>
          <span className="value">{trip.radiusMeters} meters</span>
        </div>
      </div>

      <div className="map-section">
        {currentLocation && (
          <MapContainer
            center={[currentLocation.latitude, currentLocation.longitude]}
            zoom={15}
            className="map-container"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapController
              currentLocation={currentLocation}
              destination={trip.destination}
            />

            {/* Current location marker */}
            <Marker
              position={[currentLocation.latitude, currentLocation.longitude]}
            >
              <Popup>Your Location</Popup>
            </Marker>

            {/* Destination marker and radius circle */}
            <Marker position={[trip.destination.lat, trip.destination.lng]}>
              <Popup>{trip.title} - Destination</Popup>
            </Marker>
            <Circle
              center={[trip.destination.lat, trip.destination.lng]}
              radius={trip.radiusMeters}
              pathOptions={{
                fillColor: "#e74c3c",
                fillOpacity: 0.2,
                color: "#e74c3c",
                weight: 2,
              }}
            />
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default ActiveTrip;
