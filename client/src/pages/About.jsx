import React from "react";
import "../App.css";

const About = () => {
  return (
    <div className="about-container">
      <div className="about-content">
        <h1 className="page-title">About WakeMe</h1>
        
        <div className="about-section">
          <h2>🚀 What is WakeMe?</h2>
          <p>
            WakeMe is a smart travel alarm application that helps you never miss your destination. 
            Whether you're commuting to work, traveling to a new city, or just want to take a nap 
            during your journey, WakeMe will wake you up when you're approaching your destination.
          </p>
        </div>

        <div className="about-section">
          <h2>✨ Key Features</h2>
          <ul className="feature-list">
            <li>📍 <strong>Live Location Tracking:</strong> Real-time GPS tracking of your current position</li>
            <li>🗺️ <strong>Interactive Map:</strong> Visual representation of your route and destination</li>
            <li>⏰ <strong>Smart Alarm:</strong> Customizable alarm that triggers when you're near your destination</li>
            <li>📏 <strong>Adjustable Radius:</strong> Set the wake-up distance from 100m to 2km</li>
            <li>🔍 <strong>Location Search:</strong> Easy search for destinations using place names</li>
            <li>📱 <strong>Fullscreen Map:</strong> Immersive map experience for better navigation</li>
            <li>📊 <strong>Trip History:</strong> Keep track of all your past trips</li>
            <li>💰 <strong>Expense Tracking:</strong> Track your travel expenses</li>
          </ul>
        </div>

        <div className="about-section">
          <h2>🛠️ How It Works</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Set Your Destination</h3>
                <p>Click on the map or search for your destination using the search bar.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Configure Your Trip</h3>
                <p>Set your trip title, wake-up radius, and any ETA offset you prefer.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Start Your Journey</h3>
                <p>Begin your trip and let WakeMe track your location in real-time.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Get Alerted</h3>
                <p>Receive an alarm notification when you're approaching your destination.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="about-section">
          <h2>🔧 Technology Stack</h2>
          <div className="tech-grid">
            <div className="tech-item">
              <h4>Frontend</h4>
              <p>React, Leaflet Maps, React Router</p>
            </div>
            <div className="tech-item">
              <h4>Backend</h4>
              <p>Node.js, Express.js, MongoDB</p>
            </div>
            <div className="tech-item">
              <h4>APIs</h4>
              <p>OpenStreetMap, Geolocation API</p>
            </div>
            <div className="tech-item">
              <h4>Features</h4>
              <p>Real-time GPS, Audio Alerts, PWA</p>
            </div>
          </div>
        </div>

        <div className="about-section">
          <h2>📱 Browser Compatibility</h2>
          <p>
            WakeMe works best on modern browsers that support the Geolocation API. 
            For the best experience, please ensure location permissions are enabled 
            and you have a stable internet connection.
          </p>
        </div>

        <div className="about-section">
          <h2>🔒 Privacy & Security</h2>
          <p>
            Your privacy is important to us. WakeMe only tracks your location during 
            active trips and doesn't store personal information beyond trip data. 
            All location data is processed locally and only essential trip information 
            is stored on our servers.
          </p>
        </div>

        <div className="about-section">
          <h2>📞 Support</h2>
          <p>
            Having issues or suggestions? We'd love to hear from you! WakeMe is 
            continuously evolving to provide you with the best travel alarm experience.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
