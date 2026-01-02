
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as firebaseAuth from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, updateDoc, serverTimestamp, onSnapshot, or, and } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { User, AdminInvite, AdminPermissions } from '../types';

interface AuthContextType {
    user: User | null;
    isAuthLoading: boolean;
    authError: string | null;
    authErrorCode: string | null;
    login: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    registerWithEmail: (name: string, username: string, email: string, pass: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (name: string, photoURL?: string) => Promise<void>;
    updateUserPassword: (currentPass: string, name: string) => Promise<void>;
    updateUsername: (newUsername: string) => Promise<void>;
    removeProfilePhoto: () => Promise<void>;
    deleteAccount: (password: string) => Promise<void>;
    logout: () => Promise<void>;
    setAuthError: (error: string | null) => void;
    clearAuthError: () => void;
    checkUsernameUniqueness: (username: string) => Promise<boolean>;
    
    pendingAdminInvite: AdminInvite | null;
    sendAdminInvite: (identifier: string, permissions: AdminPermissions) => Promise<{ success: boolean; message: string }>;
    cancelAdminInvite: (inviteId: string) => Promise<void>;
    respondToAdminInvite: (inviteId: string, accept: boolean) => Promise<void>;
    refreshUserProfile: () => Promise<void>; 
    
    banUser: (userId: string, status: 'active' | 'banned') => Promise<void>;
    deleteUserProfile: (userId: string, email: string) => Promise<void>;
    updateUserRole: (userId: string, role: 'user' | 'admin_l1' | 'admin_l2') => Promise<void>;
    // FIX: Added updateDietaryPreferences to AuthContextType
    updateDietaryPreferences: (prefs: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ignorePermissionError = (err: any) => {
    return err.code === 'permission-denied' || (err.message && err.message.includes('Missing or insufficient permissions'));
};

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
            return true; 
        }
    };

    const processUserData = async (currentUser: firebaseAuth.User) => {
        let photoToUse = currentUser.photoURL;
        let usernameToUse = null;
        let historyToUse: string[] = [];
        let activeListIdToUse: string = currentUser.uid;
        let roleToUse: 'user' | 'admin_l1' | 'admin_l2' = 'user';
        let statusToUse: 'active' | 'banned' = 'active';
        // FIX: placeholders for preferences and birthdate
        let dietaryPreferences: string[] = [];
        let birthDate: string | undefined = undefined;

        const userEmail = currentUser.email?.toLowerCase();
        const isOwnerEmail = userEmail === 'admin@checklistia.com' || userEmail === 'itensnamao@gmail.com' || userEmail === 'ricardo029@gmail.com';
        
        if (isOwnerEmail) roleToUse = 'admin_l1';

        if (db) {
            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    if (data.photoBase64) photoToUse = data.photoBase64;
                    if (data.usernameChangeHistory) historyToUse = data.usernameChangeHistory;
                    if (data.activeListId) activeListIdToUse = data.activeListId;
                    if (data.role) roleToUse = data.role;
                    if (data.status) statusToUse = data.status;
                    // FIX: Extract dietaryPreferences and birthDate from firestore
                    if (data.dietaryPreferences) dietaryPreferences = data.dietaryPreferences;
                    if (data.birthDate) birthDate = data.birthDate;

                    if (isOwnerEmail && data.role !== 'admin_l1') {
                        await updateDoc(userDocRef, { role: 'admin_l1' });
                        roleToUse = 'admin_l1';
                    }
                } else if (isOwnerEmail) {
                    await setDoc(userDocRef, {
                        displayName: currentUser.displayName || 'Admin',
                        email: userEmail,
                        role: 'admin_l1',
                        status: 'active',
                        createdAt: serverTimestamp()
                    });
                }

                if (userEmail) {
                    const publicUserRef = doc(db, 'users_public', userEmail);
                    const publicUserSnap = await getDoc(publicUserRef);
                    if (publicUserSnap.exists()) {
                        usernameToUse = publicUserSnap.data().username || null;
                    }
                }
            } catch (e) {}
        }

        return {
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário',
            email: currentUser.email,
            photoURL: photoToUse,
            username: usernameToUse,
            usernameChangeHistory: historyToUse,
            activeListId: activeListIdToUse,
            role: roleToUse,
            status: statusToUse,
            // FIX: Added missing properties to the user object
            dietaryPreferences,
            birthDate
        } as User;
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
        const unsubscribe = firebaseAuth.onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userData = await processUserData(currentUser);
                if (userData.status === 'banned') {
                    firebaseAuth.signOut(auth);
                    setUser(null);
                    setAuthError("Sua conta foi suspensa.");
                    setIsAuthLoading(false);
                    return;
                }
                setUser(userData);
            } else {
                setUser(null);
            }
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !db || !auth?.currentUser || user.uid.startsWith('offline-')) {
            setPendingAdminInvite(null);
            return;
        }
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
            if (!ignorePermissionError(error)) {
                console.warn("[Auth] Erro ao buscar convites de admin:", error.message);
            }
        });

        return () => unsubscribe();
    }, [user?.email, user?.username, user?.uid]);

    const loginWithEmail = async (email: string, pass: string) => {
        setAuthError(null);
        setAuthErrorCode(null);
        if (!auth) return;
        try {
            await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
        } catch (error: any) {
            const errorCode = error.code || '';
            if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                setAuthErrorCode('INVALID_CREDENTIALS');
                setAuthError("E-mail ou senha incorretos.");
            } else {
                setAuthError(`Erro ao entrar: ${error.message}`);
            }
        }
    };

    const registerWithEmail = async (name: string, username: string, email: string, pass: string) => {
        setAuthError(null);
        setAuthErrorCode(null);
        if (!auth) return;
        try {
            const isUnique = await checkUsernameUniqueness(username.toLowerCase());
            if (!isUnique) {
                setAuthError(`O usuário @${username} já está em uso.`);
                return;
            }
            const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
            await firebaseAuth.updateProfile(result.user, { displayName: name });
            if (db) {
                await setDoc(doc(db, 'users', result.user.uid), { 
                    displayName: name,
                    email: email,
                    role: 'user',
                    status: 'active',
                    createdAt: serverTimestamp()
                }, { merge: true });
                await setDoc(doc(db, 'users_public', email.toLowerCase()), {
                    uid: result.user.uid,
                    displayName: name,
                    username: username.toLowerCase(),
                    email: email
                });
            }
            await refreshUserProfile();
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                setAuthErrorCode('EMAIL_IN_USE');
                setAuthError("Este e-mail já está cadastrado.");
            } else {
                setAuthError(`Erro ao criar conta: ${error.message}`);
            }
        }
    };

    const resetPassword = async (email: string) => {
        if (!auth) return;
        await firebaseAuth.sendPasswordResetEmail(auth, email);
    };

    const updateUsername = async (newUsername: string) => {
        if (!auth?.currentUser || !db) return;
        const cleanUsername = newUsername.trim().toLowerCase();
        const isUnique = await checkUsernameUniqueness(cleanUsername);
        if (!isUnique) throw new Error(`O usuário @${cleanUsername} já está em uso.`);
        const history = user?.usernameChangeHistory || [];
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { 
            username: cleanUsername, 
            usernameChangeHistory: [...history, new Date().toISOString()] 
        });
        if (user?.email) {
            await updateDoc(doc(db, 'users_public', user.email.toLowerCase()), { username: cleanUsername });
        }
        await refreshUserProfile();
    };

    const deleteAccount = async (password: string) => {
        if (!auth?.currentUser || !auth.currentUser.email || !db) return;
        const credential = firebaseAuth.EmailAuthProvider.credential(auth.currentUser.email, password);
        await firebaseAuth.reauthenticateWithCredential(auth.currentUser, credential);
        await deleteDoc(doc(db, 'users_public', auth.currentUser.email.toLowerCase()));
        await deleteDoc(doc(db, 'users', auth.currentUser.uid));
        await firebaseAuth.deleteUser(auth.currentUser);
    };

    const updateUserProfile = async (name: string, photoURL?: string) => {
        if (!auth?.currentUser || !db) return;
        await firebaseAuth.updateProfile(auth.currentUser, { displayName: name });
        const updates: any = { displayName: name };
        if (photoURL) updates.photoBase64 = photoURL;
        await updateDoc(doc(db, 'users', auth.currentUser.uid), updates);
        if (user?.email) {
            const publicUserRef = doc(db, 'users_public', user.email.toLowerCase());
            await updateDoc(publicUserRef, { displayName: name, photoURL: photoURL || null });
        }
        await refreshUserProfile();
    };

    const removeProfilePhoto = async () => {
        if (!auth?.currentUser || !db) return;
        await firebaseAuth.updateProfile(auth.currentUser, { photoURL: "" });
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { photoBase64: null });
        if (user?.email) {
            await updateDoc(doc(db, 'users_public', user.email.toLowerCase()), { photoURL: null });
        }
        await refreshUserProfile();
    };

    const updateUserPassword = async (currentPass: string, newPass: string) => {
        if (!auth?.currentUser?.email) return;
        const credential = firebaseAuth.EmailAuthProvider.credential(auth.currentUser.email, currentPass);
        await firebaseAuth.reauthenticateWithCredential(auth.currentUser, credential);
        await firebaseAuth.updatePassword(auth.currentUser, newPass);
    };

    const login = async () => {
        if (!auth || !db) return;
        const provider = new firebaseAuth.GoogleAuthProvider();
        try {
            const result = await firebaseAuth.signInWithPopup(auth, provider);
            const userDocRef = doc(db, 'users', result.user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (!userDocSnap.exists()) {
                await setDoc(userDocRef, {
                    displayName: result.user.displayName,
                    email: result.user.email,
                    role: 'user',
                    status: 'active',
                    createdAt: serverTimestamp()
                });
                if (result.user.email) {
                    await setDoc(doc(db, 'users_public', result.user.email.toLowerCase()), {
                        uid: result.user.uid,
                        displayName: result.user.displayName,
                        email: result.user.email,
                        photoURL: result.user.photoURL
                    });
                }
            }
            await refreshUserProfile();
        } catch (error: any) {
            setAuthError(error.message);
        }
    };

    const logout = async () => {
        if (!auth) return;
        await firebaseAuth.signOut(auth);
        setUser(null);
    };

    const banUser = async (userId: string, status: 'active' | 'banned') => {
        if (!db) return;
        await updateDoc(doc(db, 'users', userId), { status });
    };

    const deleteUserProfile = async (userId: string, email: string) => {
        if (!db) return;
        if (email) await deleteDoc(doc(db, 'users_public', email.toLowerCase()));
        await deleteDoc(doc(db, 'users', userId));
    };

    const updateUserRole = async (userId: string, role: 'user' | 'admin_l1' | 'admin_l2') => {
        if (!db) return;
        await updateDoc(doc(db, 'users', userId), { role });
    };

    const sendAdminInvite = async (identifier: string, permissions: AdminPermissions) => {
        if (!db || !user) return { success: false, message: 'Erro interno.' };
        const cleanId = identifier.trim().toLowerCase();
        await addDoc(collection(db, 'admin_invites'), { 
            fromUid: user.uid, fromName: user.displayName, toIdentifier: cleanId, 
            permissions, status: 'pending', createdAt: serverTimestamp() 
        });
        return { success: true, message: `Convite enviado para ${cleanId}` };
    };

    const cancelAdminInvite = async (inviteId: string) => {
        if (!db) return;
        await deleteDoc(doc(db, 'admin_invites', inviteId));
    };

    const respondToAdminInvite = async (inviteId: string, accept: boolean) => {
        if (!db || !user) return;
        const inviteRef = doc(db, 'admin_invites', inviteId);
        if (accept) {
            const inviteSnap = await getDoc(inviteRef);
            if (inviteSnap.exists()) {
                const data = inviteSnap.data();
                await updateDoc(doc(db, 'users', user.uid), { 
                    role: 'admin_l2', 
                    permissions: data.permissions 
                });
            }
        }
        await updateDoc(inviteRef, { status: accept ? 'accepted' : 'rejected' });
        await refreshUserProfile();
    };

    // FIX: Implement updateDietaryPreferences
    const updateDietaryPreferences = async (prefs: string[]) => {
        if (!auth?.currentUser || !db) return;
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { dietaryPreferences: prefs });
        await refreshUserProfile();
    };

    const value = { 
        user, isAuthLoading, authError, authErrorCode, login, loginWithEmail, registerWithEmail, resetPassword, updateUserProfile, updateUserPassword, updateUsername, removeProfilePhoto, deleteAccount, logout, setAuthError, clearAuthError: () => setAuthError(null), checkUsernameUniqueness, pendingAdminInvite, sendAdminInvite, cancelAdminInvite, respondToAdminInvite, refreshUserProfile,
        banUser, deleteUserProfile, updateUserRole, updateDietaryPreferences
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
