import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

interface EmptyStateCTAProps {
    onShowRecipeAssistant: () => void;
    onShowBudget: () => void;
}

export const EmptyStateCTA: React.FC<EmptyStateCTAProps> = ({ onShowRecipeAssistant, onShowBudget }) => {
    const { featuredRecipes, fetchThemeSuggestions, showRecipe, getCategoryRecipes, openModal, showToast } = useApp();
    const { user } = useAuth();
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

    const displayRecipes = featuredRecipes;

    const isLiquid = (r: any) => {
        const text = (r.name + ' ' + (r.tags?.join(' ') || '')).toLowerCase();
        return ['suco', 'drink', 'vitamina', 'coquetel', 'bebida', 'smoothie', 'café', 'chá', 'limonada', 'batida'].some(t => text.includes(t));
    };

    useEffect(() => {
        if (displayRecipes.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentBannerIndex(prev => (prev + 1) % displayRecipes.length);
        }, 8000); 
        return () => clearInterval(interval);
    }, [displayRecipes.length]);

    const handleBannerClick = (recipe: any) => {
        if (!user) {
            showToast("Faça login para ver esta receita!");
            openModal('auth');
            return;
        }
        showRecipe(recipe);
    };

    const categories = useMemo(() => {
        const baseCategories = [
            { id: 'top10', label: "Em Alta", key: "top10" },
            { id: 'icecream', label: "Sorvetes", key: "sorvetes" },
            { id: 'fast', label: "Rápidas", key: "fast" },
            { id: 'cheap', label: "Econômicas", key: "cheap" },
            { id: 'healthy', label: "Saudáveis", key: "healthy" },
            { id: 'dessert', label: "Sobremesas", key: "dessert" },
            { id: 'new', label: "Novidades", key: "new" },
        ];

        const usedImageUrls = new Set<string>(displayRecipes.map(r => r.imageUrl).filter(Boolean) as string[]);

        return baseCategories.map(cat => {
            const recipes = getCategoryRecipes(cat.key);
            const count = recipes.length;
            
            let uniqueRecipe = recipes.find(r => 
                r.imageUrl && 
                !usedImageUrls.has(r.imageUrl) && 
                !isLiquid(r) 
            );

            if (!uniqueRecipe) {
                uniqueRecipe = recipes.find(r => r.imageUrl && !usedImageUrls.has(r.imageUrl));
            }

            const coverRecipe = uniqueRecipe || recipes[0];
            const coverImage = coverRecipe?.imageUrl;

            if (coverImage) {
                usedImageUrls.add(coverImage);
            }

            return { ...cat, count, coverImage, coverRecipe };
        }).filter(cat => cat.count > 0);

    }, [getCategoryRecipes, displayRecipes]); 

    const handleCategoryClick = (key: string, priorityRecipeName?: string) => {
        if (!user) {
            showToast("Faça login para explorar as coleções!");
            openModal('auth');
            return;
        }
        fetchThemeSuggestions(key, priorityRecipeName);
    };

    const handleAiClick = () => {
        if (!user) {
            showToast("Faça login para usar a IA!");
            openModal('auth');
            return;
        }
        onShowRecipeAssistant();
    };

    const handleBudgetClick = () => {
        if (!user) {
            showToast("Faça login para definir o orçamento!");
            openModal('auth');
            return;
        }
        onShowBudget();
    };

    const handleArcadeClick = () => {
        openModal('arcade');
    };

    const getHeroTitle = () => {
        const month = new Date().getMonth();
        if (month === 11) return "Especial de Natal";
        const hour = new Date().getHours();
        if (hour < 11) return "Bom dia! Café da Manhã";
        if (hour < 15) return "Hora do Almoço";
        return "Sugestões para Você";
    };

    return (
        <div className="flex flex-col gap-6 animate-fadeIn pb-6">
            
            <div className="px-1 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">{getHeroTitle()}</h3>
                <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
            </div>

            {/* HERO BANNER - MAGAZINE STYLE */}
            {displayRecipes.length > 0 ? (
                <div className="relative w-full aspect-[1/1] sm:aspect-[16/9] rounded-[2.5rem] overflow-hidden shadow-2xl group border border-white/5 bg-[#111]">
                    {displayRecipes.map((recipe, index) => (
                        <div 
                            key={index}
                            onClick={() => handleBannerClick(recipe)}
                            className={`absolute inset-0 transition-all duration-1000 ease-in-out cursor-pointer ${index === currentBannerIndex ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105 blur-sm'}`}
                        >
                            <div 
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-[12000ms] linear transform scale-100 group-hover:scale-110"
                                style={{ backgroundImage: `url(${recipe.imageUrl})` }}
                            ></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                            <div className="absolute inset-0 p-8 pb-10 flex flex-col justify-end">
                                <div className="flex flex-col items-start max-w-[90%]">
                                    <div className="mb-4 flex items-center gap-2 bg-primary px-3 py-1 rounded-full shadow-lg border border-white/10 animate-slideUp">
                                        <span className="text-[9px] font-black text-white uppercase tracking-[0.15em]">Destaque IA</span>
                                    </div>
                                    <div className="relative pl-5 border-l-[4px] border-primary animate-slideUp" style={{ animationDelay: '0.2s' }}>
                                        <h2 className="font-display text-[32px] sm:text-[46px] font-black text-white leading-[0.95] uppercase italic tracking-[-0.03em] drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                                            {recipe.name}
                                        </h2>
                                    </div>
                                    <div className="mt-6 flex items-center gap-6 animate-slideUp" style={{ animationDelay: '0.4s' }}>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">Tempo</span>
                                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                                                {recipe.prepTimeInMinutes || 30} MIN
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {/* CATEGORIES SECTION */}
            {categories.length > 0 && (
                <div className="animate-fadeIn mt-2">
                    <div className="flex items-center justify-between px-1 mb-3">
                        <h3 className="text-[12px] font-black text-gray-800 dark:text-white uppercase tracking-widest">Coleções Sugeridas</h3>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-4 px-1 -mx-4 scrollbar-hide snap-x">
                        <div className="w-1 px-1 snap-start shrink-0"></div>
                        {categories.map((cat, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleCategoryClick(cat.key, cat.coverRecipe?.name)}
                                className="relative flex-shrink-0 w-28 h-36 sm:w-32 sm:h-40 rounded-3xl overflow-hidden shadow-md snap-center group active:scale-95 transition-transform border border-black/5 dark:border-white/5"
                            >
                                <div 
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                    style={{ 
                                        backgroundImage: cat.coverImage ? `url(${cat.coverImage})` : 'none',
                                        backgroundColor: cat.coverImage ? 'transparent' : '#eee'
                                    }}
                                ></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 w-full p-3 text-left">
                                    <span className="block text-[11px] font-black text-white leading-none tracking-tight uppercase italic font-display">
                                        {cat.label}
                                    </span>
                                    <span className="block text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest opacity-80">Ver Tudo</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ACTION GRID */}
            <div className="grid grid-cols-2 gap-3">
                <button onClick={handleAiClick} className="flex flex-col p-5 rounded-3xl bg-white dark:bg-orange-900/10 border border-gray-100 dark:border-orange-900/30 text-left relative overflow-hidden group active:scale-95 transition-transform shadow-sm">
                    <span className="material-symbols-outlined text-2xl text-primary mb-2">auto_awesome</span>
                    <span className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Criar com IA</span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight mt-1 font-bold uppercase tracking-widest">Receitas em segundos</span>
                </button>
                <button onClick={handleBudgetClick} className="flex flex-col p-5 rounded-3xl bg-white dark:bg-blue-900/10 border border-gray-100 dark:border-blue-900/30 text-left relative overflow-hidden group active:scale-95 transition-transform shadow-sm">
                    <span className="material-symbols-outlined text-2xl text-blue-500 mb-2">savings</span>
                    <span className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Meu Orçamento</span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight mt-1 font-bold uppercase tracking-widest">Controle seus gastos</span>
                </button>
                <button onClick={handleArcadeClick} className="col-span-2 relative flex items-center justify-center gap-6 p-5 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl shadow-xl text-white hover:brightness-110 transition-all active:scale-95 group overflow-hidden border border-white/10">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <div className="flex flex-col items-start z-10">
                        <span className="font-black text-lg uppercase tracking-widest flex items-center gap-2 italic">
                            <span className="material-symbols-outlined text-yellow-400">sports_esports</span>
                            Passatempo
                        </span>
                        <span className="text-[10px] opacity-80 font-black uppercase tracking-[0.2em] mt-1">Tédio na fila? Jogue Agora!</span>
                    </div>
                </button>
            </div>
        </div>
    );
};