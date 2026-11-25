import { env, pipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = 'Xenova/clip-vit-base-patch32';
const MODEL_SIZE = 224;
const HASH_SIZE = 32;

let extractor = null;
let referenceEmbedding = null;
let referenceHash = null;
const embeddings = new Map();

const post = (message, transfer = []) => self.postMessage(message, transfer);

const reportModelProgress = (event) => {
  if (!event?.file) return;
  if (event.status === 'progress' && event.total) {
    post({
      type: 'model-progress',
      progress: Math.round(event.progress || 0),
      file: event.file,
      loaded: event.loaded,
      total: event.total
    });
  }
  if (event.status === 'done') {
    post({
      type: 'model-progress',
      progress: 100,
      file: event.file,
      loaded: event.total || event.loaded || 0,
      total: event.total || event.loaded || 0
    });
  }
};

const ensureExtractor = async () => {
  if (!extractor) {
    post({ type: 'status', message: 'Memuat model AI di browser. Unduhan pertama bisa memakan waktu.' });
    extractor = await pipeline('image-feature-extraction', MODEL_ID, {
      device: 'wasm',
      dtype: 'q8',
      progress_callback: reportModelProgress
    });
    post({ type: 'status', message: 'Model siap. Memproses foto referensi.' });
  }
  return extractor;
};

const normalize = (vector) => {
  let norm = 0;
  for (let index = 0; index < vector.length; index += 1) norm += vector[index] * vector[index];
  norm = Math.sqrt(norm) || 1;
  const result = new Float32Array(vector.length);
  for (let index = 0; index < vector.length; index += 1) result[index] = vector[index] / norm;
  return result;
};

const toEmbedding = (output) => {
  let vector;
  if (output?.data) {
    vector = output.data;
  } else if (Array.isArray(output)) {
    vector = output.flat(Infinity);
  } else {
    throw new Error('Output model tidak dikenali.');
  }

  const dims = output?.dims;
  if (Array.isArray(dims) && dims.length === 3) {
    const [, tokens, dimension] = dims;
    const pooled = new Float32Array(dimension);
    for (let token = 0; token < tokens; token += 1) {
      for (let index = 0; index < dimension; index += 1) {
        pooled[index] += Number(vector[token * dimension + index] || 0) / tokens;
      }
    }
    return normalize(pooled);
  }

  return normalize(Float32Array.from(vector, Number));
};

const cosineSimilarity = (left, right) => {
  if (!left || !right || left.length !== right.length) return 0;
  let dot = 0;
  for (let index = 0; index < left.length; index += 1) dot += left[index] * right[index];
  return Math.max(0, Math.min(1, dot));
};

const decodeBitmap = async (buffer) => {
  const blob = new Blob([buffer], { type: 'image/*' });
  return createImageBitmap(blob);
};

const drawCropped = (bitmap, size) => {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  const crop = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - crop) / 2;
  const sourceY = (bitmap.height - crop) / 2;
  context.drawImage(bitmap, sourceX, sourceY, crop, crop, 0, 0, size, size);
  return context.getImageData(0, 0, size, size).data;
};

const perceptualHash = (bitmap) => {
  const pixels = drawCropped(bitmap, HASH_SIZE);
  const gray = new Float64Array(HASH_SIZE * HASH_SIZE);
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4;
    gray[index] = pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
  }

  const coefficients = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      let sum = 0;
      for (let v = 0; v < HASH_SIZE; v += 1) {
        for (let u = 0; u < HASH_SIZE; u += 1) {
          sum += gray[v * HASH_SIZE + u]
            * Math.cos((2 * u + 1) * x * Math.PI / 16)
            * Math.cos((2 * v + 1) * y * Math.PI / 16);
        }
      }
      const factorX = x === 0 ? 1 / Math.SQRT2 : 1;
      const factorY = y === 0 ? 1 / Math.SQRT2 : 1;
      coefficients.push(sum * factorX * factorY / 4);
    }
  }

  const sorted = coefficients.slice(1).sort((a, b) => a - b);
  const median = (sorted[31] + sorted[32]) / 2;
  let hash = 0n;
  for (let index = 0; index < coefficients.length; index += 1) {
    if (coefficients[index] > median) hash |= 1n << BigInt(index);
  }
  return hash;
};

const hammingDistance = (left, right) => {
  let value = left ^ right;
  let distance = 0;
  while (value) {
    distance += Number(value & 1n);
    value >>= 1n;
  }
  return distance;
};

const embedBitmap = async (bitmap, model) => {
  const pixels = drawCropped(bitmap, MODEL_SIZE);
  const canvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE);
  canvas.getContext('2d').putImageData(new ImageData(pixels, MODEL_SIZE, MODEL_SIZE), 0, 0);
  return toEmbedding(await model(canvas));
};

const processReference = async (message) => {
  try {
    const model = await ensureExtractor();
    const bitmap = await decodeBitmap(message.buffer);
    referenceEmbedding = await embedBitmap(bitmap, model);
    referenceHash = perceptualHash(bitmap);
    bitmap.close();
    post({ type: 'reference-ready' });
  } catch (error) {
    post({ type: 'fatal', message: `Gagal memproses foto referensi: ${error.message}` });
  }
};

const processBatch = async (message) => {
  try {
    const model = await ensureExtractor();
    if (!referenceEmbedding || referenceHash === null) {
      throw new Error('Foto referensi belum siap.');
    }

    for (const item of message.photos) {
      const base = {
        id: item.id,
        name: item.name,
        size: item.size,
        clipScore: 0,
        phashDistance: 64,
        score: 0
      };
      try {
        const bitmap = await decodeBitmap(item.buffer);
        const embedding = await embedBitmap(bitmap, model);
        const hash = perceptualHash(bitmap);
        bitmap.close();

        const clipScore = cosineSimilarity(referenceEmbedding, embedding);
        const phashDistance = hammingDistance(referenceHash, hash);
        const phashScore = Math.max(0, 1 - phashDistance / 64);
        const score = Math.max(clipScore, phashScore);

        embeddings.set(item.id, embedding);
        post({
          type: 'photo-result',
          result: {
            ...base,
            clipScore: Math.round(clipScore * 1000) / 10,
            phashDistance,
            score: Math.round(score * 1000) / 10,
            hash: hash.toString()
          }
        });
      } catch (error) {
        post({
          type: 'photo-result',
          result: { ...base, error: `Foto rusak atau format tidak didukung: ${error.message}` }
        });
      }
    }

    post({ type: 'batch-done', processed: message.photos.length });
  } catch (error) {
    post({ type: 'fatal', message: error.message });
  }
};

self.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'process-reference') {
    embeddings.clear();
    processReference(message);
  }
  if (message.type === 'process-batch') {
    processBatch(message);
  }
});

self.addEventListener('error', (event) => {
  post({ type: 'fatal', message: event.message || 'Worker mengalami kesalahan.' });
});
