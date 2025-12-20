
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../firebase';
import { useApp, callGenAIWithRetry } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

interface RecipeWithId extends FullRecipe {
    id: string;
}

export const AdminRecipesModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast, generateKeywords } = useApp();
    const [recipes, setRecipes] = useState<RecipeWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !db) return;
        setIsLoading(true);
        const q = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedRecipes: RecipeWithId[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as FullRecipe;
                if (data.name) loadedRecipes.push({ ...data, id: doc.id });
            });
            setRecipes(loadedRecipes);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [isOpen]);

    const handleDelete = async (recipeId: string, recipeName: string) => {
        if (!window.confirm(`Apagar "${recipeName}"?`)) return;
        try {
            await deleteDoc(doc(db, 'global_recipes', recipeId));
            showToast("Removida.");
        } catch (error) { showToast("Erro ao deletar."); }
    };

    const handleSingleRecipeAITagging = async (recipe: RecipeWithId) => {
        if (processingId) return;
        
        setProcessingId(recipe.id);
        const apiKey = process.env.API_KEY as string;

        try {
            const ai = new GoogleGenAI({ apiKey });
            
            const result = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Analise a receita "${recipe.name}" e gere aproximadamente 20 etiquetas (tags) estratégicas divididas em: 
                1. Ingredientes principais, 2. Métodos de preparo (assado, frito, etc), 
                3. Ocasião (domingo, festa, etc), 4. Perfil de sabor/textura (cremoso, picante, etc).`,
                config: { 
                    systemInstruction: "Você é um assistente de banco de dados gastronômico. Sua ÚNICA função é gerar um array denso de etiquetas (tags) para o prato informado. PROIBIDO gerar receitas completas. Retorne apenas o JSON.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            tags: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: "Lista com aproximadamente 20 tags variadas e estratégicas."
                            }
                        },
                        required: ["tags"]
                    }
                }
            }));

            const data = JSON.parse(result.text || '{"tags":[]}');
            const suggestedTags: string[] = data.tags || [];
            
            if (db && suggestedTags.length > 0) {
                await updateDoc(doc(db, 'global_recipes', recipe.id), { 
                    tags: suggestedTags.map(t => t.toLowerCase()),
                    keywords: generateKeywords(recipe.name)
                });
                showToast(`Enriquecimento concluído! ${suggestedTags.length} etiquetas geradas.`);
            }
        } catch (err: any) {
            console.error(err);
            showToast("Erro na IA. Tente novamente.");
        } finally {
            setProcessingId(null);
        }
    };

    const processedRecipes = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        
        let filtered = recipes.filter(r => {
            const nameMatch = r.name.toLowerCase().includes(lowerSearch);
            const tagsMatch = r.tags?.some(tag => tag.toLowerCase().includes(lowerSearch));
            return nameMatch || tagsMatch;
        });

        // Ordenação: Itens com poucas tags primeiro para incentivar o enriquecimento
        return filtered.sort((a, b) => {
            const tagsA = a.tags?.length || 0;
            const tagsB = b.tags?.length || 0;
            return tagsA - tagsB; 
        });
    }, [recipes, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-5xl bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-400">menu_book</span>
                            Gestão de Acervo
                        </h2>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">IA Granular Tagging Engine</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-3 bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-gray-700 shrink-0 flex gap-4">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar por nome ou categoria (ex: morango, assado)..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm font-medium"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center text-[10px] font-bold text-gray-500 gap-4 px-2 uppercase shrink-0">
                        <span>Total: {recipes.length}</span>
                        <span className="text-blue-500 bg-blue-500/10 px-2 py-1 rounded">Média de Tags: {Math.round(recipes.reduce((acc, r) => acc + (r.tags?.length || 0), 0) / (recipes.length || 1))}</span>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-black/20">
                    {isLoading ? (
                        <div className="flex justify-center py-10"><span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {processedRecipes.map((recipe) => {
                                const isPoorlyTagged = !recipe.tags || recipe.tags.length < 10;
                                const isThisProcessing = processingId === recipe.id;

                                return (
                                    <div key={recipe.id} className={`bg-white dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden border transition-all flex flex-col group relative ${isPoorlyTagged ? 'border-orange-300 dark:border-orange-900 bg-orange-50/5' : 'border-gray-200 dark:border-gray-700'}`}>
                                        <div className="aspect-square bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
                                            {recipe.imageUrl ? <img src={recipe.imageUrl} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-4xl">image_not_supported</span></div>}
                                            
                                            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleDelete(recipe.id, recipe.name)} 
                                                    className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleSingleRecipeAITagging(recipe)} 
                                                    disabled={isThisProcessing}
                                                    className={`w-8 h-8 ${isThisProcessing ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90`}
                                                    title="Enriquecer com IA (Grid Mestre)"
                                                >
                                                    <span className={`material-symbols-outlined text-sm ${isThisProcessing ? 'animate-spin' : ''}`}>
                                                        {isThisProcessing ? 'sync' : 'auto_awesome'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3 flex flex-col flex-1">
                                            <h3 className="font-bold text-[11px] text-gray-800 dark:text-gray-200 line-clamp-2 mb-2 leading-tight uppercase">{recipe.name}</h3>
                                            <div className="mt-auto flex flex-wrap gap-1 max-h-12 overflow-hidden">
                                                {recipe.tags && recipe.tags.length > 0 ? (
                                                    recipe.tags.slice(0, 5).map((t, i) => (
                                                        <span key={i} className="bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[8px] px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 font-bold uppercase">{t}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-orange-500 text-[8px] font-black uppercase flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[10px]">warning</span>
                                                        Sem Tags
                                                    </span>
                                                )}
                                                {recipe.tags && recipe.tags.length > 5 && (
                                                    <span className="text-gray-400 text-[8px] font-bold">+{recipe.tags.length - 5}</span>
                                                )}
                                            </div>
                                            {isPoorlyTagged && (
                                                <span className="text-orange-500 text-[8px] font-black uppercase mt-1">● Requer Enriquecimento</span>
                                            )}
                                        </div>
                                        
                                        {isThisProcessing && (
                                            <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-[1px] flex items-center justify-center">
                                                <div className="bg-white dark:bg-slate-900 rounded-full p-2 shadow-xl border border-blue-500">
                                                    <span className="material-symbols-outlined animate-spin text-blue-500">psychology</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
