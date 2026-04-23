import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearAccessToken, getAccessToken, subscribeAuthChange } from '../utils/auth';

interface RawTokenClaims {
    userId?: number;
    memberId?: number;
    id?: number;
    sub?: string;
    nickname?: string;
    name?: string;
}

export interface AuthUser {
    userId: number | undefined;
    nickname: string | undefined;
}

interface AuthContextValue {
    token: string | null;
    user: AuthUser | null;
    isAuthenticated: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const decodeTokenClaims = (token: string | null): RawTokenClaims | null => {
    if (!token) return null;
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        return JSON.parse(atob(padded)) as RawTokenClaims;
    } catch {
        return null;
    }
};

const buildAuthUser = (claims: RawTokenClaims | null): AuthUser | null => {
    if (!claims) return null;
    const userId =
        claims.userId ??
        claims.memberId ??
        claims.id ??
        (claims.sub && /^\d+$/.test(claims.sub) ? Number(claims.sub) : undefined);
    const nickname = claims.nickname ?? claims.name ?? claims.sub;
    return { userId, nickname };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => getAccessToken());

    useEffect(() => {
        return subscribeAuthChange(() => setToken(getAccessToken()));
    }, []);

    const user = buildAuthUser(decodeTokenClaims(token));
    const isAuthenticated = Boolean(token);
    const logout = () => clearAccessToken();

    return (
        <AuthContext.Provider value={{ token, user, isAuthenticated, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
