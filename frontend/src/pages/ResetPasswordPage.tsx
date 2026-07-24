import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Stack, Alert, CircularProgress } from '@mui/material';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Reset link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Invalid reset link.</Typography>
        <Button component={Link} to="/forgot-password" variant="contained" sx={{ mt: 2 }}>Request New Link</Button>
      </Paper>
    </Box>
  );

  if (success) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Password Reset!</Typography>
        <Typography color="text.secondary">Redirecting to login in 3 seconds...</Typography>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
      <Paper elevation={8} sx={{ p: 4, width: 400, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" gutterBottom>Set New Password</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <Stack spacing={2} mt={1}>
            <TextField label="New Password" type="password" fullWidth required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <TextField label="Confirm Password" type="password" fullWidth required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ borderRadius: 2 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Reset Password'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
