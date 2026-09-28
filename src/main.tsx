import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/outfit/wght.css";
import { App } from "./ui/App";
import "./styles.css";

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
