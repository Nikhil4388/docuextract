import React, { useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText, Avatar,
  Tooltip, Divider, useTheme, useMediaQuery,
  Popover, Button, Chip, LinearProgress,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, Description, Work,
  Settings, Logout, ChevronLeft, Person,
  VerifiedUser, Email, LocationOn, Favorite, WorkspacePremium,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Dashboard', icon: <Dashboard />,  path: '/dashboard' },
  { label: 'Templates', icon: <Description />, path: '/templates' },
  { label: 'Jobs',      icon: <Work />,        path: '/jobs' },
  { label: 'Settings',  icon: <Settings />,    path: '/settings' },
];

export default function AppLayout() {
  const [open, setOpen]   = useState(true);
  const navigate          = useNavigate();
  const location          = useLocation();
  const { user, logout }  = useAuthStore();
  const theme             = useTheme();
  const isMobile          = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const profileOpen             = Boolean(anchorEl);

  React.useEffect(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const freeLimit    = user?.free_limit ?? 2;
  const jobsUsed     = user?.jobs_used ?? 0;
  const isSubscribed = user?.is_subscribed ?? false;
  const isAdmin      = user?.is_admin ?? false;
  const hitLimit     = !isAdmin && !isSubscribed && jobsUsed >= freeLimit;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── AppBar ── */}
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setOpen(!open)} sx={{ mr: 2 }}>
            {open ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, color: '#667eea' }}>
            MultiPDFToExcel
          </Typography>

          {isSubscribed ? (
            <Chip icon={<WorkspacePremium sx={{ fontSize: 14 }} />} label="Supporter"
              size="small" sx={{ mr: 1.5, bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: 11 }} />
          ) : (
            <Chip label={`${Math.max(0, freeLimit - jobsUsed)} free left`}
              size="small"
              sx={{ mr: 1.5, fontWeight: 700, fontSize: 11,
                bgcolor: hitLimit ? '#fef2f2' : '#f0fdf4',
                color: hitLimit ? '#b91c1c' : '#16a34a' }} />
          )}

          <Tooltip title="Your profile">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0, ml: 0.5 }}>
              <Avatar src={user?.avatar_url}
                sx={{ bgcolor: '#667eea', width: 36, height: 36, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Tooltip title="Logout">
            <IconButton onClick={() => { logout(); navigate('/login'); }} sx={{ ml: 0.5 }}>
              <Logout fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* ── Paywall nudge banner ── */}
      {hitLimit && (
        <Box sx={{
          position: 'fixed', top: 64, left: 0, right: 0, zIndex: theme.zIndex.drawer,
          bgcolor: '#fef9c3', borderBottom: '1px solid #fde68a',
          py: 1, px: 3, display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <Typography fontSize={13} fontWeight={600} sx={{ flex: 1, color: '#92400e' }}>
            ⚡ You've used both free extractions. Donate $10 to unlock 20 jobs.
          </Typography>
          <Button size="small" variant="contained" onClick={() => navigate('/pricing')}
            sx={{ borderRadius: 2, fontSize: 12, py: 0.5, fontWeight: 700,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            Donate $10 to Unlock
          </Button>
        </Box>
      )}

      {/* ── Profile popover ── */}
      <Popover
        open={profileOpen} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { borderRadius: 3, width: 300, mt: 0.5, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' } }}
      >
        <Box sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={user?.avatar_url}
            sx={{ width: 54, height: 54, fontSize: 20, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.6)' }}>
            {initials}
          </Avatar>
          <Box sx={{ color: 'white', minWidth: 0 }}>
            <Typography fontWeight={700} fontSize={15} noWrap>{user?.full_name || 'No name set'}</Typography>
            <Typography fontSize={12} sx={{ opacity: 0.85 }} noWrap>{user?.email}</Typography>
          </Box>
        </Box>

        <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <InfoRow icon={<Person sx={{ fontSize: 16 }} />} label="Name"  value={user?.full_name || '—'} />
          <InfoRow icon={<Email  sx={{ fontSize: 16 }} />} label="Email" value={user?.email ?? '—'} />
          {user?.location && (
            <InfoRow icon={<LocationOn sx={{ fontSize: 16 }} />} label="Location" value={user.location} />
          )}
          <InfoRow icon={<VerifiedUser sx={{ fontSize: 16 }} />} label="Account" value={
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {user?.auth_provider === 'google' && (
                <Chip label="Google" size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#fff3e0', color: '#e65100' }} />
              )}
              {isSubscribed
                ? <Chip label="Supporter ⭐" size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#fef3c7', color: '#92400e' }} />
                : <Chip label={`${Math.max(0, freeLimit - jobsUsed)}/${freeLimit} free jobs left`} size="small"
                    color={hitLimit ? 'error' : 'success'} sx={{ height: 20, fontSize: 11 }} />
              }
            </Box>
          } />

          {/* Usage bar for free users */}
          {!isSubscribed && (
            <Box>
              <LinearProgress variant="determinate" value={Math.min(100, (jobsUsed / freeLimit) * 100)}
                sx={{ height: 5, borderRadius: 3,
                  '& .MuiLinearProgress-bar': { bgcolor: hitLimit ? '#ef4444' : '#667eea' } }} />
              {hitLimit && (
                <Button fullWidth size="small" variant="contained"
                  onClick={() => { setAnchorEl(null); navigate('/pricing'); }}
                  sx={{ mt: 1.5, borderRadius: 2, fontSize: 11, fontWeight: 700,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                  Donate $10 → Unlock Unlimited
                </Button>
              )}
            </Box>
          )}
        </Box>

        <Divider />
        <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {!isSubscribed && (
            <Button fullWidth variant="outlined" size="small" startIcon={<Favorite sx={{ fontSize: 13 }} />}
              onClick={() => { setAnchorEl(null); navigate('/pricing'); }}
              sx={{ borderRadius: 2, fontSize: 12, borderColor: '#f59e0b', color: '#d97706', '&:hover': { bgcolor: '#fffbeb' } }}>
              Support the project ☕
            </Button>
          )}
          <Button fullWidth variant="outlined" size="small" startIcon={<Logout sx={{ fontSize: 15 }} />}
            onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}
            sx={{ borderRadius: 2, fontSize: 12, borderColor: '#ef4444', color: '#ef4444', '&:hover': { bgcolor: '#ef444408' } }}>
            Logout
          </Button>
        </Box>
      </Popover>

      {/* ── Drawer ── */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={open} onClose={() => setOpen(false)}
        sx={{
          width: open ? DRAWER_WIDTH : 0, flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH, boxSizing: 'border-box',
            top: hitLimit ? 100 : 64,
            height: hitLimit ? 'calc(100% - 100px)' : 'calc(100% - 64px)',
          },
        }}
      >
        <List sx={{ pt: 1 }}>
          {navItems.map((item) => (
            <ListItemButton key={item.path}
              selected={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              sx={{ mx: 1, borderRadius: 2, mb: 0.5, '&.Mui-selected': { bgcolor: '#667eea20', color: '#667eea' } }}>
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider />

        {/* Sidebar CTA */}
        {!isSubscribed && (
          <Box sx={{ p: 2, mx: 1, mb: 1, mt: 'auto', bgcolor: hitLimit ? '#fef9c3' : '#fffbeb', borderRadius: 3, border: `1px solid ${hitLimit ? '#fde68a' : '#fde68a'}` }}>
            {hitLimit ? (
              <>
                <Typography fontSize={12} fontWeight={700} mb={0.5} color="#92400e">🔒 Free limit reached</Typography>
                <Typography fontSize={11} color="text.secondary" mb={1.5}>Donate $10 to unlock 20 extraction jobs.</Typography>
                <Button fullWidth size="small" variant="contained" onClick={() => navigate('/pricing')}
                  sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}>
                  Donate $10 to Unlock
                </Button>
              </>
            ) : (
              <>
                <Typography fontSize={12} fontWeight={700} mb={0.5}>☕ {Math.max(0, freeLimit - jobsUsed)} free job{freeLimit - jobsUsed !== 1 ? 's' : ''} left</Typography>
                <Typography fontSize={11} color="text.secondary" mb={1.5}>Support us with $10 for unlimited access.</Typography>
                <Button fullWidth size="small" variant="outlined" onClick={() => navigate('/pricing')}
                  sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, borderColor: '#f59e0b', color: '#d97706' }}>
                  Support on Ko-fi
                </Button>
              </>
            )}
          </Box>
        )}

        <Box sx={{ p: 2, mt: isSubscribed ? 'auto' : 0 }}>
          <Typography variant="caption" color="text.secondary">{user?.full_name ?? user?.email}</Typography>
          <br />
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{user?.role}</Typography>
        </Box>
      </Drawer>

      {/* ── Main content ── */}
      <Box component="main" sx={{
        flexGrow: 1, mt: hitLimit ? '100px' : '64px',
        transition: 'margin 0.2s', p: 3, bgcolor: '#f8f9fa',
        minHeight: hitLimit ? 'calc(100vh - 100px)' : 'calc(100vh - 64px)',
        overflow: 'auto',
      }}>
        <Outlet />
      </Box>
    </Box>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ color: '#9ca3af', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography fontSize={12} color="text.secondary" sx={{ width: 58, flexShrink: 0 }}>{label}</Typography>
      {typeof value === 'string'
        ? <Typography fontSize={13} fontWeight={500} noWrap sx={{ flex: 1 }}>{value}</Typography>
        : value}
    </Box>
  );
}
