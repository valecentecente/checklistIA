
import React, { useMemo, useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ShoppingList } from './components/ShoppingList';
import type { ShoppingItem } from './types';
import { EmptyStateCTA } from './components/EmptyStateCTA';
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ShoppingListProvider, useShoppingList } from './contexts/ShoppingListContext';
import { Logo } from './components/Logo';

// Extracted Components Imports
import { WebSidebarLeft } from './components/layout/WebSidebarLeft';
import { WebSidebarRight } from './components/layout/WebSidebarRight';
import { AppOptionsMenu } from './components/menus/AppOptionsMenu';
import { ToolsGridModal } from './components/modals/ToolsGridModal'; // Needed for mobile triggering logic if kept, but also inside AppModals
import { AppModals } from './components/modals/AppModals';

// ... SlideToFinish ...
const SlideToFinish: React.FC<{ total: string; onFinish: () => void; }> = ({ total, onFinish }) => {
    // ... logic ...
    const [sliderX, setSliderX] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const sliderRef = React.useRef<HTMLDivElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleInteractionStart = () => { if (sliderRef.current) { setIsDragging(true); sliderRef.current.style.transition = 'none'; } };
    const handleInteractionMove = React.useCallback((clientX: number) => {
        if (!isDragging || !sliderRef.current || !containerRef.current) return;
        const cRect = containerRef.current.getBoundingClientRect();
        const sWidth = sliderRef.current.offsetWidth;
        const newX = Math.max(0, Math.min(clientX - cRect.left - (sWidth / 2), cRect.width - sWidth));
        setSliderX(newX);
        if (newX >= cRect.width - sWidth - 2) { 
            onFinish(); 
            setIsDragging(false); 
            if (sliderRef.current) {
                sliderRef.current.style.transition = 'transform 0.3s ease';
            }
            setSliderX(0);
        }
    }, [isDragging, onFinish]);
    const handleInteractionEnd = React.useCallback(() => {
        if (!isDragging || !sliderRef.current) return;
        setIsDragging(false);
        sliderRef.current.style.transition = 'transform 0.3s ease';
        setSliderX(0);
    }, [isDragging]);
    
    React.useEffect(() => {
        const move = (e: MouseEvent) => handleInteractionMove(e.clientX);
        const touchMove = (e: TouchEvent) => handleInteractionMove(e.touches[0].clientX);
        if (isDragging) {
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', handleInteractionEnd);
            window.addEventListener('touchmove', touchMove);
            window.addEventListener('touchend', handleInteractionEnd);
        }
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchmove', touchMove);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
    }, [isDragging, handleInteractionMove, handleInteractionEnd]);

    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 animate-fadeIn" ref={containerRef}>
            <div className="relative h-16 w-64 rounded-full bg-surface-light dark:bg-surface-dark border border-primary/20 dark:border-primary/50 shadow-lg flex items-center p-2 overflow-hidden">
                <div ref={sliderRef} onMouseDown={handleInteractionStart} onTouchStart={handleInteractionStart} className="absolute h-12 w-24 bg-primary rounded-full flex items-center justify-center text-white cursor-grab active:cursor-grabbing z-10 select-none" style={{ transform: `translateX(${sliderX}px)` }}>
                    <span className="font-bold">{total}</span>
                </div>
                <div className="absolute w-full text-right pr-4 text-primary dark:text-orange-300 font-semibold text-sm animate-pulse" style={{ opacity: isDragging ? 0 : 1, transition: 'opacity 0.2s' }}>
                    &gt;&gt;Finalizar
                </div>
            </div>
        </div>
    );
};

// Subtle Firework Component
const Firework: React.FC<{ delay: number; top: string; left: string; color: string }> = ({ delay, top, left, color }) => {
    return (
        <div 
            className="firework-particle" 
            style={{ 
                top, 
                left, 
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}, 0 0 10px ${color}`,
                animationDelay: `${delay}s`
            }}
        ></div>
    );
};

const NewYearFireworks: React.FC = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[0]">
            <Firework delay={0} top="20%" left="15%" color="#FFD700" />
            <Firework delay={1.5} top="15%" left="75%" color="#FF4500" />
            <Firework delay={0.8} top="40%" left="50%" color="#00BFFF" />
            <Firework delay={2.2} top="10%" left="40%" color="#FF69B4" />
            <Firework delay={1.2} top="30%" left="85%" color="#32CD32" />
            <Firework delay={2.8} top="25%" left="5%" color="#FFD700" />
            <Firework delay={0.5} top="50%" left="20%" color="#FFFFFF" />
            <Firework delay={1.9} top="35%" left="70%" color="#FFD700" />
        </div>
    );
};

// ... AppContent ...
const AppContent: React.FC = () => {
    // ... all contexts hooks ...
    const { user } = useAuth();
    const { items, formatCurrency, deleteItem, updateItem, deleteRecipeGroup, toggleItemPurchased, savePurchase, finishWithoutSaving, addHistoricItem, repeatPurchase, addItem, findDuplicate, importSharedList, addIngredientsBatch, saveReceivedListToHistory } = useShoppingList();
    const app = useApp();
  
    // ... shared list logic ...
    const [sharedListData, setSharedListData] = useState<{ marketName: string; items: any[]; author?: any } | null>(null);
    const [isImportingShare, setIsImportingShare] = useState(false);
    const [currentShareId, setCurrentShareId] = useState<string | null>(null);
    const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);

    // NOTIFICATION BADGE LOGIC
    // Armazena a contagem de notificações que o usuário "já viu" ao abrir o menu
    const [lastSeenNotificationCount, setLastSeenNotificationCount] = useState(0);
    
    // Mostra o badge apenas se houver notificações E a contagem atual for maior que a última vista
    const showProfileBadge = app.unreadNotificationCount > 0 && app.unreadNotificationCount > lastSeenNotificationCount;

    // ORIENTATION LOCK STATE
    const [isMobileLandscape, setIsMobileLandscape] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            const isLandscape = window.matchMedia("(orientation: landscape)").matches;
            // Check for mobile characteristics (small height in landscape)
            // Typically phones in landscape are < 500px height
            const isSmallHeight = window.innerHeight < 600;
            const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            
            // Only block if it looks like a phone in landscape
            if (isLandscape && isSmallHeight && isTouch) {
                setIsMobileLandscape(true);
            } else {
                setIsMobileLandscape(false);
            }
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // --- LÓGICA DE ABERTURA DOS NOVOS MENUS ---
    const handleProfileClick = () => {
        // Ao clicar no perfil (topo), abre o menu de opções (Caixa Vermelha)
        setLastSeenNotificationCount(app.unreadNotificationCount);
        app.toggleAppOptionsMenu();
    };
    
    const handleBottomMenuClick = () => {
        // Ao clicar no botão Menu (rodapé), abre o grid de ferramentas (Caixa Verde)
        app.openModal('tools');
    }

    const closeDistributionModal = () => setIsDistributionModalOpen(false);

    useEffect(() => {
        const checkShareUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const shareId = params.get('share_id');
            
            if (shareId && shareId !== currentShareId) {
                setCurrentShareId(shareId);
                setIsImportingShare(true);
                app.openModal('sharedList');
                
                importSharedList(shareId).then(data => {
                    if (data) {
                        setSharedListData(data);
                    } else {
                        setSharedListData(null);
                    }
                    setIsImportingShare(false);
                });
            }
        };

        checkShareUrl(); 
        window.addEventListener('popstate', checkShareUrl);
        return () => window.removeEventListener('popstate', checkShareUrl);
    }, [importSharedList, app, currentShareId]);

    const handleImportSharedList = async () => {
        if (sharedListData) {
            await addIngredientsBatch(sharedListData.items.map(i => ({
                name: i.name,
                calculatedPrice: 0,
                details: i.details || '',
                recipeName: sharedListData.marketName ? `Importado: ${sharedListData.marketName}` : undefined,
                isNew: true,
                isPurchased: false
            })));
            
            if (user && sharedListData.author && currentShareId) {
                await saveReceivedListToHistory({
                    shareId: currentShareId,
                    marketName: sharedListData.marketName,
                    items: sharedListData.items,
                    author: sharedListData.author
                });
            }
            
            app.showToast(`${sharedListData.items.length} itens importados com sucesso!`);
            app.closeModal('sharedList');
            
            const url = new URL(window.location.href);
            url.searchParams.delete('share_id');
            window.history.replaceState({}, '', url.toString());
            setCurrentShareId(null);
        }
    };

    React.useEffect(() => {
        if (user) {
            // Se houver uma ação pendente (clique em ferramenta antes do login), executa e fecha o modal de auth
            if (app.pendingAction) {
                if (app.isAuthModalOpen) app.closeModal('auth');
                
                setTimeout(() => {
                    if (app.pendingAction === 'organize') {
                        app.toggleGrouping();
                    } else if (app.pendingAction) {
                        app.openModal(app.pendingAction);
                    }
                    app.setPendingAction(null);
                }, 300);
            } else if (app.isAuthModalOpen) {
                // Fechar auth modal se estiver aberto e logado (fluxo padrão)
                if (!app.pendingExploreRecipe) {
                    app.closeModal('auth');
                    app.showToast(`Bem-vindo, ${user.displayName || 'Usuário'}!`);
                }
            }
            
            if (sessionStorage.getItem('pending_save_purchase') === 'true') {
                sessionStorage.removeItem('pending_save_purchase');
                setTimeout(() => {
                    app.openModal('savePurchase');
                }, 500);
            }
        }
    }, [user, app]);

    const handleAddItem = useCallback(async (item: Omit<ShoppingItem, 'id' | 'displayPrice' | 'isPurchased' | 'creatorUid' | 'creatorDisplayName' | 'creatorPhotoURL' | 'listId' | 'responsibleUid' | 'responsibleDisplayName'>) => {
        const duplicate = findDuplicate(item.name, items);
        const performAddItem = async () => {
            try {
                await addItem(item);
                app.closeModal('addItem');
                app.setDuplicateInfo(null);
            } catch (error) {
                console.error("Erro ao adicionar item:", error);
                app.showToast("Erro ao adicionar item. Tente novamente.");
            }
        };
        if (duplicate) {
            app.setDuplicateInfo({ newItemName: item.name, existingItem: duplicate, onConfirm: performAddItem, onCancel: () => app.setDuplicateInfo(null) });
        } else {
            await performAddItem();
        }
    }, [items, addItem, app, findDuplicate]);

    const editingItem = useMemo(() => items.find(item => item.id === app.editingItemId) || null, [items, app.editingItemId]);
    const rawTotal = useMemo(() => items.filter(i => i.isPurchased).reduce((acc, item) => acc + item.calculatedPrice, 0), [items]);
    const purchasedItemsCount = useMemo(() => items.filter(item => item.isPurchased).length, [items]);
    const formattedTotal = useMemo(() => formatCurrency(rawTotal), [rawTotal, formatCurrency]);
    const budgetProgress = useMemo(() => (!app.budget || app.budget === 0) ? 0 : Math.min((rawTotal / app.budget) * 100, 100), [rawTotal, app.budget]);

    const groupedItems = useMemo(() => {
        const groups: Record<string, ShoppingItem[]> = {};
        if (app.groupingMode === 'aisle') {
            items.forEach(item => {
                const key = app.itemCategories[item.id] || '❓ Outros';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });
        } else if (app.groupingMode === 'responsible') {
            items.forEach(item => {
                const key = item.responsibleDisplayName 
                    ? `Responsável: ${item.responsibleDisplayName}` 
                    : 'Não Atribuído';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });
        } else {
            items.forEach(item => {
                const key = item.recipeName ? `Receita: ${item.recipeName}` : 'Outros Itens';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });
        }
        Object.values(groups).forEach(g => g.sort((a,b) => Number(a.isPurchased) - Number(b.isPurchased)));
        
        const sortedEntries = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
        
        const sortedGroups: Record<string, ShoppingItem[]> = {};
        for (const [key, value] of sortedEntries) {
            sortedGroups[key] = value;
        }
        
        return sortedGroups;
    }, [items, app.groupingMode, app.itemCategories]);

    const handleSavePurchase = useCallback(async (marketName: string) => {
        const finalMarketName = marketName || app.currentMarketName; // Usa o nome passado (editado ou não)
        await savePurchase(finalMarketName);
        app.setCurrentMarketName(null);
        app.setIsSharedSession(false);
        app.setFocusMode(false); // Reset focus mode
        app.closeModal('savePurchase');
        
        // Redireciona para a Home para começar novo ciclo
        app.setHomeViewActive(true);
        
        app.showToast("Sua compra foi salva e a lista reiniciada!");

        // Contextual PWA Offer
        if (app.installPromptEvent && !sessionStorage.getItem('pwa_offered_contextual')) {
            sessionStorage.setItem('pwa_offered_contextual', 'true');
            app.showPWAInstallPromptIfAvailable();
        }
    }, [savePurchase, app]);

    const handleFinishWithoutSaving = useCallback(async () => {
        await finishWithoutSaving();
        app.setCurrentMarketName(null);
        app.setIsSharedSession(false);
        app.setFocusMode(false); // Reset focus mode
        app.closeModal('savePurchase');
        
        // Redireciona para a Home para começar novo ciclo
        app.setHomeViewActive(true);
        
        app.showToast("Lista limpa para uma nova compra.");
    }, [finishWithoutSaving, app]);
  
    const handleRepeatPurchase = useCallback(async (purchase: any) => {
        const { message } = await repeatPurchase(purchase);
        app.showToast(message);
        app.closeModal('history');
    }, [repeatPurchase, app]);

    const handleAddHistoricItem = useCallback(async (item: any) => {
        const duplicate = findDuplicate(item.name, items);
        const performAdd = async () => {
            await addHistoricItem(item);
            app.showToast(`"${item.name}" foi adicionado à lista.`);
            app.setDuplicateInfo(null);
        };
        if (duplicate) {
            app.setDuplicateInfo({ newItemName: item.name, existingItem: duplicate, onConfirm: performAdd, onCancel: () => app.setDuplicateInfo(null) });
        } else {
            await performAdd();
        }
    }, [items, addHistoricItem, app, findDuplicate]);
  
    const handleShare = async () => {
        const shareUrl = 'https://checklistia.com.br';
        const displayUrl = 'checklistia.com.br';

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'ChecklistIA',
                    text: 'Confira este assistente de compras inteligente! Crie listas a partir de receitas e organize suas compras.',
                    url: shareUrl,
                });
            } catch (error) {
                console.error('Erro ao compartilhar', error);
                if ((error as any).name !== 'AbortError') {
                     app.showToast("Ocorreu um erro ao compartilhar. Tente copiar o link.");
                }
            }
        } else {
            // Fallback for browsers without share API
            try {
                await navigator.clipboard.writeText(displayUrl);
                app.showToast("Link copiado para a área de transferência!");
            } catch (e) {
                app.showToast("Seu navegador não suporta o compartilhamento.");
            }
        }
    };
  
    const handleStartShopping = async (marketName: string) => {
        // Detect if we are in "Edit Mode" (renaming) based on whether a name was already set
        const isRenaming = !!app.currentMarketName;

        app.setCurrentMarketName(marketName);
        app.setHomeViewActive(false); // Make sure we show the list view
        app.closeModal('startShopping');
        
        // AUTO-ADD LOGIC: If a recipe was pending, find it and add it automatically.
        if (app.pendingExploreRecipe) {
            const recipeName = app.pendingExploreRecipe;
            const recipe = app.getCachedRecipe(recipeName);

            if (recipe) {
                // Recipe object found synchronously
                await app.addRecipeToShoppingList(recipe);
                app.setPendingExploreRecipe(null);
                // The toast is handled inside addRecipeToShoppingList
            } else {
                // Fallback: If not found in cache (rare), reopen modal to fetch
                setTimeout(() => {
                    app.showRecipe(recipeName);
                    app.setPendingExploreRecipe(null);
                }, 300);
            }
        } else {
            // If just starting a generic list, prompt to add first item
            // BUT NOT if we are just renaming the market
            if (!isRenaming) {
                app.openModal('addItem');
            }
        }
    }

    const handleShareAndStart = async (marketName: string) => {
        if (!user) {
            app.showToast("Você precisa estar logado para compartilhar!");
            app.closeModal('startShopping');
            app.openModal('auth');
            return;
        }
        app.setCurrentMarketName(marketName);
        app.setHomeViewActive(false);
        app.closeModal('startShopping');
        app.openModal('shareList'); 
    }

    // UPDATED Handlers for Recipe Decision
    const handleAddToCurrentList = () => {
        app.closeModal('recipeDecision');
        if (app.pendingExploreRecipe) {
            const recipe = app.getCachedRecipe(app.pendingExploreRecipe);
            if (recipe) {
                app.addRecipeToShoppingList(recipe);
                app.setPendingExploreRecipe(null);
            } else {
                app.showRecipe(app.pendingExploreRecipe);
                app.setPendingExploreRecipe(null);
            }
        }
    };

    const handleStartNewListForRecipe = async () => {
        await handleFinishWithoutSaving(); // Clears list
        app.closeModal('recipeDecision');
        if (app.pendingExploreRecipe) {
            // Start fresh -> Show list view -> Add Recipe
            app.setHomeViewActive(false);
            const recipe = app.getCachedRecipe(app.pendingExploreRecipe);
            if (recipe) {
                app.addRecipeToShoppingList(recipe);
                app.setPendingExploreRecipe(null);
            } else {
                app.showRecipe(app.pendingExploreRecipe);
                app.setPendingExploreRecipe(null);
            }
        }
    };

    // Logic to switch between list and empty state view
    const showHomeView = (items.length === 0 && !app.currentMarketName) || app.isHomeViewActive;
    
    // VISIBILITY FLAG FOR SESSION BAR
    const showSessionBar = ((items.length > 0 || app.currentMarketName) && !app.isHomeViewActive);

    // Componente de Botão da Barra de Navegação
    const NavButton: React.FC<{ 
        icon: string | React.ReactNode; 
        label?: string; 
        onClick: () => void; 
        active?: boolean;
        badge?: number;
    }> = ({ icon, label, onClick, active, badge }) => (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full h-full relative group transition-all duration-200 ${active ? 'text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
            <div className={`relative transition-transform duration-200 ${active ? '-translate-y-1' : ''}`}>
                {typeof icon === 'string' ? (
                    <span className={`material-symbols-outlined text-[28px] ${active ? 'font-variation-FILL-1' : ''}`} style={ active ? { fontVariationSettings: "'FILL' 1" } : {} }>{icon}</span>
                ) : (
                    icon
                )}
                {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm animate-bounce">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </div>
            {label && (
                <span className={`text-[10px] font-medium absolute bottom-1 transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {label}
                </span>
            )}
        </button>
    );

    if (isMobileLandscape) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#121212] flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                <span className="material-symbols-outlined text-6xl text-primary mb-4 animate-pulse">screen_rotation</span>
                <h1 className="text-2xl font-bold text-white mb-2">Gire o dispositivo</h1>
                <p className="text-gray-400">O ChecklistIA foi otimizado para o modo retrato (vertical).</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[100dvh] bg-background-light dark:bg-background-dark lg:bg-[#121212] lg:dark:bg-[#121212] lg:flex overflow-hidden">
        
            {/* Coluna 1: Web Sidebar Left */}
            <WebSidebarLeft />

            {/* Colunas 2 e 3: O Aplicativo (50% da tela) */}
            <div className="relative w-full lg:flex-1 lg:min-w-0 h-full flex flex-col bg-background-light dark:bg-background-dark shadow-2xl overflow-hidden transform-gpu" style={{contain: 'strict'}}>
                
                {/* Snowflakes for Christmas Theme */}
                {app.theme === 'christmas' && (
                    <div aria-hidden="true" className="pointer-events-none">
                        <div className="snowflake">❅</div>
                        <div className="snowflake">❆</div>
                        <div className="snowflake">❅</div>
                        <div className="snowflake">❆</div>
                        <div className="snowflake">❅</div>
                        <div className="snowflake">❆</div>
                        <div className="snowflake">❅</div>
                        <div className="snowflake">❆</div>
                        <div className="snowflake">❅</div>
                        <div className="snowflake">❆</div>
                    </div>
                )}

                {/* Fireworks for New Year Theme */}
                {app.theme === 'newyear' && <NewYearFireworks />}

                {app.toastMessage && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[140] flex items-center gap-3 bg-zinc-900/95 text-white px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10 animate-fadeIn max-w-[90%] w-auto">
                        <span className="material-symbols-outlined text-green-400 !text-2xl shrink-0">check_circle</span>
                        <p className="text-sm font-medium leading-snug">{app.toastMessage}</p>
                    </div>
                )}
                
                {/* Cabeçalho - Oculto no Desktop (pois já tem a sidebar) e no Modo Foco 
                    MUDANÇA: absolute top-0 para sobrepor o scroll da main
                */}
                <header className={`absolute top-0 left-0 right-0 z-[115] flex-shrink-0 transition-all duration-300 lg:hidden ${app.isFocusMode ? 'hidden' : 'block'} bg-white/70 dark:bg-black/60 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-sm`}>
                    <div className="relative z-10 flex h-24 items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3">
                            {/* Logo SVG (Checkmark) - White BG, Blue Check, No Border (Simple) */}
                            <div 
                                onClick={() => app.setHomeViewActive(true)}
                                className="h-12 w-12 shrink-0 rounded-full shadow-md overflow-hidden bg-white flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                                title="Ir para o Início"
                            >
                                <Logo className="w-8 h-8 text-blue-600" />
                            </div>
                            <div className="flex flex-col justify-center items-start">
                            <h1 translate="no" className={`text-xl font-bold tracking-tight leading-none drop-shadow-md flex items-baseline ${app.theme === 'christmas' || app.theme === 'newyear' ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-slate-800 dark:text-white'}`}>
                                {app.theme === 'newyear' ? 'Feliz 2026!' : (
                                    <>
                                        <span>Checklist</span>
                                        <span className="text-blue-600 dark:text-blue-400 ml-0.5">IA</span>
                                    </>
                                )}
                            </h1>
                            <span translate="no" className="mt-1 w-fit rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-700 dark:bg-orange-900/60 dark:text-orange-200 leading-none shadow-sm">Beta</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             {/* 1. ÍCONE DE HUB SOCIAL (Chef's Hat/Restaurant) - VISÍVEL APENAS PARA ADMIN POR ENQUANTO */}
                            {app.isAdmin && (
                                <button 
                                    onClick={() => app.openModal('recipeAssistant')} 
                                    className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-gray-700"
                                    title="Hub Social / Receitas da Comunidade"
                                >
                                    <span className="material-symbols-outlined !text-2xl text-primary dark:text-orange-400">restaurant</span>
                                </button>
                            )}

                            {/* USER PROFILE / APP OPTIONS TRIGGER */}
                            <div className="relative">
                                <button onClick={handleProfileClick} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-gray-700 overflow-hidden border-2 border-white shadow-sm">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Foto" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined !text-3xl">account_circle</span>
                                    )}
                                </button>
                                
                                {/* NOTIFICATION BADGE ON PROFILE */}
                                {showProfileBadge && (
                                    <button 
                                        onClick={handleProfileClick}
                                        className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm border border-white z-20 animate-bounce cursor-pointer"
                                    >
                                        {app.unreadNotificationCount > 9 ? '9+' : app.unreadNotificationCount}
                                    </button>
                                )}
                                
                                <AppOptionsMenu />
                            </div>
                        </div>
                    </div>
                </header>

                {/* BARRA DE SESSÃO ATIVA (SUB-TOPO) - VISÍVEL APENAS QUANDO HÁ ITENS OU NOME DEFINIDO (E NÃO ESTÁ NA HOME) 
                    MUDANÇA: Lógica dinâmica para topo (Mobile Normal vs Focus vs Desktop)
                */}
                {showSessionBar && (
                    <div className={`absolute left-0 right-0 z-[112] w-full bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between shadow-sm animate-slideUp overflow-visible transition-all duration-300 ${app.isFocusMode ? 'top-0' : 'top-24 lg:top-0'}`}>
                       <div 
                         className="flex flex-col cursor-pointer flex-1 min-w-0"
                         onClick={() => app.openModal('startShopping')} // Reabre para editar nome
                       >
                          <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider mb-0.5">Local de Compra</span>
                          <div className="flex items-center gap-2 group">
                             <span className="font-bold text-primary dark:text-orange-400 text-lg leading-none truncate max-w-[200px]">
                                {app.currentMarketName || "Minha Lista"}
                             </span>
                             <span className="material-symbols-outlined text-sm text-gray-400 group-hover:text-primary transition-colors">edit</span>
                          </div>
                       </div>

                       {/* Right Action Icons */}
                       <div className="flex items-center justify-end pl-2 gap-2">
                          
                          {/* 1. CART BUTTON (New Location) */}
                          <button
                            onClick={() => app.showCartTooltip()}
                            className="relative h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
                            title="Itens Comprados"
                          >
                            <span className="material-symbols-outlined">shopping_cart</span>
                            {purchasedItemsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm animate-bounce border border-white dark:border-surface-dark">
                                    {purchasedItemsCount}
                                </span>
                            )}
                          </button>

                          {/* 2. Share/Sync Button */}
                          {app.isSharedSession ? (
                             <div className="flex -space-x-3 items-center relative animate-fadeIn" title="Sincronizado">
                                <div className="relative z-10 rounded-full ring-2 ring-background-light dark:ring-background-dark">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Você" className="w-9 h-9 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-orange-200 flex items-center justify-center text-orange-800">
                                            <span className="material-symbols-outlined text-lg">person</span>
                                        </div>
                                    )}
                                </div>
                                <div className="relative z-0 rounded-full ring-2 ring-background-light dark:ring-background-dark opacity-90">
                                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                        <span className="material-symbols-outlined text-lg">group</span>
                                    </div>
                                </div>
                                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border border-white dark:border-gray-800 animate-pulse"></div>
                             </div>
                          ) : (
                             <button 
                                onClick={() => {
                                    if (!user) {
                                        app.showToast("Faça login para compartilhar");
                                        app.openModal('auth');
                                    } else {
                                        app.openModal('shareList');
                                    }
                                }}
                                className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                                title="Compartilhar Lista"
                             >
                                <span className="material-symbols-outlined">person_add</span>
                             </button>
                          )}
                            
                            {/* 3. Focus Mode Button (Mobile Only via lg:hidden) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    app.setFocusMode(!app.isFocusMode);
                                }}
                                className="h-10 w-10 flex lg:hidden items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                title={app.isFocusMode ? "Sair do modo foco" : "Modo foco (tela cheia)"}
                            >
                                <span className="material-symbols-outlined">
                                    {app.isFocusMode ? 'close_fullscreen' : 'open_in_full'}
                                </span>
                            </button>
                       </div>
                    </div>
                )}

                {/* --- TOOLTIP DE ITENS COMPRADOS (REPOSICIONADO PARA O TOPO) --- */}
                {app.isCartTooltipVisible && showSessionBar && (
                    <div className={`absolute right-4 z-[130] w-auto max-w-[200px] bg-zinc-800/95 backdrop-blur-md border border-white/10 text-white rounded-xl shadow-2xl animate-fadeIn p-3 pointer-events-none transition-all duration-300 ${app.isFocusMode ? 'top-16' : 'top-40 lg:top-16'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                            <span className="font-bold text-sm">{purchasedItemsCount} Comprados</span>
                        </div>
                        <p className="text-[10px] text-gray-300 leading-tight">
                            Seus itens marcados estão salvos. Finalize a compra para limpar a lista.
                        </p>
                        {/* Seta do tooltip apontando para cima (para o botão) */}
                        <div className="absolute w-3 h-3 bg-zinc-800/95 rotate-45 border-l border-t border-white/10 -top-1.5 right-14"></div>
                    </div>
                )}

                {/* Conteúdo Rolável 
                    MUDANÇA: Padding dinâmico complexo para lidar com:
                    1. Mobile Normal (Header + SessionBar) -> pt-40
                    2. Mobile Focus (SessionBar only) -> pt-20
                    3. Desktop (SessionBar only) -> pt-20
                    4. No SessionBar scenarios
                */}
                <main className={`flex-1 overflow-y-auto p-4 pb-40 scrollbar-hide relative w-full transition-all duration-300 ${
                    showSessionBar 
                        ? (app.isFocusMode ? 'pt-20' : 'pt-40 lg:pt-20') 
                        : (app.isFocusMode ? 'pt-4' : 'pt-28 lg:pt-4')
                }`}>
                    <div className="flex flex-col gap-4">
                        {app.budget !== null && !showHomeView && (
                            <div className="flex flex-col gap-4 rounded-xl bg-surface-light p-5 shadow-sm dark:bg-surface-dark">
                                <div className="flex items-center justify-between"><p className="text-base font-semibold">Resumo do Orçamento</p><span>{formattedTotal} de {formatCurrency(app.budget)}</span></div>
                                <div className="flex items-center gap-4">
                                    <div className="relative h-16 w-16"><svg viewBox="0 0 36 36"><circle className="stroke-gray-200 dark:stroke-gray-700" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle><circle className="stroke-primary" cx="18" cy="18" fill="none" r="16" strokeDasharray="100" strokeDashoffset={100 - budgetProgress} strokeLinecap="round" strokeWidth="3" transform="rotate(-90 18 18)"></circle></svg><div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-bold text-primary">{Math.round(budgetProgress)}%</span></div></div>
                                    <div className="flex-1"><div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-2.5 rounded-full bg-primary" style={{ width: `${budgetProgress}%` }}></div></div></div>
                                </div>
                            </div>
                        )}
                        {showHomeView ? (
                            <EmptyStateCTA onShowRecipeAssistant={() => app.openModal('recipeAssistant')} onShowBudget={() => app.openModal('budget')} />
                        ) : (
                            <ShoppingList groupedItems={groupedItems} onDeleteItem={deleteItem} onDeleteGroup={deleteRecipeGroup} onStartEdit={app.startEdit} onShowRecipe={app.showRecipe} onTogglePurchased={toggleItemPurchased} />
                        )}
                    </div>
                </main>

                {/* Desktop Floating Add Button - Only visible when not on home */}
                {/* MOVED OUTSIDE <main> TO PREVENT SCROLLING */}
                {!showHomeView && (
                    <button 
                        onClick={() => app.openModal('addItem')}
                        className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-40 h-16 w-16 bg-primary hover:bg-primary-hover text-white rounded-full items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95"
                        title="Adicionar Item"
                    >
                        <span className="material-symbols-outlined text-3xl">add</span>
                    </button>
                )}

                {/* Elementos Absolutos Presos Dentro do App */}
                {(!showHomeView) && <SlideToFinish total={formattedTotal} onFinish={() => app.openModal('savePurchase')} />}

                {/* --- RODAPÉ ESTILO APP (FIXO BOTTOM BAR) --- */}
                {/* Oculto em Desktop pois a navegação está na sidebar esquerda */}
                <footer className="fixed lg:hidden bottom-0 w-full z-[100] bg-white/70 dark:bg-[#121212]/70 backdrop-blur-xl border-t border-white/20 dark:border-white/10 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)] pb-safe-area transition-all duration-300">
                    <div className="flex items-end justify-between px-2 h-16 w-full max-w-full">
                        
                        {/* 1. HOME (Verde - Início) */}
                        <div className="flex-1 h-full flex items-center justify-center">
                            <NavButton 
                                icon="home" 
                                label="Início" 
                                onClick={() => app.setHomeViewActive(true)}
                                active={app.isHomeViewActive}
                            />
                        </div>

                        {/* 2. FAVORITOS (Substitui Ofertas nesta posição) */}
                        <div className="flex-1 h-full flex items-center justify-center">
                            <NavButton 
                                icon="favorite" 
                                label="Favoritos" 
                                onClick={() => {
                                    if (!user) {
                                        app.showToast("Faça login para ver favoritos");
                                        app.openModal('auth');
                                    } else {
                                        app.openModal('favorites');
                                    }
                                }}
                                active={app.isFavoritesModalOpen}
                            />
                        </div>

                        {/* 3. AÇÃO CENTRAL: ADICIONAR (+) OU IR PARA LISTA (CART) */}
                        <div className="flex-1 h-full flex items-center justify-center relative">
                            <button 
                                onClick={() => {
                                    if (app.isHomeViewActive) {
                                        // SE ESTIVER NA HOME: Verifica se existe lista ativa
                                        // Se tiver itens ou nome de mercado, vai para lista
                                        if (items.length > 0 || app.currentMarketName) {
                                            app.setHomeViewActive(false);
                                        } else {
                                            // Se não, abre modal para começar
                                            app.openModal('startShopping');
                                        }
                                    } else {
                                        // SE ESTIVER NA LISTA: Ação é "Adicionar Item"
                                        if (items.length === 0) app.openModal('startShopping');
                                        else app.openModal('addItem');
                                    }
                                }}
                                className={`absolute bottom-4 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl ring-4 ring-white/50 dark:ring-black/20 backdrop-blur-sm transition-all active:scale-95 ${app.theme === 'christmas' ? 'bg-[#165B33]' : (app.theme === 'newyear' ? 'bg-amber-500' : 'bg-gradient-to-br from-primary to-orange-600')}`}
                                title={app.isHomeViewActive ? "Ver minha lista" : "Adicionar item"}
                            >
                                {app.isHomeViewActive ? (
                                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>shopping_cart</span>
                                ) : (
                                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add</span>
                                )}
                            </button>
                        </div>

                        {/* 4. OFERTAS (Movido para cá, onde estava o Histórico) */}
                        <div className="flex-1 h-full flex items-center justify-center">
                            <NavButton 
                                icon="local_offer" // Changed from redeem
                                label="Ofertas" 
                                onClick={() => app.openModal('offers')}
                                active={app.isOffersModalOpen}
                            />
                        </div>

                        {/* 5. FERRAMENTAS / MENU */}
                        <div className="flex-1 h-full flex items-center justify-center">
                            <div className="relative">
                                {/* GATILHO PARA A CAIXA VERDE (GRID DE FERRAMENTAS) */}
                                <NavButton 
                                    icon={<span className="material-symbols-outlined text-[28px] animate-color-pulse">auto_awesome</span>}
                                    label="Menu" 
                                    onClick={handleBottomMenuClick}
                                    active={app.isToolsModalOpen}
                                />
                            </div>
                        </div>
                    </div>
                </footer>

                {/* MODALS RENDERED HERE VIA APP MODALS COMPONENT */}
                <AppModals 
                    sharedListData={sharedListData}
                    isImportingShare={isImportingShare}
                    isDistributionModalOpen={isDistributionModalOpen}
                    closeDistributionModal={closeDistributionModal}
                    handleShare={handleShare}
                    handleAddItem={handleAddItem}
                    editingItem={editingItem}
                    handleSavePurchase={handleSavePurchase}
                    handleFinishWithoutSaving={handleFinishWithoutSaving}
                    handleRepeatPurchase={handleRepeatPurchase}
                    handleAddHistoricItem={handleAddHistoricItem}
                    handleImportSharedList={handleImportSharedList}
                    handleStartShopping={handleStartShopping}
                    handleShareAndStart={handleShareAndStart}
                    handleAddToCurrentList={handleAddToCurrentList}
                    handleStartNewListForRecipe={handleStartNewListForRecipe}
                />
            </div>

            {/* Coluna 4: Web Sidebar Right */}
            <WebSidebarRight />
        </div>
    );
};

// Renderização Principal do App
const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <AuthProvider>
                <ShoppingListProvider>
                    <AppProvider>
                        <AppContent />
                    </AppProvider>
                </ShoppingListProvider>
            </AuthProvider>
        </React.StrictMode>
    );
}
