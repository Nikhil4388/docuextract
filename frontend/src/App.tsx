import React, { useEffect, useCallback, useRef, useState, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { SnackbarProvider, useSnackbar } from 'notistack';

import { useAuthStore } from './store/authStore';

// ── Global Error Boundary ─────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', background: '#e8e2d8',
          padding: 32, textAlign: 'center', fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
          <h2 style={{ color: '#0c0c0c', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
            Something went wrong
          </h2>
          <p style={{ color: '#64748b', fontSize: 16, maxWidth: 480, lineHeight: 1.6, marginBottom: 24 }}>
            An unexpected error occurred. This has been noted and our team will look into it.
            Please try refreshing the page.
            <br /><br />
            If the problem continues, please contact us at{' '}
            <a href="mailto:nikhil1996shelke@multipdfstoexcel.com" style={{ color: '#6366f1' }}>
              nikhil1996shelke@multipdfstoexcel.com
            </a>{' '}
            so we can help you right away.
          </p>
          <button
            onClick={() => { this.setState({ crashed: false }); window.location.href = '/'; }}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', border: 'none', borderRadius: 10,
              padding: '12px 28px', fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
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
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminPage from './pages/AdminPage';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const theme = createTheme({
  palette: {
    mode: 'light',
    primary:    { main: '#6366f1' },
    secondary:  { main: '#8b5cf6' },
    background: { default: '#e8e2d8', paper: '#ffffff' },
    success:    { main: '#10b981' },
    error:      { main: '#ef4444' },
    info:       { main: '#06b6d4' },
    warning:    { main: '#f59e0b' },
    text:       { primary: '#0c0c0c', secondary: '#64748b' },
    divider:    'rgba(0,0,0,0.08)',
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Roboto", sans-serif',
    h4: { fontWeight: 900, letterSpacing: -0.5 },
    h5: { fontWeight: 800, letterSpacing: -0.3 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { background: #e8e2d8 !important; color: #0c0c0c; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.04); }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.55); }
        ::selection { background: rgba(99,102,241,0.2); color: #0c0c0c; }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          letterSpacing: 0.1,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          '&:hover': {
            background: 'linear-gradient(135deg, #5254cc 0%, #7c3aed 100%)',
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          },
          transition: 'all 0.2s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, fontSize: 11 } },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: 'rgba(255,255,255,0.8)',
            '& fieldset': { borderColor: 'rgba(0,0,0,0.12)' },
            '&:hover fieldset': { borderColor: '#818cf8' },
            '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
          },
          '& .MuiInputLabel-root': { color: '#64748b' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'rgba(0,0,0,0.07)' },
        head: { background: '#f5ede0', color: '#374151', fontWeight: 700 },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: 'rgba(0,0,0,0.08)' } },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-columnHeaders': { background: '#f5ede0', borderBottom: '1px solid rgba(0,0,0,0.08)' },
          '& .MuiDataGrid-row:hover': { background: 'rgba(99,102,241,0.04)' },
          '& .MuiDataGrid-cell': { borderColor: 'rgba(0,0,0,0.05)' },
          '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(0,0,0,0.08)' },
        },
      },
    },
  },
});

function InactivityGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      logout().then(() =>
        enqueueSnackbar('Logged out due to inactivity.', { variant: 'warning', autoHideDuration: 6000 })
      );
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

function AuthCallbackPage() {
  const { setTokensAndFetch } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    // Use window.location.search directly — more reliable on a fresh page load
    // than useSearchParams which depends on React Router fully settling first
    const urlParams = new URLSearchParams(window.location.search);
    const access_token = urlParams.get('access_token');
    const refresh_token = urlParams.get('refresh_token');
    if (!access_token || !refresh_token) {
      navigate('/login', { replace: true });
      return;
    }
    setTokensAndFetch({ access_token, refresh_token })
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => { setError(true); navigate('/login', { replace: true }); });
  }, []);

  if (error) return <Navigate to="/login" replace />;
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: '#07071a',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48,
          border: '3px solid rgba(99,102,241,0.2)',
          borderTop: '3px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: '#a5b4fc', fontFamily: 'Inter, sans-serif', fontSize: 15 }}>Signing you in…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  if (isInitializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#07071a' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicHome() {
  const { isAuthenticated, isInitializing } = useAuthStore();
  if (isInitializing) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

// Restores session on mount — must be inside BrowserRouter to use useLocation
function AuthInit() {
  const { initAuth, setInitialized } = useAuthStore();
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.includes('/auth/callback')) {
      // AuthCallbackPage handles its own tokens; just mark init done
      setInitialized();
    } else {
      initAuth();
    }
  }, []);
  return null;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <ErrorBoundary>
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <BrowserRouter>
            <AuthInit />
            <InactivityGuard>
              <Routes>
                <Route path="/" element={<PublicHome />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-otp" element={<VerifyOTPPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/payment/success" element={<PaymentSuccessPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />

                <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="templates" element={<TemplatesPage />} />
                  <Route path="jobs" element={<JobsPage />} />
                  <Route path="jobs/new" element={<NewJobPage />} />
                  <Route path="jobs/:jobId" element={<JobDetailPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="admin" element={<AdminPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </InactivityGuard>
          </BrowserRouter>
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
