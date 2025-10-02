import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="brand-link">
          WakeMe
        </Link>
      </div>
      <div className="nav-links">
        <Link
          to="/"
          className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
        >
          New Trip
        </Link>
        <Link
          to="/trip-history"
          className={`nav-link ${
            location.pathname === "/trip-history" ? "active" : ""
          }`}
        >
          Trip History
        </Link>
        <Link
          to="/expenses"
          className={`nav-link ${
            location.pathname === "/expenses" ? "active" : ""
          }`}
        >
          Expenses
        </Link>
        <Link
          to="/settings"
          className={`nav-link ${
            location.pathname === "/settings" ? "active" : ""
          }`}
        >
          Settings
        </Link>
        <Link
          to="/about"
          className={`nav-link ${
            location.pathname === "/about" ? "active" : ""
          }`}
        >
          About
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
