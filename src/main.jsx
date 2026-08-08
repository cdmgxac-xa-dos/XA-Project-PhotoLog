import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { bustFaviconCache } from "./favicon.js";
import "./index.css";

bustFaviconCache();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
