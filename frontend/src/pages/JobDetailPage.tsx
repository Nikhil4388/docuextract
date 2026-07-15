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
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 72px)' }}>
      <CircularProgress sx={{ color: '#6366f1' }} />
    </Box>
  );

  const fmt = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 72px)', overflow: 'hidden', gap: 2 }}>
      <style>{`
        @keyframes exportPulse {
          0%,100% { box-shadow: 0 4px 20px rgba(99,102,241,0.4); }
          50%      { box-shadow: 0 6px 30px rgba(139,92,246,0.65), 0 0 0 4px rgba(99,102,241,0.1); }
        }
        @keyframes exportShimmer {
          0%       { left: -75%; }
          60%,100% { left: 130%; }
        }
        @keyframes statusBlink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.3; }
        }
        @keyframes spinAnim {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .do-spin { animation: spinAnim 0.6s linear; }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════
          TOP HEADER CARD — back · title · status · refresh · export
      ═══════════════════════════════════════════════════════════════════ */}
      <Box sx={{
        flexShrink: 0,
        bgcolor: 'white',
        borderRadius: '16px',
        border: '1.5px solid #f1f5f9',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        px: 2.5, py: '14px',
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        {/* Back button */}
        <Box onClick={() => navigate('/jobs')} sx={{
          width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer', color: '#6366f1',
          '&:hover': { bgcolor: '#eef2ff', borderColor: '#a5b4fc', transform: 'translateX(-1px)' },
          '&:active': { transform: 'scale(0.92)' },
          transition: 'all 0.15s ease',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Box>

        {/* Vertical rule */}
        <Box sx={{ width: '1px', height: 28, bgcolor: '#f1f5f9', flexShrink: 0 }} />

        {/* Job title */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={900} fontSize="1.05rem" color="#0c0c0c" letterSpacing="-0.3px" noWrap lineHeight={1.2}>
            {job.name}
          </Typography>
          <Typography fontSize="0.7rem" color="#94a3b8" fontWeight={500}>
            Extraction Job
          </Typography>
        </Box>

        {/* Status badge */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
          px: '12px', py: '6px', borderRadius: '8px',
          bgcolor: st.bg, border: `1.5px solid ${st.dot}35`,
          boxShadow: `0 2px 8px ${st.dot}18`,
        }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: st.dot,
            ...(job.status === 'processing' && { animation: 'statusBlink 1.2s ease infinite' }),
          }} />
          <Typography fontWeight={700} fontSize="0.78rem" color={st.text}>{st.label}</Typography>
        </Box>

        {/* Refresh button */}
        <Box onClick={handleRefresh} sx={{
          width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer', color: '#6366f1',
          '&:hover': { bgcolor: '#eef2ff', borderColor: '#a5b4fc' },
          '&:active': { transform: 'scale(0.92)' },
          transition: 'all 0.15s ease',
        }}>
          {refreshing
            ? <CircularProgress size={14} sx={{ color: '#6366f1' }} />
            : (
              <svg className={refreshing ? 'do-spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            )}
        </Box>

        {/* Export button */}
        {(job.status === 'completed' || job.status === 'partial') && (
          <Box onClick={handleExport} sx={{
            position: 'relative', overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 1,
            px: 2.5, height: 34, borderRadius: '10px', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #a78bfa 100%)',
            color: 'white', fontWeight: 700, fontSize: '0.82rem',
            letterSpacing: '0.01em', whiteSpace: 'nowrap',
            animation: 'exportPulse 2.4s ease-in-out infinite',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #8b5cf6 100%)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.6)',
              transform: 'translateY(-1px) scale(1.02)',
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
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export Excel
          </Box>
        )}
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          STATS ROW — 6 metric cards, genuinely rectangular
      ═══════════════════════════════════════════════════════════════════ */}
      <Box sx={{
        flexShrink: 0,
        display: 'flex', gap: 1.5, alignItems: 'stretch',
        flexWrap: 'nowrap', overflowX: 'auto',
      }}>
        {([
          { label: 'Total Files', value: String(job.total_files),     accent: '#6366f1' },
          { label: 'Processed',   value: String(job.processed_files), accent: '#10b981' },
          { label: 'Failed',      value: String(job.failed_files),    accent: job.failed_files > 0 ? '#ef4444' : '#94a3b8' },
          { label: 'Date',        value: new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), accent: '#8b5cf6' },
          { label: 'Started',     value: job.started_at   ? fmt(job.started_at)   : '—', accent: '#3b82f6' },
          { label: 'Finished',    value: job.completed_at ? fmt(job.completed_at) : '—', accent: '#10b981'  },
        ] as const).map(({ label, value, accent }) => (
          <Box key={label} sx={{
            flex: 1, minWidth: 96,
            bgcolor: 'white',
            /* ── KEY FIX: explicit height + moderate radius = rectangle ── */
            borderRadius: '12px',
            border: '1.5px solid #f1f5f9',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            p: '14px 18px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            gap: '8px',
            position: 'relative', overflow: 'hidden',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 24px ${accent}22`,
              borderColor: `${accent}40`,
            },
            /* 3px top accent bar */
            '&::before': {
              content: '""', position: 'absolute',
              top: 0, left: 0, right: 0, height: '3px',
              background: `linear-gradient(90deg, ${accent}, ${accent}80)`,
              borderRadius: '12px 12px 0 0',
            },
          }}>
            <Typography sx={{
              fontSize: '0.59rem', fontWeight: 700, letterSpacing: '0.09em',
              textTransform: 'uppercase', color: '#b0bec5', lineHeight: 1,
            }}>
              {label}
            </Typography>
            <Typography sx={{
              fontSize: '1.05rem', fontWeight: 800, color: accent,
              letterSpacing: '-0.4px', lineHeight: 1,
            }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          PROCESSING PROGRESS (only when running)
      ═══════════════════════════════════════════════════════════════════ */}
      {(job.status === 'processing' || job.status === 'pending') && (
        <Box sx={{
          flexShrink: 0,
          bgcolor: 'white', borderRadius: '12px',
          border: '1.5px solid #dbeafe',
          boxShadow: '0 2px 8px rgba(59,130,246,0.08)',
          p: '16px 20px',
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
              height: 5, borderRadius: 3, bgcolor: '#e0e7ff',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 3,
              },
            }}
          />
          {job.total_files > 0 && (
            <Typography fontSize={11} color="#94a3b8" sx={{ mt: 0.6 }}>
              {job.processed_files} / {job.total_files} files complete
            </Typography>
          )}
        </Box>
      )}

      {/* Alerts */}
      {job.error_message && job.status === 'failed' && (
        <Alert severity="error" sx={{ flexShrink: 0, borderRadius: '12px' }}>
          {job.error_message}
        </Alert>
      )}
      {resultsError && jobDone && (
        <Alert severity="error" sx={{ flexShrink: 0, borderRadius: '12px' }}
          action={
            <Box onClick={() => refetchResults()}
              sx={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#dc2626', px: 1 }}>
              Retry
            </Box>
          }>
          Could not load extracted data.
        </Alert>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          RESULTS TABLE — fills all remaining height, rows scroll inside
      ═══════════════════════════════════════════════════════════════════ */}
      {jobDone && (
        <Paper sx={{
          flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
          borderRadius: '16px', overflow: 'hidden',
          border: '1.5px solid #f1f5f9',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}>
          {/* Table toolbar */}
          <Box sx={{
            flexShrink: 0, px: 2.5, py: '14px',
            display: 'flex', alignItems: 'center', gap: 2,
            borderBottom: '1px solid #f3f4f6', bgcolor: 'white',
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={800} fontSize="0.9rem" color="#0c0c0c" letterSpacing="-0.2px">
                Extracted Data
              </Typography>
              {rows.length > 0 && (
                <Typography fontSize={11} color="#94a3b8" sx={{ mt: 0.15 }}>
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
                sx: {
                  bgcolor: '#f9fafb', borderRadius: '10px', fontSize: 13,
                  '& fieldset': { borderColor: '#e5e7eb', borderRadius: '10px' },
                },
              }}
              sx={{ width: 190 }} />
          </Box>

          {/* DataGrid — fills remaining height, internal scroll */}
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

                /* ── Header: same dark navy as the sidebar ── */
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#0d0b28 !important',
                  background: 'linear-gradient(90deg, #07071a, #0d0b28, #110d30) !important',
                  minHeight: '44px !important',
                },
                '& .MuiDataGrid-columnHeader': {
                  bgcolor: 'transparent !important',
                  background: 'transparent !important',
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  color: 'rgba(255,255,255,0.7) !important',
                  fontWeight: 700, fontSize: '0.67rem',
                  letterSpacing: '0.09em', textTransform: 'uppercase',
                },
                '& .MuiDataGrid-columnSeparator': { color: 'rgba(255,255,255,0.06) !important' },
                '& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton': {
                  color: 'rgba(255,255,255,0.45) !important',
                },
                '& .MuiDataGrid-iconButtonContainer .MuiIconButton-root': {
                  color: 'rgba(255,255,255,0.45) !important',
                },

                /* ── Rows ── */
                '& .MuiDataGrid-row': { transition: 'background 0.1s', bgcolor: 'white' },
                '& .row-stripe': { bgcolor: '#fafafa' },
                '& .MuiDataGrid-row:hover': { bgcolor: '#f0f0ff !important' },

                /* ── Cells ── */
                '& .MuiDataGrid-cell': { borderColor: '#f3f4f6', color: '#374151' },
                '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                  outline: '2px solid #818cf8', outlineOffset: -2,
                },

                /* ── Low confidence highlight ── */
                '& .cell-low': {
                  backgroundColor: '#fff1f2 !important',
                  borderLeft: '2px solid #fb7185 !important',
                  color: '#e11d48 !important',
                  fontWeight: '600 !important',
                },
                '& .MuiDataGrid-row:hover .cell-low': {
                  backgroundColor: '#ffe4e8 !important',
                },

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
