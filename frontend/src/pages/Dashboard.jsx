import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Users, Plus, UserPlus, UserCircle, Search, ArrowRight, LogOut, Wallet, TrendingDown, TrendingUp, Layers, X, Loader2, Sun, Moon } from 'lucide-react';

const Dashboard = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [joinGroupId, setJoinGroupId] = useState('');
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [summary, setSummary] = useState({ totalExpenses: 0, youOwe: 0, youAreOwed: 0 });
    const { user, logout } = useAuth();
    const { darkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await api.get('/groups/');
            setGroups(res.data);
        } catch (err) {
            console.error('Failed to fetch groups');
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async (groupsList) => {
        let total = 0, owe = 0, owed = 0;
        await Promise.all(groupsList.map(async (g) => {
            try {
                const exp = await api.get(`/expenses/group/${g.group_id}`);
                total += exp.data.reduce((s, e) => s + (e.amount || 0), 0);
            } catch {}
            try {
                const bal = await api.get(`/balances/group/${g.group_id}`);
                const me = bal.data.find((b) => b.username === user?.username);
                if (me) {
                    if (me.balance < 0) owe += Math.abs(me.balance);
                    else owed += me.balance;
                }
            } catch {}
        }));
        setSummary({ totalExpenses: total, youOwe: owe, youAreOwed: owed });
    };

    useEffect(() => { fetchGroups(); }, []);
    useEffect(() => { if (groups.length) fetchSummary(groups); }, [groups]);

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) { setCreateError('Group name is required'); return; }
        setCreating(true); setCreateError('');
        try {
            await api.post('/groups/', { group_name: newGroupName.trim() });
            setNewGroupName(''); setShowCreate(false);
            fetchGroups();
        } catch (err) {
            setCreateError(err.response?.data?.detail || 'Failed to create group');
        } finally { setCreating(false); }
    };

    const handleJoinGroup = async (e) => {
        e.preventDefault();
        if (!joinGroupId) return;
        setJoining(true); setJoinError('');
        try {
            await api.post(`/groups/${joinGroupId}/join`);
            setJoinGroupId('');
            fetchGroups();
        } catch (err) {
            setJoinError(err.response?.data?.detail || 'Failed to join group. Check the ID.');
        } finally { setJoining(false); }
    };

    const filtered = useMemo(() => {
        return groups.filter((g) => g.group_name.toLowerCase().includes(search.toLowerCase()));
    }, [groups, search]);

    const cardColors = ['#6366F1', '#8B5CF6', '#EC4899', '#22C55E', '#F59E0B'];

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-white dark:bg-[#0B1120] text-gray-900 dark:text-[#F8FAFC]' : 'bg-gray-100 text-gray-900'}`}>
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#111827]/90 backdrop-blur border-b border-gray-200 dark:border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-indigo-400">
                        <LayoutDashboard /> <span className="text-white">ExpenseManager</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleTheme} className="text-gray-700 dark:text-slate-300 hover:text-white transition" aria-label="Toggle theme">
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <Link to="/profile" className="flex items-center gap-2 text-gray-700 dark:text-slate-300 hover:text-white transition">
                            <UserCircle size={20} /> <span className="hidden sm:inline">{user?.username || 'User'}</span>
                        </Link>
                        <button onClick={() => { if (window.confirm('Log out?')) { logout(); navigate('/login'); } }} className="flex items-center gap-1 text-red-400 hover:text-red-300 transition text-sm">
                            <LogOut size={18} /> <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                {/* Welcome */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {user?.username || 'User'} 👋</h1>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">Here's what's happening with your shared expenses.</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition self-start">
                        <Plus size={18} /> Create Group
                    </button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: 'Total Group Expenses', value: `₹${summary.totalExpenses.toFixed(2)}`, icon: Wallet, color: '#6366F1' },
                        { title: 'You Owe', value: `₹${summary.youOwe.toFixed(2)}`, icon: TrendingDown, color: '#F59E0B' },
                        { title: 'You Are Owed', value: `₹${summary.youAreOwed.toFixed(2)}`, icon: TrendingUp, color: '#22C55E' },
                        { title: 'Active Groups', value: groups.length, icon: Layers, color: '#8B5CF6' },
                    ].map((c, i) => (
                        <div key={i} className="bg-white dark:bg-[#172033] border border-gray-200 dark:border-white/10 rounded-2xl p-5 hover:border-indigo-500/40 hover:-translate-y-0.5 transition">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-gray-500 dark:text-slate-400">{c.title}</span>
                                <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.color + '22', color: c.color }}>
                                    <c.icon size={18} />
                                </span>
                            </div>
                            <div className="text-2xl font-bold">{c.value}</div>
                        </div>
                    ))}
                </div>

                {/* My Groups */}
                <section>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold">My Groups</h2>
                            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full">{filtered.length}</span>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#172033] border border-gray-200 dark:border-white/10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[1,2,3].map((i) => <div key={i} className="bg-white dark:bg-[#172033] border border-gray-200 dark:border-white/10 rounded-2xl p-6 h-32 animate-pulse" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white dark:bg-[#172033] border border-gray-200 dark:border-white/10 rounded-2xl p-10 text-center">
                            <Users size={40} className="mx-auto text-slate-500 mb-3" />
                            <p className="text-gray-500 dark:text-slate-400 mb-4">No groups found. Create one or join using an ID!</p>
                            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-600 transition">
                                <Plus size={16} /> Create Group
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map((group, i) => (
                                <div key={group.group_id} onClick={() => navigate(`/group/${group.group_id}`)} className="bg-white dark:bg-[#172033] border border-gray-200 dark:border-white/10 rounded-2xl p-5 cursor-pointer hover:border-indigo-500/50 hover:-translate-y-1 transition group">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: cardColors[i % cardColors.length] }}>
                                            <Users size={22} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{group.group_name}</h3>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">ID: {group.group_id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 dark:text-slate-400">Open Group</span>
                                        <ArrowRight size={16} className="text-indigo-400 group-hover:translate-x-1 transition" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Join group */}
                <section className="bg-white dark:bg-[#172033] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <UserPlus size={20} className="text-indigo-400" />
                        <h3 className="font-semibold">Join an existing group</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Enter a group ID shared by your friends.</p>
                    <form onSubmit={handleJoinGroup} className="flex flex-col sm:flex-row gap-3">
                        <input type="number" placeholder="Enter Group ID" value={joinGroupId} onChange={(e) => setJoinGroupId(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1E293B] border border-gray-200 dark:border-white/10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <button type="submit" disabled={joining} className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                            {joining && <Loader2 size={16} className="animate-spin" />} Join Group
                        </button>
                    </form>
                    {joinError && <p className="text-sm text-red-400 mt-2">{joinError}</p>}
                </section>
            </main>

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#172033] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Create Group</h3>
                            <button onClick={() => setShowCreate(false)} className="text-gray-500 dark:text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">Group name</label>
                                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Trip to Goa" className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1E293B] border border-gray-200 dark:border-white/10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                {createError && <p className="text-sm text-red-400 mt-1">{createError}</p>}
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-700 dark:text-slate-300 hover:bg-white/10 transition">Cancel</button>
                                <button type="submit" disabled={creating} className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition disabled:opacity-60 flex items-center gap-2">
                                    {creating && <Loader2 size={16} className="animate-spin" />} Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
