import React, { useState } from 'react';
import {
  Box, Drawer, Typography, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText, Avatar,
  Tooltip, Divider, useTheme, useMediaQuery,
  Popover, Button, Chip, LinearProgress,
} from '@mui/material';
import {
  Dashboard, Description, Work,
  Settings, Logout, Menu as MenuIcon,
  Person, VerifiedUser, Email, LocationOn, Favorite, WorkspacePremium,
  ChevronLeft,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const DRAWER_WIDTH = 256;

const navItems = [
  { label: 'Dashboard', icon: <Dashboard />,  path: '/dashboard', emoji: '⚡' },
  { label: 'Templates', icon: <Description />, path: '/templates', emoji: '📋' },
  { label: 'Jobs',      icon: <Work />,        path: '/jobs',      emoji: '🚀' },
  { label: 'Settings',  icon: <Settings />,    path: '/settings',  emoji: '⚙️' },
];

export default function AppLayout() {
  const [open, setOpen]   = useState(true);
  const navigate          = useNavigate();
  const location          = useLocation();
  const { user, logout }  = useAuthStore();
  const theme             = useTheme();
  const isMobile          = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  React.useEffect(() => { if (isMobile) setOpen(false); }, [isMobile]);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const freeLimit    = user?.free_limit ?? 2;
  const jobsUsed     = user?.jobs_used ?? 0;
  const isSubscribed = user?.is_subscribed ?? false;
  const isAdmin      = user?.is_admin ?? false;
  const hitLimit     = !isAdmin && !isSubscribed && jobsUsed >= freeLimit;

  const sidebarBg = 'linear-gradient(180deg, #0f0c29 0%, #1a1042 50%, #24105a 100%)';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f1f5f9' }}>

      {/* ── Sidebar ── */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={open} onClose={() => setOpen(false)}
        sx={{
          width: open ? DRAWER_WIDTH : 0, flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH, boxSizing: 'border-box',
            background: sidebarBg,
            border: 'none',
            boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ px: 3, py: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: 2,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 4px 12px rgba(99,102,241,0.5)',
            flexShrink: 0,
          }}>📄</Box>
          <Box>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>
              MultiPDF
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              ToExcel
            </Typography>
          </Box>
          <IconButton
            onClick={() => setOpen(false)}
            sx={{ ml: 'auto', color: 'rgba(255,255,255,0.3)', '&:hover': { color: 'white' }, p: 0.5 }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ px: 2, mb: 1 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, px: 1 }}>
            NAVIGATION
          </Typography>
        </Box>

        {/* Nav items */}
        <List sx={{ px: 2, pb: 0 }}>
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <ListItemButton key={item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2, mb: 0.5, py: 1.2,
                  background: active
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.8), rgba(139,92,246,0.6))'
                    : 'transparent',
                  boxShadow: active ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                  '&:hover': {
                    background: active
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(139,92,246,0.7))'
                      : 'rgba(255,255,255,0.06)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? 'white' : 'rgba(255,255,255,0.45)' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14, fontWeight: active ? 700 : 500,
                    color: active ? 'white' : 'rgba(255,255,255,0.6)',
                  }}
                />
                {active && (
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'white', opacity: 0.9 }} />
                )}
              </ListItemButton>
            );
          })}
        </List>

        {/* Bottom user section */}
        <Box sx={{ mt: 'auto', px: 2, pb: 2 }}>
          {!isAdmin && !isSubscribed && (
            <Box sx={{
              p: 2, mb: 2, borderRadius: 2,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 700, mb: 0.5 }}>
                {hitLimit ? '🔒 Limit reached' : `☕ ${Math.max(0, freeLimit - jobsUsed)} free jobs left`}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, mb: 1.5 }}>
                Support for $10 → unlimited access
              </Typography>
              <Button fullWidth size="small" onClick={() => navigate('/pricing')}
                sx={{
                  borderRadius: 1.5, fontSize: 11, fontWeight: 700, py: 0.7,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white', '&:hover': { opacity: 0.9 },
                }}>
                Unlock Access
              </Button>
            </Box>
          )}

          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              p: 1.5, borderRadius: 2, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              '&:hover': { background: 'rgba(255,255,255,0.09)' },
              transition: 'all 0.15s',
            }}
          >
            <Avatar src={user?.avatar_url}
              sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ color: 'white', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }} noWrap>
                {user?.full_name?.split(' ')[0] ?? 'User'}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }} noWrap>
                {isAdmin ? 'Admin' : isSubscribed ? 'Supporter' : 'Free'}
              </Typography>
            </Box>
            {isSubscribed && <WorkspacePremium sx={{ fontSize: 16, color: '#fbbf24' }} />}
          </Box>
        </Box>
      </Drawer>

      {/* ── Profile popover ── */}
      <Popover
        open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: { borderRadius: 3, width: 300, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' } }}
      >
        <Box sx={{ background: 'linear-gradient(135deg, #0f0c29, #302b63)', px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={user?.avatar_url}
            sx={{ width: 52, height: 52, fontSize: 20, fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: '2px solid rgba(255,255,255,0.3)' }}>
            {initials}
          </Avatar>
          <Box sx={{ color: 'white', minWidth: 0 }}>
            <Typography fontWeight={700} fontSize={15} noWrap>{user?.full_name || 'No name set'}</Typography>
            <Typography fontSize={12} sx={{ opacity: 0.6 }} noWrap>{user?.email}</Typography>
          </Box>
        </Box>
        <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <InfoRow icon={<Email sx={{ fontSize: 15 }} />} label="Email" value={user?.email ?? '—'} />
          <InfoRow icon={<VerifiedUser sx={{ fontSize: 15 }} />} label="Status" value={
            isAdmin ? 'Admin' : isSubscribed ? 'Supporter ⭐' : `${Math.max(0, freeLimit - jobsUsed)}/${freeLimit} free`
          } />
        </Box>
        <Divider />
        <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1 }}>
          {!isSubscribed && !isAdmin && (
            <Button size="small" variant="outlined" startIcon={<Favorite sx={{ fontSize: 13 }} />}
              onClick={() => { setAnchorEl(null); navigate('/pricing'); }}
              sx={{ flex: 1, borderRadius: 2, fontSize: 11, borderColor: '#f59e0b', color: '#d97706' }}>
              Support ☕
            </Button>
          )}
          <Button size="small" variant="outlined" startIcon={<Logout sx={{ fontSize: 13 }} />}
            onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}
            sx={{ flex: 1, borderRadius: 2, fontSize: 11, borderColor: '#ef4444', color: '#ef4444' }}>
            Logout
          </Button>
        </Box>
      </Popover>

      {/* ── Top bar ── */}
      <Box sx={{
        position: 'fixed', top: 0, left: open ? DRAWER_WIDTH : 0, right: 0, zIndex: 1100,
        height: 60, bgcolor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', px: 3, gap: 2,
        transition: 'left 0.2s ease',
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        {(!open || isMobile) && (
          <IconButton onClick={() => setOpen(true)} size="small" sx={{ color: '#64748b' }}>
            <MenuIcon fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }} />

        {isSubscribed && (
          <Chip icon={<WorkspacePremium sx={{ fontSize: 13 }} />} label="Supporter"
            size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: 11 }} />
        )}
        {isAdmin && (
          <Chip label="Admin" size="small"
            sx={{ bgcolor: '#ede9fe', color: '#5b21b6', fontWeight: 700, fontSize: 11 }} />
        )}

        <Tooltip title="Profile">
          <Avatar src={user?.avatar_url}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              width: 34, height: 34, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              '&:hover': { boxShadow: '0 0 0 3px rgba(99,102,241,0.25)' },
              transition: 'box-shadow 0.2s',
            }}>
            {initials}
          </Avatar>
        </Tooltip>
      </Box>

      {/* ── Main content ── */}
      <Box component="main" sx={{
        flexGrow: 1,
        ml: open && !isMobile ? `${DRAWER_WIDTH}px` : 0,
        mt: '60px',
        transition: 'margin 0.2s ease',
        p: { xs: 2, md: 3.5 },
        minHeight: 'calc(100vh - 60px)',
        bgcolor: '#f1f5f9',
      }}>
        <Outlet />
      </Box>
    </Box>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ color: '#9ca3af' }}>{icon}</Box>
      <Typography fontSize={12} color="text.secondary" sx={{ width: 50, flexShrink: 0 }}>{label}</Typography>
      <Typography fontSize={13} fontWeight={500} noWrap sx={{ flex: 1 }}>{value}</Typography>
    </Box>
  );
}
