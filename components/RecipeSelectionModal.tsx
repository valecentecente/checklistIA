
import React, { useState } from 'react';
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
    
    // Estado para o pedido personalizado na comanda
    const [customOrder, setCustomOrder] = useState('');

    if (!isRecipeSelectionModalOpen) return null;

    const handleSelect = (recipe: FullRecipe) => {
        handleExploreRecipeClick(recipe);
        closeModal('recipeSelection');
    };

    const handleGenerateNew = (term: string) => {
        const finalTerm = term.trim() || currentSearchTerm;
        showToast(`O Chef IA recebeu seu pedido: ${finalTerm}`);
        fetchRecipeDetails(finalTerm);
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
                                
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <div className="flex items-center gap-1 bg-blue-600/20 backdrop-blur-md px-2 py-1 rounded-lg border border-blue-500/30">
                                        <div className="flex text-blue-400 text-[10px] gap-[1px]">
                                            {[1,2,3,4,5].map(i => (
                                                <span key={i} className="material-symbols-outlined text-[12px] font-bold">check</span>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-bold text-blue-100 ml-1">{fakeRating}</span>
                                    </div>

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
                                
                                <div className="flex items-center justify-between w-full mt-2">
                                    <div className="flex gap-3">
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

                                        <button 
                                            onClick={(e) => handleShare(e, recipe)}
                                            className="h-14 w-14 rounded-full flex items-center justify-center bg-black/30 text-white backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 transition-all active:scale-90"
                                        >
                                            <span className="material-symbols-outlined text-2xl">share</span>
                                        </button>
                                    </div>

                                    <button 
                                        className="h-16 w-16 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:scale-110 hover:shadow-[0_0_40px_rgba(37,99,235,0.8)] transition-all duration-300 active:scale-95 group relative"
                                        onClick={() => handleSelect(recipe)}
                                    >
                                        <span className="material-symbols-outlined text-4xl font-bold">check</span>
                                        <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:animate-ping"></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* 2. THE CUSTOM "WAITRESS/ORDER" CARD (Final Experience) */}
                <div 
                    className="snap-center shrink-0 w-[85vw] sm:w-[350px] h-full relative rounded-3xl overflow-hidden shadow-2xl bg-[#1a1a1a] border border-white/10"
                >
                    {/* Background Image: Garçonete anotando pedido */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-[15s] hover:scale-110"
                        style={{ 
                            backgroundImage: 'url("https://images.unsplash.com/photo-1590604518046-30ed5a5180f3?auto=format&fit=crop&w=800&q=80")',
                            filter: 'brightness(0.7) contrast(1.1)'
                        }}
                    ></div>

                    {/* Uniform Badge Badge (Logo da Marca no Uniforme) */}
                    <div className="absolute top-20 left-10 z-20 scale-75 opacity-90 rotate-[-5deg] animate-pulse">
                        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-xl border border-gray-100 flex items-center gap-1.5">
                             <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                             </div>
                             <span className="text-[10px] font-black tracking-tight text-gray-800">
                                Checklist<span className="text-blue-600">IA</span>
                             </span>
                        </div>
                    </div>

                    {/* Gradient for content readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                    {/* Content Section */}
                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-between text-center">
                        
                        <div className="pt-4">
                            <h3 className="text-2xl font-black text-white drop-shadow-lg mb-2">Não é o que você queria?</h3>
                            <p className="text-gray-200 text-xs font-medium opacity-90 px-4">
                                Nossa garçonete digital está pronta para anotar seu pedido especial.
                            </p>
                        </div>

                        {/* Interactive "Order Pad" Area */}
                        <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-2xl">
                             <label className="block text-left mb-2">
                                 <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest ml-1">Seu pedido personalizado</span>
                                 <input 
                                     type="text"
                                     value={customOrder}
                                     onChange={(e) => setCustomOrder(e.target.value)}
                                     placeholder={`Ex: ${currentSearchTerm} com toque de...`}
                                     className="w-full bg-white/5 border-0 border-b border-white/30 text-white placeholder:text-white/40 focus:ring-0 focus:border-blue-400 text-sm font-medium h-10 px-1 mt-1 transition-colors"
                                 />
                             </label>

                             <button 
                                onClick={() => handleGenerateNew(customOrder)}
                                disabled={!customOrder.trim() && !currentSearchTerm}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/50 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                             >
                                <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">edit_note</span>
                                FAZER PEDIDO (IA)
                             </button>
                        </div>

                        <div className="pb-4 opacity-60">
                             <p className="text-[9px] text-white font-medium uppercase tracking-[0.2em]">Serviço Exclusivo ChecklistIA</p>
                        </div>

                    </div>
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
