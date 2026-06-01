import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Divider,
  Alert, Stack, Chip,
} from '@mui/material';
import { Key, Save } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [saved, setSaved] = useState<string | null>(null);

  const { data: keyStatus } = useQuery<{ anthropic: boolean; openai: boolean }>({
    queryKey: ['api-keys-status'],
    queryFn: () => api.get('/users/me/api-keys').then((r) => r.data),
  });

  const saveKeys = useMutation({
    mutationFn: () =>
      api.put('/users/me/api-keys', {
        anthropic_api_key: anthropicKey || undefined,
        openai_api_key: openaiKey || undefined,
      }),
    onSuccess: () => { setSaved('API keys saved!'); qc.invalidateQueries({ queryKey: ['api-keys-status'] }); },
  });

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/users/me', { full_name: fullName }),
    onSuccess: () => setSaved('Profile updated!'),
  });

  return (
    <Box maxWidth={700}>
      <Typography variant="h5" fontWeight={700} mb={3}>Settings</Typography>

      {saved && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(null)}>{saved}</Alert>}

      {/* Profile */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>Profile</Typography>
        <Stack spacing={2}>
          <TextField label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField label="Email" value={user?.email ?? ''} disabled />
          <Button
            variant="contained" startIcon={<Save />} onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending} sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
          >
            Save Profile
          </Button>
        </Stack>
      </Paper>

      {/* API Keys */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Key color="action" />
          <Typography variant="h6" fontWeight={600}>API Keys</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          API keys are encrypted at rest and never exposed after saving. Leave blank to keep existing.
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography fontWeight={500}>Anthropic (Claude)</Typography>
              {keyStatus?.anthropic
                ? <Chip label="Configured" color="success" size="small" />
                : <Chip label="Not set" size="small" />}
            </Box>
            <TextField
              label="Anthropic API Key"
              type="password"
              fullWidth
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
            />
          </Box>

          <Divider />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography fontWeight={500}>OpenAI</Typography>
              {keyStatus?.openai
                ? <Chip label="Configured" color="success" size="small" />
                : <Chip label="Not set" size="small" />}
            </Box>
            <TextField
              label="OpenAI API Key"
              type="password"
              fullWidth
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
          </Box>

          <Button
            variant="contained" startIcon={<Save />}
            onClick={() => saveKeys.mutate()}
            disabled={saveKeys.isPending || (!anthropicKey && !openaiKey)}
            sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
          >
            Save API Keys
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
