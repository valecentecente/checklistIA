
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { callGenAIWithRetry, useApp } from '../contexts/AppContext';
import { db } from '../firebase';
import type { FullRecipe } from '../types';

interface RecipeWithId extends FullRecipe {
    id: string;
}

export const AdminRecipesModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast, generateKeywords } = useApp();
    const [recipes, setRecipes] = useState<RecipeWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Tagging Manual
    const [taggingId, setTaggingId] = useState<string | null>(null);
    const [newTags, setNewTags] = useState('');

    // IA Enrichment State
    const [isChecking, setIsChecking] = useState(false);
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

    const startEnrichment = async () => {
        setIsChecking(true);
        const apiKey = process.env.API_KEY as string;
        
        await new Promise(r => setTimeout(r, 800));
        const targets = recipes.filter(r => !r.tags || r.tags.length < 2);
        
        if (targets.length === 0) {
            showToast("Tudo certo! Todas as receitas já possuem tags inteligentes.");
            setIsChecking(false);
            return;
        }

        if (!window.confirm(`A IA identificou ${targets.length} receitas antigas sem organização. Iniciar processamento seguro?`)) {
            setIsChecking(false);
            return;
        }

        setIsEnriching(true);
        setIsChecking(false);
        setShouldStopEnrich(false);
        setEnrichLogs(["[SISTEMA] Iniciando varredura de tags...", "[SISTEMA] Modo seguro ativado (Pausa de 8s entre requisições)."]);
        setEnrichProgress(0);

        for (let i = 0; i < targets.length; i++) {
            if (shouldStopEnrich) break;

            const r = targets[i];
            const logMsg = `[${i+1}/${targets.length}] Analisando: ${r.name}...`;
            setEnrichLogs(prev => [...prev, logMsg]);

            try {
                // Inicializamos a IA dentro da iteração para garantir que use a chave mais recente do sistema
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const ingredientsText = r.ingredients?.map(ing => ing.detailedName).join(', ') || '';
                const prompt = `Analise o prato "${r.name}" (Ingredientes: ${ingredientsText}). 
                Gere exatamente 4 tags curtas para filtragem (ex: Massa, Fit, Jantar, Carne). 
                Retorne apenas um JSON array de strings.`;

                const result = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                    config: { responseMimeType: "application/json" }
                }));

                const suggestedTags: string[] = JSON.parse(result.text || "[]");
                const currentTags = r.tags || [];
                const mergedTags = Array.from(new Set([...currentTags, ...suggestedTags])).map(t => t.toLowerCase());

                if (db) {
                    await updateDoc(doc(db, 'global_recipes', r.id), { 
                        tags: mergedTags,
                        keywords: generateKeywords(r.name)
                    });
                }
                setEnrichLogs(prev => [...prev, `> SUCESSO: Tags aplicadas.`]);

            } catch (err: any) {
                let errorMessage = err.message || 'Erro desconhecido';
                
                if (errorMessage.includes('{')) {
                    try {
                        const jsonError = JSON.parse(errorMessage.substring(errorMessage.indexOf('{')));
                        errorMessage = jsonError.error?.message || errorMessage;
                    } catch(e) {}
                }

                setEnrichLogs(prev => [...prev, `> ERRO CRÍTICO: ${errorMessage}`]);
                
                if (errorMessage.includes('403') || errorMessage.includes('key')) {
                    setEnrichLogs(prev => [...prev, "[ALERTA] Acesso Negado. Verifique se a chave de API é válida e se o modelo gemini-3-flash-preview está disponível no seu projeto do AI Studio."]);
                    setShouldStopEnrich(true);
                    break; 
                }

                if (errorMessage.includes('429')) {
                    setEnrichLogs(prev => [...prev, "[COTA] Limite atingido. Aguardando 30s para resfriamento..."]);
                    await new Promise(res => setTimeout(res, 30000));
                }
            }

            setEnrichProgress(((i + 1) / targets.length) * 100);
            
            if (i < targets.length - 1 && !shouldStopEnrich) {
                setEnrichLogs(prev => [...prev, `[SAFE] Cooldown de 8s...`]);
                await new Promise(res => setTimeout(res, 8000));
            }
        }

        setEnrichLogs(prev => [...prev, "--- PROCESSO CONCLUÍDO ---"]);
        setIsEnriching(false);
    };

    const processedRecipes = useMemo(() => {
        let filtered = recipes.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return filtered.sort((a, b) => {
            const hasTagsA = (a.tags && a.tags.length > 2) ? 1 : 0;
            const hasTagsB = (b.tags && b.tags.length > 2) ? 1 : 0;
            return hasTagsA - hasTagsB; 
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
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Database & Tags Manager</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={startEnrichment}
                            disabled={isChecking || isEnriching}
                            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-xs font-bold shadow-lg disabled:opacity-50`}
                        >
                            {isChecking ? (
                                <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                            ) : (
                                <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                            )}
                            {isChecking ? "Analisando..." : "Inteligência de Tags"}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
                    </div>
                </div>

                {/* IA Enrichment Progress Overlay */}
                {isEnriching && (
                    <div className="absolute inset-0 z-[60] bg-slate-900/98 flex flex-col animate-fadeIn">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-800">
                            <div>
                                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                    <span className="material-symbols-outlined animate-spin text-blue-400">psychology</span>
                                    Enriquecimento de Dados
                                </h3>
                                <p className="text-xs text-blue-300">A IA está processando as receitas para organização automática.</p>
                            </div>
                            <button onClick={() => setShouldStopEnrich(true)} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-full transition-colors">PARAR PROCESSO</button>
                        </div>
                        <div className="p-8 flex-1 flex flex-col overflow-hidden">
                            <div className="mb-2 flex justify-between text-xs font-bold text-blue-400">
                                <span>PROGRESSO TOTAL</span>
                                <span>{Math.round(enrichProgress)}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden mb-6 border border-white/10">
                                <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500" style={{ width: `${enrichProgress}%` }}></div>
                            </div>
                            <div className="flex-1 bg-black rounded-xl p-5 font-mono text-[12px] text-green-400 overflow-y-auto border border-blue-500/20 shadow-inner">
                                {enrichLogs.map((log, i) => (
                                    <p key={i} className={`mb-1.5 ${log.startsWith('>') ? 'text-blue-300' : log.includes('ERRO') ? 'text-red-400 font-bold' : log.includes('ALERTA') ? 'text-yellow-400 bg-yellow-900/20 p-2 rounded' : log.includes('SAFE') ? 'text-yellow-600/80 italic' : ''}`}>
                                        {log}
                                    </p>
                                ))}
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
                    <div className="flex items-center text-[10px] font-bold text-gray-500 gap-4 px-2 uppercase shrink-0">
                        <span>Total: {recipes.length}</span>
                        <span className="text-orange-500 bg-orange-500/10 px-2 py-1 rounded">Sem Tags: {recipes.filter(r => !r.tags || r.tags.length < 2).length}</span>
                    </div>
                </div>

                {/* Content Grid */}
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
