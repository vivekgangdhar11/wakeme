const Trip = require('../models/trip.model');

// Temporary in-memory storage for testing when MongoDB is not available
let tempTrips = [];
let tripIdCounter = 1;

// Create a new trip
exports.createTrip = async (req, res) => {
  try {
    console.log('Received trip creation request:', req.body);
    const { title, start, destination, radiusMeters, etaOffsetMinutes } = req.body;
    
    // Validate required fields
    if (!title || !destination) {
      return res.status(400).json({ 
        message: 'Title and destination are required',
        received: { title, destination }
      });
    }
    
    // Try MongoDB first
    try {
      const newTrip = new Trip({
        title,
        start,
        destination,
        radiusMeters,
        etaOffsetMinutes
      });
      
      console.log('About to save trip to MongoDB:', newTrip);
      const savedTrip = await newTrip.save();
      console.log('Trip saved successfully to MongoDB:', savedTrip);
      res.status(201).json(savedTrip);
    } catch (mongoError) {
      console.log('MongoDB not available, using temporary storage:', mongoError.message);
      
      // Fallback to in-memory storage
      const tempTrip = {
        _id: (tripIdCounter++).toString(),
        title,
        start,
        destination,
        radiusMeters,
        etaOffsetMinutes,
        createdAt: new Date(),
        locationPoints: []
      };
      
      tempTrips.push(tempTrip);
      console.log('Trip saved to temporary storage:', tempTrip);
      res.status(201).json(tempTrip);
    }
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all trips
exports.getAllTrips = async (req, res) => {
  try {
    try {
      const trips = await Trip.find();
      res.status(200).json(trips);
    } catch (mongoError) {
      console.log('MongoDB not available, using temporary storage');
      res.status(200).json(tempTrips);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single trip by ID
exports.getTripById = async (req, res) => {
  try {
    try {
      const trip = await Trip.findById(req.params.id);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      res.status(200).json(trip);
    } catch (mongoError) {
      console.log('MongoDB not available, using temporary storage');
      const trip = tempTrips.find(t => t._id === req.params.id);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      res.status(200).json(trip);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a trip
exports.updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow updating certain fields
    const immutableFields = ['startedAt', 'endedAt', 'createdAt', 'locationPoints'];
    immutableFields.forEach(field => delete updates[field]);
    
    try {
      const updatedTrip = await Trip.findByIdAndUpdate(id, updates, { new: true });
      if (!updatedTrip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      res.status(200).json(updatedTrip);
    } catch (mongoError) {
      console.log('MongoDB not available, using temporary storage');
      const tripIndex = tempTrips.findIndex(t => t._id === id);
      if (tripIndex === -1) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      tempTrips[tripIndex] = { ...tempTrips[tripIndex], ...updates };
      res.status(200).json(tempTrips[tripIndex]);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a trip
exports.deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const deletedTrip = await Trip.findByIdAndDelete(id);
      if (!deletedTrip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      res.status(200).json({ message: 'Trip deleted successfully' });
    } catch (mongoError) {
      console.log('MongoDB not available, using temporary storage');
      const tripIndex = tempTrips.findIndex(t => t._id === id);
      if (tripIndex === -1) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      tempTrips.splice(tripIndex, 1);
      res.status(200).json({ message: 'Trip deleted successfully' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a location point to a trip
exports.addLocationPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, latitude, longitude } = req.body;
    
    // Handle both lat/lng and latitude/longitude formats
    const pointData = {
      lat: lat || latitude,
      lng: lng || longitude
    };
    
    try {
      const trip = await Trip.findById(id);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // If trip hasn't started yet, mark it as started
      if (!trip.startedAt) {
        trip.startedAt = new Date();
      }
      
      // Add the new location point
      trip.locationPoints.push(pointData);
      
      await trip.save();
      res.status(200).json(trip);
    } catch (mongoError) {
      console.log('MongoDB not available, using temporary storage');
      const trip = tempTrips.find(t => t._id === id);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // If trip hasn't started yet, mark it as started
      if (!trip.startedAt) {
        trip.startedAt = new Date();
      }
      
      // Add the new location point
      if (!trip.locationPoints) {
        trip.locationPoints = [];
      }
      trip.locationPoints.push({ ...pointData, ts: new Date() });
      
      res.status(200).json(trip);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// End a trip
exports.endTrip = async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      const trip = await Trip.findById(id);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (!trip.endedAt) {
        trip.endedAt = new Date();
      }
      
      await trip.save();
      res.status(200).json(trip);
    } catch (mongoError) {
      console.log('MongoDB not available, using temporary storage');
      const trip = tempTrips.find(t => t._id === id);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (!trip.endedAt) {
        trip.endedAt = new Date();
      }
      
      res.status(200).json(trip);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};