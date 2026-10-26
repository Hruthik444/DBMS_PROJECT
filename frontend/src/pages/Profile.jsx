import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCircle, Mail, Shield, LogOut, ArrowLeft } from 'lucide-react';

const Profile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <button onClick={() => navigate('/dashboard')} className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition">
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>

                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <div className="px-8 pb-8 -mt-16 text-center">
                        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 border-4 border-white shadow-xl mb-4">
                            <UserCircle size={80} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-1">{user?.username || 'User'}</h2>
                        <p className="text-white/70 mb-6">Expense Manager Member</p>

                        <div className="space-y-3 text-left">
                            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                                <Mail className="text-white/80" size={20} />
                                <div>
                                    <p className="text-xs text-white/60">Username</p>
                                    <p className="text-white font-medium">{user?.username || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                                <Shield className="text-white/80" size={20} />
                                <div>
                                    <p className="text-xs text-white/60">Account Status</p>
                                    <p className="text-green-300 font-medium">Active</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => { logout(); navigate('/login'); }}
                            className="mt-8 w-full flex items-center justify-center gap-2 bg-red-500/80 hover:bg-red-500 text-white p-3 rounded-xl font-semibold transition-all"
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
