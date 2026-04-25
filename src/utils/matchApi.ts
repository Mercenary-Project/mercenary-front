import { buildApiUrl } from './api';
import { apiFetch } from './apiFetch';
import type { Position, PositionSlot } from '../types/match';

export type ApplicationDecisionStatus = 'READY' | 'APPROVED' | 'REJECTED' | 'CANCELED';

export interface ApiEnvelope<T> {
    code?: string | number;
    message?: string;
    data?: T | null;
}

export interface ApplicationSummary {
    applicationId: number;
    applicantId: number;
    applicantNickname: string;
    status: ApplicationDecisionStatus;
    createdAt: string;
}

export interface MatchSummary {
    id?: number;
    matchId?: number;
    title: string;
    content?: string;
    placeName?: string;
    district?: string;
    fullAddress?: string;
    addressName?: string;
    latitude?: number;
    longitude?: number;
    matchDate: string;
    slots?: PositionSlot[];
    isFullyBooked?: boolean;
    writerId?: number;
    writerName?: string;
    writerNickname?: string;
    status?: string;
}

export interface AppliedMatchSummary {
    applicationId: number;
    matchId: number;
    title: string;
    matchDate: string;
    placeName?: string;
    status: ApplicationDecisionStatus;
    slots?: PositionSlot[];
    isFullyBooked?: boolean;
    writerName?: string;
}

export const extractResponseData = <T,>(payload: ApiEnvelope<T> | T | null): T | null => {
    if (!payload) {
        return null;
    }

    if (typeof payload === 'object' && 'data' in (payload as ApiEnvelope<T>)) {
        return ((payload as ApiEnvelope<T>).data ?? null) as T | null;
    }

    return payload as T;
};

export const extractResponseMessage = (payload: unknown, fallback: string) => {
    if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
        return payload.message;
    }

    return fallback;
};

export const formatDateTime = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Seoul',
    });
};

export const formatDateTimeLocalValue = (value: string) => {
    if (!value) {
        return '';
    }

    const normalized = value.trim();

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
        return normalized;
    }

    const normalizedWithT = normalized.replace(' ', 'T');
    const match = normalizedWithT.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);

    if (match) {
        return match[1];
    }

    return normalizedWithT.slice(0, 16);
};

export const isPastMatch = (matchDate: string) => {
    const date = new Date(matchDate);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    return date.getTime() < Date.now();
};

export const isMatchFull = (currentPlayerCount?: number, maxPlayerCount?: number) => {
    if (typeof currentPlayerCount !== 'number' || typeof maxPlayerCount !== 'number') {
        return false;
    }

    return currentPlayerCount >= maxPlayerCount;
};

export const applyToMatch = async (matchId: number, position: Position): Promise<void> => {
    const response = await apiFetch(buildApiUrl(`/api/applications/${matchId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(extractResponseMessage(payload, '참가 신청에 실패했습니다.'));
    }
};

export const formatReviewStatus = (status: ApplicationDecisionStatus) => {
    switch (status) {
        case 'READY':
            return '대기 중';
        case 'APPROVED':
            return '승인 완료';
        case 'REJECTED':
            return '거절됨';
        case 'CANCELED':
            return '취소됨';
        default:
            return status;
    }
};
