import React, { useState } from 'react';
import {
  Box, Button, Typography, Container, Paper, Chip,
  List, ListItem, ListItemIcon, ListItemText, CircularProgress,
} from '@mui/material';
import { CheckCircle, Lock, Star, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

const FREE_FEATURES = [
  '1 free extraction job',
  'Up to 10 PDFs per job',
  'Custom extraction templates',
  'Excel / CSV export',
  'Google login',
];

const PRO_FEATURES = [
  'Unlimited extraction jobs',
  'Unlimited PDFs per job',
  'Custom extraction templates',
  'Excel / CSV export',
  'Priority processing',
  'Email support',
  'API access (coming soon)',
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/payments/create-checkout-session');
      window.location.href = res.data.checkout_url;
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const isSubscribed = user?.is_subscribed;

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: '#f8f9fa',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      pt: 6, pb: 10, px: 2,
    }}>
      <Container maxWidth="md">
        {/* Back */}
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 4, color: 'text.secondary' }}>
          Back
        </Button>

        {/* Header */}
        <Box textAlign="center" mb={6}>
          <Chip label="💳 Simple Pricing" sx={{ mb: 2, bgcolor: '#667eea15', color: '#667eea', fontWeight: 700 }} />
          <Typography variant="h3" fontWeight={800} mb={1.5}>
            Upgrade to Pro
          </Typography>
          <Typography color="text.secondary" fontSize={18}>
            One flat price. Unlimited extractions. Cancel anytime.
          </Typography>
        </Box>

        {/* Cards */}
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>

          {/* Free */}
          <Paper sx={{ flex: 1, p: 4, borderRadius: 4, border: '2px solid #e5e7eb' }}>
            <Typography fontWeight={800} fontSize={18} mb={0.5}>Free</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 3 }}>
              <Typography variant="h3" fontWeight={900}>$0</Typography>
              <Typography color="text.secondary">/forever</Typography>
            </Box>
            <List dense>
              {FREE_FEATURES.map(f => (
                <ListItem key={f} disableGutters sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircle sx={{ fontSize: 18, color: '#9ca3af' }} />
                  </ListItemIcon>
                  <ListItemText primary={f} primaryTypographyProps={{ fontSize: 14, color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>
            <Button
              fullWidth variant="outlined" disabled
              sx={{ mt: 3, borderRadius: 2, py: 1.2, borderColor: '#e5e7eb', color: 'text.secondary' }}
            >
              Current Plan
            </Button>
          </Paper>

          {/* Pro */}
          <Paper sx={{
            flex: 1, p: 4, borderRadius: 4,
            border: '2px solid #667eea',
            background: 'linear-gradient(145deg, #ffffff 0%, #f5f4ff 100%)',
            position: 'relative', overflow: 'hidden',
          }}>
            <Chip
              label="⭐ RECOMMENDED"
              size="small"
              sx={{ position: 'absolute', top: 16, right: 16, bgcolor: '#667eea', color: 'white', fontWeight: 700, fontSize: 10 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Star sx={{ color: '#667eea', fontSize: 20 }} />
              <Typography fontWeight={800} fontSize={18} color="#667eea">Pro</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 3 }}>
              <Typography variant="h3" fontWeight={900}>$10</Typography>
              <Typography color="text.secondary">/month</Typography>
            </Box>
            <List dense>
              {PRO_FEATURES.map(f => (
                <ListItem key={f} disableGutters sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircle sx={{ fontSize: 18, color: '#667eea' }} />
                  </ListItemIcon>
                  <ListItemText primary={f} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
                </ListItem>
              ))}
            </List>

            {error && (
              <Typography color="error" fontSize={13} mt={1}>{error}</Typography>
            )}

            {isSubscribed ? (
              <Button
                fullWidth variant="contained" disabled
                sx={{ mt: 3, borderRadius: 2, py: 1.2, bgcolor: '#22c55e' }}
              >
                ✓ Already Subscribed
              </Button>
            ) : (
              <Button
                fullWidth variant="contained" onClick={handleUpgrade} disabled={loading}
                sx={{ mt: 3, borderRadius: 2, py: 1.4, fontSize: 15, fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': { opacity: 0.92 } }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Upgrade Now — $10/mo'}
              </Button>
            )}
            <Typography textAlign="center" fontSize={11} color="text.secondary" mt={1.5}>
              Secure payment via PayPal · Cancel anytime
            </Typography>
          </Paper>
        </Box>

        {/* FAQ */}
        <Box mt={8}>
          <Typography variant="h5" fontWeight={700} textAlign="center" mb={4}>Questions</Typography>
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your Settings page. You keep access until the end of the billing period.' },
            { q: 'What counts as one extraction job?', a: 'One job = one batch of PDFs you process together. You can include many PDFs in a single job.' },
            { q: 'Is payment secure?', a: 'Yes. Payments are handled by PayPal — we never see your card details. You can pay with your PayPal balance or any card.' },
            { q: 'What happens after my free job?', a: 'You can still view your previous results. To run more jobs, upgrade to Pro.' },
          ].map(f => (
            <Box key={f.q} sx={{ mb: 2.5, p: 3, bgcolor: 'white', borderRadius: 3, borderLeft: '3px solid #667eea' }}>
              <Typography fontWeight={700} mb={0.5}>{f.q}</Typography>
              <Typography color="text.secondary" fontSize={14}>{f.a}</Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
