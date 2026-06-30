import React from 'react';
import { Box, Grid, Paper, Typography, Button, Chip, LinearProgress, Skeleton, Avatar } from '@mui/material';
import { Add, ArrowForward, CheckCircle, HourglassEmpty, Error, TrendingUp, FolderOpen, Bolt } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ExtractionJob } from '../types';
import { useAuthStore } from '../store/authStore';

function statusColor(s: string): 'default' | 'info' | 'success' | 'error' | 'warning' {
  return ({ pending: 'default', processing: 'info', completed: 'success', failed: 'error', cancelled: 'warning' } as any)[s] ?? 'default';
}
function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: jobs, isLoading } = useQuery<ExtractionJob[]>({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs/').then((r) => r.data),
    refetchInterval: 8000,
  });

  const stats = React.useMemo(() => {
    if (!jobs) return { total: 0, completed: 0, processing: 0, failed: 0, pending: 0, successRate: 0, totalFiles: 0 };
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const done = jobs.filter((j) => ['completed', 'failed'].includes(j.status)).length;
    return {
      total: jobs.length,
      completed,
      processing: jobs.filter((j) => j.status === 'processing').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      successRate: done > 0 ? Math.round((completed / done) * 100) : 0,
      totalFiles: jobs.reduce((a, j) => a + (j.processed_files || 0), 0),
    };
  }, [jobs]);

  const recentJobs = jobs?.slice(0, 6) ?? [];
  const firstName = user?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  const statCards = [
    { label: 'Total Jobs', value: stats.total, gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', icon: '📁', sub: 'all time' },
    { label: 'Completed', value: stats.completed, gradient: 'linear-gradient(135deg, #10b981, #059669)', icon: '✅', sub: 'successfully' },
    { label: 'In Progress', value: stats.processing + stats.pending, gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', icon: '⚡', sub: 'running now' },
    { label: 'PDFs Processed', value: stats.totalFiles, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '📄', sub: 'total files' },
  ];

  return (
    <Box>
      {/* ── Hero banner ── */}
      <Box sx={{
        borderRadius: 4, mb: 3, p: 4, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        boxShadow: '0 20px 60px rgba(15,12,41,0.35)',
      }}>
        {/* Orbs */}
        <Box sx={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', top: -100, right: 50,
          background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', bottom: -80, right: -50,
          background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, mb: 0.5, fontWeight: 500 }}>
            Good {getGreeting()} ☀️
          </Typography>
          <Typography sx={{
            fontSize: { xs: 24, md: 32 }, fontWeight: 900, color: 'white', mb: 1, lineHeight: 1.2,
          }}>
            Welcome back, {firstName}!
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, mb: 3 }}>
            {stats.processing + stats.pending > 0
              ? `You have ${stats.processing + stats.pending} job${stats.processing + stats.pending > 1 ? 's' : ''} in progress`
              : stats.completed > 0 ? `${stats.completed} job${stats.completed > 1 ? 's' : ''} completed • ${stats.totalFiles} files processed`
              : 'Ready to extract data from your PDFs?'}
          </Typography>
          <Button
            onClick={() => navigate('/jobs/new')}
            startIcon={<Add />}
            sx={{
              bgcolor: 'white', color: '#302b63', fontWeight: 800, borderRadius: 2.5,
              px: 3, py: 1.2, fontSize: 14,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)', transform: 'translateY(-1px)', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' },
              transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            New Extraction Job
          </Button>
        </Box>
      </Box>

      {/* ── Stat cards ── */}
      <Grid container spacing={2.5} mb={3}>
        {statCards.map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Paper sx={{
              p: 2.5, borderRadius: 3, position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.04)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' },
            }}>
              <Box sx={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: s.gradient, borderRadius: '3px 3px 0 0',
              }} />
              <Box sx={{ fontSize: 28, mb: 1 }}>{s.icon}</Box>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600} sx={{ letterSpacing: 0.3 }}>
                {s.label.toUpperCase()}
              </Typography>
              <Typography sx={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, mb: 0.5 }}>
                {isLoading ? <Skeleton width={50} /> : s.value.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">{s.sub}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* ── Recent Jobs ── */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <Box sx={{
              px: 3, py: 2.5,
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #fafbff, #f8f9ff)',
            }}>
              <Box>
                <Typography fontWeight={800} fontSize={15}>Recent Jobs</Typography>
                <Typography variant="caption" color="text.secondary">Your latest extraction runs</Typography>
              </Box>
              <Button size="small" endIcon={<ArrowForward sx={{ fontSize: 13 }} />}
                onClick={() => navigate('/jobs')}
                sx={{ fontSize: 12, color: '#6366f1', fontWeight: 700, borderRadius: 2,
                  '&:hover': { bgcolor: '#6366f108' } }}>
                View All
              </Button>
            </Box>

            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Box key={i} sx={{ px: 3, py: 2, borderBottom: '1px solid #f8fafc' }}>
                    <Skeleton width="50%" height={16} />
                    <Skeleton width="25%" height={12} sx={{ mt: 0.5 }} />
                  </Box>
                ))
              : recentJobs.length === 0
              ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <FolderOpen sx={{ fontSize: 52, color: '#cbd5e1', mb: 1.5 }} />
                  <Typography color="text.secondary" fontSize={14} mb={1}>No jobs yet</Typography>
                  <Button size="small" onClick={() => navigate('/jobs/new')}
                    sx={{ color: '#6366f1', fontWeight: 700 }}>
                    Create your first job →
                  </Button>
                </Box>
              )
              : recentJobs.map((job, idx) => (
                <Box
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  sx={{
                    px: 3, py: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                    borderBottom: idx < recentJobs.length - 1 ? '1px solid #f8fafc' : 'none',
                    '&:hover': { bgcolor: '#fafbff' }, transition: 'background 0.15s',
                  }}
                >
                  <Avatar sx={{
                    width: 38, height: 38, fontSize: 14, fontWeight: 800, flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  }}>
                    {job.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap fontSize={14}>{job.name}</Typography>
                    {job.status === 'processing' && job.total_files > 0 && (
                      <LinearProgress variant="determinate" value={(job.processed_files / job.total_files) * 100}
                        sx={{ height: 3, borderRadius: 2, my: 0.5,
                          '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' } }} />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {job.total_files > 0 && ` · ${job.processed_files}/${job.total_files} files`}
                    </Typography>
                  </Box>
                  <Chip label={job.status} color={statusColor(job.status)} size="small"
                    sx={{ fontSize: 11, fontWeight: 700, borderRadius: 1.5 }} />
                </Box>
              ))
            }
          </Paper>
        </Grid>

        {/* ── Right column ── */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {/* Success rate */}
            <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp sx={{ color: '#10b981', fontSize: 20 }} />
                <Typography fontWeight={800} fontSize={14}>Success Rate</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                  background: `conic-gradient(#10b981 ${stats.successRate * 3.6}deg, #f1f5f9 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 0 0 10px white',
                }}>
                  <Typography fontWeight={900} fontSize={16} color="#10b981">
                    {isLoading ? '—' : `${stats.successRate}%`}
                  </Typography>
                </Box>
                <Box>
                  <Typography fontSize={28} fontWeight={900} color="#10b981" lineHeight={1}>
                    {isLoading ? <Skeleton width={64} /> : `${stats.successRate}%`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">of finished jobs succeeded</Typography>
                </Box>
              </Box>

              <LinearProgress variant="determinate" value={stats.successRate}
                sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9',
                  '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: 3 } }} />
            </Paper>

            {/* Quick actions */}
            <Paper sx={{ p: 3, borderRadius: 3, flex: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Bolt sx={{ color: '#f59e0b', fontSize: 20 }} />
                <Typography fontWeight={800} fontSize={14}>Quick Actions</Typography>
              </Box>

              {[
                { label: 'New Extraction Job', sub: 'Upload PDFs and extract data', path: '/jobs/new',   gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', icon: '🚀' },
                { label: 'Manage Templates',   sub: 'Create or edit column templates', path: '/templates', gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)', icon: '📋' },
                { label: 'View All Jobs',      sub: 'Browse and search your history', path: '/jobs',       gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)', icon: '📁' },
              ].map((a) => (
                <Box
                  key={a.path}
                  onClick={() => navigate(a.path)}
                  sx={{
                    p: 1.8, mb: 1, borderRadius: 2.5, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    border: '1px solid #f1f5f9',
                    '&:hover': { bgcolor: '#f8faff', borderColor: '#e0e7ff', transform: 'translateX(3px)' },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                    background: a.gradient, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 18,
                    boxShadow: '0 4px 10px rgba(99,102,241,0.25)',
                  }}>
                    {a.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontSize={13} fontWeight={700}>{a.label}</Typography>
                    <Typography fontSize={11} color="text.secondary">{a.sub}</Typography>
                  </Box>
                  <ArrowForward sx={{ fontSize: 14, color: '#cbd5e1' }} />
                </Box>
              ))}
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
