
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp, callGenAIWithRetry } from '../contexts/AppContext';
import type { FullRecipe } from '../types';

export const AdminContentFactoryModal: React.FC = () => {
    const { isContentFactoryModalOpen, closeModal, showToast, generateKeywords } = useApp();
    const [category, setCategory] = useState('Sobremesas');
    const [quantity, setQuantity] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [shouldStop, setShouldStop] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const categories = [
        "Sobremesas", "Massas", "Fit / Saudável", "Vegano", "Drinks", 
        "Bolos", "Carnes", "Aves", "Peixes", "Lanches", "Sopas", "Brasileira Clássica"
    ];

    const apiKey = process.env.API_KEY as string;

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleStart = async () => {
        if (!apiKey) {
            showToast("Erro: API Key não encontrada.");
            return;
        }

        setIsGenerating(true);
        setShouldStop(false);
        setLogs([]);
        setProgress(0);
        addLog(`Iniciando fábrica para ${quantity} receitas de ${category}...`);

        try {
            const ai = new GoogleGenAI({ apiKey });

            // 1. Obter lista de nomes
            // AJUSTE: Foco em popularidade e tradição para preencher a base com o essencial primeiro
            addLog("Solicitando lista de nomes populares à IA...");
            const listPrompt = `Gere uma lista JSON com ${quantity} nomes das receitas mais populares, tradicionais e buscadas no Brasil da categoria "${category}".
            Evite variações muito exóticas, foque no que as pessoas comem no dia a dia.
            Retorne apenas o JSON: ["Nome 1", "Nome 2", ...]`;

            const listResponse = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: listPrompt,
                config: { responseMimeType: "application/json" }
            }));

            const recipeNames: string[] = JSON.parse(listResponse.text || "[]");
            addLog(`Lista recebida: ${recipeNames.length} itens.`);

            // 2. Processar cada item
            for (let i = 0; i < recipeNames.length; i++) {
                if (shouldStop) {
                    addLog("Processo interrompido pelo usuário.");
                    break;
                }

                const name = recipeNames[i];
                
                // --- TRAVA DE SEGURANÇA (VERIFICAÇÃO DE DUPLICIDADE) ---
                // Calcula o ID exatamente como seria salvo
                const docId = name.trim().toLowerCase().replace(/[\/\s]+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);
                
                if (db) {
                    try {
                        const docRef = doc(db, 'global_recipes', docId);
                        const docSnap = await getDoc(docRef);
                        
                        if (docSnap.exists()) {
                            addLog(`[${i+1}/${recipeNames.length}] ${name}: JÁ EXISTE NO ACERVO. Pulando... (Economia: 100%)`);
                            setProgress(((i + 1) / recipeNames.length) * 100);
                            continue; // PULA PARA O PRÓXIMO ITEM DO LOOP
                        }
                    } catch (e) {
                        console.warn("Erro ao verificar duplicidade, tentando gerar mesmo assim...", e);
                    }
                }
                
                // Se chegou aqui, é novo. Prossegue com a geração.
                addLog(`[${i+1}/${recipeNames.length}] Gerando: ${name}...`);

                try {
                    // Delay artificial para respeitar taxa (Rate Limit)
                    await new Promise(r => setTimeout(r, 2000)); // 2s de pausa

                    // Gera Detalhes da Receita (INCLUINDO isAlcoholic)
                    const detailPrompt = `Gere a receita completa para "${name}" em JSON.
                    Determine se é uma bebida alcoólica (para maiores de 18 anos).
                    Formato: { "name": "${name}", "ingredients": [{"simplifiedName": "x", "detailedName": "y"}], "instructions": [], "imageQuery": "descrição visual", "prepTimeInMinutes": 30, "difficulty": "Fácil", "cost": "Médio", "isAlcoholic": boolean }
                    (isAlcoholic: true se for bebida alcoólica, false caso contrário)`;

                    const detailRes = await callGenAIWithRetry(() => ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: detailPrompt,
                        config: { responseMimeType: "application/json" }
                    }));

                    const recipeData = JSON.parse(detailRes.text || "{}");
                    
                    // Gera Imagem
                    addLog(`   > Gerando foto para: ${name}`);
                    const imageRes: any = await callGenAIWithRetry(() => ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts: [{ text: `Foto profissional de comida: ${recipeData.imageQuery || name}` }] },
                        config: { responseModalities: [Modality.IMAGE] }
                    }));

                    let imageUrl = null;
                    if (imageRes.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                        const base64 = imageRes.candidates[0].content.parts[0].inlineData.data;
                        const mime = imageRes.candidates[0].content.parts[0].inlineData.mimeType;
                        imageUrl = `data:${mime};base64,${base64}`;
                    }

                    const keywords = generateKeywords(name);
                    const tags = [category.toLowerCase(), 'factory_generated'];

                    const fullRecipe: FullRecipe = {
                        ...recipeData,
                        imageUrl: imageUrl, 
                        imageSource: 'genai',
                        keywords,
                        tags
                    };

                    if (db) {
                        await setDoc(doc(db, 'global_recipes', docId), {
                            ...fullRecipe,
                            createdAt: serverTimestamp()
                        }, { merge: true });
                        addLog(`   > Salvo no DB com sucesso!`);
                    }

                    setProgress(((i + 1) / recipeNames.length) * 100);

                } catch (err: any) {
                    console.error(err);
                    addLog(`   > Erro ao gerar ${name}: ${err.message}`);
                }
            }

            addLog("Processo finalizado!");
            showToast("Fábrica finalizou o lote.");

        } catch (error: any) {
            console.error(error);
            addLog(`Erro fatal: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStop = () => {
        setShouldStop(true);
        setIsGenerating(false);
        addLog("Parando...");
    };

    if (!isContentFactoryModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" onClick={() => closeModal('contentFactory')}>
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-400">factory</span>
                        Fábrica de Conteúdo (Admin)
                    </h2>
                    <button onClick={() => closeModal('contentFactory')} className="text-gray-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Controls */}
                <div className="p-4 bg-slate-800/50 flex gap-4 items-end border-b border-slate-700">
                    <div className="flex-1">
                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Categoria</label>
                        <select 
                            value={category} 
                            onChange={e => setCategory(e.target.value)}
                            disabled={isGenerating}
                            className="w-full bg-slate-700 text-white border-slate-600 rounded-lg h-10 px-3"
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="w-24">
                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Qtd</label>
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
                        onClick={isGenerating ? handleStop : handleStart}
                        className={`h-10 px-6 rounded-lg font-bold flex items-center gap-2 transition-colors ${isGenerating ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                        <span className="material-symbols-outlined">{isGenerating ? 'stop' : 'play_arrow'}</span>
                        {isGenerating ? 'Parar' : 'Iniciar'}
                    </button>
                </div>

                {/* Progress Bar */}
                {isGenerating && (
                    <div className="h-1 bg-slate-700 w-full">
                        <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                )}

                {/* Logs Console */}
                <div className="flex-1 bg-black p-4 overflow-y-auto font-mono text-xs text-green-400 space-y-1">
                    {logs.length === 0 && <p className="text-gray-600 italic">Aguardando comando...</p>}
                    {logs.map((log, i) => (
                        <p key={i} className="break-words border-b border-white/5 pb-0.5">{log}</p>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};
