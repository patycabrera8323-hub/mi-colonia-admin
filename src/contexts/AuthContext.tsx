import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface UserData {
  email: string;
  name: string;
  phone: string;
  payment_verified: boolean;
  role: string;
  createdAt: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  isAdmin: false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists()) {
            setUserData(userSnap.data() as UserData);
          } else {
            setUserData(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Super Admin permanente — solo este correo tiene acceso total
  const isAdmin = user?.email?.toLowerCase() === 'jicr109@gmail.com';

  return (
    <AuthContext.Provider value={{ user, userData, isAdmin, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
