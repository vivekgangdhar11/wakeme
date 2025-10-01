import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { tripService } from '../services/tripService';
import { calculateDistance } from '../utils/geolocationUtils';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ActiveTrip = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [trip, setTrip] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isAlarmTriggered, setIsAlarmTriggered] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const geofenceCircleRef = useRef(null);

  // Fetch trip data
  useEffect(() => {
    const fetchTrip = async () => {
      try {
        setIsLoading(true);
        const tripData = await tripService.getTripById(id);
        setTrip(tripData);
        setTimeElapsed(Date.now() - new Date(tripData.createdAt).getTime());
        setError('');
      } catch (err) {
        setError('Failed to load trip data. Please try again.');
        console.error('Error fetching trip:', err);
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
        setTimeElapsed(prev => prev + 1000);
      }, 1000);

      return () => {
        if (timerRef.current !== null) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [trip]);

  // Initialize map and watch location
  useEffect(() => {
    if (!trip || isLoading) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [trip.currentLocation.longitude, trip.currentLocation.latitude],
        zoom: 14
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapRef.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }));

      // Wait for map to load before adding markers
      mapRef.current.on('load', () => {
        // Add destination marker
        const destinationEl = document.createElement('div');
        destinationEl.className = 'destination-marker';
        destinationEl.style.width = '24px';
        destinationEl.style.height = '24px';
        destinationEl.style.backgroundColor = '#e74c3c';
        destinationEl.style.borderRadius = '50%';
        destinationEl.style.border = '2px solid white';
        destinationEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        destinationEl.style.display = 'flex';
        destinationEl.style.alignItems = 'center';
        destinationEl.style.justifyContent = 'center';
        destinationEl.style.fontSize = '12px';
        destinationEl.style.color = 'white';
        destinationEl.style.fontWeight = 'bold';
        destinationEl.innerHTML = 'D';

        destinationMarkerRef.current = new mapboxgl.Marker(destinationEl)
          .setLngLat([trip.destination.longitude, trip.destination.latitude])
          .setPopup(new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<h3>${trip.title}</h3><p>Destination</p>`))
          .addTo(mapRef.current);

        // Draw geofence circle
        if (!mapRef.current.getSource('geofence')) {
          mapRef.current.addSource('geofence', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [trip.destination.longitude, trip.destination.latitude]
                  }
                }
              ]
            }
          });

          mapRef.current.addLayer({
            id: 'geofence-circle',
            type: 'circle',
            source: 'geofence',
            paint: {
              'circle-radius': trip.radius,
              'circle-color': 'rgba(52, 152, 219, 0.2)',
              'circle-stroke-color': '#3498db',
              'circle-stroke-width': 2
            }
          });
        }
      });
    }

    // Watch user location
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString()
          };

          setCurrentLocation(newLocation);

          // Update the map center and user marker
          if (mapRef.current) {
            const { longitude, latitude } = newLocation;
            mapRef.current.setCenter([longitude, latitude]);

            // Update or create user marker
            if (!userMarkerRef.current) {
              const userEl = document.createElement('div');
              userEl.className = 'user-marker';
              userEl.style.width = '24px';
              userEl.style.height = '24px';
              userEl.style.backgroundColor = '#2ecc71';
              userEl.style.borderRadius = '50%';
              userEl.style.border = '2px solid white';
              userEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
              userEl.style.display = 'flex';
              userEl.style.alignItems = 'center';
              userEl.style.justifyContent = 'center';
              userEl.style.fontSize = '12px';
              userEl.style.color = 'white';
              userEl.style.fontWeight = 'bold';
              userEl.innerHTML = 'U';

              userMarkerRef.current = new mapboxgl.Marker(userEl)
                .setLngLat([longitude, latitude])
                .setPopup(new mapboxgl.Popup({ offset: 25 })
                  .setHTML(`<p>Your Location</p>`))
                .addTo(mapRef.current);
            } else {
              userMarkerRef.current.setLngLat([longitude, latitude]);
            }
          }

          // Check if user is within the destination radius
          const distance = calculateDistance(
            newLocation.latitude, newLocation.longitude,
            trip.destination.latitude, trip.destination.longitude
          );

          if (distance <= trip.radius && !isAlarmTriggered) {
            setIsAlarmTriggered(true);
            // Add location point to trip
            await tripService.addLocationPoint(id, newLocation);
          }

          // Periodically save location points (every 30 seconds)
          if (timeElapsed % 30000 < 1000) {
            await tripService.addLocationPoint(id, newLocation);
          }
        },
        (error) => {
          console.error('Error watching location:', error);
          setError('Failed to track your location. Please check your location settings.');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [trip, isAlarmTriggered, timeElapsed, isLoading]);

  // Format time elapsed
  const formatTimeElapsed = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Format coordinates
  const formatCoordinates = (lat, lng) => {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  // Calculate distance to destination
  const getDistanceToDestination = () => {
    if (!currentLocation || !trip) return 'Calculating...';
    
    const distance = calculateDistance(
      currentLocation.latitude, currentLocation.longitude,
      trip.destination.latitude, trip.destination.longitude
    );
    
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} m`;
    }
    return `${distance.toFixed(2)} km`;
  };

  // End trip
  const handleEndTrip = async () => {
    if (!currentLocation) {
      setError('Unable to get your current location. Please try again.');
      return;
    }

    try {
      // Add final location point
      await tripService.addLocationPoint(id, currentLocation);
      
      // End the trip
      await tripService.endTrip(id);
      
      // Redirect to trip history
      navigate('/trip-history');
    } catch (err) {
      setError('Failed to end the trip. Please try again.');
      console.error('Error ending trip:', err);
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
          <button className="submit-button" onClick={() => navigate('/trip-history')}>View Trip History</button>
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
          <button className="submit-button" onClick={() => navigate('/')}>Create New Trip</button>
        </div>
      </div>
    );
  }

  return (
    <div className="active-trip-container">
      <div className="trip-header">
        <h1 className="page-title">{trip.title}</h1>
        <button className="end-trip-btn" onClick={handleEndTrip}>End Trip</button>
      </div>

      {isAlarmTriggered && (
        <div className="alarm-notification">
          <h2>🎉 Destination Reached!</h2>
          <p>You've arrived at your destination.</p>
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
              ? formatCoordinates(currentLocation.latitude, currentLocation.longitude)
              : 'Locating...'}
          </span>
        </div>
        <div className="info-item">
          <span className="label">Destination:</span>
          <span className="value">
            {formatCoordinates(trip.destination.latitude, trip.destination.longitude)}
          </span>
        </div>
        <div className={`info-item ${isAlarmTriggered ? 'alarm-triggered' : ''}`}>
          <span className="label">Distance to Destination:</span>
          <span className="value">{getDistanceToDestination()}</span>
        </div>
        <div className="info-item">
          <span className="label">Alert Radius:</span>
          <span className="value">{trip.radius} meters</span>
        </div>
      </div>

      <div className="map-section">
        <div ref={mapContainerRef} className="map-container"></div>
      </div>
    </div>
  );
};

export default ActiveTrip;