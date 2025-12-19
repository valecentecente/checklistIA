
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import type { FullRecipe } from '../../types';

const CHEF_TIPS = [
    "Economize comprando itens de marca própria do mercado.",
    "Frutas da estação costumam ser mais baratas e saborosas.",
    "Verifique a validade dos produtos no fundo da prateleira.",
    "Não vá ao mercado com fome para evitar compras por impulso.",
    "Use nossa IA para organizar sua lista por corredores e ganhar tempo.",
    "Otimize seu orçamento definindo um teto de gastos no menu ferramentas.",
    "Receitas com 'Fit' na tag são ótimas para manter o foco na dieta.",
    "Planeje suas refeições da semana para evitar o desperdício de alimentos."
];

export const WebSidebarRight: React.FC = () => {
    const { featuredRecipes, showRecipe, getRandomCachedRecipe, openModal, showToast } = useApp();
    const { user } = useAuth();
    
    const [suggestion, setSuggestion] = useState<FullRecipe | null>(null);
    const [currentTip, setCurrentTip] = useState(CHEF_TIPS[0]);
    const [isRecipeTransitioning, setIsRecipeTransitioning] = useState(false);
    const [isTipTransitioning, setIsTipTransitioning] = useState(false);

    const pickNewSuggestion = useCallback(() => {
        let newPick = getRandomCachedRecipe();
        if (newPick?.name === suggestion?.name && featuredRecipes.length > 1) {
            const pool = featuredRecipes.filter(r => r.name !== suggestion?.name);
            newPick = pool[Math.floor(Math.random() * pool.length)];
        }
        return newPick || (featuredRecipes.length > 0 ? featuredRecipes[0] : null);
    }, [featuredRecipes, getRandomCachedRecipe, suggestion]);

    // Timer da Capa - 40 segundos (Giro suave)
    useEffect(() => {
        if (!suggestion) setSuggestion(pickNewSuggestion());

        const interval = setInterval(() => {
            setIsRecipeTransitioning(true);
            setTimeout(() => {
                setSuggestion(pickNewSuggestion());
                setIsRecipeTransitioning(false);
            }, 1000); // Sincronizado com a animação de fade-out
        }, 40000); 

        return () => clearInterval(interval);
    }, [pickNewSuggestion, suggestion]);

    // Timer da Dica - 25 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            setIsTipTransitioning(true);
            setTimeout(() => {
                const nextIndex = (CHEF_TIPS.indexOf(currentTip) + 1) % CHEF_TIPS.length;
                setCurrentTip(CHEF_TIPS[nextIndex]);
                setIsTipTransitioning(false);
            }, 600);
        }, 25000);

        return () => clearInterval(interval);
    }, [currentTip]);

    const handleCardClick = () => {
        if (!suggestion || isRecipeTransitioning) return;
        if (!user) {
            showToast("Faça login para ver a receita completa!");
            openModal('auth');
            return;
        }
        showRecipe(suggestion);
    };

    if (!suggestion) return (
        <div className="hidden lg:flex lg:w-96 bg-[#0a0a0a] border-l border-white/5 p-6 items-center justify-center">
            <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="hidden lg:flex lg:w-96 flex-col h-full bg-[#0a0a0a] border-l border-white/5 p-8 overflow-hidden shrink-0">
            {/* Header Sofisticado */}
            <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex flex-col gap-1">
                    <h3 className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">
                        ChecklistIA Exclusive
                    </h3>
                    <div className="h-[1px] w-8 bg-primary/60"></div>
                </div>
                <div className="h-[2px] w-20 bg-white/5 rounded-full overflow-hidden">
                    <div key={suggestion.name} className="h-full bg-gradient-to-r from-primary/20 via-primary to-primary/20 animate-glamourProgress"></div>
                </div>
            </div>

            {/* Main Stage - Cine-Reveal Transition */}
            <div className="flex-1 relative mb-10 group">
                <div 
                    onClick={handleCardClick}
                    className={`h-full w-full cursor-pointer relative rounded-[3rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] transition-all duration-[1200ms] cubic-bezier(0.4, 0, 0.2, 1) ${
                        isRecipeTransitioning 
                        ? 'opacity-0 scale(1.1) blur(20px) translate-y-4' 
                        : 'opacity-100 scale(1) blur(0) translate-y-0 animate-cineReveal'
                    }`}
                >
                    {/* Background com Ken Burns effect contínuo */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-[40000ms] linear scale-100 group-hover:scale-110"
                        style={{ backgroundImage: `url(${suggestion.imageUrl})`, backgroundColor: '#111' }}
                    ></div>
                    
                    {/* Overlays de luxo */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90"></div>
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[3rem]"></div>
                    
                    {/* Conteúdo Informativo */}
                    <div className="absolute bottom-0 left-0 w-full p-10">
                        <div className="flex gap-3 mb-5 overflow-hidden">
                            <span className="bg-white/10 backdrop-blur-xl text-white text-[8px] px-3 py-1.5 rounded-full font-black uppercase tracking-[0.1em] border border-white/10 animate-slideUpReveal">
                                {suggestion.difficulty || 'Mestre'}
                            </span>
                            <span className="bg-primary/20 backdrop-blur-xl text-primary text-[8px] px-3 py-1.5 rounded-full font-black uppercase tracking-[0.1em] border border-primary/20 flex items-center gap-1.5 animate-slideUpReveal delay-100">
                                <span className="material-symbols-outlined text-[12px] font-variation-FILL-1">timer</span> 
                                {suggestion.prepTimeInMinutes || 30} MIN
                            </span>
                        </div>
                        
                        <h2 className="text-4xl font-black text-white leading-[1.1] mb-6 drop-shadow-2xl capitalize font-display tracking-tight animate-slideUpReveal delay-200">
                            {suggestion.name}
                        </h2>
                        
                        <div className="flex items-center gap-3 text-white/50 font-black text-[10px] uppercase tracking-[0.2em] group-hover:text-primary transition-colors animate-slideUpReveal delay-300">
                            <span>Ver Detalhes</span>
                            <div className="w-10 h-[1px] bg-white/20 group-hover:w-16 group-hover:bg-primary transition-all"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expert Tip - Minimalist Floating Widget */}
            <div className="relative shrink-0 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-lg font-variation-FILL-1">temp_preferences_custom</span>
                    </div>
                    <h4 className="text-white/60 font-black text-[9px] uppercase tracking-[0.2em]">Saber de Especialista</h4>
                </div>
                
                <div className={`transition-all duration-700 ease-in-out ${isTipTransitioning ? 'opacity-0 -translate-y-2 blur-sm' : 'opacity-100 translate-y-0 blur-0'}`}>
                    <p className="text-white/80 text-sm leading-relaxed font-medium italic serif">
                        "{currentTip}"
                    </p>
                </div>
                
                {/* Decoration */}
                <div className="absolute -bottom-2 -right-2 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-8xl">format_quote</span>
                </div>
            </div>

            <style>{`
                @keyframes glamourProgress {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }
                .animate-glamourProgress {
                    animation: glamourProgress 40s linear infinite;
                }
                
                @keyframes cineReveal {
                    0% { opacity: 0; transform: scale(1.1) translateY(20px); filter: blur(20px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                }
                .animate-cineReveal {
                    animation: cineReveal 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }

                @keyframes slideUpReveal {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideUpReveal {
                    animation: slideUpReveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
                }

                .delay-100 { animation-delay: 0.1s; }
                .delay-200 { animation-delay: 0.2s; }
                .delay-300 { animation-delay: 0.3s; }
            `}</style>
        </div>
    );
};
