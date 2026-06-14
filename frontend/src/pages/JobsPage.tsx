import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, Chip, TextField,
  InputAdornment, MenuItem, Select, FormControl,
  Skeleton, Avatar, IconButton, Tooltip,
} from '@mui/material';
import { Add, Search, Refresh, ArrowForward } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ExtractionJob } from '../types';

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'completed', 'failed', 'cancelled'];

function statusColor(s: string): 'default' | 'info' | 'success' | 'error' | 'warning' {
  const map: Record<string, any> = { pending: 'default', processing: 'info', completed: 'success', failed: 'error', cancelled: 'warning' };
  return map[s] ?? 'default';
}

export default function JobsPage() {
  const navigate = useNavigate();
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: jobs, isLoading, refetch } = useQuery<ExtractionJob[]>({
    queryKey: ['jobs'],
    queryFn:  () => api.get('/jobs/').then((r) => r.data),
    refetchInterval: 5000,
  });

  const filtered = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((j) => {
      const matchStatus = statusFilter === 'all' || j.status === statusFilter;
      const matchSearch = !search || j.name.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [jobs, search, statusFilter]);

  const counts = useMemo(() => {
    if (!jobs) return {};
    return STATUS_OPTIONS.reduce((acc, s) => {
      acc[s] = s === 'all' ? jobs.length : jobs.filter((j) => j.status === s).length;
      return acc;
    }, {} as Record<string, number>);
  }, [jobs]);

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>Jobs</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={() => refetch()} size="small"><Refresh /></IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/jobs/new')} sx={{ borderRadius: 2 }}>
          New Job
        </Button>
      </Box>

      {/* ── Filters ── */}
      <Paper sx={{ p: 2, mb: 2.5, borderRadius: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search jobs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ width: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} displayEmpty>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s === 'all' ? `All statuses (${counts['all'] ?? 0})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s] ?? 0})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {(search || statusFilter !== 'all') && (
          <Button size="small" onClick={() => { setSearch(''); setStatusFilter('all'); }} sx={{ color: '#6b7280', fontSize: 12 }}>
            Clear filters
          </Button>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {filtered.length} job{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Paper>

      {/* ── Job list ── */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ px: 3, py: 2, borderBottom: '1px solid #f5f5f5', display: 'flex', gap: 2, alignItems: 'center' }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}><Skeleton width="40%" /><Skeleton width="25%" /></Box>
                <Skeleton width={72} height={24} />
              </Box>
            ))
          : filtered.length === 0
          ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography fontSize={40} mb={1}>🔍</Typography>
              <Typography fontWeight={600} mb={0.5}>No jobs found</Typography>
              <Typography color="text.secondary" fontSize={14} mb={2}>
                {jobs?.length === 0 ? 'Create your first extraction job to get started.' : 'Try adjusting your search or filters.'}
              </Typography>
              {jobs?.length === 0 && (
                <Button variant="outlined" onClick={() => navigate('/jobs/new')} startIcon={<Add />}>
                  New Extraction Job
                </Button>
              )}
            </Box>
          )
          : filtered.map((job, idx) => (
              <Box
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                sx={{
                  px: 3, py: 2,
                  borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                  '&:hover': { bgcolor: '#fafafa' }, transition: 'background 0.12s',
                }}
              >
                <Avatar sx={{ bgcolor: '#667eea18', color: '#667eea', fontWeight: 700, width: 42, height: 42 }}>
                  {job.name?.[0]?.toUpperCase()}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} noWrap>{job.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created {new Date(job.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {job.total_files > 0 && ` · ${job.total_files} file${job.total_files > 1 ? 's' : ''}`}
                    {job.status === 'completed' && job.processed_files > 0 && ` · ${job.processed_files} extracted`}
                  </Typography>
                </Box>

                {job.status === 'processing' && job.total_files > 0 && (
                  <Box sx={{ width: 100, mr: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.3}>
                      {job.processed_files}/{job.total_files}
                    </Typography>
                    <Box sx={{ height: 4, bgcolor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${(job.processed_files / job.total_files) * 100}%`, bgcolor: '#3b82f6', borderRadius: 2 }} />
                    </Box>
                  </Box>
                )}

                <Chip label={job.status} color={statusColor(job.status)} size="small" sx={{ minWidth: 80, fontSize: 11 }} />
                <ArrowForward sx={{ fontSize: 16, color: '#d1d5db', flexShrink: 0 }} />
              </Box>
            ))
        }
      </Paper>
    </Box>
  );
}
