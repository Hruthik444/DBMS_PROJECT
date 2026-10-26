import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { User, Mail, Lock, UserPlus } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
    });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', formData);
            navigate('/login');
        } catch (err) {
            alert('Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-300 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border dark:border-gray-700 transition-colors duration-300">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full mb-4 shadow-lg shadow-blue-500/30">
                        <UserPlus size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Create Account</h2>
                    <p className="text-gray-500 dark:text-gray-400">Join us to start tracking your shared expenses</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Username</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                                placeholder="Choose a username"
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                                placeholder="email@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-semibold hover:bg-blue-700 transition-all transform active:scale-95 shadow-lg shadow-blue-500/20">
                        Sign Up
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-colors">
                            Login here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
