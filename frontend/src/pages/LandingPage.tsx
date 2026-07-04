import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
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
  { value: '100x', label: 'Faster than manual',  color: '#a5b4fc' },
  { value: '95%+', label: 'Extraction accuracy', color: '#6ee7b7' },
  { value: '<10s', label: 'Per 10 files',         color: '#67e8f9' },
  { value: '0',   label: 'Lines of code needed', color: '#fde68a' },
];

const FAQS = [
  { q: 'How do I convert PDF to Excel automatically?', a: 'Upload your PDFs to MultiPDFToExcel, create a template with the column names you want (invoice number, vendor, date, amount — anything), and the AI reads every PDF and builds a clean Excel spreadsheet automatically.' },
  { q: 'Can I convert multiple PDFs to Excel at once?', a: "Yes — that's what we're built for. Upload hundreds of PDFs in one batch. They all run in parallel so 100 PDFs finish in under 2 minutes, all rows in one Excel file." },
  { q: 'Does the PDF to Excel converter work with scanned PDFs?', a: 'Yes. The AI reads both native digital PDFs and scanned image PDFs. Built-in OCR means no extra tools needed — just upload and extract.' },
  { q: 'What types of PDFs can I convert to Excel?', a: 'Invoices, receipts, bank statements, resumes, contracts, purchase orders, medical records, research papers — any PDF with readable text or images.' },
  { q: 'Is there a free PDF to Excel converter?', a: 'Yes. Sign up free with Google and start converting PDFs to Excel immediately. No credit card required.' },
  { q: 'How accurate is the AI PDF to Excel extraction?', a: 'Consistently 95%+ accuracy on structured documents like invoices and forms. Confidence scores are shown for every extracted field so you always know the quality.' },
  { q: 'Is my data secure when converting PDF to Excel?', a: 'Files are transmitted over HTTPS (encrypted). Processed ephemerally — nothing is stored permanently after extraction completes. Your data stays yours.' },
];

const TRUST = [
  { icon: '🔐', label: 'HTTPS + TLS 1.3' },
  { icon: '🛡️', label: 'AES-256 Encrypted' },
  { icon: '🗑️', label: 'Zero Data Retention' },
  { icon: '🔑', label: 'JWT Auth' },
  { icon: '⚡', label: 'No Permanent Storage' },
];

// ── 3-D PDF stack (pure CSS) ──────────────────────────────────────────────────
function PDFStack() {
  return (
    <Box sx={{
      perspective: '1200px',
      width: { xs: 300, md: 380 },
      height: { xs: 300, md: 380 },
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Box sx={{
        position: 'relative',
        width: { xs: 220, md: 270 },
        height: { xs: 160, md: 200 },
        transformStyle: 'preserve-3d',
        animation: 'pdfFloat 10s ease-in-out infinite',
      }}>
        {/* Sheet 1 — cyan tint */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '16px',
          bgcolor: '#a5f3fc',
          transform: 'translateZ(-90px) translateY(22px) rotateX(4deg)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        }} />
        {/* Sheet 2 — violet */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '16px',
          bgcolor: '#c4b5fd',
          transform: 'translateZ(-55px) translateY(14px) rotateX(2deg)',
        }} />
        {/* Sheet 3 — indigo */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '16px',
          background: 'linear-gradient(135deg, #c7d2fe, #e0e7ff)',
          transform: 'translateZ(-22px) translateY(6px)',
        }} />

        {/* Sheet 4 — PDF input (white) */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '16px',
          bgcolor: 'white', transform: 'translateZ(12px)',
          boxShadow: '0 28px 80px rgba(0,0,0,0.2)',
          p: 2.5, overflow: 'hidden',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 22, height: 22, borderRadius: '5px', bgcolor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: 'white', fontSize: 7, fontWeight: 900, lineHeight: 1 }}>PDF</Typography>
            </Box>
            <Box>
              <Box sx={{ height: 5, width: 70, bgcolor: '#1e293b', borderRadius: 1, mb: 0.5 }} />
              <Box sx={{ height: 3.5, width: 45, bgcolor: '#cbd5e1', borderRadius: 1 }} />
            </Box>
          </Box>
          {[85, 65, 78, 55, 72, 48, 80].map((w, i) => (
            <Box key={i} sx={{ height: 3.5, width: `${w}%`, bgcolor: i % 3 === 0 ? '#ddd6fe' : '#e2e8f0', borderRadius: 1, mb: 0.9 }} />
          ))}
          <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5 }}>
            {['Invoice#', 'Date', 'Amount', 'INV-001', 'Jan 15', '$1,250', 'INV-002', 'Feb 01', '$890'].map((t, i) => (
              <Box key={i} sx={{
                height: i < 3 ? 15 : 13, borderRadius: '3px',
                bgcolor: i < 3 ? '#6366f1' : '#f1f5f9',
                display: 'flex', alignItems: 'center', px: 0.5,
              }}>
                <Typography sx={{ fontSize: 5.5, fontWeight: i < 3 ? 800 : 400, color: i < 3 ? 'white' : '#64748b', lineHeight: 1 }}>{t}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Sheet 5 — Excel output (indigo gradient) */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '16px',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          transform: 'translateZ(46px)',
          boxShadow: '0 32px 80px rgba(99,102,241,0.4)',
          p: 2, overflow: 'hidden',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: 'white', fontSize: 6, fontWeight: 900, lineHeight: 1 }}>XLS</Typography>
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: 700 }}>data_extracted.xlsx</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0.4 }}>
            {['Invoice#', 'Date', 'Vendor', 'Amount',
              'INV-001', 'Jan 15', 'Acme', '$1,250',
              'INV-002', 'Feb 01', 'Tech', '$890',
              'INV-003', 'Feb 15', 'Cloud', '$2,100'].map((t, i) => (
              <Box key={i} sx={{
                height: i < 4 ? 15 : 13, borderRadius: '3px',
                bgcolor: i < 4 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', px: 0.5,
              }}>
                <Typography sx={{ fontSize: 5, fontWeight: i < 4 ? 800 : 400, color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>{t}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#6ee7b7', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 7.5, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>16 files extracted · 100% confidence</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [faqOpen,    setFaqOpen]    = useState<number | null>(null);
  const [crazyMode,  setCrazyMode]  = useState(false);

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/google`;
  };

  return (
    <Box sx={{ bgcolor: '#e8e2d8', minHeight: '100vh', p: { xs: 1.5, md: 2 } }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes pdfFloat {
          0%,100% { transform: rotateX(18deg) rotateY(-22deg) rotateZ(2deg); }
          33%      { transform: rotateX(12deg) rotateY(18deg)  rotateZ(-3deg); }
          66%      { transform: rotateX(22deg) rotateY(8deg)   rotateZ(4deg); }
        }
        @keyframes gradShift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; } 50% { opacity: 0.3; }
        }
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        ${crazyMode ? `
          @keyframes rainbow { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
          .main-frame { animation: rainbow 1.5s linear infinite !important; }
          .pdf-float  { animation-duration: 1.5s !important; }
        ` : ''}
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:10px}
      `}</style>

      {/* ══ OUTER DARK FRAME ══════════════════════════════════════════════════ */}
      <Box className="main-frame" sx={{
        bgcolor: '#0c0c0c',
        borderRadius: { xs: '20px', md: '26px' },
        overflow: 'hidden',
        boxShadow: '0 60px 140px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>

        {/* ══ HERO — CREAM / LIGHT SECTION ══════════════════════════════════ */}
        <Box sx={{
          bgcolor: '#e8e2d8',
          borderRadius: { xs: '18px 18px 0 0', md: '24px 24px 0 0' },
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
        }}>

          {/* ── NAV ── */}
          <Box sx={{
            display: 'flex', alignItems: 'center',
            px: { xs: 3, md: 5 }, py: 2.5,
            borderBottom: '1px solid rgba(0,0,0,0.07)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ boxShadow: '0 4px 14px rgba(99,102,241,0.4)', borderRadius: '9px' }}>
                <LogoIcon size={34} borderRadius={9} />
              </Box>
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: '#0c0c0c', letterSpacing: -0.3 }}>
                MultiPDFToExcel
              </Typography>
            </Box>

            {/* Pill nav */}
            <Box sx={{
              display: { xs: 'none', md: 'flex' }, alignItems: 'center', ml: 5,
              border: '1px solid rgba(0,0,0,0.1)', borderRadius: 100, px: 0.5, py: 0.5,
            }}>
              {[['Features', '#features'], ['How It Works', '#how-it-works'], ['FAQ', '#faq']].map(([label, href]) => (
                <Box key={label} component="a" href={href}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  sx={{
                    px: 2.5, py: 0.9, borderRadius: 100, fontSize: 13, fontWeight: 600,
                    color: 'rgba(0,0,0,0.65)', textDecoration: 'none', cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.07)', color: '#0c0c0c' },
                    transition: 'all 0.15s',
                  }}>
                  {label}
                </Box>
              ))}
            </Box>

            <Box sx={{ flex: 1 }} />

            <Box onClick={() => navigate('/login')} sx={{
              px: 2.5, py: 1, borderRadius: 100, cursor: 'pointer', mr: 1.5,
              border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.55)',
              fontSize: 13, fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)', color: '#0c0c0c' },
              transition: 'all 0.15s',
            }}>
              Sign In
            </Box>

            <Box onClick={handleLogin} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 2.5, py: 1, borderRadius: 100, cursor: 'pointer',
              bgcolor: '#0c0c0c', color: 'white',
              fontSize: 13, fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              '&:hover': { bgcolor: '#1f1f1f', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(0,0,0,0.3)' },
              transition: 'all 0.2s ease',
            }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#6ee7b7', animation: 'blink 2s ease infinite', flexShrink: 0 }} />
              Let's Connect
            </Box>
          </Box>

          {/* ── HERO BODY ── */}
          <Box sx={{
            display: 'flex', alignItems: 'center',
            px: { xs: 3, md: 6 }, pt: { xs: 10, md: 14 }, pb: { xs: 8, md: 12 },
            gap: 4, flexWrap: { xs: 'wrap', lg: 'nowrap' },
          }}>
            {/* Left: copy */}
            <Box sx={{ flex: 1, minWidth: 280, animation: 'fadeUp 0.7s ease both' }}>
              {/* Badge */}
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1, mb: 4,
                px: 2, py: 0.8, borderRadius: 100,
                border: '1px solid rgba(0,0,0,0.1)', bgcolor: 'rgba(0,0,0,0.04)',
              }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', animation: 'blink 2s ease infinite' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0c0c0c', letterSpacing: 1 }}>
                  AI-POWERED · FREE TO START · NO CODE
                </Typography>
              </Box>

              {/* H1 */}
              <Typography component="h1" sx={{
                fontSize: { xs: 48, sm: 62, md: 78 },
                fontWeight: 900, lineHeight: 0.95,
                letterSpacing: -2.5, color: '#0c0c0c',
                mb: 3, fontFamily: '"Inter", sans-serif',
              }}>
                Extract Data<br />from PDFs —<br />
                <Box component="span" sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #06b6d4 100%)',
                  backgroundSize: '200% 200%',
                  animation: 'gradShift 5s ease infinite',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Instantly.</Box>
              </Typography>

              <Typography component="h2" sx={{
                fontSize: { xs: 15, md: 18 }, color: 'rgba(0,0,0,0.45)',
                maxWidth: 500, mb: 5, lineHeight: 1.75, fontWeight: 400,
              }}>
                Upload hundreds of PDFs, tell AI which fields to extract,
                and download a clean Excel spreadsheet in seconds.
                No manual copy-paste, no code.
              </Typography>

              {/* CTAs */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 5 }}>
                <Box onClick={handleLogin} sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  px: 3.5, py: 1.7, borderRadius: 100, cursor: 'pointer',
                  bgcolor: '#0c0c0c', color: 'white',
                  fontWeight: 800, fontSize: 15,
                  boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
                  '&:hover': { bgcolor: '#1f1f1f', transform: 'translateY(-2px)', boxShadow: '0 14px 40px rgba(0,0,0,0.3)' },
                  transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".9"/>
                    <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".7"/>
                    <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity=".5"/>
                    <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".9"/>
                  </svg>
                  Start Extracting Free
                </Box>
                <Box onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 3.5, py: 1.7, borderRadius: 100, cursor: 'pointer',
                  border: '1.5px solid rgba(0,0,0,0.15)', color: 'rgba(0,0,0,0.6)',
                  fontWeight: 600, fontSize: 14,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.06)', borderColor: 'rgba(0,0,0,0.25)', color: '#0c0c0c' },
                  transition: 'all 0.2s ease',
                }}>
                  See How It Works ↓
                </Box>
              </Box>

              {/* Trust badges */}
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {TRUST.map((t) => (
                  <Box key={t.label} sx={{
                    display: 'flex', alignItems: 'center', gap: 0.7,
                    px: 1.5, py: 0.6, borderRadius: 100,
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}>
                    <Typography sx={{ fontSize: 12 }}>{t.icon}</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.4)' }}>{t.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Right: 3D PDF stack */}
            <Box sx={{
              flex: 1, minWidth: 280, display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'fadeUp 0.7s ease 0.2s both',
            }}>
              <Box className="pdf-float">
                <PDFStack />
              </Box>
            </Box>
          </Box>

          {/* Crazy mode toggle */}
          <Box sx={{
            position: 'absolute', bottom: 20, right: 20,
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 2, py: 0.9, borderRadius: 100,
            bgcolor: '#0c0c0c',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Crazy mode:</Typography>
            {(['On', 'Off'] as const).map((v) => (
              <Box key={v} onClick={() => setCrazyMode(v === 'On')} sx={{
                px: 1.5, py: 0.35, borderRadius: 100, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                bgcolor: (v === 'On') === crazyMode ? 'white' : 'transparent',
                color: (v === 'On') === crazyMode ? '#0c0c0c' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s',
              }}>{v}</Box>
            ))}
          </Box>
        </Box>

        {/* ══ DARK SECTIONS ═════════════════════════════════════════════════ */}
        <Box sx={{ bgcolor: '#0c0c0c', color: 'white' }}>

          {/* Stats */}
          <Box sx={{ py: 10, px: { xs: 3, md: 6 }, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2 }}>
              {STATS.map((s) => (
                <Box key={s.label} sx={{
                  p: { xs: 3, md: 4 }, borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.025)', borderColor: `${s.color}20` },
                  transition: 'all 0.2s',
                }}>
                  <Typography sx={{ fontSize: { xs: 42, md: 52 }, fontWeight: 900, color: s.color, lineHeight: 1, mb: 0.5, fontFamily: '"Inter",sans-serif' }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 500 }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* How it works */}
          <Box id="how-it-works" sx={{ py: 14, px: { xs: 3, md: 6 }, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', mb: 2 }}>
              HOW IT WORKS
            </Typography>
            <Typography sx={{ fontSize: { xs: 34, md: 52 }, fontWeight: 900, letterSpacing: -1.5, mb: 10, lineHeight: 1.05 }}>
              From PDF to Excel<br />in 4 simple steps.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2 }}>
              {STEPS.map((s, i) => (
                <Box key={s.num} sx={{
                  p: 3.5, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)',
                  animation: `fadeUp 0.5s ease ${i * 0.1}s both`,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.3)', transform: 'translateY(-4px)' },
                  transition: 'all 0.25s',
                }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'rgba(255,255,255,0.18)', mb: 2 }}>
                    {s.num}
                  </Typography>
                  <Typography sx={{ fontSize: 26, mb: 1.5 }}>{s.icon}</Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 1 }}>{s.title}</Typography>
                  <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75 }}>{s.desc}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Features */}
          <Box id="features" sx={{ py: 14, px: { xs: 3, md: 6 }, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', mb: 2 }}>
              FEATURES
            </Typography>
            <Typography sx={{ fontSize: { xs: 34, md: 52 }, fontWeight: 900, letterSpacing: -1.5, mb: 10, lineHeight: 1.05 }}>
              Everything you need,<br />nothing you don't.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3,1fr)' }, gap: 2 }}>
              {FEATURES.map((f, i) => (
                <Box key={f.title} sx={{
                  p: 3.5, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)',
                  animation: `fadeUp 0.5s ease ${i * 0.07}s both`,
                  '&:hover': { bgcolor: `${f.color}08`, borderColor: `${f.color}25`, transform: 'translateY(-4px)' },
                  transition: 'all 0.25s',
                }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '14px', mb: 2.5, bgcolor: `${f.color}12`, border: `1px solid ${f.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {f.icon}
                  </Box>
                  <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 1 }}>{f.title}</Typography>
                  <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75 }}>{f.desc}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Use cases marquee */}
          <Box sx={{ py: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <Typography sx={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', mb: 5 }}>
              WORKS WITH ANY PDF TYPE
            </Typography>
            <Box sx={{ display: 'flex', animation: 'marquee 22s linear infinite', width: 'max-content', gap: 2 }}>
              {[...USE_CASES, ...USE_CASES].map((u, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1.2, borderRadius: 100,
                  border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  <Typography sx={{ fontSize: 15 }}>{u.emoji}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>{u.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* FAQ */}
          <Box id="faq" sx={{ py: 14, px: { xs: 3, md: 6 }, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', mb: 2 }}>
              FAQ
            </Typography>
            <Typography sx={{ fontSize: { xs: 34, md: 52 }, fontWeight: 900, letterSpacing: -1.5, mb: 10, lineHeight: 1.05 }}>
              Common questions.
            </Typography>
            <Box sx={{ maxWidth: 800 }}>
              {FAQS.map((faq, i) => (
                <Box key={i} onClick={() => setFaqOpen(faqOpen === i ? null : i)} sx={{
                  borderTop: i === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                  transition: 'all 0.15s',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 3 }}>
                    <Typography sx={{ fontSize: { xs: 14, md: 16 }, fontWeight: 600, color: faqOpen === i ? 'white' : 'rgba(255,255,255,0.65)', pr: 4 }}>
                      {faq.q}
                    </Typography>
                    <Box sx={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.4)', fontSize: 18,
                      transform: faqOpen === i ? 'rotate(45deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}>+</Box>
                  </Box>
                  {faqOpen === i && (
                    <Box sx={{ pb: 3, pr: { xs: 0, md: 8 } }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.85 }}>{faq.a}</Typography>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>

          {/* CTA */}
          <Box sx={{ py: 18, px: { xs: 3, md: 6 }, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', mb: 4 }}>
              GET STARTED
            </Typography>
            <Typography sx={{
              fontSize: { xs: 42, md: 72 }, fontWeight: 900, letterSpacing: -2.5, lineHeight: 0.95, mb: 5,
            }}>
              Ready to save hours<br />of manual work?
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 18, mb: 7, maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}>
              Free to start. No credit card. No code required.
            </Typography>
            <Box onClick={handleLogin} sx={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              px: 5, py: 2.2, borderRadius: 100, cursor: 'pointer',
              bgcolor: 'white', color: '#0c0c0c',
              fontWeight: 800, fontSize: 16,
              boxShadow: '0 12px 40px rgba(255,255,255,0.12)',
              '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 20px 56px rgba(255,255,255,0.2)', bgcolor: '#f5f5f5' },
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#0c0c0c" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".9"/>
                <path fill="#0c0c0c" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".7"/>
                <path fill="#0c0c0c" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity=".5"/>
                <path fill="#0c0c0c" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".9"/>
              </svg>
              Get Started Free with Google
            </Box>
            <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', mt: 5, flexWrap: 'wrap' }}>
              {['✓ Free to start', '✓ No credit card', '✓ No code required', '✓ Secure & private'].map((t) => (
                <Typography key={t} sx={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>{t}</Typography>
              ))}
            </Box>
          </Box>

          {/* Footer */}
          <Box sx={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            py: 5, px: { xs: 3, md: 6 },
            display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LogoIcon size={26} borderRadius={7} />
              <Typography sx={{ fontWeight: 900, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>MultiPDFToExcel</Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.18)', fontSize: 12 }}>
              Extract data from multiple PDFs into Excel automatically using AI
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.12)', fontSize: 12 }}>
              © {new Date().getFullYear()} MultiPDFToExcel. All rights reserved.
            </Typography>
          </Box>

        </Box>
      </Box>
    </Box>
  );
}
