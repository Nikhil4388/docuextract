import React, { useState } from 'react';
import {
  Box, Button, Typography, Container, Paper, Chip,
  List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogContent, IconButton, CircularProgress,
} from '@mui/material';
import { CheckCircle, Star, ArrowBack, Favorite, Coffee, Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const KOFI_USERNAME = 'multipdfstoexcel';

const ALL_FEATURES = [
  'Unlimited extraction jobs',
  'Upload multiple PDFs at once',
  'Custom extraction templates',
  'Excel / CSV export',
  'AI-powered data extraction',
  'Google login',
  'Priority support',
];

const AMOUNTS = [3, 5, 10, 20];

export default function PricingPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(5);
  const [iframeLoading, setIframeLoading] = useState(true);

  const handleDonate = () => {
    // Open Ko-fi directly with the amount pre-filled
    const url = `https://ko-fi.com/${KOFI_USERNAME}`;
    window.open(url, '_blank', 'width=550,height=650,scrollbars=yes,resizable=yes');
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
            Servers cost money. If this saves you hours of manual work, any donation helps keep it running.
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
            onClick={() => setOpen(true)}
            sx={{
              borderRadius: 2, py: 1.5, fontSize: 16, fontWeight: 700,
              bgcolor: '#f59e0b', color: 'white',
              '&:hover': { bgcolor: '#d97706' },
              boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
            }}
          >
            Support with ${selected} — One Click
          </Button>
          <Typography fontSize={11} color="text.secondary" mt={1.5}>
            Completely optional · Secure via PayPal · No account required
          </Typography>
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

      {/* ── Donation popup ── */}
      <Dialog
        open={open}
        onClose={() => { setOpen(false); setIframeLoading(true); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', m: 2 } }}
      >
        <Box sx={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Coffee sx={{ color: 'white', fontSize: 22 }} />
            <Typography fontWeight={800} color="white" fontSize={16}>Support MultiPDFToExcel</Typography>
          </Box>
          <IconButton size="small" onClick={() => { setOpen(false); setIframeLoading(true); }} sx={{ color: 'white' }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0, position: 'relative', minHeight: 500 }}>
          {iframeLoading && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'white' }}>
              <CircularProgress sx={{ color: '#f59e0b' }} />
              <Typography color="text.secondary" fontSize={13}>Loading payment form…</Typography>
            </Box>
          )}
          <iframe
            id="kofiframe"
            src={`https://ko-fi.com/${KOFI_USERNAME}/?hidefeed=true&widget=true&embed=true&preview=true`}
            style={{ border: 'none', width: '100%', height: '500px', display: 'block' }}
            title="Support MultiPDFToExcel on Ko-fi"
            onLoad={() => setIframeLoading(false)}
          />
        </DialogContent>

        <Box sx={{ px: 3, py: 2, bgcolor: '#f9fafb', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
          <Typography fontSize={11} color="text.secondary">
            🔒 Secure payment via PayPal · No Ko-fi account needed
          </Typography>
          <Button
            size="small" variant="text"
            onClick={handleDonate}
            sx={{ mt: 0.5, fontSize: 11, color: '#f59e0b', textDecoration: 'underline' }}
          >
            Open in new window instead
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
