import React, { useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText, Avatar,
  Tooltip, Divider, useTheme, useMediaQuery,
  Popover, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Chip,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, Description, Work,
  Settings, Logout, ChevronLeft, Edit, Person,
  VerifiedUser, Email, LocationOn,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Dashboard', icon: <Dashboard />,  path: '/dashboard' },
  { label: 'Templates', icon: <Description />, path: '/templates' },
  { label: 'Jobs',      icon: <Work />,        path: '/jobs' },
  { label: 'Settings',  icon: <Settings />,    path: '/settings' },
];

export default function AppLayout() {
  const [open, setOpen]         = useState(true);
  const navigate                = useNavigate();
  const location                = useLocation();
  const { user, logout, fetchMe } = useAuthStore();
  const theme                   = useTheme();
  const isMobile                = useMediaQuery(theme.breakpoints.down('md'));

  // Profile popover
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const profileOpen             = Boolean(anchorEl);

  // Edit dialog
  const [editOpen,     setEditOpen]     = useState(false);
  const [editName,     setEditName]     = useState('');
  const [editAvatar,   setEditAvatar]   = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState('');

  React.useEffect(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);

  const openEdit = () => {
    setEditName(user?.full_name ?? '');
    setEditAvatar(user?.avatar_url ?? '');
    setEditLocation(user?.location ?? '');
    setSaveError('');
    setAnchorEl(null);
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setSaving(true); setSaveError('');
    try {
      await api.patch('/users/me', {
        full_name:  editName.trim()     || undefined,
        avatar_url: editAvatar.trim()   || undefined,
        location:   editLocation.trim() || undefined,
      });
      await fetchMe();
      setEditOpen(false);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── AppBar ── */}
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setOpen(!open)} sx={{ mr: 2 }}>
            {open ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, color: '#667eea' }}>
            DocuExtract
          </Typography>

          {/* Avatar — opens profile popover */}
          <Tooltip title="Your profile">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0, ml: 1 }}>
              <Avatar
                src={user?.avatar_url}
                sx={{ bgcolor: '#667eea', width: 36, height: 36, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
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

      {/* ── Profile popover ── */}
      <Popover
        open={profileOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { borderRadius: 3, width: 300, mt: 0.5, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' } }}
      >
        {/* Header band */}
        <Box sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={user?.avatar_url}
            sx={{ width: 54, height: 54, fontSize: 20, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.6)' }}
          >
            {initials}
          </Avatar>
          <Box sx={{ color: 'white', minWidth: 0 }}>
            <Typography fontWeight={700} fontSize={15} noWrap>
              {user?.full_name || 'No name set'}
            </Typography>
            <Typography fontSize={12} sx={{ opacity: 0.85 }} noWrap>{user?.email}</Typography>
          </Box>
        </Box>

        {/* Info rows */}
        <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <InfoRow icon={<Person sx={{ fontSize: 16 }} />} label="Name" value={user?.full_name || '—'} />
          <InfoRow icon={<Email  sx={{ fontSize: 16 }} />} label="Email" value={user?.email ?? '—'} />
          {user?.location && (
            <InfoRow icon={<LocationOn sx={{ fontSize: 16 }} />} label="Location" value={user.location} />
          )}
          <InfoRow icon={<VerifiedUser sx={{ fontSize: 16 }} />} label="Role" value={
            <Chip label={user?.role ?? '—'} size="small" sx={{ height: 20, fontSize: 11, textTransform: 'capitalize' }} />
          } />
          <InfoRow icon={<VerifiedUser sx={{ fontSize: 16 }} />} label="Account" value={
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {user?.auth_provider === 'google' && (
                <Chip label="Google" size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#fff3e0', color: '#e65100' }} />
              )}
              {user?.is_verified
                ? <Chip label="Verified" size="small" color="success" sx={{ height: 20, fontSize: 11 }} />
                : <Chip label="Unverified" size="small" color="warning" sx={{ height: 20, fontSize: 11 }} />
              }
            </Box>
          } />
        </Box>

        <Divider />

        {/* Actions */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1 }}>
          <Button
            fullWidth variant="outlined" size="small" startIcon={<Edit sx={{ fontSize: 15 }} />}
            onClick={openEdit}
            sx={{ borderRadius: 2, fontSize: 12, borderColor: '#667eea', color: '#667eea', '&:hover': { borderColor: '#667eea', bgcolor: '#667eea08' } }}
          >
            Edit Profile
          </Button>
          <Button
            fullWidth variant="outlined" size="small" startIcon={<Logout sx={{ fontSize: 15 }} />}
            onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}
            sx={{ borderRadius: 2, fontSize: 12, borderColor: '#ef4444', color: '#ef4444', '&:hover': { borderColor: '#ef4444', bgcolor: '#ef444408' } }}
          >
            Logout
          </Button>
        </Box>
      </Popover>

      {/* ── Edit Profile dialog ── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} PaperProps={{ sx: { borderRadius: 3, width: 420 } }}>
        <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>Edit Profile</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
          {/* Avatar preview */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={editAvatar || undefined} sx={{ width: 56, height: 56, bgcolor: '#667eea', fontSize: 20, fontWeight: 700 }}>
              {initials}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Profile photo URL</Typography>
              <TextField
                size="small" fullWidth
                placeholder="https://example.com/photo.jpg"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
              />
            </Box>
          </Box>

          <TextField
            label="Full Name" size="small" fullWidth
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g. Nikhil Shelke"
          />

          <TextField
            label="Location" size="small" fullWidth
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
            placeholder="e.g. Mumbai, India"
            InputProps={{ startAdornment: <LocationOn sx={{ fontSize: 16, color: '#9ca3af', mr: 0.5 }} /> }}
          />

          <TextField
            label="Email" size="small" fullWidth
            value={user?.email ?? ''}
            disabled
            helperText="Email cannot be changed here"
          />

          {saveError && (
            <Typography color="error" fontSize={13}>{saveError}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: '#6b7280' }}>Cancel</Button>
          <Button
            variant="contained" onClick={saveProfile} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: 2 }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Drawer ── */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: open ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH, boxSizing: 'border-box',
            top: 64, height: 'calc(100% - 64px)',
          },
        }}
      >
        <List sx={{ pt: 1 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              sx={{ mx: 1, borderRadius: 2, mb: 0.5, '&.Mui-selected': { bgcolor: '#667eea20', color: '#667eea' } }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 2, mt: 'auto' }}>
          <Typography variant="caption" color="text.secondary">{user?.full_name ?? user?.email}</Typography>
          <br />
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{user?.role}</Typography>
        </Box>
      </Drawer>

      {/* ── Main content ── */}
      <Box component="main" sx={{ flexGrow: 1, mt: '64px', transition: 'margin 0.2s', p: 3, bgcolor: '#f8f9fa', minHeight: 'calc(100vh - 64px)', overflow: 'auto' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────
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
