
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useShoppingList } from '../../contexts/ShoppingListContext';
import { Logo } from '../Logo';

// Social Icons Components (Inlined for simplicity in Sidebar)
const InstagramIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="4" width="16" height="16" rx="4"></rect><circle cx="12" cy="12" r="3"></circle><line x1="16.5" y1="7.5" x2="16.5" y2="7.501"></line></svg>
);
const FacebookIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3"></path></svg>
);
const TikTokIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M9 12a4 4 0 1 0 4 4v-12a5 5 0 0 0 5 5"></path></svg>
);
const YouTubeIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="3" y="5" width="18" height="14" rx="4"></rect><path d="M10 9l5 3l-5 3z"></path></svg>
);
const XIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

export const WebSidebarLeft: React.FC = () => {
    const { user, logout } = useAuth();
    const app = useApp();
    const { items } = useShoppingList();
    
    // States for Accordions
    const [isProfileExpanded, setIsProfileExpanded] = useState(false);
    const [isAdminExpanded, setIsAdminExpanded] = useState(false);

    const isListActive = items.length > 0 || !!app.currentMarketName;
    const handleMainAction = () => {
        if (isListActive) {
            app.openModal('addItem');
        } else {
            app.openModal('startShopping');
        }
    };

    const handleProtectedAction = (action: () => void, intent?: string) => {
        if (!user) {
            if (intent) app.setPendingAction(intent);
            app.showToast("Faça login para acessar este recurso.");
            app.openModal('auth');
        } else {
            action();
        }
    };

    const menuItems = [
        { icon: 'home', label: 'Início', onClick: () => app.setHomeViewActive(true), active: app.isHomeViewActive },
        { icon: 'shopping_cart', label: 'Minha Lista', onClick: () => app.setHomeViewActive(false), active: !app.isHomeViewActive },
        
        { 
            icon: 'view_column', 
            label: app.groupingMode === 'aisle' ? 'Desagrupar' : 'Organizar', 
            onClick: () => handleProtectedAction(() => app.toggleGrouping(), 'organize'), 
            active: app.groupingMode === 'aisle' 
        },
        { 
            icon: 'calculate', 
            label: 'Calculadora', 
            onClick: () => handleProtectedAction(() => app.openModal('calculator'), 'calculator'), 
            active: app.isCalculatorModalOpen 
        },
        
        { 
            icon: 'history', 
            label: 'Histórico', 
            onClick: () => handleProtectedAction(() => app.openModal('history'), 'history'), 
            active: app.isHistoryModalOpen 
        },
        { 
            icon: 'favorite', 
            label: 'Favoritos', 
            onClick: () => handleProtectedAction(() => app.openModal('favorites'), 'favorites'), 
            active: app.isFavoritesModalOpen 
        },
        { 
            icon: 'local_offer', // Changed from redeem
            label: 'Ofertas', 
            onClick: () => app.openModal('offers'), 
            active: app.isOffersModalOpen 
        },
        { 
            icon: 'sports_esports', 
            label: 'Passatempo', 
            onClick: () => app.openModal('arcade'), 
            active: app.isArcadeModalOpen 
        },
        { 
            icon: 'palette', 
            label: 'Tema', 
            onClick: () => handleProtectedAction(() => app.openModal('theme'), 'theme'), 
            active: app.isThemeModalOpen 
        },
    ];

    return (
        <div className="hidden lg:flex lg:w-72 flex-col h-full bg-[#121212] border-r border-white/10 p-6 flex-shrink-0">
            {/* Logo Area */}
            <div className="flex items-center gap-3 mb-8 px-2">
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-md">
                    <Logo className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white leading-none">Checklist<span className="text-blue-500">IA</span></h1>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Web Beta</span>
                </div>
            </div>

            {/* ACTION BUTTON */}
            <button
                onClick={handleMainAction}
                className="mx-2 mb-3 py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"
            >
                <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">
                    {isListActive ? 'add' : 'playlist_add'}
                </span>
                <span>{isListActive ? 'Adicionar Item' : 'Iniciar Nova Lista'}</span>
            </button>

            {/* AI RECIPES BUTTON (GLASS BLUE STYLE) */}
            <button
                onClick={() => app.openModal('recipeAssistant')}
                className="mx-2 mb-6 py-3.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 border border-blue-500/20 backdrop-blur-md rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 group"
            >
                <span className="material-symbols-outlined text-xl animate-pulse text-blue-400 group-hover:text-blue-300 transition-colors">auto_awesome</span>
                <span className="tracking-wide text-sm group-hover:text-white transition-colors">Receitas com IA</span>
            </button>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 scrollbar-hide">
                {menuItems.map((item, idx) => (
                    <button 
                        key={idx}
                        onClick={item.onClick}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group relative ${item.active ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <span className={`material-symbols-outlined text-2xl group-hover:scale-110 transition-transform ${item.active ? 'font-variation-FILL-1' : ''}`} style={ item.active ? { fontVariationSettings: "'FILL' 1" } : {} }>
                            {item.icon}
                        </span>
                        <span className="font-medium text-sm tracking-wide">{item.label}</span>
                        
                        {!user && ['view_column', 'calculate', 'history', 'favorite', 'palette'].includes(item.icon) && (
                            <span className="absolute right-4 text-[10px] opacity-50 material-symbols-outlined">lock</span>
                        )}
                    </button>
                ))}
            </nav>

            {/* User Profile - Bottom Section */}
            <div className="mt-auto pt-6 border-t border-white/10">
                {user ? (
                    <div className="flex flex-col rounded-xl bg-white/5 overflow-hidden transition-all duration-300">
                        
                        {/* Profile Header / Toggle */}
                        <button 
                            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                            className={`flex items-center gap-3 p-3 w-full text-left hover:bg-white/10 transition-colors ${isProfileExpanded ? 'bg-white/10' : ''}`}
                        >
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-primary">person</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-bold truncate">{user.displayName}</p>
                                <p className={`text-xs truncate transition-colors ${
                                    user.role === 'admin_l1' ? 'text-blue-500 font-bold' :
                                    user.role === 'admin_l2' ? 'text-emerald-500 font-bold' :
                                    'text-gray-500'
                                }`}>
                                    @{user.username || 'usuario'}
                                </p>
                            </div>
                            <span className={`material-symbols-outlined text-gray-400 transition-transform duration-300 ${isProfileExpanded ? 'rotate-180' : ''}`}>
                                expand_more
                            </span>
                        </button>

                        {/* Expanded Menu (Accordion) */}
                        <div className={`flex flex-col gap-1 px-2 transition-all duration-300 ease-in-out ${isProfileExpanded ? 'max-h-[600px] py-2 opacity-100' : 'max-h-0 py-0 opacity-0'}`}>
                            
                            <button onClick={() => app.openModal('profile')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-sm">
                                <span className="material-symbols-outlined text-lg">account_circle</span>
                                Meu Perfil
                            </button>

                            {/* ADMIN SECTION */}
                            {app.isAdmin && (
                                <div className="mt-1 mb-1 border-y border-white/5 py-1">
                                    <button 
                                        onClick={() => setIsAdminExpanded(!isAdminExpanded)}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-yellow-500 hover:bg-yellow-500/10 transition-colors text-sm font-bold"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                                            Admin
                                        </div>
                                        <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isAdminExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                    </button>

                                    {isAdminExpanded && (
                                        <div className="flex flex-col gap-1 pl-2 mt-1 animate-slideUp">
                                            <button onClick={() => app.openModal('admin')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-white/5 transition-colors text-xs">
                                                <span className="material-symbols-outlined text-base">shopping_bag</span>
                                                Ofertas
                                            </button>
                                            
                                            {/* Super Admin Options */}
                                            {app.isSuperAdmin && (
                                                <>
                                                    <button onClick={() => app.openModal('contentFactory')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-green-400 hover:bg-white/5 transition-colors text-xs font-bold border-l-2 border-green-500/50">
                                                        <span className="material-symbols-outlined text-base">factory</span>
                                                        Fábrica de Conteúdo
                                                    </button>
                                                    <button onClick={() => app.openModal('adminRecipes')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-white/5 transition-colors text-xs">
                                                        <span className="material-symbols-outlined text-base">menu_book</span>
                                                        Receitas
                                                    </button>
                                                    <button onClick={() => app.openModal('adminReviews')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-white/5 transition-colors text-xs">
                                                        <span className="material-symbols-outlined text-base">rate_review</span>
                                                        Avaliações
                                                    </button>
                                                    <button onClick={() => app.openModal('manageTeam')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-white/5 transition-colors text-xs">
                                                        <span className="material-symbols-outlined text-base">group</span>
                                                        Equipe
                                                    </button>
                                                    <button onClick={() => app.openModal('teamReports')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-white/5 transition-colors text-xs">
                                                        <span className="material-symbols-outlined text-base">monitoring</span>
                                                        Relatórios
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button onClick={() => logout()} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm">
                                <span className="material-symbols-outlined text-lg">logout</span>
                                Sair
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={() => app.openModal('auth')}
                            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">login</span>
                            Entrar
                        </button>
                    </div>
                )}
                
                {/* Social Icons */}
                <div className="flex justify-center gap-3 px-2 mt-4">
                    <a href="https://www.instagram.com/checklistiaof/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-pink-500 transition-colors" title="Instagram">
                        <InstagramIcon className="w-5 h-5" />
                    </a>
                    <a href="https://www.facebook.com/checklistia" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500 transition-colors" title="Facebook">
                        <FacebookIcon className="w-5 h-5" />
                    </a>
                    <a href="https://www.tiktok.com/@checklistia" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="TikTok">
                        <TikTokIcon className="w-5 h-5" />
                    </a>
                    <a href="https://www.youtube.com/@checklistiaof" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-red-500 transition-colors" title="YouTube">
                        <YouTubeIcon className="w-5 h-5" />
                    </a>
                    <a href="https://x.com/checklistia" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="X (Twitter)">
                        <XIcon className="w-4 h-4" />
                    </a>
                </div>

                <div className="mt-4 flex justify-between px-2 text-[10px] text-gray-600">
                    <button onClick={() => app.openModal('info')} className="hover:text-gray-400">Sobre</button>
                    <button onClick={() => app.openModal('feedback')} className="hover:text-gray-400">Feedback</button>
                    <span>v2.1</span>
                </div>
            </div>
        </div>
    );
};
