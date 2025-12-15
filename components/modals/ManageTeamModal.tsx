
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

export const ManageTeamModal: React.FC = () => {
    const { isManageTeamModalOpen, closeModal, showToast } = useApp();
    const { sendAdminInvite } = useAuth();
    const [username, setUsername] = useState('');
    const [level, setLevel] = useState<'admin_l1' | 'admin_l2'>('admin_l2');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isManageTeamModalOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await sendAdminInvite(username, level);
            if (result.success) {
                showToast(result.message);
                setUsername('');
                closeModal('manageTeam');
            } else {
                showToast(result.message);
            }
        } catch (error) {
            console.error(error);
            showToast("Erro inesperado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('manageTeam')}>
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-xl p-6 shadow-2xl animate-slideUp relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => closeModal('manageTeam')} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <span className="material-symbols-outlined text-2xl">group_add</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Convidar Membro</h2>
                        <p className="text-xs text-gray-500">Adicione pessoas à equipe do app.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nome de Usuário (@)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                            <input 
                                type="text" 
                                value={username} 
                                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                                className="form-input w-full pl-8 h-12 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-black/20"
                                placeholder="usuario"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nível de Acesso</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                type="button"
                                onClick={() => setLevel('admin_l2')}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${level === 'admin_l2' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                                <span className="font-bold text-sm block mb-1">Nível 2</span>
                                <span className="text-[10px] text-gray-500 block">Editor de Ofertas. Acesso restrito.</span>
                            </button>
                            <button 
                                type="button"
                                onClick={() => setLevel('admin_l1')}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${level === 'admin_l1' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                                <span className="font-bold text-sm block mb-1">Nível 1</span>
                                <span className="text-[10px] text-gray-500 block">Super Admin. Acesso total.</span>
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white h-12 rounded-xl font-bold hover:bg-blue-700 transition-colors mt-2"
                    >
                        {isSubmitting ? 'Enviando...' : 'Enviar Convite'}
                    </button>
                </form>
            </div>
        </div>
    );
};