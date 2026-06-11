import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

export default function SSOCallback() {
  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "black", gap: "1rem" }}>
      <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid #f3f4f6', borderTopColor: '#000000', borderRadius: '50%' }}></div>
      <p style={{ fontFamily: "Inter, sans-serif", color: "#6b7280", fontWeight: 500 }}>Authenticating...</p>
      
      <div style={{ display: "none" }}>
        <AuthenticateWithRedirectCallback />
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .spinner {
            animation: spin 0.8s linear infinite;
          }
        `}
      </style>
    </div>
  );
}
