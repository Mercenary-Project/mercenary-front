import { createContext } from 'react';

export interface AuthUser {
    userId: number | undefined;
    nickname: string | undefined;
}

export interface AuthContextValue {
    token: string | null;
    user: AuthUser | null;
    isAuthenticated: boolean;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
