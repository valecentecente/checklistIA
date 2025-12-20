
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { ShoppingList } from './components/ShoppingList';
import type { ShoppingItem } from './types';
import { EmptyStateCTA } from './components/EmptyStateCTA';
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ShoppingListProvider, useShoppingList } from './contexts/ShoppingListContext';
import { Logo } from './components/Logo';
import { WebSidebarLeft } from './components/layout/WebSidebarLeft';
import { WebSidebarRight } from './components/layout/WebSidebarRight';
import { AppOptionsMenu } from './components/menus/AppOptionsMenu';
import { AppModals } from './components/modals/AppModals';

const SlideToFinish: React.FC<{ total: string; onFinish: () => void; }> = ({ total, onFinish }) => {
    const [sliderX, setSliderX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleInteractionStart = () => { if (sliderRef.current) { setIsDragging(true); sliderRef.current.style.transition = 'none'; } };
    const handleInteractionMove = useCallback((clientX: number) => {
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
    const handleInteractionEnd = useCallback(() => {
        if (!isDragging || !sliderRef.current) return;
        setIsDragging(false);
        sliderRef.current.style.transition = 'transform 0.3s ease';
        setSliderX(0);
    }, [isDragging]);
    
    useEffect(() => {
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

const AppContent: React.FC = () => {
    const { user } = useAuth();
    const { items, formatCurrency, deleteItem, updateItem, deleteRecipeGroup, toggleItemPurchased, savePurchase, finishWithoutSaving, addHistoricItem, repeatPurchase, addItem, findDuplicate, importSharedList, addIngredientsBatch, saveReceivedListToHistory } = useShoppingList();
    const app = useApp();
  
    const [sharedListData, setSharedListData] = useState<{ marketName: string; items: any[]; author?: any } | null>(null);
    const [isImportingShare, setIsImportingShare] = useState(false);
    const [currentShareId, setCurrentShareId] = useState<string | null>(null);
    const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
    
    const [isEditingMarketName, setIsEditingMarketName] = useState(false);
    const [tempMarketName, setTempMarketName] = useState('');
    const marketInputRef = useRef<HTMLInputElement>(null);

    // LÓGICA DE BADGE: O contador 'lastSeen' sincroniza com o total do app ao clicar, escondendo o badge
    const [lastSeenNotificationCount, setLastSeenNotificationCount] = useState(0);
    const showProfileBadge = app.unreadNotificationCount > 0 && app.unreadNotificationCount > lastSeenNotificationCount;

    const [isMobileLandscape, setIsMobileLandscape] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            const isLandscape = window.matchMedia("(orientation: landscape)").matches;
            const isSmallHeight = window.innerHeight < 600;
            const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            setIsMobileLandscape(isLandscape && isSmallHeight && isTouch);
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // Listener para restauração do nome do mercado (Vindo do ShoppingListContext)
    useEffect(() => {
        const handleRestoreMarket = (e: any) => {
            if (e.detail) app.setCurrentMarketName(e.detail);
        };
        window.addEventListener('restoreMarketName', handleRestoreMarket);
        return () => window.removeEventListener('restoreMarketName', handleRestoreMarket);
    }, [app]);

    const handleProfileClick = () => {
        // Marca todas como vistas globalmente nesta sessão ao clicar na foto
        setLastSeenNotificationCount(app.unreadNotificationCount);
        app.toggleAppOptionsMenu();
    };
    
    const handleBottomMenuClick = () => {
        app.openModal('tools');
    };

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
                    setSharedListData(data || null);
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
            await addIngredientsBatch(sharedListData.items.map((i: any) => ({
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

    useEffect(() => {
        if (user) {
            if (app.pendingAction) {
                if (app.isAuthModalOpen) app.closeModal('auth');
                setTimeout(() => {
                    if (app.pendingAction === 'organize') app.toggleGrouping();
                    else if (app.pendingAction) app.openModal(app.pendingAction);
                    app.setPendingAction(null);
                }, 300);
            } else if (app.isAuthModalOpen) {
                if (!app.pendingExploreRecipe) {
                    app.closeModal('auth');
                    app.showToast(`Bem-vindo, ${user.displayName || 'Usuário'}!`);
                }
            }
            if (sessionStorage.getItem('pending_save_purchase') === 'true') {
                sessionStorage.removeItem('pending_save_purchase');
                setTimeout(() => app.openModal('savePurchase'), 500);
            }
        }
    }, [user, app]);

    const handleAddItem = useCallback(async (item: any) => {
        const duplicate = findDuplicate(item.name, items);
        const performAddItem = async () => {
            try {
                await addItem(item);
                app.closeModal('addItem');
                app.setDuplicateInfo(null);
            } catch (error) {
                app.showToast("Erro ao adicionar item.");
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
                const key = item.responsibleDisplayName ? `Responsável: ${item.responsibleDisplayName}` : 'Não Atribuído';
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
        for (const [key, value] of sortedEntries) sortedGroups[key] = value;
        return sortedGroups;
    }, [items, app.groupingMode, app.itemCategories]);

    const handleSavePurchase = useCallback(async (marketName: string) => {
        const finalMarketName = marketName || app.currentMarketName; 
        await savePurchase(finalMarketName);
        app.setCurrentMarketName(null);
        app.setIsSharedSession(false);
        app.setFocusMode(false); 
        app.closeModal('savePurchase');
        app.setHomeViewActive(true);
        app.showToast("Sua compra foi salva!");
    }, [savePurchase, app]);

    const handleFinishWithoutSaving = useCallback(async () => {
        await finishWithoutSaving();
        app.setCurrentMarketName(null);
        app.setIsSharedSession(false);
        app.setFocusMode(false); 
        app.closeModal('savePurchase');
        app.setHomeViewActive(true);
        app.showToast("Lista limpa.");
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
            app.showToast(`"${item.name}" adicionado.`);
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
        if (navigator.share) {
            try {
                await navigator.share({ title: 'ChecklistIA', text: 'Confira este assistente de compras inteligente!', url: shareUrl });
            } catch (error) {
                if ((error as any).name !== 'AbortError') app.showToast("Erro ao compartilhar.");
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                app.showToast("Link copiado!");
            } catch (e) {
                app.showToast("Erro no compartilhamento.");
            }
        }
    };
  
    const handleStartShopping = async (marketName: string) => {
        const isRenaming = !!app.currentMarketName;
        app.setCurrentMarketName(marketName);
        app.setHomeViewActive(false); 
        app.closeModal('startShopping');
        if (app.pendingExploreRecipe) {
            const recipeName = app.pendingExploreRecipe;
            const recipe = app.getCachedRecipe(recipeName);
            if (recipe) {
                await app.addRecipeToShoppingList(recipe);
                app.setPendingExploreRecipe(null);
            } else {
                setTimeout(() => {
                    app.showRecipe(recipeName);
                    app.setPendingExploreRecipe(null);
                }, 300);
            }
        } else if (!isRenaming) app.openModal('addItem');
    };

    const handleShareAndStart = async (marketName: string) => {
        if (!user) {
            app.showToast("Faça login para compartilhar!");
            app.closeModal('startShopping');
            app.openModal('auth');
            return;
        }
        app.setCurrentMarketName(marketName);
        app.setHomeViewActive(false);
        app.closeModal('startShopping');
        app.openModal('shareList'); 
    };

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
        await handleFinishWithoutSaving(); 
        app.closeModal('recipeDecision');
        if (app.pendingExploreRecipe) {
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
    
    const startEditingMarketName = (e: React.MouseEvent) => {
        e.stopPropagation();
        setTempMarketName(app.currentMarketName || "Minha Lista");
        setIsEditingMarketName(true);
        setTimeout(() => marketInputRef.current?.focus(), 50);
    };

    const saveMarketNameInline = () => {
        const finalName = tempMarketName.trim() || "Minha Lista";
        app.setCurrentMarketName(finalName);
        setIsEditingMarketName(false);
    };

    const showHomeView = app.isHomeViewActive;
    const showSessionBar = !app.isHomeViewActive;

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
                ) : (icon)}
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

    const globalPatternStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23F97316' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M20 30c6 0 11-5 11-11s-5-11-11-11-11 5-11 11 5 11 11 11zm80 40c6 0 11-5 11-11s-5-11-11-11-11 5-11 11 5 11 11 11zm-70-10c3 0 5-2 5-5s-2-5-5-5-5 2-5 5 2 5 5 5zm110 50c3 0 5-2 5-5s-2-5-5-5-5 2-5 5 2 5 5 5zM60 140c3 0 5-2 5-5s-2-5-5-5-5 2-5 5 2 5 5 5zm100-120c3 0 5-2 5-5s-2-5-5-5-5 2-5 5 2 5 5 5zM25 140c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7zm50-100c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7zm40-20c5 0 9-4 9-9s-4-9-9-9-9 4-9 9 4 9 9 9zm-10 100c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7zm50 40c5 0 9-4 9-9s-4-9-9-9-9 4-9 9 4 9 9 9zM60 60c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7zm-12-20c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zm60-30c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zm60 60c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zM20 70c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4z'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '150px 150px'
    };

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
            <WebSidebarLeft />
            <div className="relative w-full lg:flex-1 lg:min-w-0 h-full flex flex-col bg-background-light dark:bg-background-dark shadow-2xl overflow-hidden" style={{contain: 'strict'}}>
                {app.theme === 'christmas' && (
                    <div aria-hidden="true" className="pointer-events-none">
                        {[...Array(10)].map((_, i) => <div key={i} className="snowflake">❅</div>)}
                    </div>
                )}
                {app.theme === 'newyear' && <NewYearFireworks />}
                {app.toastMessage && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[140] flex items-center gap-3 bg-zinc-900/95 text-white px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10 animate-fadeIn max-w-[90%] w-auto">
                        <span className="material-symbols-outlined text-green-400 !text-2xl shrink-0">check_circle</span>
                        <p className="text-sm font-medium leading-snug">{app.toastMessage}</p>
                    </div>
                )}
                
                <header className={`fixed md:fixed top-0 left-0 right-0 z-[115] flex-shrink-0 transition-all duration-300 lg:hidden ${app.isFocusMode ? 'hidden' : 'block'} bg-white/70 dark:bg-black/60 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-sm`}>
                    <div className="relative z-10 flex h-24 items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3">
                            <div onClick={() => app.setHomeViewActive(true)} className="h-12 w-12 shrink-0 rounded-full shadow-md overflow-hidden bg-white flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                                <Logo className="w-8 h-8 text-blue-600" />
                            </div>
                            <div className="flex flex-col justify-center items-start">
                            <h1 translate="no" className={`text-xl font-bold tracking-tight leading-none drop-shadow-md flex items-baseline ${app.theme === 'christmas' || app.theme === 'newyear' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                                {app.theme === 'newyear' ? 'Feliz 2026!' : (
                                    <><span>Checklist</span><span className="text-blue-600 dark:text-blue-400 ml-0.5">IA</span></>
                                )}
                            </h1>
                            <span translate="no" className="mt-1 w-fit rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-700 dark:bg-orange-900/60 dark:text-orange-200 leading-none shadow-sm">Beta</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {app.isAdmin && (
                                <button onClick={() => app.openModal('recipeAssistant')} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-gray-700">
                                    <span className="material-symbols-outlined !text-2xl text-primary dark:text-orange-400">restaurant</span>
                                </button>
                            )}
                            <div className="relative">
                                <button onClick={handleProfileClick} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-gray-700 overflow-hidden border-2 border-white shadow-sm">
                                    {user?.photoURL ? (<img src={user.photoURL} alt="Foto" className="h-full w-full object-cover" />) : (<span className="material-symbols-outlined !text-3xl">account_circle</span>)}
                                </button>
                                {showProfileBadge && (
                                    <button onClick={handleProfileClick} className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm border border-white z-20 animate-bounce">
                                        {app.unreadNotificationCount > 9 ? '9+' : app.unreadNotificationCount}
                                    </button>
                                )}
                                <AppOptionsMenu />
                            </div>
                        </div>
                    </div>
                </header>

                {showSessionBar && (
                    <div className={`fixed left-0 right-0 z-[112] w-full bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between shadow-sm animate-slideUp overflow-visible transition-all duration-300 ${app.isFocusMode ? 'top-0' : 'top-24 lg:top-0'}`}>
                       <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider mb-0.5">Local de Compra</span>
                          <div className="flex items-center gap-2 group">
                             {isEditingMarketName ? (
                                <input 
                                    ref={marketInputRef}
                                    type="text"
                                    value={tempMarketName}
                                    onChange={(e) => setTempMarketName(e.target.value)}
                                    onBlur={saveMarketNameInline}
                                    onKeyDown={(e) => e.key === 'Enter' && saveMarketNameInline()}
                                    className="bg-white dark:bg-zinc-800 border-none rounded px-2 py-0.5 font-bold text-primary dark:text-orange-400 text-lg w-full focus:ring-1 focus:ring-primary h-7"
                                />
                             ) : (
                                <div className="flex items-center gap-2 cursor-pointer" onClick={startEditingMarketName}>
                                    <span className="font-bold text-primary dark:text-orange-400 text-lg leading-none truncate max-w-[200px]">{app.currentMarketName || "Minha Lista"}</span>
                                    <span className="material-symbols-outlined text-sm text-gray-400 group-hover:text-primary transition-colors">edit</span>
                                </div>
                             )}
                          </div>
                       </div>
                       <div className="flex items-center justify-end pl-2 gap-2">
                          <button onClick={() => app.showCartTooltip()} className="relative h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors" title="Itens Comprados">
                            <span className="material-symbols-outlined">shopping_cart</span>
                            {purchasedItemsCount > 0 && <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm animate-bounce border border-white dark:border-surface-dark">{purchasedItemsCount}</span>}
                          </button>
                          {app.isSharedSession ? (
                             <div className="flex -space-x-3 items-center relative animate-fadeIn" title="Sincronizado">
                                <div className="relative z-10 rounded-full ring-2 ring-background-light dark:ring-background-dark">
                                    {user?.photoURL ? (<img src={user.photoURL} alt="Você" className="w-9 h-9 rounded-full object-cover" />) : (<div className="w-9 h-9 rounded-full bg-orange-200 flex items-center justify-center text-orange-800"><span className="material-symbols-outlined text-lg">person</span></div>)}
                                </div>
                                <div className="relative z-0 rounded-full ring-2 ring-background-light dark:ring-background-dark opacity-90">
                                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white"><span className="material-symbols-outlined text-lg">group</span></div>
                                </div>
                                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border border-white dark:border-gray-800 animate-pulse"></div>
                             </div>
                          ) : (
                             <button onClick={() => { if (!user) app.openModal('auth'); else app.openModal('shareList'); }} className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors" title="Compartilhar Lista">
                                <span className="material-symbols-outlined">person_add</span>
                             </button>
                          )}
                            <button onClick={(e) => { e.stopPropagation(); app.setFocusMode(!app.isFocusMode); }} className="h-10 w-10 flex lg:hidden items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                                <span className="material-symbols-outlined">{app.isFocusMode ? 'close_fullscreen' : 'open_in_full'}</span>
                            </button>
                       </div>
                    </div>
                )}

                {app.isCartTooltipVisible && showSessionBar && (
                    <div className={`fixed right-4 z-[130] w-auto max-w-[200px] bg-zinc-800/95 backdrop-blur-md border border-white/10 text-white rounded-xl shadow-2xl animate-fadeIn p-3 pointer-events-none transition-all duration-300 ${app.isFocusMode ? 'top-16' : 'top-40 lg:top-16'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                            <span className="font-bold text-sm">{purchasedItemsCount} Comprados</span>
                        </div>
                        <p className="text-[10px] text-gray-300 leading-tight">Itens salvos. Finalize para limpar.</p>
                    </div>
                )}

                <main 
                    className={`flex-1 overflow-y-auto p-4 pb-40 scrollbar-hide relative w-full transition-all duration-300 ${showSessionBar ? (app.isFocusMode ? 'pt-20' : 'pt-40 lg:pt-20') : (app.isFocusMode ? 'pt-4' : 'pt-28 lg:pt-4')}`}
                    style={globalPatternStyle}
                >
                    <div className="flex flex-col gap-4 relative z-10">
                        {app.budget !== null && !showHomeView && (
                            <div className="flex flex-col gap-4 rounded-xl bg-surface-light p-5 shadow-sm dark:bg-surface-dark">
                                <div className="flex items-center justify-between"><p className="text-base font-semibold">Resumo do Orçamento</p><span>{formattedTotal} de {formatCurrency(app.budget)}</span></div>
                                <div className="flex items-center gap-4">
                                    <div className="relative h-16 w-16"><svg viewBox="0 0 36 36"><circle className="stroke-gray-200 dark:stroke-gray-700" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle><circle className="stroke-primary" cx="18" cy="18" fill="none" r="16" strokeDasharray="100" strokeDashoffset={100 - budgetProgress} strokeLinecap="round" strokeWidth="3" transform="rotate(-90 18 18)"></circle></svg><div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-bold text-primary">{Math.round(budgetProgress)}%</span></div></div>
                                    <div className="flex-1"><div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-2.5 rounded-full bg-primary" style={{ width: `${budgetProgress}%` }}></div></div></div>
                                </div>
                            </div>
                        )}
                        {showHomeView ? (<EmptyStateCTA onShowRecipeAssistant={() => app.openModal('recipeAssistant')} onShowBudget={() => app.openModal('budget')} />) : (<ShoppingList groupedItems={groupedItems} onDeleteItem={deleteItem} onDeleteGroup={deleteRecipeGroup} onStartEdit={app.startEdit} onShowRecipe={app.showRecipe} onTogglePurchased={toggleItemPurchased} />)}
                    </div>
                </main>

                {!showHomeView && (
                    <button onClick={() => app.openModal('addItem')} className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-40 h-16 w-16 bg-primary hover:bg-primary-hover text-white rounded-full items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95" title="Adicionar Item">
                        <span className="material-symbols-outlined text-3xl">add</span>
                    </button>
                )}

                {(!showHomeView) && <SlideToFinish total={formattedTotal} onFinish={() => app.openModal('savePurchase')} />}

                <footer className="fixed lg:hidden bottom-0 left-0 right-0 w-full z-[100] bg-white/70 dark:bg-[#121212]/70 backdrop-blur-xl border-t border-white/20 dark:border-white/10 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)] pb-safe-area transition-all duration-300">
                    <div className="flex items-end justify-between px-2 h-16 w-full max-w-full">
                        <div className="flex-1 h-full flex items-center justify-center"><NavButton icon="home" label="Início" onClick={() => app.setHomeViewActive(true)} active={app.isHomeViewActive} /></div>
                        <div className="flex-1 h-full flex items-center justify-center"><NavButton icon="favorite" label="Favoritos" onClick={() => { if (!user) app.openModal('auth'); else app.openModal('favorites'); }} active={app.isFavoritesModalOpen} /></div>
                        <div className="flex-1 h-full flex items-center justify-center relative">
                            <button onClick={() => { if (app.isHomeViewActive) { app.setHomeViewActive(false); } else { app.openModal('addItem'); } }} className={`absolute bottom-4 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl ring-4 ring-white/50 dark:ring-black/20 backdrop-blur-sm transition-all active:scale-95 ${app.theme === 'christmas' ? 'bg-[#165B33]' : (app.theme === 'newyear' ? 'bg-amber-500' : 'bg-gradient-to-br from-primary to-orange-600')}`}>
                                {app.isHomeViewActive ? (<span className="material-symbols-outlined" style={{ fontSize: '32px' }}>shopping_cart</span>) : (<span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add</span>)}
                            </button>
                        </div>
                        <div className="flex-1 h-full flex items-center justify-center"><NavButton icon="local_offer" label="Ofertas" onClick={() => app.openModal('offers')} active={app.isOffersModalOpen} /></div>
                        <div className="flex-1 h-full flex items-center justify-center relative"><NavButton icon={<span className="material-symbols-outlined text-[28px] animate-color-pulse">auto_awesome</span>} label="Menu" onClick={handleBottomMenuClick} active={app.isToolsModalOpen} /></div>
                    </div>
                </footer>
                <AppModals sharedListData={sharedListData} isImportingShare={isImportingShare} isDistributionModalOpen={isDistributionModalOpen} closeDistributionModal={closeDistributionModal} handleShare={handleShare} handleAddItem={handleAddItem} editingItem={editingItem} handleSavePurchase={handleSavePurchase} handleFinishWithoutSaving={handleFinishWithoutSaving} handleRepeatPurchase={handleRepeatPurchase} handleAddHistoricItem={handleAddHistoricItem} handleImportSharedList={handleImportSharedList} handleStartShopping={handleStartShopping} handleShareAndStart={handleShareAndStart} handleAddToCurrentList={handleAddToCurrentList} handleStartNewListForRecipe={handleStartNewListForRecipe} />
            </div>
            <WebSidebarRight />
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <AuthProvider><ShoppingListProvider><AppProvider><AppContent /></AppProvider></ShoppingListProvider></AuthProvider>
        </React.StrictMode>
    );
}
