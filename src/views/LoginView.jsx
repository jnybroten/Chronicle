import React, { useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import sealImg from '../assets/seal.png'; // Assuming this path is correct relative to views
import { Sparkles, User, LogIn, Mail, Lock, ArrowRight, AlertCircle } from '../components/Icons'; // Assuming Icons are available here

const LoginView = ({ theme }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            await auth.signInWithPopup(googleProvider);
        } catch (err) {
            console.error("Google Sign In Error:", err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError('Sign in cancelled.');
            } else if (err.code === 'auth/popup-blocked') {
                setError('Popup blocked. Please allow popups for this site.');
            } else {
                setError(err?.message || 'An unknown error occurred during Google Sign In.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isLoginMode) {
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await auth.signInAnonymously();
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-gray-100" style={{ backgroundColor: theme.bg, color: theme.text }}>
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl border-2" style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}>

                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                    <img src={sealImg} alt="Chronicle Seal" className="w-24 h-24 mb-4 drop-shadow-md" />
                    <h1 className="text-3xl font-bold font-cinzel text-center">Chronicle</h1>
                    <p className="text-sm opacity-60 italic mt-2">"Your financial legacy, written today."</p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <div className="text-sm">{error}</div>
                    </div>
                )}

                {/* Email Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1 opacity-70">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-40" size={16} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 p-3 border rounded-lg bg-transparent focus:ring-2 ring-emerald-500/20 outline-none transition-all"
                                style={{ borderColor: theme.borderColor }}
                                placeholder="archivist@chronicle.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1 opacity-70">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-40" size={16} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 p-3 border rounded-lg bg-transparent focus:ring-2 ring-emerald-500/20 outline-none transition-all"
                                style={{ borderColor: theme.borderColor }}
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full old-book-btn p-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Account')}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </form>

                {/* Toggle Mode */}
                <div className="text-center mt-4">
                    <button
                        onClick={() => { setError(null); setIsLoginMode(!isLoginMode); }}
                        className="text-xs font-bold hover:underline opacity-60 hover:opacity-100 transition-opacity"
                    >
                        {isLoginMode ? "Need an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>

                <div className="my-6 flex items-center gap-4 opacity-30">
                    <div className="h-px bg-current flex-1"></div>
                    <div className="text-xs uppercase font-bold">Or</div>
                    <div className="h-px bg-current flex-1"></div>
                </div>

                {/* Social / Guest */}
                <div className="space-y-3">
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full p-3 rounded-lg border-2 font-bold flex items-center justify-center gap-2 hover:bg-black/5 transition-colors disabled:opacity-50"
                        style={{ borderColor: theme.borderColor }}
                    >
                        <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                        </div>
                        Sign in with Google
                    </button>

                    <button
                        onClick={handleGuestLogin}
                        disabled={loading}
                        className="w-full p-2 text-sm opacity-50 hover:opacity-80 transition-opacity font-bold"
                    >
                        Continue as Guest Player
                    </button>
                </div>

            </div>
        </div>
    );
};

export default LoginView;
