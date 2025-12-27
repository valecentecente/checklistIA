
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

export const ToolsGridModal: React.FC = () => {
    const app = useApp();
    const { unreadNotificationCount } = useApp();
    const { user } = useAuth(); // Check user for lock status

    if (!app.isToolsModalOpen) return null;

    const handleToolClick = (modalName: string) => {
        // Conversor e Calculadora são livres (sem login obrigatório)
        if (!user && modalName !== 'calculator' && modalName !== 'converter') {
            app.setPendingAction(modalName); // Salva a intenção
            app.closeModal('tools');
            app.openModal('auth');
            app.showToast("Faça login para usar esta ferramenta.");
            return;
        }
        
        app.closeModal('tools');
        app.openModal(modalName);
    };

    const handleOrganizeClick = () => {
        if (!user) {
            app.setPendingAction('organize'); // Salva a intenção
            app.closeModal('tools');
            app.openModal('auth');
            app.showToast("Faça login para organizar sua lista.");
            return;
        }
        app.closeModal('tools');
        app.toggleGrouping();
    };

    const LockIcon = () => (
        <div className="absolute top-2 right-2 text-gray-400 bg-gray-100 dark:bg-black/40 rounded-full p-1 z-10">
            <span className="material-symbols-outlined text-[14px]">lock</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center animate-fadeIn backdrop-blur-sm" onClick={() => app.closeModal('tools')}>
            <div className="bg-[#F9FAFB] dark:bg-zinc-900 w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl overflow-hidden animate-slideUp shadow-2xl pb-safe-area" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-surface-dark">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        Ferramentas <span className="text-blue-600 dark:text-blue-400">IA</span>
                    </h3>
                    <button onClick={() => app.closeModal('tools')} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500 hover:text-gray-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                    {/* 1. Receitas IA */}
                    <button 
                        onClick={() => handleToolClick('recipeAssistant')}
                        className="relative flex flex-col items-center justify-center p-5 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/30 hover:bg-orange-50 dark:hover:bg-white/10 transition-all active:scale-95 group overflow-hidden"
                    >
                        {!user && <LockIcon />}
                        <div className="h-14 w-14 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 mb-3 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                        </div>
                        <span className="font-bold text-base text-gray-800 dark:text-gray-200">
                            Receitas <span className="text-blue-600 dark:text-blue-400">IA</span>
                        </span>
                    </button>

                    {/* 2. Histórico */}
                    <button 
                        onClick={() => handleToolClick('history')}
                        className="relative flex flex-col items-center justify-center p-5 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-white/10 transition-all active:scale-95 group overflow-hidden"
                    >
                        {!user && <LockIcon />}
                        <div className="h-14 w-14 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform relative">
                            <span className="material-symbols-outlined text-3xl">history</span>
                            {unreadNotificationCount > 0 && user && (
                                <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
                            )}
                        </div>
                        <span className="font-bold text-base text-gray-800 dark:text-gray-200">Histórico</span>
                    </button>

                    {/* 3. Calculadora */}
                    <button 
                        onClick={() => handleToolClick('calculator')}
                        className="relative flex flex-col items-center justify-center p-5 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:bg-purple-50 dark:hover:bg-white/10 transition-all active:scale-95 group overflow-hidden"
                    >
                        <div className="h-14 w-14 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl">calculate</span>
                        </div>
                        <span className="font-bold text-base text-gray-800 dark:text-gray-200">Calculadora</span>
                    </button>

                    {/* 4. Conversor (NOVO) */}
                    <button 
                        onClick={() => handleToolClick('converter')}
                        className="relative flex flex-col items-center justify-center p-5 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:bg-teal-50 dark:hover:bg-white/10 transition-all active:scale-95 group overflow-hidden"
                    >
                        <div className="h-14 w-14 bg-teal-100 dark:bg-teal-900/40 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl">scale</span>
                        </div>
                        <span className="font-bold text-base text-gray-800 dark:text-gray-200">Conversor</span>
                    </button>

                    {/* 5. Orçamento */}
                    <button 
                        onClick={() => handleToolClick('budget')}
                        className="relative flex flex-col items-center justify-center p-5 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-white/10 transition-all active:scale-95 group overflow-hidden"
                    >
                        {!user && <LockIcon />}
                        <div className="h-14 w-14 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-3 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                        </div>
                        <span className="font-bold text-base text-gray-800 dark:text-gray-200">Orçamento</span>
                    </button>

                    {/* 6. Arcade */}
                    <button 
                        onClick={() => handleToolClick('arcade')}
                        className="relative flex flex-col items-center justify-center p-5 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:bg-pink-50 dark:hover:bg-white/10 transition-all active:scale-95 group overflow-hidden"
                    >
                        <div className="h-14 w-14 bg-pink-100 dark:bg-pink-900/40 rounded-full flex items-center justify-center text-pink-600 dark:text-pink-400 mb-3 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl">sports_esports</span>
                        </div>
                        <span className="font-bold text-base text-gray-800 dark:text-gray-200">Passatempo</span>
                    </button>

                    {/* 7. Organizar Corredores (Full Width) */}
                    <button 
                        onClick={handleOrganizeClick}
                        className="relative col-span-2 flex items-center justify-center gap-3 p-4 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-white/10 transition-all active:scale-95 group overflow-hidden"
                    >
                        {!user && <LockIcon />}
                        <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                            {app.isOrganizing ? (
                                <span className="material-symbols-outlined animate-spin">sync</span>
                            ) : (
                                <span className="material-symbols-outlined">view_column</span>
                            )}
                        </div>
                        <span className="font-bold text-base text-gray-800 dark:text-gray-200">
                            {app.groupingMode === 'aisle' ? 'Desagrupar Lista' : 'Organizar por Corredores (IA)'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
