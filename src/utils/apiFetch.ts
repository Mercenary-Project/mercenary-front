import { getAccessToken, handleExpiredToken } from './auth';

export const apiFetch = async (url: string, options?: RequestInit): Promise<Response> => {
    const token = getAccessToken();
    const headers = new Headers(options?.headers);

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        const payload = await response.clone().json().catch(() => null);
        handleExpiredToken(payload);
    }

    return response;
};
