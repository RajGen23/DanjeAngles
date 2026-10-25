import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, MemoryRouter } from "react-router-dom";

// The hosted preview runs inside a frame without real URLs, so it routes in memory.
const Router = import.meta.env.VITE_ROUTER === "memory" ? MemoryRouter : BrowserRouter;
import App from "./App.jsx";
import "@fontsource/crimson-pro/latin-400.css";
import "@fontsource/crimson-pro/latin-500.css";
import "@fontsource/crimson-pro/latin-600.css";
import "@fontsource/crimson-pro/latin-700.css";
import "@fontsource/crimson-pro/latin-400-italic.css";
import "@fontsource/crimson-pro/latin-500-italic.css";
import "@fontsource/jost/latin-400.css";
import "@fontsource/jost/latin-500.css";
import "@fontsource/jost/latin-600.css";
import "./danje.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
