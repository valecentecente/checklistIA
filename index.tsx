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
        <div className="fixed bottom-20 lg:bottom-24 left-1/2 -translate-x-1/2 z-[120] animate-fadeIn" ref={containerRef}>
            <div className="relative h-14 w-60 rounded-full bg-white/95 dark:bg-surface-dark border border-primary/40 dark:border-primary/60 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md flex items-center p-1.5 overflow-hidden">
                <div ref={sliderRef} onMouseDown={handleInteractionStart} onTouchStart={handleInteractionStart} className="absolute h-11 w-20 bg-primary rounded-full flex items-center justify-center text-white cursor-grab active:cursor-grabbing z-10 select-none shadow-md" style={{ transform: `translateX(${sliderX}px)` }}>
                    <span className="font-bold text-xs">{total}</span>
                </div>
                <div className="absolute w-full text-right pr-6 text-primary dark:text-orange-300 font-black text-[10px] uppercase tracking-widest animate-pulse" style={{ opacity: isDragging ? 0 : 1, transition: 'opacity 0.2s' }}>
                    Finalizar &gt;&gt;
                </div>
            </div>
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
    
    const [isEditingMarketName, setIsEditingMarketName] = useState(false);
    const [tempMarketName, setTempMarketName] = useState('');
    const marketInputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const hasSeenOffer = localStorage.getItem('hasSeenInstallOffer') === 'true';

        if (isMobile && !isStandalone && !hasSeenOffer) {
            setTimeout(() => {
                app.openModal('distribution');
                localStorage.setItem('hasSeenInstallOffer', 'true');
            }, 3500); 
        }
    }, [app]);

    useEffect(() => {
        const handleRestoreMarket = (e: any) => {
            if (e.detail) app.setCurrentMarketName(e.detail);
        };
        window.addEventListener('restoreMarketName', handleRestoreMarket);
        return () => window.removeEventListener('restoreMarketName', handleRestoreMarket);
    }, [app]);

    const handleProfileClick = () => {
        setLastSeenNotificationCount(app.unreadNotificationCount);
        app.toggleAppOptionsMenu();
    };
    
    const handleBottomMenuClick = () => {
        app.openModal('tools');
    };

    const handleBudgetClick = () => {
        if (!user) {
            app.showToast("Faça login para definir seu orçamento.");
            app.setPendingAction('budget');
            app.openModal('auth');
        } else {
            app.openModal('budget');
        }
    };

    const closeDistributionModal = () => app.closeModal('distribution');

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
    
    const purchasedTotal = useMemo(() => {
        return items
            .filter(i => i.isPurchased)
            .reduce((acc, item) => {
                const val = parseFloat(String(item.calculatedPrice)) || 0;
                return acc + val;
            }, 0);
    }, [items]);

    const listTotal = useMemo(() => {
        return items.reduce((acc, item) => {
            const val = parseFloat(String(item.calculatedPrice)) || 0;
            return acc + val;
        }, 0);
    }, [items]);

    const purchasedItemsCount = useMemo(() => items.filter(item => item.isPurchased).length, [items]);
    const formattedTotal = useMemo(() => formatCurrency(purchasedTotal), [purchasedTotal, formatCurrency]);
    const budgetProgress = useMemo(() => (!app.budget || app.budget === 0) ? 0 : Math.min((purchasedTotal / app.budget) * 100, 100), [purchasedTotal, app.budget]);

    const piggyStyle = useMemo(() => {
        if (app.budget === null) return 'bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-black/10';
        const percent = (purchasedTotal / app.budget) * 100;
        if (percent > 100) return 'bg-red-600 text-white animate-pulse shadow-[0_8px_32px_rgba(220,38,38,0.5)] border-red-700';
        else if (percent >= 95) return 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800';
        else if (percent >= 80) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
        else return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800';
    }, [app.budget, purchasedTotal]);

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
        app.clearBudget(); 
        app.closeModal('savePurchase');
        app.setHomeViewActive(true);
        app.showToast("Sua compra foi salva!");
    }, [savePurchase, app]);

    const handleFinishWithoutSaving = useCallback(async () => {
        await finishWithoutSaving();
        app.setCurrentMarketName(null);
        app.setIsSharedSession(false);
        app.setFocusMode(false); 
        app.clearBudget(); 
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
  
    const handleShareAndStart = async (marketName: string) => {
        if (!user) {
            app.showToast("Faça login para compartilhar!");
            app.openModal('auth');
            return;
        }
        app.setCurrentMarketName(marketName);
        app.setHomeViewActive(false);
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

    const startEditingMarketName = () => {
        setTempMarketName(app.currentMarketName || "Minha Lista");
        setIsEditingMarketName(true);
    };

    const saveMarketNameChange = () => {
        if (tempMarketName.trim()) {
            app.setCurrentMarketName(tempMarketName.trim());
        }
        setIsEditingMarketName(false);
    };

    const handleMarketNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') saveMarketNameChange();
        if (e.key === 'Escape') setIsEditingMarketName(false);
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
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23F97316' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M20 30c6 0 11-5 11-11s-5-11-11-11-11 5-11 11 5 11 11 11zm80 40c6 0 11-5 11-11s-5-11-11-11-11 5-11 11 5 11 11 11zm-70-10c3 0 5-2 5-5s-2-5-5-5-5 2-5 5 2 5 5 5zm110 50c3 0 5-2 5-5s-2-5-5-5-5 2-5 5 2 5 5 5zM60 140c3 0 5-2 5-5s-2-5-5-5-5 2-5 5 2 2 5 5 5zm100-120c3 0 5-2 5-5s-2-5-5-5-5 2-5 5 2 2 5 5 5zM25 140c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7zm50-100c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7zm40-20c5 0 9-4 9-9s-4-9-9-9-9 4-9 9 4 9 9 9zm-10 100c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7zm50 40c5 0 9-4 9-9s-4-9-9-9-9 4-9 9 4 9 9 9zM60 60c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7zm-12-20c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zm60-30c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zm60 60c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zM20 70c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 2 4 4 4'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '150px 150px'
    };

    if (isMobileLandscape) return <div className="fixed inset-0 z-[9999] bg-[#121212] flex items-center justify-center text-white">Gire o dispositivo</div>;

    return (
        <div className="w-full h-[100dvh] bg-background-light dark:bg-background-dark lg:flex overflow-hidden">
            <WebSidebarLeft />
            <div className="relative w-full lg:flex-1 h-full flex flex-col bg-background-light dark:bg-background-dark shadow-2xl overflow-hidden transform-gpu">
                
                <div className={`sticky top-0 z-[115] w-full flex-shrink-0 transition-all duration-300 lg:hidden ${app.isFocusMode ? 'h-0 overflow-hidden opacity-0 invisible' : 'h-auto opacity-100 visible'} bg-white/40 dark:bg-black/30 backdrop-blur-2xl border-b border-white/10 dark:border-white/5 shadow-lg`}>
                    <header className="flex h-20 items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3">
                            <div onClick={() => app.setHomeViewActive(true)} className="h-10 w-10 shrink-0 rounded-full shadow-md overflow-hidden bg-white/90 flex items-center justify-center cursor-pointer">
                                <Logo className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex flex-col justify-center items-start">
                                <h1 translate="no" className="text-lg font-bold tracking-tight leading-none text-slate-800 dark:text-white">
                                    <span>Checklist</span><span className="text-blue-600 dark:text-blue-400 ml-0.5">IA</span>
                                </h1>
                                <span translate="no" className="mt-0.5 w-fit rounded-full bg-orange-100/80 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-orange-700 leading-none shadow-sm backdrop-blur-sm">Beta</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {app.isAdmin && (
                                <button 
                                    onClick={() => app.openModal('adminHub')}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-800 shadow-sm transition-all active:scale-95"
                                    title="Painel Admin"
                                >
                                    <span className="material-symbols-outlined !text-xl font-variation-FILL-1" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                                </button>
                            )}
                            
                            <div className="relative">
                                <button onClick={handleProfileClick} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white/20 dark:text-slate-300 overflow-hidden border-2 border-white ring-1 ring-black/5 shadow-sm backdrop-blur-md">
                                    {user?.photoURL ? <img src={user.photoURL} alt="Foto" className="h-full w-full object-cover" /> : <span className="material-symbols-outlined !text-2xl">account_circle</span>}
                                </button>
                                {showProfileBadge && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white">!</span>}
                                <AppOptionsMenu />
                            </div>
                        </div>
                    </header>
                </div>

                {showSessionBar && (
                    <div className={`sticky top-0 z-[112] w-full flex-shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-white/10 px-4 flex items-center justify-between shadow-sm transition-all duration-300 ${app.isFocusMode ? 'py-2 h-12' : 'py-3 h-auto'}`}>
                        <div className="flex flex-col flex-1 min-w-0">
                            {!app.isFocusMode && <span className="text-[9px] uppercase font-black text-gray-500/80 tracking-widest mb-0.5">Local de Compra</span>}
                            
                            {isEditingMarketName ? (
                                <input
                                    ref={marketInputRef}
                                    autoFocus
                                    className="bg-transparent border-b border-primary/40 focus:border-primary opacity-100 opacity-100 outline-none font-black text-primary dark:text-orange-400 text-sm leading-none w-full max-w-[220px]"
                                    value={tempMarketName}
                                    onChange={(e) => setTempMarketName(e.target.value)}
                                    onBlur={saveMarketNameChange}
                                    onKeyDown={handleMarketNameKeyDown}
                                />
                            ) : (
                                <div className="flex items-center gap-1.5 cursor-pointer group" onClick={startEditingMarketName}>
                                    <span className={`font-black text-primary dark:text-orange-400 leading-none truncate max-w-[220px] ${app.isFocusMode ? 'text-xs' : 'text-sm'}`}>
                                        {app.currentMarketName || "Minha Lista"}
                                    </span>
                                    {!app.isFocusMode && <span className="material-symbols-outlined text-[12px] text-gray-400 group-hover:text-primary transition-colors">edit</span>}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end pl-2 gap-2">
                            {app.isOffline ? (
                                <div className="h-9 w-9 flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 animate-pulse" title="Modo Offline Ativo (Cache)">
                                    <span className="material-symbols-outlined text-xl">cloud_off</span>
                                </div>
                            ) : (
                                <div className="h-9 w-9 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/10 text-blue-400 opacity-40" title="Sincronizado com a Nuvem">
                                    <span className="material-symbols-outlined text-xl">cloud_done</span>
                                </div>
                            )}

                            <button onClick={handleBudgetClick} className={`h-9 w-9 flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${piggyStyle}`} title="Definir Orçamento">
                                <span className={`material-symbols-outlined text-xl ${app.budget !== null ? 'font-variation-FILL-1' : ''}`} style={ app.budget !== null ? { fontVariationSettings: "'FILL' 1" } : {} }>savings</span>
                            </button>

                            <button onClick={() => app.showCartTooltip()} className="relative h-9 w-9 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors hover:bg-black/10">
                                <span className="material-symbols-outlined text-xl">shopping_cart</span>
                                {purchasedItemsCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-green-600 text-white text-[8px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center border border-white">{purchasedItemsCount}</span>}
                            </button>
                            
                            <button onClick={() => app.setFocusMode(!app.isFocusMode)} className="h-9 w-9 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-xl">{app.isFocusMode ? 'close_fullscreen' : 'open_in_full'}</span>
                            </button>
                        </div>
                    </div>
                )}

                <main className={`flex-1 ${showHomeView ? 'lg:overflow-y-auto overflow-hidden' : 'overflow-y-auto'} p-4 pb-40 scrollbar-hide relative w-full transition-all duration-300`} style={globalPatternStyle}>
                    <div className="flex flex-col gap-4 relative z-10">
                        {app.budget !== null && !showHomeView && (
                            <div className="flex flex-col gap-4 rounded-2xl bg-white dark:bg-white/5 p-5 border border-gray-100 dark:border-white/10 shadow-sm animate-fadeIn">
                                <div className="flex items-center justify-between text-slate-800 dark:text-white">
                                    <p className="text-base font-bold font-display uppercase tracking-tight">Resumo Gasto</p>
                                    <span className="font-black text-sm">{formattedTotal} / {formatCurrency(app.budget)}</span>
                                </div>
                                <div className="h-3 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden shadow-inner">
                                    <div className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${purchasedTotal > app.budget ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${budgetProgress}%` }}></div>
                                </div>
                            </div>
                        )}
                        {showHomeView ? <EmptyStateCTA onShowRecipeAssistant={() => app.openModal('recipeAssistant')} onShowBudget={() => app.openModal('budget')} /> : <ShoppingList groupedItems={groupedItems} onDeleteItem={deleteItem} onDeleteGroup={deleteRecipeGroup} onStartEdit={app.startEdit} onShowRecipe={app.showRecipe} onTogglePurchased={toggleItemPurchased} />}
                    </div>
                </main>

                {!showHomeView && (
                    <button onClick={() => app.openModal('addItem')} className="hidden lg:flex lg:absolute lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 z-40 h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-2xl shadow-primary/40 ring-4 ring-white/10 transition-all hover:scale-110 active:scale-95 animate-fadeIn" title="Adicionar Item">
                        <span className="material-symbols-outlined !text-4xl">add</span>
                    </button>
                )}

                {!showHomeView && <SlideToFinish total={formattedTotal} onFinish={() => app.openModal('savePurchase')} />}

                <footer className="fixed lg:hidden bottom-0 w-full z-[100] bg-white/70 dark:bg-[#121212]/70 backdrop-blur-xl border-t border-white/20 dark:border-white/10 shadow-lg transition-all duration-300 pb-safe-bottom">
                    <div className="flex items-end justify-between px-2 h-16 w-full max-w-full">
                        <div className="flex-1 h-full"><NavButton icon="home" label="Início" onClick={() => app.setHomeViewActive(true)} active={app.isHomeViewActive} /></div>
                        <div className="flex-1 h-full"><NavButton icon="favorite" label="Favoritos" onClick={() => app.openModal('favorites')} /></div>
                        <div className="flex-1 h-full flex items-center justify-center relative">
                            <button onClick={() => app.isHomeViewActive ? app.setHomeViewActive(false) : app.openModal('addItem')} className="absolute bottom-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-xl ring-4 ring-white/20 transition-all active:scale-95">
                                <span className="material-symbols-outlined" style={ { fontSize: '32px' } }>{app.isHomeViewActive ? 'shopping_cart' : 'add'}</span>
                            </button>
                        </div>
                        <div className="flex-1 h-full"><NavButton icon="local_offer" label="Ofertas" onClick={() => app.openModal('offers')} /></div>
                        <div className="flex-1 h-full"><NavButton icon={<span className="material-symbols-outlined text-[28px] animate-color-pulse">auto_awesome</span>} label="Menu" onClick={handleBottomMenuClick} /></div>
                    </div>
                </footer>

                <AppModals sharedListData={sharedListData} isImportingShare={isImportingShare} isDistributionModalOpen={app.isDistributionModalOpen} closeDistributionModal={closeDistributionModal} handleShare={handleShare} handleAddItem={handleAddItem} editingItem={editingItem} handleSavePurchase={handleSavePurchase} handleFinishWithoutSaving={handleFinishWithoutSaving} handleRepeatPurchase={handleRepeatPurchase} handleAddHistoricItem={handleAddHistoricItem} handleImportSharedList={handleImportSharedList} handleShareAndStart={handleShareAndStart} handleAddToCurrentList={handleAddToCurrentList} handleStartNewListForRecipe={handleStartNewListForRecipe} />
            </div>
            <WebSidebarRight />
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(<AuthProvider><ShoppingListProvider><AppProvider><AppContent /></AppProvider></ShoppingListProvider></AuthProvider>);
}
// Checkpoint de Segurança: 22/05/2025 - Estabilidade Garantida V3.0