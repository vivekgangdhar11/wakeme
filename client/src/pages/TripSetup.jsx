import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { tripService } from '../services/tripService';
import { getCurrentLocation, isWithinRadius } from '../utils/geolocationUtils';
import '../App.css';

// Set Mapbox access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Check if Mapbox token is valid
const isMapboxTokenValid = mapboxgl.accessToken && mapboxgl.accessToken !== 'your_mapbox_token_here';

function TripSetup() {
  const [map, setMap] = useState(null);
  const [tripTitle, setTripTitle] = useState('');
  const [destination, setDestination] = useState(null);
  const [radius, setRadius] = useState(500);
  const [etaOffset, setEtaOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapContainerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Initialize map on component mount
  useEffect(() => {
    if (!isMapboxTokenValid) {
      return;
    }

    const initMap = async () => {
      try {
        setLoading(true);
        // Get user's current location or mock location
        const location = await getCurrentLocation();
        setCurrentLocation(location);

        // Initialize Mapbox map
        const newMap = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [location.lng, location.lat],
          zoom: 15,
        });

        // Add controls
        newMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Handle map click to set destination
        newMap.on('click', (e) => {
          const [lng, lat] = e.lngLat.toArray();
          setDestination({
            lat,
            lng,
            placeName: 'Selected Location'
          });
          setShowSearchResults(false);
        });

        // Add user location marker
        new mapboxgl.Marker({ color: '#3498db' })
          .setLngLat([location.lng, location.lat])
          .setPopup(new mapboxgl.Popup().setHTML('<p>Your Location</p>'))
          .addTo(newMap);

        setMap(newMap);
        setLoading(false);

        // Clean up on unmount
        return () => {
          if (newMap) newMap.remove();
        };
      } catch (err) {
        setError('Failed to initialize map or get location');
        console.error(err);
        setLoading(false);
      }
    };

    initMap();
  }, []);

  // Update destination marker and radius circle when destination or radius changes
  useEffect(() => {
    if (!isMapboxTokenValid || !map) return;

    // Remove existing marker and circle if they exist
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
    }
    if (radiusCircleRef.current) {
      map.removeLayer('radius-circle');
      map.removeSource('radius-circle');
    }

    // Add new marker and circle if destination is set
    if (destination) {
      // Add destination marker
      destinationMarkerRef.current = new mapboxgl.Marker({ color: '#e74c3c' })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<p>${destination.placeName || 'Destination'}</p>`))
        .addTo(map);

      // Center map on destination
      map.flyTo({
        center: [destination.lng, destination.lat],
        zoom: 15,
        essential: true
      });

      // Add radius circle
      if (map.getLayer('radius-circle')) {
        map.removeLayer('radius-circle');
      }
      if (map.getSource('radius-circle')) {
        map.removeSource('radius-circle');
      }

      try {
        // Use correct GeoJSON format for the circle
        map.addSource('radius-circle', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [createGeoJSONCircle([destination.lng, destination.lat], radius / 1000, 64)]
              }
            }]
          }
        });

        map.addLayer({
          id: 'radius-circle',
          type: 'fill',
          source: 'radius-circle',
          paint: {
            'fill-color': '#e74c3c',
            'fill-opacity': 0.2,
          },
        });

        // Add border to the circle
        map.addLayer({
          id: 'radius-circle-border',
          type: 'line',
          source: 'radius-circle',
          paint: {
            'line-color': '#e74c3c',
            'line-width': 2,
            'line-opacity': 0.7,
          },
        });
      } catch (err) {
        console.error('Error adding radius circle:', err);
      }
    }
  }, [map, destination, radius]);

  // Handle click outside search results to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle location search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxgl.accessToken}&limit=5`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        setSearchResults(data.features);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Error searching for location:', error);
      setError('Failed to search for location');
    }
  };

  // Handle selecting a search result
  const handleSelectSearchResult = (result) => {
    const [lng, lat] = result.center;
    setDestination({
      lat,
      lng,
      placeName: result.place_name
    });
    setSearchQuery(result.place_name);
    setShowSearchResults(false);
    setError('');
  };

  // Handle trip submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tripTitle || !destination) {
      setError('Please provide a trip title and select a destination');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const tripData = {
        title: tripTitle,
        start: currentLocation,
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          placeName: destination.placeName || 'Selected Location',
        },
        radiusMeters: radius,
        etaOffsetMinutes: etaOffset,
      };

      const createdTrip = await tripService.createTrip(tripData);
      
      // Redirect to active trip page
      window.location.href = `/active-trip/${createdTrip._id}`;
    } catch (err) {
      setError('Failed to create trip: ' + (err.message || 'Unknown error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to create a GeoJSON circle
  const createGeoJSONCircle = (center, radius, points) => {
    const coords = [];
    const radiusInRadians = radius / 6371;
    const [lng, lat] = center;
    const latitude = lat * Math.PI / 180;
    const longitude = lng * Math.PI / 180;

    for (let i = 0; i < points; i++) {
      const bearing = i * 2 * Math.PI / points;
      const newLatitude = Math.asin(
        Math.sin(latitude) * Math.cos(radiusInRadians) +
        Math.cos(latitude) * Math.sin(radiusInRadians) * Math.cos(bearing)
      );
      const newLongitude = longitude + Math.atan2(
        Math.sin(bearing) * Math.sin(radiusInRadians) * Math.cos(latitude),
        Math.cos(radiusInRadians) - Math.sin(latitude) * Math.sin(newLatitude)
      );
      coords.push([newLongitude * 180 / Math.PI, newLatitude * 180 / Math.PI]);
    }
    // Close the polygon
    coords.push(coords[0]);
    return coords;
  };

  return (
    <div className="trip-setup-container">
      <h1 className="page-title">Wake-Me-Up Alarm</h1>
      <div className="setup-content">
        <div className="map-section">
          {!isMapboxTokenValid && (
            <div className="map-error-message">
              <h3>Mapbox Access Token Required</h3>
              <p>To use the map and search functionality, you need to provide a valid Mapbox access token.</p>
              <ol>
                <li>Visit <a href="https://www.mapbox.com/" target="_blank" rel="noopener noreferrer">Mapbox.com</a> and sign up for a free account</li>
                <li>Generate an access token from your Mapbox account dashboard</li>
                <li>Update the <code>VITE_MAPBOX_TOKEN</code> variable in your <code>.env</code> file with your token</li>
                <li>Restart the application</li>
              </ol>
            </div>
          )}
          {loading && <div className="map-loading">Loading map...</div>}
          {isMapboxTokenValid && <div ref={mapContainerRef} className="map-container" />}
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
                <button type="button" onClick={handleSearch} className="search-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
                      {result.place_name}
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
                  <p className="placeholder">Click on the map or search to select a destination</p>
                )}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="radius">
                Wake-up Radius: {radius} meters
              </label>
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
            
            <button type="submit" disabled={loading || !destination} className="submit-button">
              {loading ? 'Creating Trip...' : 'Start Trip'}
            </button>
          </form>
          
          <div className="trip-history-link">
            <a href="/trip-history">View Past Trips</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TripSetup;