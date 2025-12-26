
export interface HomeCategory {
  id: string;
  label: string;
  icon: string;
  tags: string[];
  order: number;
  active: boolean;
}

export interface ArcadeStats {
  gameId: 'memory' | 'speed' | 'slide';
  bestScore: number;
  updatedAt: any;
}

export interface ScheduleRule {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
  tags: string[];
  startDate?: string | null; 
  endDate?: string | null;   
}

export interface AdminPermissions {
    offers: boolean;
    schedule: boolean;
    factory: boolean;
    recipes: boolean;
    reviews: boolean;
    team: boolean;
    reports: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  displayPrice: string;
  calculatedPrice: number;
  details: string;
  recipeName?: string | null;
  isNew?: boolean;
  isPurchased: boolean;
  creatorUid?: string | null;
  creatorDisplayName?: string | null;
  creatorPhotoURL?: string | null;
  listId?: string | null;
  responsibleUid?: string | null;
  responsibleDisplayName?: string | null;
}

export interface DuplicateInfo {
  newItemName: string;
  existingItem: ShoppingItem;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface RecipeDetails {
  ingredients: {
    simplifiedName: string;
    detailedName: string;
  }[];
  instructions: string[];
  imageQuery: string;
  servings: string;
  prepTimeInMinutes: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  cost: 'Baixo' | 'Médio' | 'Alto';
}

export interface SalesOpportunity {
    id: string;
    term: string;
    recipeName: string;
    status: 'pending' | 'converted' | 'dismissed';
    createdAt: any;
}

export interface FullRecipe {
  name: string;
  ingredients: {
    simplifiedName: string;
    detailedName: string;
  }[];
  instructions: string[];
  imageQuery: string;
  servings: string;
  prepTimeInMinutes: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  cost: 'Baixo' | 'Médio' | 'Alto';
  imageUrl?: string;
  imageSource?: 'cache' | 'genai';
  description?: string;
  keywords?: string[]; 
  tags?: string[]; 
  isAlcoholic?: boolean; 
  suggestedLeads?: string[]; 
}

export interface RecipeSuggestion {
  name: string;
  description: string;
  imageQuery: string;
}

export interface HistoricItem {
  name: string;
  displayPrice: string;
  calculatedPrice: number;
  details: string;
}

export interface PurchaseRecord {
  id: string;
  date: string;
  marketName: string;
  total: number;
  items: HistoricItem[];
}

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  username: string | null;
  usernameChangeHistory?: string[]; 
  activeListId?: string; 
  dietaryPreferences?: string[]; 
  birthDate?: string; 
  role?: 'user' | 'admin_l1' | 'admin_l2';
  status?: 'active' | 'banned';
  permissions?: AdminPermissions;
}

export interface AuthorMetadata {
  uid: string;
  displayName: string;
  photoURL: string | null;
  username: string | null;
}

export interface ReceivedListRecord {
  id: string;
  date: string;
  shareId: string;
  marketName: string;
  itemCount: number;
  author: AuthorMetadata;
  items?: HistoricItem[];
  read?: boolean; 
}

export interface StartShoppingData {
  marketName: string;
  isShared: boolean;
}

export interface Offer {
    id: string;
    name: string;
    price: string;
    oldPrice?: string;
    image: string; 
    images?: string[]; 
    store: string;
    category: string;
    link: string;
    discount?: string;
    tags?: string[]; 
    description?: string; 
    averageRating?: number; 
    reviewCount?: number; 
    createdAt?: any;
}

export interface Review {
    id: string;
    offerId: string;
    offerName?: string; 
    offerImage?: string; 
    userId: string;
    userName: string;
    userPhotoURL?: string | null;
    rating: number;
    comment: string;
    createdAt: any;
}

export interface AdminInvite {
    id: string;
    fromUid: string;
    fromName: string;
    toIdentifier: string; // Pode ser email ou username
    permissions: AdminPermissions;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: any;
}

export interface ActivityLog {
    id: string;
    userId: string;
    userName: string;
    userPhoto: string | null;
    actionType: 'create' | 'update' | 'delete' | 'login';
    targetName: string; 
    details?: string;
    timestamp: any;
}
