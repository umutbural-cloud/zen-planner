import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/hooks/useAuth";
import { AccountGateProvider } from "@/hooks/useAccountGate";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <AccountGateProvider>
      <App />
    </AccountGateProvider>
  </AuthProvider>,
);
