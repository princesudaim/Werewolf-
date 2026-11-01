import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./Werewolf";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/* PWA — offline shell, zero plugins */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { scope: "./", updateViaCache: "none" }).catch(() => {
      /* dev mode or unsupported — game still runs fine */
    });
  });
}
