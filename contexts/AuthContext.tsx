
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as firebaseAuth from 'firebase/auth';
import { doc, setDoc, getDoc, writeBatch, collection, query, where, getDocs, deleteDoc, addDoc, updateDoc, serverTimestamp, onSnapshot, or, and } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase';
import type { User, ShoppingItem, AdminInvite, AdminPermissions } from '../types';

interface AuthContextType {
    user: User | null;
    isAuthLoading: boolean;
    authError: string | null;
    authErrorCode: string | null;
    login: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    registerWithEmail: (name: string, username: string, email: string, pass: string, birthDate: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (name: string, photoURL?: string, birthDate?: string) => Promise<void>;
    updateUserPassword: (currentPass: string, name: string) => Promise<void>;
    updateUsername: (newUsername: string) => Promise<void>;
    updateDietaryPreferences: (preferences: string[]) => Promise<void>; 
    removeProfilePhoto: () => Promise<void>;
    deleteAccount: (password: string) => Promise<void>;
    logout: () => Promise<void>;
    setAuthError: (error: string | null) => void;
    clearAuthError: () => void;
    checkUsernameUniqueness: (username: string) => Promise<boolean>;
    
    // Funções Admin
    pendingAdminInvite: AdminInvite | null;
    sendAdminInvite: (identifier: string, permissions: AdminPermissions) => Promise<{ success: boolean; message: string }>;
    cancelAdminInvite: (inviteId: string) => Promise<void>;
    respondToAdminInvite: (inviteId: string, accept: boolean) => Promise<void>;
    refreshUserProfile: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
    const [pendingAdminInvite, setPendingAdminInvite] = useState<AdminInvite | null>(null);

    const checkUsernameUniqueness = async (username: string): Promise<boolean> => {
        if (!db) return true;
        try {
            const q = query(collection(db, 'users_public'), where('username', '==', username.toLowerCase()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                if (user && user.email) {
                    const docData = querySnapshot.docs[0].data();
                    if (docData.email === user.email) return true;
                }
                return false;
            }
            return true;
        } catch (error) {
            console.error("Erro ao verificar username:", error);
            return true; 
        }
    };

    const generateUniqueUsername = async (baseName: string): Promise<string> => {
        let username = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (username.length < 3) username = username + Math.floor(Math.random() * 1000);
        if (username.length > 15) username = username.substring(0, 15);

        let isUnique = await checkUsernameUniqueness(username);
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            const suffix = Math.floor(Math.random() * 10000).toString();
            const availableSpace = 15 - suffix.length;
            const newBase = username.substring(0, availableSpace);
            username = newBase + suffix;
            isUnique = await checkUsernameUniqueness(username);
            attempts++;
        }
        
        if (!isUnique) {
            username = 'user' + Date.now().toString().slice(-8);
        }

        return username;
    };

    const syncUserToPublicDirectory = async (currentUser: any, photoURLOverride?: string, usernameOverride?: string) => {
        if (!db || !currentUser.email) return;
        try {
            const publicUserRef = doc(db, 'users_public', currentUser.email.toLowerCase());
            
            const dataToSync: any = {
                uid: currentUser.uid,
                displayName: currentUser.displayName || 'Usuário',
                photoURL: photoURLOverride || currentUser.photoURL || null,
                email: currentUser.email
            };

            if (usernameOverride) {
                dataToSync.username = usernameOverride.toLowerCase();
            }

            await setDoc(publicUserRef, dataToSync, { merge: true });
        } catch (e) {
            console.error("Erro ao sincronizar diretório público:", e);
        }
    };

    const processUserData = async (currentUser: any) => {
        let photoToUse = currentUser.photoURL;
        let usernameToUse = null;
        let historyToUse: string[] = [];
        let activeListIdToUse: string = currentUser.uid;
        let preferencesToUse: string[] = []; 
        let birthDateToUse: string | undefined = undefined;
        let roleToUse: 'user' | 'admin_l1' | 'admin_l2' = 'user';
        let permissionsToUse: AdminPermissions | undefined = undefined;

        if (db) {
            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    if (data.photoBase64) photoToUse = data.photoBase64;
                    if (data.usernameChangeHistory) historyToUse = data.usernameChangeHistory;
                    if (data.activeListId) activeListIdToUse = data.activeListId;
                    if (data.dietaryPreferences) preferencesToUse = data.dietaryPreferences;
                    if (data.birthDate) birthDateToUse = data.birthDate;
                    if (data.role) roleToUse = data.role;
                    if (data.permissions) permissionsToUse = data.permissions;
                }

                if (currentUser.email) {
                    const publicUserRef = doc(db, 'users_public', currentUser.email.toLowerCase());
                    const publicUserSnap = await getDoc(publicUserRef);
                    if (publicUserSnap.exists()) {
                        usernameToUse = publicUserSnap.data().username || null;
                    }
                }
            } catch (e) {
                console.error("Erro ao buscar dados do perfil:", e);
                const localPhoto = localStorage.getItem(`user_photo_${currentUser.uid}`);
                if (localPhoto) photoToUse = localPhoto;
            }
        }

        return {
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário',
            email: currentUser.email,
            photoURL: photoToUse,
            username: usernameToUse,
            usernameChangeHistory: historyToUse,
            activeListId: activeListIdToUse,
            dietaryPreferences: preferencesToUse,
            birthDate: birthDateToUse,
            role: roleToUse,
            permissions: permissionsToUse
        };
    };

    const refreshUserProfile = async () => {
        if (!auth?.currentUser) return;
        const updatedUser = await processUserData(auth.currentUser);
        setUser(updatedUser);
    };

    useEffect(() => {
        if (!auth) {
            setIsAuthLoading(false);
            return;
        }
        // FIX: Using namespace import for onAuthStateChanged
        const unsubscribe = firebaseAuth.onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userData = await processUserData(currentUser);
                setUser(userData);
                
                if (userData.username) {
                    syncUserToPublicDirectory(currentUser, userData.photoURL || undefined, userData.username);
                }
            } else {
                setUser(null);
            }
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Listener de convites (por email ou username)
    useEffect(() => {
        if (!user || !db || !auth?.currentUser) return;

        const email = user.email?.toLowerCase();
        const username = user.username?.toLowerCase();

        if (!email && !username) return;

        const q = query(
            collection(db, 'admin_invites'), 
            and(
                where('status', '==', 'pending'),
                or(
                    where('toIdentifier', '==', email || '---'),
                    where('toIdentifier', '==', username || '---')
                )
            )
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const inviteData = snapshot.docs[0].data() as AdminInvite;
                setPendingAdminInvite({ ...inviteData, id: snapshot.docs[0].id });
            } else {
                setPendingAdminInvite(null);
            }
        }, (error) => {
            console.warn("[Auth] Erro ao buscar convites de admin:", error.message);
        });

        return () => unsubscribe();
    }, [user?.email, user?.username, user?.uid]);

    const loginWithEmail = async (email: string, pass: string) => {
        setAuthError(null);
        setAuthErrorCode(null);
        if (!auth) {
             setAuthError("Configuração do Firebase ausente.");
             return;
        }

        try {
            // FIX: Using namespace import for signInWithEmailAndPassword
            const result = await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
            localStorage.setItem('remembered_email', email);
        } catch (error: any) {
            const errorCode = error.code || '';
            if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                setAuthErrorCode('INVALID_CREDENTIALS');
                setAuthError("E-mail ou senha incorretos.");
            } else if (errorCode === 'auth/too-many-requests') {
                setAuthError("Muitas tentativas falhas. Tente novamente mais tarde.");
            } else {
                setAuthError(`Erro ao entrar: ${error.message}`);
            }
        }
    };

    const registerWithEmail = async (name: string, username: string, email: string, pass: string, birthDate: string) => {
        setAuthError(null);
        setAuthErrorCode(null);
        if (!auth) {
            setAuthError("Configuração do Firebase ausente.");
            return;
        }

        const cleanUsername = username.toLowerCase();

        try {
            const isUnique = await checkUsernameUniqueness(cleanUsername);
            if (!isUnique) {
                setAuthError(`O usuário @${cleanUsername} já está em uso.`);
                return;
            }

            // FIX: Using namespace import for createUserWithEmailAndPassword
            const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
            // FIX: Using namespace import for updateProfile
            await firebaseAuth.updateProfile(result.user, {
                displayName: name
            });
            localStorage.setItem('remembered_email', email);
            
            if (db) {
                const userDocRef = doc(db, 'users', result.user.uid);
                await setDoc(userDocRef, { 
                    birthDate: birthDate,
                    role: 'user' 
                }, { merge: true });
            }

            await syncUserToPublicDirectory({ ...result.user, displayName: name }, undefined, cleanUsername);

            const newUser: User = {
                uid: result.user.uid,
                displayName: name,
                email: result.user.email,
                photoURL: result.user.photoURL,
                username: cleanUsername,
                activeListId: result.user.uid,
                dietaryPreferences: [],
                birthDate: birthDate,
                role: 'user'
            };
            setUser(newUser);

        } catch (error: any) {
            const errorCode = error.code || '';
            if (errorCode === 'auth/email-already-in-use') {
                setAuthErrorCode('EMAIL_IN_USE');
                setAuthError("Este e-mail já está cadastrado.");
            } else if (errorCode === 'auth/weak-password') {
                setAuthError("A senha deve ter pelo menos 6 caracteres.");
            } else {
                setAuthError(`Erro ao criar conta: ${error.message}`);
            }
        }
    };

    const resetPassword = async (email: string) => {
        if (!auth) return;
        try {
            // FIX: Using namespace import for sendPasswordResetEmail
            await firebaseAuth.sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            throw new Error(error.message);
        }
    };

    const updateUsername = async (newUsername: string) => {
        if (!auth || !auth.currentUser || !user || !db) throw new Error("Usuário não autenticado.");

        const cleanUsername = newUsername.trim().toLowerCase();
        if (cleanUsername === user.username) return;

        try {
            const isUnique = await checkUsernameUniqueness(cleanUsername);
            if (!isUnique) throw new Error(`O usuário @${cleanUsername} já está em uso.`);

            await syncUserToPublicDirectory(auth.currentUser, undefined, cleanUsername);
            
            const history = user.usernameChangeHistory || [];
            const newHistory = [...history, new Date().toISOString()];
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userDocRef, { usernameChangeHistory: newHistory }, { merge: true });

            setUser(prev => prev ? ({ ...prev, username: cleanUsername, usernameChangeHistory: newHistory }) : null);

        } catch (error: any) {
            throw new Error(error.message || "Falha ao atualizar nome de usuário.");
        }
    };

    const updateDietaryPreferences = async (preferences: string[]) => {
        if (!auth || !auth.currentUser || !db) throw new Error("Usuário não autenticado.");
        try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userDocRef, { dietaryPreferences: preferences }, { merge: true });
            setUser(prev => prev ? ({ ...prev, dietaryPreferences: preferences }) : null);
        } catch (error) {
            throw new Error("Falha ao salvar preferências.");
        }
    };

    const deleteAccount = async (password: string) => {
        if (!auth || !auth.currentUser || !auth.currentUser.email || !db) throw new Error("Erro de autenticação.");
        try {
            // FIX: Using namespace import for EmailAuthProvider and reauthenticateWithCredential
            const credential = firebaseAuth.EmailAuthProvider.credential(auth.currentUser.email, password);
            await firebaseAuth.reauthenticateWithCredential(auth.currentUser, credential);
            const uid = auth.currentUser.uid;
            const email = auth.currentUser.email;
            await deleteDoc(doc(db, 'users_public', email.toLowerCase()));
            await deleteDoc(doc(db, 'users', uid));
            // FIX: Using namespace import for deleteUser
            await firebaseAuth.deleteUser(auth.currentUser);
            setUser(null);
        } catch (error: any) {
            throw new Error(error.code === 'auth/wrong-password' ? "Senha incorreta." : error.message);
        }
    };

    const updateUserProfile = async (name: string, photoURL?: string, birthDate?: string) => {
        if (!auth || !auth.currentUser) throw new Error("Usuário não autenticado.");
        try {
            // FIX: Using namespace import for updateProfile
            await firebaseAuth.updateProfile(auth.currentUser, { displayName: name });
            if (db) {
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                const updates: any = {};
                if (photoURL) updates.photoBase64 = photoURL;
                if (birthDate) updates.birthDate = birthDate;
                if (Object.keys(updates).length > 0) await setDoc(userDocRef, updates, { merge: true });
            }
            await syncUserToPublicDirectory(auth.currentUser, photoURL, user?.username || undefined);
            setUser(prev => prev ? ({ ...prev, displayName: name, photoURL: photoURL || prev.photoURL, birthDate: birthDate || prev.birthDate }) : null);
        } catch (error: any) {
            throw new Error(error.message);
        }
    };

    const removeProfilePhoto = async () => {
        if (!auth || !auth.currentUser) throw new Error("Usuário não autenticado.");
        try {
            // FIX: Using namespace import for updateProfile
            await firebaseAuth.updateProfile(auth.currentUser, { photoURL: "" });
            if (db) await setDoc(doc(db, 'users', auth.currentUser.uid), { photoBase64: null }, { merge: true });
            await syncUserToPublicDirectory(auth.currentUser, "", user?.username || undefined);
            setUser(prev => prev ? ({ ...prev, photoURL: null }) : null);
        } catch (error: any) {
            throw new Error(error.message);
        }
    };

    const updateUserPassword = async (currentPass: string, newPass: string) => {
        if (!auth || !auth.currentUser || !auth.currentUser.email) throw new Error("Usuário não autenticado.");
        try {
            // FIX: Using namespace import for EmailAuthProvider and reauthenticateWithCredential
            const credential = firebaseAuth.EmailAuthProvider.credential(auth.currentUser.email, currentPass);
            await firebaseAuth.reauthenticateWithCredential(auth.currentUser, credential);
            // FIX: Using namespace import for updatePassword
            await firebaseAuth.updatePassword(auth.currentUser, newPass);
        } catch (error: any) {
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') throw new Error("A senha atual está incorreta.");
            throw new Error(error.message);
        }
    };

    const login = async () => {
        setAuthError(null);
        setAuthErrorCode(null);
        if (!auth) return;
        // FIX: Using namespace import for GoogleAuthProvider
        const provider = new firebaseAuth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            // FIX: Using namespace import for signInWithPopup
            const result = await firebaseAuth.signInWithPopup(auth, provider);
            let finalUsername = undefined;
            if (db && result.user.email) {
                const publicUserRef = doc(db, 'users_public', result.user.email.toLowerCase());
                const publicUserSnap = await getDoc(publicUserRef);
                if (!publicUserSnap.exists()) {
                    finalUsername = await generateUniqueUsername(result.user.email.split('@')[0]);
                }
            }
            await syncUserToPublicDirectory(result.user, undefined, finalUsername);
        } catch (error: any) {
            const errorCode = error.code || '';
            if (errorCode === 'auth/unauthorized-domain') {
                 setAuthErrorCode('DOMAIN_ERROR');
                 setAuthError(`Domínio não autorizado: ${window.location.hostname}`);
            } else if (errorCode !== 'auth/popup-closed-by-user') {
                setAuthError(`Erro ao entrar com Google: ${error.message}`);
            }
        }
    };

    const logout = async () => {
        if (!auth) return;
        try { 
            // FIX: Using namespace import for signOut
            await firebaseAuth.signOut(auth); 
            setUser(null); 
        } catch (error) { setUser(null); }
    };

    const clearAuthError = () => { setAuthError(null); setAuthErrorCode(null); }

    const sendAdminInvite = async (identifier: string, permissions: AdminPermissions) => {
        if (!db || !user) return { success: false, message: 'Erro interno.' };
        try {
            const cleanId = identifier.trim().toLowerCase();
            const inviteRef = await addDoc(collection(db, 'admin_invites'), { 
                fromUid: user.uid, 
                fromName: user.displayName, 
                toIdentifier: cleanId, 
                permissions: permissions,
                status: 'pending', 
                createdAt: serverTimestamp() 
            });
            return { success: true, message: `Convite enviado para ${cleanId}` };
        } catch (error) {
            return { success: false, message: 'Falha ao enviar convite.' };
        }
    };

    const cancelAdminInvite = async (inviteId: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'admin_invites', inviteId));
        } catch (error) {
            console.error("Erro ao cancelar convite:", error);
        }
    };

    const respondToAdminInvite = async (inviteId: string, accept: boolean) => {
        if (!db || !user) return;
        try {
            const inviteRef = doc(db, 'admin_invites', inviteId);
            const inviteSnap = await getDoc(inviteRef);
            if (inviteSnap.exists()) {
                const inviteData = inviteSnap.data() as AdminInvite;
                if (accept) {
                    // Regra: Se todas marcadas = L1 (Azul), senão L2 (Verde)
                    const perms = inviteData.permissions;
                    const allChecked = Object.values(perms).every(v => v === true);
                    const newRole = allChecked ? 'admin_l1' : 'admin_l2';
                    
                    await updateDoc(doc(db, 'users', user.uid), { 
                        role: newRole,
                        permissions: perms
                    });
                }
                await updateDoc(inviteRef, { status: accept ? 'accepted' : 'rejected' });
            }
            setPendingAdminInvite(null); 
        } catch (error) {
            console.error(error);
        }
    };

    const value = { 
        user, isAuthLoading, authError, authErrorCode, login, loginWithEmail, registerWithEmail, resetPassword, updateUserProfile, updateUserPassword, updateUsername, updateDietaryPreferences, removeProfilePhoto, deleteAccount, logout, setAuthError, clearAuthError, checkUsernameUniqueness, pendingAdminInvite, sendAdminInvite, cancelAdminInvite, respondToAdminInvite, refreshUserProfile 
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
