
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';

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

const SUGGESTED_TAGS = [
    'Bolo', 'Doce', 'Sobremesa', 'Pizza', 'Morango', 'Lanches', 
    'Carnes', 'Massas', 'Saudável', 'Vegano', 'Café da Manhã', 
    'Almoço Rápido', 'Drinks', 'Frango', 'Salada', 'Torta'
];

export const RecipeAssistant: React.FC<RecipeAssistantProps> = ({ onFetchDetails, isLoading, error, onClose }) => {
  const [recipeName, setRecipeName] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Rotating Placeholder Logic based on TAGS
  const [tagIndex, setTagIndex] = useState(0);

  useEffect(() => {
      const interval = setInterval(() => {
          setTagIndex(prev => (prev + 1) % SUGGESTED_TAGS.length);
      }, 3000); 

      return () => clearInterval(interval);
  }, []);

  const placeholderText = `Ex: ${SUGGESTED_TAGS[tagIndex]}`;

  const handleDiceClick = () => {
      const randomTag = SUGGESTED_TAGS[Math.floor(Math.random() * SUGGESTED_TAGS.length)];
      setRecipeName(randomTag);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = recipeName.trim();
    if (trimmedInput && !isLoading) {
      // Agora o processo é estritamente de consulta ao acervo
      onFetchDetails(trimmedInput);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
        <div className="relative flex w-full max-w-md flex-col overflow-visible rounded-xl bg-[#fcfaf8] dark:bg-background-dark shadow-2xl dark:shadow-primary/10 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            {/* Top App Bar - Identidade de Biblioteca/Acervo */}
            <div className="flex items-center bg-[#fcfaf8] dark:bg-background-dark p-4 pb-2 justify-between border-b border-[#e7dbcf] dark:border-primary/20 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center text-[#1b140d] dark:text-background-light">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400" style={{fontSize: '28px'}}>menu_book</span>
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-[#1b140d] dark:text-white">
                        Acervo Checklist<span className="text-blue-600 dark:text-blue-400">IA</span>
                    </h2>
                </div>
                <div className="flex items-center justify-end">
                    <button onClick={onClose} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#1b140d] dark:text-background-light transition-colors">
                        <span className="material-symbols-outlined" style={{fontSize: '24px'}}>close</span>
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="overflow-visible">
                <div className="p-4 pb-2">
                    <p className="pb-3 pt-1 text-center text-sm font-normal leading-normal text-[#1b140d] dark:text-gray-300">
                        Busque por pratos ou ingredientes em nossa base de dados inteligente.
                    </p>
                </div>

                <div className="flex max-w-full flex-col gap-4 px-4 py-3 relative" ref={wrapperRef}>
                    <label className="flex w-full flex-col">
                        <p className="pb-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">O que você procura?</p>
                        <div className="group flex w-full items-center rounded-xl border border-[#e7dbcf] dark:border-primary/50 focus-within:ring-2 focus-within:ring-primary/50 relative bg-[#fcfaf8] dark:bg-background-dark shadow-sm transition-all">
                            <span className="material-symbols-outlined absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none">search</span>
                            
                            <input 
                                className="form-input h-14 w-full resize-none overflow-hidden rounded-xl border-0 bg-transparent pl-12 pr-12 py-3 text-base font-normal leading-normal text-gray-900 dark:text-white placeholder:text-[#9a734c] dark:placeholder:text-gray-500 focus:outline-0 focus:ring-0 disabled:opacity-50" 
                                placeholder={placeholderText}
                                value={recipeName}
                                onChange={(e) => setRecipeName(e.target.value)}
                                disabled={isLoading}
                                autoComplete="off"
                            />
                            
                            {recipeName ? (
                                <button 
                                    type="button" 
                                    onClick={() => setRecipeName('')}
                                    className="absolute right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2"
                                >
                                    <span className="material-symbols-outlined" style={{fontSize: '20px'}}>cancel</span>
                                </button>
                            ) : (
                                <button 
                                    type="button" 
                                    onClick={handleDiceClick}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary/80 hover:text-primary dark:text-orange-400/80 dark:hover:text-orange-400 transition-all hover:bg-orange-50 dark:hover:bg-white/10 rounded-xl group"
                                    title="Dica aleatória"
                                >
                                    <span className="material-symbols-outlined transition-transform duration-700 ease-out group-hover:rotate-[360deg]" style={{fontSize: '24px'}}>
                                        casino
                                    </span>
                                </button>
                            )}
                        </div>
                    </label>
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
                            Pesquisando...
                            </>
                        ) : (
                            'Pesquisar'
                        )}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};
