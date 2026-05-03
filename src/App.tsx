import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import SSOCallback from "./pages/SSOCallback";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sso-callback" element={<SSOCallback />} />
        <Route path="/" element={
          <>
            <SignedOut><SignInPage /></SignedOut>
            <SignedIn><Navigate to="/dashboard" replace /></SignedIn>
          </>
        } />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/dashboard" element={
          <SignedIn>
            <DashboardPage />
          </SignedIn>
        } />
      </Routes>
    </BrowserRouter>
  );
}
