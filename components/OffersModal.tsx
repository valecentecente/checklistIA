
import React, { useState, useEffect } from 'react';
import type { Offer } from '../types';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

interface OffersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Sub-componente para lidar com o carrossel individual de cada produto
const OfferCard: React.FC<{ product: Offer }> = ({ product }) => {
    const { openProductDetails, openModal, showToast } = useApp();
    const { toggleOfferSaved, isOfferSaved } = useShoppingList();
    const { user } = useAuth();
    
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = product.images && product.images.length > 0 ? product.images : [product.image];
    const isSaved = isOfferSaved(product.id);

    // Efeito de Rotação Automática
    useEffect(() => {
        if (images.length <= 1) return;
        const randomDelay = Math.floor(Math.random() * 500); 
        const intervalTime = 3000 + randomDelay;
        const interval = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % images.length);
        }, intervalTime);
        return () => clearInterval(interval);
    }, [images.length]);

    const handleCardClick = (e: React.MouseEvent) => {
        // Se clicar nos botões de ação, não abre detalhes
        if ((e.target as HTMLElement).closest('.action-btn')) return;
        openProductDetails(product);
    };

    const handleToggleCheck = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!user) {
            showToast("Faça login para salvar seus Achadinhos!");
            openModal('auth');
            return;
        }
        await toggleOfferSaved(product);
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        const shareData = {
            title: `ChecklistIA: ${product.name}`,
            text: `Olha esse achadinho que vi no ChecklistIA! ${product.price}`,
            url: product.link // Idealmente seria um deep link para o app, mas usamos o link da loja por enquanto
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                // User cancelled or error
            }
        } else {
            await navigator.clipboard.writeText(product.link);
            showToast("Link copiado!");
        }
    };

    // Renderiza CHECKS AZUIS (Branding) em vez de estrelas
    const renderRating = (rating: number) => {
        if (!rating) return null;
        return (
            <div className="flex items-center gap-0.5 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30">
                <span className="material-symbols-outlined text-[12px] text-blue-600 dark:text-blue-400 font-bold">check</span>
                {rating.toFixed(1)}
            </div>
        );
    };

    return (
        <div 
            onClick={handleCardClick}
            className="flex flex-col bg-white dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800 group hover:shadow-md transition-all active:scale-95 cursor-pointer relative"
        >
            <div className="aspect-square w-full bg-white p-4 flex items-center justify-center relative overflow-hidden">
                {product.discount && (
                    <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {product.discount}
                    </span>
                )}

                {/* BOTÕES DE AÇÃO FLUTUANTES */}
                <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
                    {/* Botão Salvar (Coração) */}
                    <button 
                        onClick={handleToggleCheck}
                        className={`action-btn w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
                            isSaved 
                            ? 'bg-red-500 text-white scale-110' 
                            : 'bg-white/90 dark:bg-black/40 text-gray-400 hover:text-red-500 border border-gray-200 dark:border-gray-600 backdrop-blur-sm'
                        }`}
                        title={isSaved ? "Remover dos Favoritos" : "Salvar nos Favoritos"}
                    >
                        <span className={`material-symbols-outlined text-lg ${isSaved ? 'font-variation-FILL-1 animate-heartbeat' : ''}`} style={ isSaved ? { fontVariationSettings: "'FILL' 1" } : {} }>
                            favorite
                        </span>
                    </button>

                    {/* Botão Compartilhar */}
                    <button 
                        onClick={handleShare}
                        className="action-btn w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm bg-white/90 dark:bg-black/40 text-gray-400 hover:text-blue-500 border border-gray-200 dark:border-gray-600 backdrop-blur-sm"
                        title="Compartilhar"
                    >
                        <span className="material-symbols-outlined text-lg">share</span>
                    </button>
                </div>
                
                {/* Image Carousel */}
                {images.map((img, idx) => (
                    <img 
                        key={idx}
                        src={img} 
                        alt={`${product.name} - view ${idx + 1}`} 
                        className={`absolute inset-0 m-auto max-w-[85%] max-h-[85%] object-contain mix-blend-multiply dark:mix-blend-normal transition-opacity duration-700 ease-in-out ${idx === currentImageIndex ? 'opacity-100 z-0' : 'opacity-0 z-0'}`} 
                    />
                ))}

                {/* Dots indicator */}
                {images.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
                        {images.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1 w-1 rounded-full transition-all ${idx === currentImageIndex ? 'bg-gray-800 w-3' : 'bg-gray-300'}`}
                            ></div>
                        ))}
                    </div>
                )}
            </div>
            <div className="p-3 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{product.store}</p>
                    {product.averageRating ? renderRating(product.averageRating) : null}
                </div>
                
                <h3 className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-relaxed mb-2 flex-1">
                    {product.name}
                </h3>
                <div className="mt-auto">
                    {product.oldPrice && (
                        <p className="text-[10px] text-gray-400 line-through">{product.oldPrice}</p>
                    )}
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{product.price}</p>
                        <span className="material-symbols-outlined text-base text-gray-400 group-hover:text-primary transition-colors">arrow_forward</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const OffersModal: React.FC<OffersModalProps> = ({ isOpen, onClose }) => {
    const { offers, savedOffers } = useShoppingList();
    const { openModal, showToast } = useApp();
    const { user } = useAuth();
    
    const [viewMode, setViewMode] = useState<'explore' | 'saved'>('explore');
    const [activeCategory, setActiveCategory] = useState<string>('Todos');

    if (!isOpen) return null;

    const listToRender = viewMode === 'saved' ? savedOffers : offers;
    const filteredProducts = activeCategory === 'Todos' 
        ? listToRender 
        : listToRender.filter(p => p.category === activeCategory);

    const handleTabChange = (mode: 'explore' | 'saved') => {
        if (mode === 'saved' && !user) {
            showToast("Faça login para ver seus itens salvos.");
            openModal('auth');
            return;
        }
        setViewMode(mode);
        setActiveCategory('Todos');
    };

    return (
        <div className="fixed inset-0 z-[160] bg-black/60 flex items-end sm:items-center justify-center animate-fadeIn backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#F5F5F7] dark:bg-[#121212] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp shadow-2xl h-[85vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-surface-dark shrink-0">
                    <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            Seleção Especial
                        </p>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                            Achadinhos da Cozinha
                        </h2>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 transition-colors hover:bg-gray-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* --- ABAS PRINCIPAIS --- */}
                <div className="bg-white dark:bg-surface-dark px-4 pb-0 pt-2 flex gap-4 shrink-0 border-b border-gray-100 dark:border-gray-800">
                    <button 
                        onClick={() => handleTabChange('explore')}
                        className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                            viewMode === 'explore' 
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">travel_explore</span>
                        Explorar
                    </button>
                    <button 
                        onClick={() => handleTabChange('saved')}
                        className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                            viewMode === 'saved' 
                            ? 'border-red-500 text-red-500' 
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">favorite</span>
                        Favoritos
                        {savedOffers.length > 0 && (
                            <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                {savedOffers.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Categorias (Sub-menu) */}
                <div className="bg-white dark:bg-surface-dark px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0 shadow-sm z-10">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {['Todos', 'Eletro', 'Utensílios', 'Organização'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                                    activeCategory === cat
                                    ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white'
                                    : 'bg-transparent text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/10'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-black/20">
                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            {viewMode === 'saved' ? (
                                <>
                                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-3">
                                        <span className="material-symbols-outlined text-3xl text-red-400">favorite_border</span>
                                    </div>
                                    <p className="font-bold text-gray-700 dark:text-gray-200">Sem favoritos ainda</p>
                                    <p className="text-sm text-gray-500 mt-1 max-w-[200px]">Marque itens com o coração na aba Explorar para vê-los aqui.</p>
                                    <button 
                                        onClick={() => handleTabChange('explore')}
                                        className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                                    >
                                        Ir para Explorar
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">shopping_bag</span>
                                    <p className="text-sm text-gray-500">Nenhum produto nesta categoria ainda.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 pb-6">
                            {filteredProducts.map((product) => (
                                <OfferCard key={product.id} product={product} />
                            ))}
                        </div>
                    )}
                    
                    {viewMode === 'explore' && filteredProducts.length > 0 && (
                        <div className="mt-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-center">
                            <span className="material-symbols-outlined text-blue-500 text-3xl mb-2">store</span>
                            <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                                Comprando através destes links, você ajuda a manter o app gratuito! ❤️
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
