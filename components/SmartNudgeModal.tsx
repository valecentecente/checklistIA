
import React from 'react';
import { useApp } from '../contexts/AppContext';

export const SmartNudgeModal: React.FC = () => {
    const { isSmartNudgeModalOpen, closeModal, openModal, smartNudgeItemName } = useApp();

    if (!isSmartNudgeModalOpen) return null;

    const handleUpdatePreferences = () => {
        closeModal('smartNudge');
        setTimeout(() => openModal('preferences'), 300);
    };

    const handleDismiss = () => {
        // Salva na sessão para não perguntar novamente até recarregar
        sessionStorage.setItem('smartNudgeDismissed', 'true');
        closeModal('smartNudge');
    };

    return (
        <div className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center pointer-events-none p-4 pb-24 sm:pb-4 animate-slideUp">
            <div className="bg-white dark:bg-surface-dark border border-orange-100 dark:border-gray-700 shadow-xl rounded-2xl p-4 w-full max-w-sm pointer-events-auto flex gap-4 items-start relative">
                
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full flex-shrink-0 text-orange-600 dark:text-orange-400">
                    <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                </div>

                <div className="flex-1">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">
                        Mudança de hábitos?
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                        Notei que você adicionou <strong>{smartNudgeItemName}</strong>, mas seu perfil é Vegano/Vegetariano. Deseja atualizar suas preferências?
                    </p>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={handleUpdatePreferences}
                            className="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Atualizar Perfil
                        </button>
                        <button 
                            onClick={handleDismiss}
                            className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-xs font-bold py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                        >
                            Só hoje
                        </button>
                    </div>
                </div>

                <button 
                    onClick={handleDismiss} 
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        </div>
    );
};
