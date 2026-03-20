const normalizePath = (path: string) => {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return path.startsWith('/') ? path : `/${path}`;
};

const normalizeBaseUrl = (value: string | undefined) => {
    const trimmed = value?.trim() ?? '';

    if (!trimmed) {
        return '';
    }

    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const getBrowserOrigin = () => (typeof window === 'undefined' ? '' : window.location.origin);

const normalizeEnvValue = (value: string | undefined) => {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : '';
};

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const buildApiUrl = (path: string) => {
    const normalizedPath = normalizePath(path);

    if (/^https?:\/\//i.test(normalizedPath) || !API_BASE_URL) {
        return normalizedPath;
    }

    return `${API_BASE_URL}${normalizedPath}`;
};

export const DEV_LOGIN_ENDPOINT = buildApiUrl(import.meta.env.VITE_DEV_LOGIN_ENDPOINT || '/api/auth/dev-login');
export const KAKAO_CODE_EXCHANGE_ENDPOINT = buildApiUrl(
    import.meta.env.VITE_KAKAO_CODE_EXCHANGE_ENDPOINT || '/api/auth/kakao',
);

const createKakaoAuthorizeUrl = (clientId: string, redirectUri: string) => {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
    });

    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
};

export const KAKAO_LOGIN_URL = (() => {
    const explicitLoginUrl = normalizeEnvValue(import.meta.env.VITE_KAKAO_LOGIN_URL);

    if (explicitLoginUrl) {
        return buildApiUrl(explicitLoginUrl);
    }

    const restApiKey = normalizeEnvValue(import.meta.env.VITE_KAKAO_REST_API_KEY);
    const redirectUri = normalizeEnvValue(import.meta.env.VITE_KAKAO_REDIRECT_URI) || `${getBrowserOrigin()}/login/callback`;

    if (!restApiKey || !redirectUri) {
        return '';
    }

    return createKakaoAuthorizeUrl(restApiKey, redirectUri);
})();
