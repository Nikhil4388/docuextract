import React, { useState, useEffect } from 'react';
import { Box, Typography, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LogoIcon from '../components/LogoIcon';

// ── Static data ───────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '📂', color: '#6366f1', title: 'Batch Upload PDFs', desc: 'Drop dozens of PDFs at once — scanned, digital, or mixed. No size limits.' },
  { icon: '🤖', color: '#8b5cf6', title: 'AI Reads Every Page', desc: 'Claude AI extracts exactly the data you need — names, dates, tables, amounts, anything.' },
  { icon: '📊', color: '#06b6d4', title: 'Clean Excel Output', desc: 'All extracted data lands in a structured spreadsheet, ready for analysis.' },
  { icon: '⚡', color: '#10b981', title: 'Lightning Fast', desc: '100 PDFs processed in under 2 minutes. Parallel AI extraction at scale.' },
  { icon: '🎯', color: '#f59e0b', title: 'Custom Templates', desc: 'Define which columns to extract. Works for invoices, resumes, contracts, reports.' },
  { icon: '🔒', color: '#ef4444', title: 'Secure & Private', desc: 'Files processed over HTTPS. Never stored permanently. Your data stays yours.' },
];

const STEPS = [
  { num: '01', icon: '📤', title: 'Upload Your PDFs', desc: 'Select one or hundreds of PDF files. Drag & drop into the upload zone.' },
  { num: '02', icon: '🎯', title: 'Define a Template', desc: 'Tell the AI what to extract — invoice #, name, amount, date, any field.' },
  { num: '03', icon: '⚡', title: 'AI Extracts', desc: 'Claude reads all files in parallel. Most jobs finish in seconds.' },
  { num: '04', icon: '📥', title: 'Download Excel', desc: 'One clean spreadsheet with all your data, ready to use.' },
];

const USE_CASES = [
  { emoji: '🧾', label: 'Invoices → Excel' },
  { emoji: '📄', label: 'Resumes → Database' },
  { emoji: '📋', label: 'Contracts → Sheet' },
  { emoji: '📊', label: 'Reports → Dataset' },
  { emoji: '🏥', label: 'Medical Records' },
  { emoji: '🏦', label: 'Bank Statements' },
  { emoji: '📑', label: 'Legal Documents' },
  { emoji: '🎓', label: 'Academic Papers' },
];

const STATS = [
  { value: '100x', label: 'Faster than manual', color: '#a5b4fc' },
  { value: '95%+', label: 'Extraction accuracy', color: '#6ee7b7' },
  { value: '<10s', label: 'Per 10 files', color: '#67e8f9' },
  { value: '0',   label: 'Lines of code needed', color: '#fde68a' },
];

const FAQS = [
  { q: 'How do I convert PDF to Excel automatically?', a: 'Upload your PDFs to MultiPDFToExcel, create a template with the column names you want (invoice number, vendor, date, amount — anything), and the AI reads every PDF and builds a clean Excel spreadsheet automatically.' },
  { q: 'Can I convert multiple PDFs to Excel at once?', a: 'Yes — that\'s what we\'re built for. Upload hundreds of PDFs in one batch. They all run in parallel so 100 PDFs finish in under 2 minutes, all rows in one Excel file.' },
  { q: 'Does the PDF to Excel converter work with scanned PDFs?', a: 'Yes. The AI reads both native digital PDFs and scanned image PDFs. Built-in OCR means no extra tools needed — just upload and extract.' },
  { q: 'What types of PDFs can I convert to Excel?', a: 'Invoices, receipts, bank statements, resumes, contracts, purchase orders, medical records, research papers — any PDF with readable text or images.' },
  { q: 'Is there a free PDF to Excel converter?', a: 'Yes. Sign up free with Google and start converting PDFs to Excel immediately. No credit card required.' },
  { q: 'How accurate is the AI PDF to Excel extraction?', a: 'Consistently 95%+ accuracy on structured documents like invoices and forms. Confidence scores are shown for every extracted field so you always know the quality.' },
  { q: 'Is my data secure when converting PDF to Excel?', a: 'Files are transmitted over HTTPS (encrypted). Processed ephemerally — nothing is stored permanently after extraction completes. Your data stays yours.' },
];

const DOTS = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  size: Math.random() * 2.5 + 0.5,
  x: Math.random() * 100,
  y: Math.random() * 100,
  delay: Math.random() * 10,
  duration: 5 + Math.random() * 8,
}));

// ── Component ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate   = useNavigate();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/google`;
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Box sx={{ bgcolor: '#07071a', minHeight: '100vh', color: 'white', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes floatDot { 0%,100%{transform:translateY(0) scale(1);opacity:.25} 50%{transform:translateY(-28px) scale(1.3);opacity:.6} }
        @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 30px rgba(99,102,241,.2)} 50%{box-shadow:0 0 60px rgba(139,92,246,.4),0 0 100px rgba(99,102,241,.15)} }
        @keyframes spinSlow { to{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(99,102,241,.3);border-radius:10px}
      `}</style>

      {/* ── Floating dots background ── */}
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {DOTS.map((d) => (
          <Box key={d.id} sx={{
            position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
            width: d.size, height: d.size, borderRadius: '50%',
            bgcolor: d.id % 3 === 0 ? '#6366f1' : d.id % 3 === 1 ? '#8b5cf6' : '#06b6d4',
            animation: `floatDot ${d.duration}s ease-in-out ${d.delay}s infinite`,
          }} />
        ))}
        {/* Grid */}
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(99,102,241,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.04) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }} />
      </Box>

      {/* ── NAVBAR ── */}
      <Box sx={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        px: { xs: 3, md: 6 }, py: 1.5,
        display: 'flex', alignItems: 'center', gap: 3,
        bgcolor: scrolled ? 'rgba(7,7,26,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box sx={{ boxShadow: '0 4px 16px rgba(99,102,241,0.5)', borderRadius: '10px' }}>
            <LogoIcon size={36} borderRadius={10} />
          </Box>
          <Typography sx={{ fontWeight: 900, fontSize: 17, color: 'white', letterSpacing: -0.3 }}>
            MultiPDFToExcel
          </Typography>
        </Box>

        {/* Nav links */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4 }}>
          {[['Features','#features'],['How It Works','#how-it-works'],['FAQ','#faq']].map(([label, href]) => (
            <Box key={label} component="a" href={href}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
              }}
              sx={{
                color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 600,
                textDecoration: 'none', cursor: 'pointer',
                '&:hover': { color: 'white' }, transition: 'color 0.15s',
              }}>
              {label}
            </Box>
          ))}
        </Box>

        {/* CTAs */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Box onClick={() => navigate('/login')} sx={{
            px: 2.5, py: 0.9, borderRadius: 2.5, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
            fontSize: 13, fontWeight: 600,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'white' },
            transition: 'all 0.15s',
          }}>Sign In</Box>
          <Box onClick={handleLogin} sx={{
            px: 2.5, py: 0.9, borderRadius: 2.5, cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            fontSize: 13, fontWeight: 700, color: 'white',
            boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            '&:hover': { opacity: 0.9, transform: 'translateY(-1px)' },
            transition: 'all 0.2s ease',
          }}>Get Started Free</Box>
        </Box>
      </Box>

      {/* ── HERO ── */}
      <Box sx={{ position: 'relative', zIndex: 1, pt: { xs: 16, md: 24 }, pb: { xs: 10, md: 16 }, textAlign: 'center', px: 3 }}>
        {/* Glow orbs */}
        <Box sx={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', top: -200, left: '50%', transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', top: 100, left: '5%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', top: 200, right: '5%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Badge */}
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1, mb: 4,
          bgcolor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 6, px: 2.5, py: 0.8,
          animation: 'fadeUp 0.6s ease both',
        }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'blink 2s ease infinite' }} />
          <Typography sx={{ color: '#a5b4fc', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            AI-POWERED · FREE TO START · NO CODE
          </Typography>
        </Box>

        {/* H1 — front-load "PDF to Excel" for SEO */}
        <Typography component="h1" sx={{
          fontSize: { xs: 36, sm: 52, md: 68 }, fontWeight: 900, lineHeight: 1.05,
          letterSpacing: -1.5, mb: 3,
          animation: 'fadeUp 0.6s ease 0.1s both',
          fontFamily: '"Inter", sans-serif',
        }}>
          <Box component="span" sx={{
            background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 35%, #818cf8 65%, #06b6d4 100%)',
            backgroundSize: '200% 200%', animation: 'gradShift 6s ease infinite',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>PDF to Excel</Box>
          <br />
          <Box component="span" sx={{ color: 'white' }}>Converter with AI —</Box>
          <br />
          <Box component="span" sx={{
            background: 'linear-gradient(135deg, #a5b4fc, #818cf8, #06b6d4)',
            backgroundSize: '200% 200%', animation: 'gradShift 5s ease 1s infinite',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Batch. Fast. Accurate.</Box>
        </Typography>

        <Typography component="h2" sx={{
          fontSize: { xs: 16, md: 20 }, color: 'rgba(255,255,255,0.5)', maxWidth: 640,
          mx: 'auto', mb: 5, lineHeight: 1.7, fontWeight: 400,
          animation: 'fadeUp 0.6s ease 0.2s both',
        }}>
          Convert hundreds of PDFs to Excel in one click. Upload your files, tell the AI
          which fields to extract, and download a clean spreadsheet in seconds —
          no manual copy-paste, no code.
        </Typography>

        {/* CTA Buttons */}
        <Box sx={{
          display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap',
          animation: 'fadeUp 0.6s ease 0.3s both',
        }}>
          <Box onClick={handleLogin} sx={{
            display: 'flex', alignItems: 'center', gap: 2,
            px: 4, py: 1.8, borderRadius: 3, cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
            animation: 'glowPulse 4s ease infinite',
            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 16px 48px rgba(99,102,241,0.55)' },
            transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".9"/>
              <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".8"/>
              <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity=".7"/>
              <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".9"/>
            </svg>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 16 }}>Start Extracting Free</Typography>
          </Box>

          <Box onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 4, py: 1.8, borderRadius: 3, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.15)',
            bgcolor: 'rgba(255,255,255,0.04)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.25)' },
            transition: 'all 0.2s ease',
          }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 15 }}>
              ↓ See How It Works
            </Typography>
          </Box>
        </Box>

        {/* Hero mockup */}
        <Box sx={{
          mt: 10, mx: 'auto', maxWidth: 860,
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px', p: { xs: 2, md: 3 },
          backdropFilter: 'blur(20px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          animation: 'fadeUp 0.7s ease 0.4s both',
        }}>
          {/* Browser chrome */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            {['#ef4444','#f59e0b','#22c55e'].map(c => (
              <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c, opacity: 0.7 }} />
            ))}
            <Box sx={{
              flex: 1, mx: 2, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 1.5,
              px: 2, py: 0.5, display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                docuextract.vercel.app/jobs/new
              </Typography>
            </Box>
          </Box>

          {/* Mock content */}
          <Box sx={{ display: 'flex', gap: 2, minHeight: 200 }}>
            {/* Sidebar mini */}
            <Box sx={{
              width: 140, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2,
              p: 1.5, display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', gap: 0.5,
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              {['⚡ Dashboard', '🚀 Jobs', '📋 Templates', '⚙️ Settings'].map((item, i) => (
                <Box key={item} sx={{
                  py: 0.8, px: 1.5, borderRadius: 1.5,
                  bgcolor: i === 1 ? 'rgba(99,102,241,0.5)' : 'transparent',
                }}>
                  <Typography sx={{ fontSize: 11, color: i === 1 ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: i === 1 ? 700 : 400 }}>
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Main area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Upload zone */}
              <Box sx={{
                border: '1.5px dashed rgba(99,102,241,0.4)',
                borderRadius: 2, p: 2.5, textAlign: 'center',
                bgcolor: 'rgba(99,102,241,0.04)',
              }}>
                <Typography sx={{ fontSize: 20, mb: 0.5 }}>📂</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 }}>
                  5 PDFs selected — invoice_q1.pdf, invoice_q2.pdf, report.pdf...
                </Typography>
              </Box>

              {/* Progress row */}
              <Box sx={{
                bgcolor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', gap: 2,
              }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'blink 1.2s ease infinite', flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>AI Extracting Data…</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6ee7b7', fontWeight: 700 }}>87%</Typography>
                  </Box>
                  <Box sx={{ height: 4, bgcolor: 'rgba(16,185,129,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: '87%', background: 'linear-gradient(90deg, #10b981, #06b6d4)', borderRadius: 2 }} />
                  </Box>
                </Box>
              </Box>

              {/* Mini table */}
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', bgcolor: 'rgba(99,102,241,0.15)' }}>
                  {['Invoice #','Date','Vendor','Amount'].map(h => (
                    <Box key={h} sx={{ px: 1.5, py: 0.8 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc' }}>{h}</Typography>
                    </Box>
                  ))}
                </Box>
                {[
                  ['INV-001','Jan 15','Acme Corp','$1,250'],
                  ['INV-002','Feb 01','TechSup','$890'],
                  ['INV-003','Feb 15','CloudSvc','$2,100'],
                ].map((row, i) => (
                  <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {row.map((cell, j) => (
                      <Box key={j} sx={{ px: 1.5, py: 0.8 }}>
                        <Typography sx={{ fontSize: 10, color: j === 3 ? '#6ee7b7' : 'rgba(255,255,255,0.5)' }}>{cell}</Typography>
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── STATS STRIP ── */}
      <Box sx={{ position: 'relative', zIndex: 1, py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{
            display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3,
          }}>
            {STATS.map((s, i) => (
              <Box key={s.label} sx={{
                textAlign: 'center', p: 3, borderRadius: '16px',
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                animation: `fadeUp 0.5s ease ${i * 0.08}s both`,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: `${s.color}30` },
                transition: 'all 0.2s ease',
              }}>
                <Typography sx={{
                  fontSize: 44, fontWeight: 900, lineHeight: 1, mb: 0.5,
                  color: s.color, fontFamily: '"Inter", sans-serif',
                }}>{s.value}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 500 }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── HOW IT WORKS ── */}
      <Box id="how-it-works" sx={{ position: 'relative', zIndex: 1, py: 12 }}>
        <Container maxWidth="lg">
          {/* Section header */}
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1, mb: 2,
              bgcolor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: 6, px: 2, py: 0.6,
            }}>
              <Typography sx={{ color: '#67e8f9', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>HOW IT WORKS</Typography>
            </Box>
            <Typography sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 900, letterSpacing: -0.5, mb: 2 }}>
              From PDF to Excel in{' '}
              <Box component="span" sx={{
                background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>4 steps</Box>
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 17, maxWidth: 520, mx: 'auto' }}>
              No code, no setup, no complexity. Just upload and extract.
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, position: 'relative' }}>
            {/* Connecting line on desktop */}
            <Box sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute', top: 40, left: '12.5%', right: '12.5%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), rgba(6,182,212,0.4), transparent)',
              zIndex: 0,
            }} />

            {STEPS.map((s, i) => (
              <Box key={s.num} sx={{
                position: 'relative', zIndex: 1,
                p: 3, borderRadius: '20px',
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                '&:hover': {
                  bgcolor: 'rgba(99,102,241,0.08)',
                  borderColor: 'rgba(99,102,241,0.3)',
                  transform: 'translateY(-4px)',
                  boxShadow: '0 16px 40px rgba(99,102,241,0.15)',
                },
                transition: 'all 0.25s ease',
                animation: `fadeUp 0.5s ease ${0.1 + i * 0.1}s both`,
              }}>
                {/* Step number */}
                <Box sx={{
                  width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
                  border: '1px solid rgba(99,102,241,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>
                  {s.icon}
                </Box>
                <Box sx={{
                  display: 'inline-block', px: 1.5, py: 0.3, borderRadius: 4, mb: 1.5,
                  bgcolor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)',
                }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#a5b4fc', letterSpacing: 1 }}>
                    STEP {s.num}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: 'white', mb: 1 }}>{s.title}</Typography>
                <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{s.desc}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── FEATURES ── */}
      <Box id="features" sx={{ position: 'relative', zIndex: 1, py: 12 }}>
        <Box sx={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          top: '20%', left: '50%', transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1, mb: 2,
              bgcolor: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: 6, px: 2, py: 0.6,
            }}>
              <Typography sx={{ color: '#c4b5fd', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>FEATURES</Typography>
            </Box>
            <Typography sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 900, letterSpacing: -0.5, mb: 2 }}>
              Everything you need,{' '}
              <Box component="span" sx={{
                background: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>nothing you don't</Box>
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 17, maxWidth: 520, mx: 'auto' }}>
              Powerful AI extraction with a dead-simple interface
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            {FEATURES.map((f, i) => (
              <Box key={f.title} sx={{
                p: 3.5, borderRadius: '20px',
                bgcolor: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                animation: `fadeUp 0.5s ease ${0.05 + i * 0.07}s both`,
                '&:hover': {
                  bgcolor: `${f.color}0a`,
                  borderColor: `${f.color}30`,
                  transform: 'translateY(-4px)',
                  boxShadow: `0 16px 40px ${f.color}15`,
                },
                transition: 'all 0.25s ease',
              }}>
                <Box sx={{
                  width: 52, height: 52, borderRadius: '14px', mb: 2.5,
                  bgcolor: `${f.color}15`, border: `1px solid ${f.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>{f.icon}</Box>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: 'white', mb: 1 }}>{f.title}</Typography>
                <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{f.desc}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── USE CASES ── */}
      <Box sx={{ position: 'relative', zIndex: 1, py: 8 }}>
        <Container maxWidth="lg">
          <Typography sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 700, letterSpacing: 2, mb: 4 }}>
            WORKS WITH ANY PDF TYPE
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
            {USE_CASES.map((u) => (
              <Box key={u.label} sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 2.5, py: 1, borderRadius: 6,
                bgcolor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                '&:hover': { bgcolor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)' },
                transition: 'all 0.15s ease', cursor: 'default',
              }}>
                <Typography sx={{ fontSize: 16 }}>{u.emoji}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{u.label}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── FAQ ── */}
      <Box id="faq" sx={{ position: 'relative', zIndex: 1, py: 12 }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1, mb: 2,
              bgcolor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 6, px: 2, py: 0.6,
            }}>
              <Typography sx={{ color: '#6ee7b7', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>FAQ</Typography>
            </Box>
            <Typography sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 900, letterSpacing: -0.5 }}>
              Common questions
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {FAQS.map((faq, i) => (
              <Box key={i}
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                sx={{
                  borderRadius: '16px', overflow: 'hidden',
                  border: `1px solid ${faqOpen === i ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  bgcolor: faqOpen === i ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  '&:hover': { borderColor: 'rgba(99,102,241,0.25)', bgcolor: 'rgba(99,102,241,0.05)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2.5 }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: faqOpen === i ? 'white' : 'rgba(255,255,255,0.8)', pr: 2 }}>
                    {faq.q}
                  </Typography>
                  <Box sx={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    bgcolor: faqOpen === i ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: faqOpen === i ? '#a5b4fc' : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.2s ease',
                    transform: faqOpen === i ? 'rotate(45deg)' : 'none',
                  }}>+</Box>
                </Box>
                {faqOpen === i && (
                  <Box sx={{ px: 3, pb: 2.5 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.8 }}>
                      {faq.a}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box sx={{ position: 'relative', zIndex: 1, py: 14, textAlign: 'center', px: 3 }}>
        {/* Big glow */}
        <Box sx={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{
            p: { xs: 4, md: 7 }, borderRadius: '28px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 50%, rgba(6,182,212,0.08) 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            animation: 'glowPulse 6s ease infinite',
          }}>
            <Box sx={{ fontSize: 56, mb: 2 }}>🚀</Box>
            <Typography sx={{
              fontSize: { xs: 28, md: 44 }, fontWeight: 900, letterSpacing: -0.5, mb: 2,
            }}>
              Ready to save hours of{' '}
              <Box component="span" sx={{
                background: 'linear-gradient(135deg, #a5b4fc, #06b6d4)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>manual work?</Box>
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 17, mb: 5, maxWidth: 480, mx: 'auto' }}>
              Free to start. No credit card. No code. Sign in with Google and extract your first PDF in under a minute.
            </Typography>

            <Box onClick={handleLogin} sx={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              px: 5, py: 2, borderRadius: 3.5, cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 12px 40px rgba(99,102,241,0.5)',
              '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 20px 56px rgba(99,102,241,0.6)', opacity: 0.95 },
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".9"/>
                <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".8"/>
                <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity=".7"/>
                <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".9"/>
              </svg>
              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 17 }}>Get Started Free with Google</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 4, flexWrap: 'wrap' }}>
              {['✓ Free to start', '✓ No credit card', '✓ No code required', '✓ Secure & private'].map((t) => (
                <Typography key={t} sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{t}</Typography>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box sx={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        py: 5, px: 4, textAlign: 'center',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'center', mb: 1.5 }}>
          <Box sx={{ boxShadow: '0 4px 12px rgba(99,102,241,0.4)', borderRadius: '8px' }}>
            <LogoIcon size={28} borderRadius={8} />
          </Box>
          <Typography sx={{ fontWeight: 900, fontSize: 15, color: 'white' }}>MultiPDFToExcel</Typography>
        </Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
          Extract data from multiple PDFs into Excel automatically using AI
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, mt: 2 }}>
          © {new Date().getFullYear()} MultiPDFToExcel. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
