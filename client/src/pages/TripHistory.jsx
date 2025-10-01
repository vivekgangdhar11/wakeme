import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripService } from '../services/tripService';

const TripHistory = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  // Fetch trips history
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setIsLoading(true);
        const tripsData = await tripService.getAllTrips();
        
        // Sort trips based on selected criteria
        const sortedTrips = sortTrips(tripsData);
        setTrips(sortedTrips);
        setError('');
      } catch (err) {
        setError('Failed to load trip history. Please try again.');
        console.error('Error fetching trips:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrips();
  }, [sortBy]);

  // Sort trips function
  const sortTrips = (tripsData) => {
    const sorted = [...tripsData];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'duration':
        return sorted.sort((a, b) => {
          const durationA = a.endedAt ? new Date(a.endedAt) - new Date(a.createdAt) : 0;
          const durationB = b.endedAt ? new Date(b.endedAt) - new Date(b.createdAt) : 0;
          return durationB - durationA;
        });
      default:
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  // Handle trip selection
  const handleTripSelect = (trip) => {
    setSelectedTrip(trip);
    setIsModalOpen(true);
  };

  // Handle trip deletion
  const handleDeleteTrip = async (tripId, e) => {
    e.stopPropagation(); // Prevent opening the modal
    
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        await tripService.deleteTrip(tripId);
        setTrips(trips.filter(trip => trip._id !== tripId));
        
        // If the deleted trip was selected, close the modal
        if (selectedTrip && selectedTrip._id === tripId) {
          setIsModalOpen(false);
          setSelectedTrip(null);
        }
      } catch (err) {
        setError('Failed to delete trip. Please try again.');
        console.error('Error deleting trip:', err);
      }
    }
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTrip(null);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
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

  // Calculate and format trip duration
  const formatDuration = (start, end) => {
    if (!start || !end) return 'Ongoing';
    
    const duration = new Date(end) - new Date(start);
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Format distance
  const formatDistance = (distance) => {
    if (!distance) return 'N/A';
    
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} m`;
    }
    return `${distance.toFixed(2)} km`;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="trip-history-container">
        <h1 className="page-title">Trip History</h1>
        <div className="loading">Loading trip history...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="trip-history-container">
        <h1 className="page-title">Trip History</h1>
        <div className="error-message">{error}</div>
        <div className="back-link">
          <button className="submit-button" onClick={() => navigate('/')}>Create New Trip</button>
        </div>
      </div>
    );
  }

  return (
    <div className="trip-history-container">
      <h1 className="page-title">Trip History</h1>
      
      <div className="back-link">
        <button className="submit-button" onClick={() => navigate('/')}>
          Create New Trip
        </button>
      </div>

      {/* Sort options */}
      {trips.length > 0 && (
        <div style={{ margin: '1rem 0', textAlign: 'center' }}>
          <label style={{ marginRight: '0.5rem', color: '#555', fontWeight: '500' }}>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              fontSize: '0.9rem'
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      )}

      {/* Trips list */}
      {trips.length > 0 ? (
        <div className="trips-list">
          {trips.map((trip) => (
            <div 
              key={trip._id} 
              className={`trip-card ${selectedTrip && selectedTrip._id === trip._id ? 'selected' : ''}`}
              onClick={() => handleTripSelect(trip)}
            >
              <div className="trip-card-header">
                <h3>{trip.title}</h3>
                <button 
                  className="delete-btn"
                  onClick={(e) => handleDeleteTrip(trip._id, e)}
                  title="Delete trip"
                >
                  ×
                </button>
              </div>
              <div className="trip-card-content">
                <div className="info-row">
                  <span className="label">Start:</span>
                  <span className="value">{formatDate(trip.createdAt)}</span>
                </div>
                <div className="info-row">
                  <span className="label">End:</span>
                  <span className="value">{trip.endedAt ? formatDate(trip.endedAt) : 'Ongoing'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Duration:</span>
                  <span className="value">{formatDuration(trip.createdAt, trip.endedAt)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Destination:</span>
                  <span className="value">
                    {trip.destination.placeName || 
                     formatCoordinates(trip.destination.latitude, trip.destination.longitude)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>🎉 No Trips Yet!</h2>
          <p>Looks like you haven't completed any trips.</p>
          <p>Start your first trip and we'll track your journey.</p>
        </div>
      )}

      {/* Trip detail modal */}
      {isModalOpen && selectedTrip && (
        <div className="trip-detail-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTrip.title}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="trip-details">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <p><strong>Created:</strong> {formatDate(selectedTrip.createdAt)}</p>
                <p><strong>Ended:</strong> {selectedTrip.endedAt ? formatDate(selectedTrip.endedAt) : 'Ongoing'}</p>
                <p><strong>Duration:</strong> {formatDuration(selectedTrip.createdAt, selectedTrip.endedAt)}</p>
                <p><strong>Radius:</strong> {selectedTrip.radius} meters</p>
              </div>
              
              <div className="detail-section">
                <h3>Locations</h3>
                <p><strong>Starting Point:</strong> {formatCoordinates(selectedTrip.currentLocation.latitude, selectedTrip.currentLocation.longitude)}</p>
                <p><strong>Destination:</strong> 
                  {selectedTrip.destination.placeName && (
                    <>
                      {selectedTrip.destination.placeName}<br/>
                      <small style={{ color: '#666', fontWeight: 'normal' }}>
                        {formatCoordinates(selectedTrip.destination.latitude, selectedTrip.destination.longitude)}
                      </small>
                    </>
                  )}
                  {!selectedTrip.destination.placeName && (
                    formatCoordinates(selectedTrip.destination.latitude, selectedTrip.destination.longitude)
                  )}
                </p>
              </div>
              
              {selectedTrip.locationPoints && selectedTrip.locationPoints.length > 0 && (
                <div className="detail-section">
                  <h3>Tracking Points ({selectedTrip.locationPoints.length})</h3>
                  <div className="location-points">
                    {selectedTrip.locationPoints.slice(0, 10).map((point, index) => (
                      <div key={index} style={{ marginBottom: '0.5rem' }}>
                        <strong>Point {index + 1}:</strong> {formatCoordinates(point.latitude, point.longitude)}
                        <br />
                        <small style={{ color: '#666' }}>{formatDate(point.timestamp)}</small>
                      </div>
                    ))}
                    {selectedTrip.locationPoints.length > 10 && (
                      <p style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>
                        ... and {selectedTrip.locationPoints.length - 10} more points
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripHistory;