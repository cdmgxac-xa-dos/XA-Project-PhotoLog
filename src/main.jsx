import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { bustFaviconCache } from "./favicon.js";
import "./index.css";

bustFaviconCache();

// Registers the push-notification + image-cache service worker (see
// public/sw.js). Fire-and-forget -- notifications.js checks readiness
// itself before subscribing.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("Service worker registration failed:", err));
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
