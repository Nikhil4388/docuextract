import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      px: 3,
      textAlign: 'center',
    }}>
      {/* Big 404 */}
      <Typography sx={{
        fontSize: { xs: 96, md: 140 },
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: -6,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        mb: 2,
        userSelect: 'none',
      }}>
        404
      </Typography>

      <Typography variant="h5" fontWeight={800} mb={1.5} color="#0c0c0c">
        Page not found
      </Typography>

      <Typography color="text.secondary" fontSize={16} mb={4} maxWidth={420} lineHeight={1.75}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/')}
          sx={{
            borderRadius: 2,
            px: 4,
            py: 1.4,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          }}
        >
          Go Home
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate(-1)}
          sx={{ borderRadius: 2, px: 4, py: 1.4, fontWeight: 700, borderColor: '#6366f1', color: '#6366f1' }}
        >
          Go Back
        </Button>
      </Box>
    </Box>
  );
}
