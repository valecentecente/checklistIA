
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useApp, callGenAIWithRetry } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { FullRecipe } from '../types';

interface FactoryLog {
    text: string;
    type: 'info' | 'error' | 'success' | 'separator' | 'warning';
}

export const AdminContentFactoryModal: React.FC = () => {
    const { isContentFactoryModalOpen, closeModal, showToast, generateKeywords } = useApp();
    const { user } = useAuth();
    const [category, setCategory] = useState('Sobremesas');
    const [quantity, setQuantity] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<FactoryLog[]>([]);
    const [shouldStop, setShouldStop] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const isGuest = user?.uid?.startsWith('offline-user-');
    const isFirebaseAuthenticated = !!auth?.currentUser;

    const baseCategories = [
        "Sobremesas", "Massas", "Fit / Saudável", "Vegano", "Drinks", 
        "Bolos", "Carnes", "Aves", "Peixes", "Lanches", "Sopas", "Brasileira Clássica"
    ];

    const categoriesOptions = ["--- TODAS AS CATEGORIAS ---", ...baseCategories];
    const apiKey = process.env.API_KEY as string;

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (msg: string, type: 'info' | 'error' | 'success' | 'separator' | 'warning' = 'info') => {
        setLogs(prev => [...prev, { text: msg, type }]);
    };

    const compressImage = (base64Str: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                } else {
                    resolve(base64Str);
                }
            };
            img.onerror = () => resolve(base64Str);
        });
    };

    const handleStart = async () => {
        if (!apiKey) {
            showToast("Erro: API Key não encontrada.");
            return;
        }

        if (isGuest || !isFirebaseAuthenticated) {
            showToast("Erro: Faça login real para usar a fábrica.");
            return;
        }

        setIsGenerating(true);
        setShouldStop(false);
        setLogs([]);
        setProgress(0);

        const categoriesToProcess = category === "--- TODAS AS CATEGORIAS ---" ? baseCategories : [category];
        addLog(`--- INICIANDO FÁBRICA: MODO ${category === "--- TODAS AS CATEGORIAS ---" ? "LOTE" : "ÚNICO"} ---`, 'separator');

        try {
            const ai = new GoogleGenAI({ apiKey });
            
            for (const currentCat of categoriesToProcess) {
                if (shouldStop) break;
                
                addLog(`PROCESSO: Iniciando Categoria [${currentCat}]`, 'separator');
                
                const listPrompt = `Gere uma lista JSON com ${quantity} nomes das receitas mais populares da categoria "${currentCat}" no Brasil. Retorne apenas o JSON array de strings.`;

                const listResponse = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: listPrompt,
                    config: { responseMimeType: "application/json" }
                }));

                const recipeNames: string[] = JSON.parse(listResponse.text || "[]");
                addLog(`Lista recebida: ${recipeNames.length} pratos identificados.`, 'info');

                for (let i = 0; i < recipeNames.length; i++) {
                    if (shouldStop) break;

                    const name = recipeNames[i];
                    const docId = name.trim().toLowerCase().replace(/[\/\s]+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);
                    
                    if (db) {
                        const docRef = doc(db, 'global_recipes', docId);
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                            addLog(`> [${i+1}/${recipeNames.length}] ${name} já existe. Pulando...`, 'info');
                            continue;
                        }
                    }
                    
                    addLog(`> [${i+1}/${recipeNames.length}] Gerando: ${name}...`, 'info');
                    
                    try {
                        const detailPrompt = `Gere a receita completa para "${name}" em JSON. Inclua 3 a 5 tags. 
                        Formato: { "name": "${name}", "ingredients": [{"simplifiedName": "x", "detailedName": "y"}], "instructions": [], "imageQuery": "v", "prepTimeInMinutes": 30, "difficulty": "Fácil", "cost": "Médio", "isAlcoholic": false, "tags": ["tag1"] }`;

                        const detailRes = await callGenAIWithRetry(() => ai.models.generateContent({
                            model: 'gemini-3-flash-preview',
                            contents: detailPrompt,
                            config: { responseMimeType: "application/json" }
                        }));

                        const recipeData = JSON.parse(detailRes.text || "{}");
                        
                        const imageRes: any = await callGenAIWithRetry(() => ai.models.generateContent({
                            model: 'gemini-2.5-flash-image',
                            contents: { parts: [{ text: `Foto profissional de culinária: ${recipeData.imageQuery || name}` }] },
                            config: { responseModalities: [Modality.IMAGE] }
                        }));

                        let imageUrl = null;
                        if (imageRes.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                            const rawBase64 = imageRes.candidates[0].content.parts[0].inlineData.data;
                            imageUrl = await compressImage(`data:image/jpeg;base64,${rawBase64}`);
                        }

                        const finalTags = Array.from(new Set([
                            ...(recipeData.tags || []), 
                            currentCat.toLowerCase(), 
                            'factory_generated'
                        ]));

                        if (db) {
                            await setDoc(doc(db, 'global_recipes', docId), {
                                ...recipeData,
                                imageUrl,
                                imageSource: 'genai',
                                keywords: generateKeywords(name),
                                tags: finalTags,
                                createdAt: serverTimestamp()
                            }, { merge: true });
                            addLog(`> SUCESSO: ${name} salvo.`, 'success');
                        }

                    } catch (err: any) {
                        let errorMsg = err.message || 'Erro desconhecido';
                        addLog(`> ERRO em ${name}: ${errorMsg}`, 'error');
                        
                        if (errorMsg.includes('403') || errorMsg.includes('API key')) {
                            addLog("ERRO CRÍTICO: Chave de API rejeitada ou revogada pelo Google.", "error");
                            setShouldStop(true);
                            break;
                        }
                    }
                    
                    const totalItems = categoriesToProcess.length * quantity;
                    const itemsProcessedSoFar = (categoriesToProcess.indexOf(currentCat) * quantity) + (i + 1);
                    setProgress((itemsProcessedSoFar / totalItems) * 100);
                    
                    if (i < recipeNames.length - 1) {
                        await new Promise(r => setTimeout(r, 8000));
                    }
                }
                
                if (categoriesToProcess.indexOf(currentCat) < categoriesToProcess.length - 1 && !shouldStop) {
                    addLog("Pausa de transição entre categorias (15s)...", "warning");
                    await new Promise(r => setTimeout(r, 15000));
                }
            }

            addLog(`--- PROCESSO CONCLUÍDO ---`, 'separator');

        } catch (error: any) {
            addLog(`ERRO NO SISTEMA: ${error.message}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isContentFactoryModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('contentFactory')}>
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
                
                <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-400">factory</span>
                        Fábrica de Conteúdo (Safe Mode)
                    </h2>
                    <button onClick={() => closeModal('contentFactory')} className="text-gray-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-4 bg-slate-800/50 flex gap-4 items-end border-b border-slate-700">
                    <div className="flex-1">
                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Categoria</label>
                        <select 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            disabled={isGenerating}
                            className="w-full bg-slate-700 text-white border-slate-600 rounded-lg h-10 px-3 text-sm"
                        >
                            {categoriesOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Qtd / Cat</label>
                        <input 
                            type="number" 
                            value={quantity} 
                            onChange={e => setQuantity(parseInt(e.target.value))}
                            disabled={isGenerating}
                            min={1} max={50}
                            className="w-full bg-slate-700 text-white border-slate-600 rounded-lg h-10 px-3"
                        />
                    </div>
                    <button 
                        onClick={isGenerating ? () => setShouldStop(true) : handleStart}
                        className={`h-10 px-6 rounded-lg font-bold flex items-center gap-2 transition-colors ${isGenerating ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className="material-symbols-outlined">{isGenerating ? 'stop' : 'play_arrow'}</span>
                        {isGenerating ? 'Parar' : 'Iniciar'}
                    </button>
                </div>

                {isGenerating && (
                    <div className="h-1 bg-slate-700 w-full">
                        <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                )}

                <div className="flex-1 bg-black p-4 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-hide">
                    {logs.map((log, i) => (
                        <p key={i} className={`break-words ${
                            log.type === 'error' ? 'text-red-500 font-bold bg-red-500/10 p-1 rounded' : 
                            log.type === 'success' ? 'text-green-400' : 
                            log.type === 'warning' ? 'text-yellow-500 italic' : 
                            log.type === 'separator' ? 'text-blue-400 pt-2 border-t border-slate-800 font-bold' : 
                            'text-gray-400'
                        }`}>
                            {log.text}
                        </p>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};
