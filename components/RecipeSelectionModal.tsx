
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useAuth } from '../contexts/AuthContext';
import type { FullRecipe } from '../types';

// EQUIPE CHECKLIST IA - Fotos Atualizadas
const STAFF_MEMBERS = [
    { id: 1, url: 'https://i.imgur.com/oaDEmhp.png' },
    { id: 2, url: 'https://i.imgur.com/yo2ArRP.png' },
    { id: 3, url: 'https://i.imgur.com/JXclY8H.png' },
    { id: 4, url: 'https://i.imgur.com/EZSUwhE.png' },
    { id: 5, url: 'https://i.imgur.com/Dp4O01r.png' },
    { id: 6, url: 'https://i.imgur.com/6VD6nt4.png' }
];

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
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const staffMember = useMemo(() => {
        const randomIndex = Math.floor(Math.random() * STAFF_MEMBERS.length);
        return STAFF_MEMBERS[randomIndex];
    }, [isRecipeSelectionModalOpen]);

    useEffect(() => {
        if (isRecipeSelectionModalOpen) {
            setCustomOrder(currentSearchTerm);
        }
    }, [isRecipeSelectionModalOpen, currentSearchTerm]);

    if (!isRecipeSelectionModalOpen) return null;

    const handleSelect = (recipe: FullRecipe) => {
        handleExploreRecipeClick(recipe);
        closeModal('recipeSelection');
    };

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.offsetWidth * 0.8;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleToggleFavorite = async (e: React.MouseEvent, recipe: FullRecipe) => {
        e.stopPropagation();
        if (!user) {
            showToast("Faça login para favoritar!");
            openModal('auth');
            return;
        }
        await toggleFavorite(recipe);
    };

    const handleShare = async (e: React.MouseEvent, recipe: FullRecipe) => {
        e.stopPropagation();
        const shareText = `Confira esta receita de ${recipe.name} no ChecklistIA!`;
        const shareUrl = `https://checklistia.com.br/?recipe=${encodeURIComponent(recipe.name)}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'ChecklistIA',
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) {}
        } else {
            await navigator.clipboard.writeText(shareUrl);
            showToast("Link da receita copiado!");
        }
    };

    const handleGenerateNew = (term: string) => {
        const finalTerm = term.trim() || currentSearchTerm;
        showToast(`Pedido anotado! Preparando...`);
        fetchRecipeDetails(finalTerm);
        closeModal('recipeSelection');
    };

    const hasResults = recipeSearchResults.length > 0;

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col justify-center items-center animate-fadeIn">
            
            {/* Header Minimalista */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
                <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <h2 className="text-white text-sm font-black uppercase tracking-tighter italic">
                        {hasResults ? 'Acervo' : 'Pedido Personalizado'}
                    </h2>
                </div>
                <button 
                    onClick={() => closeModal('recipeSelection')}
                    className="bg-white/10 hover:bg-red-500 text-white rounded-full p-2 transition-all border border-white/10"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Container do Carousel com Setas para Web */}
            <div className="relative w-full flex items-center group/carousel h-[85vh]">
                
                {/* SETA ESQUERDA (WEB) */}
                <button 
                    onClick={() => handleScroll('left')}
                    className="hidden lg:flex absolute left-4 z-50 w-14 h-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover/carousel:opacity-100"
                >
                    <span className="material-symbols-outlined text-3xl">chevron_left</span>
                </button>

                {/* Carousel Container */}
                <div 
                    ref={scrollContainerRef}
                    className="w-full flex overflow-x-auto snap-x snap-mandatory gap-6 px-8 pb-10 scrollbar-hide items-center h-full"
                >
                    
                    {/* 1. Cards do Acervo */}
                    {recipeSearchResults.map((recipe, idx) => {
                        const isFav = isFavorite(recipe.name);
                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleSelect(recipe)}
                                className="snap-center shrink-0 w-[85vw] sm:w-[320px] h-[70vh] relative rounded-[2.5rem] overflow-hidden shadow-2xl cursor-pointer group border border-white/10 transition-transform active:scale-95 bg-[#1a1a1a]"
                            >
                                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${recipe.imageUrl})` }}></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20"></div>
                                
                                <div className="absolute bottom-0 left-0 w-full p-8 flex justify-between items-end gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-2xl font-black text-white leading-none uppercase italic tracking-tighter mb-2 line-clamp-2 drop-shadow-lg">
                                            {recipe.name}
                                        </h3>
                                        <span className="text-[10px] font-bold text-blue-400 drop-shadow-md">CLIQUE PARA VER</span>
                                    </div>
                                    
                                    <div className="flex flex-col gap-3 shrink-0 z-30">
                                        <button 
                                            onClick={(e) => handleToggleFavorite(e, recipe)}
                                            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-xl backdrop-blur-md border border-white/20 ${
                                                isFav ? 'bg-red-500 text-white' : 'bg-black/40 text-white hover:bg-black/60'
                                            }`}
                                        >
                                            <span className={`material-symbols-outlined text-xl ${isFav ? 'font-variation-FILL-1' : ''}`} style={ isFav ? { fontVariationSettings: "'FILL' 1" } : {} }>
                                                favorite
                                            </span>
                                        </button>
                                        <button 
                                            onClick={(e) => handleShare(e, recipe)}
                                            className="w-11 h-11 rounded-full bg-black/40 text-white flex items-center justify-center transition-all shadow-xl backdrop-blur-md border border-white/20 hover:bg-black/60"
                                        >
                                            <span className="material-symbols-outlined text-xl">share</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* 2. CARD DA GARÇONETE */}
                    <div 
                        className="snap-center shrink-0 w-[85vw] sm:w-[320px] h-[70vh] relative rounded-[3rem] overflow-hidden shadow-2xl bg-[#0a0a0a] border border-white/10"
                    >
                        <div 
                            className="absolute inset-0 bg-cover bg-center animate-slowZoom"
                            style={{ backgroundImage: `url("${staffMember.url}")` }}
                        ></div>

                        <div className="absolute top-8 left-8 z-40 opacity-80 scale-75 origin-top-left">
                            <div className="bg-white px-2 py-1 rounded shadow-xl flex items-center gap-1.5 border-b-2 border-slate-300">
                                <div className="w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[8px] font-black">check</span>
                                </div>
                                <span className="text-[8px] font-black text-gray-900 tracking-tighter uppercase">
                                    Checklist<span className="text-blue-600">IA</span>
                                </span>
                            </div>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                        <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col items-center">
                            <p className="text-white text-lg font-black italic tracking-tighter uppercase mb-6 animate-pulse">
                                Faça seu pedido
                            </p>

                            <div className="w-full bg-white/10 backdrop-blur-2xl rounded-3xl p-2 border border-white/20 shadow-2xl mb-2 flex items-center gap-2 pr-4">
                                <input 
                                    type="text"
                                    value={customOrder}
                                    onChange={(e) => setCustomOrder(e.target.value)}
                                    placeholder="Deseja algo especial?"
                                    className="flex-1 bg-transparent border-0 text-white placeholder:text-white/30 focus:ring-0 text-sm font-bold h-12 px-4"
                                />
                                <button 
                                    onClick={() => handleGenerateNew(customOrder)}
                                    disabled={!customOrder.trim()}
                                    className="h-10 w-10 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg transition-all active:scale-90 flex items-center justify-center disabled:opacity-30"
                                >
                                    <span className="material-symbols-outlined">send</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="snap-center shrink-0 w-8"></div>
                </div>

                {/* SETA DIREITA (WEB) */}
                <button 
                    onClick={() => handleScroll('right')}
                    className="hidden lg:flex absolute right-4 z-50 w-14 h-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover/carousel:opacity-100"
                >
                    <span className="material-symbols-outlined text-3xl">chevron_right</span>
                </button>
            </div>

            {/* Indicador de Swipe */}
            <div className="flex gap-1.5 mb-8">
                <div className="h-1 w-4 bg-primary rounded-full"></div>
                <div className="h-1 w-1 bg-white/20 rounded-full"></div>
                <div className="h-1 w-1 bg-white/20 rounded-full"></div>
            </div>

            <style>{`
                @keyframes slowZoom {
                    from { transform: scale(1); }
                    to { transform: scale(1.1); }
                }
                .animate-slowZoom {
                    animation: slowZoom 40s infinite alternate ease-in-out;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};
