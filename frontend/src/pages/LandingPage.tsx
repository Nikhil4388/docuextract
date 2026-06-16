import React, { useState } from 'react';
import { Box, Button, Typography, Container, Grid, Paper, Avatar, Chip, Dialog, IconButton } from '@mui/material';
import {
  AutoAwesome, TableChart, CheckCircle,
  Speed, Security, CloudUpload, ArrowForward, Google,
  PlayCircle, Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// ── Data ──────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: <CloudUpload sx={{ fontSize: 32 }} />,
    color: '#667eea',
    bg: '#667eea12',
    title: 'Upload Multiple PDFs at Once',
    desc: 'Drag and drop dozens of PDF files simultaneously. No more opening files one by one.',
  },
  {
    icon: <AutoAwesome sx={{ fontSize: 32 }} />,
    color: '#f59e0b',
    bg: '#f59e0b12',
    title: 'AI Extracts Data Automatically',
    desc: 'Our AI reads every PDF and pulls out exactly the data you need — names, dates, amounts, tables, anything.',
  },
  {
    icon: <TableChart sx={{ fontSize: 32 }} />,
    color: '#22c55e',
    bg: '#22c55e12',
    title: 'Download Clean Excel File',
    desc: 'All extracted data is organized into a clean, structured Excel spreadsheet ready for analysis.',
  },
  {
    icon: <Speed sx={{ fontSize: 32 }} />,
    color: '#3b82f6',
    bg: '#3b82f612',
    title: 'Process 100s of PDFs in Minutes',
    desc: 'What used to take hours of manual copy-paste now takes minutes. Process entire folders instantly.',
  },
  {
    icon: <CheckCircle sx={{ fontSize: 32 }} />,
    color: '#8b5cf6',
    bg: '#8b5cf612',
    title: 'Custom Extraction Templates',
    desc: 'Define exactly which fields to extract. Works for invoices, resumes, contracts, reports — any PDF.',
  },
  {
    icon: <Security sx={{ fontSize: 32 }} />,
    color: '#ef4444',
    bg: '#ef444412',
    title: 'Secure & Private',
    desc: 'Your documents are processed securely and never stored permanently. Your data stays yours.',
  },
];

const steps = [
  { num: '1', title: 'Upload Your PDFs', desc: 'Select one or hundreds of PDF files from your computer or cloud storage.' },
  { num: '2', title: 'Define What to Extract', desc: 'Create a simple template — tell the AI which fields you need (name, date, total, etc.).' },
  { num: '3', title: 'Download Excel File', desc: 'Click extract. In seconds, download a clean spreadsheet with all your data.' },
];

const useCases = [
  { emoji: '🧾', label: 'Invoices → Excel' },
  { emoji: '📄', label: 'Resumes → Database' },
  { emoji: '📋', label: 'Contracts → Spreadsheet' },
  { emoji: '📊', label: 'Reports → Dataset' },
  { emoji: '🏥', label: 'Medical Records → Excel' },
  { emoji: '🏦', label: 'Bank Statements → CSV' },
];

const stats = [
  { value: '100x', label: 'Faster than manual copy-paste' },
  { value: '99%', label: 'Extraction accuracy' },
  { value: '500+', label: 'PDF types supported' },
  { value: '0', label: 'Coding required' },
];

// ── Paste your YouTube or Loom video URL here after recording ─────────────────
// YouTube: https://www.youtube.com/embed/YOUR_VIDEO_ID
// Loom:    https://www.loom.com/embed/YOUR_VIDEO_ID
const DEMO_VIDEO_URL = ''; // leave empty to show placeholder
// ─────────────────────────────────────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [videoOpen, setVideoOpen] = useState(false);

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/google`;
  };

  return (
    <Box sx={{ bgcolor: '#ffffff', minHeight: '100vh' }}>

      {/* ── Navbar ── */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 100,
        bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #f0f0f0', px: 4, py: 1.5,
        display: 'flex', alignItems: 'center',
      }}>
        <Typography fontWeight={800} fontSize={20} sx={{ color: '#667eea', flex: 1 }}>
          MultiPDFToExcel
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/login')} sx={{ mr: 1.5, borderRadius: 2, borderColor: '#667eea', color: '#667eea' }}>
          Sign In
        </Button>
        <Button variant="contained" onClick={handleLogin} startIcon={<Google />} sx={{ borderRadius: 2 }}>
          Get Started Free
        </Button>
      </Box>

      {/* ── Hero ── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white', textAlign: 'center', px: 3, pt: 10, pb: 12,
      }}>
        <Chip label="✨ AI-Powered · Free to Start" sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }} />
        <Typography variant="h2" fontWeight={800} lineHeight={1.15} mb={2.5} sx={{ fontSize: { xs: '2rem', md: '3.2rem' } }}>
          Extract Data from Multiple PDFs<br />into Excel — Automatically
        </Typography>
        <Typography fontSize={20} sx={{ opacity: 0.9, maxWidth: 620, mx: 'auto', mb: 5 }}>
          Stop copying data from PDFs by hand. Upload your files, tell the AI what to extract,
          and download a clean Excel dataset in seconds.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained" size="large" onClick={handleLogin}
            startIcon={<Google />} endIcon={<ArrowForward />}
            sx={{ bgcolor: 'white', color: '#667eea', fontWeight: 700, borderRadius: 3, px: 4, py: 1.5, fontSize: 16, '&:hover': { bgcolor: '#f5f5f5' } }}
          >
            Start Extracting Free
          </Button>
          <Button
            variant="outlined" size="large"
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            sx={{ borderColor: 'white', color: 'white', borderRadius: 3, px: 4, py: 1.5, fontSize: 16, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            See How It Works
          </Button>
        </Box>

        {/* Hero visual */}
        <Box sx={{
          mt: 7, mx: 'auto', maxWidth: 720, bgcolor: 'rgba(255,255,255,0.12)',
          borderRadius: 4, p: 3, border: '1px solid rgba(255,255,255,0.25)',
        }}>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['invoice_jan.pdf','invoice_feb.pdf','invoice_mar.pdf','contract_2024.pdf','report_q1.pdf'].map(f => (
              <Chip key={f} label={f} size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11 }} />
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 1.5 }}>
            <Box sx={{ height: 2, flex: 1, bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
            <AutoAwesome sx={{ fontSize: 28, color: '#fbbf24' }} />
            <Typography fontSize={13} sx={{ opacity: 0.9 }}>AI Extracting Data…</Typography>
            <Box sx={{ height: 2, flex: 1, bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
          </Box>
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, p: 1.5 }}>
            <Typography fontSize={11} fontFamily="monospace" sx={{ opacity: 0.9 }}>
              📊 results.xlsx — Invoice No. | Date | Vendor | Amount | Status
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Stats ── */}
      <Box sx={{ bgcolor: '#f8f9fa', py: 5 }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} justifyContent="center">
            {stats.map(s => (
              <Grid item xs={6} md={3} key={s.label}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={800} color="#667eea">{s.value}</Typography>
                  <Typography color="text.secondary" fontSize={14}>{s.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Demo Video Section ── */}
      <Box sx={{ py: 10, bgcolor: 'white' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight={800} textAlign="center" mb={1.5}>
            See It in Action
          </Typography>
          <Typography textAlign="center" color="text.secondary" fontSize={18} mb={7} maxWidth={540} mx="auto">
            Watch how MultiPDFToExcel extracts data from 10 invoices into Excel in under 60 seconds
          </Typography>

          {/* Video player / placeholder */}
          <Box sx={{ position: 'relative', mx: 'auto', maxWidth: 800 }}>
            {DEMO_VIDEO_URL ? (
              <Box sx={{ position: 'relative', paddingTop: '56.25%', borderRadius: 4, overflow: 'hidden', boxShadow: '0 24px 60px rgba(102,126,234,0.2)' }}>
                <iframe
                  src={DEMO_VIDEO_URL}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="MultiPDFToExcel Demo"
                />
              </Box>
            ) : (
              /* Placeholder until video is recorded */
              <Box
                onClick={() => setVideoOpen(true)}
                sx={{
                  position: 'relative', borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
                  boxShadow: '0 24px 60px rgba(102,126,234,0.2)',
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
                  aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 2,
                  '&:hover .play-icon': { transform: 'scale(1.1)' },
                }}
              >
                {/* Fake UI preview inside the video placeholder */}
                <Box sx={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
                  {/* Fake browser bar */}
                  <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', height: 36, display: 'flex', alignItems: 'center', px: 2, gap: 1 }}>
                    {['#ef4444','#f59e0b','#22c55e'].map(c => (
                      <Box key={c} sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c }} />
                    ))}
                    <Box sx={{ flex: 1, mx: 2, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1, height: 20 }} />
                  </Box>
                  {/* Fake app content */}
                  <Box sx={{ p: 2, display: 'flex', gap: 1.5 }}>
                    <Box sx={{ width: 160, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 1.5 }}>
                      {['Dashboard','Templates','Jobs','Settings'].map(item => (
                        <Box key={item} sx={{ py: 0.8, px: 1, mb: 0.5, borderRadius: 1, bgcolor: item === 'Jobs' ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
                          <Typography fontSize={10} color="white" sx={{ opacity: 0.7 }}>{item}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 2 }}>
                        <Typography fontSize={12} color="white" fontWeight={700} mb={1} sx={{ opacity: 0.9 }}>New Extraction Job</Typography>
                        {[1,2,3].map(i => (
                          <Box key={i} sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1, height: 28, mb: 1 }} />
                        ))}
                        <Box sx={{ bgcolor: '#667eea', borderRadius: 1, height: 32, mt: 1.5 }} />
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Play button overlay */}
                <PlayCircle className="play-icon" sx={{ fontSize: 80, color: 'white', transition: 'transform 0.2s', zIndex: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }} />
                <Typography fontSize={18} fontWeight={700} color="white" sx={{ zIndex: 1, opacity: 0.9 }}>
                  Watch 60-second Demo
                </Typography>
                <Chip label="🎬 Coming Soon" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', zIndex: 1 }} />
              </Box>
            )}
          </Box>

          {/* App screenshot mockups below video */}
          <Box sx={{ mt: 8 }}>
            <Typography textAlign="center" fontWeight={700} fontSize={16} color="text.secondary" mb={4}>
              What you'll see inside the app
            </Typography>
            <Grid container spacing={3}>
              {/* Screenshot 1 — Dashboard */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                  <Box sx={{ bgcolor: '#667eea', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {['#ef4444','#f59e0b','#22c55e'].map(c => <Box key={c} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />)}
                    <Typography fontSize={11} color="white" sx={{ opacity: 0.8, ml: 1 }}>Dashboard</Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                    <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 1.5, mb: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <Typography fontSize={11} fontWeight={700} mb={1}>Good morning, Nikhil 👋</Typography>
                      <Grid container spacing={1}>
                        {['Total Jobs','Completed','Processing','Failed'].map((label, i) => (
                          <Grid item xs={6} key={label}>
                            <Box sx={{ bgcolor: ['#667eea10','#22c55e10','#f59e0b10','#ef444410'][i], borderRadius: 1, p: 1 }}>
                              <Typography fontSize={16} fontWeight={800} color={['#667eea','#22c55e','#f59e0b','#ef4444'][i]}>{[12,9,2,1][i]}</Typography>
                              <Typography fontSize={9} color="text.secondary">{label}</Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                    <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <Typography fontSize={10} fontWeight={700} mb={1}>Recent Jobs</Typography>
                      {['Invoice Batch Jan','Contract Extract','Resume Parser'].map(j => (
                        <Box key={j} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #f3f4f6' }}>
                          <Typography fontSize={9}>{j}</Typography>
                          <Chip label="✓" size="small" sx={{ height: 14, fontSize: 8, bgcolor: '#dcfce7', color: '#16a34a' }} />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ px: 2, py: 1.5, bgcolor: 'white', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <Typography fontSize={11} fontWeight={600} color="#667eea">📊 Dashboard</Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Screenshot 2 — New Job */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                  <Box sx={{ bgcolor: '#764ba2', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {['#ef4444','#f59e0b','#22c55e'].map(c => <Box key={c} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />)}
                    <Typography fontSize={11} color="white" sx={{ opacity: 0.8, ml: 1 }}>New Extraction Job</Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                    <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <Typography fontSize={10} fontWeight={700} mb={1.5}>Upload PDFs</Typography>
                      <Box sx={{ border: '2px dashed #667eea', borderRadius: 2, p: 2, textAlign: 'center', mb: 1.5, bgcolor: '#667eea05' }}>
                        <CloudUpload sx={{ fontSize: 22, color: '#667eea', mb: 0.5 }} />
                        <Typography fontSize={9} color="text.secondary">Drop PDF files here</Typography>
                      </Box>
                      {['invoice_jan.pdf','invoice_feb.pdf','invoice_mar.pdf'].map(f => (
                        <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: '1px solid #f3f4f6' }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: 0.5, bgcolor: '#ef4444' }} />
                          <Typography fontSize={9}>{f}</Typography>
                          <CheckCircle sx={{ fontSize: 10, color: '#22c55e', ml: 'auto' }} />
                        </Box>
                      ))}
                      <Box sx={{ mt: 1.5, bgcolor: '#667eea', borderRadius: 1, py: 0.8, textAlign: 'center' }}>
                        <Typography fontSize={10} color="white" fontWeight={700}>Extract Data →</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ px: 2, py: 1.5, bgcolor: 'white', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <Typography fontSize={11} fontWeight={600} color="#764ba2">📤 Upload & Extract</Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Screenshot 3 — Results Excel */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                  <Box sx={{ bgcolor: '#16a34a', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {['#ef4444','#f59e0b','#22c55e'].map(c => <Box key={c} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />)}
                    <Typography fontSize={11} color="white" sx={{ opacity: 0.8, ml: 1 }}>results.xlsx</Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                    <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      {/* Excel header */}
                      <Box sx={{ bgcolor: '#16a34a', px: 1.5, py: 0.8 }}>
                        <Typography fontSize={9} color="white" fontWeight={700}>📊 Extracted Data — 3 invoices</Typography>
                      </Box>
                      {/* Table */}
                      <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
                          <thead>
                            <tr style={{ background: '#f0fdf4' }}>
                              {['Invoice#','Date','Vendor','Amount','Status'].map(h => (
                                <th key={h} style={{ padding: '4px 6px', textAlign: 'left', borderBottom: '1px solid #dcfce7', color: '#15803d', fontWeight: 700 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              ['INV-001','Jan 15','Acme Corp','$1,250','Paid'],
                              ['INV-002','Jan 22','TechSupp','$890','Pending'],
                              ['INV-003','Feb 01','CloudSvc','$2,100','Paid'],
                            ].map((row, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                                {row.map((cell, j) => (
                                  <td key={j} style={{ padding: '4px 6px', borderBottom: '1px solid #f3f4f6', color: j === 4 ? (cell === 'Paid' ? '#16a34a' : '#d97706') : '#374151' }}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{ bgcolor: '#16a34a', borderRadius: 1, px: 2, py: 0.6 }}>
                          <Typography fontSize={9} color="white" fontWeight={700}>⬇ Download Excel</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ px: 2, py: 1.5, bgcolor: 'white', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <Typography fontSize={11} fontWeight={600} color="#16a34a">✅ Clean Excel Output</Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* ── Video dialog (for placeholder click) ── */}
      <Dialog open={videoOpen} onClose={() => setVideoOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
        <Box sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography fontWeight={700} color="white">Demo Video — Coming Soon</Typography>
          <IconButton size="small" onClick={() => setVideoOpen(false)} sx={{ color: 'white' }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <PlayCircle sx={{ fontSize: 60, color: '#667eea', mb: 2 }} />
          <Typography fontWeight={700} fontSize={18} mb={1}>We're recording the demo video!</Typography>
          <Typography color="text.secondary" mb={3}>In the meantime, sign up free and try it yourself — takes 30 seconds.</Typography>
          <Button variant="contained" startIcon={<Google />} size="large"
            onClick={() => { setVideoOpen(false); window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/google`; }}
            sx={{ borderRadius: 3, fontWeight: 700, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            Try It Free Instead
          </Button>
        </Box>
      </Dialog>

      {/* ── Use cases ── */}
      <Box sx={{ py: 6, bgcolor: 'white' }}>
        <Container maxWidth="lg">
          <Typography textAlign="center" fontWeight={700} fontSize={18} mb={3} color="text.secondary">
            Works for any PDF type
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {useCases.map(u => (
              <Chip key={u.label} label={`${u.emoji} ${u.label}`} variant="outlined"
                sx={{ fontSize: 14, py: 2.5, px: 1, borderColor: '#e5e7eb', fontWeight: 500 }} />
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── How it works ── */}
      <Box id="how-it-works" sx={{ py: 10, bgcolor: '#f8f9fa' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight={800} textAlign="center" mb={1.5}>
            How to Extract PDF Data to Excel
          </Typography>
          <Typography textAlign="center" color="text.secondary" fontSize={18} mb={7} maxWidth={540} mx="auto">
            3 simple steps to convert any PDF into a structured Excel dataset
          </Typography>
          <Grid container spacing={4}>
            {steps.map((s, i) => (
              <Grid item xs={12} md={4} key={s.num}>
                <Paper sx={{ p: 4, borderRadius: 4, height: '100%', position: 'relative', overflow: 'hidden' }}>
                  <Typography sx={{
                    position: 'absolute', top: -10, right: 16,
                    fontSize: 96, fontWeight: 900, color: '#667eea08', lineHeight: 1,
                  }}>{s.num}</Typography>
                  <Avatar sx={{ bgcolor: '#667eea', width: 48, height: 48, fontSize: 22, fontWeight: 800, mb: 2 }}>
                    {s.num}
                  </Avatar>
                  <Typography variant="h6" fontWeight={700} mb={1}>{s.title}</Typography>
                  <Typography color="text.secondary" lineHeight={1.7}>{s.desc}</Typography>
                  {i < steps.length - 1 && (
                    <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', color: '#667eea', zIndex: 1 }}>
                      <ArrowForward sx={{ fontSize: 28 }} />
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Features ── */}
      <Box sx={{ py: 10, bgcolor: 'white' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight={800} textAlign="center" mb={1.5}>
            Everything You Need to Extract PDF Data
          </Typography>
          <Typography textAlign="center" color="text.secondary" fontSize={18} mb={7} maxWidth={540} mx="auto">
            Powerful features to make PDF data extraction fast, accurate, and effortless
          </Typography>
          <Grid container spacing={3}>
            {features.map(f => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <Paper sx={{ p: 3.5, borderRadius: 3, height: '100%', '&:hover': { boxShadow: '0 8px 24px rgba(102,126,234,0.12)' }, transition: 'box-shadow 0.2s' }}>
                  <Avatar sx={{ bgcolor: f.bg, color: f.color, width: 56, height: 56, mb: 2 }}>
                    {f.icon}
                  </Avatar>
                  <Typography fontWeight={700} fontSize={16} mb={1}>{f.title}</Typography>
                  <Typography color="text.secondary" lineHeight={1.7} fontSize={14}>{f.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── FAQ (keyword-rich for SEO) ── */}
      <Box sx={{ py: 10, bgcolor: '#f8f9fa' }}>
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight={800} textAlign="center" mb={7}>
            Frequently Asked Questions
          </Typography>
          {[
            { q: 'How do I extract data from multiple PDFs into Excel?', a: 'With MultiPDFToExcel, upload all your PDFs, create an extraction template defining what data you need (like invoice number, date, amount), and click Extract. The AI processes all files and downloads a single Excel file with all the data.' },
            { q: 'Can I extract tables from PDF to Excel automatically?', a: 'Yes. Our AI detects and extracts tables, lists, and structured data from any PDF automatically. You can also define custom fields to extract specific values.' },
            { q: 'How many PDFs can I process at once?', a: 'You can upload and process hundreds of PDFs in a single job. The system handles batch processing automatically so you don\'t need to do them one by one.' },
            { q: 'What types of PDFs does it work with?', a: 'It works with invoices, receipts, contracts, bank statements, medical records, resumes, research papers, reports — any PDF with text content. Scanned PDFs with OCR are also supported.' },
            { q: 'Is my data secure?', a: 'Yes. All files are processed securely over HTTPS, and your documents are not stored permanently after extraction is complete.' },
          ].map(faq => (
            <Box key={faq.q} sx={{ mb: 3, p: 3, bgcolor: 'white', borderRadius: 3, borderLeft: '4px solid #667eea' }}>
              <Typography fontWeight={700} mb={1}>{faq.q}</Typography>
              <Typography color="text.secondary" lineHeight={1.8}>{faq.a}</Typography>
            </Box>
          ))}
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: 10, textAlign: 'center', color: 'white' }}>
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight={800} mb={2}>
            Start Extracting PDF Data to Excel Today
          </Typography>
          <Typography fontSize={18} sx={{ opacity: 0.9, mb: 5 }}>
            Free to start. No credit card. No coding. Just upload and extract.
          </Typography>
          <Button
            variant="contained" size="large" onClick={handleLogin}
            startIcon={<Google />}
            sx={{ bgcolor: 'white', color: '#667eea', fontWeight: 700, borderRadius: 3, px: 5, py: 1.8, fontSize: 17, '&:hover': { bgcolor: '#f5f5f5' } }}
          >
            Get Started Free with Google
          </Button>
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box sx={{ bgcolor: '#1f2937', color: '#9ca3af', py: 4, textAlign: 'center' }}>
        <Typography fontWeight={700} fontSize={18} color="white" mb={0.5}>MultiPDFToExcel</Typography>
        <Typography fontSize={13}>Extract data from multiple PDFs into Excel automatically using AI</Typography>
        <Typography fontSize={12} mt={2}>© {new Date().getFullYear()} MultiPDFToExcel. All rights reserved.</Typography>
      </Box>

    </Box>
  );
}
