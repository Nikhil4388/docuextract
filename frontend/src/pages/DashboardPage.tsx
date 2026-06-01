import React from 'react';
import {
  Box, Grid, Paper, Typography, Button, Chip,
  LinearProgress, Skeleton,
} from '@mui/material';
import { Add, Description, CheckCircle, Error, Pending } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ExtractionJob } from '../types';

function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3, borderLeft: `4px solid ${color}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
        </Box>
        <Box sx={{ color, opacity: 0.7 }}>{icon}</Box>
      </Box>
    </Paper>
  );
}

function statusColor(status: string) {
  const map: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
    pending: 'default', processing: 'info', completed: 'success', failed: 'error', cancelled: 'warning',
  };
  return map[status] ?? 'default';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useQuery<ExtractionJob[]>({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs/').then((r) => r.data),
    refetchInterval: 5000,
  });

  const stats = React.useMemo(() => {
    if (!jobs) return { total: 0, completed: 0, processing: 0, failed: 0 };
    return {
      total: jobs.length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
    };
  }, [jobs]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/jobs/new')}
          sx={{ borderRadius: 2 }}
        >
          New Extraction Job
        </Button>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Jobs" value={stats.total} icon={<Description sx={{ fontSize: 40 }} />} color="#667eea" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Completed" value={stats.completed} icon={<CheckCircle sx={{ fontSize: 40 }} />} color="#4caf50" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Processing" value={stats.processing} icon={<Pending sx={{ fontSize: 40 }} />} color="#2196f3" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Failed" value={stats.failed} icon={<Error sx={{ fontSize: 40 }} />} color="#f44336" />
        </Grid>
      </Grid>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid #eee' }}>
          <Typography variant="h6" fontWeight={600}>Recent Jobs</Typography>
        </Box>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ px: 3, py: 2 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="30%" />
              </Box>
            ))
          : jobs?.slice(0, 10).map((job) => (
              <Box
                key={job.id}
                sx={{ px: 3, py: 2, borderBottom: '1px solid #f0f0f0', cursor: 'pointer', '&:hover': { bgcolor: '#fafafa' } }}
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography fontWeight={600}>{job.name}</Typography>
                  <Chip label={job.status} color={statusColor(job.status)} size="small" />
                </Box>
                {job.status === 'processing' && job.total_files > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(job.processed_files / job.total_files) * 100}
                      sx={{ borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {job.processed_files} / {job.total_files} files
                    </Typography>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  {new Date(job.created_at).toLocaleString()}
                </Typography>
              </Box>
            ))}
        {jobs?.length === 0 && (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">No jobs yet. Create your first extraction job!</Typography>
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/jobs/new')}>Get Started</Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
