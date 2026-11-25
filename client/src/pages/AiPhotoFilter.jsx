import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Clock,
  Download,
  FileImage,
  ImagePlus,
  Images,
  Info,
  Loader2,
  Search,
  Sparkles,
  Square,
  Trash2,
  XCircle
} from 'lucide-react';
import FeaturePageHeader from '../components/layout/FeaturePageHeader';

const BATCH_SIZE = 8;
const MAX_THUMBNAIL = 320;

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '-';
  if (seconds < 60) return `${Math.ceil(seconds)} dtk`;
  return `${Math.floor(seconds / 60)} mnt ${String(Math.ceil(seconds % 60)).padStart(2, '0')} dtk`;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const createThumbnail = async (file) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_THUMBNAIL / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Gagal membuat thumbnail.'));
    }, 'image/jpeg', 0.72);
  });
  return URL.createObjectURL(blob);
};

const Panel = ({ icon, title, children }) => (
  <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
    <div className="flex items-center gap-2 mb-4">
      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">{icon}</div>
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
    </div>
    {children}
  </section>
);

function AiPhotoFilter() {
  const [referenceFile, setReferenceFile] = useState(null);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [photos, setPhotos] = useState([]);
  const [threshold, setThreshold] = useState(80);
  const [phase, setPhase] = useState('idle');
  const [modelProgress, setModelProgress] = useState(0);
  const [modelFile, setModelFile] = useState('');
  const [processed, setProcessed] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [tick, setTick] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);

  const photosRef = useRef([]);
  const thresholdRef = useRef(threshold);
  const processedRef = useRef(0);
  const resultsRef = useRef(new Map());
  const referenceUrlRef = useRef('');
  const workerRef = useRef(null);
  const objectUrlsRef = useRef(new Set());
  const referenceInputRef = useRef(null);
  const photosInputRef = useRef(null);
  const sessionRef = useRef({ queue: [], cursor: 0, total: 0, startedAt: 0, sending: false });

  thresholdRef.current = threshold;

  const updatePhotos = useCallback((updater) => {
    setPhotos((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      photosRef.current = next;
      return next;
    });
  }, []);

  const trackUrl = useCallback((url) => {
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const resetSession = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    referenceUrlRef.current = '';
    photosRef.current = [];
    processedRef.current = 0;
    resultsRef.current.clear();
    sessionRef.current = { queue: [], cursor: 0, total: 0, startedAt: 0, sending: false };

    setReferenceFile(null);
    setReferenceUrl('');
    setPhotos([]);
    setSelectedIds(new Set());
    setPhase('idle');
    setModelProgress(0);
    setModelFile('');
    setProcessed(0);
    setNotice('');
    setError('');
    setZipping(false);
    setZipProgress(0);
    setThumbnailProgress(0);
    if (referenceInputRef.current) referenceInputRef.current.value = '';
    if (photosInputRef.current) photosInputRef.current.value = '';
  }, []);

  useEffect(() => () => resetSession(), [resetSession]);

  useEffect(() => {
    if (phase !== 'processing') return undefined;
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const addProcessed = useCallback((count) => {
    processedRef.current += count;
    setProcessed(processedRef.current);
  }, []);

  const applyResult = useCallback((result) => {
    if (result.error) resultsRef.current.delete(result.id);
    else resultsRef.current.set(result.id, result.score);
    updatePhotos((previous) => previous.map((photo) => (
      photo.id === result.id
        ? {
            ...photo,
            status: result.error ? 'error' : 'done',
            result: result.error ? null : result,
            error: result.error || null
          }
        : photo
    )));
  }, [updatePhotos]);

  const completeIfNeeded = useCallback(() => {
    const session = sessionRef.current;
    if (session.total > 0 && processedRef.current >= session.total) {
      setPhase('done');
      setNotice('Pemrosesan selesai. Foto yang cocok otomatis dipilih.');
      const value = thresholdRef.current;
      setSelectedIds(new Set(
        Array.from(resultsRef.current.entries())
          .filter(([, score]) => score >= value)
          .map(([id]) => id)
      ));
    }
  }, []);

  const sendNextBatch = useCallback(async () => {
    const worker = workerRef.current;
    const session = sessionRef.current;
    if (!worker || session.sending || session.cursor >= session.queue.length) return;

    session.sending = true;
    try {
      const batch = [];
      const failures = [];
      while (batch.length < BATCH_SIZE && session.cursor < session.queue.length) {
        const item = session.queue[session.cursor];
        session.cursor += 1;
        try {
          const buffer = await item.file.arrayBuffer();
          batch.push({ id: item.id, name: item.name, size: item.size, buffer });
        } catch (readError) {
          failures.push({
            id: item.id,
            name: item.name,
            size: item.size,
            error: `Gagal membaca berkas: ${readError.message}`
          });
        }
      }

      failures.forEach(applyResult);
      if (failures.length) addProcessed(failures.length);
      if (batch.length) {
        worker.postMessage(
          { type: 'process-batch', photos: batch },
          batch.map((item) => item.buffer)
        );
      }
    } finally {
      session.sending = false;
    }
  }, [addProcessed, applyResult]);

  const handleWorkerMessage = useCallback((event) => {
    const data = event.data;
    if (data.type === 'status') setNotice(data.message);
    if (data.type === 'model-progress') {
      setModelProgress(data.progress);
      setModelFile(data.file);
    }
    if (data.type === 'reference-ready') {
      setPhase('processing');
      setNotice('Menganalisis foto secara bertahap.');
      sendNextBatch();
    }
    if (data.type === 'photo-result') applyResult(data.result);
    if (data.type === 'batch-done') {
      addProcessed(data.processed);
      completeIfNeeded();
      sendNextBatch();
    }
    if (data.type === 'fatal') {
      setError(data.message);
      setPhase('error');
      setNotice('');
    }
  }, [addProcessed, applyResult, completeIfNeeded, sendNextBatch]);

  const handleReferenceChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Foto referensi harus berupa berkas gambar.');
      event.target.value = '';
      return;
    }

    if (referenceUrlRef.current) {
      URL.revokeObjectURL(referenceUrlRef.current);
      objectUrlsRef.current.delete(referenceUrlRef.current);
    }
    const url = trackUrl(URL.createObjectURL(file));
    referenceUrlRef.current = url;
    setReferenceFile(file);
    setReferenceUrl(url);
    setError('');
    setNotice('Foto referensi siap.');
  }, [trackUrl]);

  const handlePhotosChange = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    setError('');
    setNotice(`Membuat thumbnail untuk ${files.length} foto...`);
    setThumbnailProgress(0);

    const items = files.map((file) => ({
      id: createId(),
      name: file.name,
      size: file.size,
      file,
      thumbnail: '',
      status: 'pending',
      result: null,
      error: null
    }));
    updatePhotos((previous) => [...previous, ...items]);

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      try {
        if (!item.file.type.startsWith('image/')) throw new Error('bukan format gambar');
        const thumbnail = trackUrl(await createThumbnail(item.file));
        updatePhotos((previous) => previous.map((photo) => (
          photo.id === item.id ? { ...photo, thumbnail } : photo
        )));
      } catch (thumbnailError) {
        updatePhotos((previous) => previous.map((photo) => (
          photo.id === item.id
            ? { ...photo, status: 'error', error: `Format tidak didukung: ${thumbnailError.message}` }
            : photo
        )));
      }
      setThumbnailProgress(index + 1);
    }

    setNotice(`${files.length} foto ditambahkan.`);
  }, [trackUrl, updatePhotos]);

  const startProcessing = useCallback(async () => {
    if (!referenceFile) {
      setError('Silakan unggah foto referensi terlebih dahulu.');
      return;
    }

    const candidates = photosRef.current.filter((photo) => photo.status !== 'error' && photo.thumbnail);
    if (!candidates.length) {
      setError('Tidak ada foto yang bisa diproses.');
      return;
    }

    if (workerRef.current) workerRef.current.terminate();
    const worker = new Worker(new URL('../workers/aiFilterWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = handleWorkerMessage;
    worker.onerror = (event) => {
      setError(event.message || 'Worker mengalami kesalahan.');
      setPhase('error');
    };
    workerRef.current = worker;

    sessionRef.current = {
      queue: candidates.map((photo) => ({ id: photo.id, name: photo.name, size: photo.size, file: photo.file })),
      cursor: 0,
      total: candidates.length,
      startedAt: Date.now(),
      sending: false
    };
    processedRef.current = 0;
    resultsRef.current.clear();
    setProcessed(0);
    setSelectedIds(new Set());
    setPhase('loading');
    setError('');
    setNotice('Menyiapkan model AI di browser.');
    setModelProgress(0);
    setModelFile('');

    updatePhotos((previous) => previous.map((photo) => (
      candidates.some((candidate) => candidate.id === photo.id)
        ? { ...photo, status: 'pending', result: null, error: null }
        : photo
    )));

    try {
      const buffer = await referenceFile.arrayBuffer();
      worker.postMessage({ type: 'process-reference', buffer }, [buffer]);
    } catch (readError) {
      setError(`Gagal membaca foto referensi: ${readError.message}`);
      setPhase('error');
    }
  }, [handleWorkerMessage, referenceFile, updatePhotos]);

  const handleThresholdChange = useCallback((value) => {
    setThreshold(value);
    thresholdRef.current = value;
    if (phase === 'done') {
      setSelectedIds(new Set(
        Array.from(resultsRef.current.entries())
          .filter(([, score]) => score >= value)
          .map(([id]) => id)
      ));
    }
  }, [phase]);

  const matchedPhotos = useMemo(() => photos
    .filter((photo) => photo.status === 'done' && !photo.error && (photo.result?.score || 0) >= threshold)
    .sort((left, right) => right.result.score - left.result.score), [photos, threshold]);

  const selectedPhotos = useMemo(
    () => matchedPhotos.filter((photo) => selectedIds.has(photo.id)),
    [matchedPhotos, selectedIds]
  );
  const selectedSize = selectedPhotos.reduce((total, photo) => total + photo.size, 0);
  const finishedCount = photos.filter((photo) => photo.status === 'done' || photo.status === 'error').length;
  const thumbnailsReady = photos.every((photo) => photo.status === 'error' || photo.thumbnail);

  const elapsed = useMemo(() => {
    const now = Date.now() + tick * 0;
    if (!sessionRef.current.startedAt) return 0;
    return (now - sessionRef.current.startedAt) / 1000;
  }, [tick]);
  const eta = phase === 'processing' && processed > 0
    ? (sessionRef.current.total - processed) / (processed / Math.max(elapsed, 1))
    : null;

  const togglePhoto = useCallback((id) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(matchedPhotos.map((photo) => photo.id)));
  }, [matchedPhotos]);

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const downloadZip = useCallback(async () => {
    if (!selectedPhotos.length || zipping) return;
    setZipping(true);
    setZipProgress(0);
    setError('');
    try {
      const zip = new JSZip();
      const usedNames = new Map();
      for (const photo of selectedPhotos) {
        let name = photo.name;
        if (usedNames.has(name)) {
          const count = usedNames.get(name) + 1;
          usedNames.set(name, count);
          const dot = photo.name.lastIndexOf('.');
          name = dot > 0
            ? `${photo.name.slice(0, dot)} (${count})${photo.name.slice(dot)}`
            : `${photo.name} (${count})`;
        } else {
          usedNames.set(name, 1);
        }
        const buffer = await photo.file.arrayBuffer();
        zip.file(name, buffer, { binary: true, compression: 'STORE' });
      }
      const blob = await zip.generateAsync(
        { type: 'blob', compression: 'STORE', streamFiles: true },
        (metadata) => setZipProgress(Math.round(metadata.percent || 0))
      );
      downloadBlob(blob, `ai-photo-filter-${new Date().toISOString().slice(0, 10)}.zip`);
      setNotice(`${selectedPhotos.length} foto berhasil dikemas tanpa kompresi.`);
    } catch (zipError) {
      setError(`Gagal membuat ZIP: ${zipError.message}`);
    } finally {
      setZipping(false);
      setZipProgress(0);
    }
  }, [selectedPhotos, zipping]);

  const isBusy = phase === 'loading' || phase === 'processing';

  return (
    <div className="app-page">
      <FeaturePageHeader
        title="Filter Foto AI"
        subtitle="Olah gambar dengan filter berbasis AI"
        actions={
          <button
            type="button"
            onClick={downloadZip}
            disabled={!selectedPhotos.length || zipping}
            className="app-button app-button-primary"
          >
            {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Unduh Pilihan sebagai ZIP
          </button>
        }
      />


      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {notice && !error && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          <Panel icon={<Search className="w-4 h-4" />} title="1. Unggah Gambar Referensi">
            <input
              ref={referenceInputRef}
              type="file"
              accept="image/*"
              onChange={handleReferenceChange}
              disabled={isBusy}
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700 disabled:opacity-50"
            />
            {referenceUrl ? (
              <div className="mt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  Preview foto contoh
                </div>
                <img
                  src={referenceUrl}
                  alt="Foto referensi"
                  className="w-full h-40 object-contain rounded-xl border border-slate-200 bg-slate-50"
                />
                <p className="mt-2 text-xs text-slate-500 truncate">{referenceFile?.name}</p>
              </div>
            ) : (
              <div className="mt-4 h-32 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
                <ImagePlus className="w-7 h-7 mb-2" />
                <span className="text-xs">Belum ada foto referensi</span>
              </div>
            )}
          </Panel>

          <Panel icon={<Images className="w-4 h-4" />} title="2. Unggah Foto Massal">
            <input
              ref={photosInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotosChange}
              disabled={isBusy}
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700 disabled:opacity-50"
            />
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
              <span className="text-xs text-slate-500">Total foto diunggah</span>
              <span className="text-sm font-bold text-slate-800">{photos.length}</span>
            </div>
            {!thumbnailsReady && (
              <div className="mt-3 text-[11px] text-slate-500">
                Membuat thumbnail {thumbnailProgress}/{photos.length}...
              </div>
            )}
          </Panel>

          <Panel icon={<Sparkles className="w-4 h-4" />} title="3. Ambang Kesamaan">
            <div className="flex items-end justify-between mb-3">
              <span className="text-xs text-slate-500">Minimum kemiripan</span>
              <span className="text-2xl font-bold text-indigo-600">{threshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="99"
              value={threshold}
              onChange={(event) => handleThresholdChange(Number(event.target.value))}
              disabled={isBusy}
              className="w-full accent-indigo-600 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>50%</span>
              <span>99%</span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Skor akhir menggabungkan kesamaan kosinus dari embedding CLIP dan hash perseptual untuk foto identik.
            </p>
          </Panel>

          <button
            type="button"
            onClick={startProcessing}
            disabled={!referenceFile || !photos.length || !thumbnailsReady || isBusy}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {phase === 'loading' ? 'Memuat model AI...' : phase === 'processing' ? 'Memproses foto...' : 'Mulai Pemrosesan'}
          </button>
          <button
            type="button"
            onClick={resetSession}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Trash2 className="w-4 h-4" />
            Hapus Semua File
          </button>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Panel icon={<Clock className="w-4 h-4" />} title="Progress Pemrosesan">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Diproses</div>
                <div className="text-lg font-bold text-slate-800">{processed}/{sessionRef.current.total || photos.length}</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Selesai</div>
                <div className="text-lg font-bold text-slate-800">{finishedCount}</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Berjalan</div>
                <div className="text-lg font-bold text-slate-800">{formatDuration(elapsed)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Estimasi sisa</div>
                <div className="text-lg font-bold text-slate-800">{formatDuration(eta)}</div>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${sessionRef.current.total ? (processed / sessionRef.current.total) * 100 : 0}%` }}
              />
            </div>
            {modelProgress > 0 && modelProgress < 100 && (
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span className="truncate max-w-[70%]">Mengunduh {modelFile || 'model AI'}</span>
                  <span>{modelProgress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: `${modelProgress}%` }} />
                </div>
              </div>
            )}
            {phase === 'error' && (
              <div className="mt-4 flex items-center gap-2 text-xs text-red-600">
                <XCircle className="w-4 h-4" />
                Pemrosesan dihentikan. Perbaiki masalah lalu coba lagi.
              </div>
            )}
          </Panel>

          <Panel icon={<FileImage className="w-4 h-4" />} title={`Gallery Hasil Seleksi (${matchedPhotos.length})`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={!matchedPhotos.length}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <CheckSquare className="w-4 h-4" />
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  disabled={!selectedPhotos.length}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Square className="w-4 h-4" />
                  Batalkan Semua Pilihan
                </button>
              </div>
              <button
                type="button"
                onClick={downloadZip}
                disabled={!selectedPhotos.length || zipping}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Unduh Pilihan sebagai ZIP
              </button>
            </div>

            {selectedPhotos.length > 0 && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {selectedPhotos.length} foto dipilih · {formatBytes(selectedSize)} · ZIP tanpa kompresi, nama file asli dipertahankan.
                {zipping && ` Mengemas ${zipProgress}%...`}
              </div>
            )}

            {matchedPhotos.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[620px] overflow-y-auto pr-1">
                {matchedPhotos.map((photo) => {
                  const selected = selectedIds.has(photo.id);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => togglePhoto(photo.id)}
                      className={`relative overflow-hidden rounded-xl border-2 text-left transition ${
                        selected ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="aspect-square bg-slate-100">
                        <img src={photo.thumbnail} alt={photo.name} className="w-full h-full object-cover" />
                      </div>
                      <div className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md border ${
                        selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-white bg-white/80 text-slate-400'
                      }`}>
                        {selected ? <CheckCircle2 className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </div>
                      <div className="p-2.5 bg-white">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-semibold text-slate-700">{photo.name}</span>
                          <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-bold text-indigo-700">
                            {photo.result.score}%
                          </span>
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                          <span>CLIP {photo.result.clipScore}%</span>
                          <span>pHash {photo.result.phashDistance}/64</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
                <FileImage className="w-9 h-9 mb-3" />
                <p className="text-sm font-medium">Belum ada foto yang cocok.</p>
                <p className="mt-1 text-xs text-center max-w-sm">
                  Unggah foto referensi dan beberapa foto, lalu jalankan pemrosesan.
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default AiPhotoFilter;
