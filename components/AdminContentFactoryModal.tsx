import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot, deleteDoc, updateDoc, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp, callGenAIWithRetry, generateKeywords } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useShoppingList } from '../contexts/ShoppingListContext';
import type { FullRecipe, SalesOpportunity } from '../types';

interface FactoryLog {
    text: string;
    type: 'info' | 'error' | 'success' | 'warning';
}

interface RecipeWithId extends FullRecipe {
    id: string;
    isBroken: boolean;
}

interface AggregatedLead {
    term: string;
    count: number;
}

const FACTORY_CATEGORIES = [
    "🍎 Hortifruti", "🥩 Açougue", "🥛 Laticínios", "🍞 Padaria", "🛒 Mercearia", 
    "💧 Bebidas", "🍰 Sobremesas", "🥗 Saudável/Fit", "🌬️ Airfryer", "🍳 Café da Manhã",
    "🍝 Massas/Pizzas", "🍹 Drinks/Coquetéis"
];

const REFINEMENT_LEVELS = [
    { id: 'simple', label: 'Simples', sub: 'Econômica', color: 'bg-green-600', text: 'Receitas populares e baratas.' },
    { id: 'daily', label: 'Dia a Dia', sub: 'Prática', color: 'bg-blue-600', text: 'Padrão das famílias brasileiras.' },
    { id: 'gourmet', label: 'Gourmet', sub: 'Premium', color: 'bg-purple-600', text: 'Ingredientes caros e técnicas avançadas.' }
];

const getRecipeDocId = (name: string) => {
    if (!name) return 'recipe-' + Date.now();
    return name.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[\/\s]+/g, '-') 
        .replace(/[^a-z0-9-]/g, '') 
        .slice(0, 80);
};

export const AdminContentFactoryModal: React.FC = () => {
    const app = useApp();
    const { isContentFactoryModalOpen, closeModal, openModal, showToast, isAdmin, setPendingInventoryItem, factoryActiveTab, setFactoryActiveTab } = app;
    const { user } = useAuth();
    const { offers } = useShoppingList();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [leadsSearchTerm, setLeadsSearchTerm] = useState('');
    
    // Produção
    const [refinementLevel, setRefinementLevel] = useState('daily');
    const [customNiche, setCustomNiche] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [qtyPerCategory, setQtyPerCategory] = useState(1);
    const [manualTitles, setManualTitles] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [logs, setLogs] = useState<FactoryLog[]>([]);
    const [shouldStop, setShouldStop] = useState(false);
    const stopSignalRef = useRef(false);
    
    // Acervo e Leads
    const [recipes, setRecipes] = useState<RecipeWithId[]>([]);
    const [isLoadingAcervo, setIsLoadingAcervo] = useState(true);
    const [ignoredLeads, setIgnoredLeads] = useState<string[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    const brokenCount = useMemo(() => recipes.filter(r => r.isBroken).length, [recipes]);

    // Editor
    const [editingRecipe, setEditingRecipe] = useState<RecipeWithId | null>(null);
    const [editName, setEditName] = useState('');
    const [editIngredients, setEditIngredients] = useState('');
    const [editInstructions, setEditInstructions] = useState('');
    const [editTags, setEditTags] = useState('');
    const [editLeads, setEditLeads] = useState('');
    const [editImage, setEditImage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
    const [isRegeneratingText, setIsRegeneratingText] = useState(false);

    const apiKey = process.env.API_KEY as string;

    const checkRecipeIntegrity = (r: FullRecipe): boolean => {
        const hasPhoto = !!(r.imageUrl && r.imageUrl.length > 50);
        const hasIngredients = !!(r.ingredients && r.ingredients.length > 0);
        const hasInstructions = !!(r.instructions && r.instructions.length > 0);
        const hasTags = !!(r.tags && r.tags.length > 0);
        const hasLeads = !!(r.suggestedLeads && r.suggestedLeads.length > 0 && r.suggestedLeads[0] !== 'nenhum');

        return hasPhoto && hasIngredients && hasInstructions && hasTags && hasLeads;
    };

    useEffect(() => {
        if (!isContentFactoryModalOpen || !db || !isAdmin) return;
        const unsubscribe = onSnapshot(collection(db, 'ignored_leads'), (snap) => {
            const list = snap.docs.map(d => d.data().term as string);
            setIgnoredLeads(list);
        }, (error) => {
            console.warn("[Factory] Ignored leads failed:", error.message);
        });
        return () => unsubscribe();
    }, [isContentFactoryModalOpen, isAdmin]);

    useEffect(() => {
        if (!isContentFactoryModalOpen || !db || !isAdmin) return;
        setIsLoadingAcervo(true);
        const qRecipes = query(collection(db, 'global_recipes'), limit(2000));
        const unsubRecipes = onSnapshot(qRecipes, (snap) => {
            const data = snap.docs.map(d => {
                const rData = d.data() as FullRecipe;
                return { ...rData, id: d.id, isBroken: !checkRecipeIntegrity(rData) } as RecipeWithId;
            });
            data.sort((a,b) => {
                if (a.isBroken && !b.isBroken) return -1;
                if (!a.isBroken && b.isBroken) return 1;
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            });
            setRecipes(data);
            setIsLoadingAcervo(false);
        });
        return () => unsubRecipes();
    }, [isContentFactoryModalOpen, isAdmin]);

    const recipeLeadsRanking = useMemo(() => {
        const counts: Record<string, number> = {};
        const existingTerms = offers.map(o => o.name.toLowerCase().trim());
        const existingTags = offers.flatMap(o => o.tags || []).map(t => t.toLowerCase().trim());

        recipes.forEach(recipe => {
            if (recipe.suggestedLeads && Array.isArray(recipe.suggestedLeads)) {
                recipe.suggestedLeads.forEach(lead => {
                    const cleanLead = lead.trim().toLowerCase();
                    if (cleanLead && cleanLead !== 'nenhum' && !ignoredLeads.includes(cleanLead)) {
                        const alreadyExists = existingTerms.some(t => t.includes(cleanLead)) || existingTags.includes(cleanLead);
                        if (!alreadyExists) {
                            counts[cleanLead] = (counts[cleanLead] || 0) + 1;
                        }
                    }
                });
            }
        });

        return Object.entries(counts)
            .map(([term, count]) => ({ term, count } as AggregatedLead))
            .sort((a, b) => b.count - a.count);
    }, [recipes, offers, ignoredLeads]);

    const filteredLeads = useMemo(() => {
        const lowTerm = leadsSearchTerm.toLowerCase().trim();
        if (!lowTerm) return recipeLeadsRanking;
        return recipeLeadsRanking.filter(l => l.term.includes(lowTerm));
    }, [recipeLeadsRanking, leadsSearchTerm]);

    const addLog = (text: string, type: FactoryLog['type'] = 'info') => {
        setLogs(prev => [...prev, { text, type }]);
    };

    const waitRandom = (min: number, max: number) => {
        const ms = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    const compressBase64Image = (base64Str: string, maxWidth: number = 1024, quality: number = 0.75): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Canvas context failed"));
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (e) => reject(e);
        });
    };

    useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

    const runBatchProduction = async () => {
        const manualList = manualTitles.split(/[\n,]/).map(t => t.trim()).filter(t => t);
        const categoriesToProcess = [...selectedCategories];
        if (customNiche.trim()) categoriesToProcess.push(`Personalizado: ${customNiche.trim()}`);

        if (manualList.length === 0 && categoriesToProcess.length === 0) {
            showToast("Selecione itens para produzir.");
            return;
        }

        setIsGenerating(true);
        setShouldStop(false);
        stopSignalRef.current = false;
        setLogs([{ text: "⚙️ MÁQUINA DE CONTEÚDO INICIADA", type: 'warning' }]);
        
        const refinement = REFINEMENT_LEVELS.find(r => r.id === refinementLevel);
        const ai = new GoogleGenAI({ apiKey });
        let masterQueue: string[] = [...manualList];

        if (categoriesToProcess.length > 0) {
            addLog(`[IA] Planejando curadoria...`, 'info');
            for (const cat of categoriesToProcess) {
                if (stopSignalRef.current) break;
                try {
                    const promptNames = `Gere ${qtyPerCategory} nomes de receitas para a categoria brasileira: "${cat}". Estilo: ${refinement?.label}. Retorne JSON array de strings.`;
                    const res = await callGenAIWithRetry(() => ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: promptNames,
                        config: { responseMimeType: "application/json" }
                    }));
                    const categoryTitles = JSON.parse(res.text || "[]") as string[];
                    masterQueue = [...masterQueue, ...categoryTitles];
                    addLog(`Curadoria ${cat}: ${categoryTitles.length} itens.`, 'success');
                    await waitRandom(1500, 2500);
                } catch (e: any) {
                    addLog(`Erro curadoria ${cat}: ${e.message}`, 'error');
                }
            }
        }

        masterQueue = Array.from(new Set(masterQueue));
        addLog(`📋 FILA: ${masterQueue.length} RECEITAS`, 'info');

        for (let i = 0; i < masterQueue.length; i++) {
            if (stopSignalRef.current) break;
            const title = masterQueue[i];
            const docId = getRecipeDocId(title);
            addLog(`[${i + 1}/${masterQueue.length}] Processando: ${title.toUpperCase()}`, 'info');
            
            try {
                const existingDoc = await getDoc(doc(db!, 'global_recipes', docId));
                if (existingDoc.exists() && checkRecipeIntegrity(existingDoc.data() as FullRecipe)) {
                    addLog(`✨ "${title}" já existe.`, 'success');
                    continue;
                }
            } catch (e) {}

            try {
                const systemPrompt = `Gere uma receita brasileira completa para: "${title}". Estilo: ${refinement?.label}. Formato JSON: { "name": "${title}", "ingredients": [{"simplifiedName": "Arroz", "detailedName": "2 xícaras de arroz"}], "instructions": ["Passo 1..."], "imageQuery": "Food photo of ${title}", "servings": "4", "prepTimeInMinutes": 45, "difficulty": "Médio", "cost": "Médio", "tags": ["${refinement?.label}"], "suggestedLeads": ["item"] }`;
                const textRes = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: systemPrompt,
                    config: { responseMimeType: "application/json" }
                }));
                const details = JSON.parse(textRes.text || "{}");
                const imgRes: any = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: details.imageQuery || `Delicious ${title}` }] }
                }));
                let finalImageUrl = "";
                for (const part of imgRes.candidates[0].content.parts) {
                    if (part.inlineData) {
                        finalImageUrl = await compressBase64Image(`data:image/jpeg;base64,${part.inlineData.data}`);
                        break;
                    }
                }
                const finalData = { ...details, imageUrl: finalImageUrl, imageSource: 'genai', keywords: generateKeywords(details.name || title), createdAt: serverTimestamp() };
                await setDoc(doc(db!, 'global_recipes', docId), finalData, { merge: true });
                addLog(`✅ Finalizada!`, 'success');
                await waitRandom(4000, 6000);
            } catch (err: any) {
                addLog(`❌ Erro: ${err.message}`, 'error');
                await waitRandom(3000, 4000);
            }
        }
        addLog("🏁 FINALIZADO", 'success');
        setIsGenerating(false);
    };

    const toggleCategory = (cat: string) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

    const handleGerarOferta = (term: string) => {
        app.setPendingInventoryItem({ 
            name: term.charAt(0).toUpperCase() + term.slice(1), 
            tags: term.toLowerCase() 
        });
        closeModal('contentFactory');
        openModal('admin');
    };

    const handleIgnoreLead = async (term: string) => {
        if (!db || !isAdmin) return;
        try {
            await setDoc(doc(db, 'ignored_leads', term.replace(/\s+/g, '-')), {
                term,
                ignoredBy: user?.displayName || 'Admin',
                createdAt: serverTimestamp()
            });
            showToast(`Termo "${term}" ocultado.`);
        } catch (e) {
            showToast("Erro ao ignorar.");
        }
    };

    if (!isContentFactoryModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-0 sm:p-4 animate-fadeIn" onClick={() => closeModal('contentFactory')}>
            <div className="bg-[#0f172a] w-full h-full sm:w-[96vw] sm:h-[96vh] sm:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                
                <div className="p-4 sm:p-6 bg-slate-800 border-b border-white/5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 shrink-0"><span className="material-symbols-outlined text-2xl">factory</span></div>
                        <h2 className="text-white font-black text-lg sm:text-xl uppercase italic tracking-tighter">Fábrica de Conteúdo</h2>
                    </div>
                    <button onClick={() => closeModal('contentFactory')} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors shrink-0"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="flex bg-slate-900 shrink-0 border-b border-white/5 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setFactoryActiveTab('producao')} className={`flex-1 min-w-[120px] py-4 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${factoryActiveTab === 'producao' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}`}>Produção</button>
                    <button onClick={() => setFactoryActiveTab('acervo')} className={`flex-1 min-w-[120px] py-4 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${factoryActiveTab === 'acervo' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>Acervo ({recipes.length})</button>
                    <button onClick={() => setFactoryActiveTab('leads')} className={`flex-1 min-w-[120px] py-4 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${factoryActiveTab === 'leads' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-gray-300'}`}>Leads ({recipeLeadsRanking.length})</button>
                </div>

                <div className="flex-1 overflow-hidden">
                    {factoryActiveTab === 'producao' && (
                        <div className="flex flex-col lg:flex-row h-full animate-fadeIn overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 scrollbar-hide">
                                
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">1. Nível de Refinamento</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {REFINEMENT_LEVELS.map(level => (
                                            <button 
                                                key={level.id}
                                                onClick={() => setRefinementLevel(level.id)}
                                                className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all group ${refinementLevel === level.id ? `border-white ${level.color} shadow-lg scale-[0.98]` : 'border-white/5 bg-slate-900 grayscale opacity-60 hover:opacity-100'}`}
                                            >
                                                <span className="font-black text-white uppercase italic tracking-tighter text-xs sm:text-sm">{level.label}</span>
                                                <span className="text-[8px] font-bold text-white/70 uppercase tracking-tighter hidden sm:block">{level.sub}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">2. Selecionar Nichos</label>
                                    <div className="flex flex-wrap gap-2">
                                        {FACTORY_CATEGORIES.map(cat => (
                                            <button key={cat} onClick={() => toggleCategory(cat)} className={`py-2 px-3 rounded-lg text-[9px] font-black uppercase transition-all border ${selectedCategories.includes(cat) ? 'bg-green-600 border-green-400 text-white' : 'bg-slate-900 border-white/5 text-slate-400'}`}>{cat}</button>
                                        ))}
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Ou nicho personalizado..." 
                                        value={customNiche}
                                        onChange={e => setCustomNiche(e.target.value)}
                                        className="w-full h-11 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs text-white focus:border-green-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">3. Qtd por Nicho</label>
                                        <input type="number" min="1" max="50" value={qtyPerCategory} onChange={e => setQtyPerCategory(Number(e.target.value))} className="w-full h-12 bg-slate-900 border-white/5 rounded-xl px-5 text-white font-black text-lg outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">4. Iniciar Motores</label>
                                        {isGenerating ? (
                                            <button onClick={() => { setShouldStop(true); stopSignalRef.current = true; }} className="w-full h-12 bg-red-600 text-white font-black uppercase text-xs rounded-xl animate-pulse">Parar Produção</button>
                                        ) : (
                                            <button onClick={runBatchProduction} className="w-full h-12 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs rounded-xl shadow-xl active:scale-95 transition-all">Ligar Máquina IA</button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">5. Pedidos Manuais</label>
                                    <textarea className="w-full h-24 bg-slate-900 border-white/5 rounded-2xl p-4 text-white font-bold text-xs resize-none focus:ring-1 focus:ring-green-500 outline-none" placeholder="Ex: Bolo de Fubá, Lasanha..." value={manualTitles} onChange={e => setManualTitles(e.target.value)} disabled={isGenerating} />
                                </div>
                            </div>

                            <div className="w-full lg:w-96 bg-black/40 border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col h-[250px] lg:h-full overflow-hidden shrink-0">
                                <div className="p-3 bg-slate-800/50 border-b border-white/5 flex justify-between items-center"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">IA Console v5.1</span><span className={`h-2 w-2 rounded-full ${isGenerating ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span></div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[9px] scrollbar-hide bg-slate-950/50">
                                    {logs.length === 0 && <p className="text-slate-700 italic text-center py-6">Aguardando comando...</p>}
                                    {logs.map((log, i) => (<div key={i} className={`p-1.5 rounded-lg ${ log.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : log.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : log.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : 'text-slate-400' }`}>{log.text}</div>))}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        </div>
                    )}

                    {factoryActiveTab === 'acervo' && (
                        <div className="flex flex-col h-full animate-fadeIn overflow-hidden">
                            <div className="p-3 sm:p-6 bg-slate-900 border-b border-white/5 flex flex-wrap gap-2">
                                <input type="text" placeholder="Filtrar receitas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 min-w-[200px] h-11 bg-slate-800 border-0 rounded-xl pl-5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500" />
                                <div className="px-3 bg-red-600/20 text-red-500 rounded-xl flex items-center gap-2 border border-red-500/30 whitespace-nowrap"><span className="text-[9px] font-black uppercase tracking-widest">Pendentes: {brokenCount}</span></div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 sm:p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-6 scrollbar-hide">
                                {isLoadingAcervo ? (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 opacity-50"><div className="h-8 w-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div><p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Carregando...</p></div>
                                ) : recipes.filter(r => r.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
                                    <div key={r.id} className={`rounded-2xl border-2 overflow-hidden cursor-pointer group transition-all min-h-[160px] flex flex-col relative ${r.isBroken ? 'bg-red-500/20 border-red-600' : 'bg-slate-800 border-white/5 hover:border-blue-500/50'}`}>
                                        <div className="aspect-square w-full bg-slate-900 shrink-0 overflow-hidden relative">
                                            {r.imageUrl ? <img src={r.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700"><span className="material-symbols-outlined">no_photography</span></div>}
                                            {r.isBroken && <div className="absolute top-1 left-1 bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">Pendente</div>}
                                        </div>
                                        <div className="p-3 flex-1 flex items-center"><h3 className="font-black uppercase text-[9px] line-clamp-2 text-white">{r.name}</h3></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {factoryActiveTab === 'leads' && (
                        <div className="flex flex-col h-full animate-fadeIn overflow-hidden">
                             <div className="p-4 sm:p-6 bg-slate-900 border-b border-white/5 shrink-0">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                                    <input type="text" placeholder="Procurar termos..." value={leadsSearchTerm} onChange={e => setLeadsSearchTerm(e.target.value)} className="w-full h-11 bg-slate-800 border-0 rounded-xl pl-12 text-sm text-white outline-none focus:ring-1 focus:ring-orange-500" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-3 scrollbar-hide">
                                {filteredLeads.map((lead, idx) => (
                                    <div key={idx} className="bg-slate-800 p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 group animate-fadeIn">
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="h-9 w-9 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 font-black text-xs shrink-0">{lead.count}</div>
                                            <div className="min-w-0">
                                                <h3 className="text-white font-black text-base italic uppercase truncate">{lead.term}</h3>
                                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Sugerido em {lead.count} receitas</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button onClick={() => handleGerarOferta(lead.term)} className="flex-1 sm:flex-none px-4 h-9 rounded-lg bg-blue-600 text-white font-black text-[9px] uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap">Gerar Oferta</button>
                                            <button onClick={() => handleIgnoreLead(lead.term)} className="h-9 w-9 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shrink-0"><span className="material-symbols-outlined text-lg">delete</span></button>
                                        </div>
                                    </div> 
                                ))}
                                {filteredLeads.length === 0 && (
                                    <div className="text-center py-20 opacity-30 italic text-white text-sm">Sem leads novos.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};