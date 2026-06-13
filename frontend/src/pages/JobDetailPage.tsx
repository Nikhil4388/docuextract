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

const statusColor = (s: string): 'default' | 'info' | 'success' | 'error' | 'warning' => {
  const map: Record<string, any> = { pending: 'default', processing: 'info', completed: 'success', failed: 'error', cancelled: 'warning' };
  return map[s] ?? 'default';
};

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: job, refetch: refetchJob } = useQuery<ExtractionJob>({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then((r) => r.data),
    refetchInterval: (q) => ['pending', 'processing'].includes(q.state.data?.status ?? '') ? 2000 : false,
  });

  const { data: results, isLoading: resultsLoading, refetch: refetchResults } = useQuery<ExtractionResult[]>({
    queryKey: ['job-results', jobId, search],
    queryFn: () => api.get(`/jobs/${jobId}/results`, { params: { search: search || undefined, limit: 1000 } }).then((r) => r.data),
    enabled: job?.status === 'completed' || job?.status === 'failed',
  });

  const handleExport = async () => {
    const res = await api.get(`/jobs/${jobId}/export/excel`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job?.name ?? 'results'}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build dynamic columns from first result
  const dynamicColumns: GridColDef[] = React.useMemo(() => {
    if (!results?.length) return [];
    const firstRow = results[0];
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
        field: 'processing_time_ms',
        headerName: 'Time (ms)',
        width: 100,
        valueFormatter: (v: number) => v ? `${v}ms` : '—',
      },
    ];
  }, [results]);

  const rows = results?.map((r) => ({ id: r.id, ...r })) ?? [];

  if (!job) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={() => navigate('/jobs')}><ArrowBack /></IconButton>
        <Typography variant="h5" fontWeight={700}>{job.name}</Typography>
        <Chip label={job.status} color={statusColor(job.status)} size="small" />
        <Tooltip title="Refresh">
          <IconButton onClick={() => { refetchJob(); refetchResults(); }}><Refresh /></IconButton>
        </Tooltip>
      </Box>

      {/* Progress */}
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

      {job.error_message && (
        <Alert severity="error" sx={{ mb: 3 }}>{job.error_message}</Alert>
      )}

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          ['Total Files', job.total_files],
          ['Processed', job.processed_files],
          ['Failed', job.failed_files],
          ['Started', job.started_at ? new Date(job.started_at).toLocaleTimeString() : '—'],
          ['Completed', job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : '—'],
        ].map(([label, value]) => (
          <Paper key={label as string} sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 120, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
            <Typography fontWeight={700}>{value as string}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Results Table */}
      {(job.status === 'completed' || job.status === 'failed') && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>Extracted Data</Typography>
            <TextField
              size="small"
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
              sx={{ width: 220 }}
            />
            {job.status === 'completed' && (
              <Button variant="contained" startIcon={<Download />} onClick={handleExport} sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}>
                Export Excel
              </Button>
            )}
          </Box>
          <DataGrid
            rows={rows}
            columns={dynamicColumns}
            loading={resultsLoading}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            autoHeight
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8f9fa' },
            }}
          />
        </Paper>
      )}
    </Box>
  );
}
