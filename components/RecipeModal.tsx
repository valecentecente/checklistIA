
import React, { useState, useMemo } from 'react';
import type { FullRecipe } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useShoppingList } from '../contexts/ShoppingListContext';

interface RecipeModalProps {
  recipe: FullRecipe;
  onClose: () => void;
  onImageGenerated: (recipeName: string, imageUrl: string, source: 'cache' | 'genai') => void;
}

const CHEF_PLACEHOLDERS = [
    "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1607631568010-a87245c0daf8?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1654922207993-2952fec3276f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1622021142947-da7dedc7c39a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512485800893-b08ec1ea59b1?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=800&q=80"
];

export const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, onClose }) => {
  const { addRecipeToShoppingList, setHomeViewActive, currentMarketName, fetchRecipeDetails, isRecipeLoading } = useApp();
  const { user } = useAuth();
  const { toggleFavorite, isFavorite, offers, items } = useShoppingList();
  
  const [isAdding, setIsAdding] = useState(false);
  const imageUrl = recipe.imageUrl;
  
  // Verificação de origem para selo de créditos
  const isFromCache = recipe.imageSource === 'cache';
  
  const isSaved = isFavorite(recipe.name);
  
  const isAdultContent = useMemo(() => {
      if (recipe.isAlcoholic) return true;
      if (recipe.tags && recipe.tags.length > 0) {
          const adultTags = ['drinks', 'drink', 'alcool', 'álcool', 'bebida alcoólica', 'coquetel', 'vodka', 'gin', 'whisky', 'cerveja'];
          return recipe.tags.some(t => adultTags.includes(t.toLowerCase()));
      }
      const nameLower = recipe.name.toLowerCase();
      if (nameLower.includes('caipirinha') || nameLower.includes('gin tônica') || nameLower.includes('mojito')) return true;
      return false;
  }, [recipe]);
  
  const randomChefImage = useMemo(() => {
      const randomIndex = Math.floor(Math.random() * CHEF_PLACEHOLDERS.length);
      return CHEF_PLACEHOLDERS[randomIndex];
  }, []);

  const hasActiveList = items.length > 0 || !!currentMarketName;
  const safeIngredients = recipe.ingredients || [];
  const safeInstructions = recipe.instructions || [];
  const isBroken = safeIngredients.length === 0 || safeInstructions.length === 0;
  
  const difficultyMap: Record<'Fácil' | 'Médio' | 'Difícil', string> = {
      'Fácil': 'signal_cellular_alt_1_bar',
      'Médio': 'signal_cellular_alt_2_bar',
      'Difícil': 'signal_cellular_alt',
  };

  const costSymbols = useMemo(() => {
      if (recipe.cost === 'Baixo') return '$';
      if (recipe.cost === 'Médio') return '$$';
      if (recipe.cost === 'Alto') return '$$$';
      return '$';
  }, [recipe.cost]);

  const handleAddRequest = async () => {
      if (!hasActiveList) {
          setHomeViewActive(false); 
          setIsAdding(true);
          await addRecipeToShoppingList(recipe);
          setIsAdding(false);
          onClose();
          return;
      }
      
      setIsAdding(true);
      await addRecipeToShoppingList(recipe);
      setIsAdding(false);
      onClose();
  };
  
  const handleToggleFavorite = async () => {
      if (!user) {
          onClose();
          return;
      }
      await toggleFavorite(recipe);
  };

  const handleRegenerateDetails = async () => {
      await fetchRecipeDetails(recipe.name, undefined, false);
  };

  const relatedOffers = useMemo(() => {
      if (!offers || offers.length === 0) return [];
      const leads = (recipe.suggestedLeads || []).map(l => l.toLowerCase().trim()).filter(l => l !== 'nenhum');
      const fullText = (recipe.name + ' ' + safeIngredients.map(i => i.simplifiedName).join(' ') + ' ' + safeInstructions.join(' ')).toLowerCase();
      const filtered = offers.filter(offer => {
          const offerName = offer.name.toLowerCase();
          const offerTags = (offer.tags || []).map(t => t.toLowerCase().trim());
          const matchesLead = leads.some(lead => offerTags.includes(lead) || offerName.includes(lead));
          if (matchesLead) return true;
          const firstKeyword = offer.name.trim().split(' ')[0].toLowerCase();
          if (firstKeyword.length >= 4 && fullText.includes(firstKeyword)) return true;
          if (offer.tags && offer.tags.length > 0) {
              const tagMatch = offer.tags.some(tag => {
                  const cleanTag = tag.trim().toLowerCase();
                  return cleanTag.length > 2 && fullText.includes(cleanTag);
              });
              if (tagMatch) return true;
          }
          return false;
      });
      const shuffled = [...filtered];
      for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
  }, [offers, recipe, safeIngredients, safeInstructions]);

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full flex-col justify-end items-stretch bg-black/60 z-[130] animate-fadeIn backdrop-blur-sm" onClick={onClose}>
        <div className="flex flex-col items-stretch bg-[#F7F7F7] dark:bg-[#1a1a1a] rounded-t-2xl max-h-[95dvh] animate-slideUp overflow-hidden relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0 absolute top-0 left-0 right-0 z-[100] flex justify-center pt-3 pb-1 pointer-events-none">
                <div className="h-1.5 w-12 rounded-full bg-white/50 backdrop-blur-md shadow-sm"></div>
            </div>

            <button onClick={onClose} className="absolute top-4 right-4 z-[100] flex items-center justify-center h-8 w-8 bg-black/30 rounded-full text-white backdrop-blur-md hover:bg-black/50 transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
            </button>

            <div className="flex-1 overflow-y-auto pb-[calc(100px+env(safe-area-inset-bottom))] scrollbar-hide relative">
                
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] flex-shrink-0 overflow-hidden bg-gray-200 dark:bg-gray-800">
                    <div 
                        className={`absolute inset-0 bg-center bg-no-repeat bg-cover transition-opacity duration-1000 ${imageUrl ? 'opacity-100' : 'opacity-0'}`}
                        style={{backgroundImage: imageUrl ? `url(${imageUrl})` : 'none'}}
                    ></div>

                    {(!imageUrl || isRecipeLoading) && (
                        <div className="absolute inset-0 z-10">
                            <div 
                                className="absolute inset-0 bg-center bg-cover filter blur-[2px] scale-110 opacity-60"
                                style={{backgroundImage: `url(${randomChefImage})`}}
                            ></div>
                            <div className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center text-white gap-3 p-6 text-center">
                                <div className="bg-white/20 p-4 rounded-full backdrop-blur-md animate-pulse">
                                    <span className="material-symbols-outlined text-5xl">restaurant_menu</span>
                                </div>
                                <div className="animate-fadeIn">
                                    <p className="font-bold text-xl drop-shadow-lg">O Chef IA está trabalhando...</p>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400 mt-2">Preparando a foto do seu prato</p>
                                </div>
                            </div>
                        </div>
                    )}
                     
                     <div className="absolute top-4 left-4 z-[110] flex flex-col gap-2 items-start pointer-events-none">
                         {/* SELO DE CRÉDITO DO ACERVO REFINADO: Checklist (branco) IA (azul) */}
                         {imageUrl && isFromCache && !isRecipeLoading && (
                             <div className="animate-fadeIn flex items-center gap-1.5 select-none bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 shadow-xl">
                                 <span className="material-symbols-outlined text-[20px] text-orange-400 leading-none">photo_camera</span>
                                 <span className="text-[10px] font-black uppercase tracking-[0.1em] leading-none pt-[1px]">
                                    <span className="text-white">Checklist</span><span className="text-blue-500 ml-0.5">IA</span>
                                 </span>
                             </div>
                         )}
                         
                         {isAdultContent && (
                             <div className="animate-bounce-y flex items-center gap-1.5 select-none bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-lg border border-white/20">
                                 <span className="text-xs font-black uppercase tracking-wider leading-none">
                                    🔞 +18
                                 </span>
                             </div>
                         )}
                     </div>
                     
                     <div className="absolute bottom-6 right-4 z-[90]">
                         <button 
                             onClick={handleToggleFavorite}
                             className={`flex items-center justify-center h-12 w-12 rounded-full shadow-lg transition-transform active:scale-95 ${
                                 isSaved 
                                 ? 'bg-red-500 text-white hover:bg-red-600' 
                                 : 'bg-white/90 dark:bg-black/60 text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-black/80 backdrop-blur-md'
                             }`}
                             title={isSaved ? "Remover dos favoritos" : "Salvar receita"}
                         >
                             <span className={`material-symbols-outlined text-2xl ${isSaved ? 'font-variation-FILL-1' : ''}`} style={ isSaved ? { fontVariationSettings: "'FILL' 1" } : {} }>
                                 favorite
                             </span>
                         </button>
                     </div>
                     
                     <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#F7F7F7] dark:from-[#1a1a1a] to-transparent pointer-events-none z-10"></div>
                </div>

                <div className="relative px-5 -mt-8 z-20">
                     <h1 className="text-text-main dark:text-gray-50 tracking-tight text-[28px] font-bold leading-none font-display capitalize drop-shadow-sm pr-12">{recipe.name}</h1>
                </div>
                
                <div className="flex gap-2 p-5 pt-4 flex-wrap items-center">
                    <div className="flex h-8 shrink-0 items-center justify-center gap-x-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 px-3 shadow-sm">
                         <span className="material-symbols-outlined text-sm text-blue-600 dark:text-blue-400 font-black">check</span>
                         <p className="text-blue-600 dark:text-blue-400 text-xs font-black">5.0</p>
                    </div>

                    <div className="flex h-8 shrink-0 items-center justify-center gap-x-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 px-3 shadow-sm" title={`Custo: ${recipe.cost}`}>
                         <p className="text-green-600 dark:text-green-400 text-xs font-black tracking-widest">{costSymbols}</p>
                    </div>

                    {recipe.prepTimeInMinutes > 0 && (
                        <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 shadow-sm">
                            <span className="material-symbols-outlined text-base text-text-secondary dark:text-gray-400">timer</span>
                            <p className="text-text-secondary dark:text-gray-300 text-xs font-bold uppercase tracking-wide">{recipe.prepTimeInMinutes} min</p>
                        </div>
                    )}
                    
                    {recipe.difficulty && (
                        <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 shadow-sm">
                             <span className="material-symbols-outlined text-base text-text-secondary dark:text-gray-400">{difficultyMap[recipe.difficulty as keyof typeof difficultyMap] || 'signal_cellular_alt'}</span>
                            <p className="text-text-secondary dark:text-gray-300 text-xs font-bold uppercase tracking-wide">{recipe.difficulty}</p>
                        </div>
                    )}

                    <button 
                        onClick={onClose}
                        className="ml-auto flex h-8 shrink-0 items-center justify-center gap-x-1.5 rounded-full bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/5 px-4 backdrop-blur-md hover:bg-white/30 dark:hover:bg-white/20 transition-all active:scale-95 group shadow-sm"
                    >
                        <span className="material-symbols-outlined text-sm text-text-main dark:text-gray-200 group-hover:-translate-x-0.5 transition-transform">arrow_back_ios_new</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-text-main dark:text-gray-200">Voltar</span>
                    </button>
                </div>

                <div className="px-5">
                    <h3 className="text-text-main dark:text-gray-100 text-lg font-bold leading-tight pb-3 pt-2 font-display flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">grocery</span>
                        Ingredientes
                    </h3>
                    <div className="flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm">
                        {safeIngredients.length > 0 ? safeIngredients.map((ingredient, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary text-lg mt-0.5">check_circle</span>
                                <span className="text-text-main dark:text-gray-200 text-sm leading-relaxed">{ingredient.detailedName}</span>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
                                <p className="text-sm text-gray-500 italic">Ingredientes indisponíveis para esta receita.</p>
                                <button 
                                    onClick={handleRegenerateDetails}
                                    disabled={isRecipeLoading}
                                    className="mt-2 flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-hover shadow-lg transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isRecipeLoading ? (
                                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-lg">auto_fix_high</span>
                                    )}
                                    {isRecipeLoading ? "Refazendo..." : "Completar com IA agora"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {relatedOffers.length > 0 && (
                    <div className="pl-5 mt-6 animate-fadeIn">
                        <h3 className="text-gray-800 dark:text-gray-100 text-base font-bold leading-tight pb-2 font-display flex items-center gap-2">
                            <span className="material-symbols-outlined text-yellow-500">lightbulb</span>
                            Achadinhos Recomendados
                        </h3>
                        <div className="flex overflow-x-auto gap-3 pb-4 pt-1 pr-5 scrollbar-hide snap-x">
                            {relatedOffers.map((offer) => (
                                <a 
                                    key={offer.id}
                                    href={offer.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="snap-center shrink-0 w-40 flex flex-col bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group hover:border-primary/50 transition-all active:scale-95"
                                >
                                    <div className="aspect-square w-full bg-white p-3 flex items-center justify-center relative">
                                        <img src={offer.image} alt={offer.name} className="max-w-full max-h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                        {offer.discount && (
                                            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                {offer.discount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-2 flex flex-col flex-1 bg-gray-50/50 dark:bg-black/10">
                                        <h4 className="text-[11px] font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight mb-1">
                                            {offer.name}
                                        </h4>
                                        <div className="mt-auto flex items-center justify-between">
                                            <span className="text-xs font-bold text-green-600 dark:text-green-400">{offer.price}</span>
                                            <span className="material-symbols-outlined text-sm text-gray-400 group-hover:text-primary">open_in_new</span>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="px-5 mt-4">
                    <h3 className="text-text-main dark:text-gray-100 text-lg font-bold leading-tight pb-3 font-display flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">cooking</span>
                        Modo de Preparo
                    </h3>
                    <div className="flex flex-col gap-5">
                        {safeInstructions.length > 0 ? safeInstructions.map((step, index) => (
                            <div key={index} className="flex gap-4">
                                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex-shrink-0 mt-0.5">
                                    <span className="font-bold text-xs">{index + 1}</span>
                                </div>
                                <p className="text-text-secondary dark:text-gray-300 text-sm leading-relaxed pt-1">{step}</p>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-6 gap-3 text-center bg-white dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
                                <p className="text-sm text-gray-500 italic">O modo de preparo não foi gerado corretamente.</p>
                                <button 
                                    onClick={handleRegenerateDetails}
                                    disabled={isRecipeLoading}
                                    className="flex items-center gap-2 text-primary text-sm font-black hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    {isRecipeLoading ? (
                                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                                    ) : (
                                        <span className="material-symbols-outlined">auto_renew</span>
                                    )}
                                    {isRecipeLoading ? "Refazendo..." : "Tentar corrigir agora com IA"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {isRecipeLoading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center animate-fadeIn">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-primary/20 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="mt-6 text-primary text-lg font-black animate-pulse tracking-tight italic">
                            REESCREVENDO RECEITA...
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-2">Aguarde a finalização</p>
                    </div>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md border-t border-gray-200 dark:border-white/10 z-[110] pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <button 
                    onClick={handleAddRequest}
                    disabled={isAdding || isBroken || isRecipeLoading} 
                    className="w-full h-14 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                >
                    {isAdding ? (
                        <span className="material-symbols-outlined animate-spin">sync</span>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">
                                {hasActiveList ? 'add_shopping_cart' : 'playlist_add'}
                            </span>
                            {hasActiveList 
                                ? `Adicionar a ${currentMarketName || 'Minha Lista'}`
                                : 'Iniciar Nova Lista'
                            }
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
    );
};
