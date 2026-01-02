
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

export const AdminHubModal: React.FC = () => {
    const { isAdminHubModalOpen, closeModal, openModal, isAdmin } = useApp();
    const { user } = useAuth();

    if (!isAdminHubModalOpen || !isAdmin) return null;

    const p = user?.permissions;
    const isSuperAdmin = user?.role === 'admin_l1';

    const hasPerm = (key: string) => {
        if (isSuperAdmin) return true; // Super Admin vê tudo
        if (!p) return false; 
        return (p as any)[key] === true;
    };

    const handleOption = (modalName: string) => {
        closeModal('adminHub');
        setTimeout(() => openModal(modalName), 300);
    };

    const adminOptions = [
        { id: 'admin', label: 'Ofertas', icon: 'shopping_bag', color: 'text-yellow-600 bg-yellow-50', perm: 'offers' },
        { id: 'contentFactory', label: 'Fábrica Inventário', icon: 'factory', color: 'text-green-600 bg-green-50', perm: 'factory' },
        { id: 'manageTeam', label: 'Gerenciar Equipe', icon: 'group', color: 'text-cyan-600 bg-cyan-50', perm: 'team' },
    ];

    return (
        <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={() => closeModal('adminHub')}>
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp border border-white/10" onClick={e => e.stopPropagation()}>
                <div className="p-8 bg-yellow-500 text-white text-center relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <button onClick={() => closeModal('adminHub')} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                        <span className="material-symbols-outlined text-white text-4xl font-variation-FILL-1" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                    </div>
                    <h2 className="font-black text-xl uppercase italic tracking-tighter leading-tight relative z-10">Painel Administrativo</h2>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 relative z-10">Controle Staff • ChecklistIA</p>
                </div>

                <div className="p-6 grid grid-cols-1 gap-3">
                    {/* Botão Secreto de Dashboard (Apenas Super Admin) */}
                    {isSuperAdmin && (
                        <button 
                            onClick={() => handleOption('adminDashboard')}
                            className="flex items-center p-5 rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all group gap-4 mb-2"
                        >
                            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-white/20 shrink-0">
                                <span className="material-symbols-outlined text-2xl">monitoring</span>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-black uppercase tracking-widest leading-none">Métricas & BI</span>
                                <span className="text-[9px] opacity-70 font-bold uppercase mt-1">Dashboard de Negócio</span>
                            </div>
                            <span className="material-symbols-outlined ml-auto opacity-50">arrow_forward</span>
                        </button>
                    )}

                    {adminOptions.map(opt => hasPerm(opt.perm) && (
                        <button 
                            key={opt.id}
                            onClick={() => handleOption(opt.id)}
                            className="flex items-center p-5 rounded-3xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95 group gap-4"
                        >
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${opt.color} dark:bg-black/40 group-hover:scale-110 transition-transform shrink-0`}>
                                <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
                            </div>
                            <span className="text-xs font-black uppercase text-gray-700 dark:text-gray-200 tracking-widest">
                                {opt.label}
                            </span>
                            <span className="material-symbols-outlined ml-auto text-gray-300 group-hover:text-primary transition-colors">chevron_right</span>
                        </button>
                    ))}
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-black/20 text-center border-t border-gray-100 dark:border-gray-800">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Acesso Restrito • STAFF ONLY</p>
                </div>
            </div>
        </div>
    );
};
