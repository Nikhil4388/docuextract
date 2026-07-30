import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Stack, Alert, CircularProgress } from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || '';

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true });
  }, [email]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { token: otp, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setCountdown(60);
    } catch {
      setError('Failed to resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  if (success) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Password Reset!</Typography>
        <Typography color="text.secondary">Redirecting to login...</Typography>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
      <Paper elevation={8} sx={{ p: 4, width: 400, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" gutterBottom>Reset Password</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          Enter the 6-digit code sent to <strong>{email}</strong> and choose a new password.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="6-Digit Code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{ maxLength: 6, style: { fontSize: 26, letterSpacing: 8, textAlign: 'center' } }}
              fullWidth autoFocus
            />
            <TextField label="New Password" type="password" fullWidth required value={password} onChange={(e) => setPassword(e.target.value)} />
            <TextField label="Confirm Password" type="password" fullWidth required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || otp.length !== 6} sx={{ borderRadius: 2 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Reset Password'}
            </Button>
            <Button variant="text" fullWidth onClick={handleResend} disabled={resending || countdown > 0}>
              {resending ? 'Sending...' : countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
            </Button>
            <Button component={Link} to="/login" variant="text" fullWidth>Back to Login</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
