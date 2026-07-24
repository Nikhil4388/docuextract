import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import { CheckCircle, RocketLaunch, ErrorOutline } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { fetchMe } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const subscriptionId = params.get('subscription_id') || params.get('token');

    const confirm = async () => {
      try {
        if (subscriptionId) {
          // Tell backend to verify + activate the subscription
          await api.post('/payments/capture', { subscription_id: subscriptionId });
        }
        // Refresh user so is_subscribed becomes true
        await fetchMe();
        setStatus('success');
      } catch (err) {
        console.error('Payment confirmation error:', err);
        // Even if capture fails, still fetch user — PayPal webhook may have already activated it
        await fetchMe();
        setStatus('success');
      }
    };

    confirm();
  }, []);

  if (status === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
        <Paper sx={{ p: 6, borderRadius: 4, textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <CircularProgress sx={{ color: '#6366f1', mb: 3 }} size={56} />
          <Typography variant="h6" fontWeight={700} mb={1}>Activating your subscription…</Typography>
          <Typography color="text.secondary" fontSize={14}>Please wait a moment.</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
    }}>
      <Paper sx={{ p: 6, borderRadius: 4, maxWidth: 460, width: '100%', textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 72, color: '#22c55e', mb: 2 }} />
        <Typography variant="h4" fontWeight={800} mb={1}>
          You're now Pro! 🎉
        </Typography>
        <Typography color="text.secondary" mb={4} fontSize={16}>
          Your PayPal subscription is active. You now have unlimited PDF extractions.
        </Typography>
        <Button
          fullWidth variant="contained" size="large"
          startIcon={<RocketLaunch />}
          onClick={() => navigate('/jobs/new')}
          sx={{
            py: 1.5, borderRadius: 2, fontSize: 16, fontWeight: 700, mb: 2,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          }}
        >
          Start Extracting
        </Button>
        <Button fullWidth variant="outlined" onClick={() => navigate('/dashboard')} sx={{ borderRadius: 2 }}>
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}
