import React, { useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText, Avatar,
  Tooltip, Divider, useTheme, useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, Description, Work,
  Settings, Logout, ChevronLeft,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { label: 'Templates', icon: <Description />, path: '/templates' },
  { label: 'Jobs', icon: <Work />, path: '/jobs' },
  { label: 'Settings', icon: <Settings />, path: '/settings' },
];

export default function AppLayout() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  React.useEffect(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setOpen(!open)} sx={{ mr: 2 }}>
            {open ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, color: '#667eea' }}>
            DocuExtract
          </Typography>
          <Tooltip title={user?.email ?? ''}>
            <Avatar
              sx={{ bgcolor: '#667eea', cursor: 'pointer', width: 36, height: 36, fontSize: 14 }}
              src={user?.avatar_url}
            >
              {user?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase()}
            </Avatar>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton onClick={() => { logout(); navigate('/login'); }} sx={{ ml: 1 }}>
              <Logout fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: open ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: 64,
            height: 'calc(100% - 64px)',
          },
        }}
      >
        <List sx={{ pt: 1 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              sx={{
                mx: 1, borderRadius: 2, mb: 0.5,
                '&.Mui-selected': { bgcolor: '#667eea20', color: '#667eea' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 2, mt: 'auto' }}>
          <Typography variant="caption" color="text.secondary">
            {user?.full_name ?? user?.email}
          </Typography>
          <br />
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {user?.role}
          </Typography>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '64px',
          ml: open && !isMobile ? `${DRAWER_WIDTH}px` : 0,
          transition: 'margin 0.2s',
          p: 3,
          bgcolor: '#f8f9fa',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
