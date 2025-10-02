import React, { useState, useEffect, useRef } from "react";
import "../App.css";

const Settings = () => {
  const [alarmVolume, setAlarmVolume] = useState(0.8);
  const [alarmTone, setAlarmTone] = useState("default");
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoStopAlarm, setAutoStopAlarm] = useState(false);
  const [autoStopDuration, setAutoStopDuration] = useState(30);
  const [defaultRadius, setDefaultRadius] = useState(500);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [testPlaying, setTestPlaying] = useState(false);
  
  const audioRef = useRef(new Audio("/alarm.mp3"));

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("wakeme-settings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setAlarmVolume(settings.alarmVolume || 0.8);
      setAlarmTone(settings.alarmTone || "default");
      setVibrateEnabled(settings.vibrateEnabled !== false);
      setNotificationsEnabled(settings.notificationsEnabled !== false);
      setAutoStopAlarm(settings.autoStopAlarm || false);
      setAutoStopDuration(settings.autoStopDuration || 30);
      setDefaultRadius(settings.defaultRadius || 500);
      setHighAccuracy(settings.highAccuracy !== false);
      setDarkMode(settings.darkMode || false);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      alarmVolume,
      alarmTone,
      vibrateEnabled,
      notificationsEnabled,
      autoStopAlarm,
      autoStopDuration,
      defaultRadius,
      highAccuracy,
      darkMode,
    };
    localStorage.setItem("wakeme-settings", JSON.stringify(settings));
  }, [
    alarmVolume,
    alarmTone,
    vibrateEnabled,
    notificationsEnabled,
    autoStopAlarm,
    autoStopDuration,
    defaultRadius,
    highAccuracy,
    darkMode,
  ]);

  // Update audio volume when slider changes
  useEffect(() => {
    audioRef.current.volume = alarmVolume;
  }, [alarmVolume]);

  const testAlarm = () => {
    if (testPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setTestPlaying(false);
    } else {
      audioRef.current.play();
      setTestPlaying(true);
      // Auto-stop after 3 seconds for testing
      setTimeout(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setTestPlaying(false);
      }, 3000);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
    }
  };

  const resetToDefaults = () => {
    setAlarmVolume(0.8);
    setAlarmTone("default");
    setVibrateEnabled(true);
    setNotificationsEnabled(true);
    setAutoStopAlarm(false);
    setAutoStopDuration(30);
    setDefaultRadius(500);
    setHighAccuracy(true);
    setDarkMode(false);
  };

  return (
    <div className="settings-container">
      <div className="settings-content">
        <h1 className="page-title">Settings</h1>

        {/* Alarm Settings */}
        <div className="settings-section">
          <h2>🔔 Alarm Settings</h2>
          
          <div className="setting-item">
            <label>
              <span>Alarm Volume</span>
              <div className="volume-control">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={alarmVolume}
                  onChange={(e) => setAlarmVolume(Number(e.target.value))}
                  className="volume-slider"
                />
                <span className="volume-value">{Math.round(alarmVolume * 100)}%</span>
              </div>
            </label>
          </div>

          <div className="setting-item">
            <label>
              <span>Alarm Tone</span>
              <select
                value={alarmTone}
                onChange={(e) => setAlarmTone(e.target.value)}
                className="select-input"
              >
                <option value="default">Default Alarm</option>
                <option value="gentle">Gentle Wake</option>
                <option value="urgent">Urgent Alert</option>
                <option value="chime">Chime</option>
              </select>
            </label>
          </div>

          <div className="setting-item">
            <button onClick={testAlarm} className="test-alarm-btn">
              {testPlaying ? "⏹️ Stop Test" : "🔊 Test Alarm"}
            </button>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={vibrateEnabled}
                onChange={(e) => setVibrateEnabled(e.target.checked)}
              />
              <span>Enable Vibration (Mobile)</span>
            </label>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autoStopAlarm}
                onChange={(e) => setAutoStopAlarm(e.target.checked)}
              />
              <span>Auto-stop alarm after timeout</span>
            </label>
          </div>

          {autoStopAlarm && (
            <div className="setting-item indent">
              <label>
                <span>Auto-stop duration (seconds)</span>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="10"
                  value={autoStopDuration}
                  onChange={(e) => setAutoStopDuration(Number(e.target.value))}
                  className="range-input"
                />
                <span className="range-value">{autoStopDuration}s</span>
              </label>
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <h2>📱 Notification Settings</h2>
          
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
              <span>Enable Browser Notifications</span>
            </label>
            {!notificationsEnabled && (
              <button 
                onClick={requestNotificationPermission}
                className="permission-btn"
              >
                Grant Permission
              </button>
            )}
          </div>
        </div>

        {/* Location Settings */}
        <div className="settings-section">
          <h2>📍 Location Settings</h2>
          
          <div className="setting-item">
            <label>
              <span>Default Wake-up Radius</span>
              <div className="radius-control">
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={defaultRadius}
                  onChange={(e) => setDefaultRadius(Number(e.target.value))}
                  className="range-input"
                />
                <span className="range-value">{defaultRadius}m</span>
              </div>
            </label>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={highAccuracy}
                onChange={(e) => setHighAccuracy(e.target.checked)}
              />
              <span>High Accuracy GPS (uses more battery)</span>
            </label>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="settings-section">
          <h2>🎨 Appearance</h2>
          
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              <span>Dark Mode (Coming Soon)</span>
            </label>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="settings-section">
          <h2>🔒 Data & Privacy</h2>
          
          <div className="setting-item">
            <p className="info-text">
              WakeMe only stores trip data and your preferences locally. 
              Location data is only used during active trips and is not 
              shared with third parties.
            </p>
          </div>
        </div>

        {/* Reset Settings */}
        <div className="settings-section">
          <h2>🔄 Reset</h2>
          
          <div className="setting-item">
            <button onClick={resetToDefaults} className="reset-btn">
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
