
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, updateUserProfile, updateUserPassword, removeProfilePhoto, updateUsername, deleteAccount, checkUsernameUniqueness } = useAuth();
    const { openModal } = useApp(); // Hook para abrir outros modais
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [birthDate, setBirthDate] = useState(''); // Estado para Data de Nascimento
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    
    // Username Verification State
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
    
    // Senha states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Delete Account states
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPhotoMenu, setShowPhotoMenu] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && user) {
            document.body.style.overflow = 'hidden';
            setName(user.displayName || '');
            setUsername(user.username || '');
            setBirthDate(user.birthDate || '');
            setUsernameStatus('idle');
            setPhotoPreview(user.photoURL || null);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setDeletePassword('');
            setIsDeletingAccount(false);
            setMessage(null);
            setActiveTab('profile');
            setShowPhotoMenu(false);
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen, user]);

    // Lógica de verificação de Username em tempo real
    useEffect(() => {
        if (!isOpen || !user) return;

        const cleanUsername = username.trim().toLowerCase();
        
        // Se estiver vazio ou for igual ao atual, reseta status
        if (!cleanUsername || cleanUsername === user.username) {
            setUsernameStatus('idle');
            return;
        }

        // Validação básica de regex (3-15 chars, alfanumérico)
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
        }, 500); // Debounce de 500ms

        return () => clearTimeout(timer);
    }, [username, isOpen, user, checkUsernameUniqueness]);

    // Função para redimensionar imagem usando Canvas (compressão para salvar no BD)
    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 150; // Tamanho pequeno para perfil
                    const MAX_HEIGHT = 150;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Qualidade 70%
                    } else {
                        reject(new Error("Falha ao criar contexto canvas"));
                    }
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const resizedBase64 = await resizeImage(file);
                setPhotoPreview(resizedBase64);
                setShowPhotoMenu(false);
            } catch (error) {
                console.error("Erro ao processar imagem", error);
                setMessage({ type: 'error', text: 'Erro ao processar imagem. Tente outra.' });
            }
        }
    };

    const handleRemovePhoto = async () => {
        setShowPhotoMenu(false);
        if (window.confirm("Tem certeza que deseja remover sua foto de perfil?")) {
            try {
                await removeProfilePhoto();
                setPhotoPreview(null);
                setMessage({ type: 'success', text: 'Foto removida com sucesso!' });
            } catch (error: any) {
                setMessage({ type: 'error', text: error.message });
            }
        }
    };
    
    const handleSelectPhoto = () => {
        setShowPhotoMenu(false);
        fileInputRef.current?.click();
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (usernameStatus === 'invalid') {
             setMessage({ type: 'error', text: 'O nome de usuário escolhido não está disponível.' });
             return;
        }

        setIsLoading(true);
        setMessage(null);
        try {
            // Atualiza nome, foto e data de nascimento
            await updateUserProfile(name, photoPreview || undefined, birthDate);
            
            // Atualiza username (separado pois tem regras de rate limit)
            if (user && username !== user.username) {
                await updateUsername(username);
            }

            setMessage({ type: 'success', text: 'Perfil salvo com sucesso!' });
            // Aumentado para 3.5 segundos para melhor visibilidade
            setTimeout(onClose, 3500);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword) {
            setMessage({ type: 'error', text: 'Por favor, digite sua senha atual.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas novas não coincidem.' });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres.' });
            return;
        }

        setIsLoading(true);
        setMessage(null);
        try {
            await updateUserPassword(currentPassword, newPassword);
            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(onClose, 3500);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deletePassword) {
            setMessage({ type: 'error', text: 'Digite sua senha para confirmar.' });
            return;
        }

        setIsLoading(true);
        setMessage(null);
        try {
            await deleteAccount(deletePassword);
            onClose(); // Fecha o modal, o contexto de Auth vai redirecionar ou limpar o estado
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
            setIsLoading(false);
        }
    };

    const handleOpenPreferences = () => {
        onClose(); // Fecha o perfil
        setTimeout(() => {
            openModal('preferences'); // Abre as preferências
        }, 300);
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                
                {/* Success Overlay - Garante que cubra tudo com z-index alto */}
                {message?.type === 'success' && (
                    <div className="absolute inset-0 z-50 bg-white dark:bg-surface-dark flex flex-col items-center justify-center p-6 animate-fadeIn">
                        <div className="h-24 w-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce-y shadow-md">
                            <span className="material-symbols-outlined text-5xl text-green-600 dark:text-green-400">check_circle</span>
                        </div>
                        <h3 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-3 text-center">Sucesso!</h3>
                        <p className="text-center text-text-secondary-light dark:text-text-secondary-dark font-medium text-lg leading-relaxed">
                            {message.text}
                        </p>
                        <div className="mt-8 w-full bg-green-50 dark:bg-green-900/10 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 animate-[slideUp_3.5s_ease-out_reverse]"></div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="p-4 pb-0">
                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark text-center">Configurar Perfil</h2>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-6 mt-2 border-b border-gray-200 dark:border-gray-700 px-6">
                    <button 
                        onClick={() => { setActiveTab('profile'); setMessage(null); setIsDeletingAccount(false); }}
                        className={`pb-3 px-2 font-semibold text-sm transition-colors ${activeTab === 'profile' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Dados Básicos
                    </button>
                    <button 
                        onClick={() => { setActiveTab('security'); setMessage(null); setIsDeletingAccount(false); }}
                        className={`pb-3 px-2 font-semibold text-sm transition-colors ${activeTab === 'security' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Segurança
                    </button>
                </div>

                <div className="p-4 pt-4 max-h-[80vh] overflow-y-auto">
                    {/* Show only error messages inline here, success is handled by overlay */}
                    {message && message.type === 'error' && (
                        <div className="mb-4 p-3 rounded-lg text-sm border flex items-start gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800">
                            <span className="material-symbols-outlined text-lg">error</span>
                            <span className="flex-1">{message.text}</span>
                        </div>
                    )}

                    {activeTab === 'profile' ? (
                        <form onSubmit={handleSaveProfile} className="flex flex-col items-center gap-2">
                            {/* Photo Upload Area */}
                            <div className="relative flex flex-col items-center z-20">
                                <div 
                                    className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-100 dark:bg-white/5 relative cursor-pointer hover:opacity-90 transition-opacity" 
                                    onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                                >
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Perfil" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <span className="material-symbols-outlined text-4xl">person</span>
                                        </div>
                                    )}
                                    
                                    {/* Edit overlay icon */}
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                         <span className="material-symbols-outlined text-white">edit</span>
                                    </div>
                                </div>

                                {/* Menu Popover */}
                                {showPhotoMenu && (
                                    <div className="absolute top-full mt-2 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-fadeIn">
                                        <div className="flex flex-col">
                                            <button 
                                                type="button"
                                                onClick={handleSelectPhoto}
                                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                                            >
                                                <span className="material-symbols-outlined text-lg text-primary">photo_camera</span>
                                                Alterar foto
                                            </button>
                                            {photoPreview && (
                                                <button 
                                                    type="button"
                                                    onClick={handleRemovePhoto}
                                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left border-t border-gray-100 dark:border-gray-700"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                    Remover foto
                                                </button>
                                            )}
                                            <button 
                                                type="button"
                                                onClick={() => setShowPhotoMenu(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left border-t border-gray-100 dark:border-gray-700"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleImageSelect} 
                                />
                            </div>

                            <div className="w-full">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Nome</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-12 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white"
                                    required
                                />
                            </div>

                            <div className="w-full">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Nome de Usuário</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium z-10">@</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15))}
                                        className={`form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border h-12 pl-8 pr-12 text-sm focus:ring-primary focus:border-primary dark:text-white transition-colors
                                            ${usernameStatus === 'valid' ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/30' : 
                                              usernameStatus === 'invalid' ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : 
                                              'border-gray-200 dark:border-gray-700'}`}
                                        minLength={3}
                                        maxLength={15}
                                    />
                                    {/* Status Icon */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                        {usernameStatus === 'loading' && (
                                            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        {usernameStatus === 'valid' && (
                                            <span className="material-symbols-outlined text-green-500 text-xl animate-fadeIn">check_circle</span>
                                        )}
                                        {usernameStatus === 'invalid' && (
                                            <span className="material-symbols-outlined text-red-500 text-xl animate-fadeIn">cancel</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between mt-0.5 ml-1">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">info</span>
                                        Limite de 2 alterações a cada 15 dias.
                                    </p>
                                    {usernameStatus === 'valid' && (
                                        <p className="text-[10px] text-green-600 dark:text-green-400 font-bold">Disponível</p>
                                    )}
                                    {usernameStatus === 'invalid' && (
                                        <p className="text-[10px] text-red-600 dark:text-red-400 font-bold">Indisponível</p>
                                    )}
                                </div>
                            </div>

                            {/* --- CAMPO DE DATA DE NASCIMENTO --- */}
                            <div className="w-full">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Data de Nascimento</label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-12 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white"
                                    max={new Date().toISOString().split("T")[0]}
                                />
                            </div>

                            <div className="w-full">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">E-mail</label>
                                <input
                                    type="email"
                                    value={user.email || ''}
                                    disabled
                                    className="form-input w-full rounded-xl bg-gray-100 dark:bg-white/5 border-transparent h-12 px-4 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                />
                            </div>

                            {/* --- BOTÃO DE PREFERÊNCIAS ALIMENTARES --- */}
                            <div className="w-full mt-2">
                                <button
                                    type="button"
                                    onClick={handleOpenPreferences}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined bg-white dark:bg-black/20 p-1.5 rounded-full">restaurant_menu</span>
                                        <div className="text-left">
                                            <p className="text-sm font-bold">Preferências Alimentares</p>
                                            <p className="text-[10px] opacity-80">Gerencie dietas (Fit, Vegano, etc)</p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">chevron_right</span>
                                </button>
                            </div>

                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 h-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                >
                                    Fechar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isLoading || usernameStatus === 'invalid'}
                                    className="flex-1 h-12 items-center justify-center rounded-xl bg-primary text-white font-bold shadow-md hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {!isDeletingAccount ? (
                                <form onSubmit={handleSavePassword} className="flex flex-col gap-3">
                                    <div className="w-full">
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Senha Atual</label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Digite sua senha atual"
                                            className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-12 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white"
                                            required
                                        />
                                    </div>
                                    <div className="w-full">
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Nova Senha</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-12 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <div className="w-full">
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Confirmar Nova Senha</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="form-input w-full rounded-xl bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-12 px-4 text-sm focus:ring-primary focus:border-primary dark:text-white"
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    <div className="flex gap-3 w-full mt-2">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 h-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                        >
                                            Fechar
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex-1 h-12 items-center justify-center rounded-xl bg-primary text-white font-bold shadow-md hover:bg-primary/90 transition-colors disabled:opacity-70"
                                        >
                                            {isLoading ? 'Atualizando...' : 'Mudar Senha'}
                                        </button>
                                    </div>
                                    
                                    {/* DIVISOR DE EXCLUSÃO DE CONTA */}
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-col items-center">
                                        <button
                                            type="button"
                                            onClick={() => setIsDeletingAccount(true)}
                                            className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors py-2 px-4 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"
                                        >
                                            Excluir minha conta
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                /* FLUXO DE CONFIRMAÇÃO DE EXCLUSÃO */
                                <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3 animate-fadeIn">
                                    <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                                        <h3 className="font-bold text-red-600 dark:text-red-400 mb-0.5 text-sm">Zona de Perigo</h3>
                                        <p className="text-xs text-red-500/90 dark:text-red-400/80 leading-relaxed">
                                            Atenção: Esta ação é irreversível. Todos os seus dados, histórico de compras e listas serão apagados permanentemente.
                                        </p>
                                    </div>
                                    
                                    <div className="w-full">
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Confirme sua Senha</label>
                                        <input
                                            type="password"
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            placeholder="Sua senha para confirmar"
                                            className="form-input w-full rounded-xl bg-white dark:bg-black/20 border-red-200 dark:border-red-900/50 h-12 px-4 text-sm focus:ring-red-500 focus:border-red-500 dark:text-white"
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-3 w-full mt-1">
                                        <button
                                            type="button"
                                            onClick={() => { setIsDeletingAccount(false); setDeletePassword(''); }}
                                            className="flex-1 h-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={isLoading || !deletePassword}
                                            className="flex-1 h-12 items-center justify-center rounded-xl bg-red-600 text-white font-bold shadow-md hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
