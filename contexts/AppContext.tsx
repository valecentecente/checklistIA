import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, getCountFromServer, where, onSnapshot, updateDoc, addDoc } from 'firebase/firestore';
// Added logEvent to imports to fix "Cannot find name 'logEvent'" error.
import { db, auth, logEvent } from '../firebase';
import type { DuplicateInfo, FullRecipe, ShoppingItem, ReceivedListRecord, Offer, ScheduleRule, HomeCategory } from '../types';
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
        suggestedLeads: Array.isArray(r.suggestedLeads) ? r.suggestedLeads.map(String) : [] as string[],
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
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
    isRecipeDecisionModalOpen: false,
    isFavoritesModalOpen: false,
    isOffersModalOpen: false,
    isAdminModalOpen: false,
    isAdminRecipesModalOpen: false,
    isAdminReviewsModalOpen: false,
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
    isDistributionModalOpen: false,
    isAdminHubModalOpen: false,
    isSmartNudgeModalOpen: false,
    isAdminScheduleModalOpen: false,
    isPreferencesModalOpen: false,
    isAdminDashboardModalOpen: false
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
    isRecipeDecisionModalOpen: boolean;
    isFavoritesModalOpen: boolean;
    isOffersModalOpen: boolean;
    isAdminModalOpen: boolean;
    isAdminRecipesModalOpen: boolean;
    isAdminReviewsModalOpen: boolean;
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
    isAdminHubModalOpen: boolean;
    isSmartNudgeModalOpen: boolean;
    isAdminScheduleModalOpen: boolean;
    isPreferencesModalOpen: boolean;
    isAdminDashboardModalOpen: boolean;
    smartNudgeItemName: string | null;
    scheduleRules: ScheduleRule[];
    saveScheduleRules: (rules: ScheduleRule[]) => Promise<void>;
    pendingInventoryItem: { name: string; tags: string } | null;
    setPendingInventoryItem: (item: { name: string; tags: string } | null) => void;
    factoryActiveTab: 'producao' | 'acervo' | 'leads';
    setFactoryActiveTab: (tab: 'producao' | 'acervo' | 'leads') => void;
    
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
    
    allRecipesPool: FullRecipe[];
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
    getCategoryRecipes: (categoryKey: string) => FullRecipe[];
    getCategoryRecipesSync: (categoryKey: string) => FullRecipe[];
    getCachedRecipe: (name: string) => FullRecipe | undefined;
    getRandomCachedRecipe: () => FullRecipe | null;
    generateKeywords: (text: string) => string[];

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
    historyActiveTab: 'my' | 'received';
    setHistoryActiveTab: (tab: 'my' | 'received') => void;
    
    isFocusMode: boolean;
    setFocusMode: (mode: boolean) => void;
    
    pendingAction: string | null;
    setPendingAction(action: string | null): void;

    addRecipeToShoppingList: (recipe: FullRecipe) => Promise<void>;
    showPWAInstallPromptIfAvailable: () => void;

    selectedProduct: Offer | null; 
    openProductDetails: (product: Offer) => void; 
    isOffline: boolean;
    trackEvent: (name: string, params?: Record<string, any>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const callGenAIWithRetry = async <T = GenerateContentResponse>(fn: () => Promise<T>, retries = 8): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const errorStr = (JSON.stringify(error) || error?.toString() || '').toLowerCase();
        const isQuotaError = error?.status === 429 || errorStr.includes('429') || errorStr.includes('quota');
                             
        if (retries > 0 && isQuotaError) {
            const baseDelay = (9 - retries) * 15000; 
            const finalDelay = baseDelay + Math.random() * 5000;
            await new Promise(resolve => setTimeout(resolve, finalDelay));
            return callGenAIWithRetry(fn, retries - 1);
        }
        throw error;
    }
};

const ignorePermissionError = (err: any) => {
    return err.code === 'permission-denied' || (err.message && err.message.includes('Missing or insufficient permissions'));
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
    const { items, findDuplicate, addIngredientsBatch, unreadReceivedCount, favorites } = useShoppingList();
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
    const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
    const [pendingInventoryItem, setPendingInventoryItem] = useState<{ name: string; tags: string } | null>(null);
    const [factoryActiveTab, setFactoryActiveTab] = useState<'producao' | 'acervo' | 'leads'>('producao');

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
    const [homeCategories, setHomeCategories] = useState<HomeCategory[]>([]);
    
    const [selectedProduct, setSelectedProduct] = useState<Offer | null>(null);
    const [globalRecipeCache, setGlobalRecipeCache] = useState<FullRecipe[]>([]);

    const [recipeSearchResults, setRecipeSearchResults] = useState<FullRecipe[]>([]);
    const [currentSearchTerm, setCurrentSearchTerm] = useState('');

    const apiKey = process.env.API_KEY as string;
    const isAdmin = user?.role === 'admin_l1' || user?.role === 'admin_l2';
    const isSuperAdmin = user?.role === 'admin_l1';

    // Defined trackEvent to handle analytics tracking and fixed logEvent missing import
    const trackEvent = useCallback((name: string, params?: Record<string, any>) => {
        logEvent(name, {
            user_id: user?.uid || 'guest',
            ...params
        });
    }, [user]);

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
        return pool.filter(r => r.tags?.some(t => t.toLowerCase() === categoryKey.toLowerCase()));
    }, [globalRecipeCache]);

    useEffect(() => {
        if (!db) return;
        const loadData = async () => {
            const cachedString = localStorage.getItem(RECIPE_CACHE_KEY);
            if (cachedString) {
                try {
                    const cache = JSON.parse(cachedString);
                    setAllRecipesPool(mapToFullRecipeArray(cache.pool));
                    setGlobalRecipeCache(mapToFullRecipeArray(cache.cache));
                    setTotalRecipeCount(cache.count || 0);
                    if ((Date.now() - (cache?.timestamp || 0)) < RECIPE_CACHE_TTL) return; 
                } catch (e) { localStorage.removeItem(RECIPE_CACHE_KEY); }
            }
            try {
                const qFetch = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'), limit(30));
                const snap = await getDocs(qFetch);
                const fetched = mapToFullRecipeArray(snap.docs.map(d => d.data()));
                setAllRecipesPool(shuffleArray(fetched));
                setGlobalRecipeCache(fetched);
                const countSnap = await getCountFromServer(collection(db, 'global_recipes'));
                const count = countSnap.data().count;
                setTotalRecipeCount(count);
                localStorage.setItem(RECIPE_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), pool: fetched, cache: fetched, count }));
            } catch (error) {}
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(doc(db, 'settings', 'home_categories'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setHomeCategories((data.categories || []).sort((a: any, b: any) => a.order - b.order));
            }
        }, (error) => {
            if (!ignorePermissionError(error)) console.warn("[AppContext] Sem acesso a categorias.");
        });
        return () => unsub();
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

    const saveHomeCategories = async (categories: HomeCategory[]) => {
        if (!db || !isAdmin) return;
        return await setDoc(doc(db, 'settings', 'home_categories'), { categories, updatedAt: serverTimestamp() });
    };

    const saveScheduleRules = async (rules: ScheduleRule[]) => {
        if (!db || !isAdmin) return;
        await setDoc(doc(db, 'settings', 'recipe_schedule'), { rules, updatedAt: serverTimestamp() });
        showToast("Grade de horários atualizada!");
    };

    const featuredRecipes = useMemo((): FullRecipe[] => {
        return allRecipesPool.slice(0, 10);
    }, [allRecipesPool]);

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
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'admin') modalKey = 'isAdminModalOpen';
        if (modal === 'adminRecipes') modalKey = 'isAdminRecipesModalOpen';
        if (modal === 'adminReviews') modalKey = 'isAdminReviewsModalOpen';
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
        if (modal === 'adminHub') modalKey = 'isAdminHubModalOpen';
        if (modal === 'smartNudge') modalKey = 'isSmartNudgeModalOpen';
        if (modal === 'adminSchedule') modalKey = 'isAdminScheduleModalOpen';
        if (modal === 'preferences') modalKey = 'isPreferencesModalOpen';
        if (modal === 'adminDashboard') modalKey = 'isAdminDashboardModalOpen';

        setModalStates(prev => ({...prev, [modalKey]: true}));
        trackEvent('modal_open', { modal });
    };

    const closeModal = (modal: string) => {
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'admin') modalKey = 'isAdminModalOpen';
        if (modal === 'adminRecipes') modalKey = 'isAdminRecipesModalOpen';
        if (modal === 'adminReviews') modalKey = 'isAdminReviewsModalOpen';
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
        if (modal === 'adminHub') modalKey = 'isAdminHubModalOpen';
        if (modal === 'smartNudge') modalKey = 'isSmartNudgeModalOpen';
        if (modal === 'adminSchedule') modalKey = 'isAdminScheduleModalOpen';
        if (modal === 'preferences') modalKey = 'isPreferencesModalOpen';
        if (modal === 'adminDashboard') modalKey = 'isAdminDashboardModalOpen';

        setModalStates(prev => ({ ...prev, [modalKey]: false }));
    }
    const toggleAppOptionsMenu = () => setModalStates(prev => ({ ...prev, isAppOptionsMenuOpen: !prev.isAppOptionsMenuOpen }));
    const toggleOptionsMenu = () => setModalStates(prev => ({ ...prev, isOptionsMenuOpen: !prev.isOptionsMenuOpen }));

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        trackEvent('change_theme', { theme: newTheme });
    };

    const handleInstall = async () => {
        if (!installPromptEvent) return false;
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        setInstallPromptEvent(null);
        setIsPWAInstallVisible(false);
        trackEvent('pwa_install_attempt', { outcome });
        return outcome === 'accepted';
    };

    const setBudget = (b: number) => { 
        setBudgetState(b); 
        closeModal('budget'); 
        trackEvent('set_budget', { amount: b });
    };
    const clearBudget = () => { setBudgetState(null); closeModal('budget'); };
    const showToast = (msg: string) => setToastMessage(msg);
    const showCartTooltip = () => setIsCartTooltipVisible(true);
    const startEdit = (id: string) => setEditingItemId(id);
    const cancelEdit = () => setEditingItemId(null);
    
    const getCachedRecipe = (name: string): FullRecipe | undefined => {
        const target = name.trim().toLowerCase();
        const allCaches = [fullRecipes, favorites, featuredRecipes, recipeSuggestions, recipeSearchResults, globalRecipeCache];
        for (const cache of allCaches) {
            if (Array.isArray(cache)) {
                const found = cache.find(r => r.name.toLowerCase() === target);
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
            trackEvent('view_recipe', { recipe_name: r.name });
        } else { showToast("Receita em manutenção."); }
    };

    const closeRecipe = () => setSelectedRecipe(null);
    const resetRecipeState = () => { setIsRecipeLoading(false); setRecipeError(null); };
    
    const handleRecipeImageGenerated = (recipeName: string, imageUrl: string, source: 'cache' | 'genai') => {
        setFullRecipes(prev => ({...prev, [recipeName]: {...prev[recipeName], imageUrl, imageSource: source}}));
        setSelectedRecipe(prev => (prev?.name === recipeName ? {...prev, imageUrl, imageSource: source} : prev));
        if (db) {
            const docId = getRecipeDocId(recipeName);
            updateDoc(doc(db, 'global_recipes', docId), { imageUrl, imageSource: source, updatedAt: serverTimestamp() });
        }
    };

    const searchGlobalRecipes = useCallback(async (queryStr: string): Promise<FullRecipe[]> => {
        if (!db || !queryStr || queryStr.length < 2) return [] as FullRecipe[];
        const keywords = generateKeywords(queryStr);
        if (keywords.length === 0) return [] as FullRecipe[];
        const q = query(collection(db, 'global_recipes'), where('keywords', 'array-contains-any', keywords.slice(0, 10)), limit(20));
        const snap = await getDocs(q);
        return mapToFullRecipeArray(snap.docs.map(d => d.data()));
    }, []);

    const handleRecipeSearch = async (term: string) => {
        setIsSearchingAcervo(true); 
        trackEvent('search_recipe', { term });
        try {
            const results = await searchGlobalRecipes(term);
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
        if (isOffline) { showToast("IA offline."); return; }
        setIsRecipeLoading(true);
        trackEvent('generate_recipe_ia', { recipe_name: recipeName });
        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Gere receita brasileira completa JSON para: "${recipeName}". REGRAS: ingredients min 5, tags (Momento, Perfil, Técnica), suggestedLeads (utensílios).`;
            const textRes = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview', 
                contents: prompt,
                config: { responseMimeType: "application/json" }
            }));
            const details = JSON.parse(textRes.text?.replace(/```json/gi, '').replace(/```/gi, '').trim() || "{}");
            const fullData: FullRecipe = { 
                ...details, 
                keywords: generateKeywords(details.name || recipeName),
                createdAt: serverTimestamp() 
            };
            setFullRecipes(prev => ({...prev, [fullData.name]: fullData}));
            setSelectedRecipe(fullData);
            if (autoAdd) await addRecipeToShoppingList(fullData);
        } catch (e) { setRecipeError("O Chef falhou."); } finally { setIsRecipeLoading(false); }
    }, [apiKey, isOffline]); 

    const addRecipeToShoppingList = async (recipe: FullRecipe) => {
        const itemsToAdd: any[] = [];
        recipe.ingredients.forEach((ing) => {
            if (!findDuplicate(ing.simplifiedName, items)) {
                itemsToAdd.push({ name: ing.simplifiedName, calculatedPrice: 0, details: ing.detailedName, recipeName: recipe.name, iNew: true, isPurchased: false });
            }
        });
        if (itemsToAdd.length > 0) {
            await addIngredientsBatch(itemsToAdd);
            showToast(`${itemsToAdd.length} itens adicionados!`);
            trackEvent('add_recipe_to_list', { recipe_name: recipe.name, item_count: itemsToAdd.length });
        }
    };

    const toggleGrouping = useCallback(async () => {
        if (isOffline) { showToast("Organização por corredores requer internet."); return; }
        
        if (groupingMode === 'recipe') {
            trackEvent('organize_list_aisle');
            if (items.length === 0) {
                showToast("Adicione itens à lista para organizar!");
                return;
            }

            const newCategoryMap = { ...itemCategories };
            const itemsToCategorizeViaIA: typeof items = [];

            // ETAPA 1: Tentar dicionário local primeiro (Instantâneo)
            items.forEach(item => {
                if (newCategoryMap[item.id]) return; // Já categorizado

                const cleanName = item.name.toLowerCase().trim();
                // Tenta busca exata ou contida no dicionário
                const dictMatch = Object.keys(LOCAL_AISLE_DICTIONARY).find(key => 
                    cleanName === key || cleanName.includes(key)
                );

                if (dictMatch) {
                    newCategoryMap[item.id] = LOCAL_AISLE_DICTIONARY[dictMatch];
                } else {
                    itemsToCategorizeViaIA.push(item);
                }
            });

            // Se o dicionário resolveu tudo, encerra aqui
            if (itemsToCategorizeViaIA.length === 0) {
                setItemCategories(newCategoryMap);
                setGroupingMode('aisle');
                showToast("Lista organizada!");
                return;
            }

            // ETAPA 2: Usar IA apenas para o que sobrou
            setIsOrganizing(true);
            try {
                if (!apiKey) throw new Error("API Key missing");
                const ai = new GoogleGenAI({ apiKey });
                const categories = [ "🍎 Hortifruti", "🥩 Açougue", "🥛 Laticínios", "🍞 Padaria", "🛒 Mercearia", "💧 Bebidas", "🧼 Limpeza", "🧴 Higiene", "❓ Outros" ];
                
                const response: GenerateContentResponse = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: `Categorize estes itens: [${itemsToCategorizeViaIA.map(i => `"${i.name}"`).join(', ')}]. Categorias permitidas: ${categories.join(', ')}. Retorne um JSON array de objetos: [{"itemName": "nome_exato_do_item", "category": "categoria_escolhida"}].`,
                    config: { responseMimeType: "application/json" }
                }));

                const jsonStr = sanitizeJsonString(response.text || "[]");
                const categorizedItems = JSON.parse(jsonStr) as any[];
                
                categorizedItems.forEach(ci => {
                    const itemNameLower = ci.itemName?.toLowerCase().trim();
                    const item = itemsToCategorizeViaIA.find(i => i.name.toLowerCase().trim() === itemNameLower);
                    if (item) {
                        newCategoryMap[item.id] = ci.category;
                    }
                });

                setItemCategories(newCategoryMap);
                setGroupingMode('aisle');
                showToast("Lista organizada!");
            } catch (error: any) { 
                console.error("Erro organização:", error);
                // Mesmo com erro na IA, aplica o que o dicionário local conseguiu
                setItemCategories(newCategoryMap);
                setGroupingMode('aisle');
                showToast("Organização parcial concluída."); 
            } finally { 
                setIsOrganizing(false); 
            }
        } else { 
            setGroupingMode('recipe'); 
        }
    }, [groupingMode, items, itemCategories, apiKey, isOffline]);

    const fetchThemeSuggestions = async (key: string) => {
        setCurrentTheme(key);
        setRecipeSuggestions([] as FullRecipe[]);
        openModal('themeRecipes');
        setIsSuggestionsLoading(true);
        trackEvent('view_category', { category: key });
        try { setRecipeSuggestions(getCategoryRecipes(key)); } finally { setIsSuggestionsLoading(false); }
    };

    const handleExploreRecipeClick = useCallback((recipe: string | FullRecipe) => {
        const name = typeof recipe === 'string' ? recipe : recipe.name;
        if (!user) { openModal('auth'); return; }
        if (items.length > 0 || currentMarketName) {
            setPendingExploreRecipe(name);
            openModal('recipeDecision');
        } else {
            setPendingExploreRecipe(name);
            setHomeViewActive(false); 
        }
    }, [user, items.length, currentMarketName]);

    const value = {
        ...modalStates, openModal, closeModal, toggleAppOptionsMenu, toggleOptionsMenu, theme, setTheme,
        installPromptEvent, handleInstall, handleDismissInstall: () => setIsPWAInstallVisible(false), isPWAInstallVisible,
        budget, setBudget, clearBudget, toastMessage, showToast, isCartTooltipVisible, showCartTooltip,
        fullRecipes, setFullRecipes, selectedRecipe, setSelectedRecipe, isRecipeLoading, isSearchingAcervo, recipeError, fetchRecipeDetails, handleRecipeImageGenerated, showRecipe, closeRecipe, resetRecipeState,
        editingItemId, startEdit, cancelEdit, duplicateInfo, setDuplicateInfo, groupingMode, setGroupingMode, isOrganizing, toggleGrouping,
        itemCategories, showStartHerePrompt, authTrigger, setAuthTrigger, incomingList, clearIncomingList: () => setIncomingList(null),
        unreadNotificationCount: unreadReceivedCount, isAdmin, isSuperAdmin, currentMarketName, setCurrentMarketName,
        isSharedSession, setIsSharedSession, historyActiveTab, setHistoryActiveTab: setHistoryActiveTabState,
        isHomeViewActive, setHomeViewActive, isFocusMode, setFocusMode,
        allRecipesPool, featuredRecipes, recipeSuggestions, isSuggestionsLoading, currentTheme, fetchThemeSuggestions, handleExploreRecipeClick, pendingExploreRecipe, setPendingExploreRecipe, totalRecipeCount,
        addRecipeToShoppingList, showPWAInstallPromptIfAvailable: () => setIsPWAInstallVisible(true), searchGlobalRecipes,
        getCategoryCount: (categoryLabel: string) => 0,
        getCategoryRecipes, getCategoryRecipesSync: getCategoryRecipes, getCachedRecipe, getRandomCachedRecipe, generateKeywords, 

        homeCategories, saveHomeCategories, 
        pendingInventoryItem, setPendingInventoryItem,
        factoryActiveTab, setFactoryActiveTab,
        smartNudgeItemName, scheduleRules, saveScheduleRules,
        isSmartNudgeModalOpen: modalStates.isSmartNudgeModalOpen,
        isAdminScheduleModalOpen: modalStates.isAdminScheduleModalOpen,
        isPreferencesModalOpen: modalStates.isPreferencesModalOpen,
        isAdminDashboardModalOpen: modalStates.isAdminDashboardModalOpen,
        selectedProduct: selectedProduct, openProductDetails: (p: Offer) => { setSelectedProduct(p); openModal('productDetails'); }, recipeSearchResults, currentSearchTerm, handleRecipeSearch, isOffline,
        trackEvent
    };
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

const LOCAL_AISLE_DICTIONARY: Record<string, string> = {
    "alface": "🍎 Hortifruti", "tomate": "🍎 Hortifruti", "cebola": "🍎 Hortifruti", "alho": "🍎 Hortifruti", "batata": "🍎 Hortifruti",
    "maçã": "🍎 Hortifruti", "banana": "🍎 Hortifruti", "laranja": "🍎 Hortifruti", "uva": "🍎 Hortifruti", "limão": "🍎 Hortifruti",
    "cenoura": "🍎 Hortifruti", "brócolis": "🍎 Hortifruti", "abacate": "🍎 Hortifruti", "melancia": "🍎 Hortifruti", "manga": "🍎 Hortifruti",
    "carne": "🥩 Açougue", "frango": "🥩 Açougue", "peixe": "🥩 Açougue", "picanha": "🥩 Açougue", "alcatra": "🥩 Açougue",
    "maminha": "🥩 Açougue", "fraldinha": "🥩 Açougue", "coxa": "🥩 Açougue", "sobrecoxa": "🥩 Açougue", "filé": "🥩 Açougue",
    "linguiça": "🥩 Açougue", "bacon": "🥩 Açougue", "costela": "🥩 Açougue", "moída": "🥩 Açougue",
    "leite": "🥛 Laticínios", "queijo": "🥛 Laticínios", "manteiga": "🥛 Laticínios", "iogurte": "🥛 Laticínios", "requeijão": "🥛 Laticínios",
    "creme de leite": "🥛 Laticínios", "leite condensado": "🥛 Laticínios", "margarina": "🥛 Laticínios", "muçarela": "🥛 Laticínios",
    "pão": "🍞 Padaria", "baguete": "🍞 Padaria", "bisnaga": "🍞 Padaria", "bolo": "🍞 Padaria", "torta": "🍞 Padaria",
    "sonho": "🍞 Padaria", "salgado": "🍞 Padaria", "pão de queijo": "🍞 Padaria", "croissant": "🍞 Padaria",
    "arroz": "🛒 Mercearia", "feijão": "🛒 Mercearia", "macarrão": "🛒 Mercearia", "óleo": "🛒 Mercearia", "azeite": "🛒 Mercearia",
    "açúcar": "🛒 Mercearia", "sal": "🛒 Mercearia", "café": "🛒 Mercearia", "farinha": "🛒 Mercearia", "molho": "🛒 Mercearia",
    "biscoito": "🛒 Mercearia", "bolacha": "🛒 Mercearia", "chocolate": "🛒 Mercearia", "pipoca": "🛒 Mercearia", "milho": "🛒 Mercearia",
    "água": "💧 Bebidas", "suco": "💧 Bebidas", "refrigerante": "💧 Bebidas", "cerveja": "💧 Bebidas", "vinho": "💧 Bebidas",
    "chá": "💧 Bebidas", "energético": "💧 Bebidas", "vodka": "💧 Bebidas", "whisky": "💧 Bebidas", "coca": "💧 Bebidas",
    "detergente": "🧼 Limpeza", "sabão": "🧼 Limpeza", "amaciante": "🧼 Limpeza", "desinfetante": "🧼 Limpeza", "agua sanitaria": "🧼 Limpeza",
    "esponja": "🧼 Limpeza", "veja": "🧼 Limpeza", "lustra moveis": "🧼 Limpeza", "saco de lixo": "🧼 Limpeza",
    "shampoo": "🧴 Higiene", "condicionador": "🧴 Higiene", "sabonete": "🧴 Higiene", "creme dental": "🧴 Higiene", "pasta de dente": "🧴 Higiene",
    "desodorante": "🧴 Higiene", "papel higiênico": "🧴 Higiene", "absorvente": "🧴 Higiene", "fio dental": "🧴 Higiene",
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp must be used within an AppProvider');
    return context;
};