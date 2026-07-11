import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Vite bundles the worker; new URL resolves it at build time
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).href;
import {
  Box, Button, Paper, Typography, Grid, Card, CardContent,
  CardActions, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Chip, Stack, Alert, CircularProgress,
} from '@mui/material';
import { Add, Delete, Edit, AutoAwesome, DragIndicator, Close, CloudUpload } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ColumnTemplate, ColumnDefinition } from '../types';

const DATA_TYPES = ['text', 'number', 'date', 'boolean'];

// ── Compact column row for the right panel ────────────────────────────────────
function ColumnRow({
  col, index, onChange, onDelete,
}: {
  col: ColumnDefinition; index: number;
  onChange: (i: number, field: keyof ColumnDefinition, value: string) => void;
  onDelete: (i: number) => void;
}) {
  return (
    <Box sx={{
      display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1.5,
      p: 1.5, borderRadius: 2, bgcolor: '#fafafa', border: '1px solid #f0f0f0',
    }}>
      <DragIndicator sx={{ color: '#ccc', cursor: 'grab', mt: 1, flexShrink: 0 }} fontSize="small" />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Column Name" size="small" value={col.name}
            onChange={(e) => onChange(index, 'name', e.target.value)}
            sx={{ flex: 2 }}
          />
          <FormControl size="small" sx={{ minWidth: 90, flexShrink: 0 }}>
            <InputLabel>Type</InputLabel>
            <Select value={col.data_type} label="Type"
              onChange={(e) => onChange(index, 'data_type', e.target.value)}>
              {DATA_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
        <TextField
          label="Extraction Hint" size="small" value={col.extraction_hint ?? ''}
          onChange={(e) => onChange(index, 'extraction_hint', e.target.value)}
          placeholder="e.g. Look in the header, format: YYYY-MM-DD"
          fullWidth
        />
      </Box>
      <IconButton onClick={() => onDelete(index)} size="small" color="error" sx={{ mt: 0.5, flexShrink: 0 }}>
        <Delete fontSize="small" />
      </IconButton>
    </Box>
  );
}

// ── PDF canvas — renders first page using pdfjs-dist npm bundle (no CSP issues) ──
function PdfCanvas({ file }: { file: File }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRenderError(false);

    (async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Scale to fit ~600px wide (the panel is ~46% of a 1200px dialog)
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(600 / viewport.width, 2);
        const scaled = page.getViewport({ scale });
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) { setLoading(false); setRenderError(true); }
      }
    })();

    return () => { cancelled = true; };
  }, [file]);

  return (
    <Box sx={{
      position: 'relative', width: '100%', flex: 1, overflow: 'auto',
      bgcolor: '#525659', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      borderRadius: 2,
    }}>
      {loading && !renderError && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={28} sx={{ color: 'white' }} />
        </Box>
      )}
      {renderError ? (
        <Box sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, p: 4, textAlign: 'center', mt: 4 }}>
          Could not render preview
        </Box>
      ) : (
        <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }} />
      )}
      {pageCount > 0 && (
        <Box sx={{
          position: 'absolute', bottom: 10, right: 10,
          bgcolor: 'rgba(0,0,0,0.6)', color: 'white',
          fontSize: 11, fontWeight: 600, px: 1.2, py: 0.5, borderRadius: 1,
        }}>
          Page 1 / {pageCount}
        </Box>
      )}
    </Box>
  );
}

// ── PDF left panel ────────────────────────────────────────────────────────────
function PdfPanel({
  pdfFile, isAnalyzing, isDragActive, getRootProps, getInputProps,
}: {
  pdfFile: File | null; isAnalyzing: boolean;
  isDragActive: boolean;
  getRootProps: () => any; getInputProps: () => any;
}) {
  return (
    <Box sx={{
      width: { xs: '100%', md: '46%' }, flexShrink: 0,
      borderRight: { md: '1px solid #eee' },
      display: 'flex', flexDirection: 'column', p: 3,
      bgcolor: '#fafafa', minHeight: 500,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AutoAwesome sx={{ color: '#667eea', fontSize: 18 }} />
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" letterSpacing={0.8} sx={{ textTransform: 'uppercase', fontSize: 11 }}>
          Sample PDF · AI Column Detection
        </Typography>
      </Box>

      {pdfFile ? (
        // PDF loaded — render via pdfjs-dist (no iframe, no CSP)
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{
            flex: 1, borderRadius: 2, overflow: 'hidden',
            border: '1px solid #e0e0e0',
            minHeight: 360, display: 'flex',
          }}>
            <PdfCanvas file={pdfFile} />
          </Box>
          {/* Replace button */}
          <Box
            {...getRootProps()}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center',
              py: 1.5, border: '1.5px dashed #d0d0d0', borderRadius: 2,
              cursor: 'pointer', bgcolor: '#fff',
              '&:hover': { borderColor: '#667eea', bgcolor: '#667eea08' },
              transition: 'all 0.2s',
            }}
          >
            <input {...getInputProps()} />
            {isAnalyzing
              ? <><CircularProgress size={14} /><Typography variant="caption" sx={{ ml: 0.5 }}>Analyzing with AI…</Typography></>
              : <><CloudUpload sx={{ fontSize: 16, color: '#667eea' }} /><Typography variant="caption" color="text.secondary">Replace PDF</Typography></>
            }
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary" noWrap>{pdfFile.name}</Typography>
          </Box>
        </Box>
      ) : (
        // No PDF yet — dropzone
        <Box
          {...getRootProps()}
          sx={{
            flex: 1, border: '2px dashed', borderRadius: 3,
            borderColor: isDragActive ? '#667eea' : '#d4d4d4',
            bgcolor: isDragActive ? '#667eea08' : '#fff',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 1.5, cursor: 'pointer', minHeight: 400,
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#667eea', bgcolor: '#667eea06' },
          }}
        >
          <input {...getInputProps()} />
          {isAnalyzing ? (
            <>
              <CircularProgress sx={{ color: '#667eea' }} />
              <Typography fontWeight={500} color="text.secondary">Analyzing with AI…</Typography>
            </>
          ) : (
            <>
              <Box sx={{
                width: 120, p: 2, bgcolor: 'white', borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)', mb: 1,
              }}>
                {[100, 70, 85, 60, 90, 65, 80].map((w, i) => (
                  <Box key={i} sx={{
                    height: 6, borderRadius: 3, bgcolor: i === 3 ? '#667eea40' : '#e0e0e0',
                    width: `${w}%`, mb: 0.8,
                  }} />
                ))}
              </Box>
              <CloudUpload sx={{ fontSize: 32, color: '#667eea' }} />
              <Typography fontWeight={600} color="#374151">Drop a sample PDF</Typography>
              <Typography variant="caption" color="text.secondary">AI will detect columns automatically</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6 }}>or click to browse</Typography>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

// ── Shared button styles ──────────────────────────────────────────────────────
const btnPrimary = {
  borderRadius: '10px',
  textTransform: 'none' as const,
  fontWeight: 600,
  px: 3,
  py: 1,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
  color: 'white',
  '&:hover': {
    background: 'linear-gradient(135deg, #5a70e0 0%, #6a3f96 100%)',
    boxShadow: '0 6px 20px rgba(102,126,234,0.55)',
    transform: 'translateY(-1px)',
  },
  '&:active': { transform: 'translateY(0)' },
  transition: 'all 0.18s ease',
  '&.Mui-disabled': { background: '#e0e0e0', boxShadow: 'none', color: '#aaa' },
};

const btnSecondary = {
  borderRadius: '10px',
  textTransform: 'none' as const,
  fontWeight: 500,
  px: 2.5,
  color: '#64748b',
  border: '1.5px solid #e2e8f0',
  '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
  transition: 'all 0.15s ease',
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const qc = useQueryClient();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { name: '', description: '', data_type: 'text', extraction_hint: '' },
  ]);
  const [uploadAlert, setUploadAlert] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<number | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ColumnTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editColumns, setEditColumns] = useState<ColumnDefinition[]>([]);

  const { data: templates, isLoading } = useQuery<ColumnTemplate[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates/').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/templates/', { name: templateName, columns: columns.filter((c) => c.name) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); handleCloseCreate(); },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.put(`/templates/${editingTemplate?.id}`, {
        name: editName,
        columns: editColumns.filter((c) => c.name),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setEditOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  // Revoke object URL on unmount / change
  useEffect(() => {
    return () => { if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current); };
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // Show PDF preview immediately
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    const url = URL.createObjectURL(file);
    pdfUrlRef.current = url;
    setPdfFile(file);
    setPdfUrl(url);
    setPdfSize(file.size);

    // Analyze with AI
    setIsAnalyzing(true);
    setUploadAlert(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/templates/upload-sample', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setColumns(res.data.suggested_columns ?? []);
      setUploadAlert(`AI detected ${res.data.suggested_columns?.length ?? 0} columns. Review and adjust on the right.`);
    } catch {
      setUploadAlert('Failed to analyze PDF. Please add columns manually.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  const handleCloseCreate = () => {
    setCreateOpen(false);
    if (pdfUrlRef.current) { URL.revokeObjectURL(pdfUrlRef.current); pdfUrlRef.current = null; }
    setPdfFile(null);
    setPdfUrl(null);
    setPdfSize(null);
    setUploadAlert(null);
  };

  const updateColumn = (i: number, field: keyof ColumnDefinition, value: string) =>
    setColumns((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  const updateEditColumn = (i: number, field: keyof ColumnDefinition, value: string) =>
    setEditColumns((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  const addColumn = () => setColumns((prev) => [...prev, { name: '', data_type: 'text', extraction_hint: '' }]);
  const deleteColumn = (i: number) => setColumns((prev) => prev.filter((_, idx) => idx !== i));

  const addEditColumn = () => setEditColumns((prev) => [...prev, { name: '', data_type: 'text', extraction_hint: '' }]);
  const deleteEditColumn = (i: number) => setEditColumns((prev) => prev.filter((_, idx) => idx !== i));

  const openCreate = () => {
    setTemplateName('');
    setColumns([{ name: '', data_type: 'text', extraction_hint: '' }]);
    setUploadAlert(null);
    setCreateOpen(true);
  };

  const openEdit = (t: ColumnTemplate) => {
    setEditingTemplate(t);
    setEditName(t.name);
    setEditColumns(t.columns.map((c: any) => ({
      name: c.name ?? '', description: c.description ?? '',
      data_type: c.data_type ?? 'text', extraction_hint: c.extraction_hint ?? '',
    })));
    setEditOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Column Templates</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={btnPrimary}>
          New Template
        </Button>
      </Box>

      {isLoading ? <CircularProgress /> : (
        <Grid container spacing={2}>
          {templates?.map((t) => (
            <Grid item xs={12} sm={6} md={4} key={t.id}>
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>{t.name}</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} mt={1}>
                    {t.columns.map((c, i) => (
                      <Chip key={i} label={c.name} size="small" variant="outlined" />
                    ))}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<Edit />} onClick={() => openEdit(t)}>Edit</Button>
                  <Button size="small" color="error" startIcon={<Delete />}
                    onClick={() => deleteMutation.mutate(t.id)}>Delete</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {templates?.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                <Typography color="text.secondary">No templates yet. Create one to get started.</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── Create Dialog — Split layout ──────────────────────────────────── */}
      <Dialog
        open={createOpen} onClose={handleCloseCreate}
        maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', maxHeight: '92vh' } }}
      >
        <DialogTitle sx={{
          borderBottom: '1px solid #f0f0f0', py: 2, px: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Typography fontWeight={700} fontSize={17}>Create Column Template</Typography>
          <IconButton size="small" onClick={handleCloseCreate}><Close fontSize="small" /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 540, overflow: 'hidden' }}>
          {/* LEFT — PDF preview */}
          <PdfPanel
            pdfFile={pdfFile}
            isAnalyzing={isAnalyzing} isDragActive={isDragActive}
            getRootProps={getRootProps} getInputProps={getInputProps}
          />

          {/* RIGHT — Column config */}
          <Box sx={{ flex: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Template Name" fullWidth value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Invoice Template, Contract Fields…"
              size="small"
            />

            {uploadAlert && (
              <Alert severity="info" icon={<AutoAwesome fontSize="small" />} sx={{ py: 0.5 }}>
                {uploadAlert}
              </Alert>
            )}

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 }}>
                  Columns
                </Typography>
                <Chip label={`${columns.filter(c => c.name).length} defined`} size="small"
                  sx={{ bgcolor: '#667eea15', color: '#667eea', fontWeight: 600, fontSize: 11 }} />
              </Box>

              <Box sx={{ overflowY: 'auto', maxHeight: 340, pr: 0.5 }}>
                {columns.map((col, i) => (
                  <ColumnRow key={i} col={col} index={i} onChange={updateColumn} onDelete={deleteColumn} />
                ))}
              </Box>

              <Button startIcon={<Add />} onClick={addColumn} size="small"
                sx={{ mt: 1, color: '#667eea', textTransform: 'none' }}>
                Add Column
              </Button>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f0f0f0', gap: 1 }}>
          <Button variant="outlined" onClick={handleCloseCreate} sx={btnSecondary}>Cancel</Button>
          <Button
            variant="contained" onClick={() => createMutation.mutate()}
            disabled={!templateName || createMutation.isPending}
            sx={btnPrimary}
          >
            {createMutation.isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Create Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{
          borderBottom: '1px solid #f0f0f0', py: 2, px: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Typography fontWeight={700} fontSize={17}>Edit Template</Typography>
          <IconButton size="small" onClick={() => setEditOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Template Name" fullWidth value={editName} size="small"
            onChange={(e) => setEditName(e.target.value)} sx={{ mb: 2.5 }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 }}>
              Columns
            </Typography>
            <Chip label={`${editColumns.filter(c => c.name).length} defined`} size="small"
              sx={{ bgcolor: '#667eea15', color: '#667eea', fontWeight: 600, fontSize: 11 }} />
          </Box>

          {editColumns.map((col, i) => (
            <ColumnRow key={i} col={col} index={i} onChange={updateEditColumn} onDelete={deleteEditColumn} />
          ))}
          <Button startIcon={<Add />} onClick={addEditColumn} size="small"
            sx={{ mt: 1, color: '#667eea', textTransform: 'none' }}>
            Add Column
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid #f0f0f0', gap: 1 }}>
          <Button variant="outlined" onClick={() => setEditOpen(false)} sx={btnSecondary}>Cancel</Button>
          <Button
            variant="contained" onClick={() => updateMutation.mutate()}
            disabled={!editName || updateMutation.isPending}
            sx={btnPrimary}
          >
            {updateMutation.isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
