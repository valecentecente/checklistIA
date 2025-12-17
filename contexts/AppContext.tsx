
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, getCountFromServer, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { DuplicateInfo, FullRecipe, RecipeDetails, ShoppingItem, ReceivedListRecord, RecipeSuggestion, Offer } from '../types';
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
    getCachedRecipe: (name: string) => FullRecipe | undefined;
    getRandomCachedRecipe: () => FullRecipe | null;
    generateKeywords: (text: string) => string[];

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
    setPendingAction: (action: string | null) => void;

    addRecipeToShoppingList: (recipe: FullRecipe) => Promise<void>;
    showPWAInstallPromptIfAvailable: () => void;

    // Products / Offers
    selectedProduct: Offer | null; 
    openProductDetails: (product: Offer) => void; 
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for retry logic optimized for Free Tier Limits (429)
export const callGenAIWithRetry = async (fn: () => Promise<any>, retries = 5): Promise<any> => {
    try {
        return await fn();
    } catch (error: any) {
        const errorStr = error?.toString() || '';
        const isQuotaError = 
            error?.status === 429 || 
            errorStr.includes('429') || 
            errorStr.includes('RESOURCE_EXHAUSTED') ||
            error?.message?.includes('quota');
                             
        if (retries > 0 && isQuotaError) {
            // Aumentamos o delay significativamente no erro 429
            // Espera de 10s a 20s para garantir que o "bucket" da API se recupere
            const delay = (10000 * (6 - retries)) + Math.random() * 5000; 
            console.warn(`Cota excedida. Aguardando ${Math.round(delay/1000)}s para tentar novamente...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return callGenAIWithRetry(fn, retries - 1);
        }
        throw error;
    }
};

// Helper to ignore permission errors
const ignorePermissionError = (err: any) => {
    if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
        console.warn('Salvamento no acervo ignorado: Sem permissão.');
        return true;
    }
    return false;
};

// Helper para gerar palavras-chave (Keywords) de busca
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
    
    const [featuredRecipes, setFeaturedRecipes] = useState<FullRecipe[]>([]);
    const [recipeSuggestions, setRecipeSuggestions] = useState<FullRecipe[]>([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<string | null>(null);
    const [pendingExploreRecipe, setPendingExploreRecipe] = useState<string | null>(null);
    const [totalRecipeCount, setTotalRecipeCount] = useState(0);
    
    const [selectedProduct, setSelectedProduct] = useState<Offer | null>(null);
    const [globalRecipeCache, setGlobalRecipeCache] = useState<FullRecipe[]>([]);

    const [recipeSearchResults, setRecipeSearchResults] = useState<FullRecipe[]>([]);
    const [currentSearchTerm, setCurrentSearchTerm] = useState('');

    const apiKey = process.env.API_KEY as string;
    
    const isSuperAdmin = user?.role === 'admin_l1';
    const isAdmin = isSuperAdmin || user?.role === 'admin_l2';

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

    useEffect(() => {
        if (!db) return;
        const loadData = async () => {
            try {
                // Carrega destaque
                const qFeatured = query(collection(db, 'global_recipes'), orderBy('createdAt', 'desc'), limit(30));
                const snapshotFeatured = await getDocs(qFeatured);
                const recipesPool: FullRecipe[] = [];
                snapshotFeatured.forEach(doc => {
                    const data = doc.data() as FullRecipe;
                    if (data.name && data.imageUrl && data.ingredients && data.ingredients.length > 0) {
                        recipesPool.push({ ...data, imageSource: 'cache' });
                    }
                });

                const shuffled = [...recipesPool];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                
                setFeaturedRecipes(shuffled.slice(0, 5));

                // Carrega Cache Global
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

    useEffect(() => {
        const hasDismissed = localStorage.getItem('preferences_dismissed') === 'true';
        if (user && user.uid && !user.uid.startsWith('offline') && (!user.dietaryPreferences || user.dietaryPreferences.length === 0) && !modalStates.isAuthModalOpen && !modalStates.isTourModalOpen && !hasDismissed) {
            const timer = setTimeout(() => {
                openModal('preferences');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [user, modalStates.isAuthModalOpen, modalStates.isTourModalOpen]);

    useEffect(() => {
        if (pendingAdminInvite && !modalStates.isAdminInviteModalOpen) {
            setModalStates(prev => ({ ...prev, isAdminInviteModalOpen: true }));
        }
    }, [pendingAdminInvite]);

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

    useEffect(() => {
        let timer: number;
        if (isCartTooltipVisible) timer = window.setTimeout(() => setIsCartTooltipVisible(false), 3000);
        return () => clearTimeout(timer);
    }, [isCartTooltipVisible]);

    const openModal = (modal: string) => {
        if (modal === 'addItem' && showStartHerePrompt) setShowStartHerePrompt(false);
        if (modal !== 'auth') setAuthTrigger(null);
        
        let modalKey = `is${modal.charAt(0).toUpperCase() + modal.slice(1)}ModalOpen`;
        if (modal === 'admin') modalKey = 'isAdminModalOpen';
        if (modal === 'adminRecipes') modalKey = 'isAdminRecipesModalOpen';
        if (modal === 'adminReviews') modalKey = 'isAdminReviewsModalOpen';
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
            const normalizedQuery = queryStr.charAt(0).toUpperCase() + queryStr.slice(1).toLowerCase();
            const searchKeywords = generateKeywords(queryStr);
            
            if (searchKeywords.length > 0) {
                const q = query(
                    collection(db, 'global_recipes'),
                    where('keywords', 'array-contains-any', searchKeywords.slice(0, 10)),
                    limit(15) 
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const results: FullRecipe[] = [];
                    snapshot.forEach(doc => {
                        const data = doc.data() as FullRecipe;
                        if (data.name) {
                            results.push({ ...data, imageSource: 'cache' });
                        }
                    });
                    results.sort((a, b) => {
                        const countMatches = (r: FullRecipe) => {
                            if (!r.keywords) return 0;
                            return r.keywords.filter(k => searchKeywords.includes(k)).length;
                        };
                        return countMatches(b) - countMatches(a);
                    });
                    return results; 
                }
            }

            const qFallback = query(
                collection(db, 'global_recipes'),
                where('name', '>=', normalizedQuery),
                where('name', '<=', normalizedQuery + '\uf8ff'),
                limit(5)
            );
            const snapshotFallback = await getDocs(qFallback);
            const fallbackResults: FullRecipe[] = [];
            snapshotFallback.forEach(doc => {
                const data = doc.data() as FullRecipe;
                if (data.name) fallbackResults.push({ ...data, imageSource: 'cache' });
            });
            return fallbackResults;

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

            systemPrompt += `\nIMPORTANTE: Retorne APENAS o objeto JSON puro.
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
  "isAlcoholic": false 
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

    const getCategoryRecipes = useCallback((categoryKey: string): FullRecipe[] => {
        const pool = globalRecipeCache.length > 0 ? globalRecipeCache : featuredRecipes;
        
        const matches = (r: FullRecipe, terms: string[]) => {
            const text = (r.name + ' ' + (r.tags?.join(' ') || '')).toLowerCase();
            return terms.some(t => text.includes(t));
        };

        switch (categoryKey) {
            case 'top10':
                return pool.slice(0, 15);
            case 'fast':
                return pool.filter(r => (r.prepTimeInMinutes && r.prepTimeInMinutes <= 20) || matches(r, ['rápido', 'minutos', 'fácil', 'express']));
            case 'new':
                return pool.slice(0, 15);
            case 'cheap':
                return pool.filter(r => r.cost === 'Baixo' || matches(r, ['econômico', 'barato', 'simples', 'custo']));
            case 'healthy':
                return pool.filter(r => matches(r, ['fit', 'saudável', 'legumes', 'salada', 'integral', 'low carb', 'vegetariano', 'vegano', 'light']));
            case 'dessert':
                return pool.filter(r => matches(r, ['doce', 'sobremesa', 'bolo', 'torta', 'chocolate', 'pudim', 'mousse', 'açúcar']));
            case 'random':
                return [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);
            default:
                return pool.slice(0, 10);
        }
    }, [globalRecipeCache, featuredRecipes]);

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
        getCachedRecipe, 
        getRandomCachedRecipe,
        generateKeywords, 
        pendingAction, setPendingAction,
        selectedProduct,
        openProductDetails,
        recipeSearchResults, currentSearchTerm, handleRecipeSearch 
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
