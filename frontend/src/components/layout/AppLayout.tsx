import React, { useState } from 'react';
import {
  Box, Typography, Avatar, Tooltip, Popover, Button, Divider,
  useMediaQuery,
} from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import LogoIcon from '../LogoIcon';

const DRAWER_WIDTH = 260;

const NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: '◈', emoji: '⚡' },
  { label: 'Jobs',      path: '/jobs',      icon: '◉', emoji: '🚀' },
  { label: 'Templates', path: '/templates', icon: '◧', emoji: '📋' },
  { label: 'Settings',  path: '/settings',  icon: '◎', emoji: '⚙️' },
];

// SVG icons for nav
const Icons: Record<string, React.FC<{ active: boolean }>> = {
  Dashboard: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="2" fill={active ? 'white' : 'rgba(255,255,255,0.45)'} />
      <rect x="14" y="3" width="7" height="7" rx="2" fill={active ? 'white' : 'rgba(255,255,255,0.45)'} opacity={active ? 1 : 0.7}/>
      <rect x="3" y="14" width="7" height="7" rx="2" fill={active ? 'white' : 'rgba(255,255,255,0.45)'} opacity={active ? 1 : 0.7}/>
      <rect x="14" y="14" width="7" height="7" rx="2" fill={active ? 'white' : 'rgba(255,255,255,0.45)'} opacity={active ? 1 : 0.5}/>
    </svg>
  ),
  Jobs: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 12h6M9 16h4M17 4H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2z" stroke={active ? 'white' : 'rgba(255,255,255,0.45)'} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 8h6" stroke={active ? 'white' : 'rgba(255,255,255,0.45)'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  Templates: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 10h16M4 14h10M4 18h7" stroke={active ? 'white' : 'rgba(255,255,255,0.45)'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  Settings: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={active ? 'white' : 'rgba(255,255,255,0.45)'} strokeWidth="1.8"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={active ? 'white' : 'rgba(255,255,255,0.45)'} strokeWidth="1.8"/>
    </svg>
  ),
};

export default function AppLayout() {
  const navigate         = useNavigate();
  const location         = useLocation();
  const { user, logout } = useAuthStore();
  const isMobile         = useMediaQuery('(max-width:900px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl]       = useState<HTMLElement | null>(null);

  React.useEffect(() => { setSidebarOpen(!isMobile); }, [isMobile]);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const isAdmin      = user?.is_admin ?? false;
  const isSubscribed = user?.is_subscribed ?? false;
  const jobsUsed     = user?.jobs_used ?? 0;
  const freeLimit    = user?.free_limit ?? 2;
  const hitLimit     = !isAdmin && !isSubscribed && jobsUsed >= freeLimit;

  const currentPage = NAV.find((n) => location.pathname.startsWith(n.path))?.label ?? '';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f5ff' }}>
      <style>{`
        @keyframes sidebarGlow {
          0%, 100% { box-shadow: 4px 0 40px rgba(99,102,241,0.08); }
          50% { box-shadow: 4px 0 60px rgba(139,92,246,0.15); }
        }
        @keyframes navPop {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* ── Overlay for mobile ── */}
      {isMobile && sidebarOpen && (
        <Box onClick={() => setSidebarOpen(false)}
          sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(7,7,26,0.6)', zIndex: 1199, backdropFilter: 'blur(4px)' }} />
      )}

      {/* ── SIDEBAR ── */}
      <Box sx={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: DRAWER_WIDTH,
        transform: sidebarOpen ? 'translateX(0)' : `translateX(-${DRAWER_WIDTH}px)`,
        transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1200,
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #07071a 0%, #0d0b28 40%, #110d30 100%)',
        animation: 'sidebarGlow 8s ease infinite',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}>
        {/* Logo area */}
        <Box sx={{ px: 3, pt: 3.5, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ boxShadow: '0 8px 24px rgba(99,102,241,0.5)', borderRadius: '12px', flexShrink: 0 }}>
            <LogoIcon size={40} borderRadius={12} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 15, letterSpacing: -0.3, lineHeight: 1.1 }}>
              MultiPDF
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 500 }}>
              to Excel · AI Engine
            </Typography>
          </Box>
          {isMobile && (
            <Box onClick={() => setSidebarOpen(false)} sx={{
              width: 28, height: 28, borderRadius: 1.5, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.08)' },
              transition: 'all 0.15s',
            }}>✕</Box>
          )}
        </Box>

        {/* Section label */}
        <Box sx={{ px: 3, mb: 1.5 }}>
          <Typography sx={{
            color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700,
            letterSpacing: 2, textTransform: 'uppercase',
          }}>Menu</Typography>
        </Box>

        {/* Nav items */}
        <Box sx={{ px: 2, flex: 1 }}>
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const Icon = Icons[item.label];
            return (
              <Box key={item.path}
                onClick={() => { navigate(item.path); if (isMobile) setSidebarOpen(false); }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2.5,
                  px: 2, py: 1.4, borderRadius: 2.5, mb: 0.5,
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  background: active
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.85) 0%, rgba(139,92,246,0.75) 100%)'
                    : 'transparent',
                  boxShadow: active ? '0 4px 16px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                  '&:hover': {
                    background: active
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(139,92,246,0.8) 100%)'
                      : 'rgba(255,255,255,0.05)',
                  },
                  transition: 'all 0.18s ease',
                  animation: active ? 'navPop 0.25s ease' : undefined,
                }}
              >
                {/* Active left accent */}
                {active && (
                  <Box sx={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: 3, borderRadius: '0 4px 4px 0',
                    background: 'white', opacity: 0.8,
                  }} />
                )}
                <Icon active={active} />
                <Typography sx={{
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  color: active ? 'white' : 'rgba(255,255,255,0.5)',
                  letterSpacing: active ? 0.1 : 0,
                }}>
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Upgrade card — only for free users */}
        {!isAdmin && !isSubscribed && (
          <Box sx={{ mx: 2, mb: 2 }}>
            <Box sx={{
              p: 2, borderRadius: 2.5,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ fontSize: 16 }}>☕</Box>
                <Typography sx={{ color: 'white', fontSize: 12, fontWeight: 700 }}>
                  {hitLimit ? 'Limit reached' : `${Math.max(0, freeLimit - jobsUsed)} free job${Math.max(0, freeLimit - jobsUsed) !== 1 ? 's' : ''} left`}
                </Typography>
              </Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, mb: 1.5, lineHeight: 1.5 }}>
                Donate $10 → 20 jobs unlocked
              </Typography>
              <Box onClick={() => navigate('/pricing')} sx={{
                py: 0.8, textAlign: 'center', borderRadius: 2, cursor: 'pointer',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                '&:hover': { opacity: 0.9, transform: 'translateY(-1px)' },
                transition: 'all 0.15s ease',
              }}>
                <Typography sx={{ color: 'white', fontSize: 12, fontWeight: 700 }}>
                  Unlock Access →
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* User card */}
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Box onClick={(e) => setAnchorEl(e.currentTarget)} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            p: 1.5, borderRadius: 2.5, cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            '&:hover': { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' },
            transition: 'all 0.15s ease',
          }}>
            <Avatar src={user?.avatar_url} sx={{
              width: 36, height: 36, fontSize: 13, fontWeight: 800,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: '2px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
            }}>{initials}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: 'white', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }} noWrap>
                {user?.full_name?.split(' ')[0] ?? 'User'}
              </Typography>
              <Typography sx={{ fontSize: 11, lineHeight: 1.2 }} noWrap>
                <span style={{
                  color: isAdmin ? '#a78bfa' : isSubscribed ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                  fontWeight: 600,
                }}>
                  {isAdmin ? '⚡ Admin' : isSubscribed ? '⭐ Supporter' : '· Free'}
                </span>
              </Typography>
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>···</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Profile Popover ── */}
      <Popover
        open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{
          sx: {
            borderRadius: 3, width: 280, overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(99,102,241,0.1)',
          },
        }}
      >
        <Box sx={{
          p: 2.5,
          background: 'linear-gradient(135deg, #07071a, #1a1042)',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <Avatar src={user?.avatar_url} sx={{
            width: 48, height: 48, fontSize: 18, fontWeight: 800,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: '2px solid rgba(255,255,255,0.2)',
          }}>{initials}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 14 }} noWrap>
              {user?.full_name || 'No name'}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }} noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 1.5 }}>
          <Box sx={{ px: 1, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Row label="Status" value={isAdmin ? '⚡ Admin' : isSubscribed ? '⭐ Supporter' : `Free (${jobsUsed}/${freeLimit} used)`} />
            <Row label="Jobs used" value={String(jobsUsed)} />
          </Box>
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ display: 'flex', gap: 1, p: 0.5, pt: 1 }}>
            {!isSubscribed && !isAdmin && (
              <Button size="small" variant="outlined" fullWidth
                onClick={() => { setAnchorEl(null); navigate('/pricing'); }}
                sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700,
                  borderColor: '#f59e0b', color: '#d97706',
                  '&:hover': { bgcolor: '#fef3c7', borderColor: '#d97706' } }}>
                ☕ Donate $10
              </Button>
            )}
            <Button size="small" variant="outlined" fullWidth
              onClick={() => { setAnchorEl(null); logout().then(() => navigate('/login')); }}
              sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700,
                borderColor: '#fecaca', color: '#ef4444',
                '&:hover': { bgcolor: '#fef2f2', borderColor: '#ef4444' } }}>
              Sign out
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* ── TOP BAR ── */}
      <Box sx={{
        position: 'fixed', zIndex: 1100,
        top: 0,
        left: sidebarOpen && !isMobile ? DRAWER_WIDTH : 0,
        right: 0,
        height: 64,
        bgcolor: 'rgba(244,245,255,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(99,102,241,0.08)',
        display: 'flex', alignItems: 'center', px: 3, gap: 2,
        transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Hamburger */}
        <Box onClick={() => setSidebarOpen((v) => !v)} sx={{
          width: 36, height: 36, borderRadius: 2, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
          '&:hover': { bgcolor: 'rgba(99,102,241,0.08)' }, transition: 'all 0.15s',
        }}>
          {[0,1,2].map((i) => (
            <Box key={i} sx={{ width: 18, height: 1.5, bgcolor: '#64748b', borderRadius: 1 }} />
          ))}
        </Box>

        {/* Page title */}
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1e1b4b', letterSpacing: -0.2 }}>
          {currentPage}
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Badges */}
        {isAdmin && (
          <Box sx={{
            px: 1.5, py: 0.5, borderRadius: 6,
            background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
            border: '1px solid #c4b5fd',
          }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5b21b6' }}>⚡ Admin</Typography>
          </Box>
        )}
        {isSubscribed && (
          <Box sx={{
            px: 1.5, py: 0.5, borderRadius: 6,
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            border: '1px solid #fcd34d',
          }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>⭐ Supporter</Typography>
          </Box>
        )}

        <Tooltip title="Profile">
          <Avatar src={user?.avatar_url}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              width: 36, height: 36, fontSize: 13, fontWeight: 800, cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              '&:hover': { boxShadow: '0 0 0 3px rgba(99,102,241,0.25)', transform: 'scale(1.05)' },
              transition: 'all 0.2s ease',
            }}>
            {initials}
          </Avatar>
        </Tooltip>
      </Box>

      {/* ── MAIN CONTENT ── */}
      <Box component="main" sx={{
        flexGrow: 1,
        ml: sidebarOpen && !isMobile ? `${DRAWER_WIDTH}px` : 0,
        mt: '64px',
        minHeight: 'calc(100vh - 64px)',
        transition: 'margin 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        p: { xs: 2.5, md: 4 },
        bgcolor: '#f4f5ff',
      }}>
        <Outlet />
      </Box>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 0.5 }}>
      <Typography sx={{ fontSize: 12, color: '#94a3b8', width: 72, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{value}</Typography>
    </Box>
  );
}
