import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Stack, Alert, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Paper sx={{ p: 4, maxWidth: 400, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>Check Your Email</Typography>
          <Typography color="text.secondary" mb={3}>
            If <strong>{email}</strong> is registered, we sent a password reset link.
          </Typography>
          <Button component={Link} to="/login" variant="contained" sx={{ borderRadius: 2 }}>Back to Login</Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Paper elevation={8} sx={{ p: 4, width: 400, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" gutterBottom>Forgot Password</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          Enter your email and we'll send a reset link.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField label="Email" type="email" fullWidth required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || !email} sx={{ borderRadius: 2 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Send Reset Link'}
            </Button>
            <Button component={Link} to="/login" variant="text" fullWidth>Back to Login</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
