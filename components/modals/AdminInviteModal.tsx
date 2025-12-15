
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
            // Atualiza o perfil localmente para refletir o novo role sem F5
            await refreshUserProfile();
            showToast("Bem-vindo à equipe! Seu painel foi atualizado.");
        } else {
            showToast("Convite recusado.");
        }
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/80 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-2xl p-8 shadow-2xl animate-bounce-y relative text-center border-4 border-yellow-400">
                
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                    <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Convite Oficial</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    <strong>{pendingAdminInvite.fromName || 'Um administrador'}</strong> te convidou para se tornar um 
                    <span className="text-primary font-bold"> {pendingAdminInvite.level === 'admin_l1' ? 'Super Admin' : 'Editor de Ofertas'} </span> 
                    do ChecklistIA.
                </p>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => handleResponse(true)}
                        className="w-full h-12 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-transform active:scale-95"
                    >
                        Aceitar Convite
                    </button>
                    <button 
                        onClick={() => handleResponse(false)}
                        className="w-full h-12 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        Recusar
                    </button>
                </div>
            </div>
        </div>
    );
};
