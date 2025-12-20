
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, limit, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../firebase';
import { useApp, callGenAIWithRetry } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

interface RecipeWithId extends FullRecipe {
    id: string;
}

// Lista local para referência de sincronização (deve ser igual à do AppContext)
const SYSTEM_RECIPES = [
    { name: "Omelete de Ervas", imageQuery: "omelete" },
    { name: "Macarrão Alho e Óleo", imageQuery: "espaguete" },
    { name: "Salada Tropical", imageQuery: "salada" },
    { name: "Smoothie de Morango", imageQuery: "smoothie" },
    { name: "Bolo de Caneca", imageQuery: "bolo" },
    { name: "Frango Grelhado", imageQuery: "frango" },
    { name: "Panqueca Americana", imageQuery: "pancakes" },
    { name: "Arroz Carreteiro", imageQuery: "arroz" }
];

export const AdminRecipesModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast, generateKeywords, getRandomCachedRecipe } = useApp();
    const [recipes, setRecipes] = useState<RecipeWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !db) return;
        setIsLoading(true);
        const q = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'), limit(500));
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
        if (!window.confirm(`Apagar "${recipeName}" permanentemente?`)) return;
        try {
            await deleteDoc(doc(db, 'global_recipes', recipeId));
            showToast("Receita removida do banco.");
        } catch (error) { showToast("Erro ao deletar."); }
    };

    // FUNÇÃO PARA TRAZER RECEITAS DO SISTEMA PARA O BANCO
    const handleSyncSystemRecipes = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        showToast("Sincronizando receitas do sistema...");
        
        let importedCount = 0;
        try {
            for (const sysRecipe of SYSTEM_RECIPES) {
                const docId = sysRecipe.name.trim().toLowerCase().replace(/[\/\s]+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);
                const docRef = doc(db!, 'global_recipes', docId);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    // Se não existe no banco, busca uma "versão completa" para salvar
                    const fullData = SYSTEM_RECIPES.find(r => r.name === sysRecipe.name);
                    // Como não queremos duplicar a lista SURVIVAL aqui, pegamos o que temos no contexto
                    const contextRecipe = recipes.find(r => r.name === sysRecipe.name);
                    
                    if (!contextRecipe) {
                        // Se nem no banco nem no carregamento atual existe, salvamos o esqueleto
                        await setDoc(docRef, {
                            name: sysRecipe.name,
                            ingredients: [],
                            instructions: [],
                            imageQuery: sysRecipe.imageQuery,
                            createdAt: serverTimestamp(),
                            imageSource: 'system_import',
                            tags: ['sistema', 'importado']
                        });
                        importedCount++;
                    }
                }
            }
            showToast(`${importedCount} novas receitas migradas para o seu acervo!`);
        } catch (error) {
            console.error(error);
            showToast("Erro na sincronização.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSingleRecipeAITagging = async (recipe: RecipeWithId) => {
        if (processingId) return;
        setProcessingId(recipe.id);
        const apiKey = process.env.API_KEY as string;
        try {
            const ai = new GoogleGenAI({ apiKey });
            const result = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Analise a receita "${recipe.name}" e gere aproximadamente 20 etiquetas (tags) estratégicas divididas em: 1. Ingredientes principais, 2. Métodos de preparo, 3. Ocasião, 4. Perfil de sabor.`,
                config: { 
                    systemInstruction: "Retorne apenas o JSON.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
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
                showToast(`Enriquecimento concluído!`);
            }
        } catch (err) { showToast("Erro na IA."); } finally { setProcessingId(null); }
    };

    const processedRecipes = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return recipes.filter(r => 
            r.name.toLowerCase().includes(lowerSearch) || 
            r.tags?.some(tag => tag.toLowerCase().includes(lowerSearch))
        ).sort((a, b) => (a.tags?.length || 0) - (b.tags?.length || 0));
    }, [recipes, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative w-full max-w-5xl bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-400">menu_book</span>
                            Gestão de Acervo
                        </h2>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Base de Dados Firestore</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleSyncSystemRecipes}
                            disabled={isSyncing}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase transition-all shadow-lg disabled:opacity-50"
                        >
                            <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                            {isSyncing ? 'Sincronizando...' : 'Importar Receitas do Sistema'}
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
                            placeholder="Buscar no acervo..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-black/20">
                    {isLoading ? (
                        <div className="flex justify-center py-10"><span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {processedRecipes.map((recipe) => (
                                <div key={recipe.id} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col group relative">
                                    <div className="aspect-square bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
                                        {recipe.imageUrl ? <img src={recipe.imageUrl} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-4xl">image</span></div>}
                                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDelete(recipe.id, recipe.name)} className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-sm">delete</span></button>
                                            <button onClick={() => handleSingleRecipeAITagging(recipe)} className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-sm">auto_awesome</span></button>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-bold text-[10px] text-gray-800 dark:text-gray-200 line-clamp-2 uppercase">{recipe.name}</h3>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {recipe.tags?.slice(0, 3).map((t, i) => (
                                                <span key={i} className="text-[8px] bg-gray-100 dark:bg-white/5 px-1 rounded uppercase font-bold text-gray-500">{t}</span>
                                            ))}
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
