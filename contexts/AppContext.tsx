
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, getCountFromServer, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { DuplicateInfo, FullRecipe, RecipeDetails, ShoppingItem, ReceivedListRecord, RecipeSuggestion, Offer, ScheduleRule } from '../types';
import { useShoppingList } from './ShoppingListContext';
import { useAuth } from './AuthContext';

export type Theme = 'light' | 'dark' | 'christmas' | 'newyear';

interface AppContextType {
    // Modal States
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
    isTourModalOpen: boolean;
    isProfileModalOpen: boolean;
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
    
    // Modal Controls
    openModal: (modal: string) => void;
    closeModal: (modal: string) => void;
    toggleAppOptionsMenu: () => void;
    toggleOptionsMenu: () => void;

    // Theme
    theme: Theme;
    setTheme: (theme: Theme) => void;

    // PWA Install
    installPromptEvent: any;
    handleInstall: () => Promise<boolean>;
    handleDismissInstall: () => void;
    isPWAInstallVisible: boolean; 
    
    // Budget
    budget: number | null;
    setBudget: (newBudget: number) => void;
    clearBudget: () => void;

    // Toasts & Tooltips
    toastMessage: string | null;
    showToast: (message: string) => void;
    isCartTooltipVisible: boolean;
    showCartTooltip: () => void;

    // Recipes
    fullRecipes: Record<string, FullRecipe>;
    setFullRecipes: React.Dispatch<React.SetStateAction<Record<string, FullRecipe>>>;
    selectedRecipe: FullRecipe | null;
    setSelectedRecipe: (recipe: FullRecipe | null) => void; 
    isRecipeLoading: boolean;
    recipeError: string | null;
    fetchRecipeDetails: (recipeName: string, imageBase64?: string, autoAdd?: boolean) => Promise<void>;
    handleRecipeImageGenerated: (recipeName: string, imageUrl: string, source: 'cache' | 'genai') => void;
    showRecipe: (recipe: string | FullRecipe) => void; 
    closeRecipe: () => void;
    resetRecipeState: () => void; 
    
    // Recipe Discovery / Home
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

    // Grade Dinâmica de Horários
    scheduleRules: ScheduleRule[];
    saveScheduleRules: (rules: ScheduleRule[]) => Promise<void>;

    // Recipe Search & Selection
    recipeSearchResults: FullRecipe[];
    currentSearchTerm: string;
    handleRecipeSearch: (term: string) => Promise<void>;

    // Editing & Duplicates
    editingItemId: string | null;
    startEdit: (id: string) => void;
    cancelEdit: () => void;
    duplicateInfo: DuplicateInfo | null;
    setDuplicateInfo: (info: DuplicateInfo | null) => void;

    // List Organization
    groupingMode: 'recipe' | 'aisle' | 'responsible';
    setGroupingMode: (mode: 'recipe' | 'aisle' | 'responsible') => void;
    isOrganizing: boolean;
    toggleGrouping: () => Promise<void>;
    itemCategories: Record<string, string>;

    // Onboarding & Views
    showStartHerePrompt: boolean;
    isHomeViewActive: boolean;
    setHomeViewActive: (active: boolean) => void;
    
    // Auth Source
    authTrigger: string | null;
    setAuthTrigger: (trigger: string | null) => void;
    isAdmin: boolean; 
    isSuperAdmin: boolean; 

    // Real-time Notifications & Sharing
    incomingList: ReceivedListRecord | null;
    clearIncomingList: () => void;
    unreadNotificationCount: number;
    currentMarketName: string | null;
    setCurrentMarketName: (name: string | null) => void;
    isSharedSession: boolean;
    setIsSharedSession: (isShared: boolean) => void;
    historyActiveTab: 'my' | 'received';
    setHistoryActiveTab: (tab: 'my' | 'received') => void;

    // Smart Features
    smartNudgeItemName: string | null;
    
    // UI Mode
    isFocusMode: boolean;
    setFocusMode: (mode: boolean) => void;
    
    // Pending Actions (Login Redirect)
    pendingAction: string | null;
    setPendingAction(action: string | null): void;

    addRecipeToShoppingList: (recipe: FullRecipe) => Promise<void>;
    showPWAInstallPromptIfAvailable: () => void;

    // Products / Offers
    selectedProduct: Offer | null; 
    openProductDetails: (product: Offer) => void; 
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
            
            console.warn(`[IA] Limite atingido. Aguardando ${Math.round(finalDelay/1000)}s para renovação da cota.`);
            await new Promise(resolve => setTimeout(resolve, finalDelay));
            return callGenAIWithRetry(fn, retries - 1);
        }
        throw error;
    }
};

const ignorePermissionError = (err: any) => {
    if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
        console.warn('Operação ignorada por falta de permissão.');
        return true;
    }
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

// Mapeamento de Preferências para Tags do Sistema
const DIETARY_TAG_MAP: Record<string, string[]> = {
    'vegan': ['vegano', 'vegan', 'planta', 'sem leite', 'sem ovo', 'vegetal'],
    'vegetarian': ['vegetariano', 'vegano', 'sem carne', 'legumes', 'ovo'],
    'fitness': ['fit', 'saudável', 'saudavel', 'proteína', 'proteina', 'leve', 'baixo teor', 'academia'],
    'quick': ['rápido', 'rapido', '15min', 'prático', 'pratico', 'express', 'fácil', 'facil'],
    'lowcarb': ['lowcarb', 'low carb', 'sem carboidrato', 'proteína', 'paleo'],
    'lactose_free': ['sem lactose', 'lactose free', 'zero lactose'],
    'gluten_free': ['sem glúten', 'sem gluten', 'gluten free', 'celíaco'],
    'sweets': ['doce', 'sobremesa', 'açúcar', 'bolo', 'chocolate'],
    'alcohol': ['drink', 'coquetel', 'álcool', 'alcool', 'bebida alcoólica', 'adulto']
};

// Palavras proibidas para dietas restritivas (Exclusão Radical)
const FORBIDDEN_WORDS: Record<string, string[]> = {
    'vegan': ['carne', 'frango', 'peixe', 'ovo', 'leite', 'queijo', 'presunto', 'bacon', 'linguiça', 'mel', 'suíno', 'picanha', 'costela', 'filé', 'file', 'isca', 'camarão', 'camarao', 'salmão', 'bacalhau'],
    'vegetarian': ['carne', 'frango', 'peixe', 'bacon', 'linguiça', 'suíno', 'picanha', 'costela', 'filé', 'file', 'isca', 'camarão', 'camarao', 'salmão', 'bacalhau', 'presunto']
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { items, findDuplicate, addIngredientsBatch, unreadReceivedCount, favorites } = useShoppingList();
    const { user, pendingAdminInvite } = useAuth();

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
        isRecipeSelectionModalOpen: false
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
    const [recipeError, setRecipeError] = useState<string | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
    const [groupingMode, setGroupingMode] = useState<'recipe' | 'aisle' | 'responsible'>('recipe');
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [itemCategories, setItemCategories] = useState<Record<string, string>>({});
    const [showStartHerePrompt, setShowStartHerePrompt] = useState(false);
    const [authTrigger, setAuthTrigger] = useState<string | null>(null);
    const [incomingList, setIncomingList] = useState<ReceivedListRecord | null>(null);
    
    const [smartNudgeItemName, setSmartNudgeItemName] = useState<string | null>(null);
    const [currentMarketName, setCurrentMarketName] = useState<string | null>(null);
    const [isSharedSession, setIsSharedSession] = useState(false);
    const [historyActiveTab, setHistoryActiveTab] = useState<'my' | 'received'>('my');
    const [isHomeViewActive, setHomeViewActive] = useState(true);
    const [isFocusMode, setFocusMode] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    
    const [allRecipesPool, setAllRecipesPool] = useState<FullRecipe[]>([]);
    const [recipeSuggestions, setRecipeSuggestions] = useState<FullRecipe[]>([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<string | null>(null);
    const [pendingExploreRecipe, setPendingExploreRecipe] = useState<string | null>(null);
    const [totalRecipeCount, setTotalRecipeCount] = useState(0);
    const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
    
    const [selectedProduct, setSelectedProduct] = useState<Offer | null>(null);
    const [globalRecipeCache, setGlobalRecipeCache] = useState<FullRecipe[]>([]);

    const [recipeSearchResults, setRecipeSearchResults] = useState<FullRecipe[]>([]);
    const [currentSearchTerm, setCurrentSearchTerm] = useState('');

    const apiKey = process.env.API_KEY as string;
    
    const isSuperAdmin = user?.role === 'admin_l1';
    const isAdmin = isSuperAdmin || user?.role === 'admin_l2';

    // Helper interno para identificar se é bebida
    const isDrinkRecipe = useCallback((r: FullRecipe) => {
        const text = (r.name + ' ' + (r.tags?.join(' ') || '')).toLowerCase();
        const drinkTerms = ['suco', 'drink', 'vitamina', 'coquetel', 'bebida', 'smoothie', 'café', 'chá', 'limonada', 'batida', 'caipirinha', 'mojito', 'cerveja', 'vinho'];
        return drinkTerms.some(t => text.includes(t));
    }, []);

    useEffect(() => {
        const handler = (e: Event) => { e.preventDefault(); setInstallPromptEvent(e); };
        window.addEventListener('beforeinstallprompt', handler);
        const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
        if (!hasSeenTour) setModalStates(s => ({...s, isTourModalOpen: true}));
        
        const handleListReceived = (e: CustomEvent<ReceivedListRecord>) => {
            setIncomingList(e.detail);
        };
        window.addEventListener('listReceived' as any, handleListReceived);
        
        const handleDietaryConflict = (e: CustomEvent<{ itemName: string }>) => {
            if (sessionStorage.getItem('smartNudgeDismissed') === 'true') return;
            setSmartNudgeItemName(e.detail.itemName);
            openModal('smartNudge');
        };
        window.addEventListener('dietaryConflict' as any, handleDietaryConflict);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('listReceived' as any, handleListReceived);
            window.removeEventListener('dietaryConflict' as any, handleDietaryConflict);
        };
    }, []);

    // --- CARREGAMENTO DA GRADE DE HORÁRIOS ---
    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(doc(db, 'settings', 'recipe_schedule'), (snapshot) => {
            if (snapshot.exists()) {
                setScheduleRules(snapshot.data().rules || []);
            }
        }, (error) => {
            if (!ignorePermissionError(error)) {
                console.error("Erro no listener da grade:", error);
            }
        });
        return () => unsub();
    }, []);

    const saveScheduleRules = async (rules: ScheduleRule[]) => {
        if (!db || !isAdmin) return;
        await setDoc(doc(db, 'settings', 'recipe_schedule'), { rules, updatedAt: serverTimestamp() });
        showToast("Grade de horários atualizada!");
    };

    // --- ALGORITMO DE AFINIDADE V3 (DATA + HORA + GOSTO DO USUÁRIO) ---
    const getContextualRecipes = useCallback((pool: FullRecipe[]): FullRecipe[] => {
        if (pool.length === 0) return [];

        const now = new Date();
        const hour = now.getHours();
        const monthDay = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

        // 1. Filtrar Regras Contextuais Ativas
        let activeContextRules = scheduleRules.filter(r => {
            if (r.startDate && r.endDate) {
                const isDateMatch = monthDay >= r.startDate && monthDay <= r.endDate;
                if (!isDateMatch) return false;
            }
            return hour >= r.startHour && hour < r.endHour;
        });

        // 2. Sistema de Pontuação (Peso)
        const scored = pool.map(recipe => {
            let score = 0;
            const text = (recipe.name + ' ' + (recipe.tags?.join(' ') || '')).toLowerCase();
            
            // --- PESO 1: Contexto (Sazonalidade e Horário) ---
            activeContextRules.forEach(rule => {
                const ruleBonus = rule.startDate ? 50 : 20; 
                if (rule.tags.some(tag => text.includes(tag.toLowerCase()))) {
                    score += ruleBonus;
                }
            });

            // --- PESO 2: Gosto Pessoal (Afinidade e Exclusão) ---
            if (user?.dietaryPreferences && user.dietaryPreferences.length > 0) {
                user.dietaryPreferences.forEach(pref => {
                    // Exclusão Radical (Vegano/Vegetariano)
                    const forbidden = FORBIDDEN_WORDS[pref];
                    if (forbidden && forbidden.some(word => text.includes(word))) {
                        score -= 500; // Penalidade massiva para esconder carnes de veganos
                    }

                    // Afinidade Positiva
                    const affinityTags = DIETARY_TAG_MAP[pref];
                    if (affinityTags && affinityTags.some(tag => text.includes(tag))) {
                        score += 100; // Bônus alto para o que o usuário gosta
                    }
                });
            }

            // Bônus para receitas no acervo (Qualidade curada)
            if (recipe.imageSource === 'cache') score += 10;

            return { recipe, score };
        });

        // Ordena por score e retorna (Excluindo as que tiverem score muito baixo se houver opções)
        const sorted = scored.sort((a, b) => b.score - a.score);
        
        return sorted.map(s => s.recipe);
    }, [scheduleRules, user?.dietaryPreferences]);

    // Carregar dados e ordenar destaque
    useEffect(() => {
        if (!db) return;
        const loadData = async () => {
            try {
                const qFeatured = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'), limit(50));
                const snapshotFeatured = await getDocs(qFeatured);
                const recipesPool: FullRecipe[] = [];
                snapshotFeatured.forEach(doc => {
                    const data = doc.data() as FullRecipe;
                    if (data.name && data.imageUrl && data.ingredients && data.ingredients.length > 0) {
                        recipesPool.push({ ...data, imageSource: 'cache' });
                    }
                });

                setAllRecipesPool(recipesPool);

                const qCache = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'), limit(300));
                const snapshotCache = await getDocs(qCache);
                const cachedRecipes: FullRecipe[] = [];
                snapshotCache.forEach(doc => {
                    const data = doc.data() as FullRecipe;
                    if (data.name && data.imageUrl && data.ingredients && data.ingredients.length > 0) {
                        cachedRecipes.push({ ...data, imageSource: 'cache' });
                    }
                });
                setGlobalRecipeCache(cachedRecipes);

                const countSnapshot = await getCountFromServer(collection(db, 'global_recipes'));
                setTotalRecipeCount(countSnapshot.data().count);
            } catch (error) {
                console.error("Error loading recipes:", error);
            }
        };
        loadData();
    }, []);

    const featuredRecipes = useMemo(() => {
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
        if (modal !== 'auth') setAuthTrigger(null);
        
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'admin') modalKey = 'isAdminModalOpen';
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
        
        setModalStates(prev => ({...prev, [modalKey]: true}));
    };

    const closeModal = (modal: string) => {
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'admin') modalKey = 'isAdminModalOpen';
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
        const normalize = (s: string) => s.trim().toLowerCase();
        const target = normalize(name);

        const allCaches = [
            fullRecipes,
            favorites,
            featuredRecipes,
            recipeSuggestions,
            globalRecipeCache
        ];

        for (const cache of allCaches) {
            if (Array.isArray(cache)) {
                const found = cache.find(r => normalize(r.name) === target);
                if (found) return found;
            } else {
                const foundKey = Object.keys(cache).find(k => normalize(k) === target);
                if (foundKey) return cache[foundKey];
            }
        }
        return undefined;
    };

    const getRandomCachedRecipe = useCallback((): FullRecipe | null => {
        if (globalRecipeCache.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * globalRecipeCache.length);
        return globalRecipeCache[randomIndex];
    }, [globalRecipeCache]);

    const showRecipe = (input: string | FullRecipe) => { 
        let recipeToDisplay: FullRecipe | undefined;

        if (typeof input !== 'string') {
            recipeToDisplay = input;
        } else {
            recipeToDisplay = getCachedRecipe(input);
        }
        
        if (recipeToDisplay) {
            const isHealthy = Array.isArray(recipeToDisplay.ingredients) && recipeToDisplay.ingredients.length > 0;

            if (isHealthy) {
                if (!fullRecipes[recipeToDisplay.name]) {
                    setFullRecipes(prev => ({...prev, [recipeToDisplay.name]: recipeToDisplay!}));
                }
                setSelectedRecipe(recipeToDisplay);
                return;
            }
        }

        const recipeName = typeof input === 'string' ? input : input.name;
        fetchRecipeDetails(recipeName, undefined, false);
    };

    const closeRecipe = () => setSelectedRecipe(null);
    const resetRecipeState = () => {
        setIsRecipeLoading(false);
        setRecipeError(null);
    };
    
    const handleRecipeImageGenerated = (recipeName: string, imageUrl: string, source: 'cache' | 'genai') => {
        setFullRecipes(prev => {
            if (prev[recipeName]) {
                return {...prev, [recipeName]: {...prev[recipeName], imageUrl: imageUrl, imageSource: source}};
            }
            return prev;
        });
        setSelectedRecipe(prev => (prev?.name === recipeName ? {...prev, imageUrl: imageUrl, imageSource: source} : prev));
    };

    const compressImageForStorage = (base64Str: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 512; 
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
                    resolve(canvas.toDataURL('image/jpeg', 0.5));
                } else {
                    resolve(base64Str);
                }
            };
            img.onerror = () => resolve(base64Str);
        });
    };

    const generateRecipeImageBackground = async (recipe: FullRecipe) => {
        if (!apiKey) return;
        try {
             const ai = new GoogleGenAI({ apiKey });
             const response: any = await callGenAIWithRetry(() => ai.models.generateContent({
                 model: 'gemini-2.5-flash-image',
                 contents: {
                     parts: [{ text: `Foto profissional e apetitosa de: ${recipe.imageQuery}. Fotografia de comida.` }]
                 },
                 config: { responseModalities: [Modality.IMAGE] },
             }), 3);

             const part = response.candidates?.[0]?.content?.parts?.[0];
             if (part?.inlineData) {
                 const base64ImageBytes = part.inlineData.data;
                 const mimeType = part.inlineData.mimeType || 'image/jpeg';
                 const generatedUrl = `data:${mimeType};base64,${base64ImageBytes}`;
                 
                 handleRecipeImageGenerated(recipe.name, generatedUrl, 'genai');

                 if (db) {
                     try {
                         const compressedUrl = await compressImageForStorage(generatedUrl);
                         const docId = recipe.name.trim().toLowerCase().replace(/[\/\s]+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);
                         
                         await setDoc(doc(db, 'global_recipes', docId), {
                             ...recipe,
                             imageUrl: compressedUrl, 
                             imageSource: 'genai', 
                             createdAt: serverTimestamp()
                         }, { merge: true });
                     } catch (err: any) {
                         if (!ignorePermissionError(err)) {
                             console.error("Erro ao salvar no acervo:", err);
                         }
                     }
                 }
             }
        } catch (error) {
            console.warn("Imagem não gerada:", error);
        }
    };

    const searchGlobalRecipes = useCallback(async (queryStr: string): Promise<FullRecipe[]> => {
        if (!db || !queryStr || queryStr.length < 2) return [];
        try {
            const searchKeywords = generateKeywords(queryStr);
            const lowerQuery = queryStr.toLowerCase();
            
            // Garantir que temos palavras-chave processadas antes de consultar o Firestore
            if (searchKeywords.length === 0) return [];

            // 1. Busca por Palavras-Chave (Keywords de nome)
            let keywordResults: FullRecipe[] = [];
            const qKey = query(
                collection(db, 'global_recipes'),
                where('keywords', 'array-contains-any', searchKeywords.slice(0, 10)),
                limit(20)
            );
            const snapKey = await getDocs(qKey);
            snapKey.forEach(doc => {
                const data = doc.data() as FullRecipe;
                if (data.name) keywordResults.push({ ...data, imageSource: 'cache' });
            });

            // 2. Busca por Tags (Categorias)
            let tagResults: FullRecipe[] = [];
            const qTag = query(
                collection(db, 'global_recipes'),
                where('tags', 'array-contains-any', searchKeywords.map(k => k.toLowerCase()).slice(0, 10)),
                limit(20)
            );
            const snapTag = await getDocs(qTag);
            snapTag.forEach(doc => {
                const data = doc.data() as FullRecipe;
                if (data.name) tagResults.push({ ...data, imageSource: 'cache' });
            });

            // 3. Mesclar e Remover Duplicatas
            const mergedMap = new Map<string, FullRecipe>();
            [...keywordResults, ...tagResults].forEach(r => {
                mergedMap.set(r.name.toLowerCase(), r);
            });
            
            const results = Array.from(mergedMap.values());

            // 4. Ordenação por relevância (Matches)
            results.sort((a, b) => {
                const score = (r: FullRecipe) => {
                    let s = 0;
                    const nameL = r.name.toLowerCase();
                    const tagsL = r.tags?.map(t => t.toLowerCase()) || [];
                    
                    // Prioridade máxima: Nome exato contém o termo
                    if (nameL.includes(lowerQuery)) s += 200;
                    
                    // Interseção de Termos (Otimizado para buscas como "doce morango")
                    let intersectionCount = 0;
                    searchKeywords.forEach(k => {
                        const lowK = k.toLowerCase();
                        const tagMatch = tagsL.some(t => t.includes(lowK));
                        const nameMatch = nameL.includes(lowK);
                        if (tagMatch || nameMatch) {
                            intersectionCount++;
                            s += tagMatch ? 50 : 20; // Bônus base por termo
                        }
                    });

                    // Bônus MASSIVO se o item possuir TODOS os termos buscados (Interseção Perfeita)
                    if (intersectionCount >= searchKeywords.length && searchKeywords.length > 1) {
                        s += 500;
                    }

                    return s;
                };
                return score(b) - score(a);
            });

            return results.slice(0, 15);

        } catch (error) {
            console.error("Erro ao buscar receitas globais:", error);
            return [];
        }
    }, []);

    const handleRecipeSearch = async (term: string) => {
        setIsRecipeLoading(true); 
        try {
            const results = await searchGlobalRecipes(term);
            
            if (results.length > 0) {
                setRecipeSearchResults(results);
                setCurrentSearchTerm(term);
                closeModal('recipeAssistant'); 
                openModal('recipeSelection'); 
            } else {
                fetchRecipeDetails(term);
            }
        } catch (error) {
            fetchRecipeDetails(term); 
        } finally {
            setIsRecipeLoading(false);
        }
    };

    const fetchRecipeDetails = useCallback(async (recipeName: string, imageBase64?: string, autoAdd: boolean = true) => {
        if (recipeName && !imageBase64) {
            setIsRecipeLoading(true);
            try {
                const localMatch = getCachedRecipe(recipeName);
                if (localMatch && localMatch.ingredients && localMatch.ingredients.length > 0) {
                    setSelectedRecipe(localMatch);
                    setFullRecipes(prev => ({...prev, [localMatch.name]: localMatch}));
                    closeModal('recipeAssistant');
                    setIsRecipeLoading(false);
                    if (autoAdd) addRecipeToShoppingList(localMatch);
                    return;
                }
            } catch (e) {}
        }

        if (!apiKey) {
            setRecipeError("Chave de IA não configurada.");
            setIsRecipeLoading(false);
            return;
        }

        setIsRecipeLoading(true);
        setRecipeError(null);
        try {
            const ai = new GoogleGenAI({ apiKey });
            let systemPrompt = `Você é um assistente culinário especialista. Gere uma receita completa em JSON.`;
            
            if (recipeName && !imageBase64) {
                 systemPrompt += ` para o prato: "${recipeName}".`;
            } else if (imageBase64) {
                 systemPrompt += ` Analise a imagem e gere a receita.`;
            }

            systemPrompt += `\nIMPORTANTE: 
            1. Retorne APENAS o objeto JSON puro.
            2. Gere aproximadamente 20 etiquetas (tags) estratégicas divididas em blocos: Ingredientes Chave, Métodos (assado, etc), Ocasião, e Sabor/Textura.
Format:
{
  "name": "Nome",
  "ingredients": [{"simplifiedName": "x", "detailedName": "y"}],
  "instructions": ["1", "2"],
  "imageQuery": "visual",
  "servings": "4",
  "prepTimeInMinutes": 30,
  "difficulty": "Fácil",
  "cost": "Médio",
  "isAlcoholic": false,
  "tags": ["tag1", "tag2", ...]
}`;

            const parts: any[] = [];
            if (imageBase64) {
                 const base64Data = imageBase64.split(',')[1];
                 const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));
                 parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
            }
            parts.push({ text: systemPrompt });

            const response: GenerateContentResponse = await callGenAIWithRetry(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview', 
                contents: { parts },
                config: { responseMimeType: "application/json" }
            }));

            const recipeDetails = JSON.parse(response.text || "{}");
            
            const finalRecipeName = recipeDetails.name || recipeName || "Receita";
            const cachedRecipe = getCachedRecipe(recipeName);
            const existingImage = cachedRecipe?.imageUrl;
            const existingSource = cachedRecipe?.imageSource;

            const fullRecipeData: FullRecipe = { 
                name: finalRecipeName, 
                ...recipeDetails,
                imageUrl: existingImage, 
                imageSource: existingSource,
                keywords: generateKeywords(finalRecipeName) 
            };
            
            setFullRecipes(prev => ({...prev, [finalRecipeName]: fullRecipeData}));
            setSelectedRecipe(fullRecipeData);
            closeModal('recipeAssistant');

            if (autoAdd) await addRecipeToShoppingList(fullRecipeData);

            if (recipeDetails.imageQuery && !existingImage) {
                generateRecipeImageBackground(fullRecipeData).catch(err => console.error(err));
            }

        } catch (e: any) {
            setRecipeError("Muitos pedidos. Aguarde e tente novamente.");
        } finally {
            setIsRecipeLoading(false);
        }
    }, [items, findDuplicate, addIngredientsBatch, showToast, closeModal, apiKey, selectedRecipe, fullRecipes, globalRecipeCache, getCachedRecipe, searchGlobalRecipes]); 
    
    const addRecipeToShoppingList = async (recipe: FullRecipe) => {
        const currentItemsCopy = [...items];
        const itemsToAdd: any[] = [];
        recipe.ingredients.forEach((ing) => {
            if (typeof ing.simplifiedName === 'string' && !findDuplicate(ing.simplifiedName, currentItemsCopy)) {
                const newItem = { name: ing.simplifiedName, calculatedPrice: 0, details: ing.detailedName, recipeName: recipe.name, isNew: true, isPurchased: false };
                itemsToAdd.push(newItem);
                currentItemsCopy.push({ ...newItem, id: '', displayPrice: '' } as any);
            }
        });

        if (itemsToAdd.length > 0) {
            await addIngredientsBatch(itemsToAdd);
            showToast(`${itemsToAdd.length} ingredientes adicionados!`);
        } else {
            showToast("Ingredientes já estão na lista.");
        }
    };

    const toggleGrouping = useCallback(async () => {
        if (groupingMode === 'recipe') {
            const itemsToCategorize = items.filter(item => !itemCategories[item.id]);
            if (itemsToCategorize.length === 0) { setGroupingMode('aisle'); closeModal('options'); return; }
            setIsOrganizing(true);
            try {
                if (!apiKey) throw new Error("API Key missing");
                const ai = new GoogleGenAI({ apiKey });
                const categories = [ "🍎 Hortifruti", "🥩 Açougue e Peixaria", "🧀 Frios e Laticínios", "🍞 Padaria", "🛒 Mercearia", "💧 Bebidas", "🧼 Limpeza", "🧴 Higiene Pessoal", "🐾 Pets", "🏠 Utilidades Domésticas", "❓ Outros" ];
                
                const response: GenerateContentResponse = await callGenAIWithRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: `Categorize estes itens: [${itemsToCategorize.map(i => `"${i.name}"`).join(', ')}]. Categorias: ${categories.join(', ')}. Return JSON array.`,
                    config: { responseMimeType: "application/json" }
                }));
                
                const categorizedItems = JSON.parse(response.text || "[]");
                const newCategoryMap = { ...itemCategories };
                const itemMap = new Map<string, string>(itemsToCategorize.map(i => [normalizeString(i.name), i.id]));
                
                (categorizedItems as { itemName: string; category: string }[]).forEach(ci => {
                    const id = itemMap.get(normalizeString(ci.itemName));
                    if (id) {
                        const matchedCategory = categories.find(c => c.includes(ci.category)) || "❓ Outros";
                        newCategoryMap[id] = matchedCategory;
                    }
                });
                setItemCategories(newCategoryMap);
                setGroupingMode('aisle');
            } catch (error: any) { 
                showToast("Muitas tentativas. Aguarde."); 
            }
            finally { setIsOrganizing(false); }
        } else {
            setGroupingMode('recipe');
        }
        closeModal('options');
    }, [groupingMode, items, itemCategories, showToast, closeModal, apiKey]);

    const normalizeString = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const clearIncomingList = () => setIncomingList(null);

    const handleExploreRecipeClick = (recipe: string | FullRecipe) => {
        showRecipe(recipe);
    };

    const getCategoryRecipesSync = useCallback((categoryKey: string): FullRecipe[] => {
        const pool = globalRecipeCache.length > 0 ? globalRecipeCache : allRecipesPool;
        
        const matches = (r: FullRecipe, terms: string[]) => {
            const text = (r.name + ' ' + (r.tags?.join(' ') || '')).toLowerCase();
            return terms.some(t => text.includes(t));
        };

        const filterDrinks = (recipes: FullRecipe[]) => {
            return recipes.filter(r => !isDrinkRecipe(r));
        };

        switch (categoryKey) {
            case 'top10':
                const solids = pool.filter(r => !isDrinkRecipe(r));
                const drinks = pool.filter(r => isDrinkRecipe(r));
                return [...solids.slice(0, 10), ...drinks.slice(0, 5)].sort(() => Math.random() - 0.5);
            case 'fast':
                const fastPool = pool.filter(r => (r.prepTimeInMinutes && r.prepTimeInMinutes <= 20) || matches(r, ['rápido', 'minutos', 'fácil', 'express']));
                return filterDrinks(fastPool).slice(0, 15);
            case 'new':
                const newSolids = filterDrinks(pool);
                if (newSolids.length >= 10) return newSolids.slice(0, 15);
                return pool.slice(0, 15);
            case 'cheap':
                const cheapPool = pool.filter(r => r.cost === 'Baixo' || matches(r, ['econômico', 'barato', 'simples', 'custo']));
                return filterDrinks(cheapPool).slice(0, 15);
            case 'healthy':
                return pool.filter(r => matches(r, ['fit', 'saudável', 'legumes', 'salada', 'integral', 'low carb', 'vegetariano', 'vegano', 'light'])).slice(0, 15);
            case 'dessert':
                return pool.filter(r => matches(r, ['doce', 'sobremesa', 'bolo', 'torta', 'chocolate', 'pudim', 'mousse', 'açúcar'])).slice(0, 15);
            case 'random':
                return [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);
            default:
                return pool.slice(0, 10);
        }
    }, [globalRecipeCache, allRecipesPool, isDrinkRecipe]);

    const getCategoryRecipes = useCallback((categoryKey: string): FullRecipe[] => {
        return getCategoryRecipesSync(categoryKey);
    }, [getCategoryRecipesSync]);

    const getCategoryCount = useCallback((categoryKey: string) => {
        return getCategoryRecipes(categoryKey).length;
    }, [getCategoryRecipes]);

    const getCategoryCover = useCallback((categoryKey: string) => {
        const recipes = getCategoryRecipes(categoryKey);
        const withImage = recipes.find(r => r.imageUrl);
        return withImage?.imageUrl;
    }, [getCategoryRecipes]);

    const fetchThemeSuggestions = async (key: string, priorityRecipeName?: string) => {
        const titles: Record<string, string> = {
            'top10': '🔥 Receitas em Alta',
            'fast': '⏱️ Jantar Rápido',
            'new': '🆕 Novidades do Chef',
            'cheap': '💰 Econômicas',
            'healthy': '🥗 Vida Saudável',
            'dessert': '🍰 Doces & Sobremesas',
            'random': '🎲 Surpreenda-me'
        };

        setCurrentTheme(titles[key] || key);
        setRecipeSuggestions([]);
        setModalStates(prev => ({...prev, isThemeRecipesModalOpen: true}));
        setIsSuggestionsLoading(true);
        
        try {
            let suggestions = getCategoryRecipes(key).slice(0, 10);
            if (suggestions.length === 0) {
                showToast(`Nenhuma receita encontrada.`);
            } else {
                setFullRecipes(prev => {
                    const updated = { ...prev };
                    suggestions.forEach(r => { updated[r.name] = r; });
                    return updated;
                });
                setRecipeSuggestions(suggestions);
            }
        } catch (error) {
            showToast("Erro ao carregar receitas.");
        } finally {
            setIsSuggestionsLoading(false);
        }
    };

    const openProductDetails = (product: Offer) => {
        setSelectedProduct(product);
        openModal('productDetails');
    };

    const value = {
        ...modalStates, openModal, closeModal, toggleAppOptionsMenu, toggleOptionsMenu,
        theme, setTheme,
        installPromptEvent, handleInstall, handleDismissInstall, isPWAInstallVisible,
        budget, setBudget, clearBudget,
        toastMessage, showToast, isCartTooltipVisible, showCartTooltip,
        fullRecipes, setFullRecipes, selectedRecipe, setSelectedRecipe, isRecipeLoading, recipeError, fetchRecipeDetails, handleRecipeImageGenerated, showRecipe, closeRecipe, resetRecipeState,
        editingItemId, startEdit, cancelEdit,
        duplicateInfo, setDuplicateInfo,
        groupingMode, setGroupingMode, isOrganizing, toggleGrouping,
        itemCategories,
        showStartHerePrompt,
        authTrigger, setAuthTrigger,
        incomingList, clearIncomingList,
        unreadNotificationCount: unreadReceivedCount,
        isAdmin,
        isSuperAdmin,
        smartNudgeItemName,
        currentMarketName, setCurrentMarketName,
        isSharedSession, setIsSharedSession,
        historyActiveTab, setHistoryActiveTab: (tab: any) => setHistoryActiveTab(tab),
        isHomeViewActive, setHomeViewActive,
        isFocusMode, setFocusMode,
        featuredRecipes, recipeSuggestions, isSuggestionsLoading, currentTheme, fetchThemeSuggestions, handleExploreRecipeClick, pendingExploreRecipe, setPendingExploreRecipe, totalRecipeCount,
        addRecipeToShoppingList,
        showPWAInstallPromptIfAvailable,
        searchGlobalRecipes,
        getCategoryCount,
        getCategoryCover,
        getCategoryRecipes,
        getCategoryRecipesSync,
        getCachedRecipe, 
        getRandomCachedRecipe,
        generateKeywords, 
        pendingAction, setPendingAction,
        selectedProduct,
        openProductDetails,
        recipeSearchResults, currentSearchTerm, handleRecipeSearch,
        scheduleRules, saveScheduleRules 
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
