import React from 'react';
import { Box, Typography, Button, Skeleton, Avatar } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ExtractionJob } from '../types';
import { useAuthStore } from '../store/authStore';

function statusDot(s: string) {
  const map: Record<string, string> = {
    completed:  '#10b981',
    processing: '#3b82f6',
    pending:    '#f59e0b',
    failed:     '#ef4444',
    cancelled:  '#94a3b8',
  };
  return map[s] ?? '#cbd5e1';
}

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const navigate     = useNavigate();
  const { user }     = useAuthStore();
  const firstName    = user?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  const { data: jobs, isLoading } = useQuery<ExtractionJob[]>({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs/').then((r) => r.data),
    refetchInterval: 8000,
  });

  const stats = React.useMemo(() => {
    if (!jobs) return { total: 0, completed: 0, running: 0, failed: 0, totalFiles: 0, successRate: 0 };
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const done      = jobs.filter((j) => ['completed', 'failed'].includes(j.status)).length;
    return {
      total:       jobs.length,
      completed,
      running:     jobs.filter((j) => ['processing', 'pending'].includes(j.status)).length,
      failed:      jobs.filter((j) => j.status === 'failed').length,
      totalFiles:  jobs.reduce((a, j) => a + (j.processed_files || 0), 0),
      successRate: done > 0 ? Math.round((completed / done) * 100) : 0,
    };
  }, [jobs]);

  const recentJobs = jobs?.slice(0, 5) ?? [];

  return (
    <Box>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes countUp {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .dash-card { animation: fadeSlideUp 0.4s ease both; }
        .dash-card:hover { transform: translateY(-3px); transition: transform 0.2s ease, box-shadow 0.2s ease; }
      `}</style>

      {/* ── HERO ── */}
      <Box sx={{
        mb: 4, borderRadius: '24px', overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #0a0720 0%, #1a1042 45%, #0f0c29 100%)',
        p: { xs: 3.5, md: 5 },
        boxShadow: '0 24px 64px rgba(10,7,32,0.4), 0 4px 16px rgba(99,102,241,0.2)',
      }}>
        {/* Orbs */}
        <Box sx={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          top: -200, right: -50,
          background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          bottom: -100, left: 200,
          background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        {/* Grid */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }} />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1, mb: 2.5,
            bgcolor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 6, px: 1.5, py: 0.6,
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <Typography sx={{ color: '#a5b4fc', fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
              AI ENGINE READY
            </Typography>
          </Box>

          <Typography sx={{
            fontSize: { xs: 24, md: 36 }, fontWeight: 900, color: 'white',
            lineHeight: 1.15, mb: 1.5, letterSpacing: -0.5,
          }}>
            {getGreeting()},{' '}
            <span style={{
              background: 'linear-gradient(135deg, #a5b4fc, #818cf8, #06b6d4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>{firstName}</span>
          </Typography>

          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, mb: 4, maxWidth: 500 }}>
            {stats.running > 0
              ? `${stats.running} job${stats.running > 1 ? 's' : ''} running right now — sit back and relax.`
              : stats.completed > 0
              ? `${stats.totalFiles.toLocaleString()} PDF${stats.totalFiles !== 1 ? 's' : ''} processed across ${stats.completed} completed job${stats.completed !== 1 ? 's' : ''}.`
              : 'Drop in your PDFs and let AI do the heavy lifting.'}
          </Typography>

          {/* Hero stats */}
          <Box sx={{ display: 'flex', gap: { xs: 3, md: 6 }, flexWrap: 'wrap', mb: 4 }}>
            {[
              { value: stats.total, label: 'Total Jobs', color: '#a5b4fc' },
              { value: stats.completed, label: 'Completed', color: '#6ee7b7' },
              { value: stats.totalFiles, label: 'PDFs Processed', color: '#67e8f9' },
            ].map((s) => (
              <Box key={s.label}>
                <Typography sx={{
                  fontSize: { xs: 28, md: 36 }, fontWeight: 900, lineHeight: 1, color: s.color,
                  animation: 'countUp 0.5s ease both',
                }}>
                  {isLoading ? '—' : s.value.toLocaleString()}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 500, mt: 0.3 }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Button onClick={() => navigate('/jobs/new')} size="large"
            sx={{
              px: 3.5, py: 1.4, borderRadius: 3, fontWeight: 800, fontSize: 14,
              bgcolor: 'white', color: '#1a1042',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)', transform: 'translateY(-2px)', boxShadow: '0 12px 32px rgba(0,0,0,0.3)' },
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
            + New Extraction Job
          </Button>
        </Box>
      </Box>

      {/* ── STAT CARDS ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 4 }}>
        {[
          { label: 'Total Jobs',   value: stats.total,      icon: '📁', from: '#6366f1', to: '#818cf8', delay: '0s' },
          { label: 'Completed',    value: stats.completed,   icon: '✅', from: '#10b981', to: '#34d399', delay: '0.05s' },
          { label: 'Running',      value: stats.running,     icon: '⚡', from: '#3b82f6', to: '#60a5fa', delay: '0.1s' },
          { label: 'Success Rate', value: `${stats.successRate}%`, icon: '🎯', from: '#f59e0b', to: '#fbbf24', delay: '0.15s' },
        ].map((c) => (
          <Box key={c.label} className="dash-card" sx={{
            background: 'white',
            borderRadius: '20px', p: 3,
            boxShadow: `0 4px 20px ${c.from}12, 0 1px 4px rgba(0,0,0,0.06)`,
            border: `1px solid ${c.from}25`,
            animationDelay: c.delay,
            position: 'relative', overflow: 'hidden',
            cursor: 'default',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: `0 8px 32px ${c.from}22, 0 0 0 1px ${c.from}40`,
              transform: 'translateY(-3px)',
            },
          }}>
            {/* Color bar */}
            <Box sx={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '20px 20px 0 0',
              background: `linear-gradient(90deg, ${c.from}, ${c.to})`,
              boxShadow: `0 0 12px ${c.from}80`,
            }} />
            {/* Background glow */}
            <Box sx={{
              position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%',
              background: `radial-gradient(circle, ${c.from}20 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            <Typography sx={{ fontSize: 28, mb: 1.5 }}>{c.icon}</Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 900, color: '#0c0c0c', lineHeight: 1, mb: 0.5 }}>
              {isLoading ? <Skeleton width={60} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} /> : c.value}
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
              {c.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── BOTTOM ROW ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, gap: 3 }}>

        {/* Recent Jobs */}
        <Box sx={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          border: '1px solid rgba(99,102,241,0.15)',
          overflow: 'hidden',
        }}>
          <Box sx={{
            px: 3, py: 2.5,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#0c0c0c' }}>Recent Jobs</Typography>
              <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.2 }}>Your latest extraction runs</Typography>
            </Box>
            <Box onClick={() => navigate('/jobs')} sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              color: '#818cf8', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              '&:hover': { color: '#a5b4fc' },
            }}>
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </Box>
          </Box>

          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Box key={i} sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Skeleton variant="circular" width={44} height={44} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="45%" height={16} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
                    <Skeleton width="28%" height={12} sx={{ mt: 0.5, bgcolor: 'rgba(0,0,0,0.04)' }} />
                  </Box>
                  <Skeleton width={70} height={24} sx={{ borderRadius: 3, bgcolor: 'rgba(0,0,0,0.06)' }} />
                </Box>
              ))
            : recentJobs.length === 0
            ? (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 48, mb: 2 }}>📭</Typography>
                <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>No jobs yet</Typography>
                <Typography sx={{ color: '#64748b', fontSize: 13, mb: 3 }}>Create your first extraction to get started</Typography>
                <Box onClick={() => navigate('/jobs/new')} sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 1,
                  px: 3, py: 1.2, borderRadius: 3, cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  '&:hover': { opacity: 0.9, transform: 'translateY(-1px)' },
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                }}>
                  <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 13 }}>+ New Job</Typography>
                </Box>
              </Box>
            )
            : recentJobs.map((job, idx) => (
              <Box key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}
                sx={{
                  px: 3, py: 2.5, cursor: 'pointer',
                  borderBottom: idx < recentJobs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 2.5,
                  '&:hover': { bgcolor: 'rgba(99,102,241,0.06)' },
                  transition: 'background 0.12s',
                }}>
                <Avatar sx={{
                  width: 44, height: 44, fontSize: 15, fontWeight: 800, flexShrink: 0,
                  background: `linear-gradient(135deg, ${['#6366f1','#10b981','#3b82f6','#f59e0b','#8b5cf6'][idx % 5]}, ${['#8b5cf6','#34d399','#60a5fa','#fbbf24','#a78bfa'][idx % 5]})`,
                  boxShadow: `0 0 16px ${['rgba(99,102,241,0.4)','rgba(16,185,129,0.4)','rgba(59,130,246,0.4)','rgba(245,158,11,0.4)','rgba(139,92,246,0.4)'][idx % 5]}`,
                }}>
                  {job.name?.[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0c0c0c' }} noWrap>{job.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                    {job.total_files > 0 && (
                      <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                        {job.processed_files}/{job.total_files} files
                      </Typography>
                    )}
                    {job.total_files > 0 && <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#334155' }} />}
                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>{timeAgo(job.created_at)}</Typography>
                  </Box>
                  {job.status === 'processing' && job.total_files > 0 && (
                    <Box sx={{ mt: 0.8, height: 3, bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <Box sx={{
                        height: '100%', borderRadius: 2,
                        width: `${(job.processed_files / job.total_files) * 100}%`,
                        background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                        boxShadow: '0 0 8px rgba(99,102,241,0.6)',
                        transition: 'width 0.5s ease',
                      }} />
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusDot(job.status), boxShadow: `0 0 6px ${statusDot(job.status)}` }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                    {statusLabel(job.status)}
                  </Typography>
                </Box>
              </Box>
            ))
          }
        </Box>

        {/* Right column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Success donut */}
          <Box sx={{
            background: 'white',
            borderRadius: '20px', p: 3,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            border: '1px solid rgba(16,185,129,0.15)',
          }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0c0c0c', mb: 0.5 }}>Success Rate</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b', mb: 3 }}>Across all completed jobs</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{
                width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
                background: `conic-gradient(
                  #10b981 0deg ${stats.successRate * 3.6}deg,
                  rgba(255,255,255,0.06) ${stats.successRate * 3.6}deg 360deg
                )`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 0 0 12px #ffffff, 0 0 20px rgba(16,185,129,0.3)',
              }}>
                <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#10b981' }}>
                  {isLoading ? '—' : `${stats.successRate}%`}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 32, fontWeight: 900, color: '#10b981', lineHeight: 1, textShadow: '0 0 20px rgba(16,185,129,0.5)' }}>
                  {isLoading ? '—' : `${stats.successRate}%`}
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.5 }}>
                  {stats.completed} of {stats.completed + stats.failed} done
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Quick actions */}
          <Box sx={{
            background: 'white',
            borderRadius: '20px', p: 3, flex: 1,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            border: '1px solid rgba(99,102,241,0.15)',
          }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0c0c0c', mb: 2 }}>Quick Actions</Typography>
            {[
              { label: 'New Extraction Job', sub: 'Upload PDFs and extract data', path: '/jobs/new',   icon: '🚀', color: '#6366f1' },
              { label: 'Manage Templates',   sub: 'Create or edit column templates', path: '/templates', icon: '📋', color: '#8b5cf6' },
              { label: 'Browse All Jobs',    sub: 'Search and filter your history', path: '/jobs',       icon: '📁', color: '#06b6d4' },
            ].map((a) => (
              <Box key={a.path} onClick={() => navigate(a.path)} sx={{
                display: 'flex', alignItems: 'center', gap: 2,
                p: 1.5, mb: 1, borderRadius: 2.5, cursor: 'pointer',
                border: '1px solid transparent',
                '&:hover': {
                  bgcolor: `${a.color}10`,
                  border: `1px solid ${a.color}30`,
                  '& .arrow': { opacity: 1, transform: 'translateX(3px)' },
                },
                transition: 'all 0.18s ease',
              }}>
                <Box sx={{
                  width: 40, height: 40, borderRadius: 2.5, fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${a.color}18`,
                  border: `1px solid ${a.color}30`,
                  flexShrink: 0,
                }}>{a.icon}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{a.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748b' }}>{a.sub}</Typography>
                </Box>
                <Box className="arrow" sx={{
                  opacity: 0.25, transition: 'all 0.18s ease',
                  color: '#64748b', fontSize: 18,
                }}>›</Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
