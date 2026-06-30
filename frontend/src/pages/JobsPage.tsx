import React, { useState, useMemo } from 'react';
import { Box, Typography, Skeleton, Avatar, TextField, InputAdornment } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ExtractionJob } from '../types';
import { useAuthStore } from '../store/authStore';

const STATUS_TABS = ['all', 'pending', 'processing', 'completed', 'failed'] as const;

const STATUS_STYLE: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  all:        { dot: '#6366f1', bg: '#ede9fe', text: '#5b21b6', label: 'All' },
  pending:    { dot: '#f59e0b', bg: '#fef3c7', text: '#92400e', label: 'Pending' },
  processing: { dot: '#3b82f6', bg: '#dbeafe', text: '#1e40af', label: 'Processing' },
  completed:  { dot: '#10b981', bg: '#d1fae5', text: '#065f46', label: 'Completed' },
  failed:     { dot: '#ef4444', bg: '#fee2e2', text: '#991b1b', label: 'Failed' },
  cancelled:  { dot: '#94a3b8', bg: '#f1f5f9', text: '#475569', label: 'Cancelled' },
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #3b82f6, #6366f1)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
];

export default function JobsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const freeLimit    = user?.free_limit ?? 2;
  const paidLimit    = user?.paid_limit ?? 20;
  const jobsUsed     = user?.jobs_used ?? 0;
  const isSubscribed = user?.is_subscribed ?? false;
  const isAdmin      = user?.is_admin ?? false;
  const hitFreeLimit = !isAdmin && !isSubscribed && jobsUsed >= freeLimit;
  const hitPaidLimit = !isAdmin && isSubscribed && jobsUsed >= paidLimit;
  const hitLimit     = hitFreeLimit || hitPaidLimit;

  const { data: jobs, isLoading, refetch } = useQuery<ExtractionJob[]>({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs/').then((r) => r.data),
    refetchInterval: 5000,
  });

  const counts = useMemo(() => {
    if (!jobs) return {} as Record<string, number>;
    return STATUS_TABS.reduce((acc, s) => {
      acc[s] = s === 'all' ? jobs.length : jobs.filter((j) => j.status === s).length;
      return acc;
    }, {} as Record<string, number>);
  }, [jobs]);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((j) => {
      const matchTab    = activeTab === 'all' || j.status === activeTab;
      const matchSearch = !search || j.name.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [jobs, search, activeTab]);

  return (
    <Box>
      <style>{`
        @keyframes jobCardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .job-card { animation: jobCardIn 0.22s ease both; }
        @keyframes blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }
      `}</style>

      {/* PAYWALL BANNER */}
      {hitLimit && (
        <Box sx={{
          mb: 3, p: 3, borderRadius: '20px',
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          border: '1px solid #fcd34d',
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          boxShadow: '0 4px 16px rgba(245,158,11,0.15)',
        }}>
          <Box sx={{ fontSize: 32, flexShrink: 0 }}>🔒</Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, color: '#78350f', fontSize: 15, mb: 0.3 }}>
              {hitFreeLimit ? 'Free plan limit reached' : 'Donation plan limit reached'}
            </Typography>
            <Typography sx={{ color: '#92400e', fontSize: 13 }}>
              {hitFreeLimit
                ? 'Donate $10 to unlock 20 extraction jobs with the same email.'
                : 'Donate again to top up your job balance.'}
            </Typography>
          </Box>
          <Box onClick={() => navigate('/pricing')} sx={{
            px: 3, py: 1.2, borderRadius: 3, cursor: 'pointer', flexShrink: 0,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
            '&:hover': { opacity: 0.9, transform: 'translateY(-1px)' },
            transition: 'all 0.2s ease',
          }}>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 13 }}>Donate $10 → Unlock</Typography>
          </Box>
        </Box>
      )}

      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: -0.3 }}>
            Extraction Jobs
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#94a3b8', mt: 0.2 }}>
            {jobs ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''} total` : 'Loading…'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box onClick={() => refetch()} sx={{
          width: 40, height: 40, borderRadius: 2.5, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'white', border: '1px solid #e2e8f0', color: '#64748b',
          '&:hover': { bgcolor: '#f8faff', borderColor: '#c7d2fe', color: '#6366f1' },
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </Box>
        <Box onClick={() => hitLimit ? navigate('/pricing') : navigate('/jobs/new')} sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 3, py: 1.2, borderRadius: 3, cursor: 'pointer',
          background: hitLimit
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: hitLimit
            ? '0 4px 16px rgba(245,158,11,0.35)'
            : '0 4px 16px rgba(99,102,241,0.35)',
          '&:hover': { opacity: 0.92, transform: 'translateY(-1px)' },
          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 14 }}>
            {hitLimit ? '🔒 Unlock Jobs' : '+ New Job'}
          </Typography>
        </Box>
      </Box>

      {/* SEARCH + TABS */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="Search jobs…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="#94a3b8" strokeWidth="2"/>
                  <path d="M21 21l-4.35-4.35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </InputAdornment>
            ),
            sx: { bgcolor: 'white', borderRadius: 2.5, fontSize: 14, '& fieldset': { borderColor: '#e2e8f0' } },
          }}
          sx={{ width: 240 }}
        />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {STATUS_TABS.map((tab) => {
            const s = STATUS_STYLE[tab];
            const isActive = activeTab === tab;
            return (
              <Box key={tab} onClick={() => setActiveTab(tab)} sx={{
                display: 'flex', alignItems: 'center', gap: 0.8,
                px: 2, py: 0.7, borderRadius: 6, cursor: 'pointer',
                bgcolor: isActive ? s.bg : 'white',
                border: `1px solid ${isActive ? s.dot + '50' : '#e2e8f0'}`,
                boxShadow: isActive ? `0 2px 8px ${s.dot}25` : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: s.bg, borderColor: s.dot + '40' },
              }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.dot }} />
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: isActive ? s.text : '#64748b' }}>
                  {s.label}
                </Typography>
                {counts[tab] !== undefined && (
                  <Box sx={{
                    px: 0.8, borderRadius: 4, bgcolor: isActive ? s.dot + '20' : '#f1f5f9',
                    display: 'inline-flex', alignItems: 'center',
                  }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: isActive ? s.text : '#94a3b8', lineHeight: '18px' }}>
                      {counts[tab]}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {(search || activeTab !== 'all') && (
          <Box onClick={() => { setSearch(''); setActiveTab('all'); }} sx={{
            fontSize: 12, color: '#6366f1', cursor: 'pointer', fontWeight: 600,
            '&:hover': { color: '#4f46e5' },
          }}>
            Clear ×
          </Box>
        )}
      </Box>

      {/* JOB CARDS */}
      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{
              bgcolor: 'white', borderRadius: '16px', p: 2.5,
              display: 'flex', gap: 2, alignItems: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <Skeleton variant="circular" width={48} height={48} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="40%" height={18} />
                <Skeleton width="25%" height={13} sx={{ mt: 0.7 }} />
              </Box>
              <Skeleton width={80} height={28} sx={{ borderRadius: 3 }} />
            </Box>
          ))}
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{
          bgcolor: 'white', borderRadius: '20px', py: 12, textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9',
        }}>
          <Typography sx={{ fontSize: 56, mb: 2 }}>{jobs?.length === 0 ? '🚀' : '🔍'}</Typography>
          <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: 18, mb: 1 }}>
            {jobs?.length === 0 ? 'No jobs yet' : 'No matches found'}
          </Typography>
          <Typography sx={{ color: '#94a3b8', fontSize: 14, mb: 3 }}>
            {jobs?.length === 0
              ? 'Upload PDFs and let AI extract your data instantly'
              : 'Try adjusting your search or filters'}
          </Typography>
          {jobs?.length === 0 && (
            <Box onClick={() => hitLimit ? navigate('/pricing') : navigate('/jobs/new')} sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1.5,
              px: 3.5, py: 1.4, borderRadius: 3, cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              '&:hover': { opacity: 0.9, transform: 'translateY(-2px)' },
              transition: 'all 0.2s ease',
              boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
            }}>
              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 14 }}>
                {hitLimit ? '🔒 Unlock to Start' : '+ Create First Job'}
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map((job, idx) => {
            const s = STATUS_STYLE[job.status] ?? STATUS_STYLE.cancelled;
            const pct = job.total_files > 0 ? Math.round((job.processed_files / job.total_files) * 100) : 0;

            return (
              <Box key={job.id} className="job-card"
                onClick={() => navigate(`/jobs/${job.id}`)}
                sx={{
                  animationDelay: `${Math.min(idx * 0.04, 0.3)}s`,
                  bgcolor: 'white', borderRadius: '16px',
                  p: 2.5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 2.5,
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  '&:hover': {
                    borderColor: '#c7d2fe',
                    boxShadow: '0 8px 32px rgba(99,102,241,0.12)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Avatar sx={{
                  width: 48, height: 48, fontSize: 16, fontWeight: 900, flexShrink: 0,
                  background: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length],
                  boxShadow: '0 4px 12px rgba(99,102,241,0.2)',
                }}>
                  {job.name?.[0]?.toUpperCase()}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0f172a', mb: 0.3 }} noWrap>
                    {job.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>{timeAgo(job.created_at)}</Typography>
                    {job.total_files > 0 && (
                      <>
                        <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#cbd5e1', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                          {job.processed_files}/{job.total_files} files
                        </Typography>
                      </>
                    )}
                  </Box>
                  {job.status === 'processing' && job.total_files > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ flex: 1, height: 4, bgcolor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{
                          height: '100%', borderRadius: 2,
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                          transition: 'width 0.5s ease',
                        }} />
                      </Box>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', flexShrink: 0 }}>
                        {pct}%
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ flexShrink: 0 }}>
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.8,
                    px: 1.5, py: 0.6, borderRadius: 6, bgcolor: s.bg,
                  }}>
                    <Box sx={{
                      width: 6, height: 6, borderRadius: '50%', bgcolor: s.dot,
                      ...(job.status === 'processing' && { animation: 'blink 1.5s ease infinite' }),
                    }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: s.text }}>{s.label}</Typography>
                  </Box>
                </Box>

                <Box sx={{ color: '#cbd5e1', flexShrink: 0, fontSize: 20, lineHeight: 1 }}>›</Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
