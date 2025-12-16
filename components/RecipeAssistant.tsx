
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

interface RecipeAssistantProps {
  onFetchDetails: (recipeName: string) => void;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white dark:text-background-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const RecipeAssistant: React.FC<RecipeAssistantProps> = ({ onFetchDetails, isLoading, error, onClose }) => {
  const { searchGlobalRecipes, handleRecipeImageGenerated, setFullRecipes, setSelectedRecipe, getRandomCachedRecipe, handleRecipeSearch } = useApp();
  const [recipeName, setRecipeName] = useState('');
  
  // Autocomplete States
  const [suggestions, setSuggestions] = useState<FullRecipe[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Rotating Placeholder Logic
  const [currentSuggestion, setCurrentSuggestion] = useState<FullRecipe | null>(null);
  const [placeholderText, setPlaceholderText] = useState("Ex: Lasanha à bolonhesa");

  useEffect(() => {
      const initial = getRandomCachedRecipe();
      if (initial) {
          setCurrentSuggestion(initial);
          setPlaceholderText(`Ex: ${initial.name}`);
      }

      const interval = setInterval(() => {
          const next = getRandomCachedRecipe();
          if (next) {
              setCurrentSuggestion(next);
              setPlaceholderText(`Ex: ${next.name}`);
          }
      }, 4000); 

      return () => clearInterval(interval);
  }, [getRandomCachedRecipe]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
              setShowSuggestions(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
      const timer = setTimeout(async () => {
          if (recipeName.length >= 3) {
              setIsSearching(true);
              const results = await searchGlobalRecipes(recipeName);
              setSuggestions(results);
              setShowSuggestions(results.length > 0);
              setIsSearching(false);
          } else {
              setSuggestions([]);
              setShowSuggestions(false);
          }
      }, 300); 

      return () => clearTimeout(timer);
  }, [recipeName, searchGlobalRecipes]);

  const handleSuggestionClick = (recipe: FullRecipe) => {
      setFullRecipes(prev => ({...prev, [recipe.name]: recipe}));
      setSelectedRecipe(recipe);
      onClose();
  };

  const handleDiceClick = () => {
      if (currentSuggestion) {
          setRecipeName(currentSuggestion.name);
          handleSuggestionClick(currentSuggestion);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = recipeName.trim();

    if (trimmedInput && !isLoading) {
      // --- MUDANÇA CRÍTICA: AGORA CHAMA O FLUXO DA VITRINE PRIMEIRO ---
      await handleRecipeSearch(trimmedInput);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
        <div className="relative flex w-full max-w-md flex-col overflow-visible rounded-xl bg-[#fcfaf8] dark:bg-background-dark shadow-2xl dark:shadow-primary/10 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            {/* Top App Bar */}
            <div className="flex items-center bg-[#fcfaf8] dark:bg-background-dark p-4 pb-2 justify-between border-b border-[#e7dbcf] dark:border-primary/20 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center text-[#1b140d] dark:text-background-light">
                        <span className="material-symbols-outlined text-primary" style={{fontSize: '28px'}}>auto_awesome</span>
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-[#1b140d] dark:text-white">
                        Receitas <span className="text-blue-600 dark:text-blue-400">IA</span>
                    </h2>
                </div>
                <div className="flex items-center justify-end">
                    <button onClick={onClose} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#1b140d] dark:text-background-light transition-colors">
                        <span className="material-symbols-outlined" style={{fontSize: '24px'}}>close</span>
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="overflow-visible">
                {/* Body Text */}
                <div className="p-4 pb-2">
                    <p className="pb-3 pt-1 text-center text-base font-normal leading-normal text-[#1b140d] dark:text-gray-300">
                        Digite o nome do prato, e nós buscamos no acervo ou criamos para você.
                    </p>
                </div>

                {/* Input Area with Autocomplete */}
                <div className="flex max-w-full flex-col gap-4 px-4 py-3 relative" ref={wrapperRef}>
                    <label className="flex w-full flex-col">
                        <p className="pb-2 text-base font-medium leading-normal text-[#1b140d] dark:text-gray-300">Nome do prato</p>
                        <div className="group flex w-full items-center rounded-xl border border-[#e7dbcf] dark:border-primary/50 focus-within:ring-2 focus-within:ring-primary/50 relative bg-[#fcfaf8] dark:bg-background-dark shadow-sm transition-all">
                            {/* Search Icon */}
                            <span className="material-symbols-outlined absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none">search</span>
                            
                            <input 
                                className="form-input h-14 w-full resize-none overflow-hidden rounded-xl border-0 bg-transparent pl-12 pr-12 py-3 text-base font-normal leading-normal text-gray-900 dark:text-white placeholder:text-[#9a734c] dark:placeholder:text-gray-500 focus:outline-0 focus:ring-0 disabled:opacity-50" 
                                placeholder={placeholderText}
                                value={recipeName}
                                onChange={(e) => {
                                    setRecipeName(e.target.value);
                                    if (e.target.value.length < 3) setShowSuggestions(false);
                                }}
                                disabled={isLoading}
                                autoComplete="off"
                            />
                            
                            {/* Loading Indicator for Search */}
                            {isSearching ? (
                                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                    <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            ) : (
                                recipeName ? (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setRecipeName('');
                                            setShowSuggestions(false);
                                        }}
                                        className="absolute right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2"
                                    >
                                        <span className="material-symbols-outlined" style={{fontSize: '20px'}}>cancel</span>
                                    </button>
                                ) : (
                                    <button 
                                        type="button" 
                                        onClick={handleDiceClick}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary/80 hover:text-primary dark:text-orange-400/80 dark:hover:text-orange-400 transition-all hover:bg-orange-50 dark:hover:bg-white/10 rounded-xl group"
                                        title="Estou com sorte: Usar sugestão"
                                    >
                                        <span className="material-symbols-outlined transition-transform duration-700 ease-out group-hover:rotate-[360deg]" style={{fontSize: '24px'}}>
                                            casino
                                        </span>
                                    </button>
                                )
                            )}
                        </div>
                    </label>

                    {/* SUGGESTIONS DROPDOWN */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-4 right-4 mt-1 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-[150] overflow-hidden animate-slideUp">
                            <div className="bg-gray-50 dark:bg-white/5 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">inventory_2</span>
                                    IA preparou estas
                                </p>
                            </div>
                            <ul className="max-h-60 overflow-y-auto">
                                {suggestions.map((recipe, index) => (
                                    <li key={index}>
                                        <button
                                            type="button"
                                            onClick={() => handleSuggestionClick(recipe)}
                                            className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-white/10 transition-colors flex items-center gap-3 group"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-black/20 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                                                {recipe.imageUrl ? (
                                                    <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-gray-400 text-xl">restaurant</span>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate group-hover:text-primary transition-colors">
                                                    {recipe.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {recipe.ingredients?.length || 0} ingredientes • {recipe.prepTimeInMinutes || 30} min
                                                </p>
                                            </div>
                                            
                                            <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors text-lg">
                                                arrow_forward_ios
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                
                {error && (
                    <div className="px-4 pb-2">
                        <p className="text-sm text-center text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800/50 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 p-4 pt-2">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex h-14 w-full items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 px-6 text-base font-bold text-text-secondary-light dark:text-text-secondary-dark shadow-sm transition-colors hover:bg-gray-200 dark:hover:bg-white/20"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        disabled={isLoading || !recipeName.trim()}
                        className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 text-base font-bold leading-normal tracking-[0.015em] text-white transition-colors duration-200 hover:bg-primary/90 active:bg-primary/80 dark:text-background-dark disabled:bg-primary/50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isLoading ? (
                            <>
                            <LoadingSpinner />
                            Buscando...
                            </>
                        ) : (
                            'Continuar'
                        )}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};
