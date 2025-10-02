const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001; // Changed from 5000 to 5001

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/wakeme", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.log("MongoDB Connection Error:", err);
    console.log("Server will continue without MongoDB for testing...");
  });

// Routes
app.use("/api/trips", require("./routes/trips"));

// Default route
app.get("/", (req, res) => {
  res.send("Wake-Me-Up Smart Travel Alarm API");
});

// Start server with error handling
const server = app
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${PORT} is busy. Trying port ${PORT + 1}`);
      app.listen(PORT + 1);
    } else {
      console.error("Server error:", err);
    }
  });
