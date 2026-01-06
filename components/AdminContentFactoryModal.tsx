
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
    { id: 'simple', label: 'Simples', sub: 'Econômica & Rápida', color: 'bg-green-600', text: 'Receitas populares, com ingredientes baratos de mercado de bairro.' },
    { id: 'daily', label: 'Dia a Dia', sub: 'Prática & Comum', color: 'bg-blue-600', text: 'O padrão das famílias brasileiras. Pratos caseiros bem temperados.' },
    { id: 'gourmet', label: 'Gourmet', sub: 'Premium & Elaborada', color: 'bg-purple-600', text: 'Pratos de restaurante, ingredientes caros e técnicas avançadas.' }
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

    // Monitorar termos ignorados
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
            // ORDENAÇÃO PRIORITÁRIA: Incompletas SEMPRE no topo
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

    // Ranking de Leads
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
        setLogs([{ text: "⚙️ MÁQUINA DE CONTEÚDO TROPICALIZADA INICIADA", type: 'warning' }]);
        
        const refinement = REFINEMENT_LEVELS.find(r => r.id === refinementLevel);
        addLog(`MODALIDADE: ${refinement?.label.toUpperCase()}`, 'info');

        const ai = new GoogleGenAI({ apiKey });
        let masterQueue: string[] = [...manualList];

        if (categoriesToProcess.length > 0) {
            addLog(`[IA] Planejando curadoria para ${categoriesToProcess.length} nichos...`, 'info');
            for (const cat of categoriesToProcess) {
                if (stopSignalRef.current) break;
                try {
                    const promptNames = `Gere ${qtyPerCategory} nomes de receitas para a categoria brasileira: "${cat}". 
                    ESTILO: ${refinement?.label} (${refinement?.text}). Retorne JSON array de strings.`;
                    const res = await callGenAIWithRetry(() => ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: promptNames,
                        config: { responseMimeType: "application/json" }
                    }));
                    const categoryTitles = JSON.parse(res.text || "[]") as string[];
                    masterQueue = [...masterQueue, ...categoryTitles];
                    addLog(`Curadoria ${cat}: ${categoryTitles.length} itens encontrados.`, 'success');
                    await waitRandom(1500, 3000);
                } catch (e: any) {
                    addLog(`Erro na curadoria de ${cat}: ${e.message}`, 'error');
                }
            }
        }

        masterQueue = Array.from(new Set(masterQueue));
        addLog(`📋 FILA TOTAL: ${masterQueue.length} RECEITAS`, 'info');

        for (let i = 0; i < masterQueue.length; i++) {
            if (stopSignalRef.current) break;
            const title = masterQueue[i];
            const docId = getRecipeDocId(title);
            addLog(`[${i + 1}/${masterQueue.length}] Processando: ${title.toUpperCase()}`, 'info');
            
            try {
                const existingDoc = await getDoc(doc(db!, 'global_recipes', docId));
                if (existingDoc.exists() && checkRecipeIntegrity(existingDoc.data() as FullRecipe)) {
                    addLog(`✨ "${title}" já está pronta. Pulando...`, 'success');
                    continue;
                }
            } catch (e) {}

            try {
                const refinementInstruction = refinement?.id === 'simple' 
                    ? 'Use ingredientes básicos de cesta básica, substitutos baratos e linguagem popular.' 
                    : refinement?.id === 'daily' 
                        ? 'Receita prática para o dia a dia brasileiro. Ingredientes acessíveis.'
                        : 'Ingredientes premium, técnicas avançadas e nível gourmet.';

                const systemPrompt = `Gere uma receita brasileira completa para: "${title}".
                FORMA: ${refinement?.label}. INSTRUÇÃO: ${refinementInstruction}.
                Formato JSON: {
                    "name": "${title}",
                    "ingredients": [{"simplifiedName": "Arroz", "detailedName": "2 xícaras de arroz"}],
                    "instructions": ["Passo 1..."],
                    "imageQuery": "Apetizing food photography of ${title}",
                    "servings": "4 porções",
                    "prepTimeInMinutes": 45,
                    "difficulty": "${refinement?.label === 'Simples' ? 'Fácil' : 'Médio'}",
                    "cost": "${refinement?.id === 'simple' ? 'Baixo' : refinement?.id === 'daily' ? 'Médio' : 'Alto'}",
                    "tags": ["Nível ${refinement?.label}"],
                    "suggestedLeads": ["utensílio relevante"]
                }`;
                
                const textRes = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: systemPrompt,
                    config: { responseMimeType: "application/json" }
                }));
                const details = JSON.parse(textRes.text || "{}");
                
                const imgRes: any = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: details.imageQuery || `High-end food photography of ${title}` }] }
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
                addLog(`✅ [${i+1}/${masterQueue.length}] "${title}" finalizada!`, 'success');
                await waitRandom(5000, 8000);
            } catch (err: any) {
                addLog(`❌ Falha em "${title}": ${err.message}`, 'error');
                await waitRandom(3000, 5000);
            }
        }
        addLog("🏁 PROCESSO FINALIZADO", 'success');
        setIsGenerating(false);
    };

    const handleOpenEditor = (recipe: RecipeWithId) => {
        setEditingRecipe(recipe);
        setEditName(recipe.name || '');
        setEditIngredients(recipe.ingredients?.map(i => i.detailedName).join('\n') || '');
        setEditInstructions(recipe.instructions?.join('\n') || '');
        setEditTags(recipe.tags?.join(', ') || '');
        setEditLeads(recipe.suggestedLeads?.join(', ') || '');
        setEditImage(recipe.imageUrl || '');
    };

    const handleCopyAll = () => {
        const fullText = `RECEITA: ${editName}\n\nINGREDIENTES:\n${editIngredients}\n\nPREPARO:\n${editInstructions}\n\nTAGS: ${editTags}\nLEADS: ${editLeads}`;
        navigator.clipboard.writeText(fullText).then(() => showToast("Texto copiado!"));
    };

    const handlePreviewRecipe = () => {
        if (!editingRecipe) return;
        const previewData: FullRecipe = {
            ...editingRecipe,
            name: editName,
            ingredients: editIngredients.split('\n').filter(l => l).map(line => ({ simplifiedName: line.split(' ')[0], detailedName: line })),
            instructions: editInstructions.split('\n').filter(l => l),
            tags: editTags.split(',').map(t => t.trim()).filter(t => t),
            suggestedLeads: editLeads.split(',').map(l => l.trim()).filter(l => l),
            imageUrl: editImage,
        };
        app.showRecipe(previewData);
    };

    const handleRegenerateText = async () => {
        if (isRegeneratingText) return;
        setIsRegeneratingText(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Gere uma receita brasileira COMPLETA para: "${editName}". JSON ONLY. Nível: ${refinementLevel}.`;
            const textRes = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            }));
            const details = JSON.parse(textRes.text || "{}");
            if (details.ingredients) setEditIngredients(details.ingredients.map((i: any) => i.detailedName).join('\n'));
            if (details.instructions) setEditInstructions(details.instructions.join('\n'));
            if (details.tags) setEditTags(details.tags.join(', '));
            if (details.suggestedLeads) setEditLeads(details.suggestedLeads.join(', '));
            showToast("Dados atualizados via IA!");
        } catch (e) { showToast("Erro."); } finally { setIsRegeneratingText(false); }
    };

    const handleRegenerateImage = async () => {
        if (isRegeneratingImage) return;
        setIsRegeneratingImage(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            const imgRes: any = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: `High resolution food photography of ${editName}` }] }
            }));
            for (const part of imgRes.candidates[0].content.parts) {
                if (part.inlineData) {
                    setEditImage(await compressBase64Image(`data:image/jpeg;base64,${part.inlineData.data}`));
                    showToast("Nova foto gerada!"); break;
                }
            }
        } catch (e) { showToast("Erro."); } finally { setIsRegeneratingImage(false); }
    };

    const handleSaveRecipe = async () => {
        if (!editingRecipe || isSaving) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db!, 'global_recipes', editingRecipe.id), { 
                name: editName, ingredients: editIngredients.split('\n').filter(l => l).map(line => ({ simplifiedName: line.split(' ')[0], detailedName: line })),
                instructions: editInstructions.split('\n').filter(l => l), tags: editTags.split(',').map(t => t.trim()).filter(t => t), 
                suggestedLeads: editLeads.split(',').map(l => l.trim()).filter(l => l), 
                imageUrl: editImage, updatedAt: serverTimestamp() 
            });
            showToast("Salvo!"); setEditingRecipe(null);
        } catch (e) { showToast("Erro."); } finally { setIsSaving(false); }
    };

    const handleGerarOferta = (term: string) => {
        app.setPendingInventoryItem({ 
            name: term.charAt(0).toUpperCase() + term.slice(1), 
            tags: term.toLowerCase() 
        });
        closeModal('contentFactory');
        openModal('admin');
    };

    const toggleCategory = (cat: string) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

    if (!isContentFactoryModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('contentFactory')}>
            <div className="bg-[#0f172a] w-[96vw] h-[96vh] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                
                <div className="p-6 bg-slate-800 border-b border-white/5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400"><span className="material-symbols-outlined">factory</span></div>
                        <h2 className="text-white font-black text-xl uppercase italic tracking-tighter">Fábrica de Conteúdo</h2>
                    </div>
                    <button onClick={() => closeModal('contentFactory')} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="flex bg-slate-900 shrink-0 border-b border-white/5 px-4">
                    <button onClick={() => setFactoryActiveTab('producao')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${factoryActiveTab === 'producao' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}`}>Produção Lote</button>
                    <button onClick={() => setFactoryActiveTab('acervo')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${factoryActiveTab === 'acervo' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>Acervo Global ({recipes.length})</button>
                    <button onClick={() => setFactoryActiveTab('leads')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${factoryActiveTab === 'leads' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-gray-300'}`}>IA Leads ({recipeLeadsRanking.length})</button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col relative">
                    {factoryActiveTab === 'producao' && (
                        <div className="flex-1 flex gap-6 p-8 animate-fadeIn overflow-hidden">
                            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-hide">
                                
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">1. Nível de Refinamento (Público-Alvo)</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {REFINEMENT_LEVELS.map(level => (
                                            <button 
                                                key={level.id}
                                                onClick={() => setRefinementLevel(level.id)}
                                                className={`flex flex-col p-4 rounded-2xl border-2 transition-all text-left group ${refinementLevel === level.id ? `border-white ${level.color} shadow-lg scale-[0.98]` : 'border-white/5 bg-slate-900 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
                                            >
                                                <span className="font-black text-white uppercase italic tracking-tighter text-lg">{level.label}</span>
                                                <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">{level.sub}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">2. Selecionar Nichos</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {FACTORY_CATEGORIES.map(cat => (
                                            <button key={cat} onClick={() => toggleCategory(cat)} className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedCategories.includes(cat) ? 'bg-green-600 border-green-400 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/20'}`}>{cat}</button>
                                        ))}
                                    </div>
                                    <div className="relative mt-2">
                                        <input 
                                            type="text" 
                                            placeholder="Ou digite um nicho personalizado (Ex: Comida Baiana, Comida Mineira...)" 
                                            value={customNiche}
                                            onChange={e => setCustomNiche(e.target.value)}
                                            className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-5 text-sm text-white focus:border-green-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">3. Qtd por Nicho</label>
                                        <input type="number" min="1" max="50" value={qtyPerCategory} onChange={e => setQtyPerCategory(Number(e.target.value))} className="w-full h-14 bg-slate-900 border-white/5 rounded-2xl px-6 text-white font-black text-xl outline-none focus:ring-2 focus:ring-green-500" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">4. Iniciar Motores</label>
                                        {isGenerating ? (
                                            <button onClick={() => { setShouldStop(true); stopSignalRef.current = true; }} className="w-full h-14 bg-red-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl animate-pulse">Parar Produção</button>
                                        ) : (
                                            <button onClick={runBatchProduction} className="w-full h-14 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs rounded-2xl shadow-xl active:scale-95 transition-all">Ligar Máquina IA</button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 flex-1 flex flex-col min-h-[150px]">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">5. Pedidos Manuais (Use vírgula para várias receitas)</label>
                                    <textarea className="flex-1 w-full bg-slate-900 border-white/5 rounded-2xl p-6 text-white font-bold resize-none focus:ring-2 focus:ring-green-500 outline-none placeholder:text-slate-700" placeholder="Ex: Bolo de Fubá, Torta de Frango, Lasanha..." value={manualTitles} onChange={e => setManualTitles(e.target.value)} disabled={isGenerating} />
                                </div>
                            </div>

                            <div className="w-96 bg-black/40 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden">
                                <div className="p-4 bg-slate-800/50 border-b border-white/5 flex justify-between items-center"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IA Console v5.1</span><span className={`h-2 w-2 rounded-full ${isGenerating ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px] scrollbar-hide bg-slate-950/50">
                                    {logs.length === 0 && <p className="text-slate-700 italic text-center py-10">Aguardando comando...</p>}
                                    {logs.map((log, i) => (<div key={i} className={`p-2 rounded-lg ${ log.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : log.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : log.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : 'text-slate-400' }`}>{log.text}</div>))}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        </div>
                    )}

                    {factoryActiveTab === 'acervo' && (
                        <div className="flex flex-col h-full animate-fadeIn">
                            <div className="p-6 bg-slate-900 border-b border-white/5 flex gap-4">
                                <input type="text" placeholder="Filtrar receitas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 h-12 bg-slate-800 border-0 rounded-xl pl-5 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                                <div className="px-4 bg-red-600 text-white rounded-xl flex items-center gap-2 border border-red-500 animate-pulse"><span className="text-[10px] font-black uppercase tracking-widest">Prioridade Crítica: {brokenCount}</span></div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6 scrollbar-hide">
                                {isLoadingAcervo ? (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 opacity-50"><div className="h-10 w-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div><p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Carregando...</p></div>
                                ) : recipes.filter(r => r.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
                                    <div key={r.id} onClick={() => handleOpenEditor(r)} className={`rounded-3xl border-2 overflow-hidden cursor-pointer group transition-all min-h-[180px] flex flex-col relative ${r.isBroken ? 'bg-red-500/20 border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'bg-slate-800 border-white/5 hover:border-blue-500/50'}`}>
                                        <div className="aspect-square w-full bg-slate-900 shrink-0 overflow-hidden relative">
                                            {r.imageUrl ? (
                                                <img src={r.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700">
                                                    <span className="material-symbols-outlined text-4xl">no_photography</span>
                                                </div>
                                            )}
                                            {r.isBroken && <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase shadow-lg">INCOMPLETA</div>}
                                        </div>
                                        <div className="p-4 flex-1 flex items-center"><h3 className={`font-black uppercase text-[10px] truncate ${r.isBroken ? 'text-red-200' : 'text-white'}`}>{r.name}</h3></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {factoryActiveTab === 'leads' && (
                        <div className="flex-1 overflow-y-auto p-8 animate-fadeIn scrollbar-hide">
                             <div className="p-6 bg-slate-900 border-b border-white/5 flex flex-col gap-4 mb-6 rounded-3xl">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                                    <input type="text" placeholder="Procurar termos nos leads..." value={leadsSearchTerm} onChange={e => setLeadsSearchTerm(e.target.value)} className="w-full h-12 bg-slate-800 border-0 rounded-xl pl-12 text-white outline-none focus:ring-2 focus:ring-orange-500" />
                                </div>
                            </div>
                            <div className="grid gap-3">
                                {filteredLeads.map((lead, idx) => (
                                    <div key={idx} className="bg-slate-800 p-5 rounded-3xl border border-white/5 flex items-center justify-between group animate-fadeIn">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 font-black text-xs shadow-inner">
                                                {lead.count}
                                            </div>
                                            <div>
                                                <h3 className="text-white font-black text-lg italic uppercase">{lead.term}</h3>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sugerido em {lead.count} receitas</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleGerarOferta(lead.term)} 
                                                className="px-6 h-10 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"
                                            >
                                                Gerar Oferta
                                            </button>
                                            <button 
                                                onClick={() => handleIgnoreLead(lead.term)}
                                                className="h-10 w-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                title="Ignorar termo permanentemente"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div> 
                                ))}
                                {filteredLeads.length === 0 && (
                                    <div className="text-center py-20 opacity-30 italic text-white">Nenhum lead pendente de curadoria.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {editingRecipe && (
                        <div className="absolute inset-0 z-[60] bg-slate-950 flex flex-col animate-fadeIn">
                            <div className="p-6 bg-slate-900 border-b border-white/10 flex justify-between items-center shrink-0">
                                <button onClick={() => setEditingRecipe(null)} className="h-10 w-10 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-400 transition-all active:scale-90"><span className="material-symbols-outlined">arrow_back</span></button>
                                <div className="flex gap-3">
                                    <button onClick={handlePreviewRecipe} className="h-12 px-6 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-white/10 hover:bg-slate-700"><span className="material-symbols-outlined">visibility</span> VER RECEITA</button>
                                    <button onClick={handleCopyAll} className="h-12 px-6 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-white/10 hover:bg-slate-700"><span className="material-symbols-outlined">content_copy</span> COPIAR TUDO</button>
                                    <button onClick={handleRegenerateText} disabled={isRegeneratingText} className="h-12 px-6 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50">{isRegeneratingText ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">auto_fix_high</span>} REFAZER TXT</button>
                                    <button onClick={handleSaveRecipe} disabled={isSaving} className="h-12 px-8 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all disabled:opacity-50">SALVAR</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10 scrollbar-hide">
                                <div className="space-y-6">
                                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full h-16 bg-slate-900 border-white/10 border-2 rounded-2xl px-6 text-white font-black text-2xl uppercase italic tracking-tighter" />
                                    <div className="relative w-full aspect-[16/10] rounded-[2rem] overflow-hidden group border border-white/10">
                                        {editImage ? (
                                            <img src={editImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                                                <span className="material-symbols-outlined text-6xl">no_photography</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={handleRegenerateImage} disabled={isRegeneratingImage} className="h-12 px-6 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-2xl active:scale-95 disabled:opacity-50">{isRegeneratingImage ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">photo_camera</span>} REFAZER FOTO</button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-2 mb-1">TAGS:</p>
                                        <textarea value={editTags} onChange={e => setEditTags(e.target.value)} className="w-full h-24 bg-slate-900 border-white/10 border rounded-2xl p-5 text-white text-[12px] font-bold resize-none" placeholder="tags, separadas por virgula..." />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-2 mb-1">LEADS:</p>
                                        <textarea value={editLeads} onChange={e => setEditLeads(e.target.value)} className="w-full h-24 bg-slate-900 border-white/10 border rounded-2xl p-5 text-white text-[12px] font-bold resize-none" placeholder="leads, separadas por virgula..." />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-2 mb-1">INGREDIENTES:</p>
                                        <textarea value={editIngredients} onChange={e => setEditIngredients(e.target.value)} className="w-full h-[300px] bg-slate-900 border-white/10 border rounded-3xl p-6 text-slate-200 font-medium text-base" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-2 mb-1">MODO DE PREPARO:</p>
                                        <textarea value={editInstructions} onChange={e => setEditInstructions(e.target.value)} className="w-full h-[300px] bg-slate-900 border-white/10 border rounded-3xl p-6 text-slate-200 font-medium text-base" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
