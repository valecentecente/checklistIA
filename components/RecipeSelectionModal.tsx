
import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useAuth } from '../contexts/AuthContext';
import type { FullRecipe } from '../types';

export const RecipeSelectionModal: React.FC = () => {
    const { 
        isRecipeSelectionModalOpen, 
        closeModal, 
        recipeSearchResults, 
        currentSearchTerm,
        handleExploreRecipeClick,
        fetchRecipeDetails,
        showToast,
        openModal
    } = useApp();

    const { toggleFavorite, isFavorite } = useShoppingList();
    const { user } = useAuth();

    if (!isRecipeSelectionModalOpen) return null;

    const handleSelect = (recipe: FullRecipe) => {
        handleExploreRecipeClick(recipe);
        closeModal('recipeSelection');
    };

    const handleGenerateNew = () => {
        showToast("Gerando nova receita com IA...");
        fetchRecipeDetails(currentSearchTerm);
        closeModal('recipeSelection');
    };

    const handleToggleFavorite = async (e: React.MouseEvent, recipe: FullRecipe) => {
        e.stopPropagation();
        if (!user) {
            showToast("Faça login para salvar receitas.");
            openModal('auth');
            return;
        }
        await toggleFavorite(recipe);
    };

    const handleShare = async (e: React.MouseEvent, recipe: FullRecipe) => {
        e.stopPropagation();
        const text = `Confira a receita de ${recipe.name} no ChecklistIA!`;
        if (navigator.share) {
            try { await navigator.share({ title: recipe.name, text, url: window.location.href }); } catch {}
        } else {
            await navigator.clipboard.writeText(window.location.href);
            showToast("Link copiado!");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col justify-center items-center animate-fadeIn">
            
            {/* Header / Close */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                <div className="flex flex-col">
                    <span className="text-gray-400 text-xs uppercase tracking-widest font-bold">Resultados para</span>
                    <h2 className="text-white text-2xl font-bold capitalize">{currentSearchTerm}</h2>
                </div>
                <button 
                    onClick={() => closeModal('recipeSelection')}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors backdrop-blur-md"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Horizontal Snap Scroll Carousel */}
            <div className="w-full flex overflow-x-auto snap-x snap-mandatory gap-4 px-8 pb-8 pt-4 scrollbar-hide items-center h-[75vh]">
                
                {/* 1. Results Cards */}
                {recipeSearchResults.map((recipe, idx) => {
                    const isSaved = isFavorite(recipe.name);
                    // Simula uma nota alta para o visual "Instagram" (4.5 a 5.0)
                    const fakeRating = (4.5 + (recipe.name.length % 5) / 10).toFixed(1);

                    return (
                        <div 
                            key={idx} 
                            onClick={() => handleSelect(recipe)}
                            className="snap-center shrink-0 w-[85vw] sm:w-[350px] h-full relative rounded-3xl overflow-hidden shadow-2xl cursor-pointer group border border-white/10 transition-transform active:scale-95 bg-[#1a1a1a]"
                        >
                            {/* Background Image */}
                            <div 
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                style={{ 
                                    backgroundImage: recipe.imageUrl ? `url(${recipe.imageUrl})` : 'none',
                                    backgroundColor: '#222'
                                }}
                            >
                                {!recipe.imageUrl && (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-6xl text-white/20">restaurant</span>
                                    </div>
                                )}
                            </div>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-start text-white">
                                
                                {/* TAGS & RATING ROW */}
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    {/* Rating Badge (Blue Checks) */}
                                    <div className="flex items-center gap-1 bg-blue-600/20 backdrop-blur-md px-2 py-1 rounded-lg border border-blue-500/30">
                                        <div className="flex text-blue-400 text-[10px] gap-[1px]">
                                            {[1,2,3,4,5].map(i => (
                                                <span key={i} className="material-symbols-outlined text-[12px] font-bold">check</span>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-bold text-blue-100 ml-1">{fakeRating}</span>
                                    </div>

                                    {/* Prep Time Badge */}
                                    <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">timer</span>
                                        {recipe.prepTimeInMinutes ? `${recipe.prepTimeInMinutes} min` : 'Rápido'}
                                    </span>
                                </div>

                                <h3 className="text-3xl font-bold leading-tight mb-2 font-display drop-shadow-lg line-clamp-2">
                                    {recipe.name}
                                </h3>
                                
                                <div className="flex items-center gap-2 text-sm text-gray-300 mb-6">
                                    <span className="material-symbols-outlined text-base">inventory_2</span>
                                    <span>{recipe.ingredients?.length || 0} ingredientes</span>
                                </div>
                                
                                {/* --- BOTTOM ACTION BAR (ZONA DO DEDÃO) --- */}
                                <div className="flex items-center justify-between w-full mt-2">
                                    <div className="flex gap-3">
                                        {/* Botão Favoritar */}
                                        <button 
                                            onClick={(e) => handleToggleFavorite(e, recipe)}
                                            className={`h-14 w-14 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg transition-all active:scale-90 ${
                                                isSaved 
                                                ? 'bg-red-600 text-white border-red-500' 
                                                : 'bg-black/30 text-white hover:bg-white/20'
                                            }`}
                                        >
                                            <span className={`material-symbols-outlined text-2xl ${isSaved ? 'font-variation-FILL-1' : ''}`} style={ isSaved ? { fontVariationSettings: "'FILL' 1" } : {} }>
                                                favorite
                                            </span>
                                        </button>

                                        {/* Botão Compartilhar */}
                                        <button 
                                            onClick={(e) => handleShare(e, recipe)}
                                            className="h-14 w-14 rounded-full flex items-center justify-center bg-black/30 text-white backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 transition-all active:scale-90"
                                        >
                                            <span className="material-symbols-outlined text-2xl">share</span>
                                        </button>
                                    </div>

                                    {/* THE BIG BLUE CHECK BUTTON */}
                                    <button 
                                        className="h-16 w-16 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:scale-110 hover:shadow-[0_0_40px_rgba(37,99,235,0.8)] transition-all duration-300 active:scale-95 group relative"
                                        onClick={() => handleSelect(recipe)}
                                    >
                                        <span className="material-symbols-outlined text-4xl font-bold">check</span>
                                        {/* Pulse Effect Ring */}
                                        <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:animate-ping"></div>
                                    </button>
                                </div>

                            </div>
                        </div>
                    );
                })}

                {/* 2. The "Magic/AI" Card (Last Item) */}
                <div 
                    onClick={handleGenerateNew}
                    className="snap-center shrink-0 w-[85vw] sm:w-[350px] h-full relative rounded-3xl overflow-hidden shadow-2xl cursor-pointer group border-2 border-dashed border-white/20 bg-[#1a1a1a] flex flex-col items-center justify-center text-center p-8 transition-colors hover:border-primary hover:bg-[#222]"
                >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-primary/30 animate-pulse">
                        <span className="material-symbols-outlined text-5xl text-white">auto_awesome</span>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-2">Não é o que queria?</h3>
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-[200px]">
                        Crie uma receita totalmente nova e personalizada para "<strong>{currentSearchTerm}</strong>" usando Inteligência Artificial.
                    </p>
                    
                    <span className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors flex items-center gap-2">
                        Criar Nova com IA
                        <span className="material-symbols-outlined text-base">add</span>
                    </span>
                </div>

                {/* Spacer for right padding */}
                <div className="snap-center shrink-0 w-4"></div>
            </div>
            
            <p className="text-white/40 text-xs mt-4 animate-pulse flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">swipe</span>
                Deslize para ver mais opções
            </p>
        </div>
    );
};
