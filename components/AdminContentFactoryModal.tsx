import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp, callGenAIWithRetry, generateKeywords } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { FullRecipe, SalesOpportunity } from '../types';

interface FactoryLog {
    text: string;
    type: 'info' | 'error' | 'success' | 'warning';
}

interface RecipeWithId extends FullRecipe {
    id: string;
    isBroken: boolean;
}

const FACTORY_CATEGORIES = [
    "🍎 Hortifruti", "🥩 Açougue", "🥛 Laticínios", "🍞 Padaria", "🛒 Mercearia", 
    "💧 Bebidas", "🍰 Sobremesas", "🥗 Saudável/Fit", "🌬️ Airfryer", "🍳 Café da Manhã",
    "🍝 Massas/Pizzas", "🍹 Drinks/Coquetéis"
];

const ignorePermissionError = (err: any) => {
    return err.code === 'permission-denied' || (err.message && err.message.includes('Missing or insufficient permissions'));
};

const getRecipeDocId = (name: string) => {
    if (!name) return 'recipe-' + Date.now();
    return name.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[\/\s]+/g, '-') 
        .replace(/[^a-z0-9-]/g, '') 
        .slice(0, 80);
};

export const AdminContentFactoryModal: React.FC = () => {
    const { isContentFactoryModalOpen, closeModal, showToast, isAdmin } = useApp();
    const { user } = useAuth();
    
    // Estados de UI
    const [activeTab, setActiveTab] = useState<'producao' | 'acervo' | 'leads'>('producao');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados de Produção
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [qtyPerCategory, setQtyPerCategory] = useState(1);
    const [manualTitles, setManualTitles] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [logs, setLogs] = useState<FactoryLog[]>([]);
    const [shouldStop, setShouldStop] = useState(false);
    const stopSignalRef = useRef(false);
    
    // Estados do Acervo
    const [recipes, setRecipes] = useState<RecipeWithId[]>([]);
    const [isLoadingAcervo, setIsLoadingAcervo] = useState(true);
    const [pendingLeads, setPendingLeads] = useState<SalesOpportunity[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    // Estados do Editor
    const [editingRecipe, setEditingRecipe] = useState<RecipeWithId | null>(null);
    const [editName, setEditName] = useState('');
    const [editIngredients, setEditIngredients] = useState('');
    const [editInstructions, setEditInstructions] = useState('');
    const [editTags, setEditTags] = useState('');
    const [editLeads, setEditLeads] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const apiKey = process.env.API_KEY as string;

    const checkRecipeIntegrity = (r: FullRecipe): boolean => {
        return !!(
            r.imageUrl && r.imageUrl.length > 50 &&
            r.ingredients && r.ingredients.length > 0 &&
            r.instructions && r.instructions.length > 0 &&
            r.tags && r.tags.length > 0
        );
    };

    const addLog = (text: string, type: FactoryLog['type'] = 'info') => {
        setLogs(prev => [...prev, { text, type }]);
    };

    // Função de Jitter para Humanização
    const waitRandom = (min: number, max: number) => {
        const ms = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    // Função para comprimir imagem Base64 e evitar erro de limite do Firestore (1MB)
    const compressBase64Image = (base64Str: string, maxWidth: number = 1024, quality: number = 0.75): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Canvas context failed"));

                ctx.drawImage(img, 0, 0, width, height);
                // Retorna como JPEG para máxima compressão
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (e) => reject(e);
        });
    };

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    useEffect(() => {
        if (!isContentFactoryModalOpen || !db || !isAdmin) return;

        setIsLoadingAcervo(true);
        const qRecipes = query(collection(db, 'global_recipes'), limit(2000));
        const unsubRecipes = onSnapshot(qRecipes, 
            (snap) => {
                const data = snap.docs.map(d => {
                    const rData = d.data() as FullRecipe;
                    return { ...rData, id: d.id, isBroken: !checkRecipeIntegrity(rData) } as RecipeWithId;
                });
                
                data.sort((a,b) => {
                    if (a.isBroken && !b.isBroken) return 1;
                    if (!a.isBroken && b.isBroken) return -1;
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                });
                
                setRecipes(data);
                setIsLoadingAcervo(false);
            }, 
            (error) => {
                if (!ignorePermissionError(error)) console.warn("[Factory] Erro Acervo:", error.message);
                setIsLoadingAcervo(false);
            }
        );

        const qLeads = query(collection(db, 'sales_opportunities'), where('status', '==', 'pending'), limit(100));
        const unsubLeads = onSnapshot(qLeads, 
            (snap) => setPendingLeads(snap.docs.map(d => ({ ...d.data(), id: d.id } as SalesOpportunity))),
            (error) => { if (!ignorePermissionError(error)) console.warn("[Factory] Erro Leads:", error.message); }
        );

        return () => { unsubRecipes(); unsubLeads(); };
    }, [isContentFactoryModalOpen, isAdmin]);

    const runBatchProduction = async () => {
        const manualList = manualTitles.split('\n').map(t => t.trim()).filter(t => t);
        if (manualList.length === 0 && selectedCategories.length === 0) {
            showToast("Selecione categorias ou digite títulos.");
            return;
        }

        setIsGenerating(true);
        setShouldStop(false);
        stopSignalRef.current = false;
        setLogs([{ text: "🛡️ MODO BLINDAGEM HUMANA ATIVO", type: 'warning' }]);
        addLog("Iniciando produção com padrões de tráfego orgânico...");
        
        const ai = new GoogleGenAI({ apiKey });
        let masterQueue: string[] = [...manualList];

        // ETAPA 1: Gerar nomes por categoria se necessário
        if (selectedCategories.length > 0) {
            addLog(`[IA] Planejando ${qtyPerCategory} pratos para cada nicho selecionado...`, 'info');
            for (const cat of selectedCategories) {
                if (stopSignalRef.current) break;
                try {
                    const promptNames = `Você é um curador gastronômico. Gere uma lista com EXATAMENTE ${qtyPerCategory} nomes de receitas famosas, deliciosas e gourmet para a categoria de mercado: "${cat}". Retorne apenas um JSON array de strings. Ex: ["Nome 1", "Nome 2"]`;
                    const res = await callGenAIWithRetry(() => ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: promptNames,
                        config: { responseMimeType: "application/json" }
                    }));
                    const categoryTitles = JSON.parse(res.text || "[]") as string[];
                    masterQueue = [...masterQueue, ...categoryTitles];
                    addLog(`Curadoria ${cat}: ${categoryTitles.length} itens encontrados.`, 'success');
                    
                    // Human Delay após "pensar" na categoria
                    await waitRandom(2000, 5000);
                } catch (e: any) {
                    addLog(`Erro na curadoria de ${cat}: ${e.message}`, 'error');
                }
            }
        }

        // Remover duplicatas exatas da fila antes de começar
        masterQueue = Array.from(new Set(masterQueue));
        addLog(`📋 FILA TOTAL: ${masterQueue.length} RECEITAS`, 'info');

        // ETAPA 2: Produção em Lote "Humanizada"
        for (let i = 0; i < masterQueue.length; i++) {
            if (stopSignalRef.current) {
                addLog("⚠️ Produção interrompida manualmente.", 'warning');
                break;
            }

            const title = masterQueue[i];
            const docId = getRecipeDocId(title);
            
            addLog(`[${i + 1}/${masterQueue.length}] Verificando acervo: ${title.toUpperCase()}`, 'info');

            // TRAVA DE INTELIGÊNCIA: Verificar se já existe e está completa
            try {
                const existingDoc = await getDoc(doc(db!, 'global_recipes', docId));
                if (existingDoc.exists()) {
                    const data = existingDoc.data() as FullRecipe;
                    if (checkRecipeIntegrity(data)) {
                        addLog(`✨ "${title}" já está impecável no acervo. Pulando...`, 'success');
                        continue; // Pula para a próxima sem gastar créditos
                    } else {
                        addLog(`⚠️ "${title}" existe mas está incompleta. Reconstruindo...`, 'warning');
                    }
                }
            } catch (e) {
                addLog(`Erro ao consultar banco: ${title}. Tentando gerar...`, 'warning');
            }

            try {
                // 1. Geração de Texto (Receita)
                const systemPrompt = `Gere uma receita brasileira completa para: "${title}".
                Formato JSON: {
                    "name": "${title}",
                    "ingredients": [{"simplifiedName": "Arroz", "detailedName": "2 xícaras de arroz"}],
                    "instructions": ["Passo 1..."],
                    "imageQuery": "Apetizing food photography of ${title}, studio light",
                    "servings": "4 porções",
                    "prepTimeInMinutes": 45,
                    "difficulty": "Médio",
                    "cost": "Médio",
                    "tags": ["caseiro", "almoço", "brasileiro"],
                    "suggestedLeads": ["panela", "faca"]
                }`;

                const textRes = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: systemPrompt,
                    config: { responseMimeType: "application/json" }
                }));

                const details = JSON.parse(textRes.text || "{}");
                
                // Human Delay: Simula tempo de leitura da receita gerada
                addLog("Revisando ingredientes e passos...");
                await waitRandom(3000, 6000);

                // 2. Geração de Imagem
                addLog("Preparando estúdio fotográfico IA...");
                const imgRes: any = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: details.imageQuery || `High-end food photography of ${title}, ultra-realistic, 4k.` }] }
                }));

                let finalImageUrl = "";
                for (const part of imgRes.candidates[0].content.parts) {
                    if (part.inlineData) {
                        // Comprimindo a imagem para caber no limite do Firestore (1MB)
                        addLog("[IA] Otimizando fotografia para o banco...");
                        const rawBase64 = `data:image/jpeg;base64,${part.inlineData.data}`;
                        finalImageUrl = await compressBase64Image(rawBase64);
                        break;
                    }
                }

                const finalData = { 
                    ...details, 
                    imageUrl: finalImageUrl, 
                    imageSource: 'genai', 
                    keywords: generateKeywords(details.name || title),
                    createdAt: serverTimestamp() 
                };

                await setDoc(doc(db!, 'global_recipes', docId), finalData, { merge: true });
                addLog(`✅ [${i+1}/${masterQueue.length}] "${title}" finalizada!`, 'success');

                // Human Delay: Tempo de descanso após finalizar um prato completo
                if (i < masterQueue.length - 1) {
                    addLog("Aguardando próximo pedido (Padrão Humano)...");
                    await waitRandom(8000, 15000); // Entre 8 e 15 segundos de intervalo entre pratos
                }

            } catch (err: any) {
                addLog(`❌ Falha em "${title}": ${err.message}`, 'error');
                await waitRandom(5000, 10000); // Delay extra em caso de erro para não spammar
            }
        }

        addLog("🏁 PROCESSO FINALIZADO COM SEGURANÇA", 'success');
        setIsGenerating(false);
        setShouldStop(false);
        stopSignalRef.current = false;
        setSelectedCategories([]);
        setManualTitles("");
    };

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const handleOpenEditor = (recipe: RecipeWithId) => {
        setEditingRecipe(recipe);
        setEditName(recipe.name || '');
        setEditIngredients(recipe.ingredients?.map(i => i.detailedName).join('\n') || '');
        setEditInstructions(recipe.instructions?.join('\n') || '');
        setEditTags(recipe.tags?.join(', ') || '');
        setEditLeads(recipe.suggestedLeads?.join(', ') || '');
    };

    const handleSaveRecipe = async () => {
        if (!editingRecipe || isSaving) return;
        setIsSaving(true);
        try {
            const ingredientsArray = editIngredients.split('\n').filter(l => l.trim()).map(line => ({ simplifiedName: line.split(' ').slice(0, 2).join(' '), detailedName: line.trim() }));
            const instructionsArray = editInstructions.split('\n').filter(l => l.trim());
            const tagsArray = editTags.split(',').map(t => t.trim()).filter(t => t);
            const leadsArray = editLeads.split(',').map(l => l.trim()).filter(l => l);
            await updateDoc(doc(db!, 'global_recipes', editingRecipe.id), { name: editName, ingredients: ingredientsArray, instructions: instructionsArray, tags: tagsArray, suggestedLeads: leadsArray, keywords: generateKeywords(editName), updatedAt: serverTimestamp() });
            showToast("Atualizado!");
            setEditingRecipe(null);
        } catch (e) { showToast("Erro."); } finally { setIsSaving(false); }
    };

    const filteredRecipes = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return recipes.filter(r => (r.name?.toLowerCase().includes(term)) || (r.tags?.some(t => t.toLowerCase().includes(term))));
    }, [recipes, searchTerm]);

    const brokenCount = useMemo(() => recipes.filter(r => r.isBroken).length, [recipes]);

    if (!isContentFactoryModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('contentFactory')}>
            <div className="bg-[#0f172a] w-full max-w-7xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                
                <div className="p-6 bg-slate-800 border-b border-white/5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400"><span className="material-symbols-outlined">factory</span></div>
                        <h2 className="text-white font-black text-xl uppercase italic tracking-tighter">Fábrica de Conteúdo</h2>
                    </div>
                    <button onClick={() => closeModal('contentFactory')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="flex bg-slate-900 shrink-0 border-b border-white/5 px-4">
                    <button onClick={() => setActiveTab('producao')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'producao' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}`}>Produção Lote</button>
                    <button onClick={() => setActiveTab('acervo')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'acervo' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>Acervo Global ({recipes.length})</button>
                    <button onClick={() => setActiveTab('leads')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'leads' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-gray-300'}`}>IA Leads ({pendingLeads.length})</button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col relative">
                    {activeTab === 'producao' && (
                        <div className="flex-1 flex gap-6 p-8 animate-fadeIn overflow-hidden">
                            
                            {/* CONFIGURAÇÃO À ESQUERDA */}
                            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-hide">
                                
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">1. Selecionar Nichos de Corredor</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {FACTORY_CATEGORIES.map(cat => (
                                            <button 
                                                key={cat}
                                                onClick={() => toggleCategory(cat)}
                                                className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedCategories.includes(cat) ? 'bg-green-600 border-green-400 text-white shadow-lg scale-95' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/20'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">2. Qtd por Categoria</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="50" 
                                            value={qtyPerCategory}
                                            onChange={e => setQtyPerCategory(Number(e.target.value))}
                                            className="w-full h-14 bg-slate-900 border-white/5 rounded-2xl px-6 text-white font-black text-xl outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">3. Produzir agora?</label>
                                        {isGenerating ? (
                                            <button onClick={() => { setShouldStop(true); stopSignalRef.current = true; }} className="w-full h-14 bg-red-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl animate-pulse">Interromper Lote</button>
                                        ) : (
                                            <button onClick={runBatchProduction} className="w-full h-14 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs rounded-2xl shadow-xl active:scale-95 transition-all">Ligar Máquina IA</button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 flex-1 flex flex-col min-h-[150px]">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">4. Pedidos Manuais (Opcional - Um por linha)</label>
                                    <textarea 
                                        className="flex-1 w-full bg-slate-900 border-white/5 rounded-2xl p-6 text-white font-bold resize-none focus:ring-2 focus:ring-green-500 outline-none placeholder:text-slate-700"
                                        placeholder="Ex: Torta Holandesa de Nutella&#10;Pão de Fermentação Natural..."
                                        value={manualTitles}
                                        onChange={e => setManualTitles(e.target.value)}
                                        disabled={isGenerating}
                                    />
                                </div>
                            </div>

                            {/* CONSOLE À DIREITA */}
                            <div className="w-96 bg-black/40 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden">
                                <div className="p-4 bg-slate-800/50 border-b border-white/5 flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IA Console v4.2 (Otimizado)</span>
                                    <span className={`h-2 w-2 rounded-full ${isGenerating ? 'bg-green-500 animate-pulse shadow-[0_0_10px_green]' : 'bg-slate-600'}`}></span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px] scrollbar-hide bg-slate-950/50">
                                    {logs.length === 0 && <p className="text-slate-700 italic">Aguardando comando de produção...</p>}
                                    {logs.map((log, i) => (
                                        <div key={i} className={`p-2 rounded-lg ${ log.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : log.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : log.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : 'text-slate-400' }`}>
                                            {log.text}
                                        </div>
                                    ))}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'acervo' && (
                        <div className="flex flex-col h-full animate-fadeIn">
                            <div className="p-6 bg-slate-900 border-b border-white/5 flex gap-4">
                                <input type="text" placeholder="Filtrar receitas no acervo global..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 h-12 bg-slate-800 border-0 rounded-xl pl-5 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                                <div className="px-4 bg-red-500/10 rounded-xl flex items-center gap-2 border border-red-500/20">
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Incompletas: {brokenCount}</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 scrollbar-hide">
                                {isLoadingAcervo ? (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                                        <div className="h-10 w-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Sincronizando Banco...</p>
                                    </div>
                                ) : filteredRecipes.map(r => (
                                    <div key={r.id} onClick={() => handleOpenEditor(r)} className={`rounded-3xl border overflow-hidden cursor-pointer group transition-all shadow-xl min-h-[180px] w-full flex flex-col relative ${r.isBroken ? 'bg-red-500/5 border-red-500/30' : 'bg-slate-800 border-white/5 hover:border-blue-500/50'}`}>
                                        <div className="aspect-square w-full bg-slate-900 relative shrink-0 overflow-hidden">
                                            {r.imageUrl ? (
                                                <img src={r.imageUrl} className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${r.isBroken ? 'grayscale' : ''}`} />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-slate-700"><span className="material-symbols-outlined text-4xl">no_photography</span></div>
                                            )}
                                            {r.isBroken && <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase shadow-lg">Incompleto</div>}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="material-symbols-outlined text-white text-3xl">edit</span></div>
                                        </div>
                                        <div className="p-4 flex-1 flex items-center"><h3 className={`font-black uppercase text-[10px] truncate ${r.isBroken ? 'text-red-300' : 'text-white'}`}>{r.name}</h3></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'leads' && (
                        <div className="flex-1 overflow-y-auto p-8 animate-fadeIn scrollbar-hide">
                            {pendingLeads.length === 0 ? ( 
                                <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                                    <span className="material-symbols-outlined text-6xl mb-4 opacity-20">analytics</span>
                                    <p className="font-bold">Nenhum lead de busca pendente.</p>
                                </div> 
                            ) : ( 
                                <div className="grid gap-4">
                                    {pendingLeads.map(lead => ( 
                                        <div key={lead.id} className="bg-slate-800 p-5 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-orange-500/30 transition-colors">
                                            <div>
                                                <h3 className="text-white font-black text-lg italic uppercase">{lead.term}</h3>
                                                <p className="text-slate-500 text-xs">Origem da Falta: {lead.recipeName}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => updateDoc(doc(db!, 'sales_opportunities', lead.id), { status: 'dismissed' })} className="h-10 w-10 rounded-xl bg-slate-700 text-slate-400 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all"><span className="material-symbols-outlined">close</span></button>
                                                <button onClick={() => { setManualTitles(lead.term); setActiveTab('producao'); }} className="px-6 h-10 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase hover:bg-blue-700 transition-all shadow-lg">Produzir Item</button>
                                            </div>
                                        </div> 
                                    ))}
                                </div> 
                            )}
                        </div>
                    )}

                    {editingRecipe && (
                        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col animate-fadeIn">
                            <div className="p-6 bg-slate-900 border-b border-white/10 flex justify-between items-center shrink-0"><button onClick={() => setEditingRecipe(null)} className="h-10 w-10 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-400"><span className="material-symbols-outlined">arrow_back</span></button><button onClick={handleSaveRecipe} disabled={isSaving} className="h-12 px-8 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg">{isSaving ? 'Salvando...' : 'Confirmar Alterações'}</button></div>
                            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 scrollbar-hide"><div className="space-y-6">{editingRecipe.imageUrl && <img src={editingRecipe.imageUrl} className="w-full aspect-video rounded-[2.5rem] object-cover border border-white/5 shadow-2xl" />}<div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Título</label><input value={editName} onChange={e => setEditName(e.target.value)} className="w-full h-14 bg-slate-900 border-white/10 rounded-2xl px-5 text-white font-black text-xl" /></div><div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Ingredientes</label><textarea value={editIngredients} onChange={e => setEditIngredients(e.target.value)} className="w-full h-64 bg-slate-900 border-white/10 rounded-3xl p-6 text-slate-300 font-medium text-sm resize-none" /></div></div><div className="space-y-6"><div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Modo de Preparo</label><textarea value={editInstructions} onChange={e => setEditInstructions(e.target.value)} className="w-full h-[32rem] bg-slate-900 border-white/10 rounded-3xl p-6 text-slate-300 font-medium text-sm resize-none" /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tags</label><textarea value={editTags} onChange={e => setEditTags(e.target.value)} className="w-full h-24 bg-slate-900 border-white/10 rounded-xl p-4 text-white text-[10px] font-bold" /></div><div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Leads</label><textarea value={editLeads} onChange={e => setEditLeads(e.target.value)} className="w-full h-24 bg-slate-900 border-white/10 rounded-xl p-4 text-white text-[10px] font-bold" /></div></div></div></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};