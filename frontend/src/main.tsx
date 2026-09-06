import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SettingsProvider } from "./hooks/useSettings";
import { HistoryProvider } from "./hooks/useHistory";
import { ToastProvider } from "./components/Toast";
import "./styles/index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <HistoryProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </HistoryProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
