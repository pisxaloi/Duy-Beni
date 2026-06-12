import { useState, useEffect } from "react";
import { auth } from "./lib/firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    try {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return { user, isAuthLoading, login, logout };
}

interface AuthSistemiProps {
  onLogin: () => void;
}

const AuthSistemi: React.FC<AuthSistemiProps> = ({ onLogin }) => {
  return (
    <div className="flex items-center justify-center w-full h-full bg-black text-white p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-gray-800">
        <h1 className="text-3xl font-bold text-amber-400 mb-3">Mısır Uygarlığı</h1>
        <p className="text-sm text-gray-400 mb-6">Antik Mısır'ın gizemli dünyasına hoş geldiniz.</p>
        <button
          onClick={onLogin}
          className="bg-amber-700 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-colors w-full"
        >
          Google ile Giriş Yap
        </button>
      </div>
    </div>
  );
};

export default AuthSistemi;
