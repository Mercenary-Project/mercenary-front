export interface ApiEnvelope<T> {
    code?: string | number;
    message?: string;
    data?: T | null;
}

export interface ApplicationSummary {
    applicationId: number;
    applicantId: number;
    applicantNickname: string;
    status: 'READY' | 'APPROVED' | 'REJECTED';
    createdAt: string;
}

export interface MatchSummary {
    id?: number;
    matchId?: number;
    title: string;
    content?: string;
    placeName?: string;
    addressName?: string;
    matchDate: string;
    currentPlayerCount?: number;
    maxPlayerCount?: number;
    writerId?: number;
    writerName?: string;
    writerNickname?: string;
    status?: string;
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
    });
};

export const formatReviewStatus = (status: ApplicationSummary['status']) => {
    switch (status) {
        case 'READY':
            return '대기 중';
        case 'APPROVED':
            return '승인 완료';
        case 'REJECTED':
            return '거절됨';
        default:
            return status;
    }
};
