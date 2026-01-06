import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useShoppingList } from '../../contexts/ShoppingListContext';
import type { FullRecipe } from '../../types';

// ==========================================
// GAME 1: CHEF MEMORY (JOGO DA MEMÓRIA)
// ==========================================
const MemoryGame: React.FC<{ recipes: FullRecipe[], onExit: () => void }> = ({ recipes, onExit }) => {
    const { arcadeStats, updateArcadeStat } = useShoppingList();
    const [cards, setCards] = useState<{ id: number; recipe: FullRecipe; flipped: boolean; matched: boolean }[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [matches, setMatches] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);

    const initGame = useCallback(() => {
        const pool = recipes.filter(r => !!r.imageUrl).slice(0, 8);
        if (pool.length < 2) { onExit(); return; }

        const duplicated = [...pool, ...pool]
            .sort(() => Math.random() - 0.5)
            .map((r, i) => ({ id: i, recipe: r, flipped: false, matched: false }));
        setCards(duplicated);
        setFlippedIndices([]);
        setMoves(0);
        setMatches(0);
        setIsNewRecord(false);
    }, [recipes, onExit]);

    useEffect(() => { initGame(); }, [initGame]);

    const handleCardClick = (index: number) => {
        if (flippedIndices.length === 2 || cards[index].flipped || cards[index].matched) return;

        const newCards = [...cards];
        newCards[index].flipped = true;
        setCards(newCards);

        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setMoves(m => m + 1);
            const [first, second] = newFlipped;
            if (cards[first].recipe.name === cards[second].recipe.name) {
                setTimeout(() => {
                    const matchedCards = [...cards];
                    matchedCards[first].matched = true;
                    matchedCards[second].matched = true;
                    setCards(matchedCards);
                    setFlippedIndices([]);
                    const newMatches = matches + 1;
                    setMatches(newMatches);
                    
                    if (newMatches === cards.length / 2) {
                        updateArcadeStat('memory', moves + 1).then(record => {
                            if (record) setIsNewRecord(true);
                        });
                    }
                }, 500);
            } else {
                setTimeout(() => {
                    const resetCards = [...cards];
                    resetCards[first].flipped = false;
                    resetCards[second].flipped = false;
                    setCards(resetCards);
                    setFlippedIndices([]);
                }, 1000);
            }
        }
    };

    const isWin = matches === cards.length / 2 && cards.length > 0;

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white p-4 animate-fadeIn overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex flex-col">
                    <h3 className="text-xs font-black text-cyan-500 uppercase tracking-[0.2em]">Chef Memory</h3>
                    <p className="text-xl font-black italic tracking-tighter">MOVIMENTOS: {moves}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[8px] text-gray-500 uppercase font-black">Recorde</p>
                        <p className="text-xs font-bold text-cyan-400">{arcadeStats['memory'] || '--'} mov.</p>
                    </div>
                    <button onClick={onExit} className="bg-white/10 p-2 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-4 gap-2 mb-8">
                    {cards.map((card, idx) => (
                        <div 
                            key={card.id} 
                            onClick={() => handleCardClick(idx)}
                            className="aspect-[3/4] relative perspective-1000 cursor-pointer active:scale-95 transition-transform"
                        >
                            <div className={`w-full h-full relative transition-transform duration-500 transform-style-3d ${card.flipped || card.matched ? 'rotate-y-180' : ''}`}>
                                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl border border-white/10 flex items-center justify-center shadow-lg">
                                    <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-cyan-500/50">restaurant</span>
                                    </div>
                                </div>
                                <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2 border-cyan-500 overflow-hidden bg-white">
                                    <img src={card.recipe.imageUrl} className="w-full h-full object-cover" alt="Receita" />
                                    {card.matched && (
                                        <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                            <span className="material-symbols-outlined text-white text-3xl font-black drop-shadow-lg">check</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isWin && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fadeIn">
                    <div className="bg-zinc-900 border-2 border-cyan-500 p-8 rounded-[2.5rem] text-center shadow-[0_0_50px_rgba(6,182,212,0.3)] animate-slideUp">
                        {isNewRecord ? (
                            <div className="animate-bounce mb-4">
                                <span className="bg-cyan-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.6)]">NOVO RECORDE!</span>
                            </div>
                        ) : <span className="text-6xl mb-4 block animate-bounce">🏆</span>}
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Memória de Chef!</h3>
                        <p className="text-cyan-400 font-bold mb-6">Você completou em {moves} movimentos.</p>
                        <button onClick={initGame} className="w-full bg-cyan-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all">JOGAR NOVAMENTE</button>
                    </div>
                </div>
            )}

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
};

// ==========================================
// GAME 2: VISUAL SPEED (QUAL É O PRATO?)
// ==========================================
const VisualSpeedGame: React.FC<{ recipes: FullRecipe[], onExit: () => void }> = ({ recipes, onExit }) => {
    const { arcadeStats, updateArcadeStat } = useShoppingList();
    const [currentRecipe, setCurrentRecipe] = useState<FullRecipe | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [blurLevel, setBlurLevel] = useState(24);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'feedback' | 'ended'>('playing');
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [isNewRecord, setIsNewRecord] = useState(false);

    const nextRound = useCallback(() => {
        const pool = recipes.filter(r => !!r.imageUrl);
        if (pool.length < 3) { onExit(); return; }

        const correct = pool[Math.floor(Math.random() * pool.length)];
        const wrong = pool.filter(r => r.name !== correct.name).sort(() => 0.5 - Math.random()).slice(0, 2);
        
        const opts = [correct.name, ...wrong.map(r => r.name)].sort(() => 0.5 - Math.random());
        
        setCurrentRecipe(correct);
        setOptions(opts);
        setBlurLevel(24);
        setGameState('playing');
        setSelectedIdx(null);
    }, [recipes, onExit]);

    useEffect(() => { nextRound(); }, [nextRound]);

    useEffect(() => {
        if (gameState !== 'playing') return;
        const timer = setInterval(() => {
            setBlurLevel(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 0.5;
            });
        }, 100);
        return () => clearInterval(timer);
    }, [gameState]);

    const handleSelect = (name: string, idx: number) => {
        if (gameState !== 'playing' || !currentRecipe) return;
        
        setSelectedIdx(idx);
        if (name === currentRecipe.name) {
            const points = Math.round(blurLevel * 10) + 50;
            setScore(s => s + points);
            setGameState('feedback');
            setBlurLevel(0);
            setTimeout(nextRound, 1500);
        } else {
            setGameState('ended');
            setBlurLevel(0);
            updateArcadeStat('speed', score).then(record => {
                if (record) setIsNewRecord(true);
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white p-4 overflow-hidden relative">
            <div className="flex justify-between items-center mb-3 shrink-0">
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Visual Speed</h3>
                    <p className="text-lg font-black italic tracking-tighter leading-none">PONTOS: {score}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[8px] text-gray-500 uppercase font-black">Recorde</p>
                        <p className="text-xs font-bold text-orange-400">{arcadeStats['speed'] || '--'} pts</p>
                    </div>
                    <button onClick={onExit} className="bg-white/10 p-2 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-all">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 min-h-0">
                {currentRecipe && (
                    <div className="flex-1 min-h-0 relative w-full rounded-[1.5rem] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900">
                        <img 
                            src={currentRecipe.imageUrl} 
                            style={{ filter: `blur(${blurLevel}px)` }}
                            className="w-full h-full object-cover transition-all duration-300"
                            alt="Qual é o prato?"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>
                )}

                <div className="grid gap-2 shrink-0 pb-2">
                    {options.map((opt, i) => {
                        let btnStyle = "bg-zinc-900 border-zinc-800 text-gray-300";
                        if (selectedIdx === i) {
                            btnStyle = opt === currentRecipe?.name ? "bg-green-600 border-green-500 text-white animate-pulse" : "bg-red-600 border-red-500 text-white";
                        } else if (gameState === 'feedback' && opt === currentRecipe?.name) {
                            btnStyle = "bg-green-600 border-green-500 text-white";
                        }

                        return (
                            <button
                                key={i}
                                onClick={() => handleSelect(opt, i)}
                                disabled={gameState !== 'playing'}
                                className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition-all active:scale-95 ${btnStyle}`}
                            >
                                <span className="line-clamp-1">{opt}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {gameState === 'ended' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-fadeIn">
                    <div className="bg-zinc-900 border-2 border-red-500 p-8 rounded-[2.5rem] text-center shadow-2xl animate-slideUp w-full max-w-[320px]">
                        {isNewRecord ? (
                            <div className="animate-bounce mb-4">
                                <span className="bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.6)]">NOVO RECORDE PESSOAL!</span>
                            </div>
                        ) : <span className="text-5xl mb-4 block">🍳</span>}
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1">Fogo Apagou!</h3>
                        <p className="text-gray-400 font-bold mb-6 text-sm">Sua pontuação: <span className="text-orange-500">{score}</span></p>
                        <button onClick={() => { setScore(0); setIsNewRecord(false); nextRound(); }} className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest">TENTAR NOVAMENTE</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// GAME 3: SLIDE CHEF (PUZZLE)
// ==========================================
const SlideChefGame: React.FC<{ recipes: FullRecipe[], onExit: () => void }> = ({ recipes, onExit }) => {
    const { arcadeStats, updateArcadeStat } = useShoppingList();
    const { addRecipeToShoppingList, showToast } = useApp();
    const [tiles, setTiles] = useState<number[]>([]);
    const [emptyIndex, setEmptyIndex] = useState(8);
    const [recipe, setRecipe] = useState<FullRecipe | null>(null);
    const [isSolved, setIsSolved] = useState(false);
    const [moves, setMoves] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);

    const startNewGame = useCallback(() => {
        const pool = recipes.filter(r => !!r.imageUrl);
        if (pool.length === 0) { onExit(); return; }

        const selected = pool[Math.floor(Math.random() * pool.length)];
        setRecipe(selected);
        
        const solved = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        let current = [...solved];
        let empty = 8;
        let lastMove = -1;

        for (let i = 0; i < 60; i++) {
            const neighbors = [];
            if (empty % 3 > 0) neighbors.push(empty - 1);
            if (empty % 3 < 2) neighbors.push(empty + 1);
            if (empty >= 3) neighbors.push(empty - 3);
            if (empty < 6) neighbors.push(empty + 3);
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
        setIsNewRecord(false);
    }, [recipes, onExit]);

    useEffect(() => { startNewGame(); }, [startNewGame]);

    const handleTileClick = (index: number) => {
        if (isSolved) return;
        const isAdjacent = (index === emptyIndex - 1 && emptyIndex % 3 !== 0) || (index === emptyIndex + 1 && emptyIndex % 3 !== 0) || (index === emptyIndex - 3) || (index === emptyIndex + 3);
        if (isAdjacent) {
            const newTiles = [...tiles];
            [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
            setTiles(newTiles);
            setEmptyIndex(index);
            const newMoves = moves + 1;
            setMoves(newMoves);
            
            if (newTiles.every((val, idx) => val === idx)) {
                setIsSolved(true);
                updateArcadeStat('slide', newMoves).then(record => {
                    if (record) setIsNewRecord(true);
                });
            }
        }
    };

    const handleReward = () => {
        if (recipe) {
            addRecipeToShoppingList(recipe);
            onExit();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white p-4 items-center overflow-hidden">
            <div className="w-full flex justify-between items-center mb-6 shrink-0">
                <div className="flex flex-col">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">Slide Chef</h3>
                    <p className="text-xl font-black italic tracking-tighter">MOVES: {moves}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[8px] text-gray-500 uppercase font-black">Recorde</p>
                        <p className="text-xs font-bold text-emerald-400">{arcadeStats['slide'] || '--'} mov.</p>
                    </div>
                    <button onClick={onExit} className="bg-white/10 p-2 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            <div className="w-full max-w-[320px] aspect-square bg-zinc-900 rounded-[2rem] p-3 relative shadow-[0_0_40px_rgba(0,0,0,1)] border border-white/5 shrink-0">
                <div className="grid grid-cols-3 gap-1.5 w-full h-full">
                    {recipe && tiles.map((tileNumber, index) => {
                        if (tileNumber === 8 && !isSolved) return <div key={index} className="bg-black/40 rounded-lg" />;
                        const row = Math.floor(tileNumber / 3);
                        const col = tileNumber % 3;
                        return (
                            <div
                                key={index}
                                onClick={() => handleTileClick(index)}
                                className={`w-full h-full cursor-pointer transition-all active:scale-95 rounded-lg overflow-hidden border border-white/10 ${isSolved ? 'animate-pulse border-emerald-500' : ''}`}
                                style={{
                                    backgroundImage: `url(${recipe.imageUrl})`,
                                    backgroundSize: '300% 300%',
                                    backgroundPosition: `${col * 50}% ${row * 50}%`
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-2 opacity-40 shrink-0">
                <p className="text-[10px] font-black uppercase tracking-widest">Objetivo</p>
                <img src={recipe?.imageUrl || ''} className="w-20 h-20 rounded-xl border border-white/20 object-cover grayscale" />
            </div>

            {isSolved && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-50 p-6 animate-fadeIn">
                    <div className="bg-zinc-900 border-2 border-emerald-500 p-8 rounded-[2.5rem] text-center shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-slideUp">
                        {isNewRecord ? (
                            <div className="animate-bounce mb-4">
                                <span className="bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.6)]">RECORDE BATIDO! ✨</span>
                            </div>
                        ) : <span className="text-6xl mb-4 block">✨</span>}
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Mestre Cuca!</h3>
                        <p className="text-gray-400 font-bold mb-6">Prato montado com sucesso.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleReward} className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all">LEVAR RECEITA P/ LISTA</button>
                            <button onClick={startNewGame} className="w-full bg-white/5 text-gray-400 font-bold py-3 rounded-2xl">JOGAR OUTRO</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// MAIN ARCADE MODAL (HUB)
// ==========================================
export const ArcadeModal: React.FC = () => {
    const { isArcadeModalOpen, closeModal, getCategoryRecipesSync, openModal, showToast, allRecipesPool } = useApp();
    const { arcadeStats } = useShoppingList();
    const { user } = useAuth();
    const [selectedGame, setSelectedGame] = useState<'memory' | 'speed' | 'slide' | null>(null);

    const assetPool = useMemo(() => {
        let pool = getCategoryRecipesSync('top10');
        if (pool.length < 8) {
            pool = getCategoryRecipesSync('random');
        }
        if (pool.length === 0) {
            pool = allRecipesPool.filter(r => !!r.imageUrl);
        }
        return pool;
    }, [getCategoryRecipesSync, isArcadeModalOpen, allRecipesPool]);

    if (!isArcadeModalOpen) return null;

    const handleGameClick = (game: 'memory' | 'speed' | 'slide') => {
        if (assetPool.length < 4) {
            showToast("Acervo insuficiente para jogar. Gere algumas receitas primeiro!");
            return;
        }
        
        if (game === 'memory') {
            setSelectedGame('memory');
        } else {
            if (!user) {
                showToast("Faça login para salvar recordes e jogar!");
                openModal('auth');
                return;
            }
            setSelectedGame(game);
        }
    };

    const renderGame = () => {
        switch(selectedGame) {
            case 'memory': return <MemoryGame recipes={assetPool} onExit={() => setSelectedGame(null)} />;
            case 'speed': return <VisualSpeedGame recipes={assetPool} onExit={() => setSelectedGame(null)} />;
            case 'slide': return <SlideChefGame recipes={assetPool} onExit={() => setSelectedGame(null)} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center animate-fadeIn">
            <div className="w-full h-full sm:h-[85vh] sm:w-[420px] sm:rounded-[3rem] overflow-hidden bg-[#0a0a0a] relative shadow-2xl border border-white/10 flex flex-col">
                
                {selectedGame ? renderGame() : (
                    <div className="h-full flex flex-col p-5 sm:p-8 overflow-y-auto scrollbar-hide">
                        <div className="flex justify-between items-start mb-6 sm:mb-10 shrink-0">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 uppercase italic tracking-tighter leading-none mb-1 sm:mb-2">
                                    Checklist Arcade
                                </h2>
                                <p className="text-[9px] sm:text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">Arena de Recordes</p>
                            </div>
                            <button onClick={() => closeModal('arcade')} className="bg-white/5 p-2.5 sm:p-3 rounded-2xl hover:bg-red-500/20 text-zinc-500 hover:text-red-500 transition-all border border-white/5">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="grid gap-2.5 sm:gap-4 flex-1 content-start">
                            {/* Card 1: Memory */}
                            <button onClick={() => handleGameClick('memory')} className="group relative h-28 sm:h-36 w-full rounded-[1.8rem] sm:rounded-[2rem] overflow-hidden transition-all active:scale-95 border border-white/5">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-blue-800 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute right-3 top-3 sm:right-4 sm:top-4 bg-white/20 text-white text-[7px] sm:text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                    🏆 Recorde: {arcadeStats['memory'] || '--'}
                                </div>
                                <div className="absolute right-0 bottom-0 p-2 opacity-10 rotate-12 group-hover:rotate-0 transition-transform">
                                    <span className="material-symbols-outlined text-6xl sm:text-8xl font-black">dashboard</span>
                                </div>
                                <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end items-start text-white text-left">
                                    <h3 className="font-black text-lg sm:text-xl leading-none uppercase italic tracking-tight">Chef Memory</h3>
                                    <p className="text-cyan-200 text-[8px] sm:text-[10px] font-bold mt-1 uppercase tracking-widest">Pares do Acervo</p>
                                </div>
                            </button>

                            {/* Card 2: Visual Speed */}
                            <button onClick={() => handleGameClick('speed')} className="group relative h-28 sm:h-36 w-full rounded-[1.8rem] sm:rounded-[2rem] overflow-hidden transition-all active:scale-95 border border-white/5">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-800 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute right-3 top-3 sm:right-4 sm:top-4 bg-white/20 text-white text-[7px] sm:text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                    🏆 Recorde: {arcadeStats['speed'] || '--'}
                                </div>
                                {!user && (
                                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                                        <span className="material-symbols-outlined text-white/50 text-3xl">lock</span>
                                    </div>
                                )}
                                <div className="absolute right-0 bottom-0 p-2 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform">
                                    <span className="material-symbols-outlined text-6xl sm:text-8xl font-black">visibility</span>
                                </div>
                                <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end items-start text-white text-left">
                                    <h3 className="font-black text-lg sm:text-xl leading-none uppercase italic tracking-tight">Visual Speed</h3>
                                    <p className="text-orange-200 text-[8px] sm:text-[10px] font-bold mt-1 uppercase tracking-widest">Prato Desfocado</p>
                                </div>
                            </button>

                            {/* Card 3: Slide Chef */}
                            <button onClick={() => handleGameClick('slide')} className="group relative h-28 sm:h-36 w-full rounded-[1.8rem] sm:rounded-[2rem] overflow-hidden transition-all active:scale-95 border border-white/5">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-800 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute right-3 top-3 sm:right-4 sm:top-4 bg-white/20 text-white text-[7px] sm:text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                    🏆 Recorde: {arcadeStats['slide'] || '--'}
                                </div>
                                {!user && (
                                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                                        <span className="material-symbols-outlined text-white/50 text-3xl">lock</span>
                                    </div>
                                )}
                                <div className="absolute right-0 bottom-0 p-2 opacity-10 rotate-45 group-hover:rotate-0 transition-transform">
                                    <span className="material-symbols-outlined text-6xl sm:text-8xl font-black">grid_view</span>
                                </div>
                                <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end items-start text-white text-left">
                                    <h3 className="font-black text-lg sm:text-xl leading-none uppercase italic tracking-tight">Slide Chef</h3>
                                    <p className="text-emerald-200 text-[8px] sm:text-[10px] font-bold mt-1 uppercase tracking-widest">Quebra-cabeça Gourmet</p>
                                </div>
                            </button>
                        </div>

                        <div className="mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5 text-center shrink-0">
                            <p className="text-[8px] sm:text-[9px] text-zinc-600 font-black uppercase tracking-[0.4em]">Supere seus próprios limites</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};