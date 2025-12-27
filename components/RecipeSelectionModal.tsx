
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useAuth } from '../contexts/AuthContext';
import type { FullRecipe } from '../types';

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
        showRecipe,
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
        showRecipe(recipe.name);
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

    const renderTimeClocks = (min: number) => {
        let active = 1;
        if (min > 90) active = 4;
        else if (min > 45) active = 3;
        else if (min > 20) active = 2;

        return (
            <div className="flex gap-0.5 items-center">
                {[1, 2, 3, 4].map(i => (
                    <span key={i} className={`material-symbols-outlined text-[14px] ${i <= active ? 'text-primary font-variation-FILL-1' : 'text-white/20'}`} style={i <= active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        schedule
                    </span>
                ))}
            </div>
        );
    };

    const handleShare = async (e: React.MouseEvent, recipe: FullRecipe) => {
        e.stopPropagation();
        const shareText = `Confira esta receita de ${recipe.name} no ChecklistIA!`;
        const shareUrl = `${window.location.origin}/?recipe=${encodeURIComponent(recipe.name)}`;

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

    const handleGenerateNew = () => {
        const finalTerm = customOrder.trim() || currentSearchTerm;
        if (!finalTerm) return;
        showToast(`Pedido anotado! O Chef já começou...`);
        fetchRecipeDetails(finalTerm);
        closeModal('recipeSelection');
    };

    const hasResults = recipeSearchResults.length > 0;

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col justify-center items-center animate-fadeIn">
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
                <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <h2 className="text-white text-sm font-black uppercase tracking-tighter italic">
                        {hasResults ? 'Sugestões do Acervo' : 'Pedido Especial'}
                    </h2>
                </div>
                <button 
                    onClick={() => closeModal('recipeSelection')}
                    className="bg-white/10 hover:bg-red-500 text-white rounded-full p-2 transition-all border border-white/10"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <div className="relative w-full flex items-center group/carousel h-[85vh]">
                <button 
                    onClick={() => handleScroll('left')}
                    className="hidden lg:flex absolute left-4 z-50 w-14 h-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover/carousel:opacity-100"
                >
                    <span className="material-symbols-outlined text-3xl">chevron_left</span>
                </button>

                <div 
                    ref={scrollContainerRef}
                    className="w-full flex overflow-x-auto snap-x snap-mandatory gap-6 px-8 pb-10 scrollbar-hide items-center h-full"
                >
                    {recipeSearchResults.map((recipe, idx) => {
                        const isFav = isFavorite(recipe.name);
                        const isFromCache = recipe.imageSource === 'cache';
                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleSelect(recipe)}
                                className="snap-center shrink-0 w-[85vw] sm:w-[360px] h-[75vh] relative rounded-[3rem] overflow-hidden shadow-2xl cursor-pointer group border border-white/10 transition-transform active:scale-95 bg-[#1a1a1a] flex flex-col"
                            >
                                <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-[10s] ease-out" style={{ backgroundImage: `url(${recipe.imageUrl})` }}></div>
                                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90"></div>
                                
                                <div className="absolute top-0 left-0 w-full p-10 pt-16">
                                    {isFromCache && (
                                        <div className="mb-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 w-fit animate-fadeIn">
                                            <span className="material-symbols-outlined text-[14px] text-orange-400">photo_camera</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest leading-none pt-[1px]">
                                                <span className="text-white">Checklist</span><span className="text-blue-500">IA</span>
                                            </span>
                                        </div>
                                    )}
                                    <h3 className="font-display text-[32px] sm:text-[38px] font-black text-white leading-[0.95] uppercase italic tracking-[-0.05em] line-clamp-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transform -rotate-1 origin-left">
                                        {recipe.name}
                                    </h3>
                                    <div className="h-1.5 w-16 bg-primary mt-4 rounded-full"></div>
                                </div>

                                <div className="absolute bottom-0 left-0 w-full p-10 flex justify-between items-center">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">Acervo ChecklistIA</span>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold">{recipe.difficulty}</span>
                                            <div className="bg-primary/20 backdrop-blur-md px-2 py-1 rounded">
                                                {renderTimeClocks(recipe.prepTimeInMinutes)}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-3 shrink-0 z-30">
                                        <button onClick={(e) => handleShare(e, recipe)} className="w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all shadow-xl backdrop-blur-md border border-white/20 bg-black/40 text-white hover:bg-black/60">
                                            <span className="material-symbols-outlined text-xl">share</span>
                                        </button>
                                        <button onClick={(e) => handleToggleFavorite(e, recipe)} className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all shadow-xl backdrop-blur-md border border-white/20 ${isFav ? 'bg-red-500 text-white' : 'bg-black/40 text-white hover:bg-black/60'}`}>
                                            <span className={`material-symbols-outlined text-xl ${isFav ? 'font-variation-FILL-1' : ''}`} style={ isFav ? { fontVariationSettings: "'FILL' 1" } : {} }>favorite</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="snap-center shrink-0 w-[85vw] sm:w-[360px] h-[75vh] relative rounded-[3rem] overflow-hidden shadow-2xl bg-[#0a0a0a] border border-white/10 flex flex-col">
                        <div className="absolute inset-0 bg-cover bg-center animate-slowZoom" style={{ backgroundImage: `url("${staffMember.url}")` }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                        <div className="absolute inset-x-0 bottom-0 p-8 pb-12 flex flex-col gap-4">
                            <div className="relative w-full group">
                                <div className="w-full bg-white/10 backdrop-blur-2xl rounded-2xl p-1.5 border border-white/20 shadow-2xl flex items-center gap-2">
                                    <input type="text" value={customOrder} onChange={(e) => setCustomOrder(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGenerateNew()} placeholder="O que você quer cozinhar?" className="flex-1 bg-transparent border-0 text-white placeholder:text-white/30 focus:ring-0 text-base font-bold h-10 px-3" />
                                    <button onClick={handleGenerateNew} disabled={!customOrder.trim()} className="h-10 w-10 bg-primary hover:bg-primary-hover text-white rounded-xl shadow-lg transition-all active:scale-90 flex items-center justify-center disabled:opacity-30 disabled:grayscale">
                                        <span className="material-symbols-outlined !text-2xl">search</span>
                                    </button>
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="font-display text-2xl font-black text-blue-400 uppercase italic tracking-tighter drop-shadow-md">Não achou o que queria?</h3>
                                <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.2em] leading-tight">Peça agora para nossa IA <br/> preparar sua receita na hora</p>
                            </div>
                        </div>
                        <div className="absolute top-10 left-10 opacity-30">
                             <span className="text-[8px] font-black text-white uppercase tracking-[0.4em] [writing-mode:vertical-lr] rotate-180">STAFF IA</span>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => handleScroll('right')}
                    className="hidden lg:flex absolute right-4 z-50 w-14 h-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover/carousel:opacity-100"
                >
                    <span className="material-symbols-outlined text-3xl">chevron_right</span>
                </button>
            </div>
            <div className="flex gap-2 mb-8">
                <div className={`h-1.5 rounded-full transition-all ${hasResults ? 'w-2 bg-white/20' : 'w-8 bg-primary'}`}></div>
                <div className={`h-1.5 rounded-full transition-all ${!hasResults ? 'w-2 bg-white/20' : 'w-8 bg-primary'}`}></div>
            </div>
        </div>
    );
};
