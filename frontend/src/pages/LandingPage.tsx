import React from 'react';
import { Box, Button, Typography, Container, Grid, Paper, Avatar, Chip } from '@mui/material';
import {
  AutoAwesome, TableChart, CheckCircle,
  Speed, Security, CloudUpload, ArrowForward, Google,
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();

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
