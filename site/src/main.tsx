import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/site.css";
import App from "./App";
import ConnectLinks from "./pages/ConnectLinks";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

const path = window.location.pathname.replace(/\/$/, "") || "/";
const Page = path === "/connect-links" ? ConnectLinks : App;

createRoot(root).render(
  <StrictMode>
    <Page />
  </StrictMode>
);
