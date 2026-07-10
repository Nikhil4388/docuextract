import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LogoIcon from '../components/LogoIcon';

export default function LoginPage() {
  const navigate = useNavigate();
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/google`;
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#e8e2d8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: { xs: 1.5, md: 3 },
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #10b981; }
          50%       { opacity: 0.4; box-shadow: 0 0 3px #10b981; }
        }
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-10px) rotate(0.5deg); }
        }
        .login-wrap { animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .google-btn {
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1) !important;
        }
        .google-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 16px 40px rgba(0,0,0,0.25) !important;
          background-color: #1c1c1c !important;
        }
      `}</style>

      {/* Outer frame */}
      <Box className="login-wrap" sx={{
        width: '100%',
        maxWidth: 980,
        bgcolor: '#0c0c0c',
        borderRadius: { xs: '20px', md: '28px' },
        overflow: 'hidden',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: { xs: 'auto', md: 580 },
        boxShadow: '0 60px 140px rgba(0,0,0,0.55), 0 12px 40px rgba(0,0,0,0.3)',
      }}>

        {/* ── LEFT: Dark brand panel ── */}
        <Box sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 6, py: 7,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#0c0c0c',
        }}>
          {/* Orbs */}
          <Box sx={{
            position: 'absolute', width: 420, height: 420, borderRadius: '50%',
            top: -150, left: -100,
            background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <Box sx={{
            position: 'absolute', width: 260, height: 260, borderRadius: '50%',
            bottom: -70, right: -40,
            background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* Floating PDF card decorations */}
          <Box sx={{
            position: 'absolute', right: 40, top: 80,
            width: 90, height: 118, borderRadius: '12px',
            bgcolor: '#c4b5fd', opacity: 0.12,
            animation: 'floatCard 6s ease-in-out infinite',
            transform: 'rotate(-8deg)',
          }} />
          <Box sx={{
            position: 'absolute', right: 60, top: 100,
            width: 90, height: 118, borderRadius: '12px',
            bgcolor: '#818cf8', opacity: 0.1,
            animation: 'floatCard 6s ease-in-out 2s infinite',
            transform: 'rotate(-3deg)',
          }} />

          {/* Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 7 }}>
            <LogoIcon size={36} borderRadius={10} />
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>
              MultiPDF<span style={{ color: '#818cf8' }}>ToExcel</span>
            </Typography>
          </Box>

          {/* Live badge */}
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1, mb: 4,
            bgcolor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 10, px: 2, py: 0.8, width: 'fit-content',
          }}>
            <Box sx={{
              width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981',
              animation: 'blink 2.5s ease infinite',
            }} />
            <Typography sx={{ color: '#6ee7b7', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              AI ENGINE LIVE
            </Typography>
          </Box>

          {/* Headline */}
          <Typography sx={{
            fontSize: { md: 40, lg: 50 }, fontWeight: 900, lineHeight: 1.07, mb: 3,
            letterSpacing: -1.5,
            background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 40%, #818cf8 70%, #38bdf8 100%)',
            backgroundSize: '200% 200%',
            animation: 'shimmer 7s ease infinite',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Extract data<br />from any PDF<br />in seconds.
          </Typography>

          <Typography sx={{
            color: 'rgba(255,255,255,0.35)', fontSize: 15, lineHeight: 1.8, mb: 6, maxWidth: 380,
          }}>
            Upload hundreds of PDFs. AI reads every page — scanned or digital —
            and outputs a clean, structured Excel file instantly.
          </Typography>

          {/* Stats row */}
          <Box sx={{ display: 'flex', gap: 5 }}>
            {[
              { v: '100x',  l: 'Faster than manual' },
              { v: '95%+',  l: 'Extraction accuracy' },
              { v: '< 10s', l: 'Per 10 files' },
            ].map((s) => (
              <Box key={s.l}>
                <Typography sx={{
                  fontSize: 22, fontWeight: 900,
                  background: 'linear-gradient(135deg, #a5b4fc, #38bdf8)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>{s.v}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 500, mt: 0.2 }}>{s.l}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── RIGHT: Cream login panel ── */}
        <Box sx={{
          width: { xs: '100%', md: 420 },
          bgcolor: '#e8e2d8',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          px: { xs: 3.5, md: 5.5 },
          py: { xs: 5, md: 7 },
        }}>
          {/* Mobile brand */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 5 }}>
            <LogoIcon size={32} borderRadius={8} />
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0c0c0c' }}>
              MultiPDF<span style={{ color: '#6366f1' }}>ToExcel</span>
            </Typography>
          </Box>

          <Typography sx={{
            fontSize: 30, fontWeight: 900, color: '#0c0c0c',
            letterSpacing: -0.8, mb: 1, lineHeight: 1.2,
          }}>
            Welcome back
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#64748b', mb: 7, lineHeight: 1.65 }}>
            Sign in to access your extraction workspace.
          </Typography>

          {/* Google button */}
          <Button
            fullWidth
            className="google-btn"
            onClick={handleGoogleLogin}
            sx={{
              py: 2,
              borderRadius: '14px',
              bgcolor: '#0c0c0c',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              gap: 1.5,
              mb: 4,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
              '&:hover': { bgcolor: '#1c1c1c' },
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          {/* Feature pills */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, justifyContent: 'center', mb: 6 }}>
            {[
              { icon: '🔒', label: 'Secure' },
              { icon: '⚡', label: 'Fast' },
              { icon: '🎯', label: 'Accurate' },
            ].map((f) => (
              <Box key={f.label} sx={{
                display: 'flex', alignItems: 'center', gap: 0.7,
                bgcolor: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.09)',
                borderRadius: 10, px: 1.5, py: 0.6,
              }}>
                <Typography sx={{ fontSize: 12 }}>{f.icon}</Typography>
                <Typography sx={{ color: '#374151', fontSize: 11, fontWeight: 600 }}>{f.label}</Typography>
              </Box>
            ))}
          </Box>

          <Typography sx={{ color: 'rgba(0,0,0,0.28)', fontSize: 11, textAlign: 'center', lineHeight: 1.7 }}>
            By signing in you agree to our{' '}
            <Box component="span" onClick={() => navigate('/terms')} sx={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}>Terms of Service</Box>
            {' '}and{' '}
            <Box component="span" onClick={() => navigate('/privacy')} sx={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}>Privacy Policy</Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
