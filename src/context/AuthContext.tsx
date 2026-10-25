import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, FIREBASE_INFO } from '../lib/firebase';
import { UserProfile, UserRole, NotificationPreference } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  registerNewReseller: (data: {
    displayName: string;
    phone: string;
    pass: string;
    username?: string;
    email?: string;
    notificationPreference?: NotificationPreference;
  }) => Promise<void>;
  registerAccount: (data: {
    displayName: string;
    phone: string;
    pass: string;
    username?: string;
    email?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_PROFILE_KEY = 'morumbi_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
        return cached ? JSON.parse(cached) : null;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync profile & role
  const syncUserProfile = async (user: User) => {
    try {
      const isConfiguredAdmin =
        user.email?.toLowerCase().trim() === FIREBASE_INFO.adminEmail.toLowerCase().trim();

      const userDocRef = doc(db, 'users', user.uid);
      const adminDocRef = doc(db, 'admins', user.uid);

      let docSnap;
      try {
        docSnap = await getDoc(userDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      let profileData: UserProfile;

      if (docSnap && docSnap.exists()) {
        const raw = docSnap.data();
        profileData = {
          uid: user.uid,
          email: user.email || '',
          username: raw.username || (user.email ? user.email.split('@')[0] : ''),
          simplePasswordHint: raw.simplePasswordHint || '',
          displayName: raw.displayName || user.displayName || 'Usuário',
          phone: raw.phone || '',
          role: isConfiguredAdmin ? 'admin' : (raw.role as UserRole) || 'revendedor',
          clientType: raw.clientType || 'revendedor',
          active: raw.active !== undefined ? raw.active : true,
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: raw.updatedAt,
          notificationPreference: raw.notificationPreference || 'in_app',
        };

        // If configured as admin email, ensure admin flag is written
        if (isConfiguredAdmin && raw.role !== 'admin') {
          await updateDoc(userDocRef, { role: 'admin' });
        }
      } else {
        // Document does not exist yet (e.g. first login with Google)
        const cleanUsername = user.email
          ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '')
          : (user.displayName || 'usuario').toLowerCase().replace(/[^a-z0-9._-]/g, '');

        profileData = {
          uid: user.uid,
          email: user.email || '',
          username: cleanUsername,
          displayName: user.displayName || (isConfiguredAdmin ? 'Administrador Morumbi' : 'Revendedor'),
          phone: user.phoneNumber || '',
          role: isConfiguredAdmin ? 'admin' : 'revendedor',
          clientType: 'revendedor',
          active: true,
          createdAt: new Date().toISOString(),
          notificationPreference: 'in_app',
        };

        try {
          await setDoc(userDocRef, profileData);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }

      // If user is admin, guarantee entry in /admins/{uid}
      if (profileData.role === 'admin' || isConfiguredAdmin) {
        try {
          const adminSnap = await getDoc(adminDocRef);
          if (!adminSnap.exists()) {
            await setDoc(adminDocRef, {
              email: user.email,
              createdAt: new Date().toISOString(),
            });
          }
        } catch {
          // Ignore if rules restrict or already present
        }
      }

      setUserProfile(profileData);
      try {
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profileData));
      } catch {}
    } catch (error) {
      console.error('Erro ao sincronizar perfil:', error);
      // Fallback local profile if offline or rules block
      const isConfiguredAdmin =
        user.email?.toLowerCase().trim() === FIREBASE_INFO.adminEmail.toLowerCase().trim();
      const fallback: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (isConfiguredAdmin ? 'Administrador' : 'Revendedor'),
        phone: '',
        role: isConfiguredAdmin ? 'admin' : 'revendedor',
        active: true,
        createdAt: new Date().toISOString(),
      };
      setUserProfile(fallback);
      try {
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(fallback));
      } catch {}
    }
  };

  useEffect(() => {
    // Check if returning from a mobile redirect login
    import('firebase/auth').then(({ getRedirectResult }) => {
      getRedirectResult(auth).catch((err) => {
        if (err?.code !== 'auth/popup-closed-by-user') {
          console.log('Redirect result:', err?.message || err);
        }
      });
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncUserProfile(user);
      } else {
        setUserProfile(null);
        try {
          localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
        } catch {}
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (identifier: string, pass: string) => {
    let emailToUse = identifier.trim().toLowerCase();
    if (!emailToUse.includes('@')) {
      // Username entry (e.g. "carlos" or "joao")
      const cleanUser = emailToUse.replace(/[^a-z0-9._-]/g, '');
      emailToUse = `${cleanUser}@morumbi.app`;
    }
    await signInWithEmailAndPassword(auth, emailToUse, pass);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
        const { signInWithRedirect } = await import('firebase/auth');
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  };

  const registerNewReseller = async ({
    displayName,
    phone,
    pass,
    username,
    email,
    notificationPreference = 'in_app',
  }: {
    displayName: string;
    phone: string;
    pass: string;
    username?: string;
    email?: string;
    notificationPreference?: NotificationPreference;
  }) => {
    try {
      const { initializeApp } = await import('firebase/app');
      const { getAuth: getSecondaryAuth } = await import('firebase/auth');
      const config = (await import('../../firebase-applet-config.json')).default;
      const secondaryAppName = `temp-register-${Date.now()}`;
      const secondaryApp = initializeApp(config, secondaryAppName);
      const secondaryAuth = getSecondaryAuth(secondaryApp);

      // Generate or clean username (lowercase alphanumeric, dot, dash)
      const rawUser =
        username && username.trim().length > 0
          ? username.trim()
          : displayName.trim().toLowerCase().split(' ')[0];
      const cleanUsername = rawUser.toLowerCase().replace(/[^a-z0-9._-]/g, '') || `user${Date.now().toString().slice(-4)}`;

      // Determine Auth Email: if email provided use it, otherwise use username@morumbi.app
      const authEmail =
        email && email.includes('@')
          ? email.trim().toLowerCase()
          : `${cleanUsername}@morumbi.app`;

      const userCred = await createUserWithEmailAndPassword(secondaryAuth, authEmail, pass);
      const newUid = userCred.user.uid;

      // Save user profile in Firestore
      const newProfile: UserProfile = {
        uid: newUid,
        email: authEmail,
        username: cleanUsername,
        simplePasswordHint: pass,
        displayName: displayName.trim(),
        phone: phone.trim(),
        role: 'revendedor',
        clientType: 'revendedor',
        active: true,
        createdAt: new Date().toISOString(),
        notificationPreference,
      };

      await setDoc(doc(db, 'users', newUid), newProfile);

      // Sign out secondary auth and cleanup
      await signOut(secondaryAuth);
    } catch (err: any) {
      console.error('Falha ao registrar novo revendedor:', err);
      throw err;
    }
  };

  // Direct self-registration for new resellers / clients
  const registerAccount = async ({
    displayName,
    phone,
    pass,
    username,
    email,
  }: {
    displayName: string;
    phone: string;
    pass: string;
    username?: string;
    email?: string;
  }) => {
    // Generate or clean username (lowercase alphanumeric, dot, dash)
    const rawUser =
      username && username.trim().length > 0
        ? username.trim()
        : displayName.trim().toLowerCase().split(' ')[0];
    const cleanUsername =
      rawUser.toLowerCase().replace(/[^a-z0-9._-]/g, '') || `user${Date.now().toString().slice(-4)}`;

    // Determine Auth Email: if email provided use it, otherwise use username@morumbi.app
    const authEmail =
      email && email.includes('@')
        ? email.trim().toLowerCase()
        : `${cleanUsername}@morumbi.app`;

    const userCred = await createUserWithEmailAndPassword(auth, authEmail, pass);
    const newUid = userCred.user.uid;

    const newProfile: UserProfile = {
      uid: newUid,
      email: authEmail,
      username: cleanUsername,
      simplePasswordHint: pass,
      displayName: displayName.trim(),
      phone: phone.trim(),
      role: 'revendedor',
      clientType: 'revendedor',
      active: true,
      createdAt: new Date().toISOString(),
      notificationPreference: 'in_app',
    };

    await setDoc(doc(db, 'users', newUid), newProfile);
    setUserProfile(newProfile);
    try {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(newProfile));
    } catch {}
    setCurrentUser(userCred.user);
  };

  const logout = async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    } catch {}
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await syncUserProfile(currentUser);
    }
  };

  const isAdmin =
    userProfile?.role === 'admin' ||
    currentUser?.email?.toLowerCase().trim() === FIREBASE_INFO.adminEmail.toLowerCase().trim();

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        isLoading,
        login,
        registerNewReseller,
        registerAccount,
        logout,
        resetPassword,
        loginWithGoogle,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
