
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
        }, 6000); 
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
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{getHeroTitle()}</h3>
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>

            {displayRecipes.length > 0 ? (
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] rounded-2xl overflow-hidden shadow-lg group">
                    {displayRecipes.map((recipe, index) => (
                        <div 
                            key={index}
                            onClick={() => handleBannerClick(recipe)}
                            className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${index === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        >
                            <div 
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-linear transform group-hover:scale-105"
                                style={{ backgroundImage: `url(${recipe.imageUrl})` }}
                            ></div>
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                            <div className="absolute bottom-0 left-0 p-5 w-full text-white">
                                <div className="flex gap-2 mb-2">
                                    <span className="bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md uppercase tracking-wide">
                                        Recomendado
                                    </span>
                                    {recipe.prepTimeInMinutes && (
                                        <span className="bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">schedule</span> {recipe.prepTimeInMinutes} min
                                        </span>
                                    )}
                                </div>
                                
                                <h2 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-md mb-1 capitalize">
                                    {recipe.name}
                                </h2>
                                <p className="text-xs text-gray-300 font-medium flex items-center gap-1">
                                    Toque para ver a receita <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </p>
                            </div>
                        </div>
                    ))}

                    {displayRecipes.length > 1 && (
                        <div className="absolute bottom-2 right-4 z-20 flex gap-1.5">
                            {displayRecipes.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentBannerIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/50'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : null}

            {categories.length > 0 && (
                <div className="animate-fadeIn">
                    <div className="flex items-center justify-between px-1 mb-3">
                        <h3 className="text-base font-bold text-text-primary-light dark:text-text-primary-dark">Explorar Coleções</h3>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-4 px-1 -mx-4 scrollbar-hide snap-x">
                        <div className="w-1 px-1 snap-start shrink-0"></div>
                        {categories.map((cat, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleCategoryClick(cat.key, cat.coverRecipe?.name)}
                                className="relative flex-shrink-0 w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden shadow-md snap-center group active:scale-95 transition-transform border border-black/5 dark:border-white/5"
                            >
                                <div 
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                    style={{ 
                                        backgroundImage: cat.coverImage ? `url(${cat.coverImage})` : 'none',
                                        backgroundColor: cat.coverImage ? 'transparent' : '#eee'
                                    }}
                                >
                                    {!cat.coverImage && (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                                            <span className="material-symbols-outlined text-gray-400 text-3xl">restaurant</span>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 w-full p-3 text-left">
                                    <span className="block text-sm font-extrabold text-white leading-none tracking-wide drop-shadow-lg font-display">
                                        {cat.label}
                                    </span>
                                    <span className="block text-[10px] text-gray-300 font-medium mt-1 opacity-80">Ver tudo</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={handleAiClick}
                    className="flex flex-col p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 text-left relative overflow-hidden group active:scale-95 transition-transform"
                >
                    {!user && (
                        <div className="absolute top-2 right-2 text-gray-400/80 bg-white/50 dark:bg-black/20 rounded-full p-1 z-10 backdrop-blur-sm">
                            <span className="material-symbols-outlined text-[16px]">lock</span>
                        </div>
                    )}
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-primary">restaurant_menu</span>
                    </div>
                    <span className="material-symbols-outlined text-2xl text-primary mb-2">auto_awesome</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Criar com IA</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-1">Sua receita em segundos.</span>
                </button>

                <button 
                    onClick={handleBudgetClick}
                    className="flex flex-col p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-left relative overflow-hidden group active:scale-95 transition-transform"
                >
                    {!user && (
                        <div className="absolute top-2 right-2 text-gray-400/80 bg-white/50 dark:bg-black/20 rounded-full p-1 z-10 backdrop-blur-sm">
                            <span className="material-symbols-outlined text-[16px]">lock</span>
                        </div>
                    )}
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-blue-500">account_balance_wallet</span>
                    </div>
                    <span className="material-symbols-outlined text-2xl text-blue-500 mb-2">savings</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Meu Orçamento</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-1">Controle seus gastos.</span>
                </button>

                <button 
                    onClick={handleArcadeClick}
                    className="col-span-2 relative flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-md text-white hover:from-indigo-600 hover:to-purple-700 transition-all active:scale-95 group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    <div className="flex flex-col items-start z-10">
                        <span className="font-black text-lg uppercase tracking-wide flex items-center gap-2">
                            <span className="material-symbols-outlined">sports_esports</span>
                            Passatempo
                        </span>
                        <span className="text-xs opacity-90 font-medium">Tédio na fila? Jogue agora!</span>
                    </div>
                    <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform z-10">
                        <span className="material-symbols-outlined text-2xl">stadia_controller</span>
                    </div>
                    <div className="absolute -right-4 -bottom-6 opacity-20 rotate-12">
                        <span className="material-symbols-outlined text-8xl">videogame_asset</span>
                    </div>
                </button>
            </div>

        </div>
    );
};
