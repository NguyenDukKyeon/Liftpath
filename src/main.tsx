import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { V5PreviewApp } from "./v5/app/V5PreviewApp.js";
import { selectRuntime } from "./v5/app/select-runtime.js";
import "./styles.css";
import "./features/workout/workout-guided.css";
import "./features/workout/touch-targets.css";
import "./features/workout/recap.css";
import "./accessibility.css";
import "./d2-contrast.css";
import "./features/core-funnel/focused-coach.css";
import "./features/core-funnel/focused-coach-assets.css";
import "./features/core-funnel/focused-workout.css";
import "./features/core-funnel/focused-workout-grid-fix.css";
import "./features/core-funnel/focused-recap.css";
import "./features/core-funnel/focused-accessibility-fix.css";
import "./features/core-funnel/focused-visual-lock.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  });
}

const RuntimeApp = selectRuntime(window.location.search) === "v5" ? V5PreviewApp : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary><RuntimeApp /></ErrorBoundary>
  </StrictMode>,
);
