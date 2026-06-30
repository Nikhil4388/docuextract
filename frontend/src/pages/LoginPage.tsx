import { Box, Button, Typography } from '@mui/material';

const DOTS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  size: Math.random() * 3 + 1,
  x: Math.random() * 100,
  y: Math.random() * 100,
  delay: Math.random() * 8,
  duration: 4 + Math.random() * 6,
}));

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/google`;
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#07071a', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes floatDot {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-30px) scale(1.2); opacity: 0.7; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(99,102,241,0.3); }
          50% { box-shadow: 0 0 80px rgba(139,92,246,0.5), 0 0 120px rgba(99,102,241,0.2); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(99,102,241,0.3); }
          50% { border-color: rgba(139,92,246,0.7); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Floating dots */}
      {DOTS.map((d) => (
        <Box key={d.id} sx={{
          position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
          width: d.size, height: d.size, borderRadius: '50%',
          bgcolor: d.id % 3 === 0 ? '#6366f1' : d.id % 3 === 1 ? '#8b5cf6' : '#06b6d4',
          animation: `floatDot ${d.duration}s ease-in-out ${d.delay}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Big glow orbs */}
      <Box sx={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', top: -200, left: -200,
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', bottom: -150, right: 100,
        background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', top: '30%', right: '30%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* Grid overlay */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* LEFT — brand panel */}
      <Box sx={{
        flex: 1, display: { xs: 'none', md: 'flex' },
        flexDirection: 'column', justifyContent: 'center', px: { md: 8, lg: 12 },
        position: 'relative', zIndex: 1,
        animation: 'fadeUp 0.8s ease forwards',
      }}>
        {/* Badge */}
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1, mb: 4,
          bgcolor: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 6, px: 2, py: 0.7, width: 'fit-content',
          animation: 'borderGlow 3s ease infinite',
        }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981',
            boxShadow: '0 0 8px #10b981', animation: 'glowPulse 2s ease infinite' }} />
          <Typography sx={{ color: '#a5b4fc', fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
            AI-POWERED EXTRACTION ENGINE
          </Typography>
        </Box>

        <Typography sx={{
          fontSize: { md: 44, lg: 56 }, fontWeight: 900, lineHeight: 1.05, mb: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 40%, #818cf8 70%, #06b6d4 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 6s ease infinite',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Extract data<br />from any PDF<br />in seconds.
        </Typography>

        <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 17, lineHeight: 1.7, mb: 5, maxWidth: 460 }}>
          Upload hundreds of PDFs. AI reads every page — scanned or digital —
          and outputs a clean, structured Excel file instantly.
        </Typography>

        {/* Stats row */}
        <Box sx={{ display: 'flex', gap: 4 }}>
          {[
            { value: '10x', label: 'Faster than manual' },
            { value: '95%+', label: 'Accuracy rate' },
            { value: '< 10s', label: 'Per 10 files' },
          ].map((s) => (
            <Box key={s.label}>
              <Typography sx={{
                fontSize: 28, fontWeight: 900,
                background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>{s.value}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 500 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* RIGHT — login card */}
      <Box sx={{
        width: { xs: '100%', md: 500 },
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        p: 3, position: 'relative', zIndex: 1,
        animation: 'fadeUp 0.8s ease 0.2s both',
      }}>
        <Box sx={{
          width: '100%', maxWidth: 420,
          bgcolor: 'rgba(15,15,35,0.8)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 5, p: { xs: 4, sm: 5 },
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          animation: 'glowPulse 6s ease infinite',
        }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: 3, mx: 'auto', mb: 2.5,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
              backgroundSize: '200% 200%', animation: 'gradientShift 4s ease infinite',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, boxShadow: '0 12px 32px rgba(99,102,241,0.5)',
            }}>📄</Box>
            <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>
              MultiPDFToExcel
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, mt: 0.5 }}>
              AI-Powered Document Intelligence
            </Typography>
          </Box>

          {/* Divider with text */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(255,255,255,0.08)' }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Sign in to continue</Typography>
            <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(255,255,255,0.08)' }} />
          </Box>

          {/* Google Button */}
          <Button fullWidth size="large" onClick={handleGoogleLogin}
            sx={{
              py: 1.8, borderRadius: 3, fontSize: 15, fontWeight: 700,
              bgcolor: 'white', color: '#1a1a2e', gap: 1.5,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.95)',
                transform: 'translateY(-2px)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
              },
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          {/* Feature pills */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 3, justifyContent: 'center' }}>
            {['🔒 Secure', '⚡ Fast', '🎯 Accurate'].map((f) => (
              <Box key={f} sx={{
                bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 4, px: 1.5, py: 0.5,
              }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600 }}>{f}</Typography>
              </Box>
            ))}
          </Box>

          <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', mt: 3 }}>
            By signing in you agree to our Terms of Service
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
