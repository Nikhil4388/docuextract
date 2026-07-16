import React, { useState } from 'react';
import {
  Box, Paper, Typography,
  Alert, CircularProgress, TextField, InputAdornment, LinearProgress,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ExtractionJob, ExtractionResult } from '../types';

const STATUS_STYLE: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  pending:    { dot: '#f59e0b', bg: '#fef3c7', text: '#92400e', label: 'Pending'    },
  processing: { dot: '#3b82f6', bg: '#dbeafe', text: '#1e40af', label: 'Processing' },
  completed:  { dot: '#10b981', bg: '#d1fae5', text: '#065f46', label: 'Complete'   },
  partial:    { dot: '#f59e0b', bg: '#fef9c3', text: '#854d0e', label: 'Partial'    },
  failed:     { dot: '#ef4444', bg: '#fee2e2', text: '#991b1b', label: 'Failed'     },
  cancelled:  { dot: '#94a3b8', bg: '#f1f5f9', text: '#475569', label: 'Cancelled'  },
};

export default function JobDetailPage() {
  const { jobId }   = useParams<{ jobId: string }>();
  const navigate    = useNavigate();
  const [search, setSearch]         = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: job, refetch: refetchJob } = useQuery<ExtractionJob>({
    queryKey: ['job', jobId],
    queryFn:  () => api.get(`/jobs/${jobId}`).then(r => r.data),
    refetchInterval: q =>
      ['pending', 'processing'].includes(q.state.data?.status ?? '') ? 3000 : false,
  });

  const jobDone = ['completed', 'failed', 'partial'].includes(job?.status ?? '');

  const { data: results, isLoading: resultsLoading, isError: resultsError, refetch: refetchResults } =
    useQuery<ExtractionResult[]>({
      queryKey: ['job-results', jobId, search, job?.status],
      queryFn:  () => api.get(`/jobs/${jobId}/results`, {
        params: { search: search || undefined, limit: 1000 },
      }).then(r => r.data),
      enabled:  jobDone,
      retry:    3,
      refetchInterval: q =>
        jobDone && !q.state.error && (q.state.data?.length ?? 0) === 0 ? 2000 : false,
    });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchJob();
    if (jobDone) await refetchResults();
    setRefreshing(false);
  };

  const handleExport = async () => {
    const res = await api.get(`/jobs/${jobId}/export/excel`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a   = document.createElement('a');
    a.href = url; a.download = `${job?.name ?? 'results'}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  const overallConfidence = (r: ExtractionResult): number | null => {
    if (!r.confidence_scores) return null;
    const vals = Object.values(r.confidence_scores).filter(v => typeof v === 'number') as number[];
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100);
  };

  const dynamicColumns: GridColDef[] = React.useMemo(() => {
    if (!results?.length) return [];
    const firstRow =
      results.find(r => r.extracted_data && Object.keys(r.extracted_data).length > 0)
      ?? results[0];
    const keys = Object.keys(firstRow.extracted_data ?? {});
    return [
      {
        field: 'file_name', headerName: 'File', flex: 1.5, minWidth: 200,
        renderCell: ({ value }) => (
          <Typography fontSize={13} fontWeight={500} noWrap color="#1f2937">{value}</Typography>
        ),
      },
      ...keys.map((key): GridColDef => ({
        field: key, headerName: key, flex: 1, minWidth: 140,
        valueGetter: (_, row) => row.extracted_data?.[key] ?? '—',
        cellClassName: params => {
          const s = params.row.confidence_scores?.[key];
          return s == null || s < 0.85 ? 'cell-low' : '';
        },
      })),
      {
        field: '_confidence', headerName: 'Confidence', width: 130,
        valueGetter: (_, row) => overallConfidence(row),
        renderCell: ({ row }) => {
          const pct = overallConfidence(row);
          if (pct == null) return <Typography fontSize={12} color="#9ca3af">—</Typography>;
          const [fg, bg] =
            pct >= 95 ? ['#059669', '#d1fae5'] :
            pct >= 85 ? ['#d97706', '#fef9c3'] :
                        ['#dc2626', '#fee2e2'];
          const r2 = 12, cx = 16, cy = 16, sw = 3, c = 2 * Math.PI * r2;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <svg width={32} height={32} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                <circle cx={cx} cy={cy} r={r2} fill="none" stroke={bg} strokeWidth={sw} />
                <circle cx={cx} cy={cy} r={r2} fill="none" stroke={fg} strokeWidth={sw}
                  strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" />
              </svg>
              <Box sx={{ px: 0.9, py: 0.2, borderRadius: 4, bgcolor: bg }}>
                <Typography fontSize={12} fontWeight={700} color={fg}>{pct}%</Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: 'processing_time_ms', headerName: 'Time', width: 80,
        renderCell: ({ value }) => (
          <Typography fontSize={12} color="#9ca3af">{value ? `${value}ms` : '—'}</Typography>
        ),
      },
    ];
  }, [results]);

  const rows = results?.map(r => ({ id: r.id, ...r })) ?? [];
  const st   = STATUS_STYLE[job?.status ?? ''] ?? STATUS_STYLE.pending;

  if (!job) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <CircularProgress sx={{ color: '#6366f1' }} />
    </Box>
  );

  const fmt = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const STATS = [
    { label: 'Total',     value: String(job.total_files),     color: '#6366f1' },
    { label: 'Processed', value: String(job.processed_files), color: '#10b981' },
    { label: 'Failed',    value: String(job.failed_files),    color: job.failed_files > 0 ? '#ef4444' : '#94a3b8' },
    { label: 'Date',      value: new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), color: '#8b5cf6' },
    { label: 'Started',   value: job.started_at   ? fmt(job.started_at)   : '—', color: '#3b82f6' },
    { label: 'Finished',  value: job.completed_at ? fmt(job.completed_at) : '—', color: '#059669' },
  ] as const;

  return (
    <>
      <style>{`
        @keyframes shimmerExport {
          0% { left:-75%; } 60%,100% { left:130%; }
        }
        @keyframes pulseExport {
          0%,100% { box-shadow: 0 3px 14px rgba(99,102,241,.40); }
          50%     { box-shadow: 0 5px 24px rgba(139,92,246,.65), 0 0 0 4px rgba(99,102,241,.10); }
        }
        @keyframes blinkDot { 0%,100%{opacity:1} 50%{opacity:.25} }
      `}</style>

      {/*
        ┌─ STICKY ZONE ──────────────────────────────────────────────────────┐
        │  position:sticky + top:64px = sticks right below the 64px topbar  │
        │  when the user scrolls down. Header card + stat cards always       │
        │  visible. mx cancels AppLayout's horizontal padding so the         │
        │  background covers the full page width (no gap at sides).          │
        └────────────────────────────────────────────────────────────────────┘
      */}
      <Box sx={{
        position: 'sticky',
        top: 64,                         /* just below the fixed 64px AppLayout topbar */
        zIndex: 200,
        bgcolor: '#e8e2d8',
        pb: '10px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>

        {/* ── Header bar ──────────────────────────────────────────── */}
        <Box sx={{
          bgcolor: 'white',
          borderRadius: '10px',
          border: '1.5px solid #ede9fe',
          boxShadow: '0 2px 8px rgba(99,102,241,.07)',
          px: '14px', py: '9px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          {/* Back */}
          <Box onClick={() => navigate('/jobs')} sx={{
            width: 30, height: 30, borderRadius: '7px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: '#f5f3ff', border: '1.5px solid #ddd6fe',
            cursor: 'pointer', color: '#6366f1',
            '&:hover': { bgcolor: '#ede9fe' },
            '&:active': { transform: 'scale(.9)' },
            transition: 'all .12s',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Box>

          <Box sx={{ width: '1px', height: 20, bgcolor: '#ede9fe', flexShrink: 0 }} />

          {/* Title */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={900} fontSize=".95rem" color="#0c0c0c"
              letterSpacing="-.3px" noWrap>
              {job.name}
            </Typography>
            <Typography fontSize=".6rem" color="#a5b4fc" fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Extraction Job
            </Typography>
          </Box>

          {/* Status */}
          <Box sx={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px',
            px: '9px', py: '4px', borderRadius: '6px',
            bgcolor: st.bg, border: `1.5px solid ${st.dot}35`,
          }}>
            <Box sx={{
              width: 6, height: 6, borderRadius: '50%', bgcolor: st.dot,
              ...(job.status === 'processing' && { animation: 'blinkDot 1.2s ease infinite' }),
            }} />
            <Typography fontWeight={700} fontSize=".73rem" color={st.text}>
              {st.label}
            </Typography>
          </Box>

          {/* Refresh */}
          <Box onClick={handleRefresh} sx={{
            width: 30, height: 30, borderRadius: '7px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: '#f8fafc', border: '1.5px solid #e2e8f0',
            cursor: 'pointer', color: '#6366f1',
            '&:hover': { bgcolor: '#eef2ff', borderColor: '#a5b4fc' },
            '&:active': { transform: 'scale(.9)' },
            transition: 'all .12s',
          }}>
            {refreshing
              ? <CircularProgress size={12} sx={{ color: '#6366f1' }} />
              : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              )}
          </Box>

          {/* Export button removed from header — now lives in stat cards row */}
        </Box>

        {/* ── Stat cards — 6 identical small rectangles ────────── */}
        <Box sx={{
          display: 'flex', gap: '8px', flexWrap: 'nowrap',
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}>
          {STATS.map(({ label, value, color }) => (
            <Box key={label} sx={{
              /*
               * RECTANGLE: width=104, height≈57px, borderRadius=6px
               * 6 / 28.5 = 21%  →  clearly rectangular, not oval
               */
              width: 104, flexShrink: 0,
              bgcolor: 'white',
              borderRadius: '6px',
              border: '1.5px solid #f1f5f9',
              boxShadow: '0 1px 4px rgba(0,0,0,.05)',
              pt: '9px', pb: '10px', px: '11px',
              display: 'flex', flexDirection: 'column', gap: '4px',
              position: 'relative', overflow: 'hidden',
              transition: 'all .15s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: `0 4px 14px ${color}20`,
                borderColor: `${color}30`,
              },
              /* bottom accent line */
              '&::after': {
                content: '""', position: 'absolute',
                bottom: 0, left: '8px', right: '8px', height: '2px',
                bgcolor: color, borderRadius: '2px 2px 0 0', opacity: .65,
              },
            }}>
              <Typography sx={{
                fontSize: '.58rem', fontWeight: 700, letterSpacing: '.08em',
                textTransform: 'uppercase', color: '#b0b8c9', lineHeight: 1,
              }}>
                {label}
              </Typography>
              <Typography sx={{
                fontSize: '.93rem', fontWeight: 800, color,
                letterSpacing: '-.3px', lineHeight: 1.2,
              }} noWrap>
                {value}
              </Typography>
            </Box>
          ))}

          {/* Export Excel — after FINISHED, portal indigo theme */}
          {(job.status === 'completed' || job.status === 'partial') && (
            <Box onClick={handleExport} sx={{
              width: 118, flexShrink: 0,
              borderRadius: '8px',
              py: '9px', px: '12px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', justifyContent: 'center',
              gap: '5px',
              position: 'relative', overflow: 'hidden',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #818cf8 100%)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.45)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              transition: 'all .18s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.55)',
                background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 55%, #6366f1 100%)',
              },
              '&:active': { transform: 'scale(.97)' },
              '&::before': {
                content: '""', position: 'absolute',
                top: 0, left: '-80%', width: '55%', height: '100%',
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)',
                transform: 'skewX(-18deg)',
                animation: 'shimmerExport 2.6s ease-in-out infinite',
              },
            }}>
              <Typography sx={{
                fontSize: '.58rem', fontWeight: 700, letterSpacing: '.09em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', lineHeight: 1,
              }}>Export</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Typography sx={{
                  fontSize: '.9rem', fontWeight: 900, color: '#ffffff',
                  letterSpacing: '-.2px', lineHeight: 1,
                }}>Excel</Typography>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                    stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Box>
            </Box>
          )}
        </Box>

      </Box>{/* end sticky zone */}

      {/* ── Processing progress ──────────────────────────────── */}
      {(job.status === 'processing' || job.status === 'pending') && (
        <Box sx={{
          mt: '4px',
          bgcolor: 'white', borderRadius: '10px',
          border: '1.5px solid #dbeafe',
          boxShadow: '0 1px 6px rgba(59,130,246,.08)',
          px: 2.5, py: '11px',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: '9px' }}>
            <CircularProgress size={12} thickness={5.5} sx={{ color: '#6366f1' }} />
            <Typography fontSize={12.5} color="#374151" fontWeight={500}>
              {job.status_message
                || (job.status === 'pending'
                  ? 'Waiting in queue…'
                  : `Processing ${job.processed_files} of ${job.total_files} files…`)}
            </Typography>
          </Box>
          <LinearProgress
            variant={job.total_files > 0 ? 'determinate' : 'indeterminate'}
            value={job.total_files > 0 ? (job.processed_files / job.total_files) * 100 : undefined}
            sx={{
              height: 5, borderRadius: 3, bgcolor: '#e0e7ff',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 3 },
            }}
          />
          {job.total_files > 0 && (
            <Typography fontSize={11} color="#94a3b8" sx={{ mt: '5px' }}>
              {job.processed_files} / {job.total_files} files
            </Typography>
          )}
        </Box>
      )}

      {job.error_message && job.status === 'failed' && (
        <Alert severity="error" sx={{ mt: '4px', borderRadius: '10px', py: .5 }}>
          {job.error_message}
        </Alert>
      )}
      {resultsError && jobDone && (
        <Alert severity="error" sx={{ mt: '4px', borderRadius: '10px', py: .5 }}
          action={
            <Box onClick={() => refetchResults()}
              sx={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#dc2626', px: 1 }}>
              Retry
            </Box>
          }>
          Could not load results.
        </Alert>
      )}

      {/*
        ┌─ TABLE ─────────────────────────────────────────────────────────────┐
        │  Paper is overflow:hidden → DataGrid clips inside it (no horiz     │
        │  page scroll). DataGrid Box has an explicit calc() height so:       │
        │   • column headers are always visible at top of grid                │
        │   • only data rows scroll inside the grid                           │
        │                                                                     │
        │  Height = 100vh                                                     │
        │   − 64px  topbar                                                    │
        │   − 32px  AppLayout top padding (md)                                │
        │   − 57px  header card + 9px top of sticky zone                     │
        │   − 8px   gap inside sticky                                         │
        │   − 57px  stats row                                                 │
        │   − 10px  sticky bottom padding                                     │
        │   − 8px   gap (outer flex)                                          │
        │   − 44px  table toolbar                                             │
        │   − 32px  AppLayout bottom padding                                  │
        │   − 16px  breathing room                                            │
        │  = 337px  → use calc(100vh - 337px) ≈ calc(100vh - 340px)         │
        └─────────────────────────────────────────────────────────────────────┘
      */}
      {jobDone && (
        <Paper sx={{
          mt: '4px',
          borderRadius: '12px',
          overflow: 'hidden',           /* clips DataGrid horizontally — no page scroll */
          border: '1.5px solid #f1f5f9',
          boxShadow: '0 2px 10px rgba(0,0,0,.05)',
          width: '100%',
        }}>
          {/* Toolbar */}
          <Box sx={{
            px: '18px', py: '9px',
            display: 'flex', alignItems: 'center', gap: 2,
            borderBottom: '1px solid #f3f4f6', bgcolor: 'white',
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={800} fontSize=".87rem" color="#0c0c0c" letterSpacing="-.2px">
                Extracted Data
              </Typography>
              {rows.length > 0 && (
                <Typography fontSize={10.5} color="#94a3b8" sx={{ mt: '1px' }}>
                  {rows.length} record{rows.length !== 1 ? 's' : ''}
                  {' · '}
                  <Box component="span" sx={{ color: '#e11d48', fontWeight: 700 }}>red</Box>
                  {' = low confidence'}
                </Typography>
              )}
            </Box>
            <TextField size="small" placeholder="Search…" value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="8" stroke="#94a3b8" strokeWidth="2.1"/>
                      <path d="M21 21l-4.35-4.35" stroke="#94a3b8" strokeWidth="2.1" strokeLinecap="round"/>
                    </svg>
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: '#f9fafb', borderRadius: '7px', fontSize: 12.5,
                  '& fieldset': { borderColor: '#e5e7eb', borderRadius: '7px' },
                },
              }}
              sx={{ width: 170 }} />
          </Box>

          {/* DataGrid — fixed height, internal row scroll, column headers always visible */}
          <Box sx={{ height: 'calc(100vh - 340px)', minHeight: 240, overflow: 'hidden' }}>
            <DataGrid
              rows={rows}
              columns={dynamicColumns}
              loading={resultsLoading}
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              disableRowSelectionOnClick
              rowHeight={44}
              columnHeaderHeight={44}
              getRowClassName={p => p.indexRelativeToCurrentPage % 2 !== 0 ? 'row-stripe' : ''}
              sx={{
                height: '100%',
                border: 'none',
                fontFamily: 'inherit',
                fontSize: '.82rem',

                /* Column header styles handled by App.tsx MUI theme override */

                /* Rows */
                '& .MuiDataGrid-row':       { bgcolor: 'white', transition: 'background .1s' },
                '& .row-stripe':            { bgcolor: '#fafafa' },
                '& .MuiDataGrid-row:hover': { bgcolor: '#f0f0ff !important' },

                /* Cells */
                '& .MuiDataGrid-cell': { borderColor: '#f3f4f6', color: '#374151' },
                '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                  outline: '2px solid #818cf8', outlineOffset: -2,
                },

                /* Low-confidence */
                '& .cell-low': {
                  backgroundColor: '#fff1f2 !important',
                  borderLeft:      '2px solid #fb7185 !important',
                  color:           '#e11d48 !important',
                  fontWeight:      '600 !important',
                },
                '& .MuiDataGrid-row:hover .cell-low': { backgroundColor: '#ffe4e8 !important' },

                /* Footer */
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid #f3f4f6', bgcolor: '#fafafa', minHeight: 42,
                },
                '& .MuiTablePagination-root': { fontSize: '.78rem', color: '#6b7280' },
              }}
            />
          </Box>
        </Paper>
      )}
    </>
  );
}
