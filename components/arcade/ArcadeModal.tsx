
import React, { useState, useEffect, useRef } from 'react';
import { useApp, callGenAIWithRetry } from '../../contexts/AppContext'; // Imported retry logic
import { GoogleGenAI } from "@google/genai";
import type { FullRecipe } from '../../types';

// ==========================================
// GAME 1: SHOW DO CHEF (QUIZ)
// ==========================================
const ChefQuizGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const { getRandomCachedRecipe } = useApp();
    const [questionData, setQuestionData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [score, setScore] = useState(0);
    const [lifelines, setLifelines] = useState({ skip: true, hint: true });
    
    // Gera pergunta com IA
    const generateQuestion = async () => {
        setLoading(true);
        setSelectedAnswer(null);
        setIsCorrect(null);
        
        try {
            const recipe = getRandomCachedRecipe();
            if (!recipe) throw new Error("Sem receitas");

            const apiKey = process.env.API_KEY as string;
            const ai = new GoogleGenAI({ apiKey });
            
            const prompt = `Crie uma pergunta de quiz de culinária sobre: "${recipe.name}".
            Ingredientes: ${JSON.stringify(recipe.ingredients)}.
            A pergunta deve ser curiosa ou sobre ingredientes/preparo.
            Retorne JSON PURO: { "question": "texto", "options": ["errada", "certa", "errada", "errada"], "answerIndex": 1 }`;

            // Wrapped in retry logic for free tier stability
            const response = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            }));
            
            const data = JSON.parse(response.text || "{}");
            if (!data.question) throw new Error("Inválido");
            
            setQuestionData(data);
        } catch (e) {
            console.error(e);
            // Fallback simples se falhar (ex: sem internet ou erro persistente)
            setQuestionData({
                question: "Qual ingrediente é essencial no Pão de Queijo?",
                options: ["Farinha de Trigo", "Polvilho", "Fermento Biológico", "Aveia"],
                answerIndex: 1
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { generateQuestion(); }, []);

    const handleAnswer = (idx: number) => {
        if (selectedAnswer !== null) return;
        setSelectedAnswer(idx);
        const correct = idx === questionData.answerIndex;
        setIsCorrect(correct);
        if (correct) setScore(s => s + 100);
        
        setTimeout(() => {
            if (correct) generateQuestion();
            else { /* Game Over logic could go here */ }
        }, 2000);
    };

    const handleSkip = () => {
        if (!lifelines.skip) return;
        setLifelines(prev => ({ ...prev, skip: false }));
        generateQuestion();
    };

    return (
        <div className="flex flex-col h-full bg-indigo-900 text-white p-6 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
            
            {/* Header - Fixed Top */}
            <div className="flex justify-between items-center mb-4 relative z-10 shrink-0">
                <div className="flex flex-col">
                    <span className="text-xs text-indigo-300 font-bold uppercase">Pontuação</span>
                    <span className="text-2xl font-black text-yellow-400">{score}</span>
                </div>
                <button onClick={onExit} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><span className="material-symbols-outlined">close</span></button>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-pulse">
                    <div className="w-16 h-16 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin"></div>
                    <p className="text-indigo-200 text-sm">O Chef está pensando... (IA)</p>
                </div>
            ) : (
                // Scrollable Content Area
                <div className="flex-1 overflow-y-auto relative z-10 scrollbar-hide -mx-4 px-4">
                    <div className="min-h-full flex flex-col justify-center pb-6">
                        <div className="bg-white text-indigo-900 p-6 rounded-2xl shadow-xl mb-6 text-center font-bold text-lg border-b-4 border-indigo-200">
                            {questionData.question}
                        </div>

                        <div className="grid gap-3">
                            {questionData.options.map((opt: string, idx: number) => {
                                let bgClass = "bg-indigo-700 hover:bg-indigo-600";
                                if (selectedAnswer !== null) {
                                    if (idx === questionData.answerIndex) bgClass = "bg-green-500 animate-pulse";
                                    else if (idx === selectedAnswer) bgClass = "bg-red-500";
                                    else bgClass = "bg-indigo-800 opacity-50";
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(idx)}
                                        disabled={selectedAnswer !== null}
                                        className={`p-4 rounded-xl font-semibold text-left transition-all transform active:scale-[0.98] shadow-lg ${bgClass}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="opacity-50 font-mono mt-0.5 text-sm">{['A','B','C','D'][idx]}.</span>
                                            <span className="text-sm leading-snug">{opt}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Lifelines */}
                        <div className="flex justify-center gap-4 mt-8 shrink-0">
                            <button 
                                onClick={handleSkip} 
                                disabled={!lifelines.skip || selectedAnswer !== null}
                                className={`flex flex-col items-center gap-1 ${!lifelines.skip ? 'opacity-30 grayscale' : 'hover:scale-110 transition-transform'}`}
                            >
                                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg border-2 border-white">
                                    <span className="material-symbols-outlined">skip_next</span>
                                </div>
                                <span className="text-[10px] font-bold">Pular</span>
                            </button>
                        </div>
                    </div>
                    
                    {isCorrect === false && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm rounded-xl">
                            <div className="bg-white text-black p-6 rounded-2xl text-center animate-bounce-y mx-4 shadow-2xl">
                                <span className="material-symbols-outlined text-red-500 text-5xl mb-2">sentiment_sad</span>
                                <h3 className="font-bold text-xl mb-2">Que pena!</h3>
                                <p className="mb-4 text-sm">A resposta correta era: <br/><strong className="text-base text-green-600">{questionData.options[questionData.answerIndex]}</strong></p>
                                <button onClick={generateQuestion} className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-indigo-700">
                                    Próxima Pergunta
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ==========================================
// GAME 2: SLIDING PUZZLE
// ==========================================
const SlidingPuzzleGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const { getRandomCachedRecipe } = useApp();
    const [tiles, setTiles] = useState<number[]>([]);
    const [emptyIndex, setEmptyIndex] = useState(8);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isSolved, setIsSolved] = useState(false);
    const [moves, setMoves] = useState(0);

    // Initialize Puzzle
    useEffect(() => {
        const recipe = getRandomCachedRecipe();
        if (recipe && recipe.imageUrl) {
            setImageUrl(recipe.imageUrl);
        } else {
            // Fallback image
            setImageUrl("https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg"); 
        }
        startNewGame();
    }, []);

    const startNewGame = () => {
        const solved = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        // Simple shuffle that is solvable: make random valid moves from solved state
        let current = [...solved];
        let empty = 8;
        let lastMove = -1;

        for (let i = 0; i < 50; i++) {
            const neighbors = [];
            if (empty % 3 > 0) neighbors.push(empty - 1); // Left
            if (empty % 3 < 2) neighbors.push(empty + 1); // Right
            if (empty >= 3) neighbors.push(empty - 3);    // Up
            if (empty < 6) neighbors.push(empty + 3);     // Down
            
            // Avoid undoing the last move immediately
            const valid = neighbors.filter(n => n !== lastMove);
            const next = valid[Math.floor(Math.random() * valid.length)];
            
            [current[empty], current[next]] = [current[next], current[empty]];
            lastMove = empty;
            empty = next;
        }

        setTiles(current);
        setEmptyIndex(empty);
        setMoves(0);
        setIsSolved(false);
    };

    const handleTileClick = (index: number) => {
        if (isSolved) return;

        const isAdjacent = 
            (index === emptyIndex - 1 && emptyIndex % 3 !== 0) || // Left
            (index === emptyIndex + 1 && index % 3 !== 0) || // Right
            (index === emptyIndex - 3) || // Up
            (index === emptyIndex + 3);   // Down

        if (isAdjacent) {
            const newTiles = [...tiles];
            [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
            setTiles(newTiles);
            setEmptyIndex(index);
            setMoves(m => m + 1);
            checkWin(newTiles);
        }
    };

    const checkWin = (currentTiles: number[]) => {
        const win = currentTiles.every((val, idx) => val === idx);
        if (win) setIsSolved(true);
    };

    return (
        <div className="flex flex-col h-full bg-slate-800 text-white p-6 items-center">
            <div className="w-full flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-400">extension</span>
                    Cozinha Puzzle
                </h3>
                <button onClick={onExit} className="bg-white/10 p-2 rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="mb-4 text-center">
                <span className="bg-white/10 px-4 py-1 rounded-full text-sm font-mono">Movimentos: {moves}</span>
            </div>

            <div className="w-72 h-72 bg-slate-700 rounded-lg p-1 relative shadow-2xl">
                {imageUrl && (
                    <div className="grid grid-cols-3 gap-1 w-full h-full">
                        {tiles.map((tileNumber, index) => {
                            if (tileNumber === 8 && !isSolved) {
                                return <div key={index} className="bg-transparent" />;
                            }
                            
                            // Calculate background position based on the tile NUMBER (correct position)
                            // Width/Height of container = 100%. Each tile is 33.33%.
                            const row = Math.floor(tileNumber / 3);
                            const col = tileNumber % 3;
                            
                            return (
                                <div
                                    key={index}
                                    onClick={() => handleTileClick(index)}
                                    className={`w-full h-full cursor-pointer transition-transform active:scale-95 rounded-sm overflow-hidden border border-white/10 ${isSolved ? 'animate-pulse' : ''}`}
                                    style={{
                                        backgroundImage: `url(${imageUrl})`,
                                        backgroundSize: '300% 300%',
                                        backgroundPosition: `${col * 50}% ${row * 50}%` // 0%, 50%, 100%
                                    }}
                                >
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {isSolved && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10 rounded-lg">
                        <div className="text-center animate-bounce-y">
                            <span className="text-6xl">🎉</span>
                            <h3 className="text-2xl font-bold mt-2 text-white">Prato Feito!</h3>
                            <button onClick={startNewGame} className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-bold">Jogar Novamente</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reference Image */}
            <div className="mt-8 flex flex-col items-center opacity-70">
                <p className="text-xs mb-2">Meta:</p>
                <img src={imageUrl || ''} className="w-20 h-20 rounded border-2 border-white/20 object-cover" />
            </div>
        </div>
    );
};

// ==========================================
// GAME 3: ROLETA DO DESTINO
// ==========================================
const RouletteGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const { getCategoryRecipes, showRecipe, closeModal, showToast } = useApp();
    const [recipes, setRecipes] = useState<FullRecipe[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [selectedRecipe, setSelectedRecipe] = useState<FullRecipe | null>(null);

    useEffect(() => {
        const pool = getCategoryRecipes('top10'); // Pega receitas populares
        // Garante que tenha pelo menos 6 para a roda ficar bonita, duplicando se necessário
        let fill = [...pool];
        while(fill.length < 6 && fill.length > 0) {
            fill = [...fill, ...pool];
        }
        setRecipes(fill.slice(0, 8)); // Max 8 fatias
    }, []);

    const spin = () => {
        if (isSpinning || recipes.length === 0) return;
        
        setIsSpinning(true);
        setSelectedRecipe(null);
        
        const newRotation = rotation + 1800 + Math.random() * 360; // Pelo menos 5 voltas completas
        setRotation(newRotation);

        setTimeout(() => {
            setIsSpinning(false);
            const degrees = newRotation % 360;
            const sliceAngle = 360 / recipes.length;
            // O ponteiro está no topo (270deg ou -90deg logicamente). Ajuste matemático simples:
            // A rotação gira o container. O item que para no topo é o oposto da rotação.
            const index = Math.floor(((360 - degrees) % 360) / sliceAngle);
            const winner = recipes[index];
            setSelectedRecipe(winner);
        }, 4000); // 4s de duração
    };

    const handleAccept = () => {
        if (selectedRecipe) {
            closeModal('arcade');
            // Pequeno delay para a transição
            setTimeout(() => {
                showRecipe(selectedRecipe.name);
                showToast("O destino escolheu bem!");
            }, 300);
        }
    };

    return (
        <div className="flex flex-col h-full bg-emerald-900 text-white p-6 items-center overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-800 to-emerald-950"></div>
            
            <div className="w-full flex justify-between items-center mb-4 relative z-10">
                <h3 className="font-bold text-lg">Roleta do Jantar</h3>
                <button onClick={onExit} className="bg-white/10 p-2 rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="relative mt-8 z-10">
                {/* Pointer */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 text-red-500 drop-shadow-lg">
                    <span className="material-symbols-outlined text-5xl fill-current">arrow_drop_down</span>
                </div>

                {/* Wheel Container */}
                <div 
                    className="w-72 h-72 rounded-full border-4 border-yellow-500 shadow-2xl relative overflow-hidden transition-transform duration-[4000ms] cubic-bezier(0.2, 0.8, 0.2, 1)"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    {recipes.map((recipe, i) => {
                        const angle = 360 / recipes.length;
                        return (
                            <div 
                                key={i}
                                className="absolute w-full h-full left-0 top-0 flex justify-center pt-2"
                                style={{ transform: `rotate(${i * angle}deg)` }}
                            >
                                {/* Slice Content */}
                                <div className="mt-4 flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-white">
                                        <img src={recipe.imageUrl || ''} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                                {/* Divider Line */}
                                <div className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-yellow-500/50 origin-bottom"></div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Center Cap */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg z-10 border-4 border-yellow-500">
                    <span className="material-symbols-outlined text-yellow-600 text-3xl">restaurant</span>
                </div>
            </div>

            <div className="mt-12 relative z-10 w-full max-w-xs text-center min-h-[120px] flex flex-col items-center justify-end">
                {!selectedRecipe ? (
                    <button 
                        onClick={spin}
                        disabled={isSpinning}
                        className={`w-full py-4 rounded-2xl font-black text-xl shadow-lg transition-transform active:scale-95 uppercase tracking-widest ${isSpinning ? 'bg-gray-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-yellow-900'}`}
                    >
                        {isSpinning ? 'Girando...' : 'GIRAR!'}
                    </button>
                ) : (
                    <div className="bg-white text-emerald-900 p-4 rounded-xl shadow-xl w-full animate-slideUp">
                        <p className="text-xs uppercase font-bold text-emerald-600 mb-1">O destino escolheu:</p>
                        <h3 className="text-xl font-bold leading-tight mb-3">{selectedRecipe.name}</h3>
                        <div className="flex gap-2">
                            <button onClick={handleAccept} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700">Ver Receita</button>
                            <button onClick={() => setSelectedRecipe(null)} className="px-3 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-600"><span className="material-symbols-outlined">refresh</span></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// MAIN ARCADE MODAL (HUB)
// ==========================================
export const ArcadeModal: React.FC = () => {
    const { isArcadeModalOpen, closeModal } = useApp();
    const [selectedGame, setSelectedGame] = useState<'quiz' | 'puzzle' | 'roulette' | null>(null);

    if (!isArcadeModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center animate-fadeIn backdrop-blur-md">
            <div className="w-full h-full sm:h-[80vh] sm:w-[400px] sm:rounded-3xl overflow-hidden bg-background-light dark:bg-[#121212] relative shadow-2xl">
                
                {selectedGame ? (
                    // RENDER GAME
                    <>
                        {selectedGame === 'quiz' && <ChefQuizGame onExit={() => setSelectedGame(null)} />}
                        {selectedGame === 'puzzle' && <SlidingPuzzleGame onExit={() => setSelectedGame(null)} />}
                        {selectedGame === 'roulette' && <RouletteGame onExit={() => setSelectedGame(null)} />}
                    </>
                ) : (
                    // RENDER MENU
                    <div className="h-full flex flex-col p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 uppercase italic tracking-tighter">
                                    Arcade Chef
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tédio na fila? Nunca mais.</p>
                            </div>
                            <button onClick={() => closeModal('arcade')} className="bg-gray-100 dark:bg-white/10 p-2 rounded-full hover:bg-gray-200">
                                <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">close</span>
                            </button>
                        </div>

                        <div className="grid gap-4 flex-1 content-start">
                            {/* Card 1: Quiz */}
                            <button onClick={() => setSelectedGame('quiz')} className="group relative h-40 w-full rounded-2xl overflow-hidden shadow-lg transition-transform active:scale-95">
                                <div className="absolute inset-0 bg-indigo-600 group-hover:bg-indigo-500 transition-colors"></div>
                                <div className="absolute -right-4 -bottom-4 text-white/10 rotate-12">
                                    <span className="material-symbols-outlined text-9xl">help</span>
                                </div>
                                <div className="absolute inset-0 p-5 flex flex-col justify-end items-start text-white">
                                    <div className="bg-white/20 p-2 rounded-lg mb-2 backdrop-blur-sm">
                                        <span className="material-symbols-outlined text-2xl">quiz</span>
                                    </div>
                                    <h3 className="font-bold text-xl leading-none">Show do Chef</h3>
                                    <p className="text-indigo-200 text-xs mt-1">Teste seus conhecimentos culinários!</p>
                                </div>
                            </button>

                            {/* Card 2: Puzzle */}
                            <button onClick={() => setSelectedGame('puzzle')} className="group relative h-40 w-full rounded-2xl overflow-hidden shadow-lg transition-transform active:scale-95">
                                <div className="absolute inset-0 bg-slate-700 group-hover:bg-slate-600 transition-colors"></div>
                                <div className="absolute -right-6 -top-6 text-white/10 -rotate-12">
                                    <span className="material-symbols-outlined text-9xl">extension</span>
                                </div>
                                <div className="absolute inset-0 p-5 flex flex-col justify-end items-start text-white">
                                    <div className="bg-white/20 p-2 rounded-lg mb-2 backdrop-blur-sm">
                                        <span className="material-symbols-outlined text-2xl">grid_view</span>
                                    </div>
                                    <h3 className="font-bold text-xl leading-none">Cozinha Puzzle</h3>
                                    <p className="text-slate-300 text-xs mt-1">Monte os pratos deslizando as peças.</p>
                                </div>
                            </button>

                            {/* Card 3: Roulette */}
                            <button onClick={() => setSelectedGame('roulette')} className="group relative h-40 w-full rounded-2xl overflow-hidden shadow-lg transition-transform active:scale-95">
                                <div className="absolute inset-0 bg-emerald-600 group-hover:bg-emerald-500 transition-colors"></div>
                                <div className="absolute right-2 top-2 text-white/20 animate-spin-slow">
                                    <span className="material-symbols-outlined text-8xl">data_usage</span>
                                </div>
                                <div className="absolute inset-0 p-5 flex flex-col justify-end items-start text-white">
                                    <div className="bg-white/20 p-2 rounded-lg mb-2 backdrop-blur-sm">
                                        <span className="material-symbols-outlined text-2xl">casino</span>
                                    </div>
                                    <h3 className="font-bold text-xl leading-none">Roleta do Jantar</h3>
                                    <p className="text-emerald-200 text-xs mt-1">Deixe o destino escolher sua refeição.</p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
