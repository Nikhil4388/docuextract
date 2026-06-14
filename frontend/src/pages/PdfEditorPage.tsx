import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Button, IconButton, Tooltip, Typography, Divider,
  CircularProgress, Paper,
} from '@mui/material';
import {
  Download, Undo, Redo, TextFields, Brush, PanTool,
  DeleteForever, NavigateBefore, NavigateNext,
  ZoomIn, ZoomOut, ArrowBack, RectangleOutlined,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { fabric } from 'fabric';
import { PDFDocument } from 'pdf-lib';

// Use the bundled worker via Vite URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

type Phase = 'upload' | 'loading' | 'editing';
type Tool  = 'select' | 'draw' | 'text' | 'highlight' | 'rect';

const DISPLAY_W = 820;
const COLORS    = ['#111827', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ffffff'];

// ─────────────────────────────────────────────────────────────────────────────
export default function PdfEditorPage() {
  const [phase,       setPhase]       = useState<Phase>('upload');
  const [fileName,    setFileName]    = useState('document');
  const [totalPages,  setTotalPages]  = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [tool,        setTool]        = useState<Tool>('select');
  const [color,       setColor]       = useState('#111827');
  const [brushSize]                   = useState(3);
  const [zoom,        setZoom]        = useState(1);
  const [canUndo,     setCanUndo]     = useState(false);
  const [canRedo,     setCanRedo]     = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Refs that don't trigger re-renders
  const canvasElRef   = useRef<HTMLCanvasElement>(null);
  const fabricRef     = useRef<fabric.Canvas | null>(null);
  const pageImgUrls   = useRef<string[]>([]);
  const pageObjects   = useRef<Record<number, object[]>>({});
  const histRef       = useRef<Record<number, { stack: object[][], cur: number }>>({});
  const isSwitching   = useRef(false);
  const currentPageRef= useRef(1);
  const toolRef       = useRef<Tool>('select');
  const colorRef      = useRef('#111827');
  const mouseHandlerRef = useRef<((e: fabric.IEvent) => void) | null>(null);

  currentPageRef.current = currentPage;
  toolRef.current        = tool;
  colorRef.current       = color;

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop: async ([file]) => {
      if (!file) return;
      setFileName(file.name.replace(/\.pdf$/i, ''));
      setPhase('loading');
      try {
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        const n   = doc.numPages;
        setTotalPages(n);

        const urls: string[] = [];
        for (let i = 1; i <= n; i++) {
          const pg = await doc.getPage(i);
          const vp = pg.getViewport({ scale: 2 });
          const c  = document.createElement('canvas');
          c.width  = vp.width;
          c.height = vp.height;
          await pg.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
          urls.push(c.toDataURL());
        }

        pageImgUrls.current  = urls;
        pageObjects.current  = {};
        histRef.current      = {};
        setCurrentPage(1);
        setPhase('editing');
      } catch (e) {
        console.error(e);
        setPhase('upload');
      }
    },
  });

  // ── Create fabric canvas when entering edit phase ─────────────────────────
  useEffect(() => {
    if (phase !== 'editing' || !canvasElRef.current) return;
    const fab = new fabric.Canvas(canvasElRef.current, { selection: true });
    fabricRef.current = fab;
    loadPage(1, fab);

    return () => { fab.dispose(); fabricRef.current = null; };
  }, [phase]);

  // ── Load annotations / background for a page ─────────────────────────────
  const loadPage = useCallback((pageNum: number, fab?: fabric.Canvas) => {
    const canvas = fab ?? fabricRef.current;
    if (!canvas) return;
    const imgUrl = pageImgUrls.current[pageNum - 1];
    if (!imgUrl) return;

    isSwitching.current = true;
    detachMouseHandler(canvas);

    fabric.Image.fromURL(imgUrl, (img: fabric.Image) => {
      const scale   = DISPLAY_W / (img.width  ?? DISPLAY_W);
      const displayH = (img.height ?? 0) * scale;

      canvas.setWidth(DISPLAY_W);
      canvas.setHeight(displayH);
      canvas.getObjects().forEach(o => canvas.remove(o));
      canvas.discardActiveObject();

      img.set({ scaleX: scale, scaleY: scale, selectable: false, evented: false });

      canvas.setBackgroundImage(img, () => {
        const saved = pageObjects.current[pageNum];
        if (saved?.length) {
          canvas.loadFromJSON(
            { version: '5.3.0', objects: saved },
            () => {
              canvas.renderAll();
              isSwitching.current = false;
              applyTool(canvas, toolRef.current, colorRef.current, brushSize);
            },
          );
        } else {
          canvas.renderAll();
          isSwitching.current = false;
          pushHist(pageNum, []);
          applyTool(canvas, toolRef.current, colorRef.current, brushSize);
        }
        updateHistFlags(pageNum);
      });
    });

    setCurrentPage(pageNum);
  }, [brushSize]);

  // ── Apply selected tool to canvas ─────────────────────────────────────────
  const applyTool = (canvas: fabric.Canvas, t: Tool, c: string, bs: number) => {
    detachMouseHandler(canvas);
    canvas.isDrawingMode = false;
    canvas.selection     = t === 'select';

    if (t === 'draw') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = c;
      canvas.freeDrawingBrush.width = bs;
      return;
    }

    if (t === 'text') {
      const h = (e: fabric.IEvent) => {
        if (e.target && e.target !== (canvas as any).backgroundImage) return;
        const p   = canvas.getPointer(e.e as MouseEvent);
        const txt = new fabric.IText('Type here…', {
          left: p.x, top: p.y, fontSize: 18, fill: c, fontFamily: 'Arial',
        });
        canvas.add(txt);
        canvas.setActiveObject(txt);
        txt.enterEditing();
        txt.selectAll();
      };
      mouseHandlerRef.current = h;
      canvas.on('mouse:down', h);
      return;
    }

    if (t === 'highlight') {
      const h = (e: fabric.IEvent) => {
        if (e.target && e.target !== (canvas as any).backgroundImage) return;
        const p = canvas.getPointer(e.e as MouseEvent);
        canvas.add(new fabric.Rect({
          left: p.x, top: p.y, width: 200, height: 28,
          fill: 'rgba(255,235,59,0.45)', stroke: 'none', strokeWidth: 0,
        }));
        canvas.renderAll();
      };
      mouseHandlerRef.current = h;
      canvas.on('mouse:down', h);
      return;
    }

    if (t === 'rect') {
      const h = (e: fabric.IEvent) => {
        if (e.target && e.target !== (canvas as any).backgroundImage) return;
        const p = canvas.getPointer(e.e as MouseEvent);
        canvas.add(new fabric.Rect({
          left: p.x, top: p.y, width: 120, height: 80,
          fill: 'transparent', stroke: c, strokeWidth: 2,
        }));
        canvas.renderAll();
      };
      mouseHandlerRef.current = h;
      canvas.on('mouse:down', h);
    }
  };

  const detachMouseHandler = (canvas: fabric.Canvas) => {
    if (mouseHandlerRef.current) {
      canvas.off('mouse:down', mouseHandlerRef.current);
      mouseHandlerRef.current = null;
    }
  };

  // Re-apply tool when it changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || phase !== 'editing') return;
    applyTool(canvas, tool, color, brushSize);
  }, [tool, color, brushSize, phase]);

  // ── History ───────────────────────────────────────────────────────────────
  const pushHist = (pageNum: number, objs: object[]) => {
    const h = histRef.current[pageNum] ?? { stack: [], cur: -1 };
    h.stack  = h.stack.slice(0, h.cur + 1);
    h.stack.push([...objs]);
    h.cur    = h.stack.length - 1;
    histRef.current[pageNum] = h;
    updateHistFlags(pageNum);
  };

  const updateHistFlags = (pageNum: number) => {
    const h = histRef.current[pageNum] ?? { stack: [], cur: -1 };
    setCanUndo(h.cur > 0);
    setCanRedo(h.cur < h.stack.length - 1);
  };

  // Watch canvas changes → push history
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const onChange = () => {
      if (isSwitching.current) return;
      const objs = canvas.getObjects().map(o => o.toObject(['selectable','evented','fill','stroke','strokeWidth','fontSize','fontFamily','text']));
      pageObjects.current[currentPageRef.current] = objs;
      pushHist(currentPageRef.current, objs);
    };

    canvas.on('object:added',    onChange);
    canvas.on('object:modified', onChange);
    canvas.on('object:removed',  onChange);
    canvas.on('path:created',    onChange);

    return () => {
      canvas.off('object:added',    onChange);
      canvas.off('object:modified', onChange);
      canvas.off('object:removed',  onChange);
      canvas.off('path:created',    onChange);
    };
  }, [fabricRef.current]);

  const undo = useCallback(() => {
    const canvas = fabricRef.current;
    const h = histRef.current[currentPageRef.current];
    if (!canvas || !h || h.cur <= 0) return;
    h.cur--;
    histRef.current[currentPageRef.current] = h;
    isSwitching.current = true;
    canvas.loadFromJSON({ version: '5.3.0', objects: h.stack[h.cur] }, () => {
      canvas.renderAll();
      isSwitching.current = false;
    });
    pageObjects.current[currentPageRef.current] = h.stack[h.cur];
    updateHistFlags(currentPageRef.current);
  }, []);

  const redo = useCallback(() => {
    const canvas = fabricRef.current;
    const h = histRef.current[currentPageRef.current];
    if (!canvas || !h || h.cur >= h.stack.length - 1) return;
    h.cur++;
    histRef.current[currentPageRef.current] = h;
    isSwitching.current = true;
    canvas.loadFromJSON({ version: '5.3.0', objects: h.stack[h.cur] }, () => {
      canvas.renderAll();
      isSwitching.current = false;
    });
    pageObjects.current[currentPageRef.current] = h.stack[h.cur];
    updateHistFlags(currentPageRef.current);
  }, []);

  // ── Page nav ──────────────────────────────────────────────────────────────
  const goToPage = (n: number) => {
    const canvas = fabricRef.current;
    if (n < 1 || n > totalPages || !canvas) return;
    // save current
    pageObjects.current[currentPageRef.current] =
      canvas.getObjects().map(o => o.toObject(['selectable','evented','fill','stroke','strokeWidth','fontSize','fontFamily','text']));
    loadPage(n, canvas);
  };

  // ── Delete selected ───────────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach(o => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.renderAll();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      if (e.key === 'v') setTool('select');
      if (e.key === 'd') setTool('draw');
      if (e.key === 't') setTool('text');
      if (e.key === 'h') setTool('highlight');
      if (e.key === 'r') setTool('rect');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelected, undo, redo]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const changeZoom = (delta: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const z = Math.max(0.4, Math.min(2.5, zoom + delta));
    canvas.setZoom(z);
    setZoom(z);
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setIsDownloading(true);

    // Save current page
    pageObjects.current[currentPageRef.current] =
      canvas.getObjects().map(o => o.toObject(['selectable','evented','fill','stroke','strokeWidth','fontSize','fontFamily','text']));

    try {
      const pdfDoc = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        const imgUrl = pageImgUrls.current[i - 1];

        const dataUrl = await new Promise<string>((resolve) => {
          const el = document.createElement('canvas');
          const tempFab = new (fabric as any).StaticCanvas(el, { enableRetinaScaling: false });

          fabric.Image.fromURL(imgUrl, (img: fabric.Image) => {
            const scale   = DISPLAY_W / (img.width  ?? DISPLAY_W);
            const displayH = (img.height ?? 0) * scale;

            el.width  = DISPLAY_W;
            el.height = displayH;
            tempFab.setWidth(DISPLAY_W);
            tempFab.setHeight(displayH);

            img.set({ scaleX: scale, scaleY: scale, selectable: false, evented: false });
            tempFab.setBackgroundImage(img, () => {
              const objs = pageObjects.current[i] ?? [];
              if (objs.length > 0) {
                tempFab.loadFromJSON({ version: '5.3.0', objects: objs }, () => {
                  tempFab.renderAll();
                  setTimeout(() => { resolve(el.toDataURL('image/png')); tempFab.dispose(); }, 80);
                });
              } else {
                tempFab.renderAll();
                setTimeout(() => { resolve(el.toDataURL('image/png')); tempFab.dispose(); }, 40);
              }
            });
          });
        });

        const b64   = dataUrl.split(',')[1];
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const pngImg = await pdfDoc.embedPng(bytes);
        const pg    = pdfDoc.addPage([pngImg.width, pngImg.height]);
        pg.drawImage(pngImg, { x: 0, y: 0, width: pngImg.width, height: pngImg.height });
      }

      const out  = await pdfDoc.save();
      const url  = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${fileName}_edited.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UPLOAD UI
  // ─────────────────────────────────────────────────────────────────────────
  if (phase !== 'editing') {
    return (
      <Box sx={{ height: '72vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700}>PDF Editor</Typography>
          <Typography color="text.secondary" mt={0.5}>
            Annotate, draw, add text and highlights — then download
          </Typography>
        </Box>

        {phase === 'loading' ? (
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={52} sx={{ color: '#667eea' }} />
            <Typography mt={2} color="text.secondary">Loading PDF pages…</Typography>
          </Box>
        ) : (
          <Box
            {...getRootProps()}
            sx={{
              width: 460, border: '2px dashed',
              borderColor: isDragActive ? '#667eea' : '#d1d5db',
              borderRadius: 3, p: 7, textAlign: 'center', cursor: 'pointer',
              bgcolor: isDragActive ? '#667eea0a' : 'white',
              transition: 'all 0.2s',
              '&:hover': { borderColor: '#667eea', bgcolor: '#667eea06' },
            }}
          >
            <input {...getInputProps()} />
            <Box sx={{ fontSize: 60, lineHeight: 1, mb: 2 }}>📄</Box>
            <Typography variant="h6" fontWeight={600}>Drop your PDF here</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>or click to browse</Typography>
            <Typography variant="caption" color="text.secondary" mt={2} display="block">
              All editing is done locally in your browser — nothing is uploaded
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EDITOR UI
  // ─────────────────────────────────────────────────────────────────────────
  const toolItems: [Tool, React.ReactNode, string][] = [
    ['select',    <PanTool sx={{ fontSize: 18 }} />,          'Select / Move (V)'],
    ['draw',      <Brush sx={{ fontSize: 18 }} />,            'Freehand Draw (D)'],
    ['text',      <TextFields sx={{ fontSize: 18 }} />,       'Add Text (T)'],
    ['highlight', <span style={{ fontSize: 15, lineHeight: 1 }}>🖍</span>, 'Highlight (H)'],
    ['rect',      <RectangleOutlined sx={{ fontSize: 18 }} />, 'Rectangle (R)'],
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', overflow: 'hidden', gap: 1.5 }}>

      {/* ── Top bar ── */}
      <Paper elevation={0} sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
        border: '1px solid #e5e7eb', borderRadius: 2, flexShrink: 0,
      }}>
        <Tooltip title="Upload a new PDF">
          <IconButton size="small" onClick={() => setPhase('upload')}><ArrowBack fontSize="small" /></IconButton>
        </Tooltip>

        <Typography fontWeight={600} noWrap sx={{ flex: 1, color: '#374151', fontSize: 14 }}>
          {fileName}.pdf
        </Typography>

        {/* Page nav */}
        <IconButton size="small" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
          <NavigateBefore />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 76, textAlign: 'center', fontWeight: 500 }}>
          {currentPage} / {totalPages}
        </Typography>
        <IconButton size="small" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
          <NavigateNext />
        </IconButton>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Zoom */}
        <Tooltip title="Zoom out"><IconButton size="small" onClick={() => changeZoom(-0.15)} disabled={zoom <= 0.4}><ZoomOut fontSize="small" /></IconButton></Tooltip>
        <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'center', fontSize: 12 }}>
          {Math.round(zoom * 100)}%
        </Typography>
        <Tooltip title="Zoom in"><IconButton size="small" onClick={() => changeZoom(0.15)} disabled={zoom >= 2.5}><ZoomIn fontSize="small" /></IconButton></Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Button
          variant="contained" size="small"
          startIcon={isDownloading ? <CircularProgress size={13} color="inherit" /> : <Download />}
          onClick={handleDownload} disabled={isDownloading}
          sx={{ borderRadius: 2, px: 2, fontSize: 13 }}
        >
          {isDownloading ? 'Saving…' : 'Download PDF'}
        </Button>
      </Paper>

      <Box sx={{ display: 'flex', gap: 1.5, flex: 1, overflow: 'hidden' }}>

        {/* ── Left tool panel ── */}
        <Paper elevation={0} sx={{
          width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center',
          py: 1.5, gap: 0.5, border: '1px solid #e5e7eb', borderRadius: 2, flexShrink: 0, overflowY: 'auto',
        }}>
          {toolItems.map(([id, icon, label]) => (
            <Tooltip key={id} title={label} placement="right">
              <IconButton size="small" onClick={() => setTool(id)}
                sx={{
                  width: 36, height: 36, borderRadius: 1.5,
                  bgcolor: tool === id ? '#667eea' : 'transparent',
                  color:   tool === id ? 'white'   : '#6b7280',
                  '&:hover': { bgcolor: tool === id ? '#667eea' : '#f3f4f6' },
                }}
              >{icon}</IconButton>
            </Tooltip>
          ))}

          <Divider sx={{ width: '72%', my: 0.5 }} />

          <Tooltip title="Delete Selected (Del)" placement="right">
            <IconButton size="small" onClick={deleteSelected}
              sx={{ width: 36, height: 36, borderRadius: 1.5, color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
              <DeleteForever sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Divider sx={{ width: '72%', my: 0.5 }} />

          {/* Color swatches */}
          {COLORS.map(c => (
            <Box key={c} onClick={() => setColor(c)}
              sx={{
                width: 20, height: 20, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                border: color === c ? '2.5px solid #667eea' : `1.5px solid ${c === '#ffffff' ? '#d1d5db' : 'transparent'}`,
                transition: 'transform 0.1s',
                '&:hover': { transform: 'scale(1.25)' },
              }}
            />
          ))}

          <Divider sx={{ width: '72%', my: 0.5 }} />

          <Tooltip title="Undo (Ctrl+Z)" placement="right">
            <span>
              <IconButton size="small" onClick={undo} disabled={!canUndo}
                sx={{ width: 36, height: 36, borderRadius: 1.5 }}>
                <Undo sx={{ fontSize: 17 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)" placement="right">
            <span>
              <IconButton size="small" onClick={redo} disabled={!canRedo}
                sx={{ width: 36, height: 36, borderRadius: 1.5 }}>
                <Redo sx={{ fontSize: 17 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Paper>

        {/* ── Canvas area ── */}
        <Box sx={{
          flex: 1, overflow: 'auto', bgcolor: '#cbd5e1', borderRadius: 2,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', p: 3,
        }}>
          <Box sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.22)', display: 'inline-block', borderRadius: 1, overflow: 'hidden' }}>
            <canvas ref={canvasElRef} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
