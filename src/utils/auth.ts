const ACCESS_TOKEN_KEY = 'accessToken';
const AUTH_CHANGED_EVENT = 'auth-changed';
const AUTH_EXPIRED_REDIRECT_FLAG = 'auth-expired-redirecting';

const normalizeToken = (value: string | null) => {
    if (!value) {
        return null;
    }

    if (value === 'undefined' || value === 'null') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};

const dispatchAuthChanged = () => {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const getAccessToken = () => normalizeToken(localStorage.getItem(ACCESS_TOKEN_KEY));

export const isAuthenticated = () => Boolean(getAccessToken());

export const setAccessToken = (token: string) => {
    const normalizedToken = normalizeToken(token);

    if (!normalizedToken) {
        throw new Error('accessToken is empty');
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, normalizedToken);
    dispatchAuthChanged();
};

export const clearAccessToken = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    dispatchAuthChanged();
};

const extractPayloadMessage = (payload: unknown) => {
    if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
        return payload.message;
    }

    return '';
};

const isExpiredTokenMessage = (message: string) => {
    const normalized = message.trim().toLowerCase();

    if (!normalized) {
        return false;
    }

    return (
        (normalized.includes('token') || normalized.includes('토큰') || normalized.includes('jwt')) &&
        (normalized.includes('expired') || normalized.includes('expire') || normalized.includes('만료'))
    );
};

export const handleExpiredToken = (payload?: unknown) => {
    const message = extractPayloadMessage(payload);

    if (!isExpiredTokenMessage(message)) {
        return false;
    }

    clearAccessToken();

    if (typeof window !== 'undefined') {
        const isRedirecting = sessionStorage.getItem(AUTH_EXPIRED_REDIRECT_FLAG) === 'true';

        if (!isRedirecting) {
            sessionStorage.setItem(AUTH_EXPIRED_REDIRECT_FLAG, 'true');
            window.alert('로그인이 만료되었습니다. 다시 로그인해 주세요.');
            window.location.replace('/login');
            window.setTimeout(() => {
                sessionStorage.removeItem(AUTH_EXPIRED_REDIRECT_FLAG);
            }, 1000);
        }
    }

    return true;
};

export const subscribeAuthChange = (listener: () => void) => {
    window.addEventListener(AUTH_CHANGED_EVENT, listener);
    window.addEventListener('storage', listener);

    return () => {
        window.removeEventListener(AUTH_CHANGED_EVENT, listener);
        window.removeEventListener('storage', listener);
    };
};

export const extractAccessToken = (payload: unknown): string | null => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const directToken = (payload as { accessToken?: unknown }).accessToken;
    if (typeof directToken === 'string' && directToken.length > 0) {
        return normalizeToken(directToken);
    }

    const data = (payload as { data?: unknown }).data;
    if (data && typeof data === 'object') {
        const nestedToken = (data as { accessToken?: unknown }).accessToken;
        if (typeof nestedToken === 'string' && nestedToken.length > 0) {
            return normalizeToken(nestedToken);
        }
    }

    return null;
};
