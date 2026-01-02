
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useShoppingList } from '../../contexts/ShoppingListContext';
import { Logo } from '../Logo';

// Social Icons Components
const InstagramIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="4" width="16" height="16" rx="4"></rect><circle cx="12" cy="12" r="3"></circle><line x1="16.5" y1="7.5" x2="16.5" y2="7.501"></line></svg>
);
const FacebookIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3"></path></svg>
);
const TikTokIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M9 12a4 4 0 1 0 4 4v-12a5 5 0 0 0 5 5"></path></svg>
);
const YouTubeIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="3" y="5" width="18" height="14" rx="4"></rect><path d="M10 9l5 3l-5 3z"></path></svg>
);
const XIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

export const WebSidebarLeft: React.FC = () => {
    const { user, logout } = useAuth();
    const app = useApp();
    const { items } = useShoppingList();
    const [isProfileExpanded, setIsProfileExpanded] = useState(false);
    const [isAdminExpanded, setIsAdminExpanded] = useState(false);

    const isListActive = items.length > 0 || !!app.currentMarketName;

    const handleProtectedAction = (action: () => void, intent?: string) => {
        if (!user) {
            if (intent) app.setPendingAction(intent);
            app.openModal('auth');
        } else action();
    };

    const handleShareApp = async () => {
        const shareData = {
            title: 'ChecklistIA',
            text: 'Simplifique suas compras com o ChecklistIA!',
            url: 'https://checklistia.com.br'
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) {}
        } else {
            try {
                await navigator.clipboard.writeText(shareData.url);
                app.showToast("Link copiado!");
            } catch (e) {}
        }
    };

    const menuItems = [
        { icon: 'home', label: 'Início', onClick: () => app.setHomeViewActive(true), active: app.isHomeViewActive },
        { icon: 'shopping_cart', label: 'Minha Lista', onClick: () => app.setHomeViewActive(false), active: !app.isHomeViewActive },
        { 
            icon: app.isOrganizing ? 'sync' : 'view_column', 
            label: app.isOrganizing ? 'Organizando...' : 'Organizar', 
            onClick: () => handleProtectedAction(() => app.toggleGrouping(), 'organize'), 
            active: app.groupingMode === 'aisle',
            animate: app.isOrganizing
        },
        { icon: 'calculate', label: 'Calculadora', onClick: () => handleProtectedAction(() => app.openModal('calculator'), 'calculator'), active: app.isCalculatorModalOpen },
        { icon: 'history', label: 'Histórico', onClick: () => handleProtectedAction(() => app.openModal('history'), 'history'), active: app.isHistoryModalOpen },
        { icon: 'favorite', label: 'Favoritos', onClick: () => handleProtectedAction(() => app.openModal('favorites'), 'favorites'), active: app.isFavoritesModalOpen },
        { icon: 'local_offer', label: 'Ofertas', onClick: () => app.openModal('offers'), active: app.isOffersModalOpen },
        { icon: 'sports_esports', label: 'Passatempo', onClick: () => app.openModal('arcade'), active: app.isArcadeModalOpen },
    ];

    const hasPerm = (key: string) => {
        if (!app.isAdmin) return false;
        if (app.isSuperAdmin) return true; // Super Admin sempre tem permissão
        if (!user?.permissions) return false; 
        return (user.permissions as any)[key] === true;
    };

    return (
        <div className="hidden lg:flex lg:w-72 flex-col h-full bg-[#121212] border-r border-white/10 p-6 flex-shrink-0">
            <div className="flex items-center gap-3 mb-8 px-2">
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-md"><Logo className="w-6 h-6" /></div>
                <div><h1 className="text-xl font-bold text-white leading-none">Checklist<span className="text-blue-500">IA</span></h1><span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Web Beta</span></div>
            </div>

            <button onClick={() => app.isHomeViewActive ? app.setHomeViewActive(false) : app.openModal('addItem')} className="mx-2 mb-3 py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group">
                <span className="material-symbols-outlined">{isListActive ? 'add' : 'playlist_add'}</span>
                <span>{isListActive ? 'Adicionar Item' : 'Iniciar Lista'}</span>
            </button>

            <button onClick={() => handleProtectedAction(() => app.openModal('recipeAssistant'), 'recipeAssistant')} className="mx-2 mb-6 py-3.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 border border-blue-500/20 backdrop-blur-md rounded-xl font-bold flex items-center justify-center gap-2 transition-all group">
                <span className="material-symbols-outlined text-blue-400">auto_awesome</span>
                <span className="text-sm">Receitas com IA</span>
            </button>

            <nav className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-hide">
                {menuItems.map((item, idx) => (
                    <button key={idx} onClick={item.onClick} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${item.active ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                        <span className={`material-symbols-outlined ${item.animate ? 'animate-spin' : ''}`}>{item.icon}</span>
                        <span className="font-medium text-sm">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* SEÇÃO DE ENGAJAMENTO E USUÁRIO (NO RODAPÉ) */}
            <div className="mt-auto pt-6 border-t border-white/10 space-y-5">
                
                <div className="px-2">
                    {user ? (
                        <div className="flex flex-col rounded-xl bg-white/5 overflow-hidden transition-all duration-300">
                            <button onClick={() => setIsProfileExpanded(!isProfileExpanded)} className="flex items-center gap-3 p-3 w-full hover:bg-white/10 transition-colors">
                                <div className="h-10 w-10 rounded-full bg-primary/20 overflow-hidden border-2 border-white/30">{user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-primary mt-1">person</span>}</div>
                                <div className="flex-1 min-w-0 text-left"><p className="text-white text-sm font-bold truncate">{user.displayName}</p><p className="text-xs text-gray-500 truncate">@{user.username}</p></div>
                                <span className={`material-symbols-outlined text-gray-400 transition-transform ${isProfileExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>
                            <div className={`flex flex-col gap-1 px-2 transition-all duration-300 ${isProfileExpanded ? 'max-h-[600px] py-2 opacity-100' : 'max-h-0 py-0 opacity-0'}`}>
                                <button onClick={() => app.openModal('profile')} className="w-full text-left px-3 py-2 text-gray-300 hover:text-white text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">account_circle</span> Perfil</button>
                                
                                {app.isAdmin && (
                                    <div className="border-y border-white/5 my-1 py-1">
                                        <button onClick={() => setIsAdminExpanded(!isAdminExpanded)} className="w-full flex items-center justify-between px-3 py-2 text-yellow-500 font-bold text-sm"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-base">admin_panel_settings</span> Admin</div><span className="material-symbols-outlined text-xs">{isAdminExpanded ? 'expand_less' : 'expand_more'}</span></button>
                                        {isAdminExpanded && (
                                            <div className="flex flex-col gap-1 pl-2 mt-1">
                                                {/* Dashboard BI para Super Admin Web */}
                                                {app.isSuperAdmin && (
                                                    <button onClick={() => app.openModal('adminDashboard')} className="w-full text-left px-3 py-2.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-2 hover:bg-blue-600/30 transition-colors">
                                                        <span className="material-symbols-outlined text-sm">monitoring</span>
                                                        Métricas & BI
                                                    </button>
                                                )}
                                                
                                                {hasPerm('offers') && <button onClick={() => app.openModal('admin')} className="text-left text-gray-400 hover:text-white text-xs py-2 px-3">Ofertas</button>}
                                                {hasPerm('factory') && <button onClick={() => app.openModal('contentFactory')} className="text-left text-gray-400 hover:text-white text-xs py-2 px-3">Fábrica</button>}
                                                {hasPerm('team') && <button onClick={() => app.openModal('manageTeam')} className="text-left text-gray-400 hover:text-white text-xs py-2 px-3">Equipe</button>}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button onClick={() => logout()} className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 text-sm flex items-center gap-2 font-bold"><span className="material-symbols-outlined text-base">logout</span> Sair</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => app.openModal('auth')} className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all">Entrar</button>
                    )}
                </div>

                <div className="px-4 pb-2">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">SIGA-NOS</p>
                    <div className="flex justify-between items-center gap-1.5">
                        <a href="https://www.instagram.com/checklistiaof/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-pink-500 transition-colors" title="Instagram"><InstagramIcon /></a>
                        <a href="https://www.facebook.com/checklistia" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500 transition-colors" title="Facebook"><FacebookIcon /></a>
                        <a href="https://www.tiktok.com/@checklistia" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="TikTok"><TikTokIcon /></a>
                        <a href="https://www.youtube.com/@checklistiaof" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-red-500 transition-colors" title="YouTube"><YouTubeIcon /></a>
                        <a href="https://x.com/checklistia" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="X"><XIcon className="w-4 h-4" /></a>
                        
                        <span className="text-white/10 select-none mx-0.5">|</span>
                        
                        <button onClick={handleShareApp} className="text-gray-500 hover:text-blue-400 transition-colors" title="Compartilhar App">
                            <span className="material-symbols-outlined !text-xl">share</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
