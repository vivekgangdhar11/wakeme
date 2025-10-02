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
app.use(
  cors({
    origin: true, // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/wakeme";
    console.log("Attempting to connect to MongoDB at:", mongoURI);

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });

    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    console.log("Server will continue with in-memory storage...");
  }
};

connectDB();

// Routes
app.use("/api/trips", require("./routes/trips"));

// Default route
app.get("/", (req, res) => {
  res.send("Wake-Me-Up Smart Travel Alarm API");
});

// Start server with error handling
const startServer = async (port) => {
  try {
    await new Promise((resolve, reject) => {
      const server = app
        .listen(port, () => {
          console.log(`✅ Server running on port ${port}`);
          resolve(server);
        })
        .on("error", (err) => {
          if (err.code === "EADDRINUSE") {
            console.log(`⚠️ Port ${port} is busy, trying port ${port + 1}`);
            reject(err);
          } else {
            console.error("❌ Server error:", err);
            reject(err);
          }
        });
    });
  } catch (err) {
    if (err.code === "EADDRINUSE") {
      await startServer(port + 1);
    }
  }
};

startServer(PORT);
