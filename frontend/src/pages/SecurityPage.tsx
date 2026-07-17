import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LogoIcon from '../components/LogoIcon';

const SHIELDS = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#6366f1', bg: '#eef2ff',
    title: 'Google OAuth Only',
    badge: 'Authentication',
    desc: 'We use Google Sign-In exclusively — no passwords are ever stored on our servers. Your identity is verified by Google\'s infrastructure. Additional providers (Microsoft, Apple) are coming soon.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#10b981', bg: '#ecfdf5',
    title: 'Auto-Delete in 3 Days',
    badge: 'Data Lifecycle',
    desc: 'All uploaded PDFs and extracted data are permanently and automatically deleted from our servers within 72 hours of job completion. We do not retain your documents.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
      </svg>
    ),
    color: '#f59e0b', bg: '#fffbeb',
    title: 'JWT in Memory',
    badge: 'Token Security',
    desc: 'Access tokens are stored only in JavaScript memory — never in localStorage or cookies — making them invisible to browser extensions and XSS attacks. Refresh tokens use secure httpOnly-style storage.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
    color: '#06b6d4', bg: '#ecfeff',
    title: 'TLS / HTTPS Everywhere',
    badge: 'Encryption in Transit',
    desc: 'All communication between your browser and our servers is encrypted with TLS 1.3. HSTS headers are enforced for 1 year with preloading, preventing any downgrade attacks.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#8b5cf6', bg: '#f5f3ff',
    title: 'S3 Server-Side Encryption',
    badge: 'Encryption at Rest',
    desc: 'Documents stored on AWS S3 are encrypted at rest using AES-256 server-side encryption. Each file gets a unique encryption key, and access is restricted via IAM policies.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#ef4444', bg: '#fef2f2',
    title: 'Rate Limiting',
    badge: 'Abuse Prevention',
    desc: 'All API endpoints are rate-limited with a sliding-window algorithm. Authentication routes are capped at 10 requests/minute per IP. This prevents brute-force and credential-stuffing attacks.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h16M4 12h16M4 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="17" cy="17" r="4" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M15.5 17l1 1 2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#0a66c2', bg: '#eff6ff',
    title: 'CORS Allowlist',
    badge: 'API Protection',
    desc: 'Our API only accepts cross-origin requests from explicitly whitelisted domains. No wildcard origins. Credentials are not exposed to unknown domains, protecting against CSRF-style API abuse.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#374151', bg: '#f9fafb',
    title: 'Security Response Headers',
    badge: 'Browser Hardening',
    desc: 'Every response includes X-Content-Type-Options, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy, and a strict Content-Security-Policy — blocking clickjacking, MIME sniffing, and script injection.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M9 9l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#d97706', bg: '#fffbeb',
    title: 'DevTools & Copy Protection',
    badge: 'Client-Side Hardening',
    desc: 'Right-click context menu, text selection, drag-and-drop on images, F12 / Ctrl+Shift+I, Ctrl+U (view source), and print shortcuts are all disabled on the portal. Extracted data stays inside the platform.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#6366f1', bg: '#eef2ff',
    title: 'Inactivity Auto-Logout',
    badge: 'Session Security',
    desc: 'Sessions expire automatically after 60 minutes of inactivity. When you return, you\'re seamlessly signed back in via your stored refresh token — balancing security with convenience.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#10b981', bg: '#ecfdf5',
    title: 'No Data Sold',
    badge: 'Privacy First',
    desc: 'We do not sell, share, or monetize your documents or extracted data. Your data is used solely to provide the extraction service and is deleted automatically — never analyzed for advertising or third-party purposes.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    color: '#8b5cf6', bg: '#f5f3ff',
    title: 'Responsible Disclosure',
    badge: 'Vulnerability Reporting',
    desc: 'Found a security issue? Email us at nikhil1996shelke@gmail.com. We review all reports within 48 hours and credit researchers who responsibly disclose verified vulnerabilities.',
  },
];

const COMING_SOON = [
  { icon: '🔑', text: 'Microsoft & Apple Sign-In' },
  { icon: '📱', text: 'Two-Factor Authentication (2FA)' },
  { icon: '🔍', text: 'Full audit log of all actions' },
  { icon: '🏢', text: 'SSO / SAML for enterprise teams' },
  { icon: '📋', text: 'SOC 2 Type II certification' },
  { icon: '🇪🇺', text: 'GDPR data residency options' },
];

export default function SecurityPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: '#e8e2d8', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerBadge {
          0%,100% { opacity: 1; } 50% { opacity: 0.7; }
        }
        .sec-card {
          animation: fadeSlideUp 0.45s cubic-bezier(0.22,1,0.36,1) both;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .sec-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.11) !important;
        }
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
            MultiPDF<span style={{ color: '#6366f1' }}>ToExcel</span>
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box onClick={() => navigate('/')} sx={{
          px: 2, py: 0.8, borderRadius: 8, cursor: 'pointer',
          bgcolor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
          fontSize: 13, fontWeight: 600, color: '#374151',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' }, transition: 'all 0.15s',
        }}>← Back</Box>
        <Box onClick={() => navigate('/login')} sx={{
          px: 2.5, py: 0.9, borderRadius: 10,
          bgcolor: '#0c0c0c', color: 'white',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          '&:hover': { bgcolor: '#2a2a2a' }, transition: 'all 0.15s',
        }}>Sign In</Box>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 3, md: 5 }, py: { xs: 6, md: 10 } }}>

        {/* ── Hero ── */}
        <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 12 } }}>
          {/* Shield icon */}
          <Box sx={{
            width: 80, height: 80, borderRadius: '24px', mx: 'auto', mb: 3,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 48px rgba(99,102,241,0.35)',
          }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Box>

          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#6366f1', mb: 1.5 }}>
            TRUST & SAFETY
          </Typography>
          <Typography sx={{ fontSize: { xs: 34, md: 56 }, fontWeight: 900, color: '#0c0c0c', letterSpacing: -2, lineHeight: 1.05, mb: 2 }}>
            Security at<br />
            <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              MultiPDFToExcel
            </span>
          </Typography>
          <Typography sx={{ fontSize: { xs: 15, md: 17 }, color: '#64748b', maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}>
            Your documents are sensitive. Here's exactly how we protect them — from upload to deletion.
          </Typography>

          {/* Trust badges */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 4 }}>
            {[
              { label: 'TLS 1.3 Encrypted', color: '#10b981' },
              { label: '72h Auto-Delete', color: '#6366f1' },
              { label: 'Zero Password Storage', color: '#f59e0b' },
              { label: 'No Data Sold', color: '#ef4444' },
            ].map((b) => (
              <Box key={b.label} sx={{
                px: 2, py: 0.8, borderRadius: 10,
                bgcolor: 'white', border: `1.5px solid ${b.color}30`,
                display: 'flex', alignItems: 'center', gap: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: b.color, flexShrink: 0, animation: 'shimmerBadge 2s ease infinite' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>{b.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Security Cards ── */}
        <Grid container spacing={3} sx={{ mb: { xs: 8, md: 12 } }}>
          {SHIELDS.map((s, i) => (
            <Grid item xs={12} sm={6} md={4} key={s.title}>
              <Box
                className="sec-card"
                style={{ animationDelay: `${i * 0.05}s` }}
                sx={{
                  bgcolor: 'white', borderRadius: '20px',
                  border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                  p: 3, height: '100%',
                }}
              >
                {/* Icon + badge */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{
                    width: 52, height: 52, borderRadius: '15px',
                    bgcolor: s.bg, color: s.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${s.color}20`,
                  }}>
                    {s.icon}
                  </Box>
                  <Box sx={{
                    px: 1.2, py: 0.4, borderRadius: 6,
                    bgcolor: s.bg, border: `1px solid ${s.color}25`,
                  }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: 0.5 }}>
                      {s.badge}
                    </Typography>
                  </Box>
                </Box>

                <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0c0c0c', mb: 1, lineHeight: 1.3 }}>
                  {s.title}
                </Typography>
                <Typography sx={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.65 }}>
                  {s.desc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* ── Coming Soon ── */}
        <Box sx={{
          bgcolor: 'white', borderRadius: '24px',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          p: { xs: 4, md: 6 }, mb: { xs: 6, md: 8 },
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <Box sx={{
              px: 1.5, py: 0.5, borderRadius: 6,
              bgcolor: '#fef9c3', border: '1px solid #fde047',
            }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#854d0e', letterSpacing: 0.5 }}>ROADMAP</Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 20, md: 24 }, color: '#0c0c0c' }}>
              Coming Soon
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {COMING_SOON.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.text}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  p: 2, borderRadius: '14px', bgcolor: '#f8fafc',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}>
                  <Typography sx={{ fontSize: 20 }}>{item.icon}</Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#374151' }}>{item.text}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ── Bottom CTA ── */}
        <Box sx={{
          textAlign: 'center', py: { xs: 6, md: 8 },
          borderTop: '1px solid rgba(0,0,0,0.08)',
        }}>
          <Typography sx={{ fontSize: { xs: 22, md: 30 }, fontWeight: 900, color: '#0c0c0c', mb: 1.5 }}>
            Questions about security?
          </Typography>
          <Typography sx={{ fontSize: 15, color: '#64748b', mb: 4 }}>
            Reach out — we respond to all security inquiries within 48 hours.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Box
              onClick={() => navigate('/contact')}
              sx={{
                px: 4, py: 1.5, borderRadius: 10, cursor: 'pointer',
                bgcolor: '#0c0c0c', color: 'white',
                fontSize: 14, fontWeight: 700,
                '&:hover': { bgcolor: '#2a2a2a', transform: 'translateY(-1px)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
                transition: 'all 0.2s ease',
              }}
            >Contact Us</Box>
            <Box
              onClick={() => navigate('/privacy')}
              sx={{
                px: 4, py: 1.5, borderRadius: 10, cursor: 'pointer',
                bgcolor: 'white', color: '#374151',
                border: '1.5px solid rgba(0,0,0,0.12)',
                fontSize: 14, fontWeight: 700,
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#6366f1', color: '#6366f1' },
                transition: 'all 0.2s ease',
              }}
            >Privacy Policy</Box>
          </Box>
        </Box>

      </Box>

      {/* ── Footer ── */}
      <Box sx={{
        borderTop: '1px solid rgba(0,0,0,0.07)',
        px: { xs: 3, md: 6 }, py: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 2, maxWidth: 1400, mx: 'auto',
      }}>
        <Typography sx={{ fontSize: 12.5, color: '#94a3b8' }}>
          © 2026 MultiPDFToExcel. All rights reserved.
        </Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {[
            { label: 'Privacy', path: '/privacy' },
            { label: 'Terms', path: '/terms' },
            { label: 'Contact', path: '/contact' },
          ].map((l) => (
            <Typography key={l.label} onClick={() => navigate(l.path)}
              sx={{ fontSize: 12.5, color: '#94a3b8', cursor: 'pointer', '&:hover': { color: '#6366f1' }, transition: 'color 0.15s' }}>
              {l.label}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
