import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";

export default function SSOCallback() {
  return (
    <div style={{ minHeight: "100vh", background: "#080c14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", gap: "1rem" }}>
      <Loader2 className="spinner" size={32} style={{ animation: "spin 1s linear infinite" }} />
      <p style={{ fontFamily: "Inter, sans-serif", color: "#8b949e" }}>Authenticating...</p>
      
      {/* The invisible callback logic */}
      <div style={{ display: "none" }}>
        <AuthenticateWithRedirectCallback />
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

