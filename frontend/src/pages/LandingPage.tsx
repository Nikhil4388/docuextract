import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LogoIcon from '../components/LogoIcon';

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '📂', color: '#6366f1', bg: '#eef2ff', title: 'Batch Upload',      desc: 'Drop dozens of PDFs at once — scanned, digital, or mixed. No size limits.' },
  { icon: '🤖', color: '#8b5cf6', bg: '#f5f3ff', title: 'AI Reads Every Page', desc: 'Claude AI extracts exactly the fields you need — names, dates, tables, amounts.' },
  { icon: '📊', color: '#06b6d4', bg: '#ecfeff', title: 'Clean Excel Output', desc: 'All extracted data lands in a structured spreadsheet, ready for analysis.' },
  { icon: '⚡', color: '#10b981', bg: '#ecfdf5', title: 'Lightning Fast',    desc: '100 PDFs processed in under 2 minutes. Parallel AI extraction at scale.' },
  { icon: '🎯', color: '#f59e0b', bg: '#fffbeb', title: 'Custom Templates',  desc: 'Define which columns to extract. Works for invoices, resumes, contracts, reports.' },
  { icon: '🔒', color: '#ef4444', bg: '#fef2f2', title: 'Secure & Private',  desc: 'Files processed over HTTPS. Never stored permanently. Your data stays yours.' },
];

const STEPS = [
  { num: '01', icon: '📤', title: 'Upload Your PDFs',  desc: 'Select one or hundreds of PDF files. Drag & drop into the upload zone.' },
  { num: '02', icon: '🎯', title: 'Define a Template', desc: 'Tell the AI what to extract — invoice #, name, amount, date, any field.' },
  { num: '03', icon: '⚡', title: 'AI Extracts',       desc: 'Claude reads all files in parallel. Most jobs finish in seconds.' },
  { num: '04', icon: '📥', title: 'Download Excel',    desc: 'One clean spreadsheet with all your data, ready to use.' },
];

const FAQS = [
  { q: 'How do I convert PDF to Excel automatically?',            a: 'Upload your PDFs, create a template with your column names (invoice number, vendor, date, amount — anything), and the AI reads every PDF and builds a clean Excel spreadsheet automatically.' },
  { q: 'Can I convert multiple PDFs to Excel at once?',           a: "Yes — that's what we're built for. Upload hundreds of PDFs in one batch. They all run in parallel so 100 PDFs finish in under 2 minutes, all rows in one Excel file." },
  { q: 'Does it work with scanned PDFs?',                         a: 'Yes. The AI reads both native digital PDFs and scanned image PDFs. Built-in OCR means no extra tools needed — just upload and extract.' },
  { q: 'What types of documents can I extract from?',             a: 'Invoices, receipts, bank statements, resumes, contracts, purchase orders, medical records, research papers — any PDF with readable text or images.' },
  { q: 'Is there a free plan?',                                   a: 'Yes. Sign up free with Google and start converting PDFs to Excel immediately. No credit card required.' },
  { q: 'How accurate is the extraction?',                         a: 'Consistently 95%+ accuracy on structured documents like invoices and forms. Confidence scores shown for every extracted field.' },
];

const TRUST = ['🔐 HTTPS + TLS 1.3', '🛡️ AES-256 Encrypted', '🗑️ Zero Data Retention', '🔑 JWT Auth', '⚡ No Permanent Storage'];

const USE_CASES = ['🧾 Invoices', '📄 Resumes', '📋 Contracts', '📊 Reports', '🏥 Medical Records', '🏦 Bank Statements', '📑 Legal Docs', '🎓 Academic Papers', '🧾 Invoices', '📄 Resumes', '📋 Contracts', '📊 Reports'];

// ── Floating Excel Card ───────────────────────────────────────────────────────
function ExcelCard() {
  const rows = [
    ['INV-001', 'Jan 15', 'Acme',  '$1,250'],
    ['INV-002', 'Jan 17', 'Tech',  '$890'],
    ['INV-003', 'Feb 01', 'Cloud', '$2,100'],
    ['INV-004', 'Feb 18', 'Cloud', '$2,630'],
  ];
  return (
    <Box sx={{ perspective: '1400px', width: { xs: 300, md: 390 }, height: { xs: 250, md: 310 } }}>
      <Box sx={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        animation: 'cardFloat 9s ease-in-out infinite',
      }}>
        {/* Back slab — cyan */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '20px',
          bgcolor: '#a5f3fc',
          transform: 'translateZ(-60px) translateY(26px) translateX(24px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.1)',
        }} />
        {/* Mid slab — lavender */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '20px',
          bgcolor: '#ddd6fe',
          transform: 'translateZ(-30px) translateY(13px) translateX(12px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.1)',
        }} />
        {/* Front card — purple gradient */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '20px',
          background: 'linear-gradient(145deg, #5b4fcf 0%, #7c3aed 60%, #6d28d9 100%)',
          boxShadow: '0 40px 100px rgba(99,102,241,0.5), 0 8px 32px rgba(0,0,0,0.18)',
          p: { xs: 2, md: 2.5 }, overflow: 'hidden',
        }}>
          {/* Subtle grid */}
          <Box sx={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px',
          }} />
          {/* Title bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.8, position: 'relative' }}>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '6px', px: 1, py: 0.4 }}>
              <Typography sx={{ color: 'white', fontSize: 9, fontWeight: 800, letterSpacing: 0.5 }}>XLS</Typography>
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontWeight: 600 }}>data_extracted.xlsx</Typography>
          </Box>
          {/* Header row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr', gap: 0.8, mb: 1, position: 'relative' }}>
            {['Invoice', 'Date', 'Vendor', 'Amount'].map((h) => (
              <Box key={h} sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '5px', px: 0.8, py: 0.5 }}>
                <Typography sx={{ color: 'white', fontSize: 9, fontWeight: 700 }}>{h}</Typography>
              </Box>
            ))}
          </Box>
          {/* Data rows */}
          {rows.map((row, i) => (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr', gap: 0.8, mb: 0.6, position: 'relative' }}>
              {row.map((cell, j) => (
                <Box key={j} sx={{ bgcolor: i % 2 === 0 ? 'rgba(255,255,255,0.07)' : 'transparent', borderRadius: '4px', px: 0.8, py: 0.4 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 9 }}>{cell}</Typography>
                </Box>
              ))}
            </Box>
          ))}
          {/* Footer */}
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.8, position: 'relative' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 7px #10b981', flexShrink: 0 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>16 files extracted · 100% confidence</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── FAQ Item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Box
      onClick={() => setOpen((v) => !v)}
      sx={{
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        py: 2.5, cursor: 'pointer',
        '&:hover .faq-q': { color: '#6366f1' },
        transition: 'all 0.2s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography className="faq-q" sx={{ fontWeight: 700, fontSize: { xs: 14, md: 16 }, color: '#0c0c0c', transition: 'color 0.2s', flex: 1 }}>
          {q}
        </Typography>
        <Box sx={{
          width: 28, height: 28, borderRadius: '50%',
          bgcolor: open ? '#6366f1' : 'rgba(0,0,0,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.25s',
          color: open ? 'white' : '#64748b', fontSize: 18, lineHeight: 1,
        }}>
          {open ? '−' : '+'}
        </Box>
      </Box>
      <Box sx={{
        overflow: 'hidden',
        maxHeight: open ? '200px' : '0',
        opacity: open ? 1 : 0,
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
      }}>
        <Typography sx={{ fontSize: 14, color: '#64748b', lineHeight: 1.75, pt: 1.5 }}>{a}</Typography>
      </Box>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const revealRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll reveal
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('revealed'); }),
      { threshold: 0.12 }
    );
    revealRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const addRef = (i: number) => (el: HTMLDivElement | null) => { revealRefs.current[i] = el; };

  return (
    <Box sx={{ bgcolor: '#e8e2d8', minHeight: '100vh', fontFamily: '"Inter", sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        /* ── Entrance keyframes ── */
        @keyframes cardFloat {
          0%,100% { transform: rotateX(14deg) rotateY(-18deg) rotateZ(1.5deg); }
          33%      { transform: rotateX(9deg)  rotateY(14deg)  rotateZ(-2deg); }
          66%      { transform: rotateX(19deg) rotateY(6deg)   rotateZ(2.5deg); }
        }
        @keyframes heroSlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes marqueeScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes shimmerText {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
        @keyframes countBounce {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.05); }
          100% { transform: scale(1);   opacity: 1; }
        }

        /* ── Hero stagger ── */
        .hero-badge  { animation: heroSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
        .hero-h1     { animation: heroSlideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
        .hero-sub    { animation: heroSlideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
        .hero-ctas   { animation: heroSlideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.35s both; }
        .hero-trust  { animation: heroSlideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.45s both; }
        .hero-card   { animation: heroSlideUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both; }

        /* ── Scroll reveal ── */
        .reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1);
        }
        .reveal.revealed { opacity: 1; transform: translateY(0); }

        /* ── Hover effects ── */
        .cta-primary:hover {
          transform: translateY(-2px) scale(1.02) !important;
          box-shadow: 0 16px 40px rgba(0,0,0,0.22) !important;
        }
        .cta-primary { transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1) !important; }

        .cta-secondary:hover {
          background: rgba(0,0,0,0.07) !important;
          transform: translateY(-2px) !important;
        }
        .cta-secondary { transition: all 0.2s ease !important; }

        .feat-card:hover {
          transform: translateY(-5px) !important;
          box-shadow: 0 20px 48px rgba(0,0,0,0.1) !important;
        }
        .feat-card { transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1) !important; }

        .step-card:hover { transform: scale(1.02) !important; }
        .step-card { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1) !important; }

        .nav-link:hover { color: #6366f1 !important; }
        .nav-link { transition: color 0.15s ease !important; }

        /* ── Stagger delays ── */
        .stagger-1 { transition-delay: 0.05s !important; }
        .stagger-2 { transition-delay: 0.10s !important; }
        .stagger-3 { transition-delay: 0.15s !important; }
        .stagger-4 { transition-delay: 0.20s !important; }
        .stagger-5 { transition-delay: 0.25s !important; }
        .stagger-6 { transition-delay: 0.30s !important; }
      `}</style>

      {/* ── NAVBAR ── */}
      <Box component="nav" sx={{
        position: 'sticky', top: 0, zIndex: 100,
        bgcolor: 'rgba(232,226,216,0.88)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        px: { xs: 2, md: 5, lg: 8 }, py: 1.8,
        display: 'flex', alignItems: 'center', gap: 3,
      }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mr: 'auto', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <LogoIcon size={32} borderRadius={9} />
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0c0c0c', letterSpacing: -0.3 }}>
            MultiPDF<span style={{ color: '#6366f1' }}>ToExcel</span>
          </Typography>
        </Box>

        {/* Pill nav — desktop */}
        <Box sx={{
          display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5,
          bgcolor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.09)',
          borderRadius: 10, px: 1, py: 0.6,
        }}>
          {[['Features', '#features'], ['How It Works', '#how'], ['FAQ', '#faq']].map(([label, href]) => (
            <Box key={label} component="a" href={href} className="nav-link" sx={{
              px: 2, py: 0.7, borderRadius: 8, fontSize: 13.5, fontWeight: 600,
              color: '#374151', textDecoration: 'none', cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
              transition: 'all 0.15s',
            }}>
              {label}
            </Box>
          ))}
        </Box>

        {/* Right CTAs */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
          <Box component="button" onClick={() => navigate('/login')} sx={{
            px: 2.5, py: 0.9, border: 'none', bgcolor: 'transparent',
            fontSize: 13.5, fontWeight: 600, color: '#374151', cursor: 'pointer',
            borderRadius: 8, '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' }, transition: 'all 0.15s',
          }}>
            Sign In
          </Box>
          <Box component="button" onClick={() => navigate('/login')} sx={{
            px: 2.5, py: 0.9, borderRadius: 10, border: 'none',
            bgcolor: '#0c0c0c', color: 'white', fontSize: 13.5, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1,
            boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
            '&:hover': { bgcolor: '#2a2a2a', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(0,0,0,0.22)' },
            transition: 'all 0.2s ease',
          }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981', animation: 'blink 2s ease infinite' }} />
            Let's Connect
          </Box>
        </Box>
      </Box>

      {/* ── HERO ── */}
      <Box sx={{
        px: { xs: 3, md: 8, lg: 12 },
        pt: { xs: 8, md: 12 },
        pb: { xs: 6, md: 10 },
        display: 'flex', alignItems: 'center',
        gap: { xs: 4, md: 8 },
        flexDirection: { xs: 'column', md: 'row' },
        maxWidth: 1400, mx: 'auto',
      }}>
        {/* Left text */}
        <Box sx={{ flex: 1, maxWidth: 620 }}>
          {/* Badge */}
          <Box className="hero-badge" sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            bgcolor: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 10, px: 2, py: 0.7, mb: 4, cursor: 'default',
          }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981', animation: 'blink 2s ease infinite', boxShadow: '0 0 6px #10b981' }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#374151', letterSpacing: 0.8 }}>
              AI-POWERED · FREE TO START · NO CODE
            </Typography>
          </Box>

          {/* H1 */}
          <Typography className="hero-h1" component="h1" sx={{
            fontSize: { xs: 48, sm: 60, md: 72, lg: 84 },
            fontWeight: 900, lineHeight: 0.95, letterSpacing: -3,
            color: '#0c0c0c', mb: 3,
          }}>
            Extract Data<br />
            from PDFs —<br />
            <Box component="span" sx={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              backgroundSize: '200% 200%',
              animation: 'shimmerText 4s ease infinite',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Instantly.
            </Box>
          </Typography>

          {/* Subtext */}
          <Typography className="hero-sub" sx={{
            fontSize: { xs: 15, md: 17 }, color: '#64748b', lineHeight: 1.75, mb: 5, maxWidth: 500,
          }}>
            Upload hundreds of PDFs, tell AI which fields to extract,
            and download a clean Excel spreadsheet in seconds.
            No manual copy-paste, no code.
          </Typography>

          {/* CTAs */}
          <Box className="hero-ctas" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 5, alignItems: 'center' }}>
            <Box component="button" className="cta-primary" onClick={() => navigate('/login')} sx={{
              px: 3.5, py: 1.6, borderRadius: '14px', border: 'none',
              bgcolor: '#0c0c0c', color: 'white', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Start Extracting Free
            </Box>
            <Box component="button" className="cta-secondary" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} sx={{
              px: 3.5, py: 1.6, borderRadius: '14px', border: '1.5px solid rgba(0,0,0,0.15)',
              bgcolor: 'transparent', color: '#374151', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1,
            }}>
              See How It Works ↓
            </Box>
          </Box>

          {/* Trust pills */}
          <Box className="hero-trust" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {TRUST.map((t) => (
              <Box key={t} sx={{
                bgcolor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 10, px: 1.5, py: 0.5,
              }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 500, color: '#64748b' }}>{t}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right — Excel card */}
        <Box className="hero-card" sx={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: { xs: 300, md: 400 },
        }}>
          <ExcelCard />
        </Box>
      </Box>

      {/* ── STATS ── */}
      <Box ref={addRef(0)} className="reveal" sx={{
        maxWidth: 1100, mx: 'auto', px: { xs: 3, md: 8 }, pb: { xs: 8, md: 12 },
      }}>
        <Box sx={{
          display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' },
          gap: 2.5,
        }}>
          {[
            { value: '100x',  label: 'Faster than manual',   color: '#6366f1' },
            { value: '95%+',  label: 'Extraction accuracy',  color: '#10b981' },
            { value: '< 10s', label: 'Per 10 files',          color: '#06b6d4' },
            { value: '0',     label: 'Lines of code needed',  color: '#f59e0b' },
          ].map((s, i) => (
            <Box key={s.label} sx={{
              bgcolor: 'white', borderRadius: '20px', p: 3.5,
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              textAlign: 'center',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 40px ${s.color}18` },
            }}>
              <Typography sx={{
                fontSize: { xs: 36, md: 44 }, fontWeight: 900, color: s.color,
                lineHeight: 1, mb: 0.8, letterSpacing: -1,
              }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── HOW IT WORKS ── */}
      <Box id="how" sx={{ px: { xs: 3, md: 8, lg: 12 }, pb: { xs: 10, md: 14 }, maxWidth: 1200, mx: 'auto' }}>
        <Box ref={addRef(1)} className="reveal" sx={{ mb: { xs: 6, md: 10 }, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#6366f1', mb: 2 }}>
            HOW IT WORKS
          </Typography>
          <Typography sx={{
            fontSize: { xs: 32, md: 48 }, fontWeight: 900, color: '#0c0c0c',
            letterSpacing: -1.5, lineHeight: 1.1,
          }}>
            From PDF to Excel<br />in four steps.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2.5 }}>
          {STEPS.map((step, i) => (
            <Box key={step.num} ref={addRef(10 + i)} className={`reveal stagger-${i + 1}`}
              sx={{
                bgcolor: 'white', borderRadius: '20px', p: 3.5,
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 20px 48px rgba(0,0,0,0.1)' },
              }}>
              {/* Big number background */}
              <Typography sx={{
                position: 'absolute', top: -10, right: 12,
                fontSize: 80, fontWeight: 900, color: 'rgba(99,102,241,0.06)',
                lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
              }}>{step.num}</Typography>
              <Typography sx={{ fontSize: 28, mb: 2 }}>{step.icon}</Typography>
              <Box sx={{
                display: 'inline-flex', px: 1, py: 0.3, borderRadius: 4,
                bgcolor: '#eef2ff', mb: 1.5,
              }}>
                <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#6366f1', letterSpacing: 0.5 }}>STEP {step.num}</Typography>
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0c0c0c', mb: 1 }}>{step.title}</Typography>
              <Typography sx={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.65 }}>{step.desc}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── MARQUEE ── */}
      <Box sx={{ overflow: 'hidden', py: 3, mb: { xs: 4, md: 6 }, borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)', bgcolor: 'rgba(0,0,0,0.02)' }}>
        <Box sx={{ display: 'flex', animation: 'marqueeScroll 22s linear infinite', width: 'max-content' }}>
          {[...USE_CASES, ...USE_CASES].map((u, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3 }}>
              <Typography sx={{ fontSize: 15, whiteSpace: 'nowrap', color: '#94a3b8', fontWeight: 600 }}>{u}</Typography>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#cbd5e1', flexShrink: 0 }} />
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── FEATURES ── */}
      <Box id="features" sx={{ px: { xs: 3, md: 8, lg: 12 }, pb: { xs: 10, md: 14 }, maxWidth: 1200, mx: 'auto' }}>
        <Box ref={addRef(2)} className="reveal" sx={{ mb: { xs: 6, md: 10 }, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#6366f1', mb: 2 }}>
            FEATURES
          </Typography>
          <Typography sx={{
            fontSize: { xs: 32, md: 48 }, fontWeight: 900, color: '#0c0c0c',
            letterSpacing: -1.5, lineHeight: 1.1,
          }}>
            Everything you need<br />to kill manual data entry.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3,1fr)' }, gap: 2.5 }}>
          {FEATURES.map((f, i) => (
            <Box key={f.title} ref={addRef(20 + i)} className={`reveal feat-card stagger-${(i % 3) + 1}`}
              sx={{
                bgcolor: 'white', borderRadius: '20px', p: 3.5,
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                cursor: 'default',
              }}>
              <Box sx={{
                width: 52, height: 52, borderRadius: '14px', bgcolor: f.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, mb: 2.5, border: `1px solid ${f.color}22`,
              }}>
                {f.icon}
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0c0c0c', mb: 1 }}>{f.title}</Typography>
              <Typography sx={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.7 }}>{f.desc}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── REAL STORY ── */}
      <Box id="story" sx={{ px: { xs: 3, md: 8, lg: 12 }, pb: { xs: 10, md: 14 }, maxWidth: 1200, mx: 'auto' }}>
        <Box ref={addRef(6)} className="reveal" sx={{ mb: { xs: 6, md: 8 }, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#6366f1', mb: 2 }}>
            A TRUE STORY
          </Typography>
          <Typography sx={{
            fontSize: { xs: 32, md: 48 }, fontWeight: 900, color: '#0c0c0c',
            letterSpacing: -1.5, lineHeight: 1.1, mb: 2,
          }}>
            The Friday Night Rescue.
          </Typography>
          <Typography sx={{ fontSize: 16, color: '#64748b', maxWidth: 560, mx: 'auto', lineHeight: 1.75 }}>
            Mark had 400 invoices, a canceled weekend, and no way out —
            until he found DocuExtract. Watch what happened next.
          </Typography>
        </Box>

        <Box sx={{
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 48px rgba(99,102,241,0.12)',
          bgcolor: '#04060e',
          position: 'relative',
        }}>
          <Box sx={{
            position: 'relative',
            width: '100%',
            paddingTop: { xs: '75%', md: '62%' },
          }}>
            <Box
              component="iframe"
              src="/friday-rescue.html"
              title="The Friday Night Rescue — DocuExtract Story"
              scrolling="no"
              sx={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '24px',
              }}
            />
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography sx={{ fontSize: 14, color: '#94a3b8' }}>
            That job used to take 12 hours. DocuExtract finished it in{' '}
            <Box component="span" sx={{ color: '#6366f1', fontWeight: 700 }}>2 minutes</Box>.
          </Typography>
        </Box>
      </Box>

      {/* ── FAQ ── */}
      <Box id="faq" sx={{ px: { xs: 3, md: 8, lg: 12 }, pb: { xs: 10, md: 14 }, maxWidth: 860, mx: 'auto' }}>
        <Box ref={addRef(3)} className="reveal" sx={{ mb: { xs: 6, md: 8 }, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#6366f1', mb: 2 }}>
            FAQ
          </Typography>
          <Typography sx={{
            fontSize: { xs: 30, md: 44 }, fontWeight: 900, color: '#0c0c0c',
            letterSpacing: -1.5, lineHeight: 1.1,
          }}>
            Common questions.
          </Typography>
        </Box>
        <Box ref={addRef(4)} className="reveal" sx={{
          bgcolor: 'white', borderRadius: '24px', p: { xs: 3, md: 5 },
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} idx={i} />)}
        </Box>
      </Box>

      {/* ── CTA ── */}
      <Box sx={{ px: { xs: 3, md: 8 }, pb: { xs: 10, md: 14 }, maxWidth: 1000, mx: 'auto' }}>
        <Box ref={addRef(5)} className="reveal" sx={{
          bgcolor: '#0c0c0c', borderRadius: '28px', p: { xs: 5, md: 8 },
          textAlign: 'center', position: 'relative', overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.25)',
        }}>
          {/* Orbs */}
          <Box sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', top: -150, left: -100, background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', bottom: -100, right: -50, background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography sx={{
              fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#6ee7b7', mb: 2.5,
            }}>
              GET STARTED FREE
            </Typography>
            <Typography sx={{
              fontSize: { xs: 30, md: 48 }, fontWeight: 900, color: 'white',
              letterSpacing: -1.5, lineHeight: 1.1, mb: 3,
            }}>
              Stop copy-pasting.<br />Let AI do it in seconds.
            </Typography>
            <Typography sx={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', mb: 5, maxWidth: 500, mx: 'auto', lineHeight: 1.7 }}>
              No credit card. No setup. Sign in with Google and extract your first PDF in under a minute.
            </Typography>
            <Box component="button" className="cta-primary" onClick={() => navigate('/login')} sx={{
              px: 4.5, py: 1.9, borderRadius: '14px', border: 'none',
              bgcolor: 'white', color: '#0c0c0c', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 1.5,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Start Extracting Free
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── FOOTER ── */}
      <Box sx={{
        borderTop: '1px solid rgba(0,0,0,0.08)',
        px: { xs: 3, md: 8 }, py: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 2, maxWidth: 1400, mx: 'auto',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <LogoIcon size={26} borderRadius={7} />
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#374151' }}>MultiPDFToExcel</Typography>
        </Box>
        <Typography sx={{ fontSize: 12.5, color: '#94a3b8' }}>
          © 2026 MultiPDFToExcel. All rights reserved.
        </Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {[
            { label: 'Privacy', action: () => navigate('/privacy') },
            { label: 'Terms',   action: () => navigate('/terms') },
            { label: 'Contact', action: () => navigate('/contact') },
          ].map((l) => (
            <Typography
              key={l.label}
              onClick={l.action}
              sx={{ fontSize: 12.5, color: '#94a3b8', cursor: 'pointer', '&:hover': { color: '#6366f1' }, transition: 'color 0.15s' }}
            >{l.label}</Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
