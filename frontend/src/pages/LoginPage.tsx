import { Box, Button, Typography } from '@mui/material';

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/google`;
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      background: '#0f0c29',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated gradient orbs */}
      <Box sx={{
        position: 'absolute', width: 600, height: 600,
        borderRadius: '50%', top: -200, left: -200,
        background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
        animation: 'pulse 8s ease-in-out infinite',
      }} />
      <Box sx={{
        position: 'absolute', width: 500, height: 500,
        borderRadius: '50%', bottom: -150, right: -100,
        background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)',
        animation: 'pulse 10s ease-in-out infinite 2s',
      }} />
      <Box sx={{
        position: 'absolute', width: 300, height: 300,
        borderRadius: '50%', top: '40%', right: '25%',
        background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)',
        animation: 'pulse 12s ease-in-out infinite 4s',
      }} />

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.8; }
          50% { transform: scale(1.15) translate(20px, -20px); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Left panel — branding */}
      <Box sx={{
        flex: 1, display: { xs: 'none', md: 'flex' },
        flexDirection: 'column', justifyContent: 'center',
        px: 8, position: 'relative', zIndex: 1,
      }}>
        <Box sx={{ animation: 'float 6s ease-in-out infinite' }}>
          <Typography sx={{
            fontSize: 48, fontWeight: 900, lineHeight: 1.1, mb: 2,
            background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #818cf8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Extract data from<br />any PDF — instantly.
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 18, mb: 4, lineHeight: 1.6 }}>
            Upload hundreds of PDFs. Get structured Excel<br />data in seconds using AI.
          </Typography>

          {/* Feature pills */}
          {['⚡ 10 files in under 8 seconds', '🎯 95%+ extraction accuracy', '📊 Export to Excel instantly'].map((f) => (
            <Box key={f} sx={{
              display: 'inline-flex', alignItems: 'center',
              bgcolor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6, px: 2, py: 0.8, mb: 1.5, mr: 1,
              backdropFilter: 'blur(10px)',
            }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>{f}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right panel — login card */}
      <Box sx={{
        width: { xs: '100%', md: 480 },
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        p: 3, position: 'relative', zIndex: 1,
      }}>
        <Box sx={{
          width: '100%', maxWidth: 400,
          bgcolor: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4, p: 5,
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}>
          {/* Logo */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: 2.5, mx: 'auto', mb: 2,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99,102,241,0.5)',
              fontSize: 28,
            }}>
              📄
            </Box>
            <Typography sx={{
              fontWeight: 800, fontSize: 22, color: 'white', mb: 0.5,
            }}>
              MultiPDFToExcel
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
              AI-Powered PDF Data Extraction
            </Typography>
          </Box>

          {/* Divider */}
          <Box sx={{ border: '1px solid rgba(255,255,255,0.08)', mb: 3 }} />

          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, mb: 2, textAlign: 'center' }}>
            Sign in to your account
          </Typography>

          {/* Google button */}
          <Button
            fullWidth size="large"
            onClick={handleGoogleLogin}
            sx={{
              py: 1.6, borderRadius: 2.5, fontSize: 15, fontWeight: 600,
              bgcolor: 'white', color: '#1a1a2e',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.92)',
                transform: 'translateY(-1px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              },
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              display: 'flex', gap: 1.5,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', mt: 3 }}>
            By signing in, you agree to our Terms of Service
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
