import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import "./styles.css";
import "./features/workout/workout-guided.css";
import "./features/workout/touch-targets.css";
import "./features/workout/recap.css";
import "./accessibility.css";
import "./d2-contrast.css";
import "./features/core-funnel/focused-coach.css";
import "./features/core-funnel/focused-coach-assets.css";
import "./features/core-funnel/focused-workout.css";
import "./features/core-funnel/focused-recap.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
);
