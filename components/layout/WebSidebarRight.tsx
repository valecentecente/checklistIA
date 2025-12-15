
import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import type { FullRecipe } from '../../types';

export const WebSidebarRight: React.FC = () => {
    const { featuredRecipes, showRecipe, getRandomCachedRecipe, openModal, showToast } = useApp();
    const { user } = useAuth();
    const [suggestion, setSuggestion] = useState<FullRecipe | null>(null);

    // Pick a random suggestion on mount
    useEffect(() => {
        // Tenta pegar do cache global primeiro, ou featured
        const random = getRandomCachedRecipe() || (featuredRecipes.length > 0 ? featuredRecipes[Math.floor(Math.random() * featuredRecipes.length)] : null);
        if (random) setSuggestion(random);
    }, [featuredRecipes, getRandomCachedRecipe]);

    const handleCardClick = () => {
        if (!suggestion) return;

        if (!user) {
            showToast("Faça login para ver a receita completa!");
            openModal('auth');
            return;
        }
        
        // MODIFICAÇÃO: Passa o objeto suggestion (FullRecipe) inteiro
        showRecipe(suggestion);
    };

    if (!suggestion) return (
        <div className="hidden lg:flex lg:w-96 bg-[#121212] border-l border-white/10 p-6 items-center justify-center text-gray-600 flex-shrink-0">
            <div className="text-center">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">restaurant</span>
                <p className="text-sm">Carregando sugestões...</p>
            </div>
        </div>
    );

    return (
        <div className="hidden lg:flex lg:w-96 flex-col h-full bg-[#121212] border-l border-white/10 p-8 overflow-hidden flex-shrink-0">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6 flex-shrink-0 flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                Inspiração do Dia
            </h3>

            {/* Recipe Card - Expanded to fill available space */}
            <div className="flex-1 group relative w-full rounded-3xl overflow-hidden shadow-2xl mb-6 cursor-pointer min-h-0" onClick={handleCardClick}>
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: suggestion.imageUrl ? `url(${suggestion.imageUrl})` : 'none', backgroundColor: '#333' }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                
                {/* Lock Icon Overlay if not logged in */}
                {!user && (
                    <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-md p-2 rounded-full text-white/80 border border-white/10 animate-fadeIn">
                        <span className="material-symbols-outlined text-sm">lock</span>
                    </div>
                )}
                
                <div className="absolute bottom-0 left-0 w-full p-6">
                    <div className="flex gap-2 mb-3">
                        <span className="bg-white/20 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase">
                            {suggestion.difficulty || 'Fácil'}
                        </span>
                        {suggestion.prepTimeInMinutes && (
                            <span className="bg-black/40 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">timer</span> {suggestion.prepTimeInMinutes} min
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-white leading-tight mb-2 drop-shadow-lg font-display">
                        {suggestion.name}
                    </h2>
                    <button className="mt-2 flex items-center gap-2 text-primary font-bold text-sm group-hover:gap-3 transition-all">
                        {user ? 'Ver Receita' : 'Faça Login para Ver'} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats Widget - Bottom */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 flex-shrink-0">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">insights</span>
                    Dica do Chef
                </h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Experimente organizar sua lista por "Corredores" para economizar tempo no mercado. A IA agrupa tudo automaticamente!
                </p>
            </div>
        </div>
    );
};
