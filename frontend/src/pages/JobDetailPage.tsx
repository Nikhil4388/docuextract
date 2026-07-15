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
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 130px)' }}>
      <CircularProgress sx={{ color: '#6366f1' }} />
    </Box>
  );

  const fmt = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /* ── Stat card definitions ───────────────────────────────────────────── */
  const STATS = [
    { label: 'Total',     value: String(job.total_files),     color: '#6366f1' },
    { label: 'Processed', value: String(job.processed_files), color: '#10b981' },
    { label: 'Failed',    value: String(job.failed_files),    color: job.failed_files > 0 ? '#ef4444' : '#94a3b8' },
    { label: 'Date',      value: new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), color: '#8b5cf6' },
    { label: 'Started',   value: job.started_at   ? fmt(job.started_at)   : '—', color: '#3b82f6' },
    { label: 'Finished',  value: job.completed_at ? fmt(job.completed_at) : '—', color: '#059669' },
  ] as const;

  return (
    /*
     * Outer shell: fixed column, full height minus topbar + AppLayout padding.
     * Header + stats row are flexShrink:0 (never move).
     * Table Paper is flex:1 — grows to fill whatever remains.
     */
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 130px)',   /* 64px topbar + 32px top pad + 32px bottom pad + 2px breathing */
      overflow: 'hidden',
      gap: '12px',
    }}>
      <style>{`
        @keyframes shimmerExport {
          0%       { left: -75%; }
          60%,100% { left: 130%; }
        }
        @keyframes pulseExport {
          0%,100% { box-shadow: 0 3px 14px rgba(99,102,241,0.40); }
          50%     { box-shadow: 0 5px 24px rgba(139,92,246,0.65), 0 0 0 4px rgba(99,102,241,0.10); }
        }
        @keyframes blinkDot {
          0%,100% { opacity:1; } 50% { opacity:0.25; }
        }
      `}</style>

      {/* ───────────────────────────────────────────────────────────────────
          ROW 1 — header bar: back · name · status · refresh · export
          flexShrink:0 → never scrolls away
      ─────────────────────────────────────────────────────────────────── */}
      <Box sx={{
        flexShrink: 0,
        bgcolor: 'white',
        borderRadius: '14px',
        border: '1.5px solid #ede9fe',
        boxShadow: '0 2px 10px rgba(99,102,241,0.07)',
        px: 2, py: '11px',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>

        {/* Back */}
        <Box onClick={() => navigate('/jobs')} title="Back to Jobs" sx={{
          width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: '#f5f3ff', border: '1.5px solid #ddd6fe', cursor: 'pointer', color: '#6366f1',
          '&:hover': { bgcolor: '#ede9fe', transform: 'translateX(-1px)' },
          '&:active': { transform: 'scale(0.9)' },
          transition: 'all 0.12s',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Box>

        {/* divider */}
        <Box sx={{ width: '1px', height: 24, bgcolor: '#ede9fe', flexShrink: 0 }} />

        {/* Job name + subtitle */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={900} fontSize="0.98rem" color="#0c0c0c"
            letterSpacing="-0.3px" noWrap lineHeight={1.2}>
            {job.name}
          </Typography>
          <Typography fontSize="0.65rem" color="#a5b4fc" fontWeight={600} letterSpacing="0.06em"
            textTransform="uppercase">
            Extraction Job
          </Typography>
        </Box>

        {/* Status pill */}
        <Box sx={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px',
          px: '10px', py: '5px', borderRadius: '7px',
          bgcolor: st.bg, border: `1.5px solid ${st.dot}35`,
        }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: st.dot,
            ...(job.status === 'processing' && { animation: 'blinkDot 1.2s ease infinite' }),
          }} />
          <Typography fontWeight={700} fontSize="0.75rem" color={st.text}>{st.label}</Typography>
        </Box>

        {/* Refresh */}
        <Box onClick={handleRefresh} title="Refresh" sx={{
          width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer', color: '#6366f1',
          '&:hover': { bgcolor: '#eef2ff', borderColor: '#a5b4fc' },
          '&:active': { transform: 'scale(0.9)' },
          transition: 'all 0.12s',
        }}>
          {refreshing
            ? <CircularProgress size={13} sx={{ color: '#6366f1' }} />
            : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            )}
        </Box>

        {/* Export */}
        {(job.status === 'completed' || job.status === 'partial') && (
          <Box onClick={handleExport} sx={{
            position: 'relative', overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '6px',
            height: 32, px: 2, borderRadius: '8px', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap',
            animation: 'pulseExport 2.4s ease-in-out infinite',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              transform: 'translateY(-1px)',
              animation: 'none',
              boxShadow: '0 6px 20px rgba(99,102,241,0.5)',
              '&::after': { animation: 'none' },
            },
            '&::after': {
              content: '""', position: 'absolute', top: 0, left: '-75%',
              width: '50%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
              transform: 'skewX(-20deg)',
              animation: 'shimmerExport 2.4s ease-in-out infinite',
            },
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export Excel
          </Box>
        )}
      </Box>

      {/* ───────────────────────────────────────────────────────────────────
          ROW 2 — stat cards: all identical size, compact, rectangular
          flexShrink:0 → pinned, never scrolls
      ─────────────────────────────────────────────────────────────────── */}
      <Box sx={{
        flexShrink: 0,
        display: 'flex', gap: '10px', flexWrap: 'nowrap', overflowX: 'auto',
        /* hide scrollbar on stat row */
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}>
        {STATS.map(({ label, value, color }) => (
          <Box key={label} sx={{
            /* ── SAME SIZE: fixed width, explicit padding, small radius ── */
            width: 108,
            flexShrink: 0,
            bgcolor: 'white',
            borderRadius: '8px',      /* 8px on ~58px card = 14% → clearly rectangular */
            border: '1.5px solid #f1f5f9',
            boxShadow: '0 1px 5px rgba(0,0,0,0.05)',
            pt: '10px', pb: '12px', px: '12px',
            display: 'flex', flexDirection: 'column', gap: '5px',
            position: 'relative', overflow: 'hidden',
            cursor: 'default',
            transition: 'all 0.15s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 6px 18px ${color}22`,
              borderColor: `${color}35`,
            },
            /* 2px bottom accent line */
            '&::after': {
              content: '""', position: 'absolute',
              bottom: 0, left: '10px', right: '10px', height: '2px',
              bgcolor: color, borderRadius: '2px 2px 0 0', opacity: 0.75,
            },
          }}>
            <Typography sx={{
              fontSize: '0.57rem', fontWeight: 700, letterSpacing: '0.09em',
              textTransform: 'uppercase', color: '#b0b8c9', lineHeight: 1,
            }}>
              {label}
            </Typography>
            <Typography sx={{
              fontSize: '0.95rem', fontWeight: 800, color, letterSpacing: '-0.4px',
              lineHeight: 1.1,
            }} noWrap>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ───────────────────────────────────────────────────────────────────
          ROW 3 (conditional) — processing progress card
          flexShrink:0 → pinned
      ─────────────────────────────────────────────────────────────────── */}
      {(job.status === 'processing' || job.status === 'pending') && (
        <Box sx={{
          flexShrink: 0,
          bgcolor: 'white', borderRadius: '10px',
          border: '1.5px solid #dbeafe',
          boxShadow: '0 1px 6px rgba(59,130,246,0.08)',
          px: 2.5, py: '13px',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: '10px' }}>
            <CircularProgress size={13} thickness={5.5} sx={{ color: '#6366f1' }} />
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

      {/* Inline alerts */}
      {job.error_message && job.status === 'failed' && (
        <Alert severity="error" sx={{ flexShrink: 0, borderRadius: '10px', py: 0.5 }}>
          {job.error_message}
        </Alert>
      )}
      {resultsError && jobDone && (
        <Alert severity="error" sx={{ flexShrink: 0, borderRadius: '10px', py: 0.5 }}
          action={
            <Box onClick={() => refetchResults()}
              sx={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#dc2626', px: 1 }}>
              Retry
            </Box>
          }>
          Could not load results.
        </Alert>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          TABLE — flex:1 fills all remaining height
          Column headers are always visible; only data rows scroll inside.
      ─────────────────────────────────────────────────────────────────── */}
      {jobDone && (
        <Paper sx={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          minHeight: 0,              /* critical: lets flex child shrink past content size */
          borderRadius: '14px', overflow: 'hidden',
          border: '1.5px solid #f1f5f9',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}>

          {/* Toolbar — fixed, never scrolls */}
          <Box sx={{
            flexShrink: 0,
            px: 2.5, py: '11px',
            display: 'flex', alignItems: 'center', gap: 2,
            borderBottom: '1px solid #f3f4f6', bgcolor: 'white',
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={800} fontSize="0.88rem" color="#0c0c0c" letterSpacing="-0.2px">
                Extracted Data
              </Typography>
              {rows.length > 0 && (
                <Typography fontSize={10.5} color="#94a3b8" sx={{ mt: '2px' }}>
                  {rows.length} record{rows.length !== 1 ? 's' : ''}
                  {' · '}
                  <Box component="span" sx={{ color: '#e11d48', fontWeight: 700 }}>red cells</Box>
                  {' = needs review'}
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
                  bgcolor: '#f9fafb', borderRadius: '9px', fontSize: 12.5,
                  '& fieldset': { borderColor: '#e5e7eb', borderRadius: '9px' },
                },
              }}
              sx={{ width: 180 }} />
          </Box>

          {/* DataGrid — fills the rest of the Paper, column headers pinned at top */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
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
                fontSize: '0.82rem',

                /* ── Column headers: dark navy matching sidebar ── */
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor:    '#0d0b28 !important',
                  background: 'linear-gradient(90deg,#07071a,#0d0b28,#110d30) !important',
                },
                '& .MuiDataGrid-columnHeader': {
                  bgcolor:    'transparent !important',
                  background: 'transparent !important',
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  color:         'rgba(255,255,255,0.72) !important',
                  fontWeight:    700,
                  fontSize:      '0.66rem',
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                },
                '& .MuiDataGrid-columnSeparator': {
                  color: 'rgba(255,255,255,0.06) !important',
                },
                '& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton': {
                  color: 'rgba(255,255,255,0.45) !important',
                },
                '& .MuiDataGrid-iconButtonContainer .MuiIconButton-root': {
                  color: 'rgba(255,255,255,0.45) !important',
                },

                /* ── Rows ── */
                '& .MuiDataGrid-row': { bgcolor: 'white', transition: 'background 0.1s' },
                '& .row-stripe':      { bgcolor: '#fafafa' },
                '& .MuiDataGrid-row:hover': { bgcolor: '#f0f0ff !important' },

                /* ── Cells ── */
                '& .MuiDataGrid-cell': { borderColor: '#f3f4f6', color: '#374151' },
                '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                  outline: '2px solid #818cf8', outlineOffset: -2,
                },

                /* ── Low-confidence highlight ── */
                '& .cell-low': {
                  backgroundColor: '#fff1f2 !important',
                  borderLeft:      '2px solid #fb7185 !important',
                  color:           '#e11d48 !important',
                  fontWeight:      '600 !important',
                },
                '& .MuiDataGrid-row:hover .cell-low': {
                  backgroundColor: '#ffe4e8 !important',
                },

                /* ── Pagination footer ── */
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid #f3f4f6',
                  bgcolor: '#fafafa',
                  minHeight: 42,
                },
                '& .MuiTablePagination-root': { fontSize: '0.78rem', color: '#6b7280' },
              }}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
}
