import React from 'react';
import {
  Box, Button, Typography, Container, Paper, Chip,
  List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import { CheckCircle, Star, ArrowBack, Favorite, Coffee } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// ── Replace this with your actual Ko-fi or Buy Me a Coffee link ──────────────
const SUPPORT_LINK = 'https://ko-fi.com/MultiPDFToExcel';
// ─────────────────────────────────────────────────────────────────────────────

const ALL_FEATURES = [
  'Unlimited extraction jobs',
  'Upload multiple PDFs at once',
  'Custom extraction templates',
  'Excel / CSV export',
  'AI-powered data extraction',
  'Google login',
  'Priority support',
];

export default function PricingPage() {
  const navigate = useNavigate();

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
            MultiPDFToExcel is free, but servers cost money. If this tool saves you hours of manual work,
            a small donation helps keep it running and improving.
          </Typography>
          <Button
            fullWidth variant="contained" size="large"
            startIcon={<Favorite />}
            onClick={() => window.open(SUPPORT_LINK, '_blank')}
            sx={{
              borderRadius: 2, py: 1.4, fontSize: 15, fontWeight: 700,
              bgcolor: '#f59e0b', color: 'white',
              '&:hover': { bgcolor: '#d97706' },
            }}
          >
            Support on Ko-fi — any amount
          </Button>
          <Typography fontSize={11} color="text.secondary" mt={1.5}>
            Completely optional · No account required
          </Typography>
        </Paper>

        {/* FAQ */}
        <Box mt={6}>
          <Typography variant="h5" fontWeight={700} textAlign="center" mb={3}>Questions</Typography>
          {[
            { q: 'Is it really free?', a: 'Yes, 100% free. All features including unlimited extractions are free to use.' },
            { q: 'Why is it free?', a: 'We\'re just getting started and want people to use it. Donations from supporters help cover server costs.' },
            { q: 'Will it stay free?', a: 'We plan to keep a generous free tier always. If we ever add a paid plan, existing users will get notice in advance.' },
            { q: 'How do I support the project?', a: 'Click the Ko-fi button above to make a one-time donation of any amount. It goes directly to keeping the servers running.' },
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
