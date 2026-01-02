
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, updateUserProfile, updateUserPassword, removeProfilePhoto, updateUsername, deleteAccount, checkUsernameUniqueness } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && user) {
            setName(user.displayName || '');
            setUsername(user.username || '');
            setUsernameStatus('idle');
            setPhotoPreview(user.photoURL || null);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setDeletePassword('');
            setIsDeletingAccount(false);
            setMessage(null);
            setActiveTab('profile');
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (!isOpen || !user) return;
        const clean = username.trim().toLowerCase();
        if (!clean || clean === user.username) { setUsernameStatus('idle'); return; }
        if (!/^[a-z0-9]{3,15}$/.test(clean)) { setUsernameStatus(clean.length >= 3 ? 'invalid' : 'idle'); return; }
        setUsernameStatus('loading');
        const timer = setTimeout(async () => {
            try { setUsernameStatus(await checkUsernameUniqueness(clean) ? 'valid' : 'invalid'); } catch { setUsernameStatus('idle'); }
        }, 500);
        return () => clearTimeout(timer);
    }, [username, isOpen, user]);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameStatus === 'invalid') return;
        setIsLoading(true);
        try {
            await updateUserProfile(name, photoPreview || undefined);
            if (user && username !== user.username) await updateUsername(username);
            setMessage({ type: 'success', text: 'Salvo!' });
            setTimeout(onClose, 2000);
        } catch (error: any) { setMessage({ type: 'error', text: error.message }); } finally { setIsLoading(false); }
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold dark:text-white">Perfil</h2>
                    <button onClick={onClose} className="text-gray-500"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="flex border-b dark:border-gray-700">
                    <button onClick={() => setActiveTab('profile')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'profile' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Dados</button>
                    <button onClick={() => setActiveTab('security')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'security' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Segurança</button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {message && <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
                    {activeTab === 'profile' ? (
                        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden mb-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-4xl mt-4">person</span>}
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                            </div>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input rounded-xl dark:bg-black/20 dark:text-white" placeholder="Nome" required />
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="form-input rounded-xl pl-8 dark:bg-black/20 dark:text-white" placeholder="usuario" required />
                            </div>
                            <button type="submit" disabled={isLoading} className="bg-primary text-white h-12 rounded-xl font-bold disabled:opacity-50">{isLoading ? 'Salvando...' : 'Salvar Perfil'}</button>
                        </form>
                    ) : (
                        <div className="flex flex-col gap-4">
                           <button onClick={() => setIsDeletingAccount(true)} className="text-red-500 text-sm font-bold text-center p-4 border border-red-500/20 rounded-xl hover:bg-red-50 transition-colors">Excluir Conta Permanentemente</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
