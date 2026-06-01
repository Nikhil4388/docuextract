import React, { useState } from 'react';
import {
  Box, Button, Divider, TextField, Typography,
  Paper, Stack, Alert, CircularProgress,
} from '@mui/material';
import { Google, Microsoft } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setUnverifiedEmail(null);
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Login failed. Check your credentials.';
      if (detail.includes('not verified')) {
        setUnverifiedEmail(data.email);
      }
      setError(detail);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/google`;
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Paper elevation={8} sx={{ p: 4, width: 420, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
          DocuExtract
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          AI-Powered PDF Data Extraction
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            {unverifiedEmail && (
              <Box mt={1}>
                <Button
                  size="small" variant="outlined" color="warning"
                  onClick={() => navigate('/verify-otp', { state: { email: unverifiedEmail } })}
                >
                  Enter OTP Code
                </Button>
              </Box>
            )}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <TextField
              label="Email" type="email" fullWidth
              {...register('email')} error={!!errors.email} helperText={errors.email?.message}
            />
            <TextField
              label="Password" type="password" fullWidth
              {...register('password')} error={!!errors.password} helperText={errors.password?.message}
            />
            <Box textAlign="right">
              <Link to="/forgot-password" style={{ fontSize: 13, color: '#667eea' }}>
                Forgot password?
              </Link>
            </Box>
            <Button
              type="submit" variant="contained" fullWidth size="large"
              disabled={isLoading} sx={{ borderRadius: 2 }}
            >
              {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Stack>
        </form>

        <Divider sx={{ my: 3 }}>or continue with</Divider>

        <Button
          variant="outlined" startIcon={<Google />} fullWidth
          onClick={handleGoogleLogin} sx={{ borderRadius: 2 }}
        >
          Google
        </Button>

        <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
          No account?{' '}
          <Link to="/register" style={{ color: '#667eea', fontWeight: 600 }}>Sign up free</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
