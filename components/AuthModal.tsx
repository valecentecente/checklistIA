
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
    onLoginDemo: () => void;
    error?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onLoginDemo, error }) => {
    const { loginWithEmail, registerWithEmail, resetPassword, clearAuthError, authErrorCode, checkUsernameUniqueness, setAuthError } = useAuth();
    const { authTrigger, showToast } = useApp();
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [isLoadingEmail, setIsLoadingEmail] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
    const [showHistoryInvite, setShowHistoryInvite] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (authTrigger === 'history') {
                setShowHistoryInvite(true);
            } else {
                setShowHistoryInvite(false);
                setMode('login');
            }
            const savedEmail = localStorage.getItem('remembered_email');
            if (savedEmail) setEmail(savedEmail);
            setPassword('');
            setName('');
            setUsername('');
            setBirthDate('');
            setUsernameStatus('idle');
            setIsLoadingEmail(false);
            setShowPassword(false);
            clearAuthError();
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen, authTrigger]);

    useEffect(() => {
        if (mode !== 'register' || !isOpen) return;
        const cleanUsername = username.trim().toLowerCase();
        if (!cleanUsername || cleanUsername.length < 3) {
            setUsernameStatus('idle');
            return;
        }
        setUsernameStatus('loading');
        const timer = setTimeout(async () => {
            try {
                const isUnique = await checkUsernameUniqueness(cleanUsername);
                setUsernameStatus(isUnique ? 'valid' : 'invalid');
            } catch {
                setUsernameStatus('idle');
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [username, mode, isOpen]);

    if (!isOpen) return null;

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (mode === 'forgot') {
            setIsLoadingEmail(true);
            try {
                await resetPassword(email);
                showToast("E-mail de recuperação enviado!");
                setMode('login');
            } catch (err: any) {
                setAuthError("Erro ao enviar e-mail. Verifique o endereço.");
            } finally {
                setIsLoadingEmail(false);
            }
            return;
        }

        if (mode === 'register') {
            if (usernameStatus === 'invalid') {
                setAuthError("Escolha um nome de usuário disponível.");
                return;
            }
            if (!birthDate) {
                setAuthError("Data de nascimento é obrigatória.");
                return;
            }
        }
        
        setIsLoadingEmail(true);
        if (mode === 'login') {
            await loginWithEmail(email, password);
        } else {
            await registerWithEmail(name, username.trim().toLowerCase(), email, password, birthDate);
        }
        setIsLoadingEmail(false);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                {showHistoryInvite ? (
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="h-20 w-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce-y">
                            <span className="material-symbols-outlined !text-4xl text-primary">cloud_sync</span>
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">Histórico na Nuvem</h2>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark mb-8 leading-relaxed">Salve suas compras e acesse de qualquer dispositivo. Crie a sua conta para desbloquear o histórico completo.</p>
                        <div className="w-full flex flex-col gap-3">
                            <button onClick={() => setShowHistoryInvite(false)} className="h-14 w-full rounded-xl bg-primary text-white font-bold text-lg shadow-lg hover:bg-primary/90 transition-all transform active:scale-95">Entrar / Criar Conta</button>
                            <button onClick={onClose} className="h-14 w-full rounded-xl bg-gray-100 dark:bg-white/5 text-text-secondary-light dark:text-text-secondary-dark font-bold hover:bg-gray-200 transition-all">Agora não</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* UI DE ERROS CRÍTICOS */}
                        {error && (
                            <div className="absolute top-0 left-0 right-0 z-[100] animate-fadeIn">
                                {authErrorCode === 'DOMAIN_ERROR' ? (
                                    <div className="bg-zinc-900 border-b-4 border-red-500 text-white p-6 shadow-2xl flex flex-col gap-4">
                                        <div className="flex items-center gap-3 text-red-500">
                                            <span className="material-symbols-outlined !text-4xl">domain_disabled</span>
                                            <div className="flex-1">
                                                <span className="font-black text-sm uppercase block">Domínio não autorizado</span>
                                                <p className="text-[10px] text-gray-400 leading-tight">Sua chave do Firebase bloqueou o login neste endereço.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-black/60 p-4 rounded-xl border border-white/10 flex flex-col gap-3">
                                            <div>
                                                <span className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Hostname para Autorizar:</span>
                                                <code className="text-sm text-green-400 break-all select-all font-mono font-bold bg-green-500/10 px-2 py-1 rounded block">{window.location.hostname}</code>
                                            </div>
                                            <a 
                                                href="https://console.firebase.google.com/project/_/authentication/providers" 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-[10px] text-blue-400 flex items-center gap-1 hover:underline"
                                            >
                                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                Ir para Firebase Console > Auth > Settings
                                            </a>
                                        </div>
                                        
                                        <div className="flex flex-col gap-2">
                                            <button 
                                                onClick={() => { clearAuthError(); onLoginDemo(); }} 
                                                className="w-full bg-primary text-white py-3 rounded-xl text-xs font-black uppercase shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined">person_off</span>
                                                Entrar como Convidado (Modo Offline)
                                            </button>
                                            <button 
                                                onClick={clearAuthError} 
                                                className="w-full bg-white/5 hover:bg-white/10 py-2 rounded-lg text-[10px] text-gray-400 font-bold uppercase transition-colors"
                                            >
                                                Tentar outro método
                                            </button>
                                        </div>
                                    </div>
                                ) : authErrorCode === 'EMAIL_IN_USE' ? (
                                    <div className="bg-orange-600 text-white p-3 rounded-xl shadow-xl flex items-center gap-3 m-4">
                                        <span className="material-symbols-outlined text-xl">info</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold">Conta já existente.</p>
                                            <button onClick={() => { setMode('login'); clearAuthError(); }} className="text-[10px] underline uppercase font-bold opacity-80 hover:opacity-100">Vá para a aba "Entrar"</button>
                                        </div>
                                        <button onClick={clearAuthError} className="p-1"><span className="material-symbols-outlined text-sm">close</span></button>
                                    </div>
                                ) : authErrorCode === 'INVALID_CREDENTIALS' ? (
                                    <div className="bg-red-600 text-white p-4 rounded-xl shadow-xl flex flex-col gap-2 m-4">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-xl">lock_reset</span>
                                            <p className="text-xs font-bold flex-1">Dados incorretos ou conta via Google.</p>
                                            <button onClick={clearAuthError} className="p-1"><span className="material-symbols-outlined text-sm">close</span></button>
                                        </div>
                                        <button 
                                            onClick={() => { setMode('forgot'); clearAuthError(); }} 
                                            className="w-full bg-white/20 hover:bg-white/30 py-1.5 rounded text-[10px] uppercase font-bold transition-all"
                                        >
                                            Criar Senha / Recuperar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-red-500 text-white p-3 rounded-xl shadow-xl flex items-center gap-2 m-4">
                                        <span className="material-symbols-outlined text-lg">error</span>
                                        <p className="text-xs font-bold flex-1">{error}</p>
                                        <button onClick={clearAuthError}><span className="material-symbols-outlined text-sm">close</span></button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={`w-full flex items-center justify-center relative overflow-hidden shrink-0 h-24 bg-gradient-to-br from-orange-500 to-orange-700`}>
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/food.png')]"></div>
                            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-lg z-10 border-2 border-orange-100">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-orange-600">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        </div>

                        <div className="p-5 pt-4 relative">
                            <div className="flex justify-center gap-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                                <button onClick={() => { setMode('login'); clearAuthError(); }} className={`pb-2 px-2 font-semibold text-sm transition-colors ${mode === 'login' || mode === 'forgot' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Entrar</button>
                                <button onClick={() => { setMode('register'); clearAuthError(); }} className={`pb-2 px-2 font-semibold text-sm transition-colors ${mode === 'register' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Cadastrar</button>
                            </div>

                            <form onSubmit={handleEmailAuth} className="flex flex-col gap-2.5">
                                {mode === 'forgot' ? (
                                    <div className="animate-fadeIn">
                                        <p className="text-[11px] text-gray-500 mb-2">Digite seu e-mail para receber um link de redefinição.</p>
                                        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-11 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white mb-2" required />
                                        <button type="submit" disabled={isLoadingEmail} className="h-11 w-full rounded-xl bg-primary text-white font-bold shadow-md transition-colors disabled:opacity-50">
                                            {isLoadingEmail ? 'Enviando...' : 'Enviar Link'}
                                        </button>
                                        <button type="button" onClick={() => setMode('login')} className="w-full text-center text-xs text-gray-400 mt-2 hover:underline">Voltar ao Login</button>
                                    </div>
                                ) : (
                                    <>
                                        {mode === 'register' && (
                                            <>
                                                <input type="text" placeholder="Seu Nome" value={name} onChange={(e) => setName(e.target.value)} className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-11 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white" required />
                                                <div className="relative">
                                                    <input type="text" placeholder="@nomeusuario" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 15))} className={`form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border h-11 pl-8 pr-10 text-sm focus:ring-primary transition-colors ${usernameStatus === 'valid' ? 'border-green-500' : usernameStatus === 'invalid' ? 'border-red-500' : 'border-gray-200'} dark:text-white`} required />
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                                                </div>
                                                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-11 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white" required />
                                            </>
                                        )}
                                        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-11 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white" required />
                                        <div className="relative">
                                            <input type={showPassword ? "text" : "password"} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-11 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white" required minLength={6} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
                                        </div>
                                        
                                        <div className="flex justify-between items-center mt-1">
                                            {mode === 'login' && (
                                                <button type="button" onClick={() => setMode('forgot')} className="text-[10px] text-gray-400 hover:text-primary transition-colors font-semibold">Esqueceu a senha?</button>
                                            )}
                                        </div>

                                        <button type="submit" disabled={isLoadingEmail || (mode === 'register' && usernameStatus === 'invalid')} className="h-11 w-full rounded-xl bg-primary hover:bg-orange-600 text-white font-bold shadow-md transition-colors disabled:opacity-50">
                                            {isLoadingEmail ? <span className="material-symbols-outlined animate-spin">sync</span> : (mode === 'login' ? 'Entrar' : 'Cadastrar')}
                                        </button>
                                    </>
                                )}
                            </form>

                            {mode !== 'forgot' && (
                                <>
                                    <div className="relative flex py-3 items-center">
                                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                                        <span className="flex-shrink-0 mx-3 text-gray-400 text-[10px] uppercase tracking-widest">Ou</span>
                                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button onClick={onLogin} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-sm font-semibold transition-all">
                                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
                                            Google
                                        </button>
                                        <button onClick={onLoginDemo} className="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-gray-200 transition-all mt-1" title="Login Convidado">
                                            <span className="material-symbols-outlined text-lg">person_off</span>
                                        </button>
                                    </div>
                                </>
                            )}
                            <div className="mt-3 text-center">
                                <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
