import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

export const AdminInviteModal: React.FC = () => {
    const { isAdminInviteModalOpen, closeModal, showToast } = useApp();
    const { pendingAdminInvite, respondToAdminInvite, refreshUserProfile } = useAuth();

    if (!isAdminInviteModalOpen || !pendingAdminInvite) return null;

    const handleResponse = async (accept: boolean) => {
        await respondToAdminInvite(pendingAdminInvite.id, accept);
        closeModal('adminInvite');
        
        if (accept) {
            await refreshUserProfile();
            showToast("Bem-vindo à equipe! Seu painel foi atualizado.");
        } else {
            showToast("Convite recusado.");
        }
    };

    const perms = pendingAdminInvite.permissions;
    const allChecked = Object.values(perms || {}).every(v => v === true);

    const permissionLabels = [
        { id: 'offers', label: 'Ofertas', icon: 'shopping_bag' },
        { id: 'schedule', label: 'Grade Horários', icon: 'calendar_month' },
        { id: 'factory', label: 'Fábrica de Inventário', icon: 'factory' },
        { id: 'recipes', label: 'Acervo Receitas', icon: 'menu_book' },
        { id: 'reviews', label: 'Avaliações', icon: 'rate_review' },
        { id: 'team', label: 'Gestão de Equipe', icon: 'group' },
        { id: 'reports', label: 'Relatórios Atividade', icon: 'monitoring' },
    ];

    return (
        <div className="fixed inset-0 z-[250] bg-black/80 flex items-center justify-center p-4 animate-fadeIn">
            <div className={`bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-bounce-y relative border-4 transition-colors duration-500 ${allChecked ? 'border-blue-500' : 'border-emerald-500'}`}>
                
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg ${allChecked ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                    <span className="material-symbols-outlined text-4xl">verified_user</span>
                </div>

                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase italic tracking-tighter">Convite de Equipe</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    <strong>{pendingAdminInvite.fromName || 'Um administrador'}</strong> te convidou para ajudar a gerenciar o ChecklistIA.
                </p>

                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 mb-8 text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Permissões Incluídas</p>
                    <div className="grid grid-cols-1 gap-2">
                        {permissionLabels.map(p => perms?.[p.id as keyof typeof perms] && (
                            <div key={p.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                <span className="material-symbols-outlined text-[18px] text-blue-500">check_circle</span>
                                <span className="text-xs font-bold">{p.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => handleResponse(true)}
                        className={`w-full h-14 rounded-2xl text-white font-black uppercase tracking-widest text-sm shadow-xl transition-transform active:scale-95 ${allChecked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        Aceitar e Acessar
                    </button>
                    <button 
                        onClick={() => handleResponse(false)}
                        className="w-full h-14 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors"
                    >
                        Recusar
                    </button>
                </div>
            </div>
        </div>
    );
};