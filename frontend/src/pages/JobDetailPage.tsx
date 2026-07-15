import React, { useState } from 'react';
import {
  Box, Button, Paper, Typography, Chip, LinearProgress,
  Alert, CircularProgress, TextField, InputAdornment,
  IconButton, Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Download, Refresh, Search, ArrowBack } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ExtractionJob, ExtractionResult } from '../types';

/* ── Status config ───────────────────────────────────────────────────────── */
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#6b7280', bg: '#f3f4f6' },
  processing: { label: 'Processing', color: '#2563eb', bg: '#dbeafe' },
  completed:  { label: 'Complete',   color: '#059669', bg: '#d1fae5' },
  partial:    { label: 'Partial',    color: '#d97706', bg: '#fef9c3' },
  failed:     { label: 'Failed',     color: '#dc2626', bg: '#fee2e2' },
  cancelled:  { label: 'Cancelled',  color: '#6b7280', bg: '#f3f4f6' },
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
      enabled: jobDone,
      retry:   3,
      refetchInterval: q =>
        jobDone && !q.state.error && (q.state.data?.length ?? 0) === 0 ? 2000 : false,
    });

  /* ── Actions ────────────────────────────────────────────────────────── */
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchJob();
    if (jobDone) await refetchResults();
    setRefreshing(false);
  };

  const handleExport = async () => {
    const res = await api.get(`/jobs/${jobId}/export/excel`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = `${job?.name ?? 'results'}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Helpers ────────────────────────────────────────────────────────── */
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
          const r = 12, cx = 16, cy = 16, sw = 3;
          const c = 2 * Math.PI * r;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <svg width={32} height={32} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={bg}  strokeWidth={sw} />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={fg}  strokeWidth={sw}
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
  const st   = STATUS[job?.status ?? ''] ?? STATUS.pending;

  if (!job) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress sx={{ color: '#6366f1' }} />
    </Box>
  );

  return (
    <Box sx={{ maxWidth: '100%' }}>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <IconButton size="small" onClick={() => navigate('/jobs')}
          sx={{ color: '#6366f1', bgcolor: '#eef2ff', '&:hover': { bgcolor: '#e0e7ff' } }}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Typography fontWeight={800} fontSize="1.1rem" color="#111827" noWrap>
          {job.name}
        </Typography>
      </Box>

      {/* ── Stats + Actions row ──────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'stretch' }}>

        {/* Stat cards */}
        {([
          { label: 'Total',     value: String(job.total_files),     c: '#6366f1' },
          { label: 'Processed', value: String(job.processed_files), c: '#059669' },
          { label: 'Failed',    value: String(job.failed_files),    c: job.failed_files > 0 ? '#dc2626' : '#9ca3af' },
          { label: 'Date',      value: new Date(job.created_at).toLocaleDateString(), c: '#6366f1' },
          { label: 'Started',   value: job.started_at   ? new Date(job.started_at).toLocaleTimeString()   : '—', c: '#2563eb' },
          { label: 'Finished',  value: job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : '—', c: '#059669' },
        ] as const).map(({ label, value, c }) => (
          <Box key={label} sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            px: 2, py: 1.5, borderRadius: 2.5,
            bgcolor: 'white',
            border: '1px solid #ede9fe',
            minWidth: 88, textAlign: 'center',
            boxShadow: '0 1px 6px rgba(99,102,241,0.07)',
            position: 'relative', overflow: 'hidden',
            transition: 'all 0.15s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 18px ${c}22` },
            '&::after': {
              content: '""', position: 'absolute',
              bottom: 0, left: '20%', right: '20%', height: 2,
              bgcolor: c, borderRadius: 1, opacity: 0.6,
            },
          }}>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c4b5fd', mb: 0.5 }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: c, lineHeight: 1 }}>
              {value}
            </Typography>
          </Box>
        ))}

        {/* Divider */}
        <Box sx={{ width: '1px', bgcolor: '#e5e7eb', mx: 0.5, alignSelf: 'stretch', flexShrink: 0 }} />

        {/* Status pill */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.75,
          px: 1.75, py: 0, borderRadius: 2.5,
          bgcolor: st.bg,
          border: `1px solid ${st.color}33`,
          boxShadow: `0 1px 6px ${st.color}18`,
        }}>
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%', bgcolor: st.color, flexShrink: 0,
            boxShadow: `0 0 0 3px ${st.color}30`,
          }} />
          <Typography fontWeight={700} fontSize="0.82rem" color={st.color}>{st.label}</Typography>
        </Box>

        {/* Refresh */}
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={refreshing} sx={{
            bgcolor: 'white',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            borderRadius: 2.5,
            '&:hover': { bgcolor: '#f5f3ff', borderColor: '#a5b4fc' },
            transition: 'all 0.15s',
          }}>
            {refreshing
              ? <CircularProgress size={16} sx={{ color: '#6366f1' }} />
              : <Refresh sx={{ color: '#6366f1' }} fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Export button */}
        {(job.status === 'completed' || job.status === 'partial') && (
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.875rem',
              borderRadius: 2.5,
              px: 2.5,
              boxShadow: '0 4px 16px rgba(99,102,241,0.45)',
              letterSpacing: '0.01em',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 6px 24px rgba(99,102,241,0.55)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Export Excel
          </Button>
        )}
      </Box>

      {/* ── Processing progress ───────────────────────────────────────── */}
      {(job.status === 'processing' || job.status === 'pending') && (
        <Paper sx={{ p: 2.5, borderRadius: 2.5, mb: 3, border: '1px solid #e0e7ff', boxShadow: 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CircularProgress size={13} thickness={5} sx={{ color: '#6366f1' }} />
            <Typography variant="body2" color="text.secondary">
              {job.status_message
                || (job.status === 'pending' ? 'Waiting in queue…'
                  : `Processing ${job.processed_files} of ${job.total_files} files…`)}
            </Typography>
          </Box>
          <LinearProgress
            variant={job.total_files > 0 ? 'determinate' : 'indeterminate'}
            value={job.total_files > 0 ? (job.processed_files / job.total_files) * 100 : undefined}
            sx={{
              height: 6, borderRadius: 3, bgcolor: '#e0e7ff',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 3 },
            }}
          />
          {job.total_files > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {job.processed_files} / {job.total_files} files complete
            </Typography>
          )}
        </Paper>
      )}

      {job.error_message && job.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{job.error_message}</Alert>
      )}
      {resultsError && jobDone && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}
          action={<Button color="inherit" size="small" onClick={() => refetchResults()}>Retry</Button>}>
          Could not load extracted data.
        </Alert>
      )}

      {/* ── Results table ─────────────────────────────────────────────── */}
      {jobDone && (
        <Paper sx={{ borderRadius: 2.5, overflow: 'hidden', boxShadow: '0 1px 12px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' }}>

          {/* Table toolbar */}
          <Box sx={{
            px: 2.5, py: 1.75,
            display: 'flex', alignItems: 'center', gap: 2,
            borderBottom: '1px solid #f0f0f0',
            bgcolor: 'white',
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={700} fontSize="0.95rem" color="#111827">
                Extracted Data
              </Typography>
              {rows.length > 0 && (
                <Typography variant="caption" color="#9ca3af">
                  {rows.length} record{rows.length !== 1 ? 's' : ''}
                  {' · '}
                  <Box component="span" sx={{ color: '#e11d48', fontWeight: 600 }}>red cells</Box>
                  {' = needs review'}
                </Typography>
              )}
            </Box>
            <TextField size="small" placeholder="Search…" value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#d1d5db' }} /></InputAdornment>,
                sx: { borderRadius: 2, bgcolor: '#fafafa', fontSize: 13, '& fieldset': { borderColor: '#e5e7eb' } },
              }}
              sx={{ width: 200 }} />
          </Box>

          {/* Grid */}
          <DataGrid
            rows={rows}
            columns={dynamicColumns}
            loading={resultsLoading}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            autoHeight
            disableRowSelectionOnClick
            rowHeight={46}
            getRowClassName={p => p.indexRelativeToCurrentPage % 2 !== 0 ? 'row-stripe' : ''}
            sx={{
              border: 'none',
              fontFamily: 'inherit',
              fontSize: '0.83rem',

              /* ── Header ── */
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: '#1e1b4b !important',
                background: '#1e1b4b !important',
                minHeight: '42px !important',
              },
              '& .MuiDataGrid-columnHeader': {
                bgcolor: '#1e1b4b !important',
                background: '#1e1b4b !important',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                color: 'rgba(255,255,255,0.85) !important',
                fontWeight: 700,
                fontSize: '0.7rem',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
              },
              '& .MuiDataGrid-columnSeparator': { color: 'rgba(255,255,255,0.12) !important' },
              '& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton': {
                color: 'rgba(255,255,255,0.6) !important',
              },
              '& .MuiDataGrid-iconButtonContainer .MuiIconButton-root': {
                color: 'rgba(255,255,255,0.6) !important',
              },

              /* ── Rows ── */
              '& .MuiDataGrid-row': {
                transition: 'background 0.1s',
                bgcolor: 'white',
              },
              '& .row-stripe': { bgcolor: '#fafafa' },
              '& .MuiDataGrid-row:hover': { bgcolor: '#f0f0ff !important' },

              /* ── Cells ── */
              '& .MuiDataGrid-cell': {
                borderColor: '#f3f4f6',
                color: '#374151',
                py: 0,
              },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                outline: '2px solid #818cf8',
                outlineOffset: -2,
              },

              /* ── Low confidence ── */
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
                borderTop: '1px solid #f3f4f6',
                bgcolor: '#fafafa',
                minHeight: 44,
              },
              '& .MuiTablePagination-root': { fontSize: '0.8rem', color: '#6b7280' },
            }}
          />
        </Paper>
      )}
    </Box>
  );
}
