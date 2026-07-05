import React, { useState } from 'react';
import {
  Box, Button, Typography, Container, Paper, Chip,
  List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import { CheckCircle, Star, ArrowBack, Favorite, Coffee, OpenInNew } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const KOFI_USERNAME = 'docuextract_ashen_vercel';

const ALL_FEATURES = [
  '2 free extraction jobs to try',
  'Upload multiple PDFs at once',
  'Custom extraction templates',
  'Excel / CSV export',
  'AI-powered data extraction',
  'Google login',
  'Priority support',
];

const AMOUNTS = [10, 15, 20];

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState(10);

  const handleDonate = () => {
    window.open(`https://ko-fi.com/${KOFI_USERNAME}`, '_blank');
  };

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: '#f8f9fa',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      pt: 6, pb: 10, px: 2,
    }}>
      <Container maxWidth="sm">
        {/* Back */}
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 4, color: 'text.secondary' }}>
          Back
        </Button>

        {/* Header */}
        <Box textAlign="center" mb={5}>
          <Chip label="☕ Support the project" sx={{ mb: 2, bgcolor: '#fff3e0', color: '#e65100', fontWeight: 700 }} />
          <Typography variant="h3" fontWeight={800} mb={1.5}>
            MultiPDFToExcel is Free
          </Typography>
          <Typography color="text.secondary" fontSize={18}>
            All features are completely free. If it saves you time, consider buying us a coffee to keep the servers running!
          </Typography>
        </Box>

        {/* Free card */}
        <Paper sx={{
          p: 4, borderRadius: 4,
          border: '2px solid #667eea',
          background: 'linear-gradient(145deg, #ffffff 0%, #f5f4ff 100%)',
          mb: 3,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Star sx={{ color: '#667eea', fontSize: 22 }} />
            <Typography fontWeight={800} fontSize={20} color="#667eea">Everything Free</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 3 }}>
            <Typography variant="h2" fontWeight={900}>$0</Typography>
            <Typography color="text.secondary" fontSize={18}>/forever</Typography>
          </Box>
          <List dense>
            {ALL_FEATURES.map(f => (
              <ListItem key={f} disableGutters sx={{ py: 0.6 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircle sx={{ fontSize: 18, color: '#667eea' }} />
                </ListItemIcon>
                <ListItemText primary={f} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
              </ListItem>
            ))}
          </List>
          <Button
            fullWidth variant="contained" size="large"
            onClick={() => navigate('/jobs/new')}
            sx={{
              mt: 3, borderRadius: 2, py: 1.4, fontSize: 15, fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Start Extracting — It's Free
          </Button>
        </Paper>

        {/* Support / donation card */}
        <Paper sx={{ p: 4, borderRadius: 4, border: '2px solid #fde68a', bgcolor: '#fffbeb', textAlign: 'center' }}>
          <Coffee sx={{ fontSize: 40, color: '#d97706', mb: 1 }} />
          <Typography fontWeight={800} fontSize={18} mb={0.5}>Like the tool? Buy us a coffee ☕</Typography>
          <Typography color="text.secondary" fontSize={14} mb={3}>
            Donate $10 to unlock 20 extraction jobs. Servers aren't free — your support keeps this running!
          </Typography>

          {/* Amount selector */}
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mb: 3 }}>
            {AMOUNTS.map(amt => (
              <Box
                key={amt}
                onClick={() => setSelected(amt)}
                sx={{
                  px: 2.5, py: 1.2, borderRadius: 2, cursor: 'pointer', fontWeight: 700,
                  fontSize: 15, border: '2px solid',
                  borderColor: selected === amt ? '#f59e0b' : '#e5e7eb',
                  bgcolor: selected === amt ? '#fef3c7' : 'white',
                  color: selected === amt ? '#92400e' : 'text.secondary',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: '#f59e0b', bgcolor: '#fffbeb' },
                }}
              >
                ${amt}
              </Box>
            ))}
          </Box>

          <Button
            fullWidth variant="contained" size="large"
            startIcon={<Favorite />}
            endIcon={<OpenInNew fontSize="small" />}
            onClick={handleDonate}
            sx={{
              borderRadius: 2, py: 1.5, fontSize: 16, fontWeight: 700,
              bgcolor: '#f59e0b', color: 'white',
              '&:hover': { bgcolor: '#d97706' },
              boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
            }}
          >
            Donate ${selected} on Ko-fi
          </Button>
          <Typography fontSize={11} color="text.secondary" mt={1.5}>
            Opens Ko-fi in a new tab · Pay via PayPal or card · No Ko-fi account needed
          </Typography>

          {/* Step-by-step instructions */}
          <Box sx={{ mt: 2.5, p: 2.5, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd', textAlign: 'left' }}>
            <Typography fontSize={13} fontWeight={700} color="#0369a1" mb={1}>⚡ How it works (3 steps)</Typography>
            {[
              `Click the button above — Ko-fi opens in a new tab`,
              `Pay with PayPal or card. Use this email: ${user?.email ?? 'your account email'}`,
              `Come back here and click "Refresh to Check Access" below — you'll be unlocked instantly`,
            ].map((step, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 0.8 }}>
                <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#0ea5e9', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.1 }}>
                  {i + 1}
                </Box>
                <Typography fontSize={12} color="text.secondary">{step}</Typography>
              </Box>
            ))}
          </Box>

          {/* Post-donation refresh */}
          <Box sx={{ mt: 2.5, p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
            <Typography fontSize={13} fontWeight={600} color="#15803d" mb={0.5}>
              ✅ Already donated?
            </Typography>
            <Typography fontSize={12} color="text.secondary" mb={1}>
              Your account unlocks automatically once we receive your donation. Use the same email you signed up with on Ko-fi.
            </Typography>
            <Button fullWidth size="small" variant="outlined"
              onClick={() => window.location.reload()}
              sx={{ borderRadius: 2, borderColor: '#22c55e', color: '#16a34a', fontSize: 12 }}>
              Refresh to Check Access
            </Button>
          </Box>
        </Paper>

        {/* FAQ */}
        <Box mt={6}>
          <Typography variant="h5" fontWeight={700} textAlign="center" mb={3}>Questions</Typography>
          {[
            { q: 'Is it really free?', a: 'Yes, 100% free. All features including unlimited extractions are free to use.' },
            { q: 'Why is it free?', a: "We're just getting started and want people to use it. Donations from supporters help cover server costs." },
            { q: 'Will it stay free?', a: 'We plan to keep a generous free tier always. If we ever add a paid plan, existing users will get notice in advance.' },
            { q: 'How do I support?', a: 'Click the button above, pick an amount, and pay via PayPal. No Ko-fi account needed — just your PayPal or card.' },
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
