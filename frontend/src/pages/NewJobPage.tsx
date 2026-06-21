import React, { useState } from 'react';
import {
  Box, Button, Paper, Typography, Stepper, Step, StepLabel,
  FormControl, InputLabel, Select, MenuItem, TextField,
  FormControlLabel, Switch, Alert, CircularProgress, Grid,
  Accordion, AccordionSummary, AccordionDetails, LinearProgress,
} from '@mui/material';
import { ExpandMore, CloudUpload, SmartToy, PlayArrow, Lock, Favorite } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ColumnTemplate, LLMProvider, StorageProvider, JobCreatePayload } from '../types';
import { useAuthStore } from '../store/authStore';

const STEPS = ['Select Template', 'Configure Source', 'Select LLM', 'Review & Submit'];

const LLM_OPTIONS = [
  { value: 'claude', label: 'Claude (Anthropic)', models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'] },
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
  const { user } = useAuthStore();

  const freeLimit    = user?.free_limit ?? 2;
  const paidLimit    = user?.paid_limit ?? 20;
  const jobsUsed     = user?.jobs_used ?? 0;
  const isSubscribed = user?.is_subscribed ?? false;
  const hitFreeLimit = !isSubscribed && jobsUsed >= freeLimit;
  const hitPaidLimit = isSubscribed && jobsUsed >= paidLimit;

  // ── Paywall gate — show before any form renders ──
  if (hitFreeLimit || hitPaidLimit) {
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto', mt: 8, textAlign: 'center', px: 2 }}>
        <Paper sx={{ p: 5, borderRadius: 4, border: '2px solid #fde68a', bgcolor: '#fffbeb' }}>
          <Lock sx={{ fontSize: 56, color: '#d97706', mb: 2 }} />
          <Typography variant="h5" fontWeight={800} mb={1}>
            {hitFreeLimit ? 'Free limit reached' : 'Job limit reached'}
          </Typography>
          <Typography color="text.secondary" mb={1}>
            {hitFreeLimit
              ? `You've used both free extractions.`
              : `You've used all ${paidLimit} jobs from your donation.`}
          </Typography>
          <Typography fontWeight={700} fontSize={18} color="#92400e" mb={3}>
            Donate $10 → Unlock 20 jobs
          </Typography>
          <Button
            fullWidth variant="contained" size="large"
            startIcon={<Favorite />}
            onClick={() => navigate('/pricing')}
            sx={{ borderRadius: 3, fontWeight: 700, py: 1.5,
              bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' },
              boxShadow: '0 4px 14px rgba(245,158,11,0.4)', mb: 2 }}
          >
            Donate $10 on Ko-fi
          </Button>
          <Button fullWidth variant="text" onClick={() => navigate('/jobs')}
            sx={{ color: 'text.secondary', fontSize: 13 }}>
            ← Back to Jobs
          </Button>
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
            <Typography fontSize={12} color="#15803d">
              ✅ Already donated? Use the same email as your account on Ko-fi and your access will unlock automatically.
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  const [step, setStep] = useState(0);
  const [jobName, setJobName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [storageProvider, setStorageProvider] = useState<StorageProvider>('local');
  const [storagePath, setStoragePath] = useState('');
  const [storageCredentials, setStorageCredentials] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedStorageProvider, setUploadedStorageProvider] = useState<StorageProvider | null>(null);
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('claude');
  const [llmModel, setLlmModel] = useState('claude-sonnet-4-6');
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

  const handleSubmit = async () => {
    if (!jobName || !templateId) {
      setError('Job name and template are required');
      return;
    }
    let finalPath = storagePath;
    let resolvedProvider: StorageProvider = storageProvider;
    if (storageProvider === 'local' && uploadedFiles.length > 0) {
      setUploading(true);
      setUploadProgress(0);
      try {
        // Upload in parallel batches of 10 for speed
        const BATCH_SIZE = 10;
        const sessionId = crypto.randomUUID();
        const batches = [];
        for (let i = 0; i < uploadedFiles.length; i += BATCH_SIZE) {
          batches.push(uploadedFiles.slice(i, i + BATCH_SIZE));
        }
        let completed = 0;
        // Upload all batches in parallel to same session folder
        const results = await Promise.all(batches.map(async (batch) => {
          const formData = new FormData();
          batch.forEach((f) => formData.append('files', f));
          formData.append('session_id', sessionId);
          const res = await api.post('/jobs/upload-files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          completed += batch.length;
          setUploadProgress(Math.round((completed / uploadedFiles.length) * 100));
          return res.data;
        }));
        finalPath = results[0].upload_path;
        resolvedProvider = (results[0].storage_provider ?? 'local') as StorageProvider;
        setUploadedStorageProvider(resolvedProvider);
      } catch (e) {
        setError('File upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    createJob.mutate({
      name: jobName,
      template_id: templateId,
      storage_provider: resolvedProvider,
      storage_path: finalPath || undefined,
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
            {storageProvider === 'local' ? (
              <Box sx={{ border: '2px dashed #667eea', borderRadius: 2, p: 3, textAlign: 'center', mb: 2 }}>
                <CloudUpload sx={{ fontSize: 40, color: '#667eea', mb: 1 }} />
                <Typography mb={1}>Drag & drop PDFs or click to select</Typography>
                <input
                  type="file" accept=".pdf" multiple
                  style={{ display: 'none' }} id="pdf-upload"
                  onChange={(e) => setUploadedFiles(Array.from(e.target.files || []))}
                />
                <label htmlFor="pdf-upload">
                  <Button variant="outlined" component="span">Select PDF Files</Button>
                </label>
                {uploadedFiles.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                      ✅ {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} selected
                    </Typography>
                    {uploadedFiles.slice(0, 5).map((f) => (
                      <Typography key={f.name} variant="body2" color="text.secondary">📄 {f.name}</Typography>
                    ))}
                    {uploadedFiles.length > 5 && (
                      <Typography variant="body2" color="text.secondary">...and {uploadedFiles.length - 5} more</Typography>
                    )}
                  </Box>
                )}
                {uploading && (
                  <Box mt={2}>
                    <Typography variant="body2" mb={0.5}>Uploading... {uploadProgress}%</Typography>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                  </Box>
                )}
              </Box>
            ) : (
              <TextField
                label={storageProvider === 's3' ? 'S3 Bucket/Prefix (bucket/path)' : storageProvider === 'google_drive' ? 'Google Drive Folder ID' : 'Dropbox Folder Path'}
                fullWidth value={storagePath}
                onChange={(e) => setStoragePath(e.target.value)} sx={{ mb: 2 }}
              />
            )}
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
                startIcon={(createJob.isPending || uploading) ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                onClick={handleSubmit}
                disabled={createJob.isPending || uploading}
                sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
              >
                {uploading ? 'Uploading…' : createJob.isPending ? 'Submitting…' : 'Start Extraction'}
              </Button>
          }
        </Box>
      </Paper>
    </Box>
  );
}
