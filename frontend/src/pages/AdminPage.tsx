import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, Avatar, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment,
  Tooltip, CircularProgress, Tabs, Tab, Divider, Alert, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Switch, FormControlLabel,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { toFriendly } from '../utils/friendlyError';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  is_subscribed: boolean;
  jobs_used: number;
  max_jobs_override: number | null;
  effective_limit: number;
  total_jobs: number;
  last_seen_at: string | null;
  created_at: string;
  auth_provider: string | null;
}

interface DayStats { date: string; jobs: number }

interface Overview {
  total_users: number;
  active_users_today: number;
  total_jobs: number;
  jobs_today: number;
  subscribed_users: number;
  completed_jobs: number;
  failed_jobs: number;
  jobs_last_7_days: DayStats[];
}

interface ActivityEvent {
  id: string;
  event_type: string;
  page: string | null;
  element: string | null;
  created_at: string | null;
  user_email: string | null;
  user_name: string | null;
}

interface UserJob {
  id: string;
  name: string;
  status: string;
  total_files: number;
  processed_files: number;
  failed_files: number;
  created_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusColor(s: string): string {
  const map: Record<string, string> = {
    completed: '#10b981', failed: '#ef4444', processing: '#6366f1',
    pending: '#f59e0b', cancelled: '#94a3b8', partial: '#f97316',
  };
  return map[s] ?? '#64748b';
}

function initials(u: AdminUser): string {
  return (u.full_name ? u.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : u.email[0].toUpperCase());
}

// ── Mini bar chart ────────────────────────────────────────────────────────────

function BarChart({ data }: { data: DayStats[] }) {
  const max = Math.max(...data.map(d => d.jobs), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, height: 64, mt: 1 }}>
      {data.map((d) => (
        <Tooltip key={d.date} title={`${d.date}: ${d.jobs} jobs`} arrow>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
              width: '100%', borderRadius: '3px 3px 0 0',
              height: `${Math.max(4, (d.jobs / max) * 52)}px`,
              background: d.jobs > 0
                ? 'linear-gradient(180deg, #6366f1, #8b5cf6)'
                : 'rgba(0,0,0,0.06)',
              transition: 'height 0.4s ease',
              cursor: 'default',
              '&:hover': { opacity: 0.85 },
            }} />
            <Typography sx={{ fontSize: 9, color: '#94a3b8', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {d.date.split(' ')[1]}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color = '#6366f1', icon,
}: { label: string; value: string | number; sub?: string; color?: string; icon: string }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, flex: 1, minWidth: 140, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{
        position: 'absolute', right: 12, top: 12, fontSize: 28, opacity: 0.12,
        filter: 'grayscale(1)',
      }}>{icon}</Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, mb: 0.5 }}>
        {label.toUpperCase()}
      </Typography>
      <Typography sx={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>
        {value}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.5 }}>{sub}</Typography>
      )}
    </Paper>
  );
}

// ── Adjust Credits Dialog ─────────────────────────────────────────────────────

function AdjustCreditsDialog({
  user, open, onClose, onSaved,
}: {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Partial<AdminUser>) => void;
}) {
  const [jobsUsed, setJobsUsed] = useState('');
  const [maxOverride, setMaxOverride] = useState('');
  const [clearOverride, setClearOverride] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user) {
      setJobsUsed(String(user.jobs_used));
      setMaxOverride(user.max_jobs_override != null ? String(user.max_jobs_override) : '');
      setClearOverride(false);
      setIsSubscribed(user.is_subscribed);
      setNote('');
      setErr('');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setErr('');
    try {
      const payload: Record<string, unknown> = {
        is_subscribed: isSubscribed,
        clear_override: clearOverride,
      };
      const ju = parseInt(jobsUsed, 10);
      if (!isNaN(ju)) payload.jobs_used = ju;
      if (!clearOverride) {
        const mo = parseInt(maxOverride, 10);
        if (!isNaN(mo)) payload.max_jobs_override = mo;
      }
      if (note) payload.note = note;

      const res = await api.patch(`/admin/users/${user.id}/credits`, payload);
      onSaved({
        jobs_used: res.data.jobs_used,
        max_jobs_override: res.data.max_jobs_override ?? null,
        effective_limit: res.data.effective_limit,
        is_subscribed: res.data.is_subscribed,
      });
      onClose();
    } catch (e) {
      setErr(toFriendly(e));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 800, fontSize: 18, pb: 1 }}>
        Adjust Credits
        <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 400, mt: 0.25 }}>
          {user.full_name || user.email}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>

          {/* Current state info */}
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600, mb: 0.5 }}>Current State</Typography>
            <Typography sx={{ fontSize: 13, color: '#0c0c0c' }}>
              Jobs used: <strong>{user.jobs_used}</strong> / Effective limit: <strong>{user.effective_limit}</strong>
              {user.max_jobs_override != null && (
                <Chip label="Custom override" size="small" sx={{ ml: 1, fontSize: 10, bgcolor: '#ede9fe', color: '#7c3aed', fontWeight: 700 }} />
              )}
            </Typography>
          </Box>

          <TextField
            label="Jobs Used (reset counter)"
            type="number"
            value={jobsUsed}
            onChange={(e) => setJobsUsed(e.target.value)}
            helperText="Set to 0 to fully reset the counter"
            inputProps={{ min: 0 }}
            size="small"
            fullWidth
          />

          <Box>
            <TextField
              label="Custom Job Limit (override)"
              type="number"
              value={clearOverride ? '' : maxOverride}
              onChange={(e) => { setMaxOverride(e.target.value); setClearOverride(false); }}
              helperText={clearOverride ? 'Will be cleared → defaults restored' : 'Leave empty to keep current. Set a number for a custom limit.'}
              inputProps={{ min: 1 }}
              size="small"
              fullWidth
              disabled={clearOverride}
            />
            <FormControlLabel
              control={<Switch size="small" checked={clearOverride} onChange={(e) => { setClearOverride(e.target.checked); if (e.target.checked) setMaxOverride(''); }} />}
              label={<Typography sx={{ fontSize: 12, color: '#64748b' }}>Clear override (restore default limits)</Typography>}
              sx={{ mt: 0.5, ml: 0 }}
            />
          </Box>

          <FormControlLabel
            control={<Switch checked={isSubscribed} onChange={(e) => setIsSubscribed(e.target.checked)} />}
            label={<Typography sx={{ fontSize: 14, fontWeight: 600 }}>Mark as Supporter (paid)</Typography>}
          />

          <TextField
            label="Admin note (optional)"
            placeholder="e.g. Customer paid manually on 24 Jul"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
          />

          {err && <Alert severity="error" sx={{ fontSize: 13 }}>{err}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          sx={{ borderRadius: 2, minWidth: 110 }}
        >
          {saving ? <CircularProgress size={18} color="inherit" /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── User Detail Dialog ────────────────────────────────────────────────────────

function UserDetailDialog({
  user, open, onClose, onAdjust,
}: {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onAdjust: () => void;
}) {
  const [jobs, setJobs] = useState<UserJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    setLoading(true);
    api.get(`/admin/users/${user.id}/jobs`).then(r => setJobs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user, open]);

  if (!user) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={user.avatar_url ?? undefined} sx={{ width: 44, height: 44, bgcolor: '#6366f1', fontWeight: 800 }}>
            {initials(user)}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 17 }}>{user.full_name || '(no name)'}</Typography>
            <Typography sx={{ color: '#64748b', fontSize: 13 }}>{user.email}</Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Button variant="outlined" size="small" onClick={onAdjust} sx={{ borderRadius: 2, fontWeight: 700 }}>
              ✏️ Adjust Credits
            </Button>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Stats row */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          {[
            { label: 'Jobs Used', val: `${user.jobs_used} / ${user.effective_limit}` },
            { label: 'Status', val: user.is_subscribed ? '⭐ Supporter' : '🆓 Free' },
            { label: 'Total Jobs Created', val: user.total_jobs },
            { label: 'Joined', val: fmtDate(user.created_at) },
            { label: 'Last Active', val: timeAgo(user.last_seen_at) },
            { label: 'Auth', val: user.auth_provider ?? '—' },
          ].map(({ label, val }) => (
            <Box key={label} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', minWidth: 120 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{label.toUpperCase()}</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0c0c0c', mt: 0.25 }}>{val}</Typography>
            </Box>
          ))}
          {user.max_jobs_override != null && (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ede9fe', border: '1px solid #ddd6fe', minWidth: 120 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>CUSTOM LIMIT</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#7c3aed', mt: 0.25 }}>{user.max_jobs_override} jobs</Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />
        <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5 }}>Recent Jobs</Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
        ) : jobs.length === 0 ? (
          <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 3 }}>No jobs yet</Typography>
        ) : (
          <TableContainer component={Box}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Files</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id} hover>
                    <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{j.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={j.status}
                        size="small"
                        sx={{ fontSize: 11, fontWeight: 700, bgcolor: `${statusColor(j.status)}20`, color: statusColor(j.status) }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#64748b' }}>
                      {j.processed_files}/{j.total_files}
                      {j.failed_files > 0 && <span style={{ color: '#ef4444', marginLeft: 4 }}>({j.failed_files} failed)</span>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#64748b' }}>{timeAgo(j.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main AdminPage ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [search, setSearch] = useState('');
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [snack, setSnack] = useState('');

  // Redirect non-admins
  useEffect(() => {
    if (user && !user.is_admin) navigate('/dashboard', { replace: true });
  }, [user]);

  const fetchOverview = useCallback(async () => {
    try {
      const r = await api.get('/admin/overview');
      setOverview(r.data);
    } catch { } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchUsers = useCallback(async (q = '') => {
    setLoadingUsers(true);
    try {
      const r = await api.get('/admin/users', { params: q ? { search: q } : {} });
      setUsers(r.data);
    } catch { } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const r = await api.get('/admin/activity?limit=80');
      setActivity(r.data);
    } catch { } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); fetchUsers(); }, []);

  useEffect(() => {
    if (tab === 2 && activity.length === 0) fetchActivity();
  }, [tab]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreditsSaved = (updated: Partial<AdminUser>) => {
    if (!selectedUser) return;
    const merged = { ...selectedUser, ...updated };
    setSelectedUser(merged);
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? merged : u));
    setSnack('Credits updated successfully');
  };

  if (!user?.is_admin) return null;

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, color: '#0c0c0c', letterSpacing: -0.5 }}>
          ⚡ Admin Dashboard
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: 14, mt: 0.5 }}>
          Customer management, analytics, and credit controls
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <Tab label="Overview" sx={{ fontWeight: 700, textTransform: 'none' }} />
        <Tab label={`Customers (${users.length})`} sx={{ fontWeight: 700, textTransform: 'none' }} />
        <Tab label="Activity Feed" sx={{ fontWeight: 700, textTransform: 'none' }} />
      </Tabs>

      {/* ── TAB 0: Overview ────────────────────────────────────────────── */}
      {tab === 0 && (
        loadingOverview ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : overview ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Stat cards row 1 */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <StatCard label="Total Users" value={overview.total_users} icon="👥" color="#6366f1"
                sub={`${overview.subscribed_users} supporter${overview.subscribed_users !== 1 ? 's' : ''}`} />
              <StatCard label="Active Today" value={overview.active_users_today} icon="🔥" color="#f59e0b"
                sub="ran at least 1 job" />
              <StatCard label="Total Jobs" value={overview.total_jobs} icon="🚀" color="#10b981"
                sub={`${overview.jobs_today} today`} />
              <StatCard label="Completed" value={overview.completed_jobs} icon="✅" color="#10b981"
                sub={`${overview.failed_jobs} failed`} />
            </Box>

            {/* Chart */}
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.25 }}>Jobs — Last 7 Days</Typography>
              <Typography sx={{ fontSize: 12, color: '#94a3b8', mb: 1 }}>
                Total across all users
              </Typography>
              <BarChart data={overview.jobs_last_7_days} />
            </Paper>

            {/* Quick user list preview */}
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Recent Signups</Typography>
                <Button size="small" onClick={() => setTab(1)} sx={{ fontWeight: 700, fontSize: 12 }}>View all →</Button>
              </Box>
              {users.slice(0, 5).map((u) => (
                <Box key={u.id} onClick={() => { setSelectedUser(u); setDetailOpen(true); }}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 2, py: 1.25, px: 1.5, borderRadius: 2,
                    cursor: 'pointer', '&:hover': { bgcolor: 'rgba(99,102,241,0.05)' }, transition: 'background 0.15s',
                  }}>
                  <Avatar src={u.avatar_url ?? undefined} sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 800, bgcolor: '#6366f1' }}>
                    {initials(u)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }} noWrap>{u.full_name || u.email}</Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: 11 }} noWrap>{u.full_name ? u.email : ''}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                      {u.jobs_used}/{u.effective_limit} jobs
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>{timeAgo(u.created_at)}</Typography>
                  </Box>
                  {u.is_subscribed && <Chip label="Supporter" size="small" sx={{ fontSize: 10, fontWeight: 700, bgcolor: '#fffbeb', color: '#d97706' }} />}
                </Box>
              ))}
            </Paper>
          </Box>
        ) : (
          <Alert severity="error">Could not load overview</Alert>
        )
      )}

      {/* ── TAB 1: Customers ───────────────────────────────────────────── */}
      {tab === 1 && (
        <Box>
          <TextField
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            sx={{ mb: 2, maxWidth: 420 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">🔍</InputAdornment>,
            }}
          />

          {loadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Jobs</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Last Active</TableCell>
                      <TableCell>Joined</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((u) => {
                      const pct = Math.min(100, Math.round((u.jobs_used / Math.max(u.effective_limit, 1)) * 100));
                      return (
                        <TableRow key={u.id} hover sx={{ cursor: 'pointer' }}
                          onClick={() => { setSelectedUser(u); setDetailOpen(true); }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar src={u.avatar_url ?? undefined}
                                sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 800, bgcolor: '#6366f1' }}>
                                {initials(u)}
                              </Avatar>
                              <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{u.full_name || '—'}</Typography>
                                <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>{u.email}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                                {u.jobs_used} / {u.effective_limit}
                                {u.max_jobs_override != null && (
                                  <Tooltip title="Custom limit set by admin"><span style={{ color: '#7c3aed', marginLeft: 4 }}>✦</span></Tooltip>
                                )}
                              </Typography>
                              {/* Progress bar */}
                              <Box sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: '#e2e8f0', width: 80 }}>
                                <Box sx={{
                                  height: '100%', borderRadius: 2, width: `${pct}%`,
                                  bgcolor: pct >= 100 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#10b981',
                                  transition: 'width 0.3s ease',
                                }} />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.is_subscribed ? '⭐ Supporter' : '🆓 Free'}
                              size="small"
                              sx={{
                                fontSize: 11, fontWeight: 700,
                                bgcolor: u.is_subscribed ? '#fffbeb' : '#f1f5f9',
                                color: u.is_subscribed ? '#d97706' : '#64748b',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#64748b' }}>{timeAgo(u.last_seen_at)}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#64748b' }}>{fmtDate(u.created_at)}</TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="Adjust credits">
                              <Button size="small" variant="outlined"
                                onClick={() => { setSelectedUser(u); setAdjustOpen(true); }}
                                sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, py: 0.4, px: 1.2,
                                  borderColor: '#ddd6fe', color: '#7c3aed', bgcolor: '#faf5ff',
                                  '&:hover': { bgcolor: '#ede9fe' } }}>
                                Credits
                              </Button>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, color: '#94a3b8' }}>
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      )}

      {/* ── TAB 2: Activity Feed ───────────────────────────────────────── */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontSize: 13, color: '#64748b' }}>
              {activity.length} recent events (last 80)
            </Typography>
            <Button size="small" onClick={fetchActivity} disabled={loadingActivity} sx={{ fontWeight: 700, fontSize: 12 }}>
              {loadingActivity ? <CircularProgress size={14} /> : '↻ Refresh'}
            </Button>
          </Box>

          {loadingActivity ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : activity.length === 0 ? (
            <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <Typography sx={{ color: '#94a3b8', fontSize: 15 }}>No activity yet</Typography>
              <Typography sx={{ color: '#cbd5e1', fontSize: 13, mt: 0.5 }}>
                Events appear here once users start visiting and clicking around the portal.
              </Typography>
            </Paper>
          ) : (
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {activity.map((ev, i) => {
                const typeColor: Record<string, string> = {
                  page_view: '#6366f1', click: '#f59e0b', conversion: '#10b981',
                };
                return (
                  <Box key={ev.id} sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 2,
                    px: 2.5, py: 1.5,
                    borderBottom: i < activity.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    '&:hover': { bgcolor: 'rgba(99,102,241,0.03)' },
                  }}>
                    <Box sx={{
                      mt: 0.25, width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      bgcolor: typeColor[ev.event_type] ?? '#94a3b8',
                    }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={ev.event_type} size="small"
                          sx={{ fontSize: 10, fontWeight: 700, height: 18,
                            bgcolor: `${typeColor[ev.event_type] ?? '#94a3b8'}18`,
                            color: typeColor[ev.event_type] ?? '#94a3b8' }} />
                        {ev.element && (
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                            {ev.element}
                          </Typography>
                        )}
                        {ev.page && (
                          <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>on {ev.page}</Typography>
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.25 }}>
                        {ev.user_name || ev.user_email || 'Anonymous'}
                        {ev.user_email && ev.user_name ? ` · ${ev.user_email}` : ''}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 11, color: '#cbd5e1', flexShrink: 0 }}>
                      {timeAgo(ev.created_at)}
                    </Typography>
                  </Box>
                );
              })}
            </Paper>
          )}
        </Box>
      )}

      {/* Dialogs */}
      <UserDetailDialog
        user={selectedUser}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onAdjust={() => { setDetailOpen(false); setAdjustOpen(true); }}
      />
      <AdjustCreditsDialog
        user={selectedUser}
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        onSaved={handleCreditsSaved}
      />

      {/* Snackbar */}
      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setSnack('')} sx={{ borderRadius: 2 }}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}
