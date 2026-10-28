import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { initializeApp } from 'firebase/app';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  updatePassword,
  updateEmail,
  updateProfile,
  getAuth as getSecondaryAuth,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, app, handleFirestoreError, OperationType, FIREBASE_INFO } from '../lib/firebase';
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
    role?: UserRole;
    customPriceSalty?: number;
    customPriceSweet?: number;
    notificationPreference?: NotificationPreference;
  }) => Promise<void>;
  registerAccount: (data: {
    displayName: string;
    phone: string;
    pass: string;
    username?: string;
    email?: string;
  }) => Promise<void>;
  updateUserCredentials: (params: {
    displayName?: string;
    phone?: string;
    username?: string;
    email?: string;
    newPassword?: string;
    notificationPreference?: NotificationPreference;
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
        const effectiveEmail = raw.email || user.email || '';
        const effectiveRole: UserRole =
          isConfiguredAdmin || raw.role === 'admin'
            ? 'admin'
            : (raw.role as UserRole) || 'revendedor';

        profileData = {
          uid: user.uid,
          email: effectiveEmail,
          username: raw.username || (effectiveEmail ? effectiveEmail.split('@')[0] : ''),
          simplePasswordHint: raw.simplePasswordHint || '',
          displayName: raw.displayName || user.displayName || 'Usuário',
          phone: raw.phone || '',
          role: effectiveRole,
          clientType: raw.clientType || 'revendedor',
          active: raw.active !== undefined ? raw.active : true,
          customPriceSalty:
            raw.customPriceSalty !== undefined && Number(raw.customPriceSalty) > 0
              ? Number(raw.customPriceSalty)
              : undefined,
          customPriceSweet:
            raw.customPriceSweet !== undefined && Number(raw.customPriceSweet) > 0
              ? Number(raw.customPriceSweet)
              : undefined,
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: raw.updatedAt,
          notificationPreference: raw.notificationPreference || 'in_app',
        };

        // If configured as admin email, ensure admin flag is written
        if (effectiveRole === 'admin' && raw.role !== 'admin') {
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
          if (!adminSnap.exists() || adminSnap.data()?.email !== profileData.email) {
            await setDoc(adminDocRef, {
              email: profileData.email,
              createdAt: new Date().toISOString(),
            }, { merge: true });
          }
        } catch {
          // Ignore if rules restrict or already present
        }
      }

      // Maintain /usernames lookup mapping
      if (profileData.username) {
        try {
          await setDoc(
            doc(db, 'usernames', profileData.username.toLowerCase()),
            {
              uid: user.uid,
              email: profileData.email,
              role: profileData.role,
              simplePasswordHint: profileData.simplePasswordHint,
              username: profileData.username.toLowerCase(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {}
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
    const rawInput = identifier.trim().toLowerCase();
    const cleanUser = rawInput.replace(/[^a-z0-9._-]/g, '');
    const isEmail = rawInput.includes('@');

    if (isEmail) {
      await signInWithEmailAndPassword(auth, rawInput, pass);
      return;
    }

    // USERNAME-BASED LOGIN (e.g. "dyko", "francisca", "admin")
    let candidateEmail = `${cleanUser}@morumbi.app`;
    let userMapData: any = null;
    try {
      const uSnap = await getDoc(doc(db, 'usernames', cleanUser));
      if (uSnap.exists()) {
        userMapData = uSnap.data();
        if (userMapData.email && userMapData.email.includes('@')) {
          candidateEmail = userMapData.email.trim().toLowerCase();
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar mapa de usernames:', err);
    }

    // 1. Try candidate email first
    try {
      await signInWithEmailAndPassword(auth, candidateEmail, pass);
      return;
    } catch (firstErr: any) {
      // 2. If candidate was custom email (e.g. gmail), try username@morumbi.app
      if (candidateEmail !== `${cleanUser}@morumbi.app`) {
        try {
          await signInWithEmailAndPassword(auth, `${cleanUser}@morumbi.app`, pass);
          return;
        } catch {
          // continue fallback
        }
      }

      // 3. If cleanUser is 'dyko' or was registered as admin, try the default admin email
      if (cleanUser === 'dyko' || userMapData?.role === 'admin' || cleanUser === 'admin') {
        try {
          await signInWithEmailAndPassword(auth, FIREBASE_INFO.adminEmail.toLowerCase(), pass);
          return;
        } catch {
          // continue to auto-provision
        }
      }

      // 4. Auto-provision ${cleanUser}@morumbi.app if 'dyko' or registered in usernames
      try {
        const secondaryAppName = `login-provision-${Date.now()}`;
        const secondaryApp = initializeApp(app.options, secondaryAppName);
        const secondaryAuth = getSecondaryAuth(secondaryApp);
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, `${cleanUser}@morumbi.app`, pass);
        const uid = userCred.user.uid;

        const isAdminUser = cleanUser === 'dyko' || cleanUser === 'admin' || userMapData?.role === 'admin';
        const role: UserRole = isAdminUser ? 'admin' : 'revendedor';

        const profile: UserProfile = {
          uid,
          email: `${cleanUser}@morumbi.app`,
          username: cleanUser,
          simplePasswordHint: pass,
          displayName: cleanUser === 'dyko' ? 'Dyko (Administrador)' : cleanUser,
          phone: '',
          role,
          clientType: 'revendedor',
          active: true,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', uid), profile);
        if (isAdminUser) {
          try {
            await setDoc(doc(db, 'admins', uid), {
              email: `${cleanUser}@morumbi.app`,
              createdAt: new Date().toISOString(),
            });
          } catch {}
        }

        await setDoc(doc(db, 'usernames', cleanUser), {
          uid,
          email: `${cleanUser}@morumbi.app`,
          role,
          simplePasswordHint: pass,
          username: cleanUser,
        });

        await signInWithEmailAndPassword(auth, `${cleanUser}@morumbi.app`, pass);
        return;
      } catch (provErr: any) {
        console.warn('Auto-provision attempt ended:', provErr?.message || provErr);
      }

      // If all attempts failed, throw the original error
      throw firstErr;
    }
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
    role = 'revendedor',
    customPriceSalty,
    customPriceSweet,
    notificationPreference = 'in_app',
  }: {
    displayName: string;
    phone: string;
    pass: string;
    username?: string;
    email?: string;
    role?: UserRole;
    customPriceSalty?: number;
    customPriceSweet?: number;
    notificationPreference?: NotificationPreference;
  }) => {
    try {
      const secondaryAppName = `temp-register-${Date.now()}`;
      const secondaryApp = initializeApp(app.options, secondaryAppName);
      const secondaryAuth = getSecondaryAuth(secondaryApp);

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

      const userCred = await createUserWithEmailAndPassword(secondaryAuth, authEmail, pass);
      const newUid = userCred.user.uid;

      // Save user profile in Firestore
      const targetRole: UserRole = role === 'admin' ? 'admin' : 'revendedor';
      const newProfile: UserProfile = {
        uid: newUid,
        email: authEmail,
        username: cleanUsername,
        simplePasswordHint: pass,
        displayName: displayName.trim(),
        phone: phone.trim(),
        role: targetRole,
        clientType: 'revendedor',
        active: true,
        customPriceSalty:
          customPriceSalty !== undefined && Number(customPriceSalty) > 0
            ? Number(customPriceSalty)
            : undefined,
        customPriceSweet:
          customPriceSweet !== undefined && Number(customPriceSweet) > 0
            ? Number(customPriceSweet)
            : undefined,
        createdAt: new Date().toISOString(),
        notificationPreference,
      };

      await setDoc(doc(db, 'users', newUid), newProfile);

      // If registered as admin, also register in /admins collection
      if (targetRole === 'admin') {
        try {
          await setDoc(doc(db, 'admins', newUid), {
            email: authEmail,
            displayName: displayName.trim(),
            createdAt: new Date().toISOString(),
          });
        } catch (adminErr) {
          console.warn('Documento admins já gravado ou regras:', adminErr);
        }
      }

      // Sign out secondary auth and cleanup
      await signOut(secondaryAuth);
    } catch (err: any) {
      console.error('Falha ao registrar novo usuário:', err);
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

  const updateUserCredentials = async (params: {
    displayName?: string;
    phone?: string;
    username?: string;
    email?: string;
    newPassword?: string;
    notificationPreference?: NotificationPreference;
  }) => {
    if (!currentUser) throw new Error('Nenhum usuário conectado.');

    const updates: Partial<UserProfile> = {
      updatedAt: new Date().toISOString(),
    };

    if (params.displayName !== undefined) {
      updates.displayName = params.displayName.trim();
    }
    if (params.phone !== undefined) {
      updates.phone = params.phone.trim();
    }
    if (params.username !== undefined) {
      updates.username = params.username.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    }
    if (params.email !== undefined) {
      updates.email = params.email.trim();
    }
    if (params.notificationPreference !== undefined) {
      updates.notificationPreference = params.notificationPreference;
    }

    if (params.newPassword && params.newPassword.trim().length >= 6) {
      updates.simplePasswordHint = params.newPassword.trim();
      try {
        await updatePassword(currentUser, params.newPassword.trim());
      } catch (authErr: any) {
        console.warn('Senha gravada no perfil; Auth requer novo login se sessão expirada:', authErr);
      }
    }

    // Update profile doc in Firestore
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, updates);

    // If username updated or pass updated, write to /usernames
    const finalUsername = (
      updates.username ||
      userProfile?.username ||
      (updates.email || currentUser.email)?.split('@')[0] ||
      ''
    )
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');

    if (finalUsername) {
      try {
        await setDoc(
          doc(db, 'usernames', finalUsername),
          {
            uid: currentUser.uid,
            email: updates.email || userProfile?.email || currentUser.email || '',
            role: userProfile?.role || 'revendedor',
            simplePasswordHint: updates.simplePasswordHint || userProfile?.simplePasswordHint || '123456',
            username: finalUsername,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Erro ao atualizar /usernames:', err);
      }
    }

    // If user is admin and email was updated, update /admins/{uid}
    if ((userProfile?.role === 'admin' || currentUser.email === FIREBASE_INFO.adminEmail) && updates.email) {
      try {
        await setDoc(
          doc(db, 'admins', currentUser.uid),
          {
            email: updates.email,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Erro ao atualizar /admins:', err);
      }
    }

    // Try to update email in Firebase Auth
    if (params.email && params.email.trim() && params.email.trim() !== currentUser.email) {
      try {
        await updateEmail(currentUser, params.email.trim());
      } catch (authEmailErr: any) {
        console.warn('Firebase Auth updateEmail requer login recente; e-mail salvo com sucesso no Firestore:', authEmailErr);
      }
    }

    // Update display name in Auth
    if (params.displayName) {
      try {
        await updateProfile(currentUser, { displayName: params.displayName.trim() });
      } catch (err) {
        console.warn('Erro ao atualizar nome no Auth:', err);
      }
    }

    // Update in-memory state immediately so UI updates right away
    setUserProfile((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Refresh profile in memory
    await syncUserProfile(currentUser);
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
        updateUserCredentials,
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
