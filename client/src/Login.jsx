import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// Import Ikon dari React Icons
import { FaEye, FaEyeSlash, FaGoogle, FaFacebookF, FaTwitter } from 'react-icons/fa';
import { LOGIN_URL } from './Api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State untuk lihat password
  const [error, setError] = useState('');
  const navigate = useNavigate();

 const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // 1. Kirim request login ke backend
      const res = await axios.post(LOGIN_URL, { email, password });
      
      // 2. Ambil data dari response backend
      const { token, role_id, permissions } = res.data;

      // 3. Simpan ke LocalStorage agar bisa diakses oleh Sidebar / Navbar / Routing Guard
      localStorage.setItem('token', token);
      localStorage.setItem('role_id', role_id);
      
      // Karena permissions berbentuk array/object, wajib diubah ke string JSON dlu
      localStorage.setItem('permissions', JSON.stringify(permissions || []));

      // 4. Arahkan ke dashboard
      navigate('/dashboard');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Gagal terhubung ke server.');
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      
      {/* BAGIAN KIRI: ILUSTRASI (Hanya muncul di layar laptop/besar) */}
      <div className="hidden md:flex w-1/2 bg-[#F8F5FF] flex-col justify-center items-center p-10 relative">
        <div className="absolute top-10 left-10">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-indigo-600 text-3xl">⚡</span> StrikingDash
          </h1>
        </div>
        <div className="text-center">
            {/* GANTI src di bawah ini dengan gambar ilustrasi Anda sendiri */}
            <img 
              src="https://img.freepik.com/free-vector/mobile-login-concept-illustration_114360-83.jpg?w=740" 
              alt="Illustration" 
              className="max-w-md mx-auto mb-6 mix-blend-multiply"
            />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">StrikingDash React <br/> Web Application</h2>
        </div>
      </div>

      {/* BAGIAN KANAN: FORM LOGIN */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-24 py-10">
        
        {/* Link Sign Up di pojok kanan atas */}
        <div className="absolute top-5 right-10 text-sm text-gray-500">
          Don't have an account? <a href="#" className="text-indigo-600 font-semibold hover:underline">Sign up now</a>
        </div>

        <div className="w-full max-w-md mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Sign in to <span className="text-pink-500">Admin</span>
            </h2>
            <p className="text-gray-500 mb-8 text-sm">Please enter your credentials to proceed.</p>

            {error && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded mb-4 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* Input Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username or Email Address <span className="text-red-500">*</span>
                </label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                  placeholder="name@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                />
              </div>

              {/* Input Password dengan Mata */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
                    placeholder="......."
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                  />
                  {/* Tombol Mata */}
                  <button 
                    type="button"
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                  </button>
                </div>
              </div>

              {/* Checkbox & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-gray-600 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-2" />
                  Keep me logged in
                </label>
                <a href="#" className="text-indigo-600 font-semibold hover:underline">Forgot password?</a>
              </div>

              {/* Tombol Sign In Utama */}
              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-200"
              >
                Sign In
              </button>
            </form>

            {/* Pembatas "Or" */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            {/* Tombol Firebase (Ungu) */}
            <button className="w-full bg-[#5F63F2] hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg mb-4 transition flex justify-center items-center gap-2">
              Sign in with Firebase
            </button>

            {/* Tombol Social Media (Google, FB, Twitter) */}
            <div className="flex gap-4 justify-center">
              <button className="flex-1 flex justify-center items-center py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                 <FaGoogle className="text-red-500" />
                 <span className="ml-2 text-sm text-gray-600 font-medium">Google</span>
              </button>
              <button className="w-12 h-10 flex justify-center items-center border border-gray-200 rounded-lg hover:bg-blue-50 text-blue-600 transition">
                 <FaFacebookF />
              </button>
              <button className="w-12 h-10 flex justify-center items-center border border-gray-200 rounded-lg hover:bg-sky-50 text-sky-400 transition">
                 <FaTwitter />
              </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Login;