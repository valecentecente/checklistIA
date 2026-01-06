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
  const isFromCache = recipe.imageSource === 'cache';
  const isSaved = isFavorite(recipe.name);
  
  const isAdultContent = useMemo(() => {
      if (recipe.isAlcoholic) return true;
      if (recipe.tags && recipe.tags.length > 0) {
          const adultTags = ['drinks', 'drink', 'alcool', 'álcool', 'bebida alcoólica', 'coquetel', 'coquetéis', 'cocktail', 'cocktails', 'vodka', 'gin', 'whisky', 'cerveja', 'vinho', 'vinhos', 'espumante', 'tequila', 'cachaça', 'cachaca'];
          if (recipe.tags.some(t => adultTags.includes(t.toLowerCase()))) return true;
      }
      const nameLower = recipe.name.toLowerCase();
      const adultKeywords = ['caipirinha', 'gin tônica', 'mojito', 'margarita', 'negroni', 'aperol', 'drink', 'coquetel', 'cocktail', 'batida alcoólica', 'cerveja', 'vinho', 'vodka', 'whisky', 'cachaça', 'cachaca', 'espumante', 'chopp', 'tequila'];
      return adultKeywords.some(keyword => nameLower.includes(keyword));
  }, [recipe]);
  
  const randomChefImage = useMemo(() => {
      const randomIndex = Math.floor(Math.random() * CHEF_PLACEHOLDERS.length);
      return CHEF_PLACEHOLDERS[randomIndex];
  }, []);

  const hasActiveList = items.length > 0 || !!currentMarketName;
  const safeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const safeInstructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];
  
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

  const renderTimeClocks = (min: number) => {
    let active = 1;
    if (min > 60) active = 3;
    else if (min > 30) active = 2;

    return (
        <div className="flex gap-0.5 items-center">
            {[1, 2, 3].map(i => (
                <span key={i} className={`material-symbols-outlined text-[18px] ${i <= active ? 'text-primary font-variation-FILL-1' : 'text-gray-200 dark:text-white/10'}`} style={i <= active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    schedule
                </span>
            ))}
        </div>
    );
  };

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
      if (!user) { onClose(); return; }
      await toggleFavorite(recipe);
  };

  const handleRegenerateDetails = async () => {
      await fetchRecipeDetails(recipe.name, undefined, false);
  };

  const getIngredientText = (ing: any) => {
      if (typeof ing === 'string') return ing;
      if (typeof ing === 'object' && ing !== null) {
          return ing.detailedName || ing.display || ing.name || ing.simplifiedName || 'Ingrediente';
      }
      return 'Ingrediente';
  };

  const relatedOffers = useMemo(() => {
      if (!offers || offers.length === 0) return [];
      const leads = (recipe.suggestedLeads || []).map(l => l.toLowerCase().trim()).filter(l => l !== 'nenhum');
      const fullText = (recipe.name + ' ' + safeIngredients.map((i: any) => getIngredientText(i)).join(' ') + ' ' + safeInstructions.join(' ')).toLowerCase();
      return offers.filter(offer => {
          const offerName = offer.name.toLowerCase();
          const offerTags = (offer.tags || []).map(t => t.toLowerCase().trim());
          const matchesLead = leads.some(lead => offerTags.includes(lead) || offerName.includes(lead));
          if (matchesLead) return true;
          const firstKeyword = offer.name.trim().split(' ')[0].toLowerCase();
          if (firstKeyword.length >= 4 && fullText.includes(firstKeyword)) return true;
          return false;
      }).sort(() => Math.random() - 0.5).slice(0, 8);
  }, [offers, recipe, safeIngredients, safeInstructions]);

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full flex-col justify-center items-center bg-black/80 z-[999] animate-fadeIn backdrop-blur-md p-0 sm:p-4" onClick={onClose}>
        <div className="flex flex-col items-stretch bg-[#F7F7F7] dark:bg-[#1a1a1a] rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-sm max-h-[96dvh] sm:mb-4 animate-slideUp overflow-hidden relative shadow-[0_35px_60px_-15px_rgba(0,0,0,0.9)] border border-white/5" onClick={(e) => e.stopPropagation()}>
            
            <div className="flex-shrink-0 absolute top-0 left-0 right-0 z-[100] flex justify-center pt-4 pb-1 pointer-events-none">
                <div className="h-1.5 w-14 rounded-full bg-white/30 backdrop-blur-md"></div>
            </div>

            <button onClick={onClose} className="absolute top-6 right-6 z-[100] flex items-center justify-center h-10 w-10 bg-black/40 rounded-full text-white backdrop-blur-md hover:bg-black/60 transition-all active:scale-90">
                <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex-1 overflow-y-auto pb-[calc(100px+env(safe-area-inset-bottom))] scrollbar-hide relative">
                
                <div className="relative w-full aspect-[4/5] flex-shrink-0 overflow-hidden bg-gray-200 dark:bg-gray-800">
                    <div 
                        className={`absolute inset-0 bg-center bg-no-repeat bg-cover transition-opacity duration-1000 ${imageUrl ? 'opacity-100' : 'opacity-0'}`}
                        style={{backgroundImage: imageUrl ? `url(${imageUrl})` : 'none'}}
                    ></div>

                    {(!imageUrl || isRecipeLoading) && (
                        <div className="absolute inset-0 z-10">
                            <div className="absolute inset-0 bg-center bg-cover filter blur-[2px] scale-110 opacity-60" style={{backgroundImage: `url(${randomChefImage})`}}></div>
                            <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center text-white gap-3 p-6 text-center">
                                <div className="bg-white/20 p-5 rounded-full backdrop-blur-md animate-pulse shadow-xl">
                                    <span className="material-symbols-outlined text-5xl">restaurant_menu</span>
                                </div>
                                <div className="animate-fadeIn">
                                    <p className="font-black text-2xl drop-shadow-2xl italic tracking-tighter uppercase">Chef IA Ativo...</p>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 mt-2">Renderizando alta gastronomia</p>
                                </div>
                            </div>
                        </div>
                    )}
                     
                     <div className="absolute top-6 left-6 z-[110] flex flex-col gap-2 items-start pointer-events-none">
                         {imageUrl && isFromCache && !isRecipeLoading && (
                             <div className="animate-fadeIn flex items-center gap-1.5 select-none bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 shadow-xl">
                                 <span className="material-symbols-outlined text-[14px] text-orange-400">image</span>
                                 <span className="text-[10px] font-black uppercase tracking-[0.1em] font-sans leading-none pt-[1px]">
                                    <span className="text-white">Checklist</span><span className="text-blue-500 ml-0.5">IA</span>
                                 </span>
                             </div>
                         )}
                         
                         {isAdultContent && (
                             <div className="animate-bounce-y flex items-center gap-1.5 select-none bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-lg border border-white/20">
                                 <span className="text-xs font-black uppercase tracking-wider leading-none">🔞 +18</span>
                             </div>
                         )}
                     </div>
                     
                     <div className="absolute bottom-10 right-6 z-[90]">
                         <button 
                             onClick={handleToggleFavorite}
                             className={`flex items-center justify-center h-14 w-14 rounded-full shadow-2xl transition-all active:scale-90 ${isSaved ? 'bg-red-500 text-white' : 'bg-white/90 dark:bg-black/60 text-gray-500 dark:text-gray-300 backdrop-blur-md border border-white/20'}`}
                         >
                             <span className={`material-symbols-outlined text-3xl ${isSaved ? 'font-variation-FILL-1' : ''}`} style={ isSaved ? { fontVariationSettings: "'FILL' 1" } : {} }>favorite</span>
                         </button>
                     </div>
                     
                     <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F7F7F7] dark:from-[#1a1a1a] to-transparent pointer-events-none z-10"></div>
                </div>

                <div className="relative px-6 -mt-12 z-20">
                     <h1 className="text-text-primary-light dark:text-gray-50 tracking-tight text-[32px] font-black leading-[0.9] font-display uppercase italic drop-shadow-md pr-12">{recipe.name}</h1>
                </div>
                
                <div className="flex gap-2 p-6 pt-5 flex-wrap items-center">
                    <div className="flex h-9 shrink-0 items-center justify-center gap-x-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 px-3 shadow-sm">
                         <span className="material-symbols-outlined text-sm text-blue-600 dark:text-blue-400 font-black">verified</span>
                         <p className="text-blue-600 dark:text-blue-400 text-xs font-black">ESTELAR</p>
                    </div>

                    <div className="flex h-9 shrink-0 items-center justify-center gap-x-1 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 px-3 shadow-sm">
                         <p className="text-green-600 dark:text-green-400 text-xs font-black tracking-widest">{costSymbols}</p>
                    </div>

                    <div className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 shadow-sm">
                        {renderTimeClocks(recipe.prepTimeInMinutes)}
                    </div>
                </div>

                <div className="px-6 space-y-8">
                    {/* INGREDIENTES */}
                    <div className="space-y-3">
                        <h3 className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="h-px w-4 bg-gray-300 dark:bg-gray-700"></span>
                            Ingredientes Necessários
                        </h3>
                        <div className="flex flex-col gap-3 p-5 rounded-3xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-inner">
                            {safeIngredients.length > 0 ? safeIngredients.map((ingredient: any, idx) => (
                                <div key={idx} className="flex items-start gap-3 animate-fadeIn group">
                                    <span className="material-symbols-outlined text-primary text-lg mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity">radio_button_checked</span>
                                    <span className="text-text-primary-light dark:text-gray-200 text-sm font-bold leading-relaxed">
                                        {getIngredientText(ingredient)}
                                    </span>
                                </div>
                            )) : (
                                <button onClick={handleRegenerateDetails} className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 text-xs font-black uppercase tracking-widest">Mapear com IA</button>
                            )}
                        </div>
                    </div>

                    {relatedOffers.length > 0 && (
                        <div className="space-y-3 animate-fadeIn">
                            <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="h-px w-4 bg-orange-200 dark:bg-orange-900/40"></span>
                                Achadinhos Recomendados
                            </h3>
                            <div className="flex overflow-x-auto gap-3 pb-2 pt-1 scrollbar-hide snap-x">
                                {relatedOffers.map((offer) => (
                                    <a key={offer.id} href={offer.link} target="_blank" rel="noopener noreferrer" className="snap-center shrink-0 w-36 flex flex-col bg-white dark:bg-surface-dark rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 overflow-hidden group active:scale-95 transition-all">
                                        <div className="aspect-square w-full bg-white p-3 flex items-center justify-center relative"><img src={offer.image} className="max-w-full max-h-full object-contain mix-blend-multiply" /></div>
                                        <div className="p-3 flex flex-col flex-1 bg-gray-50/50 dark:bg-black/20">
                                            <h4 className="text-[10px] font-bold text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight mb-1">{offer.name}</h4>
                                            <span className="text-xs font-black text-green-600 mt-auto">{offer.price}</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PREPARO */}
                    <div className="space-y-3 pb-10">
                        <h3 className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="h-px w-4 bg-gray-300 dark:bg-gray-700"></span>
                            Modo de Execução
                        </h3>
                        <div className="flex flex-col gap-6">
                            {safeInstructions.map((step, index) => (
                                <div key={index} className="flex gap-4 animate-fadeIn">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-primary text-white font-black text-sm shrink-0 shadow-lg shadow-primary/20">{index + 1}</div>
                                    <p className="text-text-secondary-light dark:text-gray-300 text-sm font-medium leading-relaxed pt-1">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {isRecipeLoading && (
                    <div className="absolute inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center animate-fadeIn">
                        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="mt-8 text-primary text-xl font-black animate-pulse tracking-tighter italic uppercase">Reescrevendo...</p>
                    </div>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/5 z-[110] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <button 
                    onClick={handleAddRequest}
                    disabled={isAdding || isBroken || isRecipeLoading} 
                    className="w-full h-16 bg-primary hover:bg-primary-hover text-white rounded-[1.5rem] font-black text-lg shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                    {isAdding ? <span className="material-symbols-outlined animate-spin">sync</span> : (
                        <>
                            <span className="material-symbols-outlined !text-3xl">{hasActiveList ? 'add_shopping_cart' : 'playlist_add'}</span>
                            <span className="italic uppercase tracking-tighter">
                                {hasActiveList ? `Levar para ${currentMarketName || 'Lista'}` : 'Iniciar Nova Lista'}
                            </span>
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
};