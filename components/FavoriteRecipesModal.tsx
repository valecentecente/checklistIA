
import React from 'react';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useApp } from '../contexts/AppContext';

interface FavoriteRecipesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FavoriteRecipesModal: React.FC<FavoriteRecipesModalProps> = ({ isOpen, onClose }) => {
    const { favorites, toggleFavorite } = useShoppingList();
    const { showRecipe } = useApp();

    if (!isOpen) return null;

    const handleRecipeClick = (name: string) => {
        showRecipe(name);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[140] bg-black/60 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="relative w-full max-w-md flex-col overflow-hidden rounded-2xl bg-background-light dark:bg-surface-dark shadow-2xl animate-slideUp max-h-[80vh] flex" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-surface-dark">
                    <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500 font-variation-FILL-1" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        Receitas Favoritas
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-black/20">
                    {favorites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-5xl mb-3 opacity-50">favorite_border</span>
                            <p className="font-medium">Nenhuma receita salva ainda.</p>
                            <p className="text-xs mt-1">Marque o coração nas receitas para vê-las aqui.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {favorites.map((recipe, index) => (
                                <div key={index} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group">
                                    <div 
                                        className="h-32 w-full bg-cover bg-center relative cursor-pointer"
                                        style={{ backgroundImage: recipe.imageUrl ? `url(${recipe.imageUrl})` : 'none', backgroundColor: '#eee' }}
                                        onClick={() => handleRecipeClick(recipe.name)}
                                    >
                                        {!recipe.imageUrl && (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                                <span className="material-symbols-outlined text-3xl">restaurant</span>
                                            </div>
                                        )}
                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                                        
                                        {/* Remove Button */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe); }}
                                            className="absolute top-2 right-2 h-8 w-8 bg-black/40 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                                            title="Remover"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                    <div 
                                        className="p-3 cursor-pointer"
                                        onClick={() => handleRecipeClick(recipe.name)}
                                    >
                                        <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark line-clamp-1 mb-1">{recipe.name}</h3>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                                            {recipe.prepTimeInMinutes > 0 && (
                                                <span className="flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-[12px]">schedule</span> {recipe.prepTimeInMinutes}m
                                                </span>
                                            )}
                                            {recipe.difficulty && <span>• {recipe.difficulty}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
