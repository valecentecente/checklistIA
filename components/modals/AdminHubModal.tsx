import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

export const AdminHubModal: React.FC = () => {
    const { isAdminHubModalOpen, closeModal, openModal, isAdmin } = useApp();
    const { user } = useAuth();

    if (!isAdminHubModalOpen || !isAdmin) return null;

    const p = user?.permissions;
    const hasPerm = (key: string) => {
        if (!p) return true; 
        return (p as any)[key] !== false;
    };

    const handleOption = (modalName: string) => {
        closeModal('adminHub');
        setTimeout(() => openModal(modalName), 300);
    };

    const adminOptions = [
        { id: 'admin', label: 'Ofertas', icon: 'shopping_bag', color: 'text-yellow-600 bg-yellow-50', perm: 'offers' },
        { id: 'adminSchedule', label: 'Grade Vitrine', icon: 'calendar_month', color: 'text-indigo-600 bg-indigo-50', perm: 'schedule' },
        { id: 'contentFactory', label: 'Fábrica Inventário', icon: 'factory', color: 'text-green-600 bg-green-50', perm: 'factory' },
        { id: 'adminRecipes', label: 'Acervo Receitas', icon: 'menu_book', color: 'text-blue-600 bg-blue-50', perm: 'recipes' },
        { id: 'adminReviews', label: 'Avaliações', icon: 'rate_review', color: 'text-orange-600 bg-orange-50', perm: 'reviews' },
        { id: 'manageTeam', label: 'Gerenciar Equipe', icon: 'group', color: 'text-cyan-600 bg-cyan-50', perm: 'team' },
        { id: 'teamReports', label: 'Relatórios Equipe', icon: 'monitoring', color: 'text-purple-600 bg-purple-50', perm: 'reports' },
    ];

    return (
        <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={() => closeModal('adminHub')}>
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
                <div className="p-6 bg-yellow-500 text-white text-center relative overflow-hidden shrink-0">
                    <button onClick={() => closeModal('adminHub')} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                        <span className="material-symbols-outlined text-white text-4xl font-variation-FILL-1" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                    </div>
                    <h2 className="font-black text-xl uppercase italic tracking-tighter">Painel Administrativo</h2>
                </div>

                <div className="p-6 grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
                    {adminOptions.map(opt => hasPerm(opt.perm) && (
                        <button 
                            key={opt.id}
                            onClick={() => handleOption(opt.id)}
                            className="flex flex-col items-center justify-center p-4 rounded-3xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95 group"
                        >
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-2 ${opt.color} dark:bg-black/40 group-hover:scale-110 transition-transform`}>
                                <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-center text-gray-700 dark:text-gray-200 tracking-tight leading-tight">
                                {opt.label}
                            </span>
                        </button>
                    ))}
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-black/20 text-center border-t border-gray-100 dark:border-gray-800">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Acesso Restrito • ChecklistIA Staff</p>
                </div>
            </div>
        </div>
    );
};