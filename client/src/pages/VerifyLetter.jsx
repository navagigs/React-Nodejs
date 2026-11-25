import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LETTER_URL } from '../Api';

const VerifyLetter = () => {
  const [searchParams] = useSearchParams();
  const verifyToken = searchParams.get('t') || searchParams.get('token') || '';
  const letterNumber = verifyToken ? '' : searchParams.get('number') || '';
  const hasIdentifier = !!verifyToken || !!letterNumber;
  const [state, setState] = useState({
    loading: hasIdentifier,
    valid: false,
    message: hasIdentifier ? '' : 'Kode verifikasi tidak ditemukan di tautan.',
    letter: null
  });

  useEffect(() => {
    let active = true;
    if (!hasIdentifier) return () => { active = false; };

    const resetTimer = setTimeout(() => {
      if (active) setState({ loading: true, valid: false, message: '', letter: null });
    }, 0);

    const query = verifyToken ? `token=${encodeURIComponent(verifyToken)}` : `number=${encodeURIComponent(letterNumber)}`;
    fetch(`${LETTER_URL}/verify?${query}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Gagal memverifikasi surat');
        return result;
      })
      .then((result) => {
        if (active) setState({ loading: false, valid: !!result.valid, message: result.message || '', letter: result.letter });
      })
      .catch((error) => {
        if (active) setState({ loading: false, valid: false, message: error.message || 'Gagal memverifikasi surat', letter: null });
      });

    return () => {
      active = false;
      clearTimeout(resetTimer);
    };
  }, [verifyToken, letterNumber, hasIdentifier]);

  const rows = state.letter ? [
    ['No Surat', state.letter.letter_number],
    ['Jenis', state.letter.letter_type],
    ['Perihal', state.letter.subject],
    ['Klien', state.letter.client_name || '-'],
    ['Tanggal', state.letter.letter_date],
    ['Penandatangan', state.letter.signer_name || '-'],
    ['Jabatan', state.letter.signer_position || '-']
  ] : [];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="app-card app-card-padded w-full max-w-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Verifikasi Surat</h1>
            <p className="text-sm text-gray-500 mt-1">Cek keaslian data surat melalui QR code.</p>
          </div> 
        </div>

        {state.loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : state.valid ? (
          <>
             
            {state.letter.signature_mode === 'DIGITAL' && (
              <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
                Surat ini menggunakan tanda tangan digital.
              </div>
            )}
            {state.letter.signature_mode === 'QRCODE' && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Surat ini menggunakan QR code verifikasi.
              </div>
            )}
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-gray-100">
                  {rows.map(([label, value]) => (
                    <tr key={label}>
                      <th className="w-40 bg-slate-50 px-4 py-3 font-semibold text-gray-600">{label}</th>
                      <td className="px-4 py-3 text-gray-800 break-all">{value || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700">
            {state.message || 'Surat tidak ditemukan.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyLetter;
