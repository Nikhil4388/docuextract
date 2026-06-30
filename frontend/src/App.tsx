import React, { useEffect, useCallback, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { SnackbarProvider, useSnackbar } from 'notistack';

import { useAuthStore } from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOTPPage from './pages/VerifyOTPPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import TemplatesPage from './pages/TemplatesPage';
import NewJobPage from './pages/NewJobPage';
import JobDetailPage from './pages/JobDetailPage';
import SettingsPage from './pages/SettingsPage';
import JobsPage from './pages/JobsPage';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const theme = createTheme({
  palette: {
    primary: { main: '#6366f1' },
    secondary: { main: '#8b5cf6' },
    background: { default: '#f1f5f9', paper: '#ffffff' },
    success: { main: '#10b981' },
    error: { main: '#ef4444' },
    info: { main: '#3b82f6' },
    warning: { main: '#f59e0b' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', fontWeight: 700,
          boxShadow: 'none', '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          '&:hover': { background: 'linear-gradient(135deg, #5254cc, #7c3aed)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { boxShadow: '0 4px 20px rgba(0,0,0,0.06)', backgroundImage: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
});

// ── Auto-logout after 5 min inactivity ───────────────────────────────────────
function InactivityGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      logout();
      enqueueSnackbar('You were logged out due to 5 minutes of inactivity.', {
        variant: 'warning', autoHideDuration: 6000,
      });
    }, INACTIVITY_TIMEOUT_MS);
  }, [isAuthenticated, logout, enqueueSnackbar]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isAuthenticated, resetTimer]);

  return <>{children}</>;
}

// ── OAuth callback ────────────────────────────────────────────────────────────
function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { setTokensAndFetch } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    if (access && refresh) {
      setTokensAndFetch({ access_token: access, refresh_token: refresh, token_type: 'bearer' })
        .then(() => navigate('/dashboard', { replace: true }))
        .catch(() => { setError(true); navigate('/login', { replace: true }); });
    } else {
      navigate('/login', { replace: true });
    }
  }, []);

  if (error) return <Navigate to="/login" replace />;
  // Show spinner while tokens are being saved and user is fetched
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #667eea', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#667eea', fontFamily: 'Inter, sans-serif' }}>Signing you in…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Route guard ───────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// ── Redirect logged-in users away from landing page ───────────────────────────
function PublicHome() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

export default function App() {
  const { fetchMe, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) fetchMe();
  }, []);

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <BrowserRouter>
            <InactivityGuard>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<PublicHome />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-otp" element={<VerifyOTPPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/payment/success" element={<PaymentSuccessPage />} />

                {/* Protected routes */}
                <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="templates" element={<TemplatesPage />} />
                  <Route path="jobs" element={<JobsPage />} />
                  <Route path="jobs/new" element={<NewJobPage />} />
                  <Route path="jobs/:jobId" element={<JobDetailPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </InactivityGuard>
          </BrowserRouter>
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
