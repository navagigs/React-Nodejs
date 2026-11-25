import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import * as faceapi from 'face-api.js';
import { LOGIN_URL, FACE_LOGIN_URL } from './Api';
import { useAppConfig } from './useAppConfig';
import { logActivity } from './activityLog';

const featureHighlights = [
  { icon: Icons.TrendingUp, label: 'Pendapatan proyek' },
  { icon: Icons.FileText, label: 'Surat & invoice' },
  { icon: Icons.QrCode, label: 'QR & PDF tools' }
];

const miniBars = [42, 68, 55, 82, 64, 90, 72];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { config, logoUrl } = useAppConfig();

  const [faceMode, setFaceMode] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceMessage, setFaceMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        if (active) setModelsLoaded(true);
      } catch (err) {
        console.error('Gagal memuat model wajah:', err);
      }
    };
    loadModels();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!faceMode) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraReady(false);
      return;
    }

    let active = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        setFaceMessage('Gagal mengakses kamera. Izinkan akses kamera.');
      }
    };
    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [faceMode]);

  const handleFaceLogin = async () => {
    setError('');
    setFaceMessage('');
    setScanning(true);
    try {
      if (!modelsLoaded) throw new Error('Model wajah belum siap.');
      if (!cameraReady || !videoRef.current) throw new Error('Kamera belum siap.');
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) throw new Error('Wajah tidak terdeteksi. Posisikan wajah ke kamera.');

      const descriptor = Array.from(detection.descriptor);
      const response = await axios.post(FACE_LOGIN_URL, { descriptor });
      const { token, role_id, permissions, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('role_id', role_id);
      localStorage.setItem('user', JSON.stringify(user || {}));
      localStorage.setItem('permissions', JSON.stringify(permissions || []));

      logActivity({
        action: 'login',
        module: 'Login',
        description: `${user?.email || 'face'} berhasil masuk dengan wajah`
      });

      navigate('/dashboard');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Gagal login dengan wajah.');
      }
    } finally {
      setScanning(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await axios.post(LOGIN_URL, { email, password });
      const { token, role_id, permissions, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('role_id', role_id);
      localStorage.setItem('user', JSON.stringify(user || {}));
      localStorage.setItem('permissions', JSON.stringify(permissions || []));

      logActivity({
        action: 'login',
        module: 'Login',
        description: `${user?.email || email} berhasil masuk ke sistem`
      });

      navigate('/dashboard');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Gagal terhubung ke server. Silakan coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const brand = (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-7 w-7 object-contain" />
        ) : (
          <Icons.ShieldCheck className="h-6 w-6" />
        )}
      </div>
      <div>
        {/* <p className="text-lg font-bold tracking-tight text-white">{config.site_title || 'Admin Panel'}</p> */}
        {/* <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-indigo-200">Dasbor</p> */}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-gray-800">
      <section className="relative hidden w-[54%] overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-fuchsia-400/20" />
        <div className="pointer-events-none absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-sky-300/10" />

        <div className="relative z-10">{brand}</div>

        <div className="relative z-10 my-auto max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-50 ring-1 ring-white/20">
            <Icons.Sparkles className="h-3.5 w-3.5" />
            Sistem manajemen terpadu
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Semua aktivitas bisnis, <span className="text-indigo-200">satu dashboard.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-indigo-100">
            {config.site_description || 'Pantau proyek, keuangan, surat, dan dokumentasi tim Anda dalam satu tempat.'}
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {featureHighlights.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <span key={feature.label} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur">
                  <FeatureIcon className="h-4 w-4 text-indigo-100" />
                  {feature.label}
                </span>
              );
            })}
          </div>

          <div className="mt-10 max-w-md rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">Ringkasan pendapatan</p>
                {/* <p className="mt-1 text-2xl font-bold">Rp1.134.163.000.000</p> */}
              </div>
              <div className="rounded-xl bg-emerald-400/20 p-2.5 text-emerald-100">
                <Icons.TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 flex h-24 items-end gap-2">
              {miniBars.map((height, index) => (
                <div key={index} className="flex-1 rounded-t-md bg-white/25" style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-indigo-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Data bertambah 12% bulan ini
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-indigo-200">© {new Date().getFullYear()} {config.site_title || 'Admin Panel'}</p>
      </section>

      <section className="flex w-full items-center justify-center px-5 py-10 sm:px-10 lg:w-[46%]">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">{brand}</div>

          <div className="rounded-3xl border border-gray-100 bg-white p-7 shadow-xl shadow-slate-200/70 sm:p-9">
            <div className="mb-7">
              <span className="inline-flex rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                <Icons.Lock className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-800">Selamat datang kembali</h2>
              <p className="mt-1.5 text-sm text-gray-500">Masuk untuk mengakses dashboard administrator.</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
                <Icons.CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Alamat email <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-slate-50/60 px-3.5 transition focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100">
                  <Icons.Mail className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    className="w-full bg-transparent py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                    placeholder="nama@perusahaan.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Kata sandi <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-slate-50/60 px-3.5 transition focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100">
                  <Icons.Lock className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <Icons.EyeOff className="h-4 w-4" /> : <Icons.Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-gray-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Ingat saya
                </label>
                <button
                  type="button"
                  onClick={() => setError('Hubungi administrator untuk mereset kata sandi Anda.')}
                  className="font-semibold text-indigo-600 transition hover:text-indigo-800"
                >
                  Lupa kata sandi?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-700 hover:shadow-indigo-500/35 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-indigo-300 disabled:shadow-none"
              >
                {submitting ? (
                  <>
                    <Icons.Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <Icons.ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setFaceMode(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                <Icons.Camera className="h-4 w-4" />
                Login dengan Wajah
              </button>
            </div>

            {faceMode && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-gray-800">Login dengan Wajah</h3>
                    <button
                      type="button"
                      onClick={() => setFaceMode(false)}
                      className="text-gray-400 transition hover:text-gray-600"
                    >
                      <Icons.X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4 p-6">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
                      <video ref={videoRef} muted playsInline className="h-56 w-full object-cover" />
                    </div>
                    {faceMessage && (
                      <p className="text-xs text-red-500">{faceMessage}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleFaceLogin}
                      disabled={!modelsLoaded || !cameraReady || scanning}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      {scanning ? (
                        <>
                          <Icons.Loader2 className="h-4 w-4 animate-spin" />
                          Memindai...
                        </>
                      ) : (
                        <>
                          <Icons.ScanFace className="h-4 w-4" />
                          {modelsLoaded ? 'Pindai & Masuk' : 'Memuat model...'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Akses terbatas</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <p className="mt-4 text-center text-xs leading-relaxed text-gray-400">
              Hanya pengguna terdaftar yang dapat mengakses sistem ini.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
