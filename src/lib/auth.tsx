import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to the user document in Firestore to stay synced with active/role status
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.active) {
               setUser({ uid: firebaseUser.uid, ...userData } as User);
            } else {
               // User is not active, treat as logged out internally
               setUser(null);
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
          setUser(null);
          setLoading(false);
        });
        
        return () => {
          unsubscribeDoc();
        };
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signOut = async () => {
    if (isFirebaseConfigured) {
      await firebaseSignOut(auth);
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="flex flex-col h-screen w-full font-sans bg-slate-100 text-slate-900 items-center justify-center p-4" style={{ backgroundImage: 'radial-gradient(at 0% 0%, hsla(210,100%,90%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(220,100%,85%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(200,100%,90%,1) 0, transparent 50%)' }}>
        <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-xl shadow-slate-200/50 max-w-md w-full border border-white/40 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-tight">Thiếu cấu hình Firebase</h2>
          <p className="text-sm font-medium text-slate-600 mb-6">
            Ứng dụng chưa được cung cấp thông tin kết nối Database. Vui lòng thêm các biến <strong>VITE_FIREBASE_API_KEY</strong> trong phần cài đặt (Secrets) để tiếp tục.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

