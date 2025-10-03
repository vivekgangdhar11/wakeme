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
  const [error, setError] = useState("");
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  const audioRef = useRef(null);

  const audioSource = "/wind-up-clock-alarm-bell-64219.mp3";

  // Initialize audio on mount
  useEffect(() => {
    const loadAudio = () => {
      try {
        // Create new Audio instance
        audioRef.current = new Audio();
        audioRef.current.preload = "auto";
        audioRef.current.loop = false;

        // Add error handling
        const handleError = async (event) => {
          const error = event.target.error;
          let errorMessage = "Failed to load alarm sound";

          if (error) {
            switch (error.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = "Audio loading aborted";
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = "Network error while loading audio";
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage = "Audio decoding failed";
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = "Audio format not supported";
                break;
            }
          }

          console.error("Audio error:", errorMessage, error);
          setError(errorMessage);
          setIsAudioLoaded(false);
        };

        const handleCanPlayThrough = () => {
          setIsAudioLoaded(true);
          setError("");
        };

        // Add event listeners
        audioRef.current.addEventListener("error", handleError);
        audioRef.current.addEventListener(
          "canplaythrough",
          handleCanPlayThrough
        );

        // Set source to wind-up clock alarm
        audioRef.current.src = audioSource;
        audioRef.current.load();

        // Return cleanup function
        return () => {
          if (audioRef.current) {
            audioRef.current.removeEventListener("error", handleError);
            audioRef.current.removeEventListener(
              "canplaythrough",
              handleCanPlayThrough
            );
            audioRef.current.src = "";
            audioRef.current = null;
          }
        };
      } catch (err) {
        console.error("Audio initialization error:", err);
        setError("Failed to initialize audio: " + err.message);
        return () => {};
      }
    };

    return loadAudio();
  }, []);

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

  const testAlarm = async () => {
    if (!isAudioLoaded) {
      setError("Audio is not ready yet. Please wait.");
      return;
    }

    if (testPlaying) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setTestPlaying(false);
      } catch (error) {
        console.error("Failed to stop alarm:", error);
        setError("Failed to stop alarm: " + error.message);
      }
    } else {
      try {
        setError(""); // Clear any previous errors
        await audioRef.current.play();
        setTestPlaying(true);

        // Vibrate if enabled
        if (vibrateEnabled && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }

        // Auto-stop after 3 seconds for testing
        setTimeout(() => {
          if (audioRef.current && testPlaying) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setTestPlaying(false);
          }
        }, 3000);
      } catch (error) {
        console.error("Failed to play alarm:", error);
        if (error.name === "NotAllowedError") {
          setError(
            "Browser blocked auto-play. Please click the Test Alarm button."
          );
        } else {
          setError("Failed to play alarm: " + error.message);
        }
      }
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
    setAlarmTone("windup");
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
                <span className="volume-value">
                  {Math.round(alarmVolume * 100)}%
                </span>
              </div>
            </label>
          </div>

          <div className="setting-item">
            <button
              onClick={testAlarm}
              className={`test-alarm-btn ${
                !isAudioLoaded ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={!isAudioLoaded}
            >
              {testPlaying
                ? "⏹️ Stop Test"
                : isAudioLoaded
                ? "🔊 Test Alarm"
                : "⌛ Loading..."}
            </button>
            {error && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                {error}
              </div>
            )}
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
              Location data is only used during active trips and is not shared
              with third parties.
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
