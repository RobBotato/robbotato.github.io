import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { normalizeHomeUrl } from "./lib/sectionNavigation.ts";

normalizeHomeUrl(window.history, window.location);

createRoot(document.getElementById("root")!).render(<App />);
