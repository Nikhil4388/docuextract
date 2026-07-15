import React, { useState } from 'react';
import {
  Box, Button, Paper, Typography, Chip, LinearProgress,
  Alert, CircularProgress, TextField, InputAdornment,
  IconButton, Tooltip, Popover,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Download, Refresh, Search, ArrowBack } from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ExtractionJob, ExtractionResult } from '../types';

const statusColor = (s: string): 'default' | 'info' | 'success' | 'error' | 'warning' => {
  const map: Record<string, any> = {
    pending: 'default', processing: 'info', completed: 'success',
    partial: 'warning', failed: 'error', cancelled: 'warning',
  };
  return map[s] ?? 'default';
};

interface ConfidencePopoverState {
  anchor: HTMLElement | null;
  scores: Record<string, number>;
  fileName: string;
}

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [confPop, setConfPop] = useState<ConfidencePopoverState>({ anchor: null, scores: {}, fileName: '' });

  const { data: job, refetch: refetchJob } = useQuery<ExtractionJob>({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then((r) => r.data),
    refetchInterval: (q) => ['pending', 'processing'].includes(q.state.data?.status ?? '') ? 3000 : false,
  });

  const jobDone = ['completed', 'failed', 'partial'].includes(job?.status ?? '');
  const { data: results, isLoading: resultsLoading, refetch: refetchResults } = useQuery<ExtractionResult[]>({
    queryKey: ['job-results', jobId, search, job?.status],
    queryFn: () => api.get(`/jobs/${jobId}/results`, { params: { search: search || undefined, limit: 1000 } }).then((r) => r.data),
    enabled: jobDone,
    refetchInterval: (q) => (jobDone && (q.state.data?.length ?? 0) === 0) ? 2000 : false,
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
    const a = document.createElement('a');
    a.href = url; a.download = `${job?.name ?? 'results'}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  const overallConfidence = (r: ExtractionResult): number | null => {
    const scores = r.confidence_scores;
    if (!scores) return null;
    const vals = Object.values(scores).filter((v) => typeof v === 'number') as number[];
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
  };

  const dynamicColumns: GridColDef[] = React.useMemo(() => {
    if (!results?.length) return [];
    const firstRow = results.find(r => r.extracted_data && Object.keys(r.extracted_data).length > 0) ?? results[0];
    const extractedKeys = Object.keys(firstRow.extracted_data ?? {});
    return [
      { field: 'file_name', headerName: 'File', flex: 1.5, minWidth: 200 },
      ...extractedKeys.map((key): GridColDef => ({
        field: key,
        headerName: key,
        flex: 1,
        minWidth: 140,
        valueGetter: (_, row) => row.extracted_data?.[key] ?? '—',
      })),
      {
        field: '_confidence',
        headerName: 'Confidence',
        width: 130,
        valueGetter: (_, row) => overallConfidence(row),
        renderCell: ({ row }) => {
          const pct = overallConfidence(row);
          if (pct === null) return <Typography fontSize={12} color="text.secondary">—</Typography>;
          const color = pct >= 95 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626';
          const r2 = 16, cx = 20, cy = 20, stroke = 4;
          const circumference = 2 * Math.PI * r2;
          const dash = (pct / 100) * circumference;
          const needsReview = pct < 100;
          return (
            <Box
              onClick={(e) => {
                e.stopPropagation();
                if (row.confidence_scores) {
                  setConfPop({ anchor: e.currentTarget as HTMLElement, scores: row.confidence_scores, fileName: row.file_name });
                }
              }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.8,
                cursor: needsReview ? 'pointer' : 'default',
                borderRadius: 2,
                px: needsReview ? 0.8 : 0,
                py: 0.3,
                '&:hover': needsReview ? {
                  bgcolor: color + '15',
                  '& .verify-hint': { opacity: 1 },
                } : {},
                transition: 'background 0.15s',
              }}
            >
              <svg width={40} height={40} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                <circle cx={cx} cy={cy} r={r2} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
                <circle cx={cx} cy={cy} r={r2} fill="none" stroke={color} strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
              </svg>
              <Box>
                <Typography fontSize={13} fontWeight={700} color={color} lineHeight={1.2}>{pct}%</Typography>
                {needsReview && (
                  <Typography
                    className="verify-hint"
                    fontSize={9} fontWeight={600}
                    sx={{ color: color, opacity: 0.6, transition: 'opacity 0.15s', lineHeight: 1 }}
                  >
                    click to review
                  </Typography>
                )}
              </Box>
            </Box>
          );
        },
      },
      {
        field: 'processing_time_ms',
        headerName: 'Time (ms)',
        width: 100,
        valueFormatter: (v: number) => v ? `${v}ms` : '—',
      },
    ];
  }, [results]);

  const rows = results?.map((r) => ({ id: r.id, ...r })) ?? [];

  if (!job) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  // Fields that need verification (below 97%)
  const flaggedFields = Object.entries(confPop.scores)
    .filter(([, v]) => typeof v === 'number' && (v as number) < 0.97)
    .sort(([, a], [, b]) => (a as number) - (b as number));
  const goodFields = Object.entries(confPop.scores)
    .filter(([, v]) => typeof v === 'number' && (v as number) >= 0.97)
    .sort(([, a], [, b]) => (b as number) - (a as number));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={() => navigate('/jobs')}><ArrowBack /></IconButton>
        <Typography variant="h5" fontWeight={700}>{job.name}</Typography>
        <Chip label={job.status} color={statusColor(job.status)} size="small" />
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <CircularProgress size={18} /> : <Refresh />}
          </IconButton>
        </Tooltip>
      </Box>

      {(job.status === 'processing' || job.status === 'pending') && (
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CircularProgress size={14} thickness={5} />
            <Typography variant="body2" color="text.secondary">
              {job.status_message || (job.status === 'pending' ? 'Waiting in queue…' : `Processing ${job.processed_files} of ${job.total_files} files…`)}
            </Typography>
          </Box>
          <LinearProgress
            variant={job.total_files > 0 ? 'determinate' : 'indeterminate'}
            value={job.total_files > 0 ? (job.processed_files / job.total_files) * 100 : undefined}
            sx={{ height: 8, borderRadius: 4 }}
          />
          {job.total_files > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {job.processed_files} of {job.total_files} files
            </Typography>
          )}
        </Paper>
      )}

      {job.error_message && job.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 3 }}>{job.error_message}</Alert>
      )}

      {/* Stats + Export */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          ['Total Files', job.total_files],
          ['Processed', job.processed_files],
          ['Failed', job.failed_files],
          ['Date', new Date(job.created_at).toLocaleDateString()],
          ['Started', job.started_at ? new Date(job.started_at).toLocaleTimeString() : '—'],
          ['Completed', job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : '—'],
        ].map(([label, value]) => (
          <Paper key={label as string} sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 120, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
            <Typography fontWeight={700}>{value as string}</Typography>
          </Paper>
        ))}
        {(job.status === 'completed' || job.status === 'partial') && (
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            sx={{
              borderRadius: 2, whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              px: 2.5, py: 1.5, fontWeight: 700,
              '&:hover': { opacity: 0.9, transform: 'translateY(-1px)' },
              transition: 'all 0.2s ease',
            }}
          >
            Export Excel
          </Button>
        )}
      </Box>

      {/* Results Table */}
      {jobDone && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>Extracted Data</Typography>
            <TextField
              size="small" placeholder="Search files…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
              sx={{ width: 220 }}
            />
          </Box>
          <DataGrid
            rows={rows} columns={dynamicColumns}
            loading={resultsLoading}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            autoHeight disableRowSelectionOnClick
            sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8f4ee' } }}
          />
        </Paper>
      )}

      {/* CONFIDENCE POPOVER */}
      <Popover
        open={Boolean(confPop.anchor)}
        anchorEl={confPop.anchor}
        onClose={() => setConfPop(p => ({ ...p, anchor: null }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            borderRadius: 3, mt: 1, minWidth: 300, maxWidth: 380,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            border: '1px solid #f1f5f9',
            overflow: 'hidden',
          }
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 14 }}>
            Confidence Review
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, mt: 0.2 }} noWrap>
            {confPop.fileName}
          </Typography>
        </Box>

        {/* Needs Verification */}
        {flaggedFields.length > 0 && (
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b', flexShrink: 0 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#92400e' }}>
                Needs Verification ({flaggedFields.length})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {flaggedFields.map(([field, score]) => {
                const pct = Math.round((score as number) * 100);
                const color = pct >= 85 ? '#d97706' : '#dc2626';
                return (
                  <Box key={field} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    px: 1.5, py: 1, borderRadius: 2,
                    bgcolor: color + '0f', border: `1px solid ${color}25`,
                  }}>
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{field}</Typography>
                      <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
                        {pct < 85 ? 'Low confidence — manual check recommended' : 'Moderate — please verify'}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color, flexShrink: 0, ml: 1 }}>
                      {pct}%
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Good fields */}
        {goodFields.length > 0 && (
          <Box sx={{ px: 2.5, py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', flexShrink: 0 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#065f46' }}>
                High Confidence ({goodFields.length})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.7 }}>
              {goodFields.map(([field, score]) => (
                <Box key={field} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>{field}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                    {Math.round((score as number) * 100)}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {flaggedFields.length === 0 && (
          <Box sx={{ px: 2.5, py: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 28, mb: 1 }}>✓</Typography>
            <Typography sx={{ fontWeight: 700, color: '#065f46', fontSize: 14 }}>All fields verified</Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: 12, mt: 0.5 }}>No manual review needed</Typography>
          </Box>
        )}
      </Popover>
    </Box>
  );
}
