import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

interface RecipeWithId extends FullRecipe {
    id: string;
}

interface AdminRecipesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminRecipesModal: React.FC<AdminRecipesModalProps> = ({ isOpen, onClose }) => {
    const { showToast } = useApp();
    const [recipes, setRecipes] = useState<RecipeWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isOpen || !db) return;

        setIsLoading(true);
        const q = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedRecipes: RecipeWithId[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as FullRecipe;
                if (data.name) {
                    loadedRecipes.push({ ...data, id: doc.id });
                }
            });
            setRecipes(loadedRecipes);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen]);

    const handleDelete = async (recipeId: string, recipeName: string) => {
        if (!recipeId) {
            showToast("Erro: ID da receita inválido.");
            return;
        }

        if (!window.confirm(`Tem certeza que deseja apagar a receita "${recipeName}" do acervo?`)) return;
        
        try {
            if (!db) throw new Error("Banco de dados não conectado");
            const docRef = doc(db, 'global_recipes', recipeId);
            await deleteDoc(docRef);
            showToast("Receita removida do acervo.");
        } catch (error: any) {
            console.error("Erro ao deletar:", error);
            if (error.code === 'permission-denied') {
                showToast("Erro: Sem permissão para apagar.");
            } else {
                showToast(`Erro ao deletar: ${error.message}`);
            }
        }
    };

    const handleAutoCleanup = async () => {
        const recipesToDelete = recipes.filter(r => !r.imageUrl);
        const count = recipesToDelete.length;

        if (count === 0) {
            showToast("O acervo já está limpo (todas as receitas têm foto).");
            return;
        }

        if (!window.confirm(`⚠️ LIMPEZA AUTOMÁTICA\n\nIsso apagará permanentemente ${count} receitas que não possuem foto.\n\nDeseja continuar?`)) {
            return;
        }

        try {
            if (!db) throw new Error("DB desconectado");
            const originalLoadingState = isLoading;
            if (!originalLoadingState) setIsLoading(true);

            const deletePromises = recipesToDelete.map(r => deleteDoc(doc(db, 'global_recipes', r.id)));
            await Promise.all(deletePromises);

            if (!originalLoadingState) setIsLoading(false);
            showToast(`${count} receitas sem foto foram removidas com sucesso.`);
        } catch (error: any) {
            setIsLoading(false);
            console.error("Erro na limpeza:", error);
            showToast(`Erro ao limpar: ${error.message}`);
        }
    };

    const filteredRecipes = recipes.filter(recipe => 
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-4xl bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-400">menu_book</span>
                            Acervo de Receitas
                        </h2>
                        <p className="text-xs text-slate-400">Gerencie as receitas geradas pela IA e suas fotos.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleAutoCleanup}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all text-xs font-bold"
                            title="Apagar todas as receitas sem imagem"
                        >
                            <span className="material-symbols-outlined text-base">cleaning_services</span>
                            <span className="hidden sm:inline">Limpar Sem Fotos</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar receita por nome..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <span className="material-symbols-outlined text-lg">cancel</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-black/20">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-gray-500">Carregando acervo...</p>
                        </div>
                    ) : filteredRecipes.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            {searchTerm ? (
                                <>
                                    <span className="material-symbols-outlined text-5xl mb-2 opacity-50">search_off</span>
                                    <p>Nenhuma receita encontrada para "{searchTerm}".</p>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-5xl mb-2 opacity-50">no_meals</span>
                                    <p>O acervo está vazio.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {filteredRecipes.map((recipe, idx) => (
                                <div key={recipe.id} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col group relative">
                                    <div className="aspect-square bg-gray-200 dark:bg-gray-800 relative group/image">
                                        {recipe.imageUrl ? (
                                            <img 
                                                src={recipe.imageUrl} 
                                                alt={recipe.name} 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                                <span className="material-symbols-outlined text-4xl">image_not_supported</span>
                                            </div>
                                        )}
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDelete(recipe.id, recipe.name);
                                            }}
                                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all z-30 cursor-pointer active:scale-95"
                                            title="Apagar Receita permanentemente"
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                        
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        
                                        {recipe.imageSource === 'cache' && (
                                            <div className="absolute bottom-2 right-2 bg-green-600/90 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm backdrop-blur-sm pointer-events-none">
                                                Salvo
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 flex flex-col flex-1">
                                        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 line-clamp-2 mb-1 leading-snug" title={recipe.name}>
                                            {recipe.name}
                                        </h3>
                                        <div className="mt-auto flex justify-between items-center text-[10px] text-gray-500">
                                            <span>{recipe.ingredients?.length || 0} ing.</span>
                                            <span>{recipe.prepTimeInMinutes} min</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 p-3 text-center text-xs text-gray-500 flex justify-between px-6">
                    <span>Total: <strong>{recipes.length}</strong></span>
                    <span>Exibindo: <strong>{filteredRecipes.length}</strong></span>
                </div>
            </div>
        </div>
    );
};