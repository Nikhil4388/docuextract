import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Button, IconButton, Tooltip, Typography, Divider,
  CircularProgress, Paper, TextField,
} from '@mui/material';
import {
  Download, Undo, Redo, TextFields, Brush, PanTool,
  DeleteForever, NavigateBefore, NavigateNext,
  ZoomIn, ZoomOut, ArrowBack, RectangleOutlined, EditNote,
  Check, Close,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { fabric } from 'fabric';
import { PDFDocument } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'upload' | 'loading' | 'editing';
type Tool  = 'select' | 'edit-text' | 'draw' | 'add-text' | 'highlight' | 'rect';

interface TextItem {
  originalStr: string;
  currentStr:  string;
  x: number;   // display px
  y: number;   // display px (top of character box)
  width:  number;
  height: number;
  fontSize: number;
}

interface TextChange {
  x: number; y: number; width: number; height: number;
  fontSize: number; newText: string;
}

interface EditingState {
  item:  TextItem;
  index: number;
}

const DISPLAY_W = 820;
const COLORS    = ['#111827','#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7','#ffffff'];

// ─────────────────────────────────────────────────────────────────────────────
export default function PdfEditorPage() {
  const [phase,        setPhase]        = useState<Phase>('upload');
  const [fileName,     setFileName]     = useState('document');
  const [totalPages,   setTotalPages]   = useState(0);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [tool,         setTool]         = useState<Tool>('select');
  const [color,        setColor]        = useState('#111827');
  const [brushSize]                     = useState(3);
  const [zoom,         setZoom]         = useState(1);
  const [canUndo,      setCanUndo]      = useState(false);
  const [canRedo,      setCanRedo]      = useState(false);
  const [isDownloading,setIsDownloading]= useState(false);
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [editText,     setEditText]     = useState('');

  // Refs
  const canvasElRef      = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef    = useRef<HTMLDivElement>(null);
  const fabricRef        = useRef<fabric.Canvas | null>(null);
  const pdfDocRef        = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const pageImgUrls      = useRef<string[]>([]);
  const pageTextItems    = useRef<Record<number, TextItem[]>>({});
  const textChangesRef   = useRef<Record<number, TextChange[]>>({});
  const pageObjects      = useRef<Record<number, object[]>>({});
  const histRef          = useRef<Record<number, { stack: object[][], cur: number }>>({});
  const isSwitching      = useRef(false);
  const currentPageRef   = useRef(1);
  const toolRef          = useRef<Tool>('select');
  const colorRef         = useRef('#111827');
  const mouseHandlerRef  = useRef<((e: fabric.IEvent) => void) | null>(null);

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
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        pdfDocRef.current = doc;
        const n = doc.numPages;
        setTotalPages(n);

        // Render all pages to data URLs + extract text
        const urls: string[] = [];
        for (let i = 1; i <= n; i++) {
          const pg  = await doc.getPage(i);
          const vp  = pg.getViewport({ scale: 2 });
          const c   = document.createElement('canvas');
          c.width   = vp.width;
          c.height  = vp.height;
          await pg.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
          urls.push(c.toDataURL());
        }
        pageImgUrls.current  = urls;
        pageObjects.current  = {};
        histRef.current      = {};
        textChangesRef.current = {};
        pageTextItems.current  = {};
        setCurrentPage(1);
        setPhase('editing');
      } catch (e) {
        console.error(e);
        setPhase('upload');
      }
    },
  });

  // ── Extract text items for a page ─────────────────────────────────────────
  const extractTextItems = useCallback(async (pageNum: number): Promise<TextItem[]> => {
    if (pageTextItems.current[pageNum]) return pageTextItems.current[pageNum];
    const doc = pdfDocRef.current;
    if (!doc) return [];

    const pg      = await doc.getPage(pageNum);
    const natW    = pg.view[2] - pg.view[0]; // PDF page width in pts
    const displayScale = DISPLAY_W / natW;
    const displayVP = pg.getViewport({ scale: displayScale });
    const textContent = await pg.getTextContent();

    const items: TextItem[] = [];
    for (const rawItem of textContent.items as any[]) {
      if (!rawItem.str?.trim()) continue;

      // Convert PDF position to display coordinates
      const [dx, dy] = displayVP.convertToViewportPoint(
        rawItem.transform[4],
        rawItem.transform[5],
      );

      // Font height: magnitude of the y-axis column of the transform, scaled
      const pdfFontH = Math.abs(rawItem.transform[3]);
      const fontSize  = pdfFontH * displayScale;
      const itemWidth = (rawItem.width ?? 10) * displayScale;

      items.push({
        originalStr: rawItem.str,
        currentStr:  rawItem.str,
        x:      dx,
        y:      dy - fontSize,   // dy is baseline; top = baseline - height
        width:  itemWidth,
        height: fontSize * 1.15, // slight padding
        fontSize,
      });
    }

    // Merge applied changes from previous edits
    const saved = textChangesRef.current[pageNum];
    if (saved) {
      saved.forEach(change => {
        const match = items.find(it =>
          Math.abs(it.x - change.x) < 2 && Math.abs(it.y - change.y) < 2,
        );
        if (match) match.currentStr = change.newText;
      });
    }

    pageTextItems.current[pageNum] = items;
    return items;
  }, []);

  // ── Init fabric canvas when entering editing ───────────────────────────────
  useEffect(() => {
    if (phase !== 'editing' || !canvasElRef.current) return;
    const fab = new fabric.Canvas(canvasElRef.current, { selection: true });
    fabricRef.current = fab;
    loadPage(1, fab);
    return () => { fab.dispose(); fabricRef.current = null; };
  }, [phase]);

  // ── Load page ─────────────────────────────────────────────────────────────
  const loadPage = useCallback((pageNum: number, fab?: fabric.Canvas) => {
    const canvas = fab ?? fabricRef.current;
    if (!canvas) return;
    const imgUrl = pageImgUrls.current[pageNum - 1];
    if (!imgUrl) return;

    isSwitching.current = true;
    detachMouseHandler(canvas);
    setEditingState(null);

    fabric.Image.fromURL(imgUrl, (img: fabric.Image) => {
      const scale    = DISPLAY_W / (img.width  ?? DISPLAY_W);
      const displayH = (img.height ?? 0) * scale;
      canvas.setWidth(DISPLAY_W);
      canvas.setHeight(displayH);
      canvas.getObjects().forEach(o => canvas.remove(o));
      canvas.discardActiveObject();
      img.set({ scaleX: scale, scaleY: scale, selectable: false, evented: false });

      canvas.setBackgroundImage(img, () => {
        const saved = pageObjects.current[pageNum];
        const done  = () => {
          isSwitching.current = false;
          applyTool(canvas, toolRef.current, colorRef.current, brushSize);
        };
        if (saved?.length) {
          canvas.loadFromJSON({ version: '5.3.0', objects: saved }, () => {
            canvas.renderAll(); done();
          });
        } else {
          canvas.renderAll();
          pushHist(pageNum, []);
          done();
        }
        updateHistFlags(pageNum);
      });
    });

    // Pre-extract text items
    extractTextItems(pageNum);
    setCurrentPage(pageNum);
  }, [brushSize, extractTextItems]);

  // ── Apply tool ────────────────────────────────────────────────────────────
  const applyTool = (canvas: fabric.Canvas, t: Tool, c: string, bs: number) => {
    detachMouseHandler(canvas);
    canvas.isDrawingMode = false;
    canvas.selection     = t === 'select';
    canvas.defaultCursor = t === 'edit-text' ? 'text' : 'default';

    if (t === 'draw') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = c;
      canvas.freeDrawingBrush.width = bs;
      return;
    }
    if (t === 'add-text') {
      const h = (e: fabric.IEvent) => {
        if (e.target && e.target !== (canvas as any).backgroundImage) return;
        const p   = canvas.getPointer(e.e as MouseEvent);
        const txt = new fabric.IText('Type here…', { left: p.x, top: p.y, fontSize: 18, fill: c, fontFamily: 'Arial' });
        canvas.add(txt); canvas.setActiveObject(txt); txt.enterEditing(); txt.selectAll();
      };
      mouseHandlerRef.current = h; canvas.on('mouse:down', h); return;
    }
    if (t === 'highlight') {
      const h = (e: fabric.IEvent) => {
        if (e.target && e.target !== (canvas as any).backgroundImage) return;
        const p = canvas.getPointer(e.e as MouseEvent);
        canvas.add(new fabric.Rect({ left: p.x, top: p.y, width: 200, height: 24, fill: 'rgba(255,235,59,0.45)', stroke: 'none', strokeWidth: 0 }));
        canvas.renderAll();
      };
      mouseHandlerRef.current = h; canvas.on('mouse:down', h); return;
    }
    if (t === 'rect') {
      const h = (e: fabric.IEvent) => {
        if (e.target && e.target !== (canvas as any).backgroundImage) return;
        const p = canvas.getPointer(e.e as MouseEvent);
        canvas.add(new fabric.Rect({ left: p.x, top: p.y, width: 120, height: 80, fill: 'transparent', stroke: c, strokeWidth: 2 }));
        canvas.renderAll();
      };
      mouseHandlerRef.current = h; canvas.on('mouse:down', h); return;
    }
    if (t === 'edit-text') {
      canvas.selection = false;
      const h = async (e: fabric.IEvent) => {
        const pointer = canvas.getPointer(e.e as MouseEvent);
        const items   = await extractTextItems(currentPageRef.current);
        const hit     = items.findIndex(it =>
          pointer.x >= it.x - 4 && pointer.x <= it.x + it.width + 4 &&
          pointer.y >= it.y - 2  && pointer.y <= it.y + it.height + 2,
        );
        if (hit >= 0) {
          setEditingState({ item: items[hit], index: hit });
          setEditText(items[hit].currentStr);
        }
      };
      mouseHandlerRef.current = h; canvas.on('mouse:down', h);
    }
  };

  const detachMouseHandler = (canvas: fabric.Canvas) => {
    if (mouseHandlerRef.current) { canvas.off('mouse:down', mouseHandlerRef.current); mouseHandlerRef.current = null; }
  };

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || phase !== 'editing') return;
    applyTool(canvas, tool, color, brushSize);
    if (tool !== 'edit-text') setEditingState(null);
  }, [tool, color, brushSize, phase]);

  // ── Save edited text ───────────────────────────────────────────────────────
  const saveEdit = () => {
    if (!editingState) return;
    const pg    = currentPageRef.current;
    const items = pageTextItems.current[pg] || [];
    const item  = items[editingState.index];
    if (!item) return;

    item.currentStr = editText;

    // Store as a text change
    const changes = textChangesRef.current[pg] || [];
    const existing = changes.findIndex(c => Math.abs(c.x - item.x) < 2 && Math.abs(c.y - item.y) < 2);
    const change: TextChange = { x: item.x, y: item.y, width: item.width, height: item.height, fontSize: item.fontSize, newText: editText };
    if (existing >= 0) changes[existing] = change; else changes.push(change);
    textChangesRef.current[pg] = changes;

    setEditingState(null);
  };

  // ── History ───────────────────────────────────────────────────────────────
  const pushHist = (pn: number, objs: object[]) => {
    const h = histRef.current[pn] ?? { stack: [], cur: -1 };
    h.stack = h.stack.slice(0, h.cur + 1); h.stack.push([...objs]); h.cur = h.stack.length - 1;
    histRef.current[pn] = h; updateHistFlags(pn);
  };
  const updateHistFlags = (pn: number) => {
    const h = histRef.current[pn] ?? { stack: [], cur: -1 };
    setCanUndo(h.cur > 0); setCanRedo(h.cur < h.stack.length - 1);
  };

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const onChange = () => {
      if (isSwitching.current) return;
      const objs = canvas.getObjects().map(o => o.toObject(['selectable','evented','fill','stroke','strokeWidth','fontSize','fontFamily','text']));
      pageObjects.current[currentPageRef.current] = objs;
      pushHist(currentPageRef.current, objs);
    };
    canvas.on('object:added', onChange); canvas.on('object:modified', onChange);
    canvas.on('object:removed', onChange); canvas.on('path:created', onChange);
    return () => {
      canvas.off('object:added', onChange); canvas.off('object:modified', onChange);
      canvas.off('object:removed', onChange); canvas.off('path:created', onChange);
    };
  }, [fabricRef.current]);

  const undo = useCallback(() => {
    const canvas = fabricRef.current; const h = histRef.current[currentPageRef.current];
    if (!canvas || !h || h.cur <= 0) return;
    h.cur--; histRef.current[currentPageRef.current] = h; isSwitching.current = true;
    canvas.loadFromJSON({ version: '5.3.0', objects: h.stack[h.cur] }, () => { canvas.renderAll(); isSwitching.current = false; });
    pageObjects.current[currentPageRef.current] = h.stack[h.cur];
    updateHistFlags(currentPageRef.current);
  }, []);

  const redo = useCallback(() => {
    const canvas = fabricRef.current; const h = histRef.current[currentPageRef.current];
    if (!canvas || !h || h.cur >= h.stack.length - 1) return;
    h.cur++; histRef.current[currentPageRef.current] = h; isSwitching.current = true;
    canvas.loadFromJSON({ version: '5.3.0', objects: h.stack[h.cur] }, () => { canvas.renderAll(); isSwitching.current = false; });
    pageObjects.current[currentPageRef.current] = h.stack[h.cur];
    updateHistFlags(currentPageRef.current);
  }, []);

  // ── Page nav ──────────────────────────────────────────────────────────────
  const goToPage = (n: number) => {
    const canvas = fabricRef.current;
    if (n < 1 || n > totalPages || !canvas) return;
    setEditingState(null);
    pageObjects.current[currentPageRef.current] = canvas.getObjects().map(o => o.toObject());
    loadPage(n, canvas);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return;
    canvas.getActiveObjects().forEach(o => canvas.remove(o));
    canvas.discardActiveObject(); canvas.renderAll();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      if (e.key === 'v') setTool('select');
      if (e.key === 'e') setTool('edit-text');
      if (e.key === 'd') setTool('draw');
      if (e.key === 't') setTool('add-text');
      if (e.key === 'h') setTool('highlight');
      if (e.key === 'r') setTool('rect');
      if (e.key === 'Escape') setEditingState(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [deleteSelected, undo, redo]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const changeZoom = (delta: number) => {
    const canvas = fabricRef.current; if (!canvas) return;
    const z = Math.max(0.4, Math.min(2.5, zoom + delta));
    canvas.setZoom(z); setZoom(z);
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    setIsDownloading(true);
    // Save current page annotations
    const canvas = fabricRef.current;
    if (canvas) pageObjects.current[currentPageRef.current] = canvas.getObjects().map(o => o.toObject());

    try {
      const pdfDoc = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        const imgUrl = pageImgUrls.current[i - 1];

        // ── Step 1: Master canvas with PDF background ──
        const masterEl  = document.createElement('canvas');
        const bgImg     = new Image();
        await new Promise<void>(r => { bgImg.onload = () => r(); bgImg.src = imgUrl; });
        masterEl.width  = bgImg.width;
        masterEl.height = bgImg.height;
        const masterCtx = masterEl.getContext('2d')!;
        masterCtx.drawImage(bgImg, 0, 0);

        // ── Step 2: Apply text changes ──
        const scaleToFull = bgImg.width / DISPLAY_W;
        const changes     = textChangesRef.current[i] || [];
        for (const ch of changes) {
          // White-out original text area
          masterCtx.fillStyle = '#ffffff';
          masterCtx.fillRect(
            ch.x * scaleToFull,
            ch.y * scaleToFull,
            (ch.width + 8) * scaleToFull,
            ch.height * scaleToFull,
          );
          // Draw replacement text
          masterCtx.fillStyle = '#000000';
          masterCtx.font      = `${ch.fontSize * scaleToFull}px Arial`;
          masterCtx.fillText(
            ch.newText,
            ch.x * scaleToFull,
            (ch.y + ch.height * 0.82) * scaleToFull,
          );
        }

        // ── Step 3: Overlay fabric annotations (no background) ──
        const annotEl = document.createElement('canvas');
        annotEl.width  = DISPLAY_W;
        annotEl.height = bgImg.height / scaleToFull;
        const tempFab = new (fabric as any).StaticCanvas(annotEl, { enableRetinaScaling: false });
        tempFab.setWidth(DISPLAY_W); tempFab.setHeight(annotEl.height);

        const objs = pageObjects.current[i] || [];
        if (objs.length > 0) {
          await new Promise<void>(r => {
            tempFab.loadFromJSON({ version: '5.3.0', objects: objs }, () => {
              tempFab.renderAll(); setTimeout(r, 80);
            });
          });
        } else {
          await new Promise<void>(r => setTimeout(r, 30));
        }

        // Composite annotations onto master
        masterCtx.drawImage(annotEl, 0, 0, bgImg.width, bgImg.height);
        tempFab.dispose();

        // ── Step 4: Embed as PDF page ──
        const b64   = masterEl.toDataURL('image/png').split(',')[1];
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const pngImg = await pdfDoc.embedPng(bytes);
        const pg    = pdfDoc.addPage([pngImg.width, pngImg.height]);
        pg.drawImage(pngImg, { x: 0, y: 0, width: pngImg.width, height: pngImg.height });
      }

      const out  = await pdfDoc.save();
      const url  = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const a    = document.createElement('a');
      a.href     = url; a.download = `${fileName}_edited.pdf`; a.click();
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
            Edit text content, annotate, draw and highlight — then download
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
              bgcolor: isDragActive ? '#667eea0a' : 'white', transition: 'all 0.2s',
              '&:hover': { borderColor: '#667eea', bgcolor: '#667eea06' },
            }}
          >
            <input {...getInputProps()} />
            <Box sx={{ fontSize: 60, lineHeight: 1, mb: 2 }}>📄</Box>
            <Typography variant="h6" fontWeight={600}>Drop your PDF here</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>or click to browse</Typography>
            <Typography variant="caption" color="text.secondary" mt={2} display="block">
              All editing happens locally — nothing is uploaded
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
    ['edit-text', <EditNote sx={{ fontSize: 18 }} />,         'Edit PDF Text (E)'],
    ['draw',      <Brush sx={{ fontSize: 18 }} />,            'Freehand Draw (D)'],
    ['add-text',  <TextFields sx={{ fontSize: 18 }} />,       'Add Text Box (T)'],
    ['highlight', <span style={{ fontSize: 15 }}>🖍</span>,   'Highlight (H)'],
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

        <IconButton size="small" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}><NavigateBefore /></IconButton>
        <Typography variant="body2" sx={{ minWidth: 76, textAlign: 'center', fontWeight: 500 }}>
          {currentPage} / {totalPages}
        </Typography>
        <IconButton size="small" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}><NavigateNext /></IconButton>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Zoom out"><IconButton size="small" onClick={() => changeZoom(-0.15)} disabled={zoom <= 0.4}><ZoomOut fontSize="small" /></IconButton></Tooltip>
        <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'center', fontSize: 12 }}>{Math.round(zoom * 100)}%</Typography>
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

          {COLORS.map(c => (
            <Box key={c} onClick={() => setColor(c)}
              sx={{
                width: 20, height: 20, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                border: color === c ? '2.5px solid #667eea' : `1.5px solid ${c === '#ffffff' ? '#d1d5db' : 'transparent'}`,
                '&:hover': { transform: 'scale(1.25)' }, transition: 'transform 0.1s',
              }}
            />
          ))}

          <Divider sx={{ width: '72%', my: 0.5 }} />

          <Tooltip title="Undo (Ctrl+Z)" placement="right"><span>
            <IconButton size="small" onClick={undo} disabled={!canUndo} sx={{ width: 36, height: 36, borderRadius: 1.5 }}>
              <Undo sx={{ fontSize: 17 }} />
            </IconButton>
          </span></Tooltip>
          <Tooltip title="Redo (Ctrl+Y)" placement="right"><span>
            <IconButton size="small" onClick={redo} disabled={!canRedo} sx={{ width: 36, height: 36, borderRadius: 1.5 }}>
              <Redo sx={{ fontSize: 17 }} />
            </IconButton>
          </span></Tooltip>
        </Paper>

        {/* ── Canvas area ── */}
        <Box sx={{
          flex: 1, overflow: 'auto', bgcolor: '#cbd5e1', borderRadius: 2,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', p: 3,
        }}>
          <Box ref={canvasWrapRef} sx={{ position: 'relative', display: 'inline-block', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', borderRadius: 1, overflow: 'hidden' }}>
            <canvas ref={canvasElRef} />

            {/* ── Inline text editor popup ── */}
            {editingState && tool === 'edit-text' && (
              <Box sx={{
                position: 'absolute',
                left:  Math.min(editingState.item.x * zoom, DISPLAY_W * zoom - 340),
                top:   Math.max(editingState.item.y * zoom - 72, 4),
                zIndex: 50,
                bgcolor: 'white',
                border: '1.5px solid #667eea',
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(102,126,234,0.25)',
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 300,
              }}>
                <TextField
                  autoFocus
                  size="small"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingState(null); }}
                  sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 13 } }}
                  placeholder="Edit text…"
                />
                <Tooltip title="Apply (Enter)">
                  <IconButton size="small" onClick={saveEdit} sx={{ color: '#22c55e' }}><Check fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="Cancel (Esc)">
                  <IconButton size="small" onClick={() => setEditingState(null)} sx={{ color: '#ef4444' }}><Close fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
            )}

            {/* ── Edit-text mode hint ── */}
            {tool === 'edit-text' && !editingState && (
              <Box sx={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                bgcolor: 'rgba(0,0,0,0.65)', color: 'white', px: 2, py: 0.75,
                borderRadius: 5, fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap',
              }}>
                Click on any text in the PDF to edit it
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
