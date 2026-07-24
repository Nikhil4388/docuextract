import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LogoIcon from '../components/LogoIcon';

const CONTACTS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    label: 'EMAIL',
    value: 'nikhil1996shelke@gmail.com',
    href: 'mailto:nikhil1996shelke@gmail.com',
    color: '#6366f1',
    bg: '#eef2ff',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
    label: 'LINKEDIN',
    value: 'linkedin.com/in/nikhilshelke2211',
    href: 'https://linkedin.com/in/nikhilshelke2211',
    color: '#0a66c2',
    bg: '#eff6ff',
  },
];

export default function ContactPage() {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const copyEmail = () => {
    navigator.clipboard.writeText('nikhil1996shelke@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ bgcolor: '#e8e2d8', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .contact-row { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .contact-row:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important; }
        .contact-card { animation: fadeSlideUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* ── Nav ── */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 100,
        bgcolor: 'rgba(232,226,216,0.92)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        px: { xs: 3, md: 6 }, py: 1.8,
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Box onClick={() => navigate('/')} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer' }}>
          <LogoIcon size={30} borderRadius={8} />
          <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#0c0c0c' }}>
            MultiPDFs<span style={{ color: '#6366f1' }}>ToExcel</span>
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box
          onClick={() => navigate('/')}
          sx={{
            px: 2, py: 0.8, borderRadius: 8, cursor: 'pointer',
            bgcolor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
            fontSize: 13, fontWeight: 600, color: '#374151',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' }, transition: 'all 0.15s',
          }}
        >
          ← Back
        </Box>
        <Box
          onClick={() => navigate('/login')}
          sx={{
            px: 2.5, py: 0.9, borderRadius: 10,
            bgcolor: '#0c0c0c', color: 'white',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            '&:hover': { bgcolor: '#2a2a2a' }, transition: 'all 0.15s',
          }}
        >
          Sign In
        </Box>
      </Box>

      {/* ── Content ── */}
      <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', px: { xs: 3, md: 4 },
        py: { xs: 6, md: 10 }, minHeight: 'calc(100vh - 64px)',
      }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }} className="contact-card" style={{ animationDelay: '0s' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#6366f1', mb: 1.5 }}>
            GET IN TOUCH
          </Typography>
          <Typography sx={{ fontSize: { xs: 32, md: 48 }, fontWeight: 900, color: '#0c0c0c', letterSpacing: -1.5, lineHeight: 1 }}>
            Contact
          </Typography>
          <Typography sx={{ fontSize: 15, color: '#64748b', mt: 2, fontWeight: 400 }}>
            Reach out via any channel below
          </Typography>
        </Box>

        {/* Contact card */}
        <Box
          className="contact-card"
          style={{ animationDelay: '0.1s' }}
          sx={{
            bgcolor: 'white', borderRadius: '28px',
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
            p: { xs: 3, md: 4 },
            width: '100%', maxWidth: 480,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {CONTACTS.map((c) => (
              <Box
                key={c.label}
                className="contact-row"
                component="a"
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  p: 2.5, borderRadius: '16px',
                  bgcolor: c.bg, border: `1px solid ${c.color}18`,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <Box sx={{
                  width: 44, height: 44, borderRadius: '13px',
                  bgcolor: 'white', border: `1px solid ${c.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.color, flexShrink: 0,
                  boxShadow: `0 2px 10px ${c.color}18`,
                }}>
                  {c.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, mb: 0.3 }}>
                    {c.label}
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }} noWrap>
                    {c.value}
                  </Typography>
                </Box>
                <Box sx={{ color: c.color, fontSize: 16, opacity: 0.6, flexShrink: 0 }}>→</Box>
              </Box>
            ))}
          </Box>

          {/* Copy email */}
          <Box
            onClick={copyEmail}
            sx={{
              mt: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5,
              py: 1.5, borderRadius: '14px', cursor: 'pointer',
              bgcolor: copied ? '#ecfdf5' : '#f8fafc',
              border: `1px solid ${copied ? '#86efac' : '#e2e8f0'}`,
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: '#eef2ff', borderColor: '#c7d2fe' },
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: copied ? '#059669' : '#64748b' }}>
              {copied ? '✓ Email copied!' : '📋 Copy email address'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
