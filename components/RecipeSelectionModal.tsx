
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

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col justify-center items-center animate-fadeIn backdrop-blur-sm">
            
            {/* Header Compacto */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
                <div className="flex flex-col bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                    <span className="text-gray-300 text-[10px] uppercase tracking-widest font-black">Menu Sugerido</span>
                    <h2 className="text-white text-lg font-black capitalize truncate max-w-[200px]">{currentSearchTerm}</h2>
                </div>
                <button 
                    onClick={() => closeModal('recipeSelection')}
                    className="bg-white/10 hover:bg-red-500 text-white rounded-full p-2 transition-all backdrop-blur-md border border-white/20"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Horizontal Carousel */}
            <div className="w-full flex overflow-x-auto snap-x snap-mandatory gap-6 px-8 pb-8 pt-4 scrollbar-hide items-center h-[75vh]">
                
                {/* 1. Results Cards */}
                {recipeSearchResults.map((recipe, idx) => {
                    const isSaved = isFavorite(recipe.name);
                    const fakeRating = "5.0"; // Padronizado conforme pedido

                    return (
                        <div 
                            key={idx} 
                            onClick={() => handleSelect(recipe)}
                            className="snap-center shrink-0 w-[85vw] sm:w-[320px] h-[65vh] relative rounded-[2.5rem] overflow-hidden shadow-2xl cursor-pointer group border border-white/10 transition-transform active:scale-95 bg-[#1a1a1a]"
                        >
                            <div 
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                style={{ 
                                    backgroundImage: recipe.imageUrl ? `url(${recipe.imageUrl})` : 'none',
                                    backgroundColor: '#222'
                                }}
                            ></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90"></div>
                            <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-start text-white">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">check</span> {fakeRating}
                                    </div>
                                    <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-bold">
                                        {recipe.prepTimeInMinutes || 30} MIN
                                    </span>
                                </div>
                                <h3 className="text-xl font-black leading-tight mb-4 drop-shadow-lg line-clamp-2 uppercase italic">{recipe.name}</h3>
                                <div className="flex items-center justify-between w-full">
                                    <button onClick={(e) => handleToggleFavorite(e, recipe)} className={`h-11 w-11 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all ${isSaved ? 'bg-red-600 border-red-500' : 'bg-black/30'}`}>
                                        <span className={`material-symbols-outlined text-xl ${isSaved ? 'font-variation-FILL-1' : ''}`} style={ isSaved ? { fontVariationSettings: "'FILL' 1" } : {} }>favorite</span>
                                    </button>
                                    <div className="h-12 w-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg group-hover:bg-blue-50">
                                        <span className="material-symbols-outlined text-2xl font-black">add</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* 2. THE WAITRESS CARD */}
                <div 
                    className="snap-center shrink-0 w-[85vw] sm:w-[320px] h-[65vh] relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border-2 border-blue-500/30"
                >
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-[40s] animate-slowZoom"
                        style={{ 
                            backgroundImage: 'url("https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80")',
                            filter: 'contrast(1.05) saturate(1.1)'
                        }}
                    ></div>

                    <div className="absolute top-[42%] left-[30%] z-40 scale-110 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                         <div className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-md border-b-2 border-slate-300 shadow-xl flex items-center gap-1.5 -rotate-2 transform hover:rotate-0 transition-transform">
                             <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center ring-2 ring-blue-100">
                                <span className="material-symbols-outlined text-white text-[9px] font-black">check</span>
                             </div>
                             <span className="text-[9px] font-black text-gray-900 tracking-tighter uppercase">
                                Checklist<span className="text-blue-600">IA</span>
                             </span>
                         </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-end text-center">
                        <div className="w-full bg-black/40 backdrop-blur-xl rounded-3xl p-4 border border-white/20 shadow-2xl mb-2 relative overflow-hidden group">
                             <div className="absolute -top-[100%] left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent skew-y-12"></div>
                             
                             <div className="relative z-10">
                                <label className="block text-left mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Pedido à Garçonete</span>
                                        <span className="material-symbols-outlined text-blue-400 text-sm animate-bounce">pan_tool_alt</span>
                                    </div>
                                    <input 
                                        type="text"
                                        value={customOrder}
                                        onChange={(e) => setCustomOrder(e.target.value)}
                                        placeholder="O que deseja pedir hoje?"
                                        className="w-full bg-transparent border-0 border-b border-white/20 text-white placeholder:text-white/40 focus:ring-0 focus:border-blue-400 text-sm font-bold h-9 px-0 transition-all text-center"
                                    />
                                </label>

                                <button 
                                    onClick={() => handleGenerateNew(customOrder)}
                                    disabled={!customOrder.trim()}
                                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                                >
                                    CRIAR RECEITA E FOTO (IA)
                                </button>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="snap-center shrink-0 w-8"></div>
            </div>
            
            <div className="flex flex-col items-center gap-2 mt-4">
                <p className="text-white/60 text-[10px] animate-pulse flex items-center gap-2 font-black uppercase tracking-widest">
                    <span className="material-symbols-outlined text-sm">keyboard_double_arrow_left</span>
                    Arraste para o lado para mais opções
                </p>
                <div className="flex gap-1.5">
                    {[1,2,3].map(i => (
                        <div key={i} className={`h-1 rounded-full ${i === 3 ? 'w-4 bg-primary' : 'w-1 bg-white/20'}`}></div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes slowZoom {
                    from { transform: scale(1); }
                    to { transform: scale(1.15); }
                }
                .animate-slowZoom {
                    animation: slowZoom 60s infinite alternate ease-in-out;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};
