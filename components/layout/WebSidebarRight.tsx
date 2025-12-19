
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import type { FullRecipe } from '../../types';

export const WebSidebarRight: React.FC = () => {
    const { featuredRecipes, showRecipe, getRandomCachedRecipe, openModal, showToast } = useApp();
    const { user } = useAuth();
    const [suggestion, setSuggestion] = useState<FullRecipe | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Função para escolher uma receita aleatória diferente da atual
    const pickNewSuggestion = useCallback(() => {
        let newPick = getRandomCachedRecipe();
        
        // Se a nova sugestão for igual à atual, tenta pegar outra do pool de destaque
        if (newPick?.name === suggestion?.name && featuredRecipes.length > 1) {
            const pool = featuredRecipes.filter(r => r.name !== suggestion?.name);
            newPick = pool[Math.floor(Math.random() * pool.length)];
        }
        
        return newPick || (featuredRecipes.length > 0 ? featuredRecipes[0] : null);
    }, [featuredRecipes, getRandomCachedRecipe, suggestion]);

    // Efeito para troca automática a cada 60 segundos
    useEffect(() => {
        // Inicializa se estiver vazio
        if (!suggestion) {
            setSuggestion(pickNewSuggestion());
        }

        const interval = setInterval(() => {
            setIsTransitioning(true);
            
            // Aguarda o fade-out antes de trocar os dados
            setTimeout(() => {
                setSuggestion(pickNewSuggestion());
                setIsTransitioning(false);
            }, 600); // Duração da animação de saída
        }, 60000); // 1 minuto

        return () => clearInterval(interval);
    }, [pickNewSuggestion, suggestion]);

    const handleCardClick = () => {
        if (!suggestion || isTransitioning) return;

        if (!user) {
            showToast("Faça login para ver a receita completa!");
            openModal('auth');
            return;
        }
        
        showRecipe(suggestion);
    };

    if (!suggestion) return (
        <div className="hidden lg:flex lg:w-96 bg-[#121212] border-l border-white/10 p-6 items-center justify-center text-gray-600 flex-shrink-0">
            <div className="text-center">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20 animate-spin">sync</span>
                <p className="text-sm">Buscando inspirações...</p>
            </div>
        </div>
    );

    return (
        <div className="hidden lg:flex lg:w-96 flex-col h-full bg-[#121212] border-l border-white/10 p-8 overflow-hidden flex-shrink-0">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    Inspiração do Momento
                </h3>
                {/* Timer Visual Simples */}
                <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                    <div key={suggestion.name} className="h-full bg-primary/40 animate-progress60s"></div>
                </div>
            </div>

            {/* Recipe Card Container */}
            <div 
                className={`flex-1 flex flex-col transition-all duration-700 ease-in-out ${
                    isTransitioning 
                    ? 'opacity-0 scale-95 blur-sm translate-y-4' 
                    : 'opacity-100 scale-100 blur-0 translate-y-0'
                }`}
            >
                <div className="flex-1 group relative w-full rounded-3xl overflow-hidden shadow-2xl mb-6 cursor-pointer min-h-0" onClick={handleCardClick}>
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] group-hover:scale-110"
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
                        <h2 className="text-2xl font-bold text-white leading-tight mb-2 drop-shadow-lg font-display capitalize">
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
                        Esta receita foi escolhida pelo nosso algoritmo de afinidade. Experimente adicioná-la à sua lista hoje!
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes progress60s {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                .animate-progress60s {
                    animation: progress60s 60s linear forwards;
                }
            `}</style>
        </div>
    );
};
