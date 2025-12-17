
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { db } from '../firebase';
import { useApp, callGenAIWithRetry } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

interface RecipeWithId extends FullRecipe {
    id: string;
}

export const AdminRecipesModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast } = useApp();
    const [recipes, setRecipes] = useState<RecipeWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Tagging Manual
    const [taggingId, setTaggingId] = useState<string | null>(null);
    const [newTags, setNewTags] = useState('');

    // IA Enrichment State
    const [isEnriching, setIsEnriching] = useState(false);
    const [enrichProgress, setEnrichProgress] = useState(0);
    const [enrichLogs, setEnrichLogs] = useState<string[]>([]);
    const [shouldStopEnrich, setShouldStopEnrich] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [enrichLogs]);

    const handleDelete = async (recipeId: string, recipeName: string) => {
        if (!window.confirm(`Apagar "${recipeName}"?`)) return;
        try {
            await deleteDoc(doc(db, 'global_recipes', recipeId));
            showToast("Removida.");
        } catch (error) { showToast("Erro ao deletar."); }
    };

    const handleSaveTags = async (recipeId: string) => {
        if (!db) return;
        try {
            const tagsArray = newTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '');
            await updateDoc(doc(db, 'global_recipes', recipeId), { tags: tagsArray });
            showToast("Tags salvas!");
            setTaggingId(null);
        } catch (error) { showToast("Erro."); }
    };

    // --- LÓGICA DE ENRIQUECIMENTO COM IA ---
    const startEnrichment = async () => {
        const apiKey = process.env.API_KEY as string;
        if (!apiKey) return;

        // Filtra apenas receitas que precisam de tags (menos de 2 tags)
        const targets = recipes.filter(r => !r.tags || r.tags.length < 2);
        
        if (targets.length === 0) {
            showToast("Tudo certo! Todas as receitas já possuem tags inteligentes.");
            return;
        }

        if (!window.confirm(`Deseja analisar e gerar tags para ${targets.length} receitas usando IA?`)) return;

        setIsEnriching(true);
        setShouldStopEnrich(false);
        setEnrichLogs(["Iniciando análise de acervo..."]);
        setEnrichProgress(0);

        const ai = new GoogleGenAI({ apiKey });

        for (let i = 0; i < targets.length; i++) {
            if (shouldStopEnrich) break;

            const r = targets[i];
            setEnrichLogs(prev => [...prev, `[${i+1}/${targets.length}] Analisando: ${r.name}...`]);

            try {
                const ingredientsText = r.ingredients?.map(ing => ing.detailedName).join(', ') || '';
                const prompt = `Baseado no prato "${r.name}" e seus ingredientes [${ingredientsText}], sugira exatamente 4 tags curtas e categóricas para organização. Retorne apenas um JSON array de strings. Ex: ["doce", "brasileira", "chocolate", "sobremesa"]`;

                const result = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                    config: { responseMimeType: "application/json" }
                }));

                const suggestedTags: string[] = JSON.parse(result.text || "[]");
                
                // Combina tags sugeridas com as que já existiam (ex: a categoria de origem)
                const currentTags = r.tags || [];
                const mergedTags = Array.from(new Set([...currentTags, ...suggestedTags])).map(t => t.toLowerCase());

                await updateDoc(doc(db, 'global_recipes', r.id), { tags: mergedTags });
                
            } catch (err: any) {
                setEnrichLogs(prev => [...prev, `> ERRO em ${r.name}: ${err.message}`]);
            }

            setEnrichProgress(((i + 1) / targets.length) * 100);
            await new Promise(res => setTimeout(res, 800)); // Delay para evitar rate limit
        }

        setIsEnriching(false);
        showToast("Enriquecimento concluído!");
    };

    const processedRecipes = useMemo(() => {
        let filtered = recipes.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return filtered.sort((a, b) => {
            const hasTagsA = (a.tags && a.tags.length > 2) ? 1 : 0;
            const hasTagsB = (b.tags && b.tags.length > 2) ? 1 : 0;
            return hasTagsA - hasTagsB; // Mostra as SEM tags primeiro para facilitar gestão
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
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">IA Data Management</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={startEnrichment}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-xs font-bold shadow-lg"
                        >
                            <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                            Inteligência de Tags
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
                    </div>
                </div>

                {/* IA Enrichment Progress Overlay */}
                {isEnriching && (
                    <div className="absolute inset-0 z-[60] bg-slate-900/95 flex flex-col animate-fadeIn">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined animate-spin text-blue-400">sync</span>
                                Enriquecendo Acervo com IA...
                            </h3>
                            <button onClick={() => setShouldStopEnrich(true)} className="px-4 py-1 bg-red-600 text-white text-xs font-bold rounded-full">Parar</button>
                        </div>
                        <div className="p-10 flex-1 flex flex-col">
                            <div className="w-full bg-white/10 h-4 rounded-full overflow-hidden mb-6">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${enrichProgress}%` }}></div>
                            </div>
                            <div className="flex-1 bg-black/40 rounded-xl p-4 font-mono text-[11px] text-blue-300 overflow-y-auto scrollbar-hide">
                                {enrichLogs.map((log, i) => <p key={i} className="mb-1">{log}</p>)}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="p-3 bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-gray-700 shrink-0 flex gap-4">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar no acervo..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm"
                        />
                    </div>
                    <div className="flex items-center text-[10px] font-bold text-gray-500 gap-4 px-2 uppercase">
                        <span>Total: {recipes.length}</span>
                        <span className="text-orange-500">A processar: {recipes.filter(r => !r.tags || r.tags.length < 2).length}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-black/20">
                    {isLoading ? (
                        <div className="flex justify-center py-10"><span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {processedRecipes.map((recipe) => {
                                const needsTags = !recipe.tags || recipe.tags.length < 2;
                                return (
                                    <div key={recipe.id} className={`bg-white dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden border transition-all flex flex-col group relative ${needsTags ? 'border-orange-300 dark:border-orange-900 bg-orange-50/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                        <div className="aspect-square bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
                                            {recipe.imageUrl ? <img src={recipe.imageUrl} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-4xl">image_not_supported</span></div>}
                                            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleDelete(recipe.id, recipe.name)} className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-sm">delete</span></button>
                                                <button onClick={() => { setTaggingId(recipe.id); setNewTags(recipe.tags?.join(', ') || ''); }} className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-sm">sell</span></button>
                                            </div>
                                        </div>
                                        <div className="p-3 flex flex-col flex-1">
                                            <h3 className="font-bold text-[11px] text-gray-800 dark:text-gray-200 line-clamp-2 mb-2 leading-tight uppercase">{recipe.name}</h3>
                                            <div className="mt-auto flex flex-wrap gap-1">
                                                {recipe.tags?.slice(0, 3).map((t, i) => (
                                                    <span key={i} className="bg-gray-100 dark:bg-white/5 text-gray-500 text-[8px] px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700">{t}</span>
                                                ))}
                                                {recipe.tags && recipe.tags.length > 3 && <span className="text-[8px] text-gray-400">+{recipe.tags.length - 3}</span>}
                                                {needsTags && <span className="text-orange-500 text-[8px] font-bold">● Requer IA</span>}
                                            </div>
                                        </div>
                                        {taggingId === recipe.id && (
                                            <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 z-50 p-3 flex flex-col animate-fadeIn">
                                                <textarea className="flex-1 w-full bg-gray-50 dark:bg-black/20 border rounded p-2 text-xs mb-2 outline-none" value={newTags} onChange={e => setNewTags(e.target.value)} />
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleSaveTags(recipe.id)} className="flex-1 bg-green-600 text-white text-[10px] font-bold py-2 rounded">Salvar</button>
                                                    <button onClick={() => setTaggingId(null)} className="px-2 bg-gray-200 text-gray-500 text-[10px] font-bold rounded">X</button>
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
