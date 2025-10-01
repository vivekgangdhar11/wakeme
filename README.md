# Wake-Me-Up Smart Travel Alarm

A web application that helps users set up travel alarms based on their location. The app uses geofencing to trigger an alarm when the user approaches their destination.

## Project Overview

This application allows users to:
- Set up trips with a destination, wake-up radius, and optional ETA offset
- See their live location on a map
- Track their progress towards the destination
- Receive an alarm when they enter the defined geofence around the destination
- View a history of past trips

## Tech Stack

- **Frontend**: React (with Vite), React Router, Mapbox GL JS
- **Backend**: Express.js, Node.js, MongoDB (with Mongoose)
- **Deployment**: Local development setup (instructions below)

## Project Structure

```
wakeme/
├── server/            # Backend code (Express.js + Mongoose)
│   ├── app.js         # Main server entry point
│   ├── models/        # Mongoose data models
│   ├── controllers/   # Request handlers
│   ├── routes/        # API route definitions
│   └── package.json   # Server dependencies
├── client/            # Frontend code (React with Vite)
│   ├── src/           # React source files
│   │   ├── pages/     # Page components
│   │   ├── components/# Reusable components
│   │   ├── services/  # API service calls
│   │   └── utils/     # Helper functions
│   └── package.json   # Client dependencies
└── README.md          # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB (local or remote instance)
- Mapbox account and access token

### Installation

1. **Clone the repository** (or use the provided codebase)

2. **Set up the server**
   ```bash
   cd server
   npm install
   ```

3. **Set up the client**
   ```bash
   cd ../client
   npm install
   ```

### Configuration

#### Server Configuration

1. In the `server` directory, create a `.env` file based on the `.env.example` file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your MongoDB connection string and Mapbox token:
   ```env
   MONGO_URI=mongodb://localhost:27017/wakeme
   MAPBOX_TOKEN=your_mapbox_token_here
   API_URL=http://localhost:5000
   ```

#### Client Configuration

1. In the `client` directory, create a `.env` file based on the `.env.example` file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Mapbox token and API URL:
   ```env
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   VITE_API_URL=http://localhost:5000/api
   ```

## Running the Application

### Development Mode

1. **Start the MongoDB server** (if using a local instance)

2. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   The server will run on http://localhost:5000

3. **Start the frontend development server**
   ```bash
   cd ../client
   npm run dev
   ```
   The client will run on http://localhost:5173

4. Open your browser and visit http://localhost:5173 to use the application

### Production Mode (Optional)

To build the frontend for production and serve it from the Express server:

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```

2. Configure the Express server to serve the static files (see app.js for details)

3. Start the server:
   ```bash
   cd ../server
   npm start
   ```

## API Endpoints

The backend provides the following REST API endpoints:

- **POST /api/trips** - Create a new trip
- **GET /api/trips** - Get all trips
- **GET /api/trips/:id** - Get a single trip by ID
- **PUT /api/trips/:id** - Update a trip
- **DELETE /api/trips/:id** - Delete a trip
- **POST /api/trips/:id/point** - Add a location point to a trip
- **POST /api/trips/:id/end** - End a trip

## Features

1. **Trip Setup**
   - Set a trip title
   - Select a destination on the map
   - Adjust the wake-up radius
   - Set an optional ETA offset

2. **Active Trip Tracking**
   - Real-time location tracking
   - Visual representation of the destination and geofence
   - Distance to destination display
   - Alarm notification when entering the geofence

3. **Trip History**
   - View past trips with details
   - Delete trips
   - See trip statistics (duration, distance, etc.)

## Limitations

- No user authentication (all trips belong to a single demo user)
- Location tracking may be inaccurate depending on device and browser capabilities
- Requires browser permissions for geolocation and notifications

## Contributing

This is a sample project for demonstration purposes. To contribute, please follow these steps:

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Submit a pull request

## License

This project is open-source and available under the MIT License.