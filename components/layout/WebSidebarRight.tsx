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
    "Compare o preço por unidade de medida (quilo ou litro) para encontrar o melhor custo-benefício.",
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

    // Timer da Capa - 40 segundos (Troca elegante)
    useEffect(() => {
        if (!suggestion) setSuggestion(pickNewSuggestion());

        const interval = setInterval(() => {
            setIsRecipeTransitioning(true);
            setTimeout(() => {
                setSuggestion(pickNewSuggestion());
                setIsRecipeTransitioning(false);
            }, 1200); // Crossfade suave
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
            }, 800);
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
            {/* Header de Estilo Editorial */}
            <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex flex-col gap-1">
                    <h3 className="text-white/40 text-[9px] font-black uppercase tracking-[0.4em]">
                        CHECKLISTIA EXCLUSIVE
                    </h3>
                    <div className="h-[1px] w-12 bg-white/20"></div>
                </div>
                <div className="text-[9px] text-primary font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                    Live Now
                </div>
            </div>

            {/* Stage Principal - Estilo Capa de Revista */}
            <div className="flex-1 relative mb-10">
                <div 
                    onClick={handleCardClick}
                    className={`h-full w-full cursor-pointer relative rounded-[3.5rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] transition-all duration-[1500ms] ease-in-out bg-[#111] border border-white/5 ${
                        isRecipeTransitioning 
                        ? 'opacity-40 scale-105 blur-sm' 
                        : 'opacity-100 scale-100 blur-0'
                    }`}
                >
                    {/* Imagem com Ken Burns sutil e contínuo */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-[45000ms] linear scale-110 animate-kenBurnsSlow"
                        style={{ backgroundImage: `url(${suggestion.imageUrl})` }}
                    ></div>
                    
                    {/* Overlays de Profundidade */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/20"></div>
                    <div className="absolute inset-0 bg-black/10"></div>
                    
                    {/* TÍTULO NO TOPO (ESTILO MAGAZINE) */}
                    <div className="absolute top-0 left-0 w-full p-10 pt-14 flex flex-col items-start z-10">
                         <div className="flex items-center gap-3 mb-4 animate-slideDownReveal">
                            <span className="bg-white text-black text-[9px] px-2 py-0.5 rounded font-black uppercase">FÁCIL</span>
                            <span className="text-white/60 text-[9px] font-bold uppercase flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">schedule</span>
                                {suggestion.prepTimeInMinutes || 30} MIN
                            </span>
                        </div>
                        
                        <h2 className="text-[42px] font-black text-white leading-[0.9] uppercase italic tracking-[-0.06em] font-display drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] animate-magazineTitle">
                            {suggestion.name}
                        </h2>
                        
                        <div className="h-1 w-10 bg-primary mt-6 animate-slideDownReveal" style={{animationDelay: '0.4s'}}></div>
                    </div>

                    {/* Badge Lateral Inferior */}
                    <div className="absolute bottom-10 left-10 flex items-center gap-3 animate-fadeIn">
                         <div className="flex flex-col">
                            <span className="text-[8px] text-white/30 font-black uppercase tracking-[0.3em]">Master Selection</span>
                            <span className="text-[10px] text-white font-bold uppercase tracking-widest opacity-80">Vol. 01 / 2025</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* Dica do Especialista - Minimalista e Clean */}
            <div className="relative shrink-0 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-primary text-xl animate-color-pulse">temp_preferences_custom</span>
                    <h4 className="text-white/30 font-black text-[9px] uppercase tracking-[0.3em]">Saber de Especialista</h4>
                </div>
                
                <div className={`transition-all duration-1000 ease-in-out ${isTipTransitioning ? 'opacity-0 translate-y-1 blur-sm' : 'opacity-100 translate-y-0 blur-0'}`}>
                    <p className="text-white/80 text-sm leading-relaxed font-medium italic">
                        "{currentTip}"
                    </p>
                </div>
                
                {/* Decoration Quote */}
                <div className="absolute -bottom-2 -right-2 opacity-[0.03] pointer-events-none">
                    <span className="material-symbols-outlined text-[120px]">format_quote</span>
                </div>
            </div>

            <style>{`
                @keyframes kenBurnsSlow {
                    from { transform: scale(1.1) rotate(0deg); }
                    to { transform: scale(1) rotate(1deg); }
                }
                .animate-kenBurnsSlow {
                    animation: kenBurnsSlow 45s linear infinite alternate;
                }

                @keyframes magazineTitle {
                    0% { opacity: 0; transform: translateY(-20px) scale(1.1); filter: blur(10px); }
                    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
                .animate-magazineTitle {
                    animation: magazineTitle 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }

                @keyframes slideDownReveal {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideDownReveal {
                    animation: slideDownReveal 1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
                }
            `}</style>
        </div>
    );
};