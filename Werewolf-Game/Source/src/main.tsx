import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./Werewolf";
import {offlineMonitor} from "./offline-status";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Registration remains outside React: StrictMode never registers twice.
// No reload, forced activation or match-state access.
if (document.readyState === "complete") void offlineMonitor.start();
else window.addEventListener("load", () => { void offlineMonitor.start(); }, {once:true});
