import React, { useState, useEffect } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Stack, Alert, CircularProgress,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!email) navigate('/register');
  }, [email]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/verify-otp', { email, otp });
      setSuccess('Email verified! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true); setError(''); setSuccess('');
    try {
      await api.post('/auth/resend-otp', { email });
      setSuccess('New code sent! Check your email.');
      setCountdown(60);
    } catch {
      setError('Failed to resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
      <Paper elevation={8} sx={{ p: 4, width: 400, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" gutterBottom>Verify Your Email</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          We sent a 6-digit code to <strong>{email}</strong>
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Stack spacing={2}>
          <TextField
            label="6-Digit Code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{ maxLength: 6, style: { fontSize: 28, letterSpacing: 8, textAlign: 'center' } }}
            fullWidth
            autoFocus
          />
          <Button
            variant="contained" fullWidth size="large"
            onClick={handleVerify} disabled={loading || otp.length !== 6}
            sx={{ borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Verify Email'}
          </Button>
          <Button
            variant="text" fullWidth onClick={handleResend}
            disabled={resending || countdown > 0}
          >
            {resending ? 'Sending...' : countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
