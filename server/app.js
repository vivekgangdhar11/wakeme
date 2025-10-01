const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001; // Changed from 5000 to 5001

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/wakeme', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}) .then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error:', err));

// Routes
app.use('/api/trips', require('./routes/trips'));

// Default route
app.get('/', (req, res) => {
  res.send('Wake-Me-Up Smart Travel Alarm API');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});