
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
        showRecipe(recipe);
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
                        {hasResults ? 'Acervo Sugerido' : 'Pedido Personalizado'}
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
                    
                    {/* 1. Cards do Acervo (Editorial Look) */}
                    {recipeSearchResults.map((recipe, idx) => {
                        const isFav = isFavorite(recipe.name);
                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleSelect(recipe)}
                                className="snap-center shrink-0 w-[85vw] sm:w-[360px] h-[75vh] relative rounded-[3rem] overflow-hidden shadow-2xl cursor-pointer group border border-white/10 transition-transform active:scale-95 bg-[#1a1a1a] flex flex-col"
                            >
                                {/* Foto de fundo com Ken Burns suave */}
                                <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-[10s] ease-out" style={{ backgroundImage: `url(${recipe.imageUrl})` }}></div>
                                
                                {/* Gradientes Estratégicos (Escuro no topo e na base) */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90"></div>
                                
                                {/* NOME NO TOPO (Design Estiloso e Playful - Fonte Reduzida conforme solicitado) */}
                                <div className="absolute top-0 left-0 w-full p-10 pt-16">
                                    <h3 className="font-display text-[32px] sm:text-[38px] font-black text-white leading-[0.95] uppercase italic tracking-[-0.05em] line-clamp-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transform -rotate-1 origin-left">
                                        {recipe.name}
                                    </h3>
                                    <div className="h-1.5 w-16 bg-primary mt-4 rounded-full"></div>
                                </div>

                                {/* AÇÕES NA BASE */}
                                <div className="absolute bottom-0 left-0 w-full p-10 flex justify-between items-center">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">ChecklistIA Premium</span>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold">{recipe.difficulty}</span>
                                            <span className="bg-primary/20 backdrop-blur-md px-2 py-1 rounded text-[10px] text-primary font-bold">{recipe.prepTimeInMinutes}min</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-3 shrink-0 z-30">
                                        {/* Botão de Compartilhamento Restaurado */}
                                        <button 
                                            onClick={(e) => handleShare(e, recipe)}
                                            className="w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all shadow-xl backdrop-blur-md border border-white/20 bg-black/40 text-white hover:bg-black/60"
                                            title="Compartilhar"
                                        >
                                            <span className="material-symbols-outlined text-xl">share</span>
                                        </button>

                                        {/* Botão Favorito */}
                                        <button 
                                            onClick={(e) => handleToggleFavorite(e, recipe)}
                                            className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all shadow-xl backdrop-blur-md border border-white/20 ${
                                                isFav ? 'bg-red-500 text-white' : 'bg-black/40 text-white hover:bg-black/60'
                                            }`}
                                        >
                                            <span className={`material-symbols-outlined text-xl ${isFav ? 'font-variation-FILL-1' : ''}`} style={ isFav ? { fontVariationSettings: "'FILL' 1" } : {} }>
                                                favorite
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Indicador Visual Lateral (Playful Decor) */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center px-2 opacity-20">
                                    <div className="w-1 h-1 bg-white rounded-full"></div>
                                    <div className="w-1 h-12 bg-white rounded-full"></div>
                                    <div className="w-1 h-1 bg-white rounded-full"></div>
                                </div>
                            </div>
                        );
                    })}

                    {/* 2. CARD DA GARÇONETE IA */}
                    <div 
                        className="snap-center shrink-0 w-[85vw] sm:w-[360px] h-[75vh] relative rounded-[3rem] overflow-hidden shadow-2xl bg-[#0a0a0a] border border-white/10 flex flex-col"
                    >
                        <div 
                            className="absolute inset-0 bg-cover bg-center animate-slowZoom"
                            style={{ backgroundImage: `url("${staffMember.url}")` }}
                        ></div>

                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>

                        <div className="absolute top-0 left-0 w-full p-10 pt-16">
                            <h3 className="font-display text-[32px] sm:text-[38px] font-black text-blue-400 leading-[0.95] uppercase italic tracking-[-0.05em] transform -rotate-1 origin-left drop-shadow-lg">
                                Não achou o que queria?
                            </h3>
                            <p className="text-white/60 text-xs font-black uppercase tracking-widest mt-4">Peça agora para nossa IA</p>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-10">
                            <div className="w-full bg-white/10 backdrop-blur-3xl rounded-[2rem] p-3 border border-white/20 shadow-2xl mb-4 flex items-center gap-2 pr-5">
                                <input 
                                    type="text"
                                    value={customOrder}
                                    onChange={(e) => setCustomOrder(e.target.value)}
                                    placeholder="Ex: Bolo de Brigadeiro..."
                                    className="flex-1 bg-transparent border-0 text-white placeholder:text-white/20 focus:ring-0 text-lg font-bold h-14 px-4"
                                />
                                <button 
                                    onClick={() => handleGenerateNew(customOrder)}
                                    disabled={!customOrder.trim()}
                                    className="h-14 w-14 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.2rem] shadow-lg transition-all active:scale-90 flex items-center justify-center disabled:opacity-30"
                                >
                                    <span className="material-symbols-outlined !text-3xl">send</span>
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-white/40 font-bold uppercase tracking-[0.2em]">O Chef IA preparará sua receita na hora</p>
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

            <div className="flex gap-2 mb-8">
                <div className="h-1.5 w-8 bg-primary rounded-full"></div>
                <div className="h-1.5 w-1.5 bg-white/20 rounded-full"></div>
                <div className="h-1.5 w-1.5 bg-white/20 rounded-full"></div>
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
