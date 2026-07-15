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

/* ── Status config — matches JobsPage ───────────────────────────────────── */
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

  /* ── Queries ─────────────────────────────────────────────────────────── */
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

  /* ── Actions ─────────────────────────────────────────────────────────── */
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

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const overallConfidence = (r: ExtractionResult): number | null => {
    if (!r.confidence_scores) return null;
    const vals = Object.values(r.confidence_scores).filter(v => typeof v === 'number') as number[];
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100);
  };

  /* ── Columns ─────────────────────────────────────────────────────────── */
  const dynamicColumns: GridColDef[] = React.useMemo(() => {
    if (!results?.length) return [];
    const firstRow =
      results.find(r => r.extracted_data && Object.keys(r.extracted_data).length > 0)
      ?? results[0];
    const extractedKeys = Object.keys(firstRow.extracted_data ?? {});

    return [
      {
        field: 'file_name', headerName: 'File', flex: 1.5, minWidth: 200,
        renderCell: ({ value }) => (
          <Typography fontSize={13} fontWeight={500} noWrap color="#1f2937">{value}</Typography>
        ),
      },
      ...extractedKeys.map((key): GridColDef => ({
        field:       key,
        headerName:  key,
        flex:        1,
        minWidth:    140,
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
          const r2 = 12, cx = 16, cy = 16, sw = 3;
          const c  = 2 * Math.PI * r2;
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
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress sx={{ color: '#6366f1' }} />
    </Box>
  );

  /* ── Stat card data ───────────────────────────────────────────────────── */
  const fmt = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const statCards = [
    { label: 'Total Files', value: String(job.total_files),     accent: '#6366f1' },
    { label: 'Processed',   value: String(job.processed_files), accent: '#10b981' },
    { label: 'Failed',      value: String(job.failed_files),    accent: job.failed_files > 0 ? '#ef4444' : '#94a3b8' },
    { label: 'Date',        value: new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), accent: '#8b5cf6' },
    { label: 'Started',     value: job.started_at   ? fmt(job.started_at)   : '—', accent: '#3b82f6' },
    { label: 'Finished',    value: job.completed_at ? fmt(job.completed_at) : '—', accent: '#10b981' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
      <style>{`
        @keyframes exportPulse {
          0%,100% { box-shadow: 0 4px 18px rgba(99,102,241,0.45); }
          50%      { box-shadow: 0 6px 28px rgba(139,92,246,0.7), 0 0 0 5px rgba(99,102,241,0.12); }
        }
        @keyframes exportShimmer {
          0%       { left: -75%; }
          60%,100% { left: 130%; }
        }
        @keyframes statusBlink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.35; }
        }
        @keyframes spinRefresh {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin-anim { animation: spinRefresh 0.6s linear; }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexShrink: 0 }}>
        {/* Back button — matches JobsPage refresh button style */}
        <Box onClick={() => navigate('/jobs')} sx={{
          width: 38, height: 38, borderRadius: 2.5, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'white', border: '1.5px solid #e2e8f0', color: '#6366f1',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          '&:hover': { bgcolor: '#eef2ff', borderColor: '#a5b4fc', transform: 'translateX(-2px)' },
          '&:active': { transform: 'scale(0.93)' },
          transition: 'all 0.15s ease',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Box>

        <Box>
          <Typography fontWeight={900} fontSize="1.2rem" color="#0c0c0c" letterSpacing="-0.3px" lineHeight={1.15}>
            {job.name}
          </Typography>
          <Typography fontSize="0.72rem" color="#94a3b8" fontWeight={500} letterSpacing="0.02em">
            Extraction Job
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Status chip — matches JobsPage pill style */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.8,
          px: 1.75, py: 0.65, borderRadius: 6,
          bgcolor: st.bg,
          border: `1.5px solid ${st.dot}45`,
          boxShadow: `0 2px 10px ${st.dot}20`,
        }}>
          <Box sx={{
            width: 7, height: 7, borderRadius: '50%', bgcolor: st.dot, flexShrink: 0,
            ...(job.status === 'processing' && { animation: 'statusBlink 1.2s ease infinite' }),
          }} />
          <Typography fontWeight={700} fontSize="0.8rem" color={st.text}>{st.label}</Typography>
        </Box>
      </Box>

      {/* ── Stat cards + action buttons ──────────────────────────────────── */}
      <Box sx={{
        display: 'flex', gap: 1.5, mb: 2.5, alignItems: 'stretch',
        flexShrink: 0, flexWrap: 'nowrap', overflowX: 'auto',
      }}>
        {statCards.map(({ label, value, accent }) => (
          <Box key={label} sx={{
            bgcolor: 'white',
            borderRadius: '18px',
            px: 2.5, py: 1.75,
            minWidth: 90, flexShrink: 0,
            border: '1.5px solid #f1f5f9',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 0.5,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 28px ${accent}22`,
              borderColor: `${accent}35`,
            },
            /* colored top bar — matches portal's gradient style */
            '&::before': {
              content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: `linear-gradient(90deg, ${accent}, ${accent}66)`,
            },
          }}>
            <Typography sx={{
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.09em',
              textTransform: 'uppercase', color: '#94a3b8',
            }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: accent, letterSpacing: '-0.5px', lineHeight: 1 }}>
              {value}
            </Typography>
          </Box>
        ))}

        {/* Divider */}
        <Box sx={{ width: '1px', bgcolor: '#e5e7eb', mx: 0.25, alignSelf: 'stretch', flexShrink: 0 }} />

        {/* Refresh — matches JobsPage refresh button */}
        <Box onClick={handleRefresh} sx={{
          width: 48, borderRadius: '18px', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'white', border: '1.5px solid #e2e8f0', color: '#6366f1',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          '&:hover': { bgcolor: '#f0f0ff', borderColor: '#a5b4fc', color: '#4f46e5' },
          '&:active': { transform: 'scale(0.93)' },
          transition: 'all 0.15s ease',
        }}>
          {refreshing
            ? <CircularProgress size={15} sx={{ color: '#6366f1' }} />
            : (
              <svg className={refreshing ? 'spin-anim' : ''} width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            )}
        </Box>

        {/* Export — animated gradient button */}
        {(job.status === 'completed' || job.status === 'partial') && (
          <Box onClick={handleExport} sx={{
            position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', gap: 1,
            px: 2.75, borderRadius: '18px', cursor: 'pointer', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #a78bfa 100%)',
            color: 'white', fontWeight: 800, fontSize: '0.86rem',
            letterSpacing: '0.02em', whiteSpace: 'nowrap',
            animation: 'exportPulse 2.4s ease-in-out infinite',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #8b5cf6 100%)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.6)',
              transform: 'translateY(-2px) scale(1.02)',
              animation: 'none',
              '&::after': { animation: 'none' },
            },
            '&::after': {
              content: '""', position: 'absolute', top: 0, left: '-75%',
              width: '50%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
              transform: 'skewX(-20deg)',
              animation: 'exportShimmer 2.4s ease-in-out infinite',
            },
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export Excel
          </Box>
        )}
      </Box>

      {/* ── Processing progress ───────────────────────────────────────────── */}
      {(job.status === 'processing' || job.status === 'pending') && (
        <Box sx={{
          p: 2.5, borderRadius: '18px', mb: 2.5, flexShrink: 0,
          bgcolor: 'white', border: '1.5px solid #dbeafe',
          boxShadow: '0 2px 10px rgba(59,130,246,0.08)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <CircularProgress size={13} thickness={5.5} sx={{ color: '#6366f1' }} />
            <Typography fontSize={13} color="#374151" fontWeight={500}>
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
              height: 6, borderRadius: 3, bgcolor: '#e0e7ff',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 3 },
            }}
          />
          {job.total_files > 0 && (
            <Typography fontSize={11} color="#94a3b8" sx={{ mt: 0.7 }}>
              {job.processed_files} / {job.total_files} files complete
            </Typography>
          )}
        </Box>
      )}

      {job.error_message && job.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '14px', flexShrink: 0 }}>
          {job.error_message}
        </Alert>
      )}
      {resultsError && jobDone && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '14px', flexShrink: 0 }}
          action={
            <Box onClick={() => refetchResults()} sx={{
              cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#dc2626', px: 1,
            }}>Retry</Box>
          }>
          Could not load extracted data.
        </Alert>
      )}

      {/* ── Results table — fills remaining height ────────────────────────── */}
      {jobDone && (
        <Paper sx={{
          borderRadius: '20px', overflow: 'hidden',
          border: '1.5px solid #f1f5f9',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
          {/* Toolbar */}
          <Box sx={{
            px: 2.5, py: 1.75, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 2,
            borderBottom: '1px solid #f3f4f6', bgcolor: 'white',
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={800} fontSize="0.95rem" color="#0c0c0c" letterSpacing="-0.2px">
                Extracted Data
              </Typography>
              {rows.length > 0 && (
                <Typography fontSize={11} color="#94a3b8" sx={{ mt: 0.2 }}>
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
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="8" stroke="#94a3b8" strokeWidth="2"/>
                      <path d="M21 21l-4.35-4.35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </InputAdornment>
                ),
                sx: { bgcolor: '#f9fafb', borderRadius: 2.5, fontSize: 13, '& fieldset': { borderColor: '#e5e7eb' } },
              }}
              sx={{ width: 200 }} />
          </Box>

          {/* Grid — fills remaining height, rows scroll inside */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <DataGrid
              rows={rows}
              columns={dynamicColumns}
              loading={resultsLoading}
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              disableRowSelectionOnClick
              rowHeight={46}
              getRowClassName={p => p.indexRelativeToCurrentPage % 2 !== 0 ? 'row-stripe' : ''}
              sx={{
                height: '100%',
                border: 'none',
                fontFamily: 'inherit',
                fontSize: '0.83rem',

                /* ── Header — matches sidebar dark navy gradient ── */
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#0d0b28 !important',
                  background: 'linear-gradient(135deg, #07071a 0%, #0d0b28 60%, #110d30 100%) !important',
                  minHeight: '44px !important',
                },
                '& .MuiDataGrid-columnHeader': {
                  bgcolor: 'transparent !important',
                  background: 'transparent !important',
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  color: 'rgba(255,255,255,0.72) !important',
                  fontWeight: 700, fontSize: '0.67rem',
                  letterSpacing: '0.09em', textTransform: 'uppercase',
                },
                '& .MuiDataGrid-columnSeparator': { color: 'rgba(255,255,255,0.07) !important' },
                '& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton': { color: 'rgba(255,255,255,0.45) !important' },
                '& .MuiDataGrid-iconButtonContainer .MuiIconButton-root': { color: 'rgba(255,255,255,0.45) !important' },

                /* ── Rows ── */
                '& .MuiDataGrid-row': { transition: 'background 0.12s', bgcolor: 'white' },
                '& .row-stripe': { bgcolor: '#fafafa' },
                '& .MuiDataGrid-row:hover': { bgcolor: '#f0f0ff !important' },

                /* ── Cells ── */
                '& .MuiDataGrid-cell': { borderColor: '#f3f4f6', color: '#374151' },
                '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                  outline: '2px solid #818cf8', outlineOffset: -2,
                },

                /* ── Low confidence ── */
                '& .cell-low': {
                  backgroundColor: '#fff1f2 !important',
                  borderLeft: '2px solid #fb7185 !important',
                  color: '#e11d48 !important',
                  fontWeight: '600 !important',
                },
                '& .MuiDataGrid-row:hover .cell-low': { backgroundColor: '#ffe4e8 !important' },

                /* ── Footer ── */
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid #f3f4f6', bgcolor: '#fafafa', minHeight: 44,
                },
                '& .MuiTablePagination-root': { fontSize: '0.8rem', color: '#6b7280' },
              }}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
}
