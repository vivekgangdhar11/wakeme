const express = require('express');
const router = express.Router();
const tripController = require('../controllers/trip.controller');

// Routes for trips
router.post('/', tripController.createTrip);
router.get('/', tripController.getAllTrips);
router.get('/:id', tripController.getTripById);
router.put('/:id', tripController.updateTrip);
router.delete('/:id', tripController.deleteTrip);
router.post('/:id/point', tripController.addLocationPoint);
router.post('/:id/end', tripController.endTrip); // Additional endpoint to end a trip

module.exports = router;