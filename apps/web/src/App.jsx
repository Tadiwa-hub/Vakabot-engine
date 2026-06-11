import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './components/layout/DashboardLayout';
import Skeleton from './components/ui/Skeleton';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // Data is fresh for 60 seconds (prevents loading spinners on transitions)
      refetchOnWindowFocus: false, // Prevents layout flashing when refocusing the browser tab
    },
  },
});

// Lazy load pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BotsPage = lazy(() => import('./pages/BotsPage'));
const ConnectBotPage = lazy(() => import('./pages/ConnectBotPage'));
const ConversationsPage = lazy(() => import('./pages/ConversationsPage'));
const KeywordsPage = lazy(() => import('./pages/KeywordsPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SetupWizard = lazy(() => import('./pages/SetupWizard'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

const LandingPage = lazy(() => import('./pages/LandingPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const SSOCallback = lazy(() => import('./pages/SSOCallback'));

import { useUserStats } from './hooks/useUserStats';
import { useWebSocket } from './hooks/useWebSocket';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const SetupCheck = ({ children }) => {
  const { user } = useUser();
  const { userData, loading } = useUserStats(user?.id);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading || !userData) return;

    // Redirect to setup if business name is missing and not already on setup page
    if (!userData.businessName && location.pathname !== '/setup') {
      navigate('/setup', { replace: true });
    }

    // Redirect to dashboard if business name exists and trying to access setup page
    if (userData.businessName && location.pathname === '/setup') {
      navigate('/dashboard', { replace: true });
    }
  }, [userData, loading, location.pathname, navigate]);

  return children;
};

const ProtectedLayout = () => {
  const { user } = useUser();
  useWebSocket(user?.id);

  return (
    <div className="w-full min-h-screen">
      <SignedIn>
        <DashboardLayout>
          <SetupCheck>
            <Suspense fallback={<div className="p-4 md:p-8"><Skeleton className="h-24 w-full" /><Skeleton className="mt-6 h-64 w-full" /></div>}>
              <Outlet />
            </Suspense>
          </SetupCheck>
        </DashboardLayout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <BrowserRouter>
          <Suspense fallback={<div className="p-8"><Skeleton className="h-12 w-full max-w-md" /></div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route path="/sign-up/*" element={<SignUpPage />} />
              <Route path="/sso-callback" element={<SSOCallback />} />
              
              {/* Setup Wizard (Protected but not in DashboardLayout) */}
              <Route path="/setup" element={
                <SignedIn>
                  <SetupCheck>
                    <SetupWizard />
                  </SetupCheck>
                </SignedIn>
              } />
              
              {/* Protected Routes */}
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/bots" element={<BotsPage />} />
                <Route path="/bots/connect" element={<ConnectBotPage />} />
                <Route path="/conversations" element={<ConversationsPage />} />
                <Route path="/keywords" element={<KeywordsPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Route>
              
              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ClerkProvider>
    </QueryClientProvider>
  );
}

export default App;
