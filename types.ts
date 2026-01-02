
export interface ArcadeStats {
  gameId: 'memory' | 'speed' | 'slide';
  bestScore: number;
  updatedAt: any;
}

export interface AdminPermissions {
    offers: boolean;
    factory: boolean;
    recipes: boolean;
    reviews: boolean;
    team: boolean;
    reports: boolean;
    // Fix: Added schedule permission
    schedule: boolean;
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
  createdAt?: any;
  updatedAt?: any;
}

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  username: string | null;
  usernameChangeHistory?: string[]; 
  activeListId?: string; 
  role?: 'user' | 'admin_l1' | 'admin_l2';
  status?: 'active' | 'banned';
  permissions?: AdminPermissions;
  // Fix: Added missing properties for User
  dietaryPreferences?: string[];
  birthDate?: string;
}

export interface AuthorMetadata {
  uid: string;
  displayName: string;
  photoURL: string | null;
  username: string | null;
}

// Fix: Added missing HistoricItem interface
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

export interface HomeCategory {
    id: string;
    label: string;
    tags: string[];
    order: number;
    icon?: string;
}

export interface AdminInvite {
  id: string;
  fromUid: string;
  fromName: string;
  toIdentifier: string;
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

export interface SalesOpportunity {
    id: string;
    term: string;
    status: 'pending' | 'resolved';
    createdAt: any;
}

// Fix: Added missing ScheduleRule interface
export interface ScheduleRule {
    id: string;
    label: string;
    startHour: number;
    endHour: number;
    tags: string[];
    startDate?: string;
    endDate?: string;
}
