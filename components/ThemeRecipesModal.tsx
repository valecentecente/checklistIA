import React from 'react';
import { useApp } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

export const ThemeRecipesModal: React.FC = () => {
    const { 
        isThemeRecipesModalOpen, 
        closeModal, 
        recipeSuggestions, 
        currentTheme, 
        isSuggestionsLoading,
        showRecipe
    } = useApp();

    if (!isThemeRecipesModalOpen) return null;

    const handleSelectRecipe = (recipe: FullRecipe) => {
        showRecipe(recipe);
        closeModal('themeRecipes');
    };

    const renderTimeClocks = (min: number) => {
        let active = 1;
        if (min > 60) active = 3;
        else if (min > 30) active = 2;

        return (
            <div className="flex gap-0.5 items-center">
                {[1, 2, 3].map(i => (
                    <span key={i} className={`material-symbols-outlined text-[12px] ${i <= active ? 'text-primary font-variation-FILL-1' : 'text-gray-300 dark:text-white/10'}`} style={i <= active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        schedule
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[140] bg-black/60 flex items-end sm:items-center justify-center animate-fadeIn backdrop-blur-sm" onClick={() => closeModal('themeRecipes')}>
            <div className="bg-[#F7F7F7] dark:bg-[#121212] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slideUp shadow-2xl" onClick={e => e.stopPropagation()}>
                
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-surface-dark">
                    <div>
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Sugestões do Acervo</p>
                        <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark leading-tight">
                            {currentTheme || "Carregando..."}
                        </h2>
                    </div>
                    <button onClick={() => closeModal('themeRecipes')} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-black/20">
                    {isSuggestionsLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
                                <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                            </div>
                            <p className="text-sm font-medium text-gray-500 animate-pulse">Buscando receitas salvas...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x scrollbar-hide">
                                {recipeSuggestions.map((recipe, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleSelectRecipe(recipe)}
                                        className="snap-center shrink-0 w-[260px] flex flex-col bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden group hover:border-primary/50 transition-all text-left"
                                    >
                                        <div className="h-32 w-full relative bg-gray-200 dark:bg-gray-800">
                                            {recipe.imageUrl ? (
                                                <img 
                                                    src={recipe.imageUrl} 
                                                    alt={recipe.name} 
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${
                                                    idx % 3 === 0 ? 'from-orange-100 to-red-50 dark:from-orange-900/40 dark:to-red-900/20' :
                                                    idx % 3 === 1 ? 'from-yellow-100 to-orange-50 dark:from-yellow-900/40 dark:to-orange-900/20' :
                                                    'from-green-100 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/20'
                                                }`}>
                                                    <span className="material-symbols-outlined text-4xl text-black/10 dark:text-white/10">
                                                        restaurant_menu
                                                    </span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                                        </div>
                                        
                                        <div className="p-4 flex flex-col flex-1">
                                            <h3 className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2 leading-tight line-clamp-2">
                                                {recipe.name}
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                                                {recipe.prepTimeInMinutes > 0 && (
                                                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                                                        {renderTimeClocks(recipe.prepTimeInMinutes)}
                                                    </div>
                                                )}
                                                <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                                                    <span className="material-symbols-outlined text-[10px]">inventory_2</span> 
                                                    {recipe.ingredients?.length || 0} ing.
                                                </span>
                                            </div>
                                            
                                            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-primary">
                                                <span className="text-xs font-bold uppercase">Ver Receita</span>
                                                <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {recipeSuggestions.length > 1 && (
                                <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center gap-1 animate-pulse">
                                    <span className="material-symbols-outlined text-sm">swipe</span>
                                    Deslize para ver mais opções
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};