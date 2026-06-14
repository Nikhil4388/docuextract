import React from 'react';
import {
  Box, Grid, Paper, Typography, Button, Chip,
  LinearProgress, Skeleton, Avatar,
} from '@mui/material';
import {
  Add, Description, CheckCircle, HourglassEmpty, Error,
  ArrowForward, Bolt, TrendingUp, FolderOpen,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ExtractionJob } from '../types';
import { useAuthStore } from '../store/authStore';

function statusColor(status: string): 'default' | 'info' | 'success' | 'error' | 'warning' {
  const map: Record<string, any> = {
    pending: 'default', processing: 'info', completed: 'success', failed: 'error', cancelled: 'warning',
  };
  return map[status] ?? 'default';
}

export default function DashboardPage() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();

  const { data: jobs, isLoading } = useQuery<ExtractionJob[]>({
    queryKey: ['jobs'],
    queryFn:  () => api.get('/jobs/').then((r) => r.data),
    refetchInterval: 8000,
  });

  const stats = React.useMemo(() => {
    if (!jobs) return { total: 0, completed: 0, processing: 0, failed: 0, pending: 0, successRate: 0 };
    const completed  = jobs.filter((j) => j.status === 'completed').length;
    const done       = jobs.filter((j) => ['completed','failed'].includes(j.status)).length;
    return {
      total:       jobs.length,
      completed,
      processing:  jobs.filter((j) => j.status === 'processing').length,
      failed:      jobs.filter((j) => j.status === 'failed').length,
      pending:     jobs.filter((j) => j.status === 'pending').length,
      successRate: done > 0 ? Math.round((completed / done) * 100) : 0,
    };
  }, [jobs]);

  const recentJobs = jobs?.slice(0, 5) ?? [];
  const firstName  = user?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <Box>
      {/* ── Welcome banner ── */}
      <Paper sx={{
        p: 3.5, mb: 3, borderRadius: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.08, fontSize: 180, lineHeight: 1 }}>📄</Box>
        <Typography variant="h5" fontWeight={700} mb={0.5}>
          Good {getGreeting()}, {firstName} 👋
        </Typography>
        <Typography sx={{ opacity: 0.85, mb: 2.5, fontSize: 14 }}>
          You have {stats.pending + stats.processing > 0
            ? `${stats.pending + stats.processing} job${stats.pending + stats.processing > 1 ? 's' : ''} in progress`
            : 'no active jobs right now'}.
          {stats.completed > 0 && ` ${stats.completed} completed total.`}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/jobs/new')}
          sx={{
            bgcolor: 'white', color: '#667eea', fontWeight: 700,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }, borderRadius: 2,
          }}
        >
          New Extraction Job
        </Button>
      </Paper>

      {/* ── Stats ── */}
      <Grid container spacing={2.5} mb={3}>
        {[
          { label: 'Total Jobs',    value: stats.total,       color: '#667eea', bg: '#667eea12', icon: <Description /> },
          { label: 'Completed',     value: stats.completed,   color: '#22c55e', bg: '#22c55e12', icon: <CheckCircle /> },
          { label: 'In Progress',   value: stats.processing + stats.pending, color: '#3b82f6', bg: '#3b82f612', icon: <HourglassEmpty /> },
          { label: 'Failed',        value: stats.failed,      color: '#ef4444', bg: '#ef444412', icon: <Error /> },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Paper sx={{ p: 2.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: s.bg, color: s.color, width: 44, height: 44 }}>
                {React.cloneElement(s.icon, { sx: { fontSize: 22 } })}
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">{s.label}</Typography>
                <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
                  {isLoading ? <Skeleton width={32} /> : s.value}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* ── Recent Jobs ── */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontWeight={700}>Recent Jobs</Typography>
              <Button size="small" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} onClick={() => navigate('/jobs')} sx={{ fontSize: 12, color: '#667eea' }}>
                View All
              </Button>
            </Box>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Box key={i} sx={{ px: 2.5, py: 1.5 }}><Skeleton width="55%" /><Skeleton width="30%" /></Box>
                ))
              : recentJobs.length === 0
              ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <FolderOpen sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                  <Typography color="text.secondary" fontSize={14}>No jobs yet</Typography>
                  <Button size="small" sx={{ mt: 1, color: '#667eea' }} onClick={() => navigate('/jobs/new')}>Create your first job →</Button>
                </Box>
              )
              : recentJobs.map((job) => (
                  <Box
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    sx={{ px: 2.5, py: 1.8, borderBottom: '1px solid #f5f5f5', cursor: 'pointer', '&:hover': { bgcolor: '#fafafa' }, display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <Avatar sx={{ bgcolor: '#667eea10', color: '#667eea', width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
                      {job.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={600} noWrap fontSize={14}>{job.name}</Typography>
                      {job.status === 'processing' && job.total_files > 0 && (
                        <LinearProgress variant="determinate" value={(job.processed_files / job.total_files) * 100}
                          sx={{ height: 3, borderRadius: 2, my: 0.5 }} />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    <Chip label={job.status} color={statusColor(job.status)} size="small" sx={{ fontSize: 11 }} />
                  </Box>
                ))
            }
          </Paper>
        </Grid>

        {/* ── Right column ── */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%' }}>

            {/* Success rate */}
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <TrendingUp sx={{ color: '#22c55e', fontSize: 20 }} />
                <Typography fontWeight={700} fontSize={14}>Success Rate</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 1 }}>
                <Typography variant="h3" fontWeight={800} color="#22c55e" lineHeight={1}>
                  {isLoading ? <Skeleton width={72} /> : `${stats.successRate}%`}
                </Typography>
                <Typography variant="caption" color="text.secondary" mb={0.5}>of finished jobs</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.successRate}
                sx={{ height: 7, borderRadius: 4, bgcolor: '#f0fdf4', '& .MuiLinearProgress-bar': { bgcolor: '#22c55e', borderRadius: 4 } }}
              />
            </Paper>

            {/* Quick actions */}
            <Paper sx={{ p: 2.5, borderRadius: 3, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Bolt sx={{ color: '#f59e0b', fontSize: 20 }} />
                <Typography fontWeight={700} fontSize={14}>Quick Actions</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { label: 'New Extraction Job', sub: 'Upload files and extract data', path: '/jobs/new', color: '#667eea' },
                  { label: 'Manage Templates',   sub: 'Create or edit extraction templates', path: '/templates', color: '#764ba2' },
                  { label: 'View All Jobs',      sub: 'Browse and search your jobs', path: '/jobs', color: '#3b82f6' },
                ].map((a) => (
                  <Box
                    key={a.path}
                    onClick={() => navigate(a.path)}
                    sx={{
                      p: 1.5, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
                      border: '1px solid #f0f0f0', '&:hover': { bgcolor: `${a.color}08`, borderColor: `${a.color}40` },
                      transition: 'all 0.15s',
                    }}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: a.color, flexShrink: 0 }} />
                    <Box>
                      <Typography fontSize={13} fontWeight={600}>{a.label}</Typography>
                      <Typography fontSize={11} color="text.secondary">{a.sub}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
