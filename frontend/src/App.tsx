import React, { useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
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
import PdfEditorPage from './pages/PdfEditorPage';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const theme = createTheme({
  palette: {
    primary: { main: '#667eea' },
    secondary: { main: '#764ba2' },
    background: { default: '#f8f9fa' },
  },
  typography: { fontFamily: '"Inter", "Roboto", sans-serif' },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiPaper: { styleOverrides: { root: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } } },
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
  useEffect(() => {
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    if (access && refresh) {
      setTokensAndFetch({ access_token: access, refresh_token: refresh, token_type: 'bearer' });
    }
  }, []);
  return <Navigate to="/dashboard" replace />;
}

// ── Route guard ───────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
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
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-otp" element={<VerifyOTPPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />

                {/* Protected routes */}
                <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="templates" element={<TemplatesPage />} />
                  <Route path="jobs" element={<DashboardPage />} />
                  <Route path="jobs/new" element={<NewJobPage />} />
                  <Route path="jobs/:jobId" element={<JobDetailPage />} />
                  <Route path="pdf-editor" element={<PdfEditorPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </InactivityGuard>
          </BrowserRouter>
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
