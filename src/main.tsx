import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { defineCustomElements } from '@ionic/pwa-elements/loader';

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA camera modal for web (Capacitor Camera)
defineCustomElements(window);

