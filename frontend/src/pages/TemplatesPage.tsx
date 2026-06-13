import React, { useState, useCallback } from 'react';
import {
  Box, Button, Paper, Typography, Grid, Card, CardContent,
  CardActions, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Chip, Stack, Alert, CircularProgress,
} from '@mui/material';
import { Add, Delete, Edit, AutoAwesome, DragIndicator } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ColumnTemplate, ColumnDefinition } from '../types';

const DATA_TYPES = ['text', 'number', 'date', 'boolean'];

function ColumnRow({
  col,
  index,
  onChange,
  onDelete,
}: {
  col: ColumnDefinition;
  index: number;
  onChange: (i: number, field: keyof ColumnDefinition, value: string) => void;
  onDelete: (i: number) => void;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
      <DragIndicator sx={{ color: '#ccc', cursor: 'grab' }} />
      <TextField
        label="Column Name" size="small" value={col.name}
        onChange={(e) => onChange(index, 'name', e.target.value)} sx={{ flex: 1.5 }}
      />
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel>Type</InputLabel>
        <Select value={col.data_type} label="Type" onChange={(e) => onChange(index, 'data_type', e.target.value)}>
          {DATA_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField
        label="Extraction Hint" size="small" value={col.extraction_hint ?? ''}
        onChange={(e) => onChange(index, 'extraction_hint', e.target.value)} sx={{ flex: 2 }}
      />
      <IconButton onClick={() => onDelete(index)} size="small" color="error">
        <Delete fontSize="small" />
      </IconButton>
    </Box>
  );
}

export default function TemplatesPage() {
  const qc = useQueryClient();

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { name: '', description: '', data_type: 'text', extraction_hint: '' },
  ]);
  const [uploadAlert, setUploadAlert] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Edit dialog state
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setCreateOpen(false); },
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

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setIsAnalyzing(true);
    setUploadAlert(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/templates/upload-sample', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setColumns(res.data.suggested_columns ?? []);
      setUploadAlert('AI detected columns from your sample PDF. Review and adjust below.');
    } catch {
      setUploadAlert('Failed to analyze PDF. Please add columns manually.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  const updateColumn = (i: number, field: keyof ColumnDefinition, value: string) => {
    setColumns((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const updateEditColumn = (i: number, field: keyof ColumnDefinition, value: string) => {
    setEditColumns((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

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
      name: c.name ?? '',
      description: c.description ?? '',
      data_type: c.data_type ?? 'text',
      extraction_hint: c.extraction_hint ?? '',
    })));
    setEditOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Column Templates</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ borderRadius: 2 }}>
          New Template
        </Button>
      </Box>

      {isLoading
        ? <CircularProgress />
        : (
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
                    <Button size="small" startIcon={<Edit />} onClick={() => openEdit(t)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" startIcon={<Delete />}
                      onClick={() => deleteMutation.mutate(t.id)}>
                      Delete
                    </Button>
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

      {/* ── Create Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Column Template</DialogTitle>
        <DialogContent>
          <TextField
            label="Template Name" fullWidth value={templateName}
            onChange={(e) => setTemplateName(e.target.value)} sx={{ mb: 3, mt: 1 }}
          />

          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed', borderColor: isDragActive ? '#667eea' : '#ddd',
              borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', mb: 2,
              bgcolor: isDragActive ? '#667eea10' : 'transparent',
            }}
          >
            <input {...getInputProps()} />
            {isAnalyzing
              ? <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography>Analyzing PDF with AI…</Typography>
                </Box>
              : <>
                  <AutoAwesome sx={{ color: '#667eea', mb: 1 }} />
                  <Typography fontWeight={500}>Drop a sample PDF for AI column detection</Typography>
                  <Typography variant="caption" color="text.secondary">or click to browse</Typography>
                </>
            }
          </Box>

          {uploadAlert && <Alert severity="info" sx={{ mb: 2 }}>{uploadAlert}</Alert>}

          <Typography variant="subtitle2" fontWeight={600} mb={1}>Columns</Typography>
          {columns.map((col, i) => (
            <ColumnRow key={i} col={col} index={i} onChange={updateColumn} onDelete={deleteColumn} />
          ))}
          <Button startIcon={<Add />} onClick={addColumn} size="small" sx={{ mt: 1 }}>
            Add Column
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained" onClick={() => createMutation.mutate()}
            disabled={!templateName || createMutation.isPending}
          >
            {createMutation.isPending ? <CircularProgress size={20} /> : 'Create Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Template</DialogTitle>
        <DialogContent>
          <TextField
            label="Template Name" fullWidth value={editName}
            onChange={(e) => setEditName(e.target.value)} sx={{ mb: 3, mt: 1 }}
          />
          <Typography variant="subtitle2" fontWeight={600} mb={1}>Columns</Typography>
          {editColumns.map((col, i) => (
            <ColumnRow key={i} col={col} index={i} onChange={updateEditColumn} onDelete={deleteEditColumn} />
          ))}
          <Button startIcon={<Add />} onClick={addEditColumn} size="small" sx={{ mt: 1 }}>
            Add Column
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained" onClick={() => updateMutation.mutate()}
            disabled={!editName || updateMutation.isPending}
          >
            {updateMutation.isPending ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
