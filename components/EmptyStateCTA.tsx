import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { FullRecipe } from '../types';

interface EmptyStateCTAProps {
    onShowRecipeAssistant: () => void;
    onShowBudget: () => void;
}

export const EmptyStateCTA: React.FC<EmptyStateCTAProps> = ({ onShowRecipeAssistant, onShowBudget }) => {
    const { allRecipesPool, showRecipe, openModal } = useApp();
    
    const [activeIndex, setActiveIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    
    const slotKeywords = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 11) return ['café', 'pão', 'fruta', 'suco', 'tapioca', 'ovo', 'omelete', 'vitamina', 'bolo', 'amanhã'];
        if (hour >= 11 && hour < 15) return ['almoço', 'carne', 'frango', 'peixe', 'arroz', 'feijão', 'massa', 'salada', 'estrogonofe', 'lasanha', 'bife'];
        if (hour >= 15 && hour < 19) return ['lanche', 'bolo', 'biscoito', 'torta', 'café', 'pão de queijo', 'sanduíche', 'tarde'];
        if (hour >= 19 && hour < 23) return ['jantar', 'janta', 'sopa', 'caldo', 'massa', 'leve', 'salada', 'pizza', 'noite'];
        return ['hambúrguer', 'pizza', 'doce', 'snack', 'rápido', 'miojo', 'madrugada', 'lanche'];
    }, []);

    const currentModeName = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 11) return "CAFÉ";
        if (hour >= 11 && hour < 15) return "ALMOÇO";
        if (hour >= 15 && hour < 19) return "LANCHE";
        if (hour >= 19 && hour < 23) return "JANTAR";
        return "CORUJÃO";
    }, []);

    const timeBasedLabel = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 11) return "Bom dia • Seu café da manhã";
        if (hour >= 11 && hour < 15) return "Bom apetite • Hora do almoço";
        if (hour >= 15 && hour < 19) return "Pausa para energia • Lanche da tarde";
        if (hour >= 19 && hour < 23) return "Noite especial • Vamos jantar?!";
        return "Corujão • Lanche da madrugada";
    }, []);

    const displayRecipes = useMemo(() => {
        if (!allRecipesPool || allRecipesPool.length === 0) return [] as FullRecipe[];
        
        const completeRecipes = allRecipesPool.filter(recipe => {
            return !!(recipe.imageUrl && 
                      recipe.ingredients?.length > 0 && 
                      recipe.instructions?.length > 0);
        });

        const scoredRecipes = completeRecipes.map(recipe => {
            let score = Math.random() * 5;
            const recipeText = (recipe.name + ' ' + (recipe.tags?.join(' ') || '')).toLowerCase();
            
            const matches = slotKeywords.filter(kw => recipeText.includes(kw.toLowerCase()));
            if (matches.length > 0) {
                score += 100 + (matches.length * 10);
            }
            
            return { recipe, score };
        });

        return scoredRecipes
            .sort((a, b) => b.score - a.score)
            .map(item => item.recipe);
            
    }, [allRecipesPool, slotKeywords]);

    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }
    };

    const handleNext = () => {
        if (displayRecipes.length === 0) return;
        setActiveIndex((prev) => (prev + 1) % displayRecipes.length);
    };

    const handlePrev = () => {
        if (displayRecipes.length === 0) return;
        setActiveIndex((prev) => (prev - 1 + displayRecipes.length) % displayRecipes.length);
    };

    useEffect(() => {
        if (displayRecipes.length <= 1) return;
        const interval = setInterval(handleNext, 8000); 
        return () => clearInterval(interval);
    }, [displayRecipes.length]);

    // Animações ultra suaves e longas para evitar o "pulinho" de reinício
    const getKenBurnsClass = (index: number) => {
        const animations = [
            'animate-smooth-zoom-in',
            'animate-smooth-zoom-out',
            'animate-smooth-pan-right',
            'animate-smooth-pan-left',
            'animate-smooth-pan-up',
            'animate-smooth-diagonal'
        ];
        return animations[index % animations.length];
    };

    return (
        <div className="flex flex-col gap-5 animate-fadeIn">
            <style>{`
                @keyframes smooth-zoom-in {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.3); }
                }
                @keyframes smooth-zoom-out {
                    0% { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }
                @keyframes smooth-pan-right {
                    0% { transform: scale(1.2) translateX(-5%); }
                    100% { transform: scale(1.2) translateX(5%); }
                }
                @keyframes smooth-pan-left {
                    0% { transform: scale(1.2) translateX(5%); }
                    100% { transform: scale(1.2) translateX(-5%); }
                }
                @keyframes smooth-pan-up {
                    0% { transform: scale(1.2) translateY(5%); }
                    100% { transform: scale(1.2) translateY(-5%); }
                }
                @keyframes smooth-diagonal {
                    0% { transform: scale(1.2) translate(-4%, -4%); }
                    100% { transform: scale(1.2) translate(4%, 4%); }
                }
                /* Duração de 20s linear: o slide troca antes da animação chegar ao fim, evitando saltos */
                .animate-smooth-zoom-in { animation: smooth-zoom-in 20s linear infinite; }
                .animate-smooth-zoom-out { animation: smooth-zoom-out 20s linear infinite; }
                .animate-smooth-pan-right { animation: smooth-pan-right 20s linear infinite; }
                .animate-smooth-pan-left { animation: smooth-pan-left 20s linear infinite; }
                .animate-smooth-pan-up { animation: smooth-pan-up 20s linear infinite; }
                .animate-smooth-diagonal { animation: smooth-diagonal 20s linear infinite; }
            `}</style>
            
            <div className="px-1 flex items-center justify-start mt-2">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                    </div>
                    <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] sm:tracking-[0.4em] whitespace-nowrap truncate">
                        {timeBasedLabel}
                    </h3>
                </div>
            </div>

            <div 
                className="relative w-full h-[68dvh] lg:h-[540px] group/banner overflow-hidden rounded-[2.5rem] lg:rounded-[3rem] border border-white/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] bg-[#0a0a0a]"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {displayRecipes.length > 0 ? (
                    <div className="relative w-full h-full">
                        {displayRecipes.map((recipe, index) => {
                            const isActive = index === activeIndex;
                            // Mantemos a animação rodando mesmo em quem está em fade-out para não dar o pulinho
                            const isVisible = isActive || Math.abs(index - activeIndex) <= 1;

                            return (
                                <div 
                                    key={recipe.name}
                                    onClick={() => showRecipe(recipe)}
                                    className={`absolute inset-0 w-full h-full cursor-pointer transition-all duration-[1500ms] ease-in-out ${isActive ? 'opacity-100 z-20 pointer-events-auto' : 'opacity-0 z-10 pointer-events-none'}`}
                                >
                                    {/* Imagem de Fundo com Animação Persistente (previne o pulo no fade-out) */}
                                    <div 
                                        className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${isVisible ? getKenBurnsClass(index) : ''}`} 
                                        style={{ backgroundImage: `url(${recipe.imageUrl})` }}
                                    ></div>
                                    
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>
                                    
                                    <div className="absolute inset-0 p-7 lg:p-9 pt-10 lg:pt-14 flex flex-col items-start justify-between z-30">
                                        <div className="flex flex-col items-start w-full">
                                            <div className="flex items-center gap-2.5 mb-3 lg:mb-5">
                                                <span className="bg-white text-black text-[8px] lg:text-[9px] font-black px-3 py-1 rounded-sm uppercase tracking-widest">
                                                    MODO {currentModeName}
                                                </span>
                                                <span className="h-px w-5 lg:w-7 bg-white/30"></span>
                                                <span className="text-white/60 text-[8px] lg:text-[9px] font-bold uppercase tracking-widest">Global</span>
                                            </div>
                                            
                                            <h2 className="font-display text-[26px] sm:text-[30px] lg:text-[44px] font-black text-white uppercase italic tracking-tighter leading-[0.9] drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] line-clamp-3">
                                                {recipe.name}
                                            </h2>
                                            <div className="h-1 lg:h-1.5 w-10 lg:w-14 bg-primary mt-4 sm:mt-5 lg:mt-7 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.6)]"></div>
                                        </div>

                                        <div className="w-full flex items-end justify-between">
                                            <div className="flex flex-col gap-2 lg:gap-3">
                                                <p className="text-white/40 text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em]">Kitchen Secrets</p>
                                                <div className="flex items-center gap-3 lg:gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-black text-base lg:text-xl italic tracking-tighter leading-none">
                                                            {recipe.prepTimeInMinutes || 30}
                                                        </span>
                                                        <span className="text-[7px] lg:text-[8px] text-primary font-bold uppercase tracking-widest">Minutos</span>
                                                    </div>
                                                    <div className="h-5 lg:h-7 w-px bg-white/10"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-black text-base lg:text-xl italic tracking-tighter leading-none">
                                                            {recipe.ingredients?.length || 0}
                                                        </span>
                                                        <span className="text-[7px] lg:text-[8px] text-primary font-bold uppercase tracking-widest">Itens</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                        <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">sync</span>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Organizando Vitrine...</p>
                    </div>
                )}

                <div className="hidden lg:block">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all opacity-0 group-hover/banner:opacity-100 active:scale-95"
                    >
                        <span className="material-symbols-outlined !text-3xl">chevron_left</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all opacity-0 group-hover/banner:opacity-100 active:scale-95"
                    >
                        <span className="material-symbols-outlined !text-3xl">chevron_right</span>
                    </button>
                </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-3 lg:gap-4">
                <button onClick={() => openModal('calculator')} className="group flex flex-col items-center gap-2 p-5 lg:p-7 rounded-[2rem] lg:rounded-[2.5rem] bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 text-center active:scale-95 transition-all shadow-sm">
                    <div className="h-9 w-9 lg:h-12 lg:w-12 rounded-[1rem] lg:rounded-[1.2rem] bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 group-hover:rotate-12 transition-transform duration-300">
                        <span className="material-symbols-outlined text-xl lg:text-2xl">calculate</span>
                    </div>
                    <span className="text-[9px] lg:text-[10px] font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest">Cálculo Preciso</span>
                </button>
                <button onClick={() => openModal('converter')} className="group flex flex-col items-center gap-2 p-5 lg:p-7 rounded-[2rem] lg:rounded-[2.5rem] bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 text-center active:scale-95 transition-all shadow-sm">
                    <div className="h-9 w-9 lg:h-12 lg:w-12 rounded-[1rem] lg:rounded-[1.2rem] bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 group-hover:-rotate-12 transition-transform duration-300">
                        <span className="material-symbols-outlined text-xl lg:text-2xl">scale</span>
                    </div>
                    <span className="text-[9px] lg:text-[10px] font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest">Conversor</span>
                </button>
            </div>
            
            <div className="hidden lg:flex flex-col items-center gap-1 opacity-20">
                <span className="material-symbols-outlined animate-bounce text-gray-400 text-xs">swipe</span>
                <p className="text-[7px] lg:text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em]">
                    Use as setas ou deslize para explorar
                </p>
            </div>
        </div>
    );
};