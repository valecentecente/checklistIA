


import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, getCountFromServer, where, onSnapshot, updateDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
// Fix: Added HomeCategory to imports to resolve line 6 error.
import type { DuplicateInfo, FullRecipe, RecipeDetails, ShoppingItem, ReceivedListRecord, RecipeSuggestion, Offer, ScheduleRule, SalesOpportunity, HomeCategory } from '../types';
import { useShoppingList } from './ShoppingListContext';
import { useAuth } from './AuthContext';

export type Theme = 'light' | 'dark' | 'christmas' | 'newyear';

const RECIPE_CACHE_KEY = 'checklistia_global_recipes_v1';
const RECIPE_CACHE_TTL = 1000 * 60 * 60 * 12; 

const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const getRecipeDocId = (name: string) => {
    return name.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[\/\s]+/g, '-') 
        .replace(/[^a-z0-9-]/g, '') 
        .slice(0, 80);
};

const mapToFullRecipeArray = (data: any): FullRecipe[] => {
    if (!Array.isArray(data)) return [] as FullRecipe[];
    return data.map((r: any): FullRecipe => ({
        name: String(r.name || 'Receita'),
        ingredients: Array.isArray(r.ingredients) ? r.ingredients.map((i: any) => ({
            simplifiedName: String(i.simplifiedName || ''),
            detailedName: String(i.detailedName || '')
        })) : [] as { simplifiedName: string; detailedName: string; }[],
        instructions: Array.isArray(r.instructions) ? r.instructions.map(String) : [] as string[],
        imageQuery: String(r.imageQuery || r.name || ''),
        servings: String(r.servings || '2 porções'),
        prepTimeInMinutes: Number(r.prepTimeInMinutes || 30),
        difficulty: (r.difficulty === 'Fácil' || r.difficulty === 'Médio' || r.difficulty === 'Difícil' ? r.difficulty : 'Médio') as 'Fácil' | 'Médio' | 'Difícil',
        cost: (r.cost === 'Baixo' || r.cost === 'Médio' || r.cost === 'Alto' ? r.cost : 'Médio') as 'Baixo' | 'Médio' | 'Alto',
        imageUrl: r.imageUrl,
        imageSource: r.imageSource || 'cache',
        description: r.description,
        keywords: Array.isArray(r.keywords) ? r.keywords.map(String) : [] as string[],
        tags: Array.isArray(r.tags) ? r.tags.map(String) : [] as string[],
        isAlcoholic: !!r.isAlcoholic,
        suggestedLeads: Array.isArray(r.suggestedLeads) ? r.suggestedLeads.map(String) : [] as string[]
    }));
};

const INITIAL_MODAL_STATES = {
    isAddItemModalOpen: false, isBudgetModalOpen: false, isRecipeAssistantModalOpen: false,
    isOptionsMenuOpen: false, isAppOptionsMenuOpen: false, isCalculatorModalOpen: false,
    isAboutModalOpen: false, isSavePurchaseModalOpen: false, isHistoryModalOpen: false,
    isAuthModalOpen: false, isContactModalOpen: false, isTourModalOpen: false,
    isProfileModalOpen: false, isThemeModalOpen: false,
    isSharedListModalOpen: false,
    isFeedbackModalOpen: false,
    isPreferencesModalOpen: false,
    isSmartNudgeModalOpen: false,
    isRecipeDecisionModalOpen: false,
    isFavoritesModalOpen: false,
    isOffersModalOpen: false,
    isAdminModalOpen: false,
    isAdminRecipesModalOpen: false,
    isAdminReviewsModalOpen: false,
    isAdminScheduleModalOpen: false,
    // Fix: Added missing state to resolve AdminUsersModal error.
    isAdminUsersModalOpen: false,
    isManageTeamModalOpen: false,
    isTeamReportsModalOpen: false, 
    isArcadeModalOpen: false,
    isAdminInviteModalOpen: false,
    isInfoModalOpen: false,
    isStartShoppingModalOpen: false,
    isShareListModalOpen: false,
    isThemeRecipesModalOpen: false,
    isToolsModalOpen: false,
    isProductDetailsModalOpen: false,
    isUnitConverterModalOpen: false, 
    isContentFactoryModalOpen: false,
    isRecipeSelectionModalOpen: false,
    isDistributionModalOpen: false
};

interface AppContextType {
    isAddItemModalOpen: boolean;
    isBudgetModalOpen: boolean;
    isRecipeAssistantModalOpen: boolean;
    isOptionsMenuOpen: boolean;
    isAppOptionsMenuOpen: boolean;
    isCalculatorModalOpen: boolean;
    isAboutModalOpen: boolean;
    isSavePurchaseModalOpen: boolean;
    isHistoryModalOpen: boolean;
    isAuthModalOpen: boolean;
    isContactModalOpen: boolean;
    isThemeModalOpen: boolean;
    isSharedListModalOpen: boolean;
    isFeedbackModalOpen: boolean;
    isPreferencesModalOpen: boolean;
    isSmartNudgeModalOpen: boolean;
    isRecipeDecisionModalOpen: boolean;
    isFavoritesModalOpen: boolean;
    isOffersModalOpen: boolean;
    isAdminModalOpen: boolean;
    isAdminRecipesModalOpen: boolean;
    isAdminReviewsModalOpen: boolean;
    isAdminScheduleModalOpen: boolean; 
    // Fix: Added missing property to resolve AdminUsersModal error.
    isAdminUsersModalOpen: boolean;
    isManageTeamModalOpen: boolean;
    isTeamReportsModalOpen: boolean; 
    isArcadeModalOpen: boolean;
    isAdminInviteModalOpen: boolean;
    isInfoModalOpen: boolean;
    isStartShoppingModalOpen: boolean;
    isShareListModalOpen: boolean;
    isThemeRecipesModalOpen: boolean;
    isToolsModalOpen: boolean;
    isProductDetailsModalOpen: boolean;
    isUnitConverterModalOpen: boolean; 
    isContentFactoryModalOpen: boolean;
    isRecipeSelectionModalOpen: boolean;
    isTourModalOpen: boolean;
    isProfileModalOpen: boolean;
    isDistributionModalOpen: boolean;
    
    openModal: (modal: string) => void;
    closeModal: (modal: string) => void;
    toggleAppOptionsMenu: () => void;
    toggleOptionsMenu: () => void;

    theme: Theme;
    setTheme: (theme: Theme) => void;

    installPromptEvent: any;
    handleInstall: () => Promise<boolean>;
    handleDismissInstall: () => void;
    isPWAInstallVisible: boolean; 
    
    budget: number | null;
    setBudget: (newBudget: number) => void;
    clearBudget: () => void;

    toastMessage: string | null;
    showToast: (message: string) => void;
    isCartTooltipVisible: boolean;
    showCartTooltip: () => void;

    fullRecipes: Record<string, FullRecipe>;
    setFullRecipes: React.Dispatch<React.SetStateAction<Record<string, FullRecipe>>>;
    selectedRecipe: FullRecipe | null;
    setSelectedRecipe: (recipe: FullRecipe | null) => void; 
    isRecipeLoading: boolean;
    isSearchingAcervo: boolean; 
    recipeError: string | null;
    fetchRecipeDetails: (recipeName: string, imageBase64?: string, autoAdd?: boolean) => Promise<void>;
    handleRecipeImageGenerated: (recipeName: string, imageUrl: string, source: 'cache' | 'genai') => void;
    showRecipe: (recipe: string | FullRecipe) => void; 
    closeRecipe: () => void;
    resetRecipeState: () => void; 
    
    featuredRecipes: FullRecipe[];
    recipeSuggestions: FullRecipe[];
    isSuggestionsLoading: boolean;
    currentTheme: string | null;
    fetchThemeSuggestions: (prompt: string, priorityRecipeName?: string) => Promise<void>;
    handleExploreRecipeClick: (recipe: string | FullRecipe) => void; 
    pendingExploreRecipe: string | null;
    setPendingExploreRecipe: (name: string | null) => void;
    totalRecipeCount: number;
    searchGlobalRecipes: (queryStr: string) => Promise<FullRecipe[]>;
    getCategoryCount: (categoryLabel: string) => number;
    getCategoryCover: (categoryLabel: string) => string | undefined; 
    getCategoryRecipes: (categoryKey: string) => FullRecipe[];
    getCategoryRecipesSync: (categoryKey: string) => FullRecipe[];
    getCachedRecipe: (name: string) => FullRecipe | undefined;
    getRandomCachedRecipe: () => FullRecipe | null;
    generateKeywords: (text: string) => string[];

    scheduleRules: ScheduleRule[];
    saveScheduleRules: (rules: ScheduleRule[]) => Promise<void>;
    // Fix: Added homeCategories to AppContextType to resolve saveHomeCategories error.
    homeCategories: HomeCategory[];
    saveHomeCategories: (categories: HomeCategory[]) => Promise<void>;

    recipeSearchResults: FullRecipe[];
    currentSearchTerm: string;
    handleRecipeSearch: (term: string) => Promise<void>;

    editingItemId: string | null;
    startEdit: (id: string) => void;
    cancelEdit: () => void;
    duplicateInfo: DuplicateInfo | null;
    setDuplicateInfo: (info: DuplicateInfo | null) => void;

    groupingMode: 'recipe' | 'aisle' | 'responsible';
    setGroupingMode: (mode: 'recipe' | 'aisle' | 'responsible') => void;
    isOrganizing: boolean;
    toggleGrouping: () => Promise<void>;
    itemCategories: Record<string, string>;

    showStartHerePrompt: boolean;
    isHomeViewActive: boolean;
    setHomeViewActive: (active: boolean) => void;
    
    authTrigger: string | null;
    setAuthTrigger: (trigger: string | null) => void;
    isAdmin: boolean; 
    isSuperAdmin: boolean; 

    incomingList: ReceivedListRecord | null;
    clearIncomingList: () => void;
    unreadNotificationCount: number;
    currentMarketName: string | null;
    setCurrentMarketName: (name: string | null) => void;
    isSharedSession: boolean;
    setIsSharedSession: (isShared: boolean) => void;
    stopSharing: () => void;
    historyActiveTab: 'my' | 'received';
    setHistoryActiveTab: (tab: 'my' | 'received') => void;

    smartNudgeItemName: string | null;
    
    isFocusMode: boolean;
    setFocusMode: (mode: boolean) => void;
    
    pendingAction: string | null;
    setPendingAction(action: string | null): void;

    addRecipeToShoppingList: (recipe: FullRecipe) => Promise<void>;
    showPWAInstallPromptIfAvailable: () => void;

    selectedProduct: Offer | null; 
    openProductDetails: (product: Offer) => void; 
    isOffline: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const callGenAIWithRetry = async <T = GenerateContentResponse>(fn: () => Promise<T>, retries = 8): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const errorStr = (JSON.stringify(error) || error?.toString() || '').toLowerCase();
        const isQuotaError = 
            error?.status === 429 || 
            errorStr.includes('429') || 
            errorStr.includes('quota') ||
            errorStr.includes('resource_exhausted') ||
            errorStr.includes('rate limit');
                             
        if (retries > 0 && isQuotaError) {
            const baseDelay = (9 - retries) * 15000; 
            const jitter = Math.random() * 5000;
            const finalDelay = baseDelay + jitter;
            
            console.warn(`[IA] Limite atingido. Aguardando ${Math.round(finalDelay/1000)}s para renovação da qota.`);
            await new Promise(resolve => setTimeout(resolve, finalDelay));
            return callGenAIWithRetry(fn, retries - 1);
        }
        throw error;
    }
};

const ignorePermissionError = (err: any) => {
    if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
        return true;
    }
    return false;
};

export const generateKeywords = (text: string): string[] => {
    if (!text) return [] as string[];
    const stopWords = ['de', 'da', 'do', 'dos', 'das', 'com', 'sem', 'em', 'para', 'ao', 'na', 'no', 'receita', 'molho', 'a', 'o', 'e', 'um', 'uma', 'quero'];
    return text
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9\s]/g, '') 
        .split(/\s+/) 
        .filter(word => word.length > 2 && !stopWords.includes(word)); 
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { items, findDuplicate, addIngredientsBatch, unreadReceivedCount, favorites, offers } = useShoppingList();
    const { user } = useAuth();

    const [modalStates, setModalStates] = useState(INITIAL_MODAL_STATES);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark' || stored === 'christmas' || stored === 'newyear') return stored as Theme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
    const [isPWAInstallVisible, setIsPWAInstallVisible] = useState(false);
    const [budget, setBudgetState] = useState<number | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isCartTooltipVisible, setIsCartTooltipVisible] = useState(false);
    const [fullRecipes, setFullRecipes] = useState<Record<string, FullRecipe>>({});
    const [selectedRecipe, setSelectedRecipe] = useState<FullRecipe | null>(null);
    const [isRecipeLoading, setIsRecipeLoading] = useState(false);
    const [isSearchingAcervo, setIsSearchingAcervo] = useState(false); 
    const [recipeError, setRecipeError] = useState<string | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
    const [groupingMode, setGroupingMode] = useState<'recipe' | 'aisle' | 'responsible'>('recipe');
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [itemCategories, setItemCategories] = useState<Record<string, string>>({});
    const [showStartHerePrompt, setShowStartHerePrompt] = useState(false);
    const [incomingList, setIncomingList] = useState<ReceivedListRecord | null>(null);
    
    const [smartNudgeItemName, setSmartNudgeItemName] = useState<string | null>(null);
    const [currentMarketName, setCurrentMarketName] = useState<string | null>(null);
    const [isSharedSession, setIsSharedSession] = useState(false);
    const [historyActiveTab, setHistoryActiveTabState] = useState<'my' | 'received'>('my');
    const [isHomeViewActive, setHomeViewActive] = useState(true);
    const [isFocusMode, setFocusMode] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [authTrigger, setAuthTrigger] = useState<string | null>(null);
    
    const [allRecipesPool, setAllRecipesPool] = useState<FullRecipe[]>([]);
    const [recipeSuggestions, setRecipeSuggestions] = useState<FullRecipe[]>([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<string | null>(null);
    const [pendingExploreRecipe, setPendingExploreRecipe] = useState<string | null>(null);
    const [totalRecipeCount, setTotalRecipeCount] = useState(0);
    const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
    // Fix: Added state for homeCategories.
    const [homeCategories, setHomeCategories] = useState<HomeCategory[]>([]);
    
    const [selectedProduct, setSelectedProduct] = useState<Offer | null>(null);
    const [globalRecipeCache, setGlobalRecipeCache] = useState<FullRecipe[]>([]);

    const [recipeSearchResults, setRecipeSearchResults] = useState<FullRecipe[]>([]);
    const [currentSearchTerm, setCurrentSearchTerm] = useState('');

    const apiKey = process.env.API_KEY as string;
    
    const isOwner = user?.email === 'admin@checklistia.com' || user?.email === 'itensnamao@gmail.com';
    const isSuperAdmin = isOwner || user?.role === 'admin_l1';
    const isAdmin = isSuperAdmin || user?.role === 'admin_l2';

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const handler = (e: Event) => { 
            e.preventDefault(); 
            setInstallPromptEvent(e); 
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
            if (!isStandalone) {
                setTimeout(() => {
                    setModalStates(prev => ({...prev, isDistributionModalOpen: true}));
                }, 2000);
            }
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        if (!user) {
            setModalStates(prev => ({...prev, ...INITIAL_MODAL_STATES}));
            setHomeViewActive(true);
            setFocusMode(false);
            setFullRecipes({});
            setSelectedRecipe(null);
            setIncomingList(null);
            setIsSharedSession(false);
        }
    }, [user]);

    const getCategoryRecipes = useCallback((categoryKey: string): FullRecipe[] => {
        const pool = globalRecipeCache;
        if (pool.length === 0) return [] as FullRecipe[];

        switch(categoryKey) {
            case 'top10': 
                return pool.slice(0, 15);
            case 'fast': 
                return pool.filter(r => r.prepTimeInMinutes && r.prepTimeInMinutes <= 30);
            case 'healthy':
                return pool.filter(r => r.tags?.some(t => ['fit', 'saudável', 'salada', 'nutritivo', 'vegano', 'fruta'].includes(t.toLowerCase())));
            case 'cheap':
                return pool.filter(r => r.cost === 'Baixo');
            case 'dessert':
                return pool.filter(r => r.tags?.some(t => ['sobremesa', 'doce', 'bolo', 'torta'].includes(t.toLowerCase())));
            case 'new':
                return pool.slice(0, 10);
            case 'random':
                return shuffleArray<FullRecipe>(pool).slice(0, 5);
            case 'sorvetes':
                return pool.filter(r => r.tags?.some(t => t.toLowerCase().includes('sorvete') || t.toLowerCase().includes('gelato')));
            default:
                return pool.filter(r => r.tags?.some(t => t.toLowerCase() === categoryKey.toLowerCase()));
        }
    }, [globalRecipeCache]);

    useEffect(() => {
        if (!db) return;
        const loadData = async () => {
            const cachedString = localStorage.getItem(RECIPE_CACHE_KEY);
            let fallbackCache: any = null;

            if (cachedString) {
                try {
                    const cache = JSON.parse(cachedString) as any;
                    fallbackCache = cache; 
                    
                    if (cache && Array.isArray(cache.pool)) {
                        setAllRecipesPool(mapToFullRecipeArray(cache.pool));
                    }
                    if (cache && Array.isArray(cache.cache)) {
                        setGlobalRecipeCache(mapToFullRecipeArray(cache.cache));
                    }
                    if (cache && typeof cache.count === 'number') {
                        setTotalRecipeCount(cache.count);
                    }
                    
                    const isExpired = (Date.now() - (cache?.timestamp || 0)) > RECIPE_CACHE_TTL;
                    if (!isExpired) return; 
                } catch (e) { localStorage.removeItem(RECIPE_CACHE_KEY); }
            }

            try {
                const networkPromise = (async () => {
                    const qFetch = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'), limit(100));
                    const snapshotFetch = await getDocs(qFetch);
                    const fetchedRaw: any[] = [];
                    snapshotFetch.forEach(docSnap => {
                        const data = docSnap.data();
                        if (data && data.name && data.imageUrl) {
                            fetchedRaw.push(data);
                        }
                    });

                    const fetched: FullRecipe[] = mapToFullRecipeArray(fetchedRaw);

                    let pool: FullRecipe[];
                    if (fetched.length > 0) {
                        pool = shuffleArray<FullRecipe>(fetched);
                    } else if (fallbackCache && fallbackCache.pool) {
                        pool = mapToFullRecipeArray(fallbackCache.pool);
                    } else {
                        pool = [];
                    }
                    setAllRecipesPool(pool);
                    
                    let cacheToSet: FullRecipe[];
                    if (fetched.length > 0) {
                        cacheToSet = fetched;
                    } else if (fallbackCache && fallbackCache.cache) {
                        cacheToSet = mapToFullRecipeArray(fallbackCache.cache);
                    } else {
                        cacheToSet = [];
                    }
                    setGlobalRecipeCache(cacheToSet);
                    
                    const countSnapshot = await getCountFromServer(collection(db, 'global_recipes'));
                    const totalCount = countSnapshot.data().count;
                    setTotalRecipeCount(totalCount);

                    localStorage.setItem(RECIPE_CACHE_KEY, JSON.stringify({
                        timestamp: Date.now(),
                        pool, cache: fetched, count: totalCount
                    }));
                })();

                await Promise.race([
                    networkPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
                ]);

            } catch (error: any) {
                if (fallbackCache) {
                    const poolData: FullRecipe[] = mapToFullRecipeArray(fallbackCache.pool);
                    const cacheData: FullRecipe[] = mapToFullRecipeArray(fallbackCache.cache);
                    setAllRecipesPool(poolData);
                    setGlobalRecipeCache(cacheData);
                    setTotalRecipeCount(fallbackCache.count || 0);
                }
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(doc(db, 'settings', 'recipe_schedule'), (snapshot) => {
            if (snapshot.exists()) {
                setScheduleRules(snapshot.data().rules || ([] as ScheduleRule[]));
            }
        }, (error) => {
            if (!ignorePermissionError(error)) console.error(error);
        });
        return () => unsub();
    }, []);

    // Fix: Added missing onSnapshot for homeCategories to sync data from Firestore.
    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(doc(db, 'settings', 'home_categories'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setHomeCategories((data.categories || []).sort((a: any, b: any) => a.order - b.order));
            }
        }, (error) => {
            if (!ignorePermissionError(error)) console.error(error);
        });
        return () => unsub();
    }, []);

    const saveScheduleRules = async (rules: ScheduleRule[]) => {
        if (!db || !isAdmin) return;
        await setDoc(doc(db, 'settings', 'recipe_schedule'), { rules, updatedAt: serverTimestamp() });
        showToast("Grade de horários atualizada!");
    };

    // Fix: Added missing implementation for saveHomeCategories.
    const saveHomeCategories = async (categories: HomeCategory[]) => {
        if (!db || !isAdmin) return;
        return await setDoc(doc(db, 'settings', 'home_categories'), { categories, updatedAt: serverTimestamp() });
    };

    const getContextualRecipes = useCallback((pool: FullRecipe[]): FullRecipe[] => {
        if (pool.length === 0) return [] as FullRecipe[];
        const now = new Date();
        const hour = now.getHours();
        let activeRules = scheduleRules.filter(r => hour >= r.startHour && hour < r.endHour);
        const scored = pool.map(recipe => {
            let score = Math.random() * 10;
            const text = (recipe.name + ' ' + (recipe.tags?.join(' ') || '')).toLowerCase();
            activeRules.forEach(rule => {
                if (rule.tags.some(tag => text.includes(tag.toLowerCase()))) score += 30;
            });
            return { recipe, score };
        });
        return scored.sort((a, b) => b.score - a.score).map(s => s.recipe);
    }, [scheduleRules]);

    const featuredRecipes = useMemo((): FullRecipe[] => {
        return getContextualRecipes(allRecipesPool).slice(0, 10);
    }, [allRecipesPool, getContextualRecipes]);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'christmas', 'newyear');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    useEffect(() => {
        let timer: number;
        if (toastMessage) timer = window.setTimeout(() => setToastMessage(null), 3000);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    const openModal = (modal: string) => {
        if (modal === 'addItem' && showStartHerePrompt) setShowStartHerePrompt(false);
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'admin') modalKey = 'isAdminModalOpen';
        if (modal === 'adminRecipes') modalKey = 'isAdminRecipesModalOpen';
        if (modal === 'adminReviews') modalKey = 'isAdminReviewsModalOpen';
        if (modal === 'adminSchedule') modalKey = 'isAdminScheduleModalOpen';
        // Fix: Added modal key for AdminUsers.
        if (modal === 'adminUsers') modalKey = 'isAdminUsersModalOpen';
        if (modal === 'manageTeam') modalKey = 'isManageTeamModalOpen';
        if (modal === 'teamReports') modalKey = 'isTeamReportsModalOpen';
        if (modal === 'arcade') modalKey = 'isArcadeModalOpen';
        if (modal === 'adminInvite') modalKey = 'isAdminInviteModalOpen';
        if (modal === 'favorites') modalKey = 'isFavoritesModalOpen';
        if (modal === 'offers') modalKey = 'isOffersModalOpen';
        if (modal === 'info') modalKey = 'isInfoModalOpen';
        if (modal === 'tools') modalKey = 'isToolsModalOpen';
        if (modal === 'productDetails') modalKey = 'isProductDetailsModalOpen';
        if (modal === 'converter') modalKey = 'isUnitConverterModalOpen';
        if (modal === 'contentFactory') modalKey = 'isContentFactoryModalOpen';
        if (modal === 'recipeSelection') modalKey = 'isRecipeSelectionModalOpen';
        if (modal === 'distribution') modalKey = 'isDistributionModalOpen';
        setModalStates(prev => ({...prev, [modalKey]: true}));
    };

    const closeModal = (modal: string) => {
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'admin') modalKey = 'isAdminModalOpen';
        if (modal === 'adminRecipes') modalKey = 'isAdminRecipesModalOpen';
        if (modal === 'adminReviews') modalKey = 'isAdminReviewsModalOpen';
        if (modal === 'adminSchedule') modalKey = 'isAdminScheduleModalOpen';
        // Fix: Added modal key for AdminUsers.
        if (modal === 'adminUsers') modalKey = 'isAdminUsersModalOpen';
        if (modal === 'manageTeam') modalKey = 'isManageTeamModalOpen';
        if (modal === 'teamReports') modalKey = 'isTeamReportsModalOpen';
        if (modal === 'arcade') modalKey = 'isArcadeModalOpen';
        if (modal === 'adminInvite') modalKey = 'isAdminInviteModalOpen';
        if (modal === 'favorites') modalKey = 'isFavoritesModalOpen';
        if (modal === 'offers') modalKey = 'isOffersModalOpen';
        if (modal === 'info') modalKey = 'isInfoModalOpen';
        if (modal === 'tools') modalKey = 'isToolsModalOpen';
        if (modal === 'productDetails') modalKey = 'isProductDetailsModalOpen';
        if (modal === 'converter') modalKey = 'isUnitConverterModalOpen';
        if (modal === 'contentFactory') modalKey = 'isContentFactoryModalOpen';
        if (modal === 'recipeSelection') modalKey = 'isRecipeSelectionModalOpen';
        if (modal === 'distribution') modalKey = 'isDistributionModalOpen';
         if (modal.toLowerCase() === 'tour') {
            localStorage.setItem('hasSeenOnboardingTour', 'true');
            setShowStartHerePrompt(true);
         }
        setModalStates(prev => ({ ...prev, [modalKey]: false }));
    }
    const toggleAppOptionsMenu = () => setModalStates(prev => ({ ...prev, isAppOptionsMenuOpen: !prev.isAppOptionsMenuOpen }));
    const toggleOptionsMenu = () => setModalStates(prev => ({ ...prev, isOptionsMenuOpen: !prev.isOptionsMenuOpen }));

    const setTheme = (newTheme: Theme) => setThemeState(newTheme);

    const handleInstall = async () => {
        if (!installPromptEvent) return false;
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        setInstallPromptEvent(null);
        setIsPWAInstallVisible(false);
        return outcome === 'accepted';
    };
    const handleDismissInstall = () => { setIsPWAInstallVisible(false); };
    const showPWAInstallPromptIfAvailable = () => { if (installPromptEvent) setIsPWAInstallVisible(true); };

    const setBudget = (b: number) => { setBudgetState(b); closeModal('budget'); };
    const clearBudget = () => { setBudgetState(null); closeModal('budget'); };
    const showToast = (msg: string) => setToastMessage(msg);
    const showCartTooltip = () => setIsCartTooltipVisible(true);
    const startEdit = (id: string) => setEditingItemId(id);
    const cancelEdit = () => setEditingItemId(null);
    
    const getCachedRecipe = (name: string): FullRecipe | undefined => {
        const target = name.trim().toLowerCase();
        const allCaches: (Record<string, FullRecipe> | FullRecipe[])[] = [fullRecipes, favorites, featuredRecipes, recipeSuggestions, recipeSearchResults, globalRecipeCache];
        for (const cache of allCaches) {
            if (Array.isArray(cache)) {
                const found = (cache as FullRecipe[]).find(r => r.name.toLowerCase() === target);
                if (found) return found;
            } else {
                const foundKey = Object.keys(cache).find(k => k.toLowerCase() === target);
                if (foundKey) return (cache as Record<string, FullRecipe>)[foundKey];
            }
        }
        return undefined;
    };

    const getRandomCachedRecipe = useCallback((): FullRecipe | null => {
        if (globalRecipeCache.length === 0) return null;
        return globalRecipeCache[Math.floor(Math.random() * globalRecipeCache.length)];
    }, [globalRecipeCache]);

    const showRecipe = (input: string | FullRecipe) => { 
        let r = typeof input === 'string' ? getCachedRecipe(input) : input;
        if (r && Array.isArray(r.ingredients) && r.ingredients.length > 0) {
            if (!fullRecipes[r.name]) setFullRecipes(prev => ({...prev, [r!.name]: r!}));
            setSelectedRecipe(r);
        } else { showToast("Receita em manutenção."); }
    };

    const closeRecipe = () => setSelectedRecipe(null);
    const resetRecipeState = () => { setIsRecipeLoading(false); setRecipeError(null); };
    
    const handleRecipeImageGenerated = (recipeName: string, imageUrl: string, source: 'cache' | 'genai') => {
        setFullRecipes(prev => ({...prev, [recipeName]: {...prev[recipeName], imageUrl, imageSource: source}}));
        setSelectedRecipe(prev => (prev?.name === recipeName ? {...prev, imageUrl, imageSource: source} : prev));
        
        if (db) {
            const docId = getRecipeDocId(recipeName);
            updateDoc(doc(db, 'global_recipes', docId), {
                imageUrl,
                imageSource: source,
                updatedAt: serverTimestamp()
            }).catch(() => console.warn("Erro ao atualizar imagem no acervo."));
        }
    };

    const searchGlobalRecipes = useCallback(async (queryStr: string): Promise<FullRecipe[]> => {
        if (!db || !queryStr || queryStr.length < 2) return [] as FullRecipe[];
        try {
            const keywords: string[] = generateKeywords(queryStr);
            if (keywords.length === 0) return [] as FullRecipe[];
            const q = query(collection(db, 'global_recipes'), where('keywords', 'array-contains-any', keywords.slice(0, 10)), limit(20));
            const snap = await getDocs(q);
            const rawResults: any[] = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data && data.name) {
                    rawResults.push(data);
                }
            });
            return mapToFullRecipeArray(rawResults);
        } catch (error) { 
            return [] as FullRecipe[]; 
        }
    }, []);

    const handleRecipeSearch = async (term: string) => {
        setIsSearchingAcervo(true); 
        try {
            const results: FullRecipe[] = await searchGlobalRecipes(term);
            setRecipeSearchResults(results);
            setCurrentSearchTerm(term);
            closeModal('recipeAssistant'); 
            openModal('recipeSelection'); 
        } finally { setIsSearchingAcervo(false); }
    };

    const sanitizeJsonString = (str: string) => {
        return str.replace(/```json/gi, '').replace(/```/gi, '').trim();
    };

    const fetchRecipeDetails = useCallback(async (recipeName: string, imageBase64?: string, autoAdd: boolean = true) => {
        if (isOffline) { showToast("Geração de IA requer conexão com a internet."); return; }
        if (!apiKey) return;
        setIsRecipeLoading(true);
        setRecipeError(null);
        try {
            const ai = new GoogleGenAI({ apiKey });
            
            let systemPrompt = `Você é o Chef IA do ChecklistIA. Gere uma receita completa, deliciosa e detalhada para: "${recipeName}".
            REGRAS OBRIGATÓRIAS:
            1. O campo 'ingredients' NÃO PODE ser vazio. Liste no mínimo 5 ingredientes reais.
            2. O campo 'instructions' NÃO PODE ser vazio. Descreva o passo a passo completo.
            3. Identifique se o preparo exige equipamentos específicos (ex: batedeira, airfryer, forma, liquidificador, colher de pau, etc) para venda direcionada.
            4. Retorne APENAS o JSON puro seguindo este formato:
            {
                "name": "${recipeName}",
                "ingredients": [{"simplifiedName": "Arroz", "detailedName": "2 xícaras de arroz agulhinha"}],
                "instructions": ["Passo 1...", "Passo 2..."],
                "imageQuery": "Foto close-up apetitosa de ${recipeName}, luz de estúdio",
                "servings": "2 porções",
                "prepTimeInMinutes": 30,
                "difficulty": "Médio",
                "cost": "Médio",
                "isAlcoholic": false,
                "tags": ["tag1", "tag2"],
                "suggestedLeads": ["batedeira", "forma de bolo"]
            }`;

            const parts: any[] = [];
            if (imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } });
            parts.push({ text: systemPrompt });

            const response: GenerateContentResponse = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview', 
                contents: { parts },
                config: { responseMimeType: "application/json" }
            }));

            const rawText = sanitizeJsonString(response.text || "{}");
            const details = JSON.parse(rawText) as any;
            
            const finalName = details.name || recipeName;

            const fullData: FullRecipe = { 
                name: finalName,
                ingredients: Array.isArray(details.ingredients) ? details.ingredients.map((i: any) => ({
                    simplifiedName: String(i.simplifiedName || ''),
                    detailedName: String(i.detailedName || '')
                })) : [] as { simplifiedName: string; detailedName: string; }[],
                instructions: Array.isArray(details.instructions) ? details.instructions.map(String) : [] as string[],
                imageQuery: details.imageQuery || finalName,
                servings: details.servings || '2 porções',
                prepTimeInMinutes: details.prepTimeInMinutes || 30,
                difficulty: (details.difficulty === 'Fácil' || details.difficulty === 'Médio' || details.difficulty === 'Difícil' ? details.difficulty : 'Médio') as 'Fácil' | 'Médio' | 'Difícil',
                cost: (details.cost === 'Baixo' || details.cost === 'Médio' || details.cost === 'Alto' ? details.cost : 'Médio') as 'Baixo' | 'Médio' | 'Alto',
                imageUrl: details.imageUrl,
                imageSource: details.imageSource || 'cache',
                description: details.description,
                keywords: generateKeywords(finalName),
                tags: Array.isArray(details.tags) ? details.tags.map(String) : [] as string[],
                isAlcoholic: !!details.isAlcoholic,
                suggestedLeads: Array.isArray(details.suggestedLeads) ? details.suggestedLeads.map(String) : [] as string[]
            };
            
            setFullRecipes(prev => ({...prev, [fullData.name]: fullData}));
            setSelectedRecipe(fullData);
            closeModal('recipeAssistant');

            if (db) {
                const docId = getRecipeDocId(fullData.name);
                await setDoc(doc(db, 'global_recipes', docId), {
                    ...fullData,
                    tags: [...(fullData.tags || []), 'gerada_pelo_usuario'],
                    createdAt: serverTimestamp()
                }, { merge: true }).catch(() => console.warn("Acervo offline ao salvar texto."));
            }

            if (autoAdd) await addRecipeToShoppingList(fullData);
        } catch (e: any) { 
            setRecipeError("O Chef está ocupado ou a conexão falhou. Tente em instantes."); 
        } finally { 
            setIsRecipeLoading(false); 
        }
    }, [apiKey, isOffline]); 

    const addRecipeToShoppingList = async (recipe: FullRecipe) => {
        const itemsToAdd: any[] = [];
        recipe.ingredients.forEach((ing) => {
            if (!findDuplicate(ing.simplifiedName, items)) {
                itemsToAdd.push({ name: ing.simplifiedName, calculatedPrice: 0, details: ing.detailedName, recipeName: recipe.name, isNew: true, isPurchased: false });
            }
        });
        if (itemsToAdd.length > 0) {
            await addIngredientsBatch(itemsToAdd);
            showToast(`${itemsToAdd.length} itens adicionados!`);
        }
    };

    const toggleGrouping = useCallback(async () => {
        if (isOffline) { showToast("Organização por corredores requer internet."); return; }
        if (groupingMode === 'recipe') {
            const itemsToCategorize = items.filter(item => !itemCategories[item.id]);
            if (itemsToCategorize.length === 0) { setGroupingMode('aisle'); closeModal('options'); return; }
            setIsOrganizing(true);
            try {
                if (!apiKey) throw new Error("API Key missing");
                const ai = new GoogleGenAI({ apiKey });
                const categories = [ "🍎 Hortifruti", "🥩 Açougue", "🥛 Laticínios", "🍞 Padaria", "🛒 Mercearia", "💧 Bebidas", "🧼 Limpeza", "🧴 Higiene", "❓ Outros" ];
                const response: GenerateContentResponse = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: `Categorize estes itens: [${itemsToCategorize.map(i => `"${i.name}"`).join(', ')}]. Categorias: ${categories.join(', ')}. Return JSON array.`,
                    config: { responseMimeType: "application/json" }
                }));
                const categorizedItems = JSON.parse(sanitizeJsonString(response.text || "[]")) as any[];
                const newCategoryMap = { ...itemCategories };
                (categorizedItems).forEach(ci => {
                    const item = itemsToCategorize.find(i => i.name.toLowerCase() === ci.itemName.toLowerCase());
                    if (item) newCategoryMap[item.id] = ci.category;
                });
                // Fix: Removed redundant code causing out-of-scope variable access error.
                setItemCategories(newCategoryMap);
                setGroupingMode('aisle');
            } catch (error: any) { showToast("Muitas tentativas."); }
            finally { setIsOrganizing(false); }
        } else { setGroupingMode('recipe'); }
        closeModal('options');
    }, [groupingMode, items, itemCategories, apiKey, isOffline]);

    const fetchThemeSuggestions = async (key: string, priorityRecipeName?: string) => {
        setCurrentTheme(key.charAt(0).toUpperCase() + key.slice(1));
        setRecipeSuggestions([] as FullRecipe[]);
        setModalStates(prev => ({...prev, isThemeRecipesModalOpen: true}));
        setIsSuggestionsLoading(true);
        try {
            const suggestions: FullRecipe[] = getCategoryRecipes(key);
            setRecipeSuggestions(suggestions);
        } finally { setIsSuggestionsLoading(false); }
    };

    const getCategoryRecipesSync = useCallback((categoryKey: string): FullRecipe[] => {
        return getCategoryRecipes(categoryKey);
    }, [getCategoryRecipes]);

    const clearIncomingList = useCallback(() => setIncomingList(null), []);

    const handleExploreRecipeClick = useCallback((recipe: string | FullRecipe) => {
        const recipeName = typeof recipe === 'string' ? recipe : recipe.name;
        if (!user) {
            showToast("Faça login para ver esta receita!");
            setPendingExploreRecipe(recipeName);
            openModal('auth');
            return;
        }
        if (items.length > 0 || currentMarketName) {
            setPendingExploreRecipe(recipeName);
            openModal('recipeDecision');
        } else {
            setPendingExploreRecipe(recipeName);
            openModal('startShopping');
        }
    }, [user, items.length, currentMarketName, showToast, openModal]);

    const openProductDetails = (product: Offer) => {
        setSelectedProduct(product);
        openModal('productDetails');
    };

    const value = {
        ...modalStates, openModal, closeModal, toggleAppOptionsMenu, toggleOptionsMenu, theme, setTheme: setThemeState,
        installPromptEvent, handleInstall, handleDismissInstall, isPWAInstallVisible,
        budget, setBudget, clearBudget, toastMessage, showToast, isCartTooltipVisible, showCartTooltip,
        fullRecipes, setFullRecipes, selectedRecipe, setSelectedRecipe, isRecipeLoading, isSearchingAcervo, recipeError, fetchRecipeDetails, handleRecipeImageGenerated, showRecipe, closeRecipe, resetRecipeState,
        editingItemId, startEdit, cancelEdit, duplicateInfo, setDuplicateInfo, groupingMode, setGroupingMode, isOrganizing, toggleGrouping,
        itemCategories, showStartHerePrompt, authTrigger, setAuthTrigger, incomingList, clearIncomingList,
        unreadNotificationCount: unreadReceivedCount, isAdmin, isSuperAdmin, smartNudgeItemName, currentMarketName, setCurrentMarketName,
        isSharedSession, setIsSharedSession, stopSharing: () => {}, historyActiveTab, setHistoryActiveTab: setHistoryActiveTabState,
        isHomeViewActive, setHomeViewActive, isFocusMode, setFocusMode,
        featuredRecipes, recipeSuggestions, isSuggestionsLoading, currentTheme, fetchThemeSuggestions, handleExploreRecipeClick, pendingExploreRecipe, setPendingExploreRecipe, totalRecipeCount,
        addRecipeToShoppingList, showPWAInstallPromptIfAvailable, searchGlobalRecipes, getCategoryCount: (l: string) => 0, getCategoryCover: (l: string) => undefined,
        getCategoryRecipes, getCategoryRecipesSync, getCachedRecipe, getRandomCachedRecipe, generateKeywords, 
        pendingAction, setPendingAction, selectedProduct, openProductDetails, recipeSearchResults, currentSearchTerm, handleRecipeSearch, scheduleRules, saveScheduleRules, isOffline,
        // Fix: Added homeCategories and saveHomeCategories to value object.
        homeCategories, saveHomeCategories
    };
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp must be used within an AppProvider');
    return context;
};
