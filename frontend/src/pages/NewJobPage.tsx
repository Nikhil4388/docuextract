import React, { useState } from 'react';
import {
  Box, Button, Paper, Typography, Stepper, Step, StepLabel,
  FormControl, InputLabel, Select, MenuItem, TextField,
  FormControlLabel, Switch, Alert, CircularProgress, Grid,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { ExpandMore, CloudUpload, SmartToy, PlayArrow } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ColumnTemplate, LLMProvider, StorageProvider, JobCreatePayload } from '../types';

const STEPS = ['Select Template', 'Configure Source', 'Select LLM', 'Review & Submit'];

const LLM_OPTIONS = [
  { value: 'claude', label: 'Claude (Anthropic)', models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-opus-4-6'] },
  { value: 'openai', label: 'OpenAI GPT', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'] },
];

const STORAGE_OPTIONS = [
  { value: 'local', label: 'Local / Uploaded Path' },
  { value: 's3', label: 'AWS S3' },
  { value: 'google_drive', label: 'Google Drive' },
  { value: 'dropbox', label: 'Dropbox' },
];

export default function NewJobPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [jobName, setJobName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [storageProvider, setStorageProvider] = useState<StorageProvider>('local');
  const [storagePath, setStoragePath] = useState('');
  const [storageCredentials, setStorageCredentials] = useState<Record<string, string>>({});
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('claude');
  const [llmModel, setLlmModel] = useState('claude-3-haiku-20240307');
  const [useUserApiKey, setUseUserApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: templates } = useQuery<ColumnTemplate[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates/').then((r) => r.data),
  });

  const createJob = useMutation({
    mutationFn: (payload: JobCreatePayload) => api.post('/jobs/', payload),
    onSuccess: (res) => navigate(`/jobs/${res.data.id}`),
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed to create job'),
  });

  const handleSubmit = () => {
    if (!jobName || !templateId) {
      setError('Job name and template are required');
      return;
    }
    createJob.mutate({
      name: jobName,
      template_id: templateId,
      storage_provider: storageProvider,
      storage_path: storagePath || undefined,
      storage_credentials: Object.keys(storageCredentials).length ? storageCredentials : undefined,
      llm_provider: llmProvider,
      llm_model: llmModel,
      use_user_api_key: useUserApiKey,
    });
  };

  const selectedLLM = LLM_OPTIONS.find((o) => o.value === llmProvider);

  const canProceed = [
    !!jobName && !!templateId,
    true, // storage is optional for local
    true, // LLM always has a default
    true,
  ];

  return (
    <Box maxWidth={800} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={3}>New Extraction Job</Typography>

      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 4, borderRadius: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {/* Step 0: Template */}
        {step === 0 && (
          <Box>
            <Typography variant="h6" mb={2}>Job Details & Template</Typography>
            <TextField
              label="Job Name" fullWidth value={jobName}
              onChange={(e) => setJobName(e.target.value)} sx={{ mb: 2 }}
              placeholder="e.g. Invoice Extraction Q2 2024"
            />
            <FormControl fullWidth>
              <InputLabel>Column Template</InputLabel>
              <Select value={templateId} label="Column Template" onChange={(e) => setTemplateId(e.target.value)}>
                {templates?.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name} ({t.columns.length} columns)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {templates?.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No templates found. <Button size="small" onClick={() => navigate('/templates')}>Create one first</Button>
              </Alert>
            )}
          </Box>
        )}

        {/* Step 1: Storage */}
        {step === 1 && (
          <Box>
            <Typography variant="h6" mb={2}>PDF Source Configuration</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Storage Provider</InputLabel>
              <Select value={storageProvider} label="Storage Provider"
                onChange={(e) => setStorageProvider(e.target.value as StorageProvider)}>
                {STORAGE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label={storageProvider === 's3' ? 'S3 Bucket/Prefix (bucket/path)' : storageProvider === 'google_drive' ? 'Google Drive Folder ID' : storageProvider === 'dropbox' ? 'Dropbox Folder Path' : 'Local Directory Path'}
              fullWidth value={storagePath}
              onChange={(e) => setStoragePath(e.target.value)} sx={{ mb: 2 }}
            />
            {storageProvider !== 'local' && (
              <Accordion sx={{ mt: 1 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography fontWeight={500}>Storage Credentials (optional)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {storageProvider === 's3' && (
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField label="AWS Access Key" fullWidth size="small"
                          onChange={(e) => setStorageCredentials((p) => ({ ...p, access_key: e.target.value }))} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="AWS Secret Key" type="password" fullWidth size="small"
                          onChange={(e) => setStorageCredentials((p) => ({ ...p, secret_key: e.target.value }))} />
                      </Grid>
                    </Grid>
                  )}
                  {storageProvider === 'dropbox' && (
                    <TextField label="Dropbox Access Token" fullWidth size="small" type="password"
                      onChange={(e) => setStorageCredentials((p) => ({ ...p, access_token: e.target.value }))} />
                  )}
                  {storageProvider === 'google_drive' && (
                    <Alert severity="info">Upload your Google service account JSON in Settings → API Keys.</Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}

        {/* Step 2: LLM */}
        {step === 2 && (
          <Box>
            <Typography variant="h6" mb={2}>LLM Configuration</Typography>
            <Grid container spacing={2}>
              {LLM_OPTIONS.map((opt) => (
                <Grid item xs={12} sm={6} key={opt.value}>
                  <Paper
                    variant="outlined"
                    onClick={() => { setLlmProvider(opt.value as LLMProvider); setLlmModel(opt.models[0]); }}
                    sx={{
                      p: 2, cursor: 'pointer', borderRadius: 2,
                      borderColor: llmProvider === opt.value ? '#667eea' : '#ddd',
                      borderWidth: llmProvider === opt.value ? 2 : 1,
                      bgcolor: llmProvider === opt.value ? '#667eea08' : 'white',
                    }}
                  >
                    <SmartToy sx={{ color: llmProvider === opt.value ? '#667eea' : '#999', mb: 0.5 }} />
                    <Typography fontWeight={600}>{opt.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Model</InputLabel>
              <Select value={llmModel} label="Model" onChange={(e) => setLlmModel(e.target.value)}>
                {selectedLLM?.models.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Switch checked={useUserApiKey} onChange={(e) => setUseUserApiKey(e.target.checked)} />}
              label="Use my own API key (configured in Settings)"
              sx={{ mt: 2 }}
            />
          </Box>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Box>
            <Typography variant="h6" mb={2}>Review & Submit</Typography>
            {[
              ['Job Name', jobName],
              ['Template', templates?.find((t) => t.id === templateId)?.name ?? templateId],
              ['Storage', STORAGE_OPTIONS.find((o) => o.value === storageProvider)?.label],
              ['Path', storagePath || '(not specified)'],
              ['LLM', selectedLLM?.label],
              ['Model', llmModel],
              ['Use Own API Key', useUserApiKey ? 'Yes' : 'No (default)'],
            ].map(([label, value]) => (
              <Box key={label as string} sx={{ display: 'flex', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                <Typography color="text.secondary" sx={{ minWidth: 180 }}>{label}</Typography>
                <Typography fontWeight={500}>{value as string}</Typography>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
          {step < STEPS.length - 1
            ? <Button variant="contained" onClick={() => setStep((s) => s + 1)} disabled={!canProceed[step]}>Next</Button>
            : <Button
                variant="contained"
                startIcon={createJob.isPending ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                onClick={handleSubmit}
                disabled={createJob.isPending}
                sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
              >
                {createJob.isPending ? 'Submitting…' : 'Start Extraction'}
              </Button>
          }
        </Box>
      </Paper>
    </Box>
  );
}
