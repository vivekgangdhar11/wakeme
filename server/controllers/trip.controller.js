const Trip = require('../models/trip.model');

// Create a new trip
exports.createTrip = async (req, res) => {
  try {
    const { title, start, destination, radiusMeters, etaOffsetMinutes } = req.body;
    
    const newTrip = new Trip({
      title,
      start,
      destination,
      radiusMeters,
      etaOffsetMinutes
    });
    
    const savedTrip = await newTrip.save();
    res.status(201).json(savedTrip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all trips
exports.getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find();
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single trip by ID
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.status(200).json(trip);
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
    
    const updatedTrip = await Trip.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.status(200).json(updatedTrip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a trip
exports.deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTrip = await Trip.findByIdAndDelete(id);
    if (!deletedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a location point to a trip
exports.addLocationPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;
    
    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    
    // If trip hasn't started yet, mark it as started
    if (!trip.startedAt) {
      trip.startedAt = new Date();
    }
    
    // Add the new location point
    trip.locationPoints.push({ lat, lng });
    
    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// End a trip
exports.endTrip = async (req, res) => {
  try {
    const { id } = req.params;
    
    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    
    if (!trip.endedAt) {
      trip.endedAt = new Date();
    }
    
    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};