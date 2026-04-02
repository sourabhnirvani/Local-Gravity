import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User, Lock, Mail } from 'lucide-react';

interface AuthScreenProps {
    onLoginSuccess: (username: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const res = await authService.login({ email, password });
                if (res.success) {
                    onLoginSuccess(res.username ?? email);
                } else {
                    setError(res.error || 'Login failed');
                }
            } else {
                const res = await authService.register({ username, email, password });
                if (res.success) {
                    onLoginSuccess(res.username ?? email);
                } else {
                    setError(res.error || 'Registration failed');
                }
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e0e11] text-gray-300 w-full overflow-hidden select-none font-sans">
            {/* Title Bar Area (Draggable) */}
            <div className="absolute top-0 left-0 w-full h-10 border-b border-[#2a2a32] bg-[#1a1a1f] flex items-center justify-center draggable z-50">
                <span className="text-xs font-semibold tracking-wider text-gray-400">LOCALGRAVITY</span>
                {/* Window Controls Note: Not required here as App.tsx might render TitleBar overall, but just in case we are full-screen Auth. */}
            </div>

            <div className="w-full max-w-sm mt-12 bg-[#1a1a1f] p-8 rounded-lg shadow-2xl border border-[#2a2a32]">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl mb-4 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <User size={24} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-100 tracking-tight">
                        {isLogin ? 'Welcome back' : 'Create account'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        {isLogin ? 'Enter your details to sign in.' : 'Register to start using LocalGravity.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                            <p className="text-sm text-red-500 text-center">{error}</p>
                        </div>
                    )}

                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#0e0e11] border border-[#2a2a32] rounded-md px-10 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-colors placeholder-[#2a2a32]"
                                    placeholder="johndoe"
                                    required={!isLogin}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#0e0e11] border border-[#2a2a32] rounded-md px-10 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-colors placeholder-[#2a2a32]"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#0e0e11] border border-[#2a2a32] rounded-md px-10 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-colors placeholder-[#2a2a32]"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#3b82f6] hover:bg-blue-600 text-white rounded-md py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-lg shadow-blue-500/20"
                    >
                        {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="text-xs text-gray-400 hover:text-gray-200 transition-colors bg-transparent border-none outline-none cursor-pointer"
                    >
                        {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
            <div className="mt-8 text-xs text-[#2a2a32]">
                A Cursor-like AI IDE powered by LocalGravity
            </div>
        </div>
    );
};

export default AuthScreen;
