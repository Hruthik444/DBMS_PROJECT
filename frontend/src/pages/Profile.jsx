import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, UserCircle, ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react';

const Profile = () => {
    const { user, logout } = useAuth();
    const { darkMode } = useTheme();
    const navigate = useNavigate();

    const card = darkMode ? 'bg-[#172033] border-white/10 text-[#F8FAFC]' : 'bg-white border-gray-200 text-gray-900';
    const sub = darkMode ? 'text-[#94A3B8]' : 'text-gray-500';

    return (
        <div className={`min-h-screen p-4 sm:p-6 ${darkMode ? 'bg-[#0B1120] text-[#F8FAFC]' : 'bg-[#F5F7FC] text-[#172033]'}`}>
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-600 transition">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                    <p className={`text-xs mt-1 ${sub}`}>Dashboard / My Profile</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Profile summary */}
                    <div className={`rounded-2xl border p-6 ${card}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-500">
                                <UserCircle size={56} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{user?.username || 'User'}</h2>
                                <p className={`text-sm ${sub}`}>ExpenseManager Member</p>
                                <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-500">Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Account info */}
                    <div className={`rounded-2xl border p-6 ${card}`}>
                        <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <UserCircle size={18} className="text-indigo-500" />
                                <div>
                                    <p className={`text-xs ${sub}`}>Username</p>
                                    <p className="font-medium">{user?.username || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={18} className="text-green-500" />
                                <div>
                                    <p className={`text-xs ${sub}`}>Account Status</p>
                                    <p className="font-medium text-green-500">Active</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className={`rounded-2xl border p-6 mt-6 ${card}`}>
                    <h3 className="text-lg font-semibold mb-4">Account Actions</h3>
                    <div className="flex flex-wrap gap-3">
                        <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition">
                            <LayoutDashboard size={16} /> Back to Dashboard
                        </Link>
                        <button onClick={() => { if (window.confirm('Log out?')) { logout(); navigate('/login'); } }} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 transition">
                            <LogOut size={16} /> Log Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
