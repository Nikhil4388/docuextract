import React, { useState } from 'react';
import {
  Box, Typography, Button, TextField, FormControl, InputLabel,
  Select, MenuItem, FormControlLabel, Switch, Alert, CircularProgress, LinearProgress,
} from '@mui/material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ColumnTemplate, LLMProvider, StorageProvider, JobCreatePayload } from '../types';
import { useAuthStore } from '../store/authStore';

const STEPS = [
  { id: 0, label: 'Details',  icon: '📝', desc: 'Name + template' },
  { id: 1, label: 'Upload',   icon: '📂', desc: 'Select PDFs' },
  { id: 2, label: 'Model',    icon: '🤖', desc: 'AI model' },
  { id: 3, label: 'Launch',   icon: '🚀', desc: 'Review & start' },
];

const CLAUDE_MODELS = [
  { value: 'claude-sonnet-4-6',         label: 'Sonnet 4.6', tag: 'Recommended', color: '#6366f1', desc: '~6s/file · Best balance of speed & accuracy', recommended: true },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5',  tag: 'Fastest',     color: '#10b981', desc: '~3s/file · Great for bulk runs, simple docs' },
  { value: 'claude-opus-4-6',           label: 'Opus 4.6',   tag: 'Quality',     color: '#8b5cf6', desc: '~8s/file · Deep reasoning, complex docs' },
];

export default function NewJobPage() {
  const navigate     = useNavigate();
  const { user }     = useAuthStore();

  const freeLimit    = user?.free_limit ?? 2;
  const paidLimit    = user?.paid_limit ?? 20;
  const jobsUsed     = user?.jobs_used ?? 0;
  const isSubscribed = user?.is_subscribed ?? false;
  const isAdmin      = user?.is_admin ?? false;
  const hitFreeLimit = !isAdmin && !isSubscribed && jobsUsed >= freeLimit;
  const hitPaidLimit = !isAdmin && isSubscribed && jobsUsed >= paidLimit;

  // Paywall gate
  if (hitFreeLimit || hitPaidLimit) {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 8, px: 2 }}>
        <Box sx={{
          p: 5, borderRadius: '24px', textAlign: 'center',
          bgcolor: 'white', border: '1px solid #fde68a',
          boxShadow: '0 8px 32px rgba(245,158,11,0.15)',
        }}>
          <Typography sx={{ fontSize: 64, mb: 2 }}>🔒</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 900, color: '#0c0c0c', mb: 1 }}>
            {hitFreeLimit ? 'Free limit reached' : 'Limit reached'}
          </Typography>
          <Typography sx={{ color: '#64748b', mb: 1 }}>
            {hitFreeLimit ? "You've used all free extractions." : `You've used all ${paidLimit} jobs.`}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#d97706', mb: 3 }}>
            Donate $10 → Unlock 20 jobs
          </Typography>
          <Box onClick={() => navigate('/pricing')} sx={{
            py: 1.5, borderRadius: 3, cursor: 'pointer', mb: 2, textAlign: 'center',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 8px 24px rgba(245,158,11,0.35)',
            '&:hover': { opacity: 0.9, transform: 'translateY(-2px)' },
            transition: 'all 0.2s ease',
          }}>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 15 }}>☕ Donate $10 on Ko-fi</Typography>
          </Box>
          <Box onClick={() => navigate('/jobs')} sx={{ cursor: 'pointer' }}>
            <Typography sx={{ color: '#94a3b8', fontSize: 13, '&:hover': { color: '#6366f1' } }}>
              ← Back to Jobs
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  const [step, setStep] = useState(0);
  const [jobName, setJobName]           = useState('');
  const [templateId, setTemplateId]     = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [llmModel, setLlmModel]         = useState('claude-sonnet-4-6');
  const [useUserApiKey, setUseUserApiKey] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [dragOver, setDragOver]         = useState(false);

  const { data: templates } = useQuery<ColumnTemplate[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates/').then((r) => r.data),
  });

  const createJob = useMutation({
    mutationFn: (payload: JobCreatePayload) => api.post('/jobs/', payload),
    onSuccess: (res) => navigate(`/jobs/${res.data.id}`),
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed to create job'),
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const pdfs = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    setUploadedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const newOnes  = pdfs.filter((f) => !existing.has(f.name));
      return [...prev, ...newOnes];
    });
  };

  const handleSubmit = async () => {
    if (!jobName || !templateId) { setError('Job name and template are required'); return; }
    setError(null);
    let finalPath = '';
    let resolvedProvider: StorageProvider = 'local';
    if (uploadedFiles.length > 0) {
      setUploading(true);
      setUploadProgress(0);
      try {
        const BATCH_SIZE = 10;
        const sessionId  = crypto.randomUUID();
        const batches    = [];
        for (let i = 0; i < uploadedFiles.length; i += BATCH_SIZE) batches.push(uploadedFiles.slice(i, i + BATCH_SIZE));
        let completed = 0;
        const results = await Promise.all(batches.map(async (batch) => {
          const fd = new FormData();
          batch.forEach((f) => fd.append('files', f));
          fd.append('session_id', sessionId);
          const r = await api.post('/jobs/upload-files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          completed += batch.length;
          setUploadProgress(Math.round((completed / uploadedFiles.length) * 100));
          return r.data;
        }));
        finalPath        = results[0].upload_path;
        resolvedProvider = (results[0].storage_provider ?? 'local') as StorageProvider;
      } catch {
        setError('File upload failed'); setUploading(false); return;
      }
      setUploading(false);
    }
    createJob.mutate({
      name: jobName, template_id: templateId,
      storage_provider: resolvedProvider, storage_path: finalPath || undefined,
      llm_provider: 'claude' as LLMProvider, llm_model: llmModel,
      use_user_api_key: useUserApiKey,
    });
  };

  const canNext = [
    !!jobName && !!templateId,
    true,
    true,
    true,
  ];

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <style>{`
        @keyframes stepIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .step-content { animation: stepIn 0.25s ease both; }
      `}</style>

      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box onClick={() => navigate('/jobs')} sx={{
            fontSize: 13, color: '#94a3b8', cursor: 'pointer',
            '&:hover': { color: '#6366f1' }, display: 'flex', alignItems: 'center', gap: 0.5,
          }}>
            ← Jobs
          </Box>
          <Box sx={{ color: '#e2e8f0' }}>/</Box>
          <Typography sx={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>New Job</Typography>
        </Box>
        <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#0c0c0c', letterSpacing: -0.3 }}>
          New Extraction Job
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#94a3b8', mt: 0.5 }}>
          Upload your PDFs and AI will extract structured data in seconds
        </Typography>
      </Box>

      {/* Step indicators */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 4, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const done   = step > i;
          const active = step === i;
          return (
            <Box key={s.id} onClick={() => done && setStep(i)} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 2, py: 1.2, borderRadius: 3, flex: 1, minWidth: 120,
              bgcolor: active ? 'white' : done ? '#f0fdf4' : '#f8fafc',
              border: `1.5px solid ${active ? '#6366f1' : done ? '#86efac' : '#e2e8f0'}`,
              boxShadow: active ? '0 4px 16px rgba(99,102,241,0.2)' : 'none',
              cursor: done ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}>
              <Box sx={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 14 : 15,
                bgcolor: active ? '#6366f1' : done ? '#10b981' : '#f1f5f9',
              }}>
                {done ? '✓' : <span style={{ fontSize: 15 }}>{s.icon}</span>}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{
                  fontSize: 13, fontWeight: 700,
                  color: active ? '#4f46e5' : done ? '#065f46' : '#64748b',
                }} noWrap>
                  {s.label}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#94a3b8' }} noWrap>{s.desc}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Content card */}
      <Box sx={{
        bgcolor: 'white', borderRadius: '20px', p: 4,
        boxShadow: '0 4px 20px rgba(99,102,241,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.07)',
      }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}
            sx={{ mb: 3, borderRadius: 2.5 }}>{error}</Alert>
        )}

        <Box className="step-content" key={step}>
          {/* STEP 0: Details */}
          {step === 0 && (
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0c0c0c', mb: 0.5 }}>Job Details</Typography>
              <Typography sx={{ fontSize: 14, color: '#94a3b8', mb: 3 }}>Give this job a name and choose which columns to extract</Typography>
              <TextField
                label="Job Name" fullWidth value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="e.g. Invoice Extraction Q2 2025"
                sx={{ mb: 3 }}
              />
              <FormControl fullWidth>
                <InputLabel>Column Template</InputLabel>
                <Select value={templateId} label="Column Template" onChange={(e) => setTemplateId(e.target.value)}>
                  {templates?.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{t.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>{t.columns.length} column{t.columns.length !== 1 ? 's' : ''}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {templates?.length === 0 && (
                <Alert severity="warning" sx={{ mt: 2.5, borderRadius: 2.5 }}>
                  No templates found.{' '}
                  <span
                    style={{ color: '#6366f1', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => navigate('/templates')}
                  >Create one first →</span>
                </Alert>
              )}
            </Box>
          )}

          {/* STEP 1: Upload */}
          {step === 1 && (
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0c0c0c', mb: 0.5 }}>Upload PDFs</Typography>
              <Typography sx={{ fontSize: 14, color: '#94a3b8', mb: 3 }}>
                Drag and drop or click to select PDF files for extraction
              </Typography>

              {/* Drop zone */}
              <Box
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files); }}
                sx={{
                  border: `2px dashed ${dragOver ? '#6366f1' : uploadedFiles.length > 0 ? '#10b981' : '#c7d2fe'}`,
                  borderRadius: 4, p: 5, textAlign: 'center',
                  bgcolor: dragOver ? 'rgba(99,102,241,0.04)' : uploadedFiles.length > 0 ? 'rgba(16,185,129,0.03)' : '#fafbff',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  mb: 3,
                }}
                onClick={() => document.getElementById('pdf-upload')?.click()}
              >
                <Typography sx={{ fontSize: 48, mb: 1.5 }}>
                  {uploadedFiles.length > 0 ? '✅' : '📂'}
                </Typography>
                {uploadedFiles.length > 0 ? (
                  <>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#065f46', mb: 0.5 }}>
                      {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#94a3b8' }}>Click to add more PDFs</Typography>
                  </>
                ) : (
                  <>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                      Drop PDFs here or click to browse
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#94a3b8' }}>
                      Supports any PDF — scanned, digital, or mixed
                    </Typography>
                  </>
                )}
                <input id="pdf-upload" type="file" accept=".pdf" multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </Box>

              {/* File list */}
              {uploadedFiles.length > 0 && (
                <Box sx={{
                  maxHeight: 200, overflowY: 'auto',
                  bgcolor: '#f8fafc', borderRadius: 3, p: 2,
                  border: '1px solid #e2e8f0',
                }}>
                  {uploadedFiles.slice(0, 20).map((f, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.8,
                      borderBottom: i < uploadedFiles.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <Typography sx={{ fontSize: 14 }}>📄</Typography>
                      <Typography sx={{ fontSize: 13, color: '#334155', flex: 1 }} noWrap>{f.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                        {(f.size / 1024).toFixed(0)} KB
                      </Typography>
                      <Box onClick={(e) => { e.stopPropagation(); setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i)); }}
                        sx={{ color: '#94a3b8', cursor: 'pointer', fontSize: 16, '&:hover': { color: '#ef4444' }, transition: 'color 0.15s' }}>
                        ×
                      </Box>
                    </Box>
                  ))}
                  {uploadedFiles.length > 20 && (
                    <Typography sx={{ pt: 1, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                      … and {uploadedFiles.length - 20} more files
                    </Typography>
                  )}
                </Box>
              )}

              {uploading && (
                <Box sx={{ mt: 2, p: 2.5, bgcolor: '#f0f9ff', borderRadius: 3, border: '1px solid #bae6fd' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0369a1' }}>Uploading files…</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{uploadProgress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={uploadProgress}
                    sx={{ height: 6, borderRadius: 3,
                      bgcolor: '#bae6fd',
                      '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: 3 } }} />
                </Box>
              )}
            </Box>
          )}

          {/* STEP 2: Model */}
          {step === 2 && (
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0c0c0c', mb: 0.5 }}>AI Model</Typography>
              <Typography sx={{ fontSize: 14, color: '#94a3b8', mb: 3 }}>
                Choose the Claude model — faster models work great for most jobs
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                {CLAUDE_MODELS.map((m) => {
                  const selected = llmModel === m.value;
                  return (
                    <Box key={m.value}
                      onClick={() => setLlmModel(m.value)}
                      sx={{
                        p: 2.5, borderRadius: 3, cursor: 'pointer', position: 'relative',
                        border: `1.5px solid ${selected ? m.color : m.recommended ? m.color + '40' : '#e2e8f0'}`,
                        bgcolor: selected ? `${m.color}08` : 'white',
                        display: 'flex', alignItems: 'center', gap: 2.5,
                        boxShadow: selected ? `0 4px 16px ${m.color}25` : '0 1px 4px rgba(0,0,0,0.04)',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: m.color, bgcolor: `${m.color}06` },
                      }}>
                      {/* Selection radio */}
                      <Box sx={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${selected ? m.color : '#d1d5db'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {selected && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: m.color }} />}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{m.label}</Typography>
                          <Box sx={{ px: 1, py: 0.3, borderRadius: 4, bgcolor: m.color + '15' }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: m.color }}>{m.tag}</Typography>
                          </Box>
                          {m.recommended && (
                            <Box sx={{ px: 1, py: 0.3, borderRadius: 4, bgcolor: '#fef3c7', border: '1px solid #fde68a' }}>
                              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>⭐ Top pick</Typography>
                            </Box>
                          )}
                        </Box>
                        <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>{m.desc}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              <FormControlLabel
                control={<Switch checked={useUserApiKey} onChange={(e) => setUseUserApiKey(e.target.checked)} />}
                label={
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Use my own API key</Typography>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Configure in Settings → API Keys</Typography>
                  </Box>
                }
                sx={{ mx: 0, px: 2, py: 1.5, borderRadius: 3, border: '1px solid #f1f5f9',
                  width: '100%', '&:hover': { bgcolor: '#fafbff' }, transition: 'all 0.15s' }}
              />
            </Box>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0c0c0c', mb: 0.5 }}>Ready to Launch</Typography>
              <Typography sx={{ fontSize: 14, color: '#94a3b8', mb: 3 }}>Review your configuration before starting extraction</Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
                {[
                  { icon: '📝', label: 'Job Name',  value: jobName },
                  { icon: '📋', label: 'Template',  value: templates?.find((t) => t.id === templateId)?.name ?? templateId },
                  { icon: '📂', label: 'Files',     value: uploadedFiles.length > 0 ? `${uploadedFiles.length} PDF${uploadedFiles.length !== 1 ? 's' : ''} selected` : 'No files (using existing path)' },
                  { icon: '🤖', label: 'Model',     value: CLAUDE_MODELS.find((m) => m.value === llmModel)?.label ?? llmModel },
                  { icon: '🔑', label: 'API Key',   value: useUserApiKey ? 'My own key (from Settings)' : 'Default (platform key)' },
                ].map((row) => (
                  <Box key={row.label} sx={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #f1f5f9',
                  }}>
                    <Typography sx={{ fontSize: 20, flexShrink: 0 }}>{row.icon}</Typography>
                    <Typography sx={{ color: '#64748b', fontSize: 13, width: 100, flexShrink: 0 }}>{row.label}</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#334155', flex: 1 }}>{row.value}</Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{
                p: 2.5, borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))',
                border: '1px solid rgba(99,102,241,0.15)',
                mb: 3,
              }}>
                <Typography sx={{ fontSize: 13, color: '#4f46e5', fontWeight: 600 }}>
                  ⚡ AI will process all files in parallel — results typically arrive in seconds to minutes depending on volume.
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, pt: 3, borderTop: '1px solid #f1f5f9' }}>
          <Box onClick={() => step === 0 ? navigate('/jobs') : setStep((s) => s - 1)} sx={{
            px: 3, py: 1.2, borderRadius: 3, cursor: 'pointer',
            bgcolor: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
            '&:hover': { bgcolor: '#f1f5f9', color: '#334155' },
            transition: 'all 0.15s',
          }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              {step === 0 ? '← Back' : '← Previous'}
            </Typography>
          </Box>

          {step < 3 ? (
            <Box onClick={() => canNext[step] && setStep((s) => s + 1)} sx={{
              px: 4, py: 1.2, borderRadius: 3, cursor: canNext[step] ? 'pointer' : 'not-allowed',
              background: canNext[step]
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : '#e2e8f0',
              boxShadow: canNext[step] ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
              '&:hover': canNext[step] ? { opacity: 0.9, transform: 'translateY(-1px)' } : {},
              transition: 'all 0.2s ease',
            }}>
              <Typography sx={{ color: canNext[step] ? 'white' : '#94a3b8', fontWeight: 700, fontSize: 14 }}>
                Next →
              </Typography>
            </Box>
          ) : (
            <Box onClick={!createJob.isPending && !uploading ? handleSubmit : undefined} sx={{
              px: 4, py: 1.3, borderRadius: 3,
              cursor: createJob.isPending || uploading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', gap: 1.5,
              opacity: createJob.isPending || uploading ? 0.8 : 1,
              '&:hover': { opacity: 0.92, transform: 'translateY(-1px)' },
              transition: 'all 0.2s ease',
            }}>
              {(createJob.isPending || uploading) && (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              )}
              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 14 }}>
                {uploading ? `Uploading ${uploadProgress}%…` : createJob.isPending ? 'Starting…' : '🚀 Start Extraction'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
