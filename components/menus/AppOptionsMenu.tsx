
import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

// Ícones de Redes Sociais
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

export const AppOptionsMenu: React.FC = () => {
    const app = useApp();
    const { user, logout } = useAuth();
    const [isAdminExpanded, setIsAdminExpanded] = useState(false);

    if (!app.isAppOptionsMenuOpen) return null;

    const handleOptionClick = (modalName: string) => {
        app.toggleAppOptionsMenu(); 
        app.openModal(modalName);   
    };

    const handleShareApp = async () => {
        const shareData = {
            title: 'ChecklistIA',
            text: 'Simplifique suas compras com o ChecklistIA!',
            url: 'https://checklistia.com.br'
        };
        app.toggleAppOptionsMenu();
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if ((err as any).name !== 'AbortError') app.showToast("Erro ao compartilhar.");
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareData.url);
                app.showToast("Link copiado! Compartilhe com amigos.");
            } catch (e) {
                app.showToast("Erro ao copiar link.");
            }
        }
    };

    // Lógica de Permissões: Se não houver objeto de permissões, mas for Admin, assume TRUE (Acesso Total)
    const p = user?.permissions;
    const hasPerm = (key: string) => {
        if (!app.isAdmin) return false;
        if (!p) return true; // Fallback para Admin antigo ou proprietário
        return (p as any)[key] !== false;
    };

    return (
        <>
            <div className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-[1px]" onClick={app.toggleAppOptionsMenu}></div>
            <div className="absolute top-20 right-4 w-72 bg-white dark:bg-surface-dark rounded-xl shadow-xl ring-1 ring-slate-200 dark:ring-border-dark z-[120] animate-fadeIn origin-top-right overflow-hidden flex flex-col max-h-[80vh]">
                <button 
                    onClick={() => { app.toggleAppOptionsMenu(); if(user) app.openModal('profile'); else app.openModal('auth'); }}
                    className="w-full text-left p-4 border-b border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group bg-gray-50 dark:bg-white/5 shrink-0"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white ring-1 ring-black/5 shadow-sm">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="Perfil" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-orange-100 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">person</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold truncate text-sm text-slate-800 dark:text-slate-100">{user ? (user.displayName || 'Usuário') : 'Entrar / Criar Conta'}</p>
                            {user?.username && (
                                <p className={`text-xs truncate font-medium ${
                                    user.role === 'admin_l1' ? 'text-blue-600 dark:text-blue-400 font-bold' :
                                    user.role === 'admin_l2' ? 'text-emerald-600 dark:text-emerald-400 font-bold' :
                                    'text-gray-500 dark:text-gray-400'
                                }`}>
                                    @{user.username}
                                </p>
                            )}
                            <p className="text-[10px] text-primary dark:text-orange-400 font-medium mt-0.5">
                                {user ? 'Ver Perfil' : 'Toque para acessar'}
                            </p>
                        </div>
                    </div>
                </button>
                
                <div className="py-1 overflow-y-auto flex-1 scrollbar-hide">
                    {app.isAdmin && (
                        <>
                            <button 
                                onClick={() => setIsAdminExpanded(!isAdminExpanded)} 
                                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors text-yellow-600 dark:text-yellow-400 font-bold bg-yellow-50 dark:bg-yellow-500/10"
                            >
                                <div className="flex items-center">
                                    <span className="material-symbols-outlined w-5 h-5 mr-3">security</span>
                                    Painel Administrativo
                                </div>
                                <span className={`material-symbols-outlined transition-transform duration-200 ${isAdminExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {isAdminExpanded && (
                                <div className="bg-yellow-50/50 dark:bg-yellow-900/10 border-t border-yellow-100 dark:border-yellow-800/30 animate-slideUp">
                                    {hasPerm('offers') && (
                                        <button onClick={() => handleOptionClick('admin')} className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-yellow-700 dark:text-yellow-300 pl-8 font-medium">
                                            <span className="material-symbols-outlined w-5 h-5 mr-3 text-[18px]">shopping_bag</span>
                                            Ofertas
                                        </button>
                                    )}
                                    
                                    {hasPerm('schedule') && (
                                        <button onClick={() => handleOptionClick('adminSchedule')} className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-indigo-700 dark:text-indigo-300 pl-8 font-bold border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20">
                                            <span className="material-symbols-outlined w-5 h-5 mr-3 text-[18px]">calendar_month</span>
                                            Grade Vitrine
                                        </button>
                                    )}

                                    {hasPerm('factory') && (
                                        <button onClick={() => handleOptionClick('contentFactory')} className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-green-700 dark:text-green-300 pl-8 font-bold border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20">
                                            <span className="material-symbols-outlined w-5 h-5 mr-3 text-[18px]">factory</span>
                                            Fábrica Inventário
                                        </button>
                                    )}

                                    {hasPerm('recipes') && (
                                        <button onClick={() => handleOptionClick('adminRecipes')} className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-yellow-700 dark:text-yellow-300 pl-8 font-medium">
                                            <span className="material-symbols-outlined w-5 h-5 mr-3 text-[18px]">menu_book</span>
                                            Acervo Receitas
                                        </button>
                                    )}

                                    {hasPerm('reviews') && (
                                        <button onClick={() => handleOptionClick('adminReviews')} className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-yellow-700 dark:text-yellow-300 pl-8 font-medium">
                                            <span className="material-symbols-outlined w-5 h-5 mr-3 text-[18px]">rate_review</span>
                                            Avaliações
                                        </button>
                                    )}
                                    
                                    <div className="h-px bg-yellow-200/50 dark:bg-yellow-800/30 mx-4 my-1"></div>
                                    
                                    {hasPerm('team') && (
                                        <button onClick={() => handleOptionClick('manageTeam')} className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-blue-700 dark:text-blue-300 pl-8 font-medium">
                                            <span className="material-symbols-outlined w-5 h-5 mr-3 text-[18px]">group</span>
                                            Gerenciar Equipe
                                        </button>
                                    )}

                                    {hasPerm('reports') && (
                                        <button onClick={() => handleOptionClick('teamReports')} className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-blue-700 dark:text-blue-300 pl-8 font-medium">
                                            <span className="material-symbols-outlined w-5 h-5 mr-3 text-[18px]">monitoring</span>
                                            Relatórios Equipe
                                        </button>
                                    )}
                                </div>
                            )}
                            <div className="h-px bg-border-light dark:bg-border-dark mx-3 my-1"></div>
                        </>
                    )}

                    <button onClick={() => handleOptionClick('favorites')} className="w-full flex items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined w-5 h-5 mr-3 text-red-500">favorite</span>
                        Receitas Favoritas
                    </button>

                    <button onClick={() => handleOptionClick('offers')} className="w-full flex items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined w-5 h-5 mr-3 text-yellow-500">local_offer</span>
                        Ofertas e Achadinhos
                    </button>

                    <div className="h-px bg-border-light dark:bg-border-dark mx-3 my-1"></div>

                    <button onClick={() => handleOptionClick('theme')} className="w-full flex items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined w-5 h-5 mr-3 text-purple-500">palette</span>
                        Aparência
                    </button>

                    <button onClick={handleShareApp} className="w-full flex items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined w-5 h-5 mr-3 text-blue-600 dark:text-blue-400">share</span>
                        Compartilhar App
                    </button>

                    <button onClick={() => handleOptionClick('feedback')} className="w-full flex items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined w-5 h-5 mr-3 text-green-500">volunteer_activism</span>
                        Avaliar & Apoiar
                    </button>

                    <button onClick={() => handleOptionClick('info')} className="w-full flex items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined w-5 h-5 mr-3 text-gray-400">help</span>
                        Sobre e Ajuda
                    </button>

                    <div className="mt-2 mb-2">
                        <div className="h-px bg-border-light dark:bg-border-dark mx-3 mb-2"></div>
                        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Siga-nos</p>
                        <div className="flex justify-evenly px-2 pb-1 items-center">
                            <a href="https://www.instagram.com/checklistiaof/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-pink-600 transition-colors" title="Instagram"><InstagramIcon className="w-5 h-5" /></a>
                            <a href="https://www.facebook.com/checklistia" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-blue-600 transition-colors" title="Facebook"><FacebookIcon className="w-5 h-5" /></a>
                            <a href="https://www.tiktok.com/@checklistia" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors" title="TikTok"><TikTokIcon className="w-5 h-5" /></a>
                            <a href="https://www.youtube.com/@checklistiaof" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-red-600 transition-colors" title="YouTube"><YouTubeIcon className="w-5 h-5" /></a>
                            <a href="https://x.com/checklistia" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors" title="X"><XIcon className="w-4 h-4" /></a>
                            
                            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                            
                            <button 
                                onClick={handleShareApp}
                                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-blue-600 transition-colors flex items-center justify-center"
                                title="Compartilhar ChecklistIA"
                            >
                                <span className="material-symbols-outlined !text-[20px]">share</span>
                            </button>
                        </div>
                    </div>

                    {user && (
                        <>
                            <div className="h-px bg-border-light dark:bg-border-dark mx-3 my-1"></div>
                            <button onClick={() => { logout(); app.toggleAppOptionsMenu(); }} className="w-full flex items-center px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-semibold">
                                <span className="material-symbols-outlined w-5 h-5 mr-3">logout</span>
                                Sair
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};
