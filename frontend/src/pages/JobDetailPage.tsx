import React, { useState } from 'react';
import {
  Box, Button, Paper, Typography, LinearProgress,
  Alert, CircularProgress, TextField, InputAdornment,
  IconButton, Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Download, Refresh, Search, ArrowBack,
  CheckCircleOutline, HighlightOff, Description,
  CalendarToday, AccessTime, DoneAll,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ExtractionJob, ExtractionResult } from '../types';

const STATUS_META: Record<string, { label: string; dot: string }> = {
  pending:    { label: 'Pending',    dot: '#9ca3af' },
  processing: { label: 'Processing', dot: '#3b82f6' },
  completed:  { label: 'Complete',   dot: '#10b981' },
  partial:    { label: 'Partial',    dot: '#f59e0b' },
  failed:     { label: 'Failed',     dot: '#ef4444' },
  cancelled:  { label: 'Cancelled',  dot: '#9ca3af' },
};

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate  = useNavigate();
  const [search, setSearch]       = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: job, refetch: refetchJob } = useQuery<ExtractionJob>({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then((r) => r.data),
    refetchInterval: (q) =>
      ['pending', 'processing'].includes(q.state.data?.status ?? '') ? 3000 : false,
  });

  const jobDone = ['completed', 'failed', 'partial'].includes(job?.status ?? '');

  const {
    data: results,
    isLoading: resultsLoading,
    isError: resultsError,
    refetch: refetchResults,
  } = useQuery<ExtractionResult[]>({
    queryKey: ['job-results', jobId, search, job?.status],
    queryFn: () =>
      api.get(`/jobs/${jobId}/results`, { params: { search: search || undefined, limit: 1000 } })
        .then((r) => r.data),
    enabled: jobDone,
    retry: 3,
    refetchInterval: (q) =>
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
    const vals = Object.values(r.confidence_scores).filter((v) => typeof v === 'number') as number[];
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
  };

  /* ── columns ─────────────────────────────────────────────────────────── */
  const dynamicColumns: GridColDef[] = React.useMemo(() => {
    if (!results?.length) return [];
    const firstRow =
      results.find((r) => r.extracted_data && Object.keys(r.extracted_data).length > 0)
      ?? results[0];
    const extractedKeys = Object.keys(firstRow.extracted_data ?? {});

    return [
      {
        field: 'file_name',
        headerName: 'File',
        flex: 1.5,
        minWidth: 200,
        renderCell: ({ value }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#818cf8', flexShrink: 0 }} />
            <Typography fontSize={13} fontWeight={500} noWrap sx={{ color: '#1e1b4b' }}>
              {value}
            </Typography>
          </Box>
        ),
      },

      ...extractedKeys.map((key): GridColDef => ({
        field: key,
        headerName: key,
        flex: 1,
        minWidth: 140,
        valueGetter: (_, row) => row.extracted_data?.[key] ?? '—',
        cellClassName: (params) => {
          const score = params.row.confidence_scores?.[key];
          return score == null || score < 0.85 ? 'low-conf-cell' : '';
        },
      })),

      {
        field: '_confidence',
        headerName: 'Confidence',
        width: 140,
        valueGetter: (_, row) => overallConfidence(row),
        renderCell: ({ row }) => {
          const pct = overallConfidence(row);
          if (pct === null)
            return <Typography fontSize={12} color="text.secondary">—</Typography>;
          const [color, trackColor, badgeBg] =
            pct >= 95
              ? ['#10b981', '#d1fae5', '#ecfdf5']
              : pct >= 85
              ? ['#f59e0b', '#fef9c3', '#fffbeb']
              : ['#ef4444', '#fee2e2', '#fef2f2'];
          const r2 = 13, cx = 17, cy = 17, stroke = 3.5;
          const circ = 2 * Math.PI * r2;
          const dash  = (pct / 100) * circ;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <svg width={34} height={34} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                <circle cx={cx} cy={cy} r={r2} fill="none" stroke={trackColor} strokeWidth={stroke} />
                <circle cx={cx} cy={cy} r={r2} fill="none" stroke={color} strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
              </svg>
              <Box sx={{ px: 0.9, py: 0.2, borderRadius: 5, bgcolor: badgeBg, border: `1px solid ${color}33` }}>
                <Typography fontSize={12} fontWeight={700} color={color}>{pct}%</Typography>
              </Box>
            </Box>
          );
        },
      },

      {
        field: 'processing_time_ms',
        headerName: 'Time',
        width: 85,
        renderCell: ({ value }) => (
          <Typography fontSize={12} color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {value ? `${value}ms` : '—'}
          </Typography>
        ),
      },
    ];
  }, [results]);

  const rows = results?.map((r) => ({ id: r.id, ...r })) ?? [];
  const statusMeta = STATUS_META[job?.status ?? ''] ?? STATUS_META.pending;

  if (!job)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
      </Box>
    );

  return (
    <Box>

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        borderRadius: 3,
        p: 2.5,
        mb: 3,
        boxShadow: '0 4px 24px rgba(79,70,229,0.22)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}>
        <IconButton onClick={() => navigate('/jobs')} sx={{
          color: 'white',
          bgcolor: 'rgba(255,255,255,0.15)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
        }}>
          <ArrowBack fontSize="small" />
        </IconButton>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} color="white" noWrap sx={{ letterSpacing: '-0.01em' }}>
            {job.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: statusMeta.dot }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              {statusMeta.label}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={refreshing} sx={{
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.15)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
            }}>
              {refreshing
                ? <CircularProgress size={16} sx={{ color: 'white' }} />
                : <Refresh fontSize="small" />}
            </IconButton>
          </Tooltip>

          {(job.status === 'completed' || job.status === 'partial') && (
            <Button
              size="small"
              variant="contained"
              startIcon={<Download fontSize="small" />}
              onClick={handleExport}
              sx={{
                bgcolor: 'white', color: '#6366f1', fontWeight: 700, borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.92)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s ease',
              }}
            >
              Export Excel
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1.5, mb: 3 }}>
        {([
          { label: 'Total Files', value: job.total_files,       Icon: Description,        color: '#6366f1', bg: '#eef2ff' },
          { label: 'Processed',   value: job.processed_files,    Icon: CheckCircleOutline, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Failed',      value: job.failed_files,
            Icon: HighlightOff,
            color: job.failed_files > 0 ? '#ef4444' : '#9ca3af',
            bg:    job.failed_files > 0 ? '#fef2f2' : '#f9fafb' },
          { label: 'Date',        value: new Date(job.created_at).toLocaleDateString(), Icon: CalendarToday, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Started',     value: job.started_at   ? new Date(job.started_at).toLocaleTimeString()   : '—', Icon: AccessTime, color: '#0ea5e9', bg: '#f0f9ff' },
          { label: 'Completed',   value: job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : '—', Icon: DoneAll,    color: '#10b981', bg: '#ecfdf5' },
        ] as const).map(({ label, value, Icon, color, bg }) => (
          <Paper key={label} sx={{
            p: 1.75, borderRadius: 2.5, textAlign: 'center',
            border: '1px solid', borderColor: `${color}22`,
            boxShadow: 'none',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 18px ${color}18` },
          }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: '50%', bgcolor: bg, mb: 0.75,
            }}>
              <Icon sx={{ fontSize: 17, color }} />
            </Box>
            <Typography display="block" color="text.secondary" fontWeight={600}
              sx={{ fontSize: '0.67rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {label}
            </Typography>
            <Typography fontWeight={800} sx={{ color, fontSize: '0.95rem', lineHeight: 1.3, mt: 0.25 }}>
              {String(value)}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* ── Processing progress ───────────────────────────────────────────── */}
      {(job.status === 'processing' || job.status === 'pending') && (
        <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3, border: '1px solid #e0e7ff', boxShadow: 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CircularProgress size={14} thickness={5} sx={{ color: '#6366f1' }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
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
              height: 8, borderRadius: 4, bgcolor: '#e0e7ff',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: 4,
              },
            }}
          />
          {job.total_files > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
              {job.processed_files} of {job.total_files} files complete
            </Typography>
          )}
        </Paper>
      )}

      {job.error_message && job.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{job.error_message}</Alert>
      )}

      {resultsError && jobDone && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} action={
          <Button color="inherit" size="small" onClick={() => refetchResults()}>Retry</Button>
        }>
          Could not load extracted data. Check your connection or try again.
        </Alert>
      )}

      {/* ── Results table ────────────────────────────────────────────────── */}
      {jobDone && (
        <Paper sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 2px 20px rgba(79,70,229,0.08)',
          border: '1px solid rgba(99,102,241,0.1)',
        }}>
          {/* Table header */}
          <Box sx={{
            px: 2.5, py: 2,
            background: 'linear-gradient(135deg, #fafaff 0%, #f5f3ff 100%)',
            borderBottom: '1px solid rgba(99,102,241,0.1)',
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1e1b4b' }}>
                Extracted Data
              </Typography>
              {rows.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {rows.length} {rows.length === 1 ? 'record' : 'records'}
                  {' · '}
                  <Box component="span" sx={{ color: '#e11d48', fontWeight: 600 }}>red cells</Box>
                  {' '}need manual review
                </Typography>
              )}
            </Box>
            <TextField
              size="small"
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" sx={{ color: '#9ca3af' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, bgcolor: 'white', fontSize: 13 },
              }}
              sx={{ width: 210 }}
            />
          </Box>

          {/* DataGrid */}
          <DataGrid
            rows={rows}
            columns={dynamicColumns}
            loading={resultsLoading}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            autoHeight
            disableRowSelectionOnClick
            rowHeight={48}
            getRowClassName={(p) => p.indexRelativeToCurrentPage % 2 !== 0 ? 'stripe-row' : ''}
            sx={{
              border: 'none',
              fontFamily: 'inherit',

              /* ── Column headers — purple gradient ── */
              '& .MuiDataGrid-columnHeaders': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                minHeight: '46px !important',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                color: 'white',
                fontWeight: 700,
                fontSize: '0.72rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              },
              '& .MuiDataGrid-columnSeparator': { color: 'rgba(255,255,255,0.15)' },
              '& .MuiDataGrid-sortIcon': { color: 'rgba(255,255,255,0.75)' },
              '& .MuiDataGrid-menuIconButton': { color: 'rgba(255,255,255,0.75)', '&:hover': { color: 'white' } },
              '& .MuiDataGrid-iconButtonContainer .MuiIconButton-root': { color: 'white' },

              /* ── Rows ── */
              '& .MuiDataGrid-row': {
                transition: 'background-color 0.12s ease',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(99,102,241,0.05) !important',
              },
              '& .stripe-row': {
                backgroundColor: 'rgba(99,102,241,0.02)',
              },

              /* ── Cells ── */
              '& .MuiDataGrid-cell': {
                borderColor: 'rgba(0,0,0,0.04)',
                fontSize: '0.83rem',
                color: '#374151',
              },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                outline: '2px solid #818cf8',
                outlineOffset: '-2px',
              },

              /* ── Low-confidence red cells ── */
              '& .low-conf-cell': {
                backgroundColor: '#fff1f2 !important',
                borderLeft: '3px solid #f43f5e !important',
                color: '#e11d48 !important',
                fontWeight: '600 !important',
              },
              '& .MuiDataGrid-row:hover .low-conf-cell': {
                backgroundColor: '#ffe4e8 !important',
              },

              /* ── Footer ── */
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid rgba(0,0,0,0.05)',
                backgroundColor: '#fafaff',
                minHeight: 44,
              },
              '& .MuiTablePagination-root': { color: '#6b7280', fontSize: '0.8rem' },
              '& .MuiTablePagination-selectIcon': { color: '#6366f1' },
            }}
          />
        </Paper>
      )}
    </Box>
  );
}
