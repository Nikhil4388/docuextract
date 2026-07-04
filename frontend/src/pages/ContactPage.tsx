import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LogoIcon from '../components/LogoIcon';

const LINKS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Email',
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
    label: 'LinkedIn',
    value: 'linkedin.com/in/nikhilshelke',
    href: 'https://linkedin.com/in/nikhilshelke',
    color: '#0a66c2',
    bg: '#eff6ff',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
    ),
    label: 'GitHub',
    value: 'github.com/Nikhil4388',
    href: 'https://github.com/Nikhil4388',
    color: '#0c0c0c',
    bg: '#f8fafc',
  },
];

const SKILLS = [
  { label: 'React & TypeScript', level: 92 },
  { label: 'Python / FastAPI',   level: 88 },
  { label: 'AI / Claude API',    level: 85 },
  { label: 'PostgreSQL',         level: 80 },
  { label: 'Docker & DevOps',    level: 75 },
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
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barFill {
          from { width: 0; }
        }
        .contact-card { animation: fadeSlideUp 0.4s ease both; }
        .contact-card:nth-child(1) { animation-delay: 0.0s; }
        .contact-card:nth-child(2) { animation-delay: 0.06s; }
        .contact-card:nth-child(3) { animation-delay: 0.12s; }
        .link-row:hover { transform: translateX(4px); }
        .link-row { transition: transform 0.18s ease; }
        .bar-fill { animation: barFill 1.2s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
      `}</style>

      {/* ── Public nav ── */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 100,
        bgcolor: 'rgba(232,226,216,0.92)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        px: { xs: 3, md: 6 }, py: 1.8,
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Box
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer' }}
        >
          <LogoIcon size={30} borderRadius={8} />
          <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#0c0c0c' }}>
            MultiPDF<span style={{ color: '#6366f1' }}>ToExcel</span>
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box
          onClick={() => navigate('/')}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.8,
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

      {/* ── Page content ── */}
      <Box sx={{ px: { xs: 3, md: 8 }, py: { xs: 5, md: 8 }, maxWidth: 1100, mx: 'auto' }}>

      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#6366f1', mb: 1 }}>
          GET IN TOUCH
        </Typography>
        <Typography sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 900, color: '#0c0c0c', letterSpacing: -1 }}>
          Contact
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, maxWidth: 900 }}>

        {/* ── Profile card ── */}
        <Box className="contact-card" sx={{
          bgcolor: 'white', borderRadius: '24px',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          {/* Header banner */}
          <Box sx={{
            height: 90,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
            position: 'relative',
          }}>
            <Box sx={{
              position: 'absolute', inset: 0,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }} />
          </Box>

          {/* Avatar + info */}
          <Box sx={{ px: 3, pb: 3 }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: '4px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mt: '-36px', mb: 2,
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              fontSize: 26, fontWeight: 900, color: 'white',
            }}>
              N
            </Box>

            <Typography sx={{ fontSize: 22, fontWeight: 900, color: '#0c0c0c', letterSpacing: -0.5, mb: 0.3 }}>
              Nikhil Shelke
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#6366f1', fontWeight: 600, mb: 1 }}>
              Full-Stack Developer · AI Engineer
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, mb: 3 }}>
              Building AI-powered tools that automate the boring stuff.
              Creator of MultiPDFToExcel — extracting structured data from documents at scale.
            </Typography>

            {/* Badges */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['React', 'Python', 'AI/ML', 'FastAPI', 'TypeScript'].map((t) => (
                <Box key={t} sx={{
                  bgcolor: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: 8, px: 1.5, py: 0.5,
                }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{t}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* ── Links card ── */}
        <Box className="contact-card" sx={{
          bgcolor: 'white', borderRadius: '24px', p: 3,
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0c0c0c', mb: 2.5 }}>Reach me at</Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            {LINKS.map((l) => (
              <Box
                key={l.label}
                className="link-row"
                component="a"
                href={l.href}
                target={l.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  p: 2, borderRadius: '14px',
                  bgcolor: l.bg, border: `1px solid ${l.color}18`,
                  textDecoration: 'none', cursor: 'pointer',
                  '&:hover': { bgcolor: `${l.color}10`, borderColor: `${l.color}30` },
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <Box sx={{
                  width: 40, height: 40, borderRadius: '12px',
                  bgcolor: 'white', border: `1px solid ${l.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: l.color, flexShrink: 0,
                  boxShadow: `0 2px 8px ${l.color}15`,
                }}>
                  {l.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {l.label}
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }} noWrap>
                    {l.value}
                  </Typography>
                </Box>
                <Box sx={{ color: '#cbd5e1', fontSize: 18, flexShrink: 0 }}>→</Box>
              </Box>
            ))}
          </Box>

          {/* Quick copy button */}
          <Box
            onClick={copyEmail}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5,
              py: 1.5, borderRadius: '12px', cursor: 'pointer',
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

        {/* ── Skills card ── */}
        <Box className="contact-card" sx={{
          bgcolor: 'white', borderRadius: '24px', p: 3,
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0c0c0c', mb: 2.5 }}>Skills & Expertise</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SKILLS.map((s) => (
              <Box key={s.label}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{s.level}%</Typography>
                </Box>
                <Box sx={{ height: 6, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <Box className="bar-fill" sx={{
                    height: '100%', borderRadius: 3,
                    width: `${s.level}%`,
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    boxShadow: '0 0 8px rgba(99,102,241,0.4)',
                  }} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Quick facts card ── */}
        <Box className="contact-card" sx={{
          bgcolor: 'white', borderRadius: '24px', p: 3,
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0c0c0c', mb: 2.5 }}>About This App</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { icon: '🤖', title: 'AI-Powered',      desc: 'Claude AI reads every PDF — scanned or digital — with 95%+ accuracy.' },
              { icon: '⚡', title: 'Blazing Fast',     desc: '100 PDFs processed in under 2 minutes with parallel extraction.' },
              { icon: '🔒', title: 'Private & Secure', desc: 'HTTPS + AES-256. Files are never stored permanently.' },
              { icon: '🎯', title: 'Custom Templates', desc: 'Define exactly which fields to extract from any document type.' },
            ].map((f) => (
              <Box key={f.title} sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{
                  width: 38, height: 38, borderRadius: '10px',
                  bgcolor: '#f8fafc', border: '1px solid #f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>{f.icon}</Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a', mb: 0.3 }}>{f.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

      </Box>

      </Box>
    </Box>
  );
}
