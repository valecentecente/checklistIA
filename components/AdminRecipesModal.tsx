import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, limit, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useApp } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

interface RecipeWithId extends FullRecipe {
    id: string;
    isBroken: boolean;
}

const ignorePermissionError = (err: any) => {
    return err.code === 'permission-denied' || (err.message && err.message.includes('Missing or insufficient permissions'));
};

export const AdminRecipesModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast, isAdmin } = useApp();
    const [recipes, setRecipes] = useState<RecipeWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [permissionWarning, setPermissionWarning] = useState(false);
    
    const [editingRecipe, setEditingRecipe] = useState<RecipeWithId | null>(null);

    const checkRecipeIntegrity = (r: FullRecipe): boolean => {
        return !!(
            r.imageUrl && 
            r.imageUrl.length > 50 &&
            r.ingredients && r.ingredients.length > 0 &&
            r.instructions && r.instructions.length > 0 &&
            r.tags && r.tags.length > 0 &&
            r.suggestedLeads && r.suggestedLeads.length > 0
        );
    };

    useEffect(() => {
        if (!isOpen || !db || !auth?.currentUser || !isAdmin) {
            if (isOpen && !isAdmin) {
                setPermissionWarning(true);
                setIsLoading(false);
            }
            return;
        }
        
        setIsLoading(true);
        setPermissionWarning(false);
        const q = query(collection(db, 'global_recipes'), limit(2000));
        
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const loadedRecipes: RecipeWithId[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data() as FullRecipe;
                    if (data.name) {
                        loadedRecipes.push({ 
                            ...data, 
                            id: doc.id,
                            isBroken: !checkRecipeIntegrity(data)
                        });
                    }
                });
                
                // ORDENAÇÃO: Saudáveis primeiro (por data), Quebradas por último
                loadedRecipes.sort((a, b) => {
                    if (a.isBroken && !b.isBroken) return 1;
                    if (!a.isBroken && b.isBroken) return -1;
                    
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });
                
                setRecipes(loadedRecipes);
                setIsLoading(false);
            }, 
            (error) => {
                if (ignorePermissionError(error)) {
                    setPermissionWarning(true);
                } else {
                    console.error("[Admin] Erro Acervo:", error.message);
                }
                setIsLoading(false);
            }
        );
        return () => unsubscribe();
    }, [isOpen, isAdmin]);

    const handleOpenEdit = (recipe: RecipeWithId) => {
        setEditingRecipe(recipe);
    };

    const handleDelete = async (recipeId: string, recipeName: string) => {
        if (!window.confirm(`Apagar "${recipeName}" do acervo global?`)) return;
        try {
            await deleteDoc(doc(db!, 'global_recipes', recipeId));
            showToast("Removido com sucesso.");
        } catch (e) {
            showToast("Erro ao deletar.");
        }
    };

    const processedRecipes = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase().trim();
        if (!lowerSearch) return recipes;
        return recipes.filter(r => 
            (r.name && r.name.toLowerCase().includes(lowerSearch)) || 
            (r.tags && r.tags.some(tag => tag.toLowerCase().includes(lowerSearch)))
        );
    }, [recipes, searchTerm]);

    const brokenCount = useMemo(() => recipes.filter(r => r.isBroken).length, [recipes]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-6xl bg-[#0f172a] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-white/10" onClick={e => e.stopPropagation()}>
                
                {/* Header Dinâmico */}
                <div className="p-6 bg-slate-800 border-b border-white/5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shadow-inner">
                            <span className="material-symbols-outlined text-3xl">menu_book</span>
                        </div>
                        <div>
                            <h2 className="text-white font-black text-xl uppercase italic tracking-tighter">Acervo Global</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total: {recipes.length}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-600"></span>
                                <span className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Para Ajustar: {brokenCount}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 bg-slate-900 border-b border-white/5 shrink-0 flex gap-4">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                        <input 
                            type="text" 
                            placeholder="Pesquisar por nome ou tag..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-14 bg-slate-800 border-white/5 rounded-2xl pl-12 pr-4 text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    {/* Botão de Filtro Rápido (Opcional, mas útil) */}
                    <button 
                        onClick={() => setSearchTerm(searchTerm === 'incompleta' ? '' : 'incompleta')}
                        className={`px-6 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border shrink-0 flex items-center gap-2 ${searchTerm === 'incompleta' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-red-500 border-red-500/30'}`}
                    >
                        <span className="material-symbols-outlined text-base">emergency_home</span>
                        Ver Pendências
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-slate-950/30">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                            <div className="h-10 w-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Sincronizando Banco...</p>
                        </div>
                    ) : permissionWarning ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-10">
                            <span className="material-symbols-outlined text-6xl mb-4 text-red-500/50">gpp_maybe</span>
                            <p className="text-white font-bold mb-2">Permissão Negada</p>
                            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg">Relogar</button>
                        </div>
                    ) : processedRecipes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600">
                            <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
                            <p className="font-bold uppercase tracking-widest text-xs">Nada encontrado.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-fadeIn">
                            {processedRecipes.map((recipe) => (
                                <div 
                                    key={recipe.id} 
                                    className={`rounded-3xl overflow-hidden border transition-all flex flex-col relative shadow-xl min-h-[220px] group ${
                                        recipe.isBroken 
                                        ? 'bg-red-500/5 border-red-500/40 hover:border-red-500/70 shadow-red-900/10' 
                                        : 'bg-slate-800 border-white/5 hover:border-blue-500/50'
                                    }`}
                                >
                                    <div className="aspect-square w-full bg-slate-900 relative overflow-hidden shrink-0">
                                        {recipe.imageUrl ? (
                                            <img src={recipe.imageUrl} className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${recipe.isBroken ? 'grayscale' : ''}`} />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                                                <span className="material-symbols-outlined text-4xl">no_photography</span>
                                            </div>
                                        )}
                                        
                                        {recipe.isBroken && (
                                            <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">
                                                Incompleta
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                            <button onClick={() => handleOpenEdit(recipe)} className="h-10 w-10 bg-white text-slate-900 rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg"><span className="material-symbols-outlined">edit</span></button>
                                            <button onClick={() => handleDelete(recipe.id, recipe.name)} className="h-10 w-10 bg-red-600 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg"><span className="material-symbols-outlined">delete</span></button>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                        <h3 className={`font-black uppercase text-[11px] truncate mb-2 ${recipe.isBroken ? 'text-red-200' : 'text-white'}`}>
                                            {recipe.name}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[9px] font-black uppercase ${recipe.isBroken ? 'text-red-400' : 'text-slate-500'}`}>
                                                {recipe.difficulty}
                                            </span>
                                            <span className={`text-[9px] font-black ${recipe.isBroken ? 'text-red-400' : 'text-blue-400'}`}>
                                                {recipe.prepTimeInMinutes}M
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-900 border-t border-white/5 flex justify-between items-center px-8 shrink-0">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">ChecklistIA Health Monitor v3.1</p>
                </div>
            </div>
        </div>
    );
};