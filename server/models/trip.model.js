const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define location point schema
const LocationPointSchema = new Schema({
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  ts: {
    type: Date,
    default: Date.now
  }
});

// Define trip schema
const TripSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  start: {
    lat: Number,
    lng: Number
  },
  destination: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    placeName: {
      type: String,
      trim: true
    }
  },
  radiusMeters: {
    type: Number,
    required: true,
    min: 50
  },
  etaOffsetMinutes: {
    type: Number,
    default: 0
  },
  locationPoints: [LocationPointSchema],
  startedAt: Date,
  endedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Trip', TripSchema);