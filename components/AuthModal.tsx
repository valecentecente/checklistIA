
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
    error?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, error }) => {
    const { loginWithEmail, registerWithEmail, resetPassword, clearAuthError, checkUsernameUniqueness, setAuthError } = useAuth();
    const { authTrigger, showToast } = useApp();
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [isLoadingEmail, setIsLoadingEmail] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
    const [showHistoryInvite, setShowHistoryInvite] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (authTrigger === 'history') setShowHistoryInvite(true);
            else { setShowHistoryInvite(false); setMode('login'); }
            const savedEmail = localStorage.getItem('remembered_email');
            if (savedEmail) setEmail(savedEmail);
            setPassword(''); setName(''); setUsername(''); setUsernameStatus('idle');
            setIsLoadingEmail(false); clearAuthError();
        }
    }, [isOpen, authTrigger]);

    useEffect(() => {
        if (mode !== 'register' || !isOpen) return;
        const clean = username.trim().toLowerCase();
        if (!clean || clean.length < 3) { setUsernameStatus('idle'); return; }
        setUsernameStatus('loading');
        const timer = setTimeout(async () => {
            try { setUsernameStatus(await checkUsernameUniqueness(clean) ? 'valid' : 'invalid'); } catch { setUsernameStatus('idle'); }
        }, 500);
        return () => clearTimeout(timer);
    }, [username, mode, isOpen]);

    if (!isOpen) return null;

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'forgot') {
            setIsLoadingEmail(true);
            try { await resetPassword(email); showToast("Link enviado!"); setMode('login'); } 
            catch { setAuthError("Erro ao enviar."); } finally { setIsLoadingEmail(false); }
            return;
        }
        if (mode === 'register' && usernameStatus === 'invalid') return;
        setIsLoadingEmail(true);
        if (mode === 'login') await loginWithEmail(email, password);
        else await registerWithEmail(name, username.trim().toLowerCase(), email, password);
        setIsLoadingEmail(false);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                {showHistoryInvite ? (
                    <div className="p-8 text-center">
                        <div className="h-20 w-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"><span className="material-symbols-outlined !text-4xl text-primary">cloud_sync</span></div>
                        <h2 className="text-2xl font-bold mb-2">Sincronize sua Lista</h2>
                        <p className="text-gray-500 mb-8">Crie sua conta para acessar suas compras de qualquer lugar.</p>
                        <button onClick={() => setShowHistoryInvite(false)} className="h-14 w-full rounded-xl bg-primary text-white font-bold shadow-lg">Continuar</button>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex justify-center gap-4 mb-6 border-b dark:border-gray-700">
                            <button onClick={() => setMode('login')} className={`pb-2 px-2 font-bold ${mode === 'login' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Entrar</button>
                            <button onClick={() => setMode('register')} className={`pb-2 px-2 font-bold ${mode === 'register' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Cadastrar</button>
                        </div>
                        
                        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-xs font-bold">{error}</div>}
                        
                        {/* 1. GOOGLE LOGIN (PRIORIDADE) */}
                        <button 
                            onClick={onLogin}
                            className="w-full h-14 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all active:scale-95"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Entrar com Google</span>
                        </button>

                        {/* 2. SEPARADOR */}
                        <div className="relative flex py-6 items-center">
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                            <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">ou e-mail</span>
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        </div>
                        
                        {/* 3. FORMULÁRIO MANUAL */}
                        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
                            {mode === 'register' && (
                                <>
                                    <input type="text" placeholder="Seu Nome" value={name} onChange={e => setName(e.target.value)} className="form-input rounded-xl dark:bg-black/20 dark:text-white h-12" required />
                                    <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="form-input rounded-xl dark:bg-black/20 dark:text-white h-12" required />
                                </>
                            )}
                            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="form-input rounded-xl dark:bg-black/20 dark:text-white h-12" required />
                            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="form-input rounded-xl dark:bg-black/20 dark:text-white h-12" required />
                            
                            {/* 4. BOTÃO ENTRAR (AGORA NO FINAL) */}
                            <button type="submit" disabled={isLoadingEmail} className="h-14 bg-primary text-white rounded-xl font-bold mt-2 shadow-lg hover:bg-primary-hover transition-all active:scale-95">
                                {isLoadingEmail ? 'Processando...' : (mode === 'login' ? 'Entrar' : 'Criar Minha Conta')}
                            </button>
                            
                            {mode === 'login' && (
                                <button type="button" onClick={() => setMode('forgot')} className="text-xs text-gray-500 hover:text-primary transition-colors text-center mt-2">Esqueceu a senha?</button>
                            )}
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
