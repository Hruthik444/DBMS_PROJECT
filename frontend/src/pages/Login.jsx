import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LockKeyhole, UserRound, ArrowRight, Eye, EyeOff, ShieldCheck, Wallet, Sun, Moon } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });
    const { login } = useAuth();
    const { darkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const validate = () => {
        const errs = { username: '', password: '' };
        if (!username.trim()) errs.username = 'Username is required';
        if (!password) errs.password = 'Password is required';
        setFieldErrors(errs);
        return !errs.username && !errs.password;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!validate()) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        try {
            const response = await api.post('/auth/login', formData);
            login(response.data.access_token, username);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-[#0B1120] text-[#F8FAFC]' : 'bg-gray-100 text-gray-900'}`}>
            <div className={`w-full max-w-md rounded-2xl shadow-2xl p-8 relative border ${darkMode ? 'bg-[#172033] border-white/10' : 'bg-white border-gray-200'}`}>
                <button onClick={toggleTheme} className="absolute top-4 right-4 text-slate-400 hover:text-white transition" aria-label="Toggle theme">
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="flex items-center gap-3 mb-6 justify-center">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Wallet size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">SplitMate</h1>
                        <p className="text-slate-400 text-xs">Shared expenses, simplified.</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-center mb-1">Welcome back</h2>
                <p className="text-slate-400 text-center text-sm mb-6">Your group expenses are just a step away.</p>

                <div className="flex items-center justify-center gap-2 text-slate-400 text-xs mb-6">
                    <ShieldCheck size={14} className="text-indigo-400" /> Secure sign-in
                </div>

                {error && (
                    <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5" noValidate>
                    <div className="space-y-1.5">
                        <label className="block text-sm text-slate-300">Username</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6D28D9]">
                                <UserRound size={20} strokeWidth={2} />
                            </div>
                            <input
                                type="text"
                                className={`w-full pl-11 pr-4 py-3 rounded-xl bg-[#1E293B] border text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.username ? 'border-red-500/50' : 'border-white/10'}`}
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); setFieldErrors((p) => ({ ...p, username: '' })); }}
                                disabled={loading}
                                required
                            />
                        </div>
                        {fieldErrors.username && <p className="text-xs text-red-400 mt-1">{fieldErrors.username}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm text-slate-300">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6D28D9]">
                                <LockKeyhole size={20} strokeWidth={2} />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className={`w-full pl-11 pr-12 py-3 rounded-xl bg-[#1E293B] border text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.password ? 'border-red-500/50' : 'border-white/10'}`}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })); }}
                                disabled={loading}
                                required
                            />
                            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6D28D9] hover:text-indigo-400 transition">
                                {showPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                            </button>
                        </div>
                        {fieldErrors.password && <p className="text-xs text-red-400 mt-1">{fieldErrors.password}</p>}
                    </div>

                    <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-indigo-500 text-white py-3 rounded-xl font-semibold hover:bg-indigo-600 transition disabled:opacity-60">
                        {loading ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-400">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-indigo-400 font-bold hover:underline">
                        Create one
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
