import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Stack, Alert, CircularProgress } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const schema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'At least 6 characters'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      });
      // Redirect to OTP verification page
      navigate('/verify-otp', { state: { email: data.email } });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Paper elevation={8} sx={{ p: 4, width: 420, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>Create Account</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          Get started with DocuExtract
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <TextField label="Full Name" fullWidth {...register('full_name')} error={!!errors.full_name} helperText={errors.full_name?.message} />
            <TextField label="Email" type="email" fullWidth {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
            <TextField label="Password" type="password" fullWidth {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
            <TextField label="Confirm Password" type="password" fullWidth {...register('confirm_password')} error={!!errors.confirm_password} helperText={errors.confirm_password?.message} />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ borderRadius: 2 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
            </Button>
          </Stack>
        </form>
        <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#667eea', fontWeight: 600 }}>Sign in</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
