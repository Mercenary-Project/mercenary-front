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

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const buildApiUrl = (path: string) => {
    const normalizedPath = normalizePath(path);

    if (/^https?:\/\//i.test(normalizedPath) || !API_BASE_URL) {
        return normalizedPath;
    }

    return `${API_BASE_URL}${normalizedPath}`;
};

export const DEV_LOGIN_ENDPOINT = buildApiUrl(import.meta.env.VITE_DEV_LOGIN_ENDPOINT || '/api/auth/dev-login');
