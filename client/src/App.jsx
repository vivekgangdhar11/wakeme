import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TripSetup from "./pages/TripSetup";
import ActiveTrip from "./pages/ActiveTrip";
import TripHistory from "./pages/TripHistory";
import Expenses from "./pages/Expenses";
import Navbar from "./components/Navbar";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<TripSetup />} />
            <Route path="/active-trip/:id" element={<ActiveTrip />} />
            <Route path="/trip-history" element={<TripHistory />} />
            <Route path="/expenses" element={<Expenses />} />
            {/* Catch-all route for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Simple 404 component
function NotFound() {
  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>The requested page does not exist.</p>
      <a href="/">Go back to Trip Setup</a>
    </div>
  );
}

export default App;
