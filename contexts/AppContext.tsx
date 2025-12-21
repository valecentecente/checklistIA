
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, getCountFromServer, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { DuplicateInfo, FullRecipe, RecipeDetails, ShoppingItem, ReceivedListRecord, RecipeSuggestion, Offer, ScheduleRule, PlannedEvent } from '../types';
import { useShoppingList } from './ShoppingListContext';
import { useAuth } from './AuthContext';

export type Theme = 'light' | 'dark' | 'christmas' | 'newyear';

const RECIPE_CACHE_KEY = 'checklistia_global_recipes_v1';
const RECIPE_CACHE_TTL = 1000 * 60 * 60 * 12;

const SURVIVAL_RECIPES: FullRecipe[] = [
    {
        name: "Omelete de Ervas",
        ingredients: [{simplifiedName: "Ovos", detailedName: "3 ovos"}, {simplifiedName: "Queijo", detailedName: "50g de queijo muçarela"}],
        instructions: ["Bata os ovos", "Frite"],
        imageQuery: "omelete",
        servings: "1", prepTimeInMinutes: 10, difficulty: "Fácil", cost: "Baixo", imageSource: "cache",
        imageUrl: "https://images.unsplash.com/photo-1510627489930-0.1b0ba0fa3e?auto=format&fit=crop&w=800&q=80",
        tags: ["ovo", "café da manhã", "rápido"]
    }
];

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
        .replace(/[^a-z0-9-9]/g, '') 
        .slice(0, 80);
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
    isEventPlannerModalOpen: boolean;
    
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
    getCategoryRecipes: (categoryKey: string) => FullRecipe[];
    getCachedRecipe: (name: string) => FullRecipe | undefined;
    // Added to resolve property missing error in components
    getRandomCachedRecipe: () => FullRecipe | null;
    generateKeywords: (text: string) => string[];

    scheduleRules: ScheduleRule[];
    saveScheduleRules: (rules: ScheduleRule[]) => Promise<void>;

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
    
    isAdmin: boolean; 
    isSuperAdmin: boolean; 

    authTrigger: string | null;
    incomingList: ReceivedListRecord | null;
    clearIncomingList: () => void;
    unreadNotificationCount: number;
    currentMarketName: string | null;
    setCurrentMarketName: (name: string | null) => void;
    isSharedSession: boolean;
    setIsSharedSession: (isShared: boolean) => void;
    historyActiveTab: 'my' | 'received';
    setHistoryActiveTab: (tab: 'my' | 'received') => void;

    selectedProduct: Offer | null;
    openProductDetails: (product: Offer) => void;
    smartNudgeItemName: string | null;
    isFocusMode: boolean;
    setFocusMode: (mode: boolean) => void;
    pendingAction: string | null;
    setPendingAction(action: string | null): void;

    activeEvent: PlannedEvent | null;
    setActiveEvent: (event: PlannedEvent | null) => void;
    isEventMode: boolean;
    setEventMode: (mode: boolean) => void;

    addRecipeToShoppingList: (recipe: FullRecipe) => Promise<void>;
    showPWAInstallPromptIfAvailable: () => void;
    globalRecipeCache: FullRecipe[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const callGenAIWithRetry = async (fn: () => Promise<any>, retries = 8): Promise<any> => {
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
            await new Promise(resolve => setTimeout(resolve, finalDelay));
            return callGenAIWithRetry(fn, retries - 1);
        }
        throw error;
    }
};

const ignorePermissionError = (err: any) => {
    if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) return true;
    return false;
};

export const generateKeywords = (text: string): string[] => {
    if (!text) return [];
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

    const [modalStates, setModalStates] = useState({
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
        isEventPlannerModalOpen: false
    });
    
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark' || stored === 'christmas' || stored === 'newyear') return stored;
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
    const [historyActiveTab, setHistoryActiveTab] = useState<'my' | 'received'>('my');
    const [isHomeViewActive, setHomeViewActiveState] = useState(true);
    const [isFocusMode, setFocusMode] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    
    const [allRecipesPool, setAllRecipesPool] = useState<FullRecipe[]>(SURVIVAL_RECIPES);
    const [recipeSuggestions, setRecipeSuggestions] = useState<FullRecipe[]>([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<string | null>(null);
    const [pendingExploreRecipe, setPendingExploreRecipe] = useState<string | null>(null);
    const [totalRecipeCount, setTotalRecipeCount] = useState(SURVIVAL_RECIPES.length);
    const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
    const [globalRecipeCache, setGlobalRecipeCache] = useState<FullRecipe[]>(SURVIVAL_RECIPES);
    const [recipeSearchResults, setRecipeSearchResults] = useState<FullRecipe[]>([]);
    const [currentSearchTerm, setCurrentSearchTerm] = useState('');
    const [authTrigger, setAuthTrigger] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Offer | null>(null);

    const [activeEvent, setActiveEvent] = useState<PlannedEvent | null>(null);
    const [isEventMode, setEventMode] = useState(false);

    const apiKey = process.env.API_KEY as string;
    const isSuperAdmin = user?.role === 'admin_l1';
    const isAdmin = isSuperAdmin || user?.role === 'admin_l2';

    const showToast = useCallback((message: string) => setToastMessage(message), []);

    const handleRecipeImageGenerated = useCallback((recipeName: string, imageUrl: string, source: 'cache' | 'genai') => {
        setFullRecipes(prev => {
            if (prev[recipeName]) {
                return {...prev, [recipeName]: {...prev[recipeName], imageUrl: imageUrl, imageSource: source}};
            }
            return prev;
        });
        setSelectedRecipe(prev => (prev?.name === recipeName ? {...prev, imageUrl: imageUrl, imageSource: source} : prev));
    }, []);

    // --- LÓGICA DE NAVEGAÇÃO NATIVA (HISTORY API BRIDGE) ---
    const anyModalOpen = useMemo(() => {
        return Object.values(modalStates).some(state => state === true) || !!selectedRecipe || !!duplicateInfo;
    }, [modalStates, selectedRecipe, duplicateInfo]);

    const setHomeViewActive = useCallback((active: boolean) => {
        if (!active && isHomeViewActive) {
            window.history.pushState({ type: 'view', name: 'shopping' }, '');
        } else if (active && !isHomeViewActive) {
            // Se o usuário clicar no ícone de Home, e não foi via botão de voltar nativo
            if (window.history.state?.type === 'view') {
                window.history.back();
            }
        }
        setHomeViewActiveState(active);
    }, [isHomeViewActive]);

    const openModal = useCallback((modal: string) => {
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'adminRecipes') modalKey = 'isAdminRecipesModalOpen';
        if (modal === 'adminReviews') modalKey = 'isAdminReviewsModalOpen';
        if (modal === 'adminSchedule') modalKey = 'isAdminScheduleModalOpen';
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
        if (modal === 'eventPlanner') modalKey = 'isEventPlannerModalOpen';

        window.history.pushState({ type: 'modal', name: modal }, '');
        setModalStates(prev => ({...prev, [modalKey]: true}));
    }, []);

    const closeModal = useCallback((modal: string, isPopState = false) => {
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'adminRecipes') modalKey = 'isAdminRecipesModalOpen';
        if (modal === 'adminReviews') modalKey = 'isAdminReviewsModalOpen';
        if (modal === 'adminSchedule') modalKey = 'isAdminScheduleModalOpen';
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
        if (modal === 'eventPlanner') modalKey = 'isEventPlannerModalOpen';
        
        if (modal.toLowerCase() === 'tour') { localStorage.setItem('hasSeenOnboardingTour', 'true'); setShowStartHerePrompt(true); }
        
        setModalStates(prev => ({ ...prev, [modalKey]: false }));
        
        // Se fechou via clique no "X" (não via PopState), remove do histórico
        if (!isPopState && window.history.state?.type === 'modal') {
            window.history.back();
        }
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            // Se houver qualquer modal aberto, o botão voltar deve fechar o modal
            if (anyModalOpen) {
                // Fecha todos os modais ativos
                setModalStates(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(key => (next[key as keyof typeof next] = false));
                    return next;
                });
                setSelectedRecipe(null);
                setDuplicateInfo(null);
                return;
            }

            // Se estiver na tela de lista, volta para a Home
            if (!isHomeViewActive) {
                setHomeViewActiveState(true);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [anyModalOpen, isHomeViewActive]);

    const openProductDetails = useCallback((product: Offer) => {
        setSelectedProduct(product);
        openModal('productDetails');
    }, [openModal]);

    const getCategoryRecipes = useCallback((categoryKey: string): FullRecipe[] => {
        const pool = globalRecipeCache;
        if (pool.length === 0) return [];
        switch(categoryKey) {
            case 'top10': return pool.slice(0, 15);
            case 'fast': return pool.filter(r => r.prepTimeInMinutes && r.prepTimeInMinutes <= 30);
            case 'healthy': return pool.filter(r => r.tags?.some(t => ['fit', 'saudável', 'salada', 'nutritivo'].includes(t.toLowerCase())));
            case 'cheap': return pool.filter(r => r.cost === 'Baixo');
            case 'dessert': return pool.filter(r => r.tags?.some(t => ['sobremesa', 'doce', 'bolo'].includes(t.toLowerCase())));
            case 'new': return pool.slice(0, 10);
            default: return pool.filter(r => r.tags?.some(t => t.toLowerCase() === categoryKey.toLowerCase()));
        }
    }, [globalRecipeCache]);

    useEffect(() => {
        if (!db) return;
        const loadData = async () => {
            const cachedString = localStorage.getItem(RECIPE_CACHE_KEY);
            let fallbackCache: any = null;
            if (cachedString) {
                try {
                    const cache = JSON.parse(cachedString);
                    fallbackCache = cache;
                    if (cache.pool) setAllRecipesPool(cache.pool);
                    if (cache.cache) setGlobalRecipeCache(cache.cache);
                    if (cache.count) setTotalRecipeCount(cache.count);
                } catch (e) { localStorage.removeItem(RECIPE_CACHE_KEY); }
            }
            try {
                const qFetch = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'), limit(100));
                const snapshotFetch = await getDocs(qFetch);
                const fetched: FullRecipe[] = [];
                snapshotFetch.forEach(docSnap => fetched.push({ id: docSnap.id, ...docSnap.data() } as any));
                if (fetched.length > 0) {
                    setAllRecipesPool(shuffleArray(fetched));
                    setGlobalRecipeCache(fetched);
                    const countSnapshot = await getCountFromServer(collection(db, 'global_recipes'));
                    setTotalRecipeCount(countSnapshot.data().count);
                    localStorage.setItem(RECIPE_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), pool: fetched, cache: fetched, count: countSnapshot.data().count }));
                }
            } catch (error) {}
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(doc(db, 'settings', 'recipe_schedule'), (snapshot) => {
            if (snapshot.exists()) setScheduleRules(snapshot.data().rules || []);
        }, (error) => { if (!ignorePermissionError(error)) console.error(error); });
        return () => unsub();
    }, []);

    const saveScheduleRules = async (rules: ScheduleRule[]) => {
        if (!db || !isAdmin) return;
        await setDoc(doc(db, 'settings', 'recipe_schedule'), { rules, updatedAt: serverTimestamp() });
        showToast("Grade de horários atualizada!");
    };

    const featuredRecipes = useMemo(() => {
        const pool = allRecipesPool;
        const now = new Date();
        const hour = now.getHours();
        let activeRules = scheduleRules.filter(r => hour >= r.startHour && hour < r.endHour);
        const scored = pool.map(recipe => {
            let score = Math.random() * 10;
            const text = (recipe.name + ' ' + (recipe.tags?.join(' ') || '')).toLowerCase();
            activeRules.forEach(rule => { if (rule.tags.some(tag => text.includes(tag.toLowerCase()))) score += 30; });
            return { recipe, score };
        });
        return scored.sort((a, b) => b.score - a.score).map(s => s.recipe).slice(0, 10);
    }, [allRecipesPool, scheduleRules]);

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

    const toggleAppOptionsMenu = () => setModalStates(prev => ({ ...prev, isAppOptionsMenuOpen: !prev.isAppOptionsMenuOpen }));
    const toggleOptionsMenu = () => setModalStates(prev => ({ ...prev, isOptionsMenuOpen: !prev.isOptionsMenuOpen }));
    const handleInstall = async () => {
        if (!installPromptEvent) return false;
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        setInstallPromptEvent(null); setIsPWAInstallVisible(false);
        return outcome === 'accepted';
    };
    const showPWAInstallPromptIfAvailable = () => { if (installPromptEvent) setIsPWAInstallVisible(true); };

    const getCachedRecipe = (name: string): FullRecipe | undefined => {
        const target = name.trim().toLowerCase();
        const allCaches = [fullRecipes, favorites, featuredRecipes, recipeSuggestions, globalRecipeCache];
        for (const cache of allCaches) {
            if (Array.isArray(cache)) {
                const found = cache.find(r => r.name.toLowerCase() === target);
                if (found) return found;
            } else {
                const foundKey = Object.keys(cache).find(k => k.toLowerCase() === target);
                if (foundKey) return cache[foundKey];
            }
        }
        return undefined;
    };

    const getRandomCachedRecipe = useCallback(() => {
        const pool = globalRecipeCache.length > 0 ? globalRecipeCache : allRecipesPool;
        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }, [globalRecipeCache, allRecipesPool]);

    const showRecipe = (input: string | FullRecipe) => { 
        let r = typeof input === 'string' ? getCachedRecipe(input) : input;
        if (r && Array.isArray(r.ingredients) && r.ingredients.length > 0) {
            if (!fullRecipes[r.name]) setFullRecipes(prev => ({...prev, [r!.name]: r!}));
            setSelectedRecipe(r);
            window.history.pushState({ type: 'recipe', name: r.name }, '');
        } else { showToast("Receita não encontrada."); }
    };

    const closeRecipe = () => {
        setSelectedRecipe(null);
        if (window.history.state?.type === 'recipe') {
            window.history.back();
        }
    };

    const searchGlobalRecipes = useCallback(async (queryStr: string): Promise<FullRecipe[]> => {
        if (!db || !queryStr || queryStr.length < 2) return [];
        try {
            const keywords: string[] = generateKeywords(queryStr);
            if (keywords.length === 0) return [];
            let results: FullRecipe[] = [];
            const q = query(collection(db, 'global_recipes'), where('keywords', 'array-contains-any', keywords.slice(0, 10)), limit(20));
            const snap = await getDocs(q);
            snap.forEach(docSnap => results.push({ id: docSnap.id, ...docSnap.data() } as any));
            return results;
        } catch (error) { return []; }
    }, []);

    const handleRecipeSearch = async (term: string) => {
        setIsSearchingAcervo(true); 
        try {
            const results = await searchGlobalRecipes(term);
            setRecipeSearchResults(results);
            setCurrentSearchTerm(term);
            closeModal('recipeAssistant'); openModal('recipeSelection'); 
        } finally { setIsSearchingAcervo(false); }
    };

    const fetchRecipeDetails = useCallback(async (recipeName: string, imageBase64?: string, autoAdd: boolean = true) => {
        if (!apiKey) return;
        setIsRecipeLoading(true); setRecipeError(null);
        try {
            const ai = new GoogleGenAI({ apiKey });
            let systemPrompt = `Você é o Chef IA. Gere JSON para: "${recipeName}". Formato: { "name": "${recipeName}", "ingredients": [{"simplifiedName": "x", "detailedName": "y"}], "instructions": [], "prepTimeInMinutes": 30, "difficulty": "Médio", "cost": "Médio", "tags": [] }`;
            const parts: any[] = [];
            if (imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } });
            parts.push({ text: systemPrompt });
            const response: GenerateContentResponse = await callGenAIWithRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts }, config: { responseMimeType: "application/json" } }));
            const fullData = JSON.parse(response.text || "{}");
            setFullRecipes(prev => ({...prev, [fullData.name]: fullData}));
            setSelectedRecipe(fullData); closeModal('recipeAssistant');
            if (autoAdd) await addRecipeToShoppingList(fullData);
        } catch (e) { setRecipeError("Falha na IA."); } finally { setIsRecipeLoading(false); }
    }, [apiKey]); 

    const addRecipeToShoppingList = async (recipe: FullRecipe) => {
        const itemsToAdd: any[] = [];
        recipe.ingredients.forEach((ing) => {
            if (!findDuplicate(ing.simplifiedName, items)) {
                itemsToAdd.push({ name: ing.simplifiedName, calculatedPrice: 0, details: ing.detailedName, recipeName: recipe.name, isNew: true, isPurchased: false });
            }
        });
        if (itemsToAdd.length > 0) { await addIngredientsBatch(itemsToAdd); showToast(`${itemsToAdd.length} itens adicionados!`); }
    };

    const toggleGrouping = useCallback(async () => {
        if (groupingMode === 'recipe') {
            const itemsToCategorize = items.filter(item => !itemCategories[item.id]);
            if (itemsToCategorize.length === 0) { setGroupingMode('aisle'); closeModal('options'); return; }
            setIsOrganizing(true);
            try {
                const ai = new GoogleGenAI({ apiKey });
                const categories = [ "🍎 Hortifruti", "🥩 Açougue", "🥛 Laticínios", "🍞 Padaria", "🛒 Mercearia", "💧 Bebidas", "🧼 Limpeza", "🧴 Higiene", "❓ Outros" ];
                const response: GenerateContentResponse = await callGenAIWithRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Categorize: [${itemsToCategorize.map(i => `"${i.name}"`).join(', ')}]. Categorias: ${categories.join(', ')}. Retorne JSON array.`, config: { responseMimeType: "application/json" } }));
                const catArray = JSON.parse(response.text || "[]");
                const newMap = { ...itemCategories };
                catArray.forEach((ci: any) => { const item = itemsToCategorize.find(i => i.name.toLowerCase() === ci.itemName.toLowerCase()); if (item) newMap[item.id] = ci.category; });
                setItemCategories(newMap); setGroupingMode('aisle');
            } catch (error) { showToast("Erro ao organizar."); } finally { setIsOrganizing(false); }
        } else { setGroupingMode('recipe'); }
        closeModal('options');
    }, [groupingMode, items, itemCategories, apiKey, showToast]);

    const handleExploreRecipeClick = useCallback((recipe: string | FullRecipe) => {
        const recipeName = typeof recipe === 'string' ? recipe : recipe.name;
        if (!user) { showToast("Faça login!"); openModal('auth'); return; }
        if (items.length > 0 || currentMarketName) { setPendingExploreRecipe(recipeName); openModal('recipeDecision'); } else { setPendingExploreRecipe(recipeName); openModal('startShopping'); }
    }, [user, items.length, currentMarketName, openModal, showToast]);

    const value = {
        ...modalStates, openModal, closeModal, toggleAppOptionsMenu, toggleOptionsMenu, theme, setTheme: setThemeState,
        installPromptEvent, handleInstall, handleDismissInstall: () => setIsPWAInstallVisible(false), isPWAInstallVisible,
        budget, setBudget: (b: number) => {setBudgetState(b); closeModal('budget')}, clearBudget: () => {setBudgetState(null); closeModal('budget')}, 
        toastMessage, showToast, isCartTooltipVisible, showCartTooltip: () => setIsCartTooltipVisible(true),
        fullRecipes, setFullRecipes, selectedRecipe, setSelectedRecipe, isRecipeLoading, isSearchingAcervo, recipeError, 
        fetchRecipeDetails, handleRecipeImageGenerated, showRecipe, 
        closeRecipe, resetRecipeState: () => {setIsRecipeLoading(false); setRecipeError(null)},
        editingItemId, startEdit: (id: string) => setEditingItemId(id), cancelEdit: () => setEditingItemId(null), duplicateInfo, setDuplicateInfo, groupingMode, setGroupingMode, isOrganizing, toggleGrouping,
        itemCategories, showStartHerePrompt, unreadNotificationCount: unreadReceivedCount, isAdmin, isSuperAdmin, smartNudgeItemName, currentMarketName, setCurrentMarketName,
        isSharedSession, setIsSharedSession, historyActiveTab, setHistoryActiveTab, isHomeViewActive, setHomeViewActive, isFocusMode, setFocusMode,
        featuredRecipes, recipeSuggestions, isSuggestionsLoading, currentTheme, fetchThemeSuggestions: async (k) => { setCurrentTheme(k); setModalStates(s => ({...s, isThemeRecipesModalOpen: true})); setRecipeSuggestions(getCategoryRecipes(k)); }, handleExploreRecipeClick, pendingExploreRecipe, setPendingExploreRecipe, totalRecipeCount,
        addRecipeToShoppingList, showPWAInstallPromptIfAvailable, searchGlobalRecipes, getCategoryCount: (l: string) => 0,
        getCategoryRecipes, getCachedRecipe, getRandomCachedRecipe, generateKeywords, 
        pendingAction, setPendingAction, recipeSearchResults, currentSearchTerm, handleRecipeSearch, scheduleRules, saveScheduleRules,
        activeEvent, setActiveEvent, isEventMode, setEventMode, globalRecipeCache, getCategoryRecipesSync: (k: string) => getCategoryRecipes(k),
        authTrigger, setAuthTrigger, selectedProduct, openProductDetails
    };
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp must be used within an AppProvider');
    return context;
};
