
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
    const { loginWithEmail, registerWithEmail, clearAuthError, authErrorCode, checkUsernameUniqueness, setAuthError } = useAuth();
    const { authTrigger, theme } = useApp(); // Access theme here
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [isLoadingEmail, setIsLoadingEmail] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Status de validação do username
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
    
    // Novo estado para controlar a tela de convite do histórico
    const [showHistoryInvite, setShowHistoryInvite] = useState(false);

     useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            
            // Se aberto pelo histórico, mostra primeiro o convite
            if (authTrigger === 'history') {
                setShowHistoryInvite(true);
                setMode('login'); // Define login como padrão, mas a tela de convite cobre
            } else {
                setShowHistoryInvite(false);
                setMode('login');
            }

            // Tentar recuperar e-mail salvo
            const savedEmail = localStorage.getItem('remembered_email');
            if (savedEmail) {
                setEmail(savedEmail);
            } else {
                setEmail('');
            }
            
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

    // Limpar erro quando o usuário começa a digitar
    useEffect(() => {
        if (error) clearAuthError();
    }, [email, password, name, username, birthDate]);

    // Validação de Username em Tempo Real (Debounce)
    useEffect(() => {
        if (mode !== 'register' || !isOpen) return;

        const cleanUsername = username.trim().toLowerCase();
        
        if (!cleanUsername) {
            setUsernameStatus('idle');
            return;
        }

        // Validação básica regex
        const usernameRegex = /^[a-z0-9]{3,15}$/;
        if (!usernameRegex.test(cleanUsername)) {
            if (cleanUsername.length >= 3) {
                 setUsernameStatus('invalid'); 
            } else {
                 setUsernameStatus('idle');
            }
            return;
        }

        setUsernameStatus('loading');

        const timer = setTimeout(async () => {
            try {
                const isUnique = await checkUsernameUniqueness(cleanUsername);
                setUsernameStatus(isUnique ? 'valid' : 'invalid');
            } catch (error) {
                console.error("Erro ao verificar username", error);
                setUsernameStatus('idle');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username, mode, isOpen, checkUsernameUniqueness]);

    // Auto-dismiss error after 5 seconds (DISABLE for DOMAIN_ERROR)
    useEffect(() => {
        if (error) {
            // Disable auto-dismiss for domain error so user has time to copy
            if (authErrorCode === 'DOMAIN_ERROR') return;
            
            const timer = setTimeout(() => {
                clearAuthError();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, clearAuthError, authErrorCode]);
    
    if (!isOpen) return null;

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        
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
            // Validação de username no front-end
            const cleanUsername = username.trim().toLowerCase();
            await registerWithEmail(name, cleanUsername, email, password, birthDate);
        }
        setIsLoadingEmail(false);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                {showHistoryInvite ? (
                    /* TELA INTERMEDIÁRIA DE CONVITE DO HISTÓRICO */
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="h-20 w-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce-y">
                            <span className="material-symbols-outlined !text-4xl text-primary">cloud_sync</span>
                        </div>
                        
                        <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                            Histórico na Nuvem
                        </h2>
                        
                        <p className="text-text-secondary-light dark:text-text-secondary-dark mb-8 leading-relaxed">
                            Salve suas compras e acesse de qualquer dispositivo. Crie a sua conta para desbloquear o histórico completo.
                        </p>
                        
                        <div className="w-full flex flex-col gap-3">
                            <button 
                                onClick={() => {
                                    setShowHistoryInvite(false);
                                    setMode('login');
                                }} 
                                className="h-14 w-full rounded-xl bg-primary text-white font-bold text-lg shadow-lg hover:bg-primary/90 transition-all transform active:scale-95"
                            >
                                Entrar / Criar Conta
                            </button>
                            <button 
                                onClick={onClose} 
                                className="h-14 w-full rounded-xl bg-gray-100 dark:bg-white/5 text-text-secondary-light dark:text-text-secondary-dark font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                            >
                                Agora não
                            </button>
                        </div>
                    </div>
                ) : (
                    /* TELA PADRÃO DE LOGIN/CADASTRO */
                    <>
                        {/* Error Messages */}
                        {error && (
                            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-[95%] z-50 animate-fadeIn">
                                {authErrorCode === 'DOMAIN_ERROR' ? (
                                    <div className="bg-zinc-900 border-2 border-red-500/50 text-white p-4 rounded-xl shadow-2xl flex flex-col gap-3 relative">
                                        <button onClick={clearAuthError} className="absolute top-2 right-2 text-gray-400 hover:text-white p-1">
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                        <div className="flex items-center gap-2 text-red-400">
                                            <span className="material-symbols-outlined">timer</span>
                                            <span className="font-bold text-sm uppercase tracking-wide">Aguardando Propagação</span>
                                        </div>
                                        <p className="text-xs text-gray-300 leading-relaxed">
                                            Você adicionou o domínio corretamente! <br/>
                                            Porém, o Google leva de <span className="text-yellow-400 font-bold">5 a 10 minutos</span> para liberar o acesso globalmente.
                                        </p>
                                        
                                        {/* Input de Domínio para Copiar Facilmente */}
                                        <div className="flex flex-col gap-2 bg-black/60 p-3 rounded-lg border border-white/10">
                                            <div className="flex items-start gap-2">
                                                <textarea 
                                                    readOnly 
                                                    value={window.location.hostname} 
                                                    className="flex-1 bg-transparent border-none p-0 text-[11px] font-mono text-green-400 focus:ring-0 cursor-text select-all resize-none overflow-hidden break-all h-auto"
                                                    rows={3}
                                                    onClick={(e) => e.currentTarget.select()}
                                                />
                                                <button 
                                                    onClick={(e) => {
                                                        const btn = e.currentTarget;
                                                        navigator.clipboard.writeText(window.location.hostname)
                                                            .then(() => {
                                                                const originalText = btn.innerText;
                                                                btn.innerText = "OK!";
                                                                setTimeout(() => btn.innerText = originalText, 2000);
                                                            });
                                                    }}
                                                    className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-[10px] font-bold uppercase transition-colors shrink-0 text-white"
                                                >
                                                    Copiar
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => window.location.reload()}
                                            className="mt-1 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs uppercase transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-sm">refresh</span>
                                            Recarregar Página
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-red-500/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl border border-white/10 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-xl bg-white/20 p-1 rounded-full shrink-0">priority_high</span>
                                        <p className="text-sm font-medium leading-snug flex-1 text-center break-words">{error}</p>
                                        <button onClick={clearAuthError} className="text-white/70 hover:text-white p-1">
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- CABEÇALHO DO MODAL (CONDICIONAL DE NATAL) --- */}
                        <div className={`w-full flex items-center justify-center relative overflow-hidden shrink-0 transition-all duration-700 ${
                            theme === 'christmas' 
                            ? 'h-32 bg-[#001529]' // Fundo Azul Noite para Natal
                            : 'h-24 bg-gradient-to-br from-orange-500 to-orange-700' // Fundo Padrão
                        }`}>
                            {theme === 'christmas' ? (
                                <>
                                    {/* Gradiente Céu Noturno */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-[#0F2027] via-[#203A43] to-[#2C5364]"></div>
                                    
                                    {/* Lua Cheia Brilhante */}
                                    <div className="absolute top-4 right-10 w-16 h-16 bg-yellow-50 rounded-full shadow-[0_0_30px_rgba(255,255,200,0.4)] opacity-90 blur-[1px]"></div>
                                    
                                    {/* Fundo Estrelado Sutil */}
                                    <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                                    
                                    {/* Silhueta Papai Noel Voando (Imagem Transparente) */}
                                    <div 
                                        className="absolute inset-0 bg-contain bg-no-repeat z-0 opacity-90 animate-bounce-y"
                                        style={{ 
                                            backgroundImage: "url('https://cdn.pixabay.com/photo/2016/12/17/14/33/santa-claus-1913504_1280.png')",
                                            backgroundSize: '180px',
                                            backgroundPosition: '10% 80%', // Posicionado à esquerda/baixo voando para direita
                                            filter: 'brightness(0) invert(1) drop-shadow(0 0 5px rgba(255,255,255,0.5))' // Torna a silhueta branca brilhante
                                        }}
                                    ></div>
                                    
                                    {/* Neve caindo sutilmente */}
                                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/snow.png')] pointer-events-none"></div>
                                </>
                            ) : (
                                /* Fundo Padrão de Comida */
                                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/food.png')]"></div>
                            )}
                            
                            {/* Logo Central (Flutuante) */}
                            <div className={`h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-lg z-10 border-2 ${theme === 'christmas' ? 'border-red-600 ring-4 ring-white/10' : 'border-orange-100'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={`w-10 h-10 ${theme === 'christmas' ? 'text-red-600' : 'text-orange-600'}`}>
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            
                            {/* Versão */}
                            <span className="absolute top-2 right-2 text-[10px] text-white/80 font-bold bg-black/20 px-1.5 py-0.5 rounded font-mono border border-white/10 z-20">v3.1</span>
                        </div>

                        <div className="p-5 pt-4 relative">
                            {/* Title Toggle */}
                            <div className="flex justify-center gap-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                                <button 
                                    onClick={() => setMode('login')}
                                    className={`pb-2 px-2 font-semibold text-sm transition-colors ${mode === 'login' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    Entrar
                                </button>
                                <button 
                                    onClick={() => setMode('register')}
                                    className={`pb-2 px-2 font-semibold text-sm transition-colors ${mode === 'register' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    Criar Conta
                                </button>
                            </div>

                            {/* Email/Pass Form */}
                            <form onSubmit={handleEmailAuth} className="flex flex-col gap-2.5">
                                {mode === 'register' && (
                                    <>
                                        <input
                                            type="text"
                                            placeholder="Seu Nome"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-11 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white"
                                            required
                                        />
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="@nomeusuario"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15))}
                                                className={`form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border h-11 pl-8 pr-10 text-sm focus:ring-primary focus:border-primary dark:text-white transition-colors
                                                    ${usernameStatus === 'valid' ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/30' : 
                                                      usernameStatus === 'invalid' ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : 
                                                      'border-gray-200 dark:border-gray-700'}`}
                                                required
                                                minLength={3}
                                                maxLength={15}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                                            
                                            {/* Status Icons */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                                {usernameStatus === 'loading' && (
                                                    <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                )}
                                                {usernameStatus === 'valid' && (
                                                    <span className="material-symbols-outlined text-green-500 text-lg animate-fadeIn">check_circle</span>
                                                )}
                                                {usernameStatus === 'invalid' && (
                                                    <span className="material-symbols-outlined text-red-500 text-lg animate-fadeIn">cancel</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 px-1 -mt-1.5 leading-tight flex justify-between">
                                            <span>3-15 letras minúsculas e números.</span>
                                            {usernameStatus === 'invalid' && <span className="text-red-500 font-bold">Indisponível</span>}
                                            {usernameStatus === 'valid' && <span className="text-green-600 font-bold">Disponível</span>}
                                        </p>
                                        
                                        {/* Campo de Data de Nascimento */}
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={birthDate}
                                                onChange={(e) => setBirthDate(e.target.value)}
                                                className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-11 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white"
                                                required
                                                max={new Date().toISOString().split("T")[0]} // Não permite data futura
                                            />
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 px-1 mt-0.5">
                                                Data de nascimento (Necessário para restrição de idade)
                                            </p>
                                        </div>
                                    </>
                                )}
                                <input
                                    type="email"
                                    placeholder="E-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-11 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white"
                                    required
                                />
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Senha"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-11 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                
                                {/* Show Password Checkbox */}
                                <label className="flex items-center gap-2 px-1 cursor-pointer select-none mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        checked={showPassword} 
                                        onChange={() => setShowPassword(!showPassword)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-gray-50 dark:bg-black/20 dark:border-gray-600"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Mostrar senha</span>
                                </label>
                                
                                <button 
                                    type="submit"
                                    disabled={isLoadingEmail || (mode === 'register' && usernameStatus === 'invalid')}
                                    className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-primary hover:bg-orange-600 text-white font-bold shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoadingEmail ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        mode === 'login' ? 'Entrar' : 'Cadastrar'
                                    )}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="relative flex py-3 items-center">
                                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                                <span className="flex-shrink-0 mx-3 text-gray-400 text-[10px] uppercase tracking-widest">Ou</span>
                                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                            </div>

                            {/* Secondary Actions */}
                            <div className="flex flex-col gap-2 relative">
                                <button 
                                    onClick={onLogin}
                                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/10 text-text-primary-light dark:text-text-primary-dark text-sm font-semibold transition-all relative overflow-hidden group"
                                >
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                                    {mode === 'login' ? 'Entrar com Google' : 'Cadastrar com Google'}
                                </button>

                                {/* Botão Convidado (Novo) */}
                                <button 
                                    onClick={onLoginDemo}
                                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/5 text-text-secondary-light dark:text-text-secondary-dark text-sm font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-all border border-transparent dark:border-white/5"
                                >
                                    <span className="material-symbols-outlined text-lg">person_off</span>
                                    Entrar como Convidado (Admin)
                                </button>
                            </div>

                            <div className="mt-3 text-center">
                                <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
