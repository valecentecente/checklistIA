
import React from 'react';
import { useApp } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

export const RecipeSelectionModal: React.FC = () => {
    const { 
        isRecipeSelectionModalOpen, 
        closeModal, 
        recipeSearchResults, 
        currentSearchTerm,
        handleExploreRecipeClick,
        fetchRecipeDetails,
        showToast
    } = useApp();

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
                {recipeSearchResults.map((recipe, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => handleSelect(recipe)}
                        className="snap-center shrink-0 w-[85vw] sm:w-[350px] h-full relative rounded-3xl overflow-hidden shadow-2xl cursor-pointer group border border-white/10 transition-transform active:scale-95"
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80"></div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-start text-white">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase mb-3">
                                {recipe.prepTimeInMinutes ? `${recipe.prepTimeInMinutes} min` : 'Rápido'}
                            </span>
                            <h3 className="text-3xl font-bold leading-tight mb-2 font-display drop-shadow-lg">
                                {recipe.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <span className="material-symbols-outlined text-base">inventory_2</span>
                                <span>{recipe.ingredients?.length || 0} ingredientes</span>
                            </div>
                            
                            <button className="mt-6 w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                                Escolher esta
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                ))}

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
