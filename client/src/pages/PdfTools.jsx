import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { createWorker } from 'tesseract.js';
import { useAppConfig } from '../useAppConfig';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileImage,
  FilePenLine,
  FilePlus2,
  FileText,
  FileType2,
  FileUp,
  GripVertical,
  Image as ImageIcon,
  Images,
  Layers,
  Loader2,
  PenLine,
  Scissors,
  Trash2,
  Type,
  X,
  XCircle
} from 'lucide-react';
import FeaturePageHeader from '../components/layout/FeaturePageHeader';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MM_TO_PT = 72 / 25.4;
const PREVIEW_SCALE = 1.4;

const FONT_OPTIONS = [
  { value: 'helvetica', label: 'Helvetica / Arial', css: 'Arial, Helvetica, sans-serif' },
  { value: 'courier', label: 'Courier', css: '"Courier New", Courier, monospace' },
  { value: 'times', label: 'Times New Roman', css: '"Times New Roman", Times, serif' }
];

const FONT_STANDARDS = {
  helvetica: {
    regular: StandardFonts.Helvetica,
    bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique,
    boldItalic: StandardFonts.HelveticaBoldOblique
  },
  courier: {
    regular: StandardFonts.Courier,
    bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique,
    boldItalic: StandardFonts.CourierBoldOblique
  },
  times: {
    regular: StandardFonts.TimesRoman,
    bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic,
    boldItalic: StandardFonts.TimesRomanBoldItalic
  }
};

const fontCss = (font) => FONT_OPTIONS.find((option) => option.value === font)?.css || FONT_OPTIONS[0].css;
const fontLabel = (font) => FONT_OPTIONS.find((option) => option.value === font)?.label || FONT_OPTIONS[0].label;

const dataUrlToBytes = (dataUrl) => {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { bytes, mime };
};

const cropDataUrl = (dataUrl) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 16) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0) {
      resolve('');
      return;
    }

    const padding = 4;
    const left = Math.max(0, minX - padding);
    const top = Math.max(0, minY - padding);
    const width = Math.min(canvas.width, maxX + padding + 1) - left;
    const height = Math.min(canvas.height, maxY + padding + 1) - top;
    const cropped = document.createElement('canvas');
    cropped.width = width;
    cropped.height = height;
    cropped.getContext('2d').drawImage(canvas, left, top, width, height, 0, 0, width, height);
    resolve(cropped.toDataURL('image/png'));
  };
  image.onerror = () => resolve('');
  image.src = dataUrl;
});

const hexToRgb = (hex) => {
  const value = (hex || '#000000').replace('#', '');
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  );
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadBytes = (bytes, filename) => {
  const name = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), name);
};

const parsePageRange = (value, total) => {
  const text = (value || '').trim();
  if (text === '') return Array.from({ length: total }, (_, index) => index);

  const pages = new Set();
  for (const rawPart of text.split(',')) {
    const part = rawPart.trim();
    if (!part) continue;

    if (/^\d+$/.test(part)) {
      const page = Number(part);
      if (page < 1 || page > total) throw new Error(`Halaman ${part} di luar rentang 1-${total}`);
      pages.add(page - 1);
      continue;
    }

    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end > total || start > end) throw new Error(`Rentang ${part} tidak valid untuk 1-${total}`);
      for (let page = start; page <= end; page += 1) pages.add(page - 1);
      continue;
    }

    throw new Error(`Format halaman tidak valid: ${part}`);
  }

  return Array.from(pages).sort((a, b) => a - b);
};

const safeBaseName = (value, fallback) => {
  const clean = (value || '').trim().replace(/\.(pdf|docx|zip|png|jpe?g)$/i, '').replace(/[\\/:*?"<>|]/g, '-');
  return clean || fallback;
};

const ensureExtension = (value, extension) => {
  const base = safeBaseName(value, 'hasil');
  return `${base}.${extension}`;
};

const readImageFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => resolve({
      dataUrl: reader.result,
      width: image.naturalWidth,
      height: image.naturalHeight
    });
    image.onerror = () => reject(new Error(`Gagal membaca gambar ${file.name}`));
    image.src = reader.result;
  };
  reader.onerror = () => reject(new Error(`Gagal membaca gambar ${file.name}`));
  reader.readAsDataURL(file);
});

const toJpegDataUrl = (dataUrl) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    resolve(canvas.toDataURL('image/jpeg', 0.92));
  };
  image.onerror = () => reject(new Error('Gagal mengubah gambar ke JPEG'));
  image.src = dataUrl;
});

const renderPdfPageCanvas = async (doc, pageNumber, scale) => {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const renderTask = page.render({ canvas, viewport, background: '#ffffff' });
  await renderTask.promise;
  return canvas;
};

const canvasToBlob = (canvas, mime, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Gagal membuat file gambar'))), mime, quality);
});

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const extractPdfTextPages = async (doc) => {
  const pages = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = [];

    content.items.forEach((item) => {
      const text = String(item.str || '');
      if (!text || !item.transform) return;
      const transform = item.transform;
      const y = transform[5];
      const x = transform[4];
      const size = Math.hypot(transform[2], transform[3]) || 10;
      const width = item.width || text.length * size * 0.5;
      let row = rows.find((candidate) => Math.abs(candidate.y - y) <= Math.max(0.8, size * 0.25));
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ text, x, width, size, font: item.fontName || '' });
    });

    rows.sort((first, second) => second.y - first.y);
    pages.push({
      pageNumber,
      rows: rows.map((row) => {
        const items = row.items.sort((first, second) => first.x - second.x);
        return { y: row.y, size: Math.max(...items.map((item) => item.size)), items };
      })
    });
  }
  return pages;
};

const buildTextRunXml = (item) => {
  const size = Math.max(14, Math.min(72, Math.round(item.size * 2)));
  const bold = /bold/i.test(item.font) ? '<w:b/>' : '';
  const italic = /italic|oblique/i.test(item.font) ? '<w:i/>' : '';
  return `<w:r><w:rPr>${bold}${italic}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(item.text)}</w:t></w:r>`;
};

const buildWordPageBreakXml = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

const buildWordTextBodyXml = (pages) => {
  const parts = [];
  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) parts.push(buildWordPageBreakXml());
    if (!page.rows.length) {
      parts.push('<w:p><w:r><w:t xml:space="preserve">[Halaman ini tidak memiliki teks yang dapat diekstrak]</w:t></w:r></w:p>');
      return;
    }
    page.rows.forEach((row, rowIndex) => {
      const runs = [];
      const previousRow = rowIndex > 0 ? page.rows[rowIndex - 1] : null;
      const extraGap = previousRow ? previousRow.y - row.y - Math.max(previousRow.size, row.size) * 1.15 : 0;
      const spacingBefore = Math.min(2400, Math.max(0, Math.round(extraGap * 20)));
      const left = Math.min(9000, Math.max(0, Math.round(row.items[0].x * 20)));
      row.items.forEach((item, itemIndex) => {
        if (itemIndex > 0) {
          const previous = row.items[itemIndex - 1];
          const gap = item.x - (previous.x + previous.width);
          if (gap > Math.max(previous.size, item.size) * 0.2 && !/^\s/.test(item.text) && !/\s$/.test(previous.text)) {
            runs.push('<w:r><w:t xml:space="preserve"> </w:t></w:r>');
          }
        }
        runs.push(buildTextRunXml(item));
      });
      parts.push(`<w:p><w:pPr><w:spacing w:before="${spacingBefore}" w:after="0"/><w:ind w:left="${left}"/></w:pPr>${runs.join('')}</w:p>`);
    });
  });
  return parts.join('');
};

const flattenOcrLines = (blocks, scale, fallbackText) => {
  const lines = [];
  (blocks || []).forEach((block) => {
    (block.paragraphs || []).forEach((paragraph) => {
      (paragraph.lines || []).forEach((line) => {
        const text = String(line.text || '').replace(/\s+/g, ' ').trim();
        if (!text) return;
        const bbox = line.bbox || {};
        const size = Math.max(7, Math.min(24, ((bbox.y1 - bbox.y0) || 12) / scale * 0.8));
        lines.push({
          text,
          x: bbox.x0 || 0,
          y: bbox.y0 || 0,
          size,
          scale
        });
      });
    });
  });

  if (!lines.length && fallbackText) {
    String(fallbackText).split(/\r?\n/).forEach((text, index) => {
      if (!text.trim()) return;
      lines.push({ text: text.trim(), x: 0, y: index * 14, size: 11, scale });
    });
  }

  return lines.sort((first, second) => first.y - second.y || first.x - second.x);
};

const buildWordOcrBodyXml = (lines) => lines.map((line, index) => {
  const previous = index > 0 ? lines[index - 1] : null;
  const extraGap = previous ? (line.y - previous.y) / line.scale - Math.max(previous.size, line.size) * 1.2 : 0;
  const spacingBefore = Math.min(2400, Math.max(0, Math.round(extraGap * 20)));
  const left = Math.min(9000, Math.max(0, Math.round(line.x / line.scale * 20)));
  const size = Math.max(14, Math.min(48, Math.round(line.size * 2)));
  return `<w:p><w:pPr><w:spacing w:before="${spacingBefore}" w:after="0"/><w:ind w:left="${left}"/></w:pPr><w:r><w:rPr><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(line.text)}</w:t></w:r></w:p>`;
}).join('');

const buildWordImageXml = (media, width, height, pageNumber) => {
  const maxWidth = 5938200;
  const maxHeight = 8229600;
  const aspect = width / height || 1;
  let emuWidth = maxWidth;
  let emuHeight = emuWidth / aspect;
  if (emuHeight > maxHeight) {
    emuHeight = maxHeight;
    emuWidth = emuHeight * aspect;
  }
  const cx = Math.round(emuWidth);
  const cy = Math.round(emuHeight);
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${pageNumber}" name="Halaman ${pageNumber}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${pageNumber}" name="${escapeXml(media.name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${media.relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
};

const createDocxBytes = async ({ bodyXml, media = [] }) => {
  const zip = new JSZip();
  const imageDefaults = Array.from(new Set(media.map((item) => item.name.split('.').pop().toLowerCase())))
    .map((extension) => `<Default Extension="${extension}" ContentType="image/${extension === 'jpg' ? 'jpeg' : extension}"/>`)
    .join('');

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imageDefaults}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);

  const relationships = [
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    ...media.map((item) => `<Relationship Id="${item.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${escapeXml(item.name)}"/>`)
  ].join('');
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`);

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${bodyXml}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`);

  media.forEach((item) => zip.file(`word/media/${item.name}`, item.data));

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
};

const PdfTools = () => {
  const { signatureUrl } = useAppConfig();
  const [activeTab, setActiveTab] = useState('merge');
  const [mergeFiles, setMergeFiles] = useState([]);
  const [draggedId, setDraggedId] = useState('');
  const [dragOverId, setDragOverId] = useState('');
  const [mergeOutput, setMergeOutput] = useState('gabungan.pdf');
  const [splitFile, setSplitFile] = useState(null);
  const [splitInfo, setSplitInfo] = useState(null);
  const [pageRange, setPageRange] = useState('');
  const [splitMode, setSplitMode] = useState('single');
  const [splitOutput, setSplitOutput] = useState('hasil-potong');
  const [editFile, setEditFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageViewport, setPageViewport] = useState(null);
  const [textItems, setTextItems] = useState([]);
  const [textEdits, setTextEdits] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftSize, setDraftSize] = useState('12');
  const [draftColor, setDraftColor] = useState('#000000');
  const [draftBold, setDraftBold] = useState(false);
  const [draftItalic, setDraftItalic] = useState(false);
  const [draftUnderline, setDraftUnderline] = useState(false);
  const [draftFont, setDraftFont] = useState('helvetica');
  const [editTool, setEditTool] = useState('select');
  const [pendingText, setPendingText] = useState(null);
  const [pendingDraft, setPendingDraft] = useState('');
  const [pendingSize, setPendingSize] = useState('12');
  const [pendingColor, setPendingColor] = useState('#000000');
  const [pendingBold, setPendingBold] = useState(false);
  const [pendingItalic, setPendingItalic] = useState(false);
  const [pendingUnderline, setPendingUnderline] = useState(false);
  const [pendingFont, setPendingFont] = useState('helvetica');
  const [signaturePlacements, setSignaturePlacements] = useState([]);
  const [signatureWidth, setSignatureWidth] = useState('50');
  const [signatureRatio, setSignatureRatio] = useState(0.25);
  const [customSignature, setCustomSignature] = useState('');
  const [signatureSource, setSignatureSource] = useState('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [editOutput, setEditOutput] = useState('hasil-edit.pdf');
  const [busy, setBusy] = useState('');
  const [notification, setNotification] = useState(null);
  const notificationTimer = useRef(null);
  const canvasRef = useRef(null);
  const penCanvasRef = useRef(null);
  const drawingRef = useRef(false);
  const dragRef = useRef(null);
  const previewWrapRef = useRef(null);
  const [previewFit, setPreviewFit] = useState(1);
  const [draggingId, setDraggingId] = useState('');

  const [toImageFile, setToImageFile] = useState(null);
  const [toImageDoc, setToImageDoc] = useState(null);
  const [toImageFormat, setToImageFormat] = useState('png');
  const [toImageDpi, setToImageDpi] = useState('150');
  const [toImageQuality, setToImageQuality] = useState('90');
  const [toImagePages, setToImagePages] = useState('');
  const [toImageOutput, setToImageOutput] = useState('halaman');

  const [toPdfImages, setToPdfImages] = useState([]);
  const [toPdfPageSize, setToPdfPageSize] = useState('auto');
  const [toPdfMargin, setToPdfMargin] = useState('10');
  const [toPdfOutput, setToPdfOutput] = useState('gambar.pdf');

  const [toWordFile, setToWordFile] = useState(null);
  const [toWordDoc, setToWordDoc] = useState(null);
  const [toWordMode, setToWordMode] = useState('text');
  const [toWordLanguage, setToWordLanguage] = useState('ind+eng');
  const [toWordDpi, setToWordDpi] = useState('150');
  const [toWordOutput, setToWordOutput] = useState('hasil.docx');
  const [wordProgress, setWordProgress] = useState('');

  const labelStyle = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';
  const inputStyle = 'w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all duration-200';
  const cardStyle = 'app-card app-card-padded';

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    window.clearTimeout(notificationTimer.current);
    notificationTimer.current = window.setTimeout(() => setNotification(null), 3500);
  };

  const selectedItem = textItems.find((item) => item.id === selectedItemId) || null;
  const activeSignature = customSignature || signatureUrl;

  const pointerPdfPoint = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas || !pageViewport) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const py = (clientY - rect.top) * (canvas.height / rect.height);
    return pageViewport.convertToPdfPoint(px, py);
  }, [pageViewport]);

  const startSignatureDrag = (event, placement) => {
    if (!pageViewport) return;
    event.preventDefault();
    event.stopPropagation();
    const point = pointerPdfPoint(event.clientX, event.clientY);
    if (!point) return;
    dragRef.current = {
      type: 'signature-move',
      id: placement.id,
      offsetX: point[0] - placement.x,
      offsetY: point[1] - placement.yTop
    };
    setDraggingId(placement.id);
  };

  const startSignatureResize = (event, placement) => {
    if (!pageViewport) return;
    event.preventDefault();
    event.stopPropagation();
    const point = pointerPdfPoint(event.clientX, event.clientY);
    if (!point) return;
    dragRef.current = {
      type: 'signature-resize',
      id: placement.id,
      start: point,
      width: placement.width,
      ratio: placement.ratio || signatureRatio
    };
    setDraggingId(placement.id);
  };

  const startAddedTextDrag = (event, edit) => {
    if (!pageViewport) return;
    event.preventDefault();
    event.stopPropagation();
    const point = pointerPdfPoint(event.clientX, event.clientY);
    if (!point) return;
    dragRef.current = {
      type: 'text-move',
      id: edit.id,
      offsetX: point[0] - edit.baselineX,
      offsetY: point[1] - edit.baselineY
    };
    setDraggingId(edit.id);
  };

  const removeTextEdit = (id) => {
    if (dragRef.current?.id === id) {
      dragRef.current = null;
      setDraggingId('');
    }
    if (id === 'draft-selected') {
      setSelectedItemId('');
      setDraftText('');
      return;
    }
    if (id === 'draft-pending') {
      setPendingText(null);
      setPendingDraft('');
      return;
    }
    setTextEdits((previous) => previous.filter((edit) => edit.id !== id));
  };

  const removeSignaturePlacement = (id) => {
    if (dragRef.current?.id === id) {
      dragRef.current = null;
      setDraggingId('');
    }
    setSignaturePlacements((previous) => previous.filter((placement) => placement.id !== id));
  };

  const effectiveTextEdits = (() => {
    const edits = [...textEdits];

    if (selectedItem && draftText.trim()) {
      const index = edits.findIndex((edit) => edit.key === selectedItem.id);
      const draft = {
        id: 'draft-selected',
        key: selectedItem.id,
        kind: 'replace',
        page: selectedItem.page,
        value: draftText.trim(),
        size: Number(draftSize) || selectedItem.fontHeightPt,
        color: draftColor,
        bold: draftBold,
        italic: draftItalic,
        underline: draftUnderline,
        font: draftFont,
        bbox: selectedItem.bbox,
        baselineX: selectedItem.baselineX,
        baselineY: selectedItem.baselineY
      };
      if (index >= 0) edits[index] = draft;
      else edits.push(draft);
    }

    if (pendingText && pendingDraft.trim()) {
      edits.push({
        id: 'draft-pending',
        key: 'draft-pending',
        kind: 'add',
        page: pendingText.page,
        value: pendingDraft.trim(),
        size: Number(pendingSize) || 12,
        color: pendingColor,
        bold: pendingBold,
        italic: pendingItalic,
        underline: pendingUnderline,
        font: pendingFont,
        bbox: null,
        baselineX: pendingText.x,
        baselineY: pendingText.y
      });
    }

    return edits;
  })();

  useEffect(() => () => window.clearTimeout(notificationTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    if (!splitFile) {
      setSplitInfo(null);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const pdf = await PDFDocument.load(await splitFile.file.arrayBuffer(), { ignoreEncryption: true });
        if (!cancelled) setSplitInfo({ pages: pdf.getPageCount() });
      } catch {
        if (!cancelled) setSplitInfo(null);
      }
    })();

    return () => { cancelled = true; };
  }, [splitFile]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask;

    if (!toImageFile) {
      setToImageDoc(null);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(await toImageFile.file.arrayBuffer()) });
        const doc = await loadingTask.promise;
        if (!cancelled) {
          setToImageDoc(doc);
          setToImageOutput(safeBaseName(toImageFile.file.name, 'halaman'));
        }
      } catch {
        if (!cancelled) notify('Gagal memuat PDF untuk diubah ke gambar.', 'error');
      }
    })();

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [toImageFile]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask;

    if (!toWordFile) {
      setToWordDoc(null);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(await toWordFile.file.arrayBuffer()) });
        const doc = await loadingTask.promise;
        if (!cancelled) {
          setToWordDoc(doc);
          setToWordOutput(`${safeBaseName(toWordFile.file.name, 'hasil')}.docx`);
          let hasText = false;
          for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, 3) && !hasText; pageNumber += 1) {
            const page = await doc.getPage(pageNumber);
            const content = await page.getTextContent();
            hasText = content.items.some((item) => String(item.str || '').trim());
          }
          if (!cancelled) setToWordMode(hasText ? 'text' : 'ocr');
        }
      } catch {
        if (!cancelled) notify('Gagal memuat PDF untuk diubah ke Word.', 'error');
      }
    })();

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [toWordFile]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask;

    if (!editFile) {
      setPdfDoc(null);
      setPageCount(0);
      setCurrentPage(1);
      setPageViewport(null);
      setTextItems([]);
      setTextEdits([]);
      setSelectedItemId('');
      setPendingText(null);
      setSignaturePlacements([]);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const bytes = await editFile.file.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
        const doc = await loadingTask.promise;
        if (!cancelled) {
          setPdfDoc(doc);
          setPageCount(doc.numPages);
          setCurrentPage(1);
        }
      } catch {
        if (!cancelled) notify('Gagal memuat PDF untuk diedit.', 'error');
      }
    })();

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [editFile]);

  useEffect(() => {
    let cancelled = false;
    let renderTask;

    const render = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: PREVIEW_SCALE });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise;
      if (cancelled) return;

      setPageViewport(viewport);
      const content = await page.getTextContent();
      const items = content.items
        .filter((item) => item.str && String(item.str).trim())
        .map((item, index) => {
          const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
          const tx = transform[4];
          const ty = transform[5];
          const fontHeightPx = Math.hypot(transform[2], transform[3]) || 12;
          const fontHeightPt = Math.hypot(item.transform[2], item.transform[3]) || 10;
          const width = Math.max((item.width || 0) * viewport.scale, 8);
          const left = tx;
          const top = ty - fontHeightPx;
          const height = fontHeightPx * 1.35;
          const [baselineX, baselineY] = viewport.convertToPdfPoint(tx, ty);
          const [x1, y1] = viewport.convertToPdfPoint(left, top + height);
          const [x2, y2] = viewport.convertToPdfPoint(left + width, top);
          const bbox = {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1)
          };

          return {
            id: `${currentPage}-${index}-${Math.round(tx)}-${Math.round(ty)}`,
            page: currentPage,
            str: String(item.str),
            left,
            top,
            width,
            height,
            fontHeightPx,
            fontHeightPt,
            baselineX,
            baselineY,
            bbox
          };
        });

      setTextItems(items);
    };

    render().catch(() => {});
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (!activeSignature) {
      setSignatureRatio(0.25);
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => setSignatureRatio((image.naturalHeight / image.naturalWidth) || 0.25);
    image.onerror = () => setSignatureRatio(0.25);
    image.src = activeSignature;
  }, [activeSignature]);

  useEffect(() => {
    const handleMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const point = pointerPdfPoint(event.clientX, event.clientY);
      if (!point) return;

      if (drag.type === 'signature-move') {
        setSignaturePlacements((previous) => previous.map((placement) => (
          placement.id === drag.id
            ? { ...placement, x: point[0] - drag.offsetX, yTop: point[1] - drag.offsetY }
            : placement
        )));
      } else if (drag.type === 'signature-resize') {
        const startWidthPt = drag.width * MM_TO_PT;
        const startHeightPt = startWidthPt * drag.ratio;
        const horizontal = startWidthPt + (point[0] - drag.start[0]);
        const vertical = (startHeightPt + (drag.start[1] - point[1])) / drag.ratio;
        const nextWidthPt = Math.max(8, Math.max(horizontal, vertical));
        setSignaturePlacements((previous) => previous.map((placement) => (
          placement.id === drag.id
            ? { ...placement, width: nextWidthPt / MM_TO_PT, ratio: drag.ratio }
            : placement
        )));
      } else if (drag.type === 'text-move') {
        setTextEdits((previous) => previous.map((edit) => (
          edit.id === drag.id
            ? { ...edit, baselineX: point[0] - drag.offsetX, baselineY: point[1] - drag.offsetY }
            : edit
        )));
      }
    };

    const handleUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setDraggingId('');
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [pointerPdfPoint]);

  useEffect(() => {
    const element = previewWrapRef.current;
    if (!element || !pageViewport) return undefined;

    const updateFit = () => {
      const styles = window.getComputedStyle(element);
      const available = element.clientWidth
        - parseFloat(styles.paddingLeft || '0')
        - parseFloat(styles.paddingRight || '0');
      setPreviewFit(Math.min(2, available / pageViewport.width));
    };
    updateFit();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(updateFit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [pageViewport]);

  const addMergeFiles = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    setMergeFiles((previous) => [
      ...previous,
      ...files.map((file) => ({ id: `${Date.now()}-${Math.random()}`, file }))
    ]);
    event.target.value = '';
  };

  const moveMergeFile = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= mergeFiles.length) return;
    setMergeFiles((previous) => {
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleDragStart = (event, id) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (event, id) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = (event, targetId) => {
    event.preventDefault();
    const sourceId = draggedId || event.dataTransfer.getData('text/plain');

    if (sourceId && sourceId !== targetId) {
      setMergeFiles((previous) => {
        const from = previous.findIndex((entry) => entry.id === sourceId);
        const to = previous.findIndex((entry) => entry.id === targetId);
        if (from < 0 || to < 0) return previous;
        const next = [...previous];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    }

    setDraggedId('');
    setDragOverId('');
  };

  const handleDragEnd = () => {
    setDraggedId('');
    setDragOverId('');
  };

  const handleMerge = async () => {
    if (mergeFiles.length < 2) {
      notify('Minimal dua file PDF untuk digabungkan.', 'error');
      return;
    }

    setBusy('merge');
    try {
      const merged = await PDFDocument.create();
      for (const entry of mergeFiles) {
        const source = await PDFDocument.load(await entry.file.arrayBuffer(), { ignoreEncryption: true });
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
      const bytes = await merged.save({ useObjectStreams: false });
      downloadBytes(bytes, mergeOutput || 'gabungan.pdf');
      notify(`${mergeFiles.length} file PDF berhasil digabungkan.`, 'success');
    } catch (error) {
      notify(error.message || 'Gagal menggabungkan PDF.', 'error');
    } finally {
      setBusy('');
    }
  };

  const handleSplit = async () => {
    if (!splitFile) {
      notify('Pilih file PDF terlebih dahulu.', 'error');
      return;
    }

    setBusy('split');
    try {
      const pdf = await PDFDocument.load(await splitFile.file.arrayBuffer(), { ignoreEncryption: true });
      const total = pdf.getPageCount();
      const indices = parsePageRange(pageRange, total);

      if (indices.length === 0) {
        notify('Tidak ada halaman yang dipilih.', 'error');
        return;
      }

      const baseName = (splitOutput || 'hasil-potong').replace(/\.(pdf|zip)$/i, '');

      if (splitMode === 'single') {
        const result = await PDFDocument.create();
        const pages = await result.copyPages(pdf, indices);
        pages.forEach((page) => result.addPage(page));
        const bytes = await result.save({ useObjectStreams: false });
        downloadBytes(bytes, `${baseName}.pdf`);
        notify(`${indices.length} halaman berhasil dipotong menjadi satu PDF.`, 'success');
      } else {
        const zip = new JSZip();
        for (const index of indices) {
          const single = await PDFDocument.create();
          const [page] = await single.copyPages(pdf, [index]);
          single.addPage(page);
          const bytes = await single.save({ useObjectStreams: false });
          zip.file(`${baseName}-halaman-${index + 1}.pdf`, bytes);
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `${baseName}.zip`);
        notify(`${indices.length} halaman berhasil dipisah menjadi file ZIP.`, 'success');
      }
    } catch (error) {
      notify(error.message || 'Gagal memotong halaman PDF.', 'error');
    } finally {
      setBusy('');
    }
  };

  const startTextEdit = (item) => {
    const existing = textEdits.find((edit) => edit.key === item.id);
    setSelectedItemId(item.id);
    setDraftText(existing?.value ?? item.str);
    setDraftSize(String(Math.round((existing?.size ?? item.fontHeightPt) * 10) / 10));
    setDraftColor(existing?.color || '#000000');
    setDraftBold(existing?.bold || false);
    setDraftItalic(existing?.italic || false);
    setDraftUnderline(existing?.underline || false);
    setDraftFont(existing?.font || 'helvetica');
    setPendingText(null);
  };

  const saveTextEdit = () => {
    const item = textItems.find((entry) => entry.id === selectedItemId);
    if (!item) return;
    const value = draftText.trim();
    if (!value) {
      notify('Isi teks tidak boleh kosong.', 'error');
      return;
    }

    const size = Number(draftSize);
    if (!Number.isFinite(size) || size <= 0) {
      notify('Ukuran font harus lebih dari nol.', 'error');
      return;
    }

    setTextEdits((previous) => [
      ...previous.filter((edit) => edit.key !== item.id),
      {
        id: `${Date.now()}-${Math.random()}`,
        key: item.id,
        kind: 'replace',
        page: item.page,
        value,
        size,
        color: draftColor,
        bold: draftBold,
        italic: draftItalic,
        underline: draftUnderline,
        font: draftFont,
        bbox: item.bbox,
        baselineX: item.baselineX,
        baselineY: item.baselineY
      }
    ]);
    setSelectedItemId('');
  };

  const confirmPendingText = () => {
    if (!pendingText) return;
    const value = pendingDraft.trim();
    if (!value) {
      notify('Isi teks tidak boleh kosong.', 'error');
      return;
    }
    const size = Number(pendingSize);
    if (!Number.isFinite(size) || size <= 0) {
      notify('Ukuran font harus lebih dari nol.', 'error');
      return;
    }

    setTextEdits((previous) => [...previous, {
      id: `${Date.now()}-${Math.random()}`,
      key: `add-${Date.now()}`,
      kind: 'add',
      page: pendingText.page,
      value,
      size,
      color: pendingColor,
      bold: pendingBold,
      italic: pendingItalic,
      underline: pendingUnderline,
      font: pendingFont,
      bbox: null,
      baselineX: pendingText.x,
      baselineY: pendingText.y
    }]);
    setPendingText(null);
    setPendingDraft('');
    setPendingSize('12');
    setPendingColor('#000000');
    setPendingBold(false);
    setPendingItalic(false);
    setPendingUnderline(false);
    setPendingFont('helvetica');
    setSelectedItemId('');
  };

  const penPoint = (event) => {
    const canvas = penCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startPen = (event) => {
    const canvas = penCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const point = penPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.strokeStyle = '#0f172a';
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    drawingRef.current = true;
    setIsDrawing(true);
    canvas.setPointerCapture?.(event.pointerId);
  };

  const movePen = (event) => {
    if (!drawingRef.current || !penCanvasRef.current) return;
    const context = penCanvasRef.current.getContext('2d');
    const point = penPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopPen = () => {
    drawingRef.current = false;
    setIsDrawing(false);
  };

  const clearPen = () => {
    const canvas = penCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const usePenSignature = async () => {
    const canvas = penCanvasRef.current;
    if (!canvas) return;
    const cropped = await cropDataUrl(canvas.toDataURL('image/png'));
    if (!cropped) {
      notify('Gambar tanda tangan terlebih dahulu.', 'error');
      return;
    }
    setCustomSignature(cropped);
    setSignatureSource('pen');
    notify('Tanda tangan hasil gambar pen siap dipakai.', 'success');
  };

  const handleSignatureUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Pilih file gambar PNG atau JPG.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const cropped = await cropDataUrl(String(reader.result));
      if (!cropped) {
        notify('Gambar tidak memiliki tanda tangan yang terlihat.', 'error');
        return;
      }
      setCustomSignature(cropped);
      setSignatureSource('upload');
      notify('Gambar tanda tangan berhasil diunggah.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasClick = (event) => {
    if (!pageViewport || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (canvas.width / rect.width);
    const py = (event.clientY - rect.top) * (canvas.height / rect.height);
    const [pdfX, pdfY] = pageViewport.convertToPdfPoint(px, py);

    if (editTool === 'addText') {
      setPendingText({ page: currentPage, x: pdfX, y: pdfY });
      setPendingDraft('');
      setPendingSize('12');
      setPendingColor('#000000');
      setPendingBold(false);
      setPendingItalic(false);
      setPendingUnderline(false);
      setPendingFont('helvetica');
      setSelectedItemId('');
    } else if (editTool === 'signature') {
      if (!activeSignature) {
        notify('Gambar tanda tangan dengan pen atau upload gambar terlebih dahulu.', 'error');
        return;
      }
      const width = Number(signatureWidth);
      if (!Number.isFinite(width) || width <= 0) {
        notify('Lebar tanda tangan harus lebih dari nol.', 'error');
        return;
      }
      setSignaturePlacements((previous) => [...previous, {
        id: `${Date.now()}-${Math.random()}`,
        page: currentPage,
        x: pdfX,
        yTop: pdfY,
        width,
        ratio: signatureRatio
      }]);
      setSelectedItemId('');
    } else {
      setSelectedItemId('');
      setPendingText(null);
    }
  };

  const handleApplyEdit = async () => {
    if (!editFile) {
      notify('Pilih file PDF terlebih dahulu.', 'error');
      return;
    }
    if (effectiveTextEdits.length === 0 && signaturePlacements.length === 0) {
      notify('Belum ada perubahan yang diterapkan.', 'error');
      return;
    }

    setBusy('edit');
    try {
      const pdf = await PDFDocument.load(await editFile.file.arrayBuffer(), { ignoreEncryption: true });
      const fontCache = new Map();
      const getFont = async (familyKey, styleKey) => {
        const cacheKey = `${familyKey}-${styleKey}`;
        if (!fontCache.has(cacheKey)) {
          const standards = FONT_STANDARDS[familyKey] || FONT_STANDARDS.helvetica;
          fontCache.set(cacheKey, await pdf.embedFont(standards[styleKey]));
        }
        return fontCache.get(cacheKey);
      };

      for (const edit of effectiveTextEdits) {
        const page = pdf.getPage(edit.page - 1);
        const familyKey = FONT_STANDARDS[edit.font] ? edit.font : 'helvetica';
        const styleKey = edit.bold && edit.italic
          ? 'boldItalic'
          : edit.bold
            ? 'bold'
            : edit.italic
              ? 'italic'
              : 'regular';
        const font = await getFont(familyKey, styleKey);

        if (edit.bbox) {
          page.drawRectangle({
            x: edit.bbox.x - 1,
            y: edit.bbox.y - 1,
            width: edit.bbox.width + 2,
            height: edit.bbox.height + 2,
            color: rgb(1, 1, 1),
            borderWidth: 0
          });
        }

        let size = Number(edit.size) || 10;
        const maxWidth = edit.bbox?.width ? edit.bbox.width - 2 : null;
        if (maxWidth && maxWidth > 0) {
          while (font.widthOfTextAtSize(edit.value, size) > maxWidth && size > 4) size -= 0.5;
        }

        const color = hexToRgb(edit.color);
        const lineHeight = size * 1.2;
        page.drawText(edit.value, {
          x: edit.baselineX,
          y: edit.baselineY,
          size,
          font,
          color,
          lineHeight
        });

        if (edit.underline) {
          edit.value.split('\n').forEach((line, index) => {
            const lineWidth = font.widthOfTextAtSize(line, size);
            if (lineWidth <= 0) return;
            const y = edit.baselineY - index * lineHeight - size * 0.12;
            page.drawLine({
              start: { x: edit.baselineX, y },
              end: { x: edit.baselineX + lineWidth, y },
              thickness: Math.max(0.5, size * 0.06),
              color
            });
          });
        }
      }

      if (signaturePlacements.length > 0) {
        let bytes;
        let mime;

        if (customSignature) {
          const decoded = dataUrlToBytes(customSignature);
          bytes = decoded.bytes;
          mime = decoded.mime;
        } else {
          const response = await fetch(signatureUrl, { mode: 'cors' });
          if (!response.ok) throw new Error('Gagal memuat gambar tanda tangan digital.');
          bytes = await response.arrayBuffer();
          const name = signatureUrl.split('?')[0].split('/').pop() || '';
          const extension = name.split('.').pop()?.toLowerCase();
          mime = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'image/png';
        }

        const signatureImage = mime === 'image/jpeg'
          ? await pdf.embedJpg(bytes)
          : await pdf.embedPng(bytes);

        for (const placement of signaturePlacements) {
          const page = pdf.getPage(placement.page - 1);
          const widthPt = placement.width * MM_TO_PT;
          const ratio = placement.ratio || (signatureImage.height / signatureImage.width);
          const heightPt = widthPt * ratio;
          page.drawImage(signatureImage, {
            x: placement.x,
            y: placement.yTop - heightPt,
            width: widthPt,
            height: heightPt
          });
        }
      }

      const bytes = await pdf.save({ useObjectStreams: false });
      downloadBytes(bytes, editOutput || 'hasil-edit.pdf');
      notify(`${effectiveTextEdits.length + signaturePlacements.length} perubahan berhasil diterapkan.`, 'success');
    } catch (error) {
      notify(error.message || 'Gagal mengedit PDF.', 'error');
    } finally {
      setBusy('');
    }
  };

  const handleToImages = async () => {
    if (!toImageDoc) {
      notify('Pilih file PDF terlebih dahulu.', 'error');
      return;
    }

    setBusy('to-images');
    try {
      const pages = parsePageRange(toImagePages, toImageDoc.numPages);
      const scale = Math.max(0.2, Number(toImageDpi) / 72 || 2);
      const mime = toImageFormat === 'png' ? 'image/png' : 'image/jpeg';
      const extension = toImageFormat === 'png' ? 'png' : 'jpg';
      const base = safeBaseName(toImageOutput, 'halaman');
      const blobs = [];

      for (const pageIndex of pages) {
        const canvas = await renderPdfPageCanvas(toImageDoc, pageIndex + 1, scale);
        blobs.push(await canvasToBlob(canvas, mime, Number(toImageQuality) / 100 || 0.9));
      }

      if (blobs.length === 1) {
        downloadBlob(blobs[0], `${base}.${extension}`);
      } else {
        const zip = new JSZip();
        blobs.forEach((blob, index) => {
          zip.file(`${base}-${String(pages[index] + 1).padStart(2, '0')}.${extension}`, blob);
        });
        downloadBlob(await zip.generateAsync({ type: 'blob' }), `${base}.zip`);
      }
      notify(`${pages.length} halaman berhasil diubah ke ${extension.toUpperCase()}.`);
    } catch (error) {
      notify(error?.message || 'Gagal mengubah PDF ke gambar.', 'error');
    } finally {
      setBusy('');
    }
  };

  const addToPdfImages = async (files) => {
    const list = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    if (!list.length) {
      notify('Pilih file gambar terlebih dahulu.', 'error');
      return;
    }

    setBusy('read-images');
    try {
      const entries = await Promise.all(list.map(async (file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        ...(await readImageFile(file))
      })));
      setToPdfImages((previous) => [...previous, ...entries]);
      notify(`${entries.length} gambar ditambahkan.`);
    } catch (error) {
      notify(error?.message || 'Gagal membaca gambar.', 'error');
    } finally {
      setBusy('');
    }
  };

  const moveToPdfImage = (index, direction) => {
    setToPdfImages((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleToPdf = async () => {
    if (!toPdfImages.length) {
      notify('Tambahkan minimal satu gambar.', 'error');
      return;
    }

    setBusy('to-pdf');
    try {
      const pdfDoc = await PDFDocument.create();
      const margin = Math.max(0, Number(toPdfMargin) || 0) * MM_TO_PT;

      for (const entry of toPdfImages) {
        let embedded;
        try {
          const source = dataUrlToBytes(entry.dataUrl);
          embedded = source.mime === 'image/png'
            ? await pdfDoc.embedPng(source.bytes)
            : await pdfDoc.embedJpg(source.bytes);
        } catch {
          const jpeg = dataUrlToBytes(await toJpegDataUrl(entry.dataUrl));
          embedded = await pdfDoc.embedJpg(jpeg.bytes);
        }

        let width;
        let height;
        let pageWidth;
        let pageHeight;
        let x;
        let y;

        if (toPdfPageSize === 'a4') {
          const landscape = entry.width > entry.height;
          pageWidth = landscape ? 841.89 : 595.28;
          pageHeight = landscape ? 595.28 : 841.89;
          const availableWidth = Math.max(10, pageWidth - margin * 2);
          const availableHeight = Math.max(10, pageHeight - margin * 2);
          const scale = Math.min(availableWidth / embedded.width, availableHeight / embedded.height);
          width = embedded.width * scale;
          height = embedded.height * scale;
          x = (pageWidth - width) / 2;
          y = (pageHeight - height) / 2;
        } else {
          width = entry.width * 0.75;
          height = entry.height * 0.75;
          pageWidth = width;
          pageHeight = height;
          x = 0;
          y = 0;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(embedded, { x, y, width, height });
      }

      downloadBytes(await pdfDoc.save({ useObjectStreams: false }), ensureExtension(toPdfOutput, 'pdf'));
      notify(`${toPdfImages.length} gambar berhasil diubah ke PDF.`);
    } catch (error) {
      notify(error?.message || 'Gagal mengubah gambar ke PDF.', 'error');
    } finally {
      setBusy('');
    }
  };

  const handleToWord = async () => {
    if (!toWordDoc) {
      notify('Pilih file PDF terlebih dahulu.', 'error');
      return;
    }

    setBusy('to-word');
    let ocrWorker = null;
    try {
      let bodyXml;
      const media = [];

      if (toWordMode === 'text') {
        const pages = await extractPdfTextPages(toWordDoc);
        bodyXml = buildWordTextBodyXml(pages);
      } else if (toWordMode === 'ocr') {
        const scale = Math.max(1.5, Number(toWordDpi) / 72 || 2);
        let currentPage = 0;
        ocrWorker = await createWorker(toWordLanguage, 1, {
          logger: (message) => {
            if (message.status === 'recognizing text') {
              setWordProgress(`Halaman ${currentPage}/${toWordDoc.numPages} · ${Math.round(message.progress * 100)}%`);
            } else if (message.status === 'loading language traineddata' || message.status === 'initializing api') {
              setWordProgress(`Menyiapkan OCR: ${message.status === 'loading language traineddata' ? 'Memuat data bahasa' : 'Menyiapkan API'}...`);
            }
          }
        });

        const parts = [];
        for (let pageNumber = 1; pageNumber <= toWordDoc.numPages; pageNumber += 1) {
          currentPage = pageNumber;
          setWordProgress(`Halaman ${pageNumber}/${toWordDoc.numPages} · memindai...`);
          const canvas = await renderPdfPageCanvas(toWordDoc, pageNumber, scale);
          const result = await ocrWorker.recognize(canvas, {}, { blocks: true });
          const lines = flattenOcrLines(result.data.blocks, scale, result.data.text);
          parts.push(buildWordOcrBodyXml(lines));
          if (pageNumber < toWordDoc.numPages) parts.push(buildWordPageBreakXml());
        }
        bodyXml = parts.join('');
      } else {
        const scale = Math.max(0.5, Number(toWordDpi) / 72 || 2);
        const parts = [];
        for (let pageNumber = 1; pageNumber <= toWordDoc.numPages; pageNumber += 1) {
          const canvas = await renderPdfPageCanvas(toWordDoc, pageNumber, scale);
          const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
          const item = {
            name: `halaman-${pageNumber}.jpg`,
            data: new Uint8Array(await blob.arrayBuffer()),
            relId: `rId${pageNumber + 1}`
          };
          media.push(item);
          parts.push(buildWordImageXml(item, canvas.width, canvas.height, pageNumber));
          if (pageNumber < toWordDoc.numPages) parts.push(buildWordPageBreakXml());
        }
        bodyXml = parts.join('');
      }

      const bytes = await createDocxBytes({ bodyXml, media });
      downloadBlob(
        new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        ensureExtension(toWordOutput, 'docx')
      );
      notify('PDF berhasil diubah ke Word (.docx).');
    } catch (error) {
      const hint = toWordMode === 'ocr' ? ' Pastikan koneksi internet untuk mengunduh data OCR.' : '';
      notify(`${error?.message || 'Gagal mengubah PDF ke Word.'}${hint}`, 'error');
    } finally {
      if (ocrWorker) await ocrWorker.terminate().catch(() => {});
      setWordProgress('');
      setBusy('');
    }
  };

  const toolButton = (key, icon, title) => (
    <button
      type="button"
      onClick={() => {
        setEditTool(key);
        setSelectedItemId('');
        setPendingText(null);
      }}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
        editTool === key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {icon}
      {title}
    </button>
  );

  const tabButton = (key, icon, title) => (
    <button
      type="button"
      onClick={() => setActiveTab(key)}
      className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
        activeTab === key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {icon}
      {title}
    </button>
  );

  return (
    <div className="app-page">
      <FeaturePageHeader
        title="Alat PDF"
        subtitle="Konversi, gabung, dan kelola dokumen PDF"
        actions={activeTab === 'edit' ? (
          <button
            type="button"
            onClick={handleApplyEdit}
            disabled={!!busy}
            className="app-button app-button-primary"
          >
            {busy === 'edit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePenLine className="w-4 h-4" />}
            {busy === 'edit' ? 'Menerapkan...' : 'Simpan & Unduh'}
          </button>
        ) : null}
      />
      {notification && (
        <div className={`fixed top-6 right-6 z-[60] flex items-center gap-2 rounded-xl border-l-4 bg-white px-5 py-3 text-sm font-semibold shadow-xl ${
          notification.type === 'error' ? 'border-red-500 text-red-700' : 'border-green-500 text-green-700'
        }`}>
          {notification.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {notification.message}
        </div>
      )}

      <div className={cardStyle}>
        <div className="flex flex-wrap gap-3">
          {tabButton('merge', <FilePlus2 className="w-4 h-4" />, 'Gabung PDF')}
          {tabButton('split', <Scissors className="w-4 h-4" />, 'Potong Halaman')}
          {tabButton('edit', <FilePenLine className="w-4 h-4" />, 'Editor PDF')}
          {tabButton('to-image', <ImageIcon className="w-4 h-4" />, 'PDF ke Gambar')}
          {tabButton('to-pdf', <FileImage className="w-4 h-4" />, 'Gambar ke PDF')}
          {tabButton('to-word', <FileType2 className="w-4 h-4" />, 'PDF ke Word')}
        </div>
      </div>

      {activeTab === 'merge' ? (
        <div className={cardStyle}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-8 cursor-pointer hover:bg-indigo-50 transition">
                <FileUp className="w-8 h-8 text-indigo-500" />
                <span className="text-sm font-semibold text-indigo-700">Pilih file PDF</span>
                <span className="text-xs text-gray-500">Boleh lebih dari satu, urutan bisa diubah dengan menarik</span>
                <input type="file" accept="application/pdf,.pdf" multiple onChange={addMergeFiles} className="hidden" />
              </label>

              <div>
                <label className={labelStyle}>Nama File Hasil</label>
                <input className={inputStyle} value={mergeOutput} onChange={(event) => setMergeOutput(event.target.value)} placeholder="gabungan.pdf" />
              </div>

              <button
                type="button"
                onClick={handleMerge}
                disabled={!!busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy === 'merge' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
                {busy === 'merge' ? 'Menggabungkan...' : 'Gabungkan PDF'}
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-800">Urutan PDF</h2>
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">{mergeFiles.length} file</span>
              </div>
              <p className="mb-3 text-xs text-gray-500">Tarik kartu untuk mengubah urutan gabungan.</p>

              {mergeFiles.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-center text-slate-400">
                  <FileText className="w-9 h-9" />
                  <p className="text-sm">Belum ada PDF dipilih.</p>
                </div>
              ) : (
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {mergeFiles.map((entry, index) => (
                    <div
                      key={entry.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, entry.id)}
                      onDragOver={(event) => handleDragOver(event, entry.id)}
                      onDrop={(event) => handleDrop(event, entry.id)}
                      onDragEnd={handleDragEnd}
                      className={`flex cursor-grab items-center gap-3 rounded-lg border bg-white px-3 py-2.5 transition active:cursor-grabbing ${
                        draggedId === entry.id ? 'opacity-50' : ''
                      } ${dragOverId === entry.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}
                    >
                      <GripVertical className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-xs font-bold text-indigo-600">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-800">{entry.file.name}</p>
                        <p className="text-xs text-gray-500">{formatBytes(entry.file.size)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => moveMergeFile(index, -1)} disabled={index === 0} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                        <button type="button" onClick={() => moveMergeFile(index, 1)} disabled={index === mergeFiles.length - 1} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setMergeFiles((previous) => previous.filter((item) => item.id !== entry.id))} className="rounded-md p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'split' ? (
        <div className={cardStyle}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-5 py-8 cursor-pointer hover:bg-emerald-50 transition">
                <FileUp className="w-8 h-8 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">Pilih file PDF</span>
                <span className="text-xs text-gray-500">Satu PDF, potong berdasarkan nomor halaman</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setSplitFile(file ? { id: `${Date.now()}`, file } : null);
                    event.target.value = '';
                  }}
                  className="hidden"
                />
              </label>

              {splitFile && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <FileText className="w-5 h-5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{splitFile.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(splitFile.file.size)}
                      {splitInfo ? ` · ${splitInfo.pages} halaman` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => setSplitFile(null)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}

              <div>
                <label className={labelStyle}>Halaman yang Dipilih</label>
                <input
                  className={inputStyle}
                  value={pageRange}
                  onChange={(event) => setPageRange(event.target.value)}
                  placeholder="Contoh: 1-3,5,8"
                />
                <p className="mt-1.5 text-xs text-gray-500">Kosongkan untuk memilih semua halaman.</p>
              </div>

              <div>
                <label className={labelStyle}>Bentuk Hasil</label>
                <select className={inputStyle} value={splitMode} onChange={(event) => setSplitMode(event.target.value)}>
                  <option value="single">Satu PDF dari halaman terpilih</option>
                  <option value="zip">Satu ZIP berisi PDF per halaman</option>
                </select>
              </div>

              <div>
                <label className={labelStyle}>Nama File Hasil</label>
                <input className={inputStyle} value={splitOutput} onChange={(event) => setSplitOutput(event.target.value)} placeholder="hasil-potong" />
              </div>

              <button
                type="button"
                onClick={handleSplit}
                disabled={!!busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy === 'split' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                {busy === 'split' ? 'Memotong...' : 'Potong Halaman'}
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-600">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                <Layers className="w-4 h-4 text-emerald-600" />
                Format rentang halaman
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li><span className="font-semibold">1-3</span> berarti halaman 1 sampai 3.</li>
                <li><span className="font-semibold">1,4,7</span> berarti halaman 1, 4, dan 7.</li>
                <li><span className="font-semibold">1-3,6,8-10</span> bisa digabung dalam satu kolom.</li>
                <li>Kosongkan kolom untuk memotong semua halaman.</li>
              </ul>
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                File diproses di browser, tidak diunggah ke server.
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'edit' ? (
        <div className={cardStyle}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-3 hover:bg-indigo-50 transition">
              <FilePenLine className="w-6 h-6 text-indigo-500" />
              <span>
                <span className="block text-sm font-semibold text-indigo-700">Pilih file PDF</span>
                <span className="block text-xs text-gray-500">PDF akan ditampilkan untuk diedit langsung</span>
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setEditFile(file ? { id: `${Date.now()}`, file } : null);
                  if (file) setEditOutput(`${file.name.replace(/\.pdf$/i, '')}_edit.pdf`);
                  else setEditOutput('hasil-edit.pdf');
                  event.target.value = '';
                }}
                className="hidden"
              />
            </label>

            {editFile && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <FileText className="w-5 h-5 shrink-0 text-indigo-600" />
                <div className="min-w-0">
                  <p className="max-w-xs truncate text-sm font-semibold text-gray-800">{editFile.file.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(editFile.file.size)} · {pageCount} halaman</p>
                </div>
                <button type="button" onClick={() => setEditFile(null)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          {!editFile ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <FilePenLine className="mx-auto mb-3 w-10 h-10 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Pilih PDF untuk mulai mengedit</p>
              <p className="mt-1 text-xs text-slate-500">Klik teks pada pratinjau untuk mengubahnya, atau tambahkan teks dan tanda tangan.</p>
            </div>
          ) : !pdfDoc ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-16 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat PDF...
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {toolButton('select', <CheckCircle2 className="w-4 h-4" />, 'Pilih & Ubah Teks')}
                    {toolButton('addText', <Type className="w-4 h-4" />, 'Tambah Teks')}
                    {toolButton('signature', <PenLine className="w-4 h-4" />, 'TTD Digital')}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                      disabled={currentPage <= 1}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-40"
                    >
                      ‹
                    </button>
                    Halaman {currentPage} / {pageCount}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((previous) => Math.min(pageCount, previous + 1))}
                      disabled={currentPage >= pageCount}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div ref={previewWrapRef} className="mt-3 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-300/60 p-4">
                  <div
                    className="relative mx-auto bg-white shadow-lg"
                    style={{
                      width: (pageViewport?.width || 0) * previewFit,
                      height: (pageViewport?.height || 0) * previewFit
                    }}
                  >
                    <div
                      className="origin-top-left"
                      style={{
                        width: pageViewport?.width || 0,
                        height: pageViewport?.height || 0,
                        transform: `scale(${previewFit})`
                      }}
                      onClick={handleCanvasClick}
                    >
                      <canvas ref={canvasRef} className="block" />

                    {textItems.map((item) => {
                      const edit = effectiveTextEdits.find((entry) => entry.key === item.id);
                      const isSelected = selectedItemId === item.id;
                      return (
                        <React.Fragment key={item.id}>
                          <button
                            type="button"
                            onClick={(event) => {
                              if (editTool !== 'select') return;
                              event.stopPropagation();
                              startTextEdit(item);
                            }}
                            style={{
                              left: item.left,
                              top: item.top,
                              width: item.width,
                              height: item.height,
                              fontSize: `${edit ? edit.size * PREVIEW_SCALE : item.fontHeightPx}px`,
                              fontStyle: edit?.italic ? 'italic' : 'normal',
                              fontWeight: edit?.bold ? 700 : 400,
                              textDecoration: edit?.underline ? 'underline' : 'none',
                              color: edit?.color,
                              fontFamily: fontCss(edit?.font)
                            }}
                            className={`absolute overflow-hidden whitespace-nowrap border px-0.5 text-left font-sans leading-none ${
                              edit
                                ? 'border-emerald-400 bg-emerald-50/70'
                                : isSelected
                                  ? 'border-indigo-500 bg-indigo-50/60 text-transparent'
                                  : 'border-transparent text-transparent hover:border-indigo-300 hover:bg-indigo-50/40'
                            }`}
                            title={edit ? `Diubah: ${edit.value}` : item.str}
                          >
                            {edit ? edit.value : item.str}
                          </button>
                          {edit && (
                            <button
                              type="button"
                              title="Hapus perubahan teks"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                removeTextEdit(edit.id);
                              }}
                              style={{ left: item.left + item.width - 9, top: item.top - 9 }}
                              className="absolute z-20 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow hover:bg-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {effectiveTextEdits.filter((edit) => edit.kind === 'add' && edit.page === currentPage).map((edit) => {
                      const [left, baselineTop] = pageViewport.convertToViewportPoint(edit.baselineX, edit.baselineY);
                      const fontSize = (Number(edit.size) || 12) * PREVIEW_SCALE;
                      const isDraft = edit.id.startsWith('draft-');
                      return (
                        <div
                          key={edit.id}
                          role="button"
                          tabIndex={0}
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={isDraft ? undefined : (event) => startAddedTextDrag(event, edit)}
                          style={{
                            left,
                            top: baselineTop - fontSize * 1.15,
                            fontSize,
                            fontFamily: fontCss(edit.font),
                            fontStyle: edit.italic ? 'italic' : 'normal',
                            fontWeight: edit.bold ? 700 : 400,
                            textDecoration: edit.underline ? 'underline' : 'none',
                            color: edit.color,
                            touchAction: 'none'
                          }}
                          className={`absolute max-w-none whitespace-nowrap border px-0.5 text-left leading-tight ${
                            draggingId === edit.id
                              ? 'cursor-grabbing border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-300'
                              : isDraft
                                ? 'cursor-default border-indigo-300 bg-indigo-50/40 opacity-70'
                                : 'cursor-grab border-emerald-400 bg-emerald-50/70 hover:border-indigo-500'
                          }`}
                          title={isDraft ? 'Pratinjau teks baru' : 'Geser teks baru'}
                        >
                          {edit.value}
                          <button
                            type="button"
                            title={isDraft ? 'Batalkan teks baru' : 'Hapus teks'}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeTextEdit(edit.id);
                            }}
                            className="absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow hover:bg-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}

                    {signaturePlacements.filter((placement) => placement.page === currentPage).map((placement) => {
                      const [left, top] = pageViewport.convertToViewportPoint(placement.x, placement.yTop);
                      const ratio = placement.ratio || signatureRatio;
                      const widthPx = placement.width * MM_TO_PT * pageViewport.scale;
                      const heightPx = widthPx * ratio;
                      const isDragging = draggingId === placement.id;
                      return (
                        <div
                          key={placement.id}
                          className="absolute"
                          style={{ left, top, width: widthPx, height: heightPx }}
                        >
                          <img
                            src={activeSignature}
                            alt="Tanda tangan"
                            draggable={false}
                            onPointerDown={(event) => startSignatureDrag(event, placement)}
                            onClick={(event) => event.stopPropagation()}
                            className={`h-full w-full select-none border border-dashed object-contain ${
                              isDragging
                                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-300'
                                : 'border-indigo-500 opacity-80 hover:opacity-100'
                            }`}
                            style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                          />
                          <button
                            type="button"
                            title="Tarik untuk mengubah ukuran TTD"
                            onPointerDown={(event) => startSignatureResize(event, placement)}
                            onClick={(event) => event.stopPropagation()}
                            className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow"
                            style={{ cursor: 'nwse-resize', touchAction: 'none' }}
                          />
                          <button
                            type="button"
                            title="Hapus TTD"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeSignaturePlacement(placement.id);
                            }}
                            className="absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow hover:bg-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}

                    {selectedItem && pageViewport && (
                      <div
                        className="absolute z-30 w-96 rounded-xl border border-indigo-300 bg-white p-3 shadow-2xl"
                        style={{
                          left: Math.max(0, Math.min(selectedItem.left, pageViewport.width - 384)),
                          top: Math.min(selectedItem.top + selectedItem.height + 8, Math.max(0, pageViewport.height - 260))
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <p className="mb-2 truncate text-xs font-bold text-slate-700">Ubah teks</p>
                        <textarea
                          rows="2"
                          className={`${inputStyle} min-h-16 resize-y`}
                          style={{
                            fontWeight: draftBold ? 700 : 400,
                            fontStyle: draftItalic ? 'italic' : 'normal',
                            textDecoration: draftUnderline ? 'underline' : 'none',
                            color: draftColor,
                            fontFamily: fontCss(draftFont)
                          }}
                          value={draftText}
                          onChange={(event) => setDraftText(event.target.value)}
                          autoFocus
                        />
                        <div className="mt-2">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Bentuk Font</label>
                          <select className={`${inputStyle} py-1.5`} value={draftFont} onChange={(event) => setDraftFont(event.target.value)}>
                            {FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <input type="number" min="1" step="0.5" className={`${inputStyle} w-20 px-2 py-1.5`} value={draftSize} onChange={(event) => setDraftSize(event.target.value)} />
                          <input type="color" className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white p-1" value={draftColor} onChange={(event) => setDraftColor(event.target.value)} />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Tebal"
                              onClick={() => setDraftBold((value) => !value)}
                              className={`h-9 w-9 rounded border text-xs font-bold ${draftBold ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                              B
                            </button>
                            <button
                              type="button"
                              title="Miring"
                              onClick={() => setDraftItalic((value) => !value)}
                              className={`h-9 w-9 rounded border text-xs italic ${draftItalic ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                              I
                            </button>
                            <button
                              type="button"
                              title="Garis Bawah"
                              onClick={() => setDraftUnderline((value) => !value)}
                              className={`h-9 w-9 rounded border text-xs underline ${draftUnderline ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                              U
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end gap-2">
                          <button type="button" onClick={saveTextEdit} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Simpan</button>
                          <button type="button" onClick={() => setSelectedItemId('')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Batal</button>
                        </div>
                      </div>
                    )}

                    {pendingText && pageViewport && (() => {
                      const [left, top] = pageViewport.convertToViewportPoint(pendingText.x, pendingText.y);
                      return (
                        <div
                          className="absolute z-30 w-96 rounded-xl border border-indigo-300 bg-white p-3 shadow-2xl"
                          style={{
                            left: Math.max(0, Math.min(left, pageViewport.width - 384)),
                            top: Math.max(0, Math.min(top, pageViewport.height - 260))
                          }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <p className="mb-2 text-xs font-bold text-slate-700">Teks baru di halaman {pendingText.page}</p>
                          <textarea
                            rows="2"
                            className={`${inputStyle} min-h-16 resize-y`}
                            style={{
                              fontWeight: pendingBold ? 700 : 400,
                              fontStyle: pendingItalic ? 'italic' : 'normal',
                              textDecoration: pendingUnderline ? 'underline' : 'none',
                              color: pendingColor,
                              fontFamily: fontCss(pendingFont)
                            }}
                            value={pendingDraft}
                            onChange={(event) => setPendingDraft(event.target.value)}
                            placeholder="Tulis teks baru..."
                            autoFocus
                          />
                          <div className="mt-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Bentuk Font</label>
                            <select className={`${inputStyle} py-1.5`} value={pendingFont} onChange={(event) => setPendingFont(event.target.value)}>
                              {FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <input type="number" min="1" step="0.5" className={`${inputStyle} w-20 px-2 py-1.5`} value={pendingSize} onChange={(event) => setPendingSize(event.target.value)} />
                            <input type="color" className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white p-1" value={pendingColor} onChange={(event) => setPendingColor(event.target.value)} />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                title="Tebal"
                                onClick={() => setPendingBold((value) => !value)}
                                className={`h-9 w-9 rounded border text-xs font-bold ${pendingBold ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                              >
                                B
                              </button>
                              <button
                                type="button"
                                title="Miring"
                                onClick={() => setPendingItalic((value) => !value)}
                                className={`h-9 w-9 rounded border text-xs italic ${pendingItalic ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                              >
                                I
                              </button>
                              <button
                                type="button"
                                title="Garis Bawah"
                                onClick={() => setPendingUnderline((value) => !value)}
                                className={`h-9 w-9 rounded border text-xs underline ${pendingUnderline ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                              >
                                U
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-end gap-2">
                            <button type="button" onClick={confirmPendingText} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Tambah</button>
                            <button type="button" onClick={() => setPendingText(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Batal</button>
                          </div>
                        </div>
                      );
                    })()}
                    </div>
                  </div>
                </div>

                {editTool === 'addText' && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                    Klik pada halaman untuk menambah teks. Teks baru langsung muncul di pratinjau dan bisa digeser ke posisi lain.
                  </div>
                )}

                {editTool === 'signature' && (
                  <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-semibold text-indigo-700">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSignatureSource('pen')}
                          className={`rounded-lg border px-3 py-2 ${signatureSource === 'pen' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 bg-white'}`}
                        >
                          Gambar dengan Pen
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignatureSource('upload')}
                          className={`rounded-lg border px-3 py-2 ${signatureSource === 'upload' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 bg-white'}`}
                        >
                          Unggah Gambar TTD
                        </button>
                      </div>
                      <label className="flex items-center gap-2">
                        Lebar (mm)
                        <input type="number" min="1" className="w-24 rounded-lg border border-indigo-200 bg-white px-2 py-1.5" value={signatureWidth} onChange={(event) => setSignatureWidth(event.target.value)} />
                      </label>
                    </div>

                    {signatureSource === 'pen' ? (
                      <div className="mt-3 flex flex-wrap items-start gap-4">
                        <canvas
                          ref={penCanvasRef}
                          width="320"
                          height="110"
                          className={`cursor-crosshair rounded-lg border border-indigo-200 bg-white ${isDrawing ? 'ring-2 ring-indigo-300' : ''}`}
                          style={{ touchAction: 'none' }}
                          onPointerDown={startPen}
                          onPointerMove={movePen}
                          onPointerUp={stopPen}
                          onPointerLeave={stopPen}
                        />
                        <div className="space-y-2">
                          <p className="max-w-xs font-normal text-indigo-600">Gambar tanda tangan di kotak, lalu klik “Gunakan TTD”. Setelah itu klik halaman PDF untuk menaruhnya.</p>
                          <div className="flex gap-2">
                            <button type="button" onClick={clearPen} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600">Bersihkan</button>
                            <button type="button" onClick={usePenSignature} className="rounded-lg bg-indigo-600 px-3 py-2 text-white">Gunakan TTD</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 hover:bg-indigo-50">
                          <FileUp className="w-4 h-4" />
                          Pilih gambar PNG/JPG
                          <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleSignatureUpload} className="hidden" />
                        </label>
                        <span className="font-normal text-indigo-600">Gambar akan otomatis dipangkas dan siap ditaruh di PDF.</span>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-indigo-200 pt-3">
                      <span>Klik halaman untuk menaruh TTD. Geser TTD untuk memindahkan, tarik titik sudut kanan bawah untuk mengubah ukuran.</span>
                      {activeSignature && (
                        <>
                          <img src={activeSignature} alt="Pratinjau TTD" className="h-10 rounded border border-indigo-200 bg-white object-contain px-1" />
                          <span className="text-emerald-700">TTD siap dipakai.</span>
                        </>
                      )}
                      {customSignature && (
                        <button
                          type="button"
                          onClick={() => { setCustomSignature(''); setSignatureSource('pen'); }}
                          className="font-semibold text-slate-600 underline"
                        >
                          Pakai TTD Konfigurasi Aplikasi
                        </button>
                      )}
                      {!activeSignature && <span className="text-amber-700">Belum ada TTD. Gambar dengan pen, unggah gambar, atau unggah di Konfigurasi Aplikasi.</span>}
                    </div>
                  </div>
                )}
              </div>

              <aside className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Halaman</p>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                      <button
                        key={number}
                        type="button"
                        onClick={() => {
                          setCurrentPage(number);
                          setSelectedItemId('');
                          setPendingText(null);
                        }}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                          number === currentPage ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {number}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Type className="w-4 h-4 text-indigo-600" />
                    Daftar Perubahan
                  </h2>
                  {effectiveTextEdits.length === 0 && signaturePlacements.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-xs text-slate-500">
                      Belum ada perubahan.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {effectiveTextEdits.map((edit, index) => (
                        <div key={edit.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-100 text-xs font-bold text-emerald-700">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-800">Teks · Halaman {edit.page}</p>
                            <p className="truncate text-xs text-gray-500">
                              {edit.value}
                              {([edit.bold && 'B', edit.italic && 'I', edit.underline && 'U'].filter(Boolean).length > 0) && (
                                <span className="ml-1 font-bold text-indigo-600">
                                  {[edit.bold && 'B', edit.italic && 'I', edit.underline && 'U'].filter(Boolean).join('')}
                                </span>
                              )}
                              <span className="ml-1 text-slate-400">{fontLabel(edit.font)} · {edit.size} pt</span>
                            </p>
                          </div>
                          {!edit.id.startsWith('draft-') && (
                            <button type="button" onClick={() => setTextEdits((previous) => previous.filter((item) => item.id !== edit.id))} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      ))}
                      {signaturePlacements.map((placement, index) => (
                        <div key={placement.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-100 text-xs font-bold text-indigo-700">{effectiveTextEdits.length + index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-800">Tanda Tangan · Halaman {placement.page}</p>
                            <p className="text-xs text-gray-500">Lebar {Number(placement.width).toFixed(1)} mm · bisa digeser/diubah</p>
                          </div>
                          <button type="button" onClick={() => setSignaturePlacements((previous) => previous.filter((item) => item.id !== placement.id))} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setTextEdits([]);
                          setSignaturePlacements([]);
                          setSelectedItemId('');
                          setPendingText(null);
                        }}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Hapus semua
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelStyle}>Nama File Hasil</label>
                  <input className={inputStyle} value={editOutput} onChange={(event) => setEditOutput(event.target.value)} placeholder="hasil-edit.pdf" />
                </div>

                <button
                  type="button"
                  onClick={handleApplyEdit}
                  disabled={!!busy}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {busy === 'edit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePenLine className="w-4 h-4" />}
                  {busy === 'edit' ? 'Menerapkan...' : 'Simpan & Unduh'}
                </button>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                  File diproses di browser, tidak diunggah ke server.
                </div>
              </aside>
            </div>
          )}
        </div>
      ) : activeTab === 'to-image' ? (
        <div className={cardStyle}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-8 cursor-pointer hover:bg-indigo-50 transition">
                <ImageIcon className="w-8 h-8 text-indigo-500" />
                <span className="text-sm font-semibold text-indigo-700">Pilih file PDF</span>
                <span className="text-xs text-gray-500">Tiap halaman akan diubah menjadi gambar</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setToImageFile(file ? { id: `${Date.now()}`, file } : null);
                    event.target.value = '';
                  }}
                  className="hidden"
                />
              </label>

              {toImageFile && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <FileText className="w-5 h-5 shrink-0 text-indigo-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{toImageFile.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(toImageFile.file.size)}
                      {toImageDoc ? ` · ${toImageDoc.numPages} halaman` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => setToImageFile(null)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Format Gambar</label>
                  <select className={inputStyle} value={toImageFormat} onChange={(event) => setToImageFormat(event.target.value)}>
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Resolusi</label>
                  <select className={inputStyle} value={toImageDpi} onChange={(event) => setToImageDpi(event.target.value)}>
                    <option value="72">72 DPI (kecil)</option>
                    <option value="96">96 DPI</option>
                    <option value="150">150 DPI</option>
                    <option value="200">200 DPI</option>
                    <option value="300">300 DPI (besar)</option>
                  </select>
                </div>
              </div>

              {toImageFormat === 'jpg' && (
                <div>
                  <label className={labelStyle}>Kualitas JPG ({toImageQuality}%)</label>
                  <input type="range" min="40" max="100" value={toImageQuality} onChange={(event) => setToImageQuality(event.target.value)} className="w-full accent-indigo-600" />
                </div>
              )}

              <div>
                <label className={labelStyle}>Halaman yang Dipilih</label>
                <input className={inputStyle} value={toImagePages} onChange={(event) => setToImagePages(event.target.value)} placeholder="Contoh: 1-3,5 — kosongkan untuk semua" />
              </div>

              <div>
                <label className={labelStyle}>Nama File Hasil</label>
                <input className={inputStyle} value={toImageOutput} onChange={(event) => setToImageOutput(event.target.value)} placeholder="halaman" />
              </div>

              <button
                type="button"
                onClick={handleToImages}
                disabled={!!busy || !toImageDoc}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy === 'to-images' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                {busy === 'to-images' ? 'Mengubah...' : 'Ubah ke Gambar'}
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-600">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                <Images className="w-4 h-4 text-indigo-600" />
                Hasil konversi
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>Satu halaman diunduh langsung sebagai PNG/JPG.</li>
                <li>Beberapa halaman diunduh sebagai satu file ZIP.</li>
                <li>Nama file tiap gambar mengikuti No halaman.</li>
                <li>Resolusi lebih tinggi menghasilkan file lebih besar.</li>
              </ul>
              <div className="mt-5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-700">
                File diproses di browser, tidak diunggah ke server.
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'to-pdf' ? (
        <div className={cardStyle}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-5 py-8 cursor-pointer hover:bg-emerald-50 transition">
                <FileImage className="w-8 h-8 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">Pilih gambar</span>
                <span className="text-xs text-gray-500">Boleh lebih dari satu, urutan bisa diubah</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    addToPdfImages(event.target.files);
                    event.target.value = '';
                  }}
                  className="hidden"
                />
              </label>

              <div>
                <label className={labelStyle}>Ukuran Halaman</label>
                <select className={inputStyle} value={toPdfPageSize} onChange={(event) => setToPdfPageSize(event.target.value)}>
                  <option value="auto">Sesuai ukuran gambar</option>
                  <option value="a4">A4 (fit ke halaman)</option>
                </select>
              </div>

              {toPdfPageSize === 'a4' && (
                <div>
                  <label className={labelStyle}>Margin (mm)</label>
                  <input type="number" min="0" max="50" className={inputStyle} value={toPdfMargin} onChange={(event) => setToPdfMargin(event.target.value)} />
                </div>
              )}

              <div>
                <label className={labelStyle}>Nama File Hasil</label>
                <input className={inputStyle} value={toPdfOutput} onChange={(event) => setToPdfOutput(event.target.value)} placeholder="gambar.pdf" />
              </div>

              <button
                type="button"
                onClick={handleToPdf}
                disabled={!!busy || !toPdfImages.length}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy === 'to-pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
                {busy === 'to-pdf' ? 'Mengubah...' : 'Ubah ke PDF'}
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Images className="w-4 h-4 text-emerald-600" />
                  Daftar Gambar
                </h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{toPdfImages.length} gambar</span>
              </div>

              {toPdfImages.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-center text-slate-400">
                  <Images className="w-9 h-9" />
                  <p className="text-sm">Belum ada gambar dipilih.</p>
                </div>
              ) : (
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {toPdfImages.map((entry, index) => (
                    <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-xs font-bold text-emerald-700">{index + 1}</span>
                      <img src={entry.dataUrl} alt={entry.file.name} className="h-10 w-10 shrink-0 rounded-md border border-slate-200 object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-800">{entry.file.name}</p>
                        <p className="text-xs text-gray-500">{entry.width} × {entry.height} px · {formatBytes(entry.file.size)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => moveToPdfImage(index, -1)} disabled={index === 0} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                        <button type="button" onClick={() => moveToPdfImage(index, 1)} disabled={index === toPdfImages.length - 1} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setToPdfImages((previous) => previous.filter((item) => item.id !== entry.id))} className="rounded-md p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={cardStyle}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-8 cursor-pointer hover:bg-indigo-50 transition">
                <FileType2 className="w-8 h-8 text-indigo-500" />
                <span className="text-sm font-semibold text-indigo-700">Pilih file PDF</span>
                <span className="text-xs text-gray-500">PDF akan diubah menjadi file Word .docx</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setToWordFile(file ? { id: `${Date.now()}`, file } : null);
                    event.target.value = '';
                  }}
                  className="hidden"
                />
              </label>

              {toWordFile && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <FileText className="w-5 h-5 shrink-0 text-indigo-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{toWordFile.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(toWordFile.file.size)}
                      {toWordDoc ? ` · ${toWordDoc.numPages} halaman` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => setToWordFile(null)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}

              <div>
                <label className={labelStyle}>Metode Konversi</label>
                <select className={inputStyle} value={toWordMode} onChange={(event) => setToWordMode(event.target.value)}>
                  <option value="text">Teks dapat diedit</option>
                  <option value="ocr">OCR — baca teks dari PDF scan</option>
                  <option value="image">Gambar tiap halaman (mirip asli)</option>
                </select>
                <p className="mt-1.5 text-xs text-gray-500">PDF scan tanpa lapisan teks otomatis memakai OCR.</p>
              </div>

              {toWordMode === 'ocr' && (
                <div>
                  <label className={labelStyle}>Bahasa OCR</label>
                  <select className={inputStyle} value={toWordLanguage} onChange={(event) => setToWordLanguage(event.target.value)}>
                    <option value="ind+eng">Indonesia + Inggris</option>
                    <option value="ind">Indonesia</option>
                    <option value="eng">Inggris</option>
                  </select>
                </div>
              )}

              {(toWordMode === 'ocr' || toWordMode === 'image') && (
                <div>
                  <label className={labelStyle}>Resolusi {toWordMode === 'ocr' ? 'Pemindaian' : 'Gambar'}</label>
                  <select className={inputStyle} value={toWordDpi} onChange={(event) => setToWordDpi(event.target.value)}>
                    <option value="96">96 DPI</option>
                    <option value="150">150 DPI</option>
                    <option value="200">200 DPI</option>
                    <option value="300">300 DPI</option>
                  </select>
                </div>
              )}

              <div>
                <label className={labelStyle}>Nama File Hasil</label>
                <input className={inputStyle} value={toWordOutput} onChange={(event) => setToWordOutput(event.target.value)} placeholder="hasil.docx" />
              </div>

              {busy === 'to-word' && wordProgress && (
                <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {wordProgress}
                </div>
              )}

              <button
                type="button"
                onClick={handleToWord}
                disabled={!!busy || !toWordDoc}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy === 'to-word' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileType2 className="w-4 h-4" />}
                {busy === 'to-word' ? 'Mengubah...' : 'Ubah ke Word'}
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-600">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                <FileType2 className="w-4 h-4 text-indigo-600" />
                Tentang konversi Word
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li><span className="font-semibold">Teks dapat diedit</span>: memakai lapisan teks asli PDF, hasilnya .docx yang bisa disunting.</li>
                <li><span className="font-semibold">OCR</span>: mengenali teks dari PDF scan menjadi teks yang bisa diedit (perlu koneksi internet saat pertama kali).</li>
                <li><span className="font-semibold">Gambar per halaman</span>: tampilan mirip PDF, tetapi isinya tidak bisa diedit sebagai teks.</li>
                <li>OCR berjalan per halaman, jadi PDF tebal membutuhkan waktu lebih lama.</li>
              </ul>
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                File diproses di browser, tidak diunggah ke server.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfTools;
