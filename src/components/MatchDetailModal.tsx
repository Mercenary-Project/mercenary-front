import React, { useEffect, useState } from 'react';

interface MatchDetailModalProps {
    matchId: number;
    onClose: () => void;
}

interface MatchDetailDto {
    matchId: number;
    title: string;
    content: string;
    matchDate: string;
    placeName: string;
    addressName?: string;
    currentPlayerCount: number;
    maxPlayerCount: number;
    writerId?: number;
    writerName?: string;
    writerNickname?: string;
    status?: string;
}

type MyApplicationStatus = {
    applied: boolean;
    status: 'READY' | 'APPROVED' | 'REJECTED' | null;
    applicationId: number | null;
};

type ApplicationSummary = {
    applicationId: number;
    applicantId: number;
    applicantNickname: string;
    status: 'READY' | 'APPROVED' | 'REJECTED';
    createdAt: string;
};

interface ApiEnvelope<T> {
    data?: T;
    message?: string;
}

interface TokenClaims {
    userId?: number;
    memberId?: number;
    id?: number;
    sub?: string;
    nickname?: string;
    name?: string;
}

const DEFAULT_APPLICATION_STATUS: MyApplicationStatus = {
    applied: false,
    status: null,
    applicationId: null,
};

const decodeAccessToken = (token: string | null): TokenClaims | null => {
    if (!token) {
        return null;
    }

    try {
        const [, payload] = token.split('.');

        if (!payload) {
            return null;
        }

        const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
        const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
        const decodedPayload = atob(paddedPayload);

        return JSON.parse(decodedPayload) as TokenClaims;
    } catch (error) {
        console.error('Failed to decode access token.', error);
        return null;
    }
};

const extractResponseData = <T,>(payload: ApiEnvelope<T> | T): T => {
    if (payload && typeof payload === 'object' && 'data' in (payload as ApiEnvelope<T>)) {
        const wrapped = payload as ApiEnvelope<T>;
        return (wrapped.data ?? payload) as T;
    }

    return payload as T;
};

const formatApplicationStatus = (status: MyApplicationStatus['status']) => {
    switch (status) {
        case 'READY':
            return '신청 완료';
        case 'APPROVED':
            return '승인 완료';
        case 'REJECTED':
            return '거절됨';
        default:
            return '신청하기';
    }
};

const formatReviewStatus = (status: ApplicationSummary['status']) => {
    switch (status) {
        case 'READY':
            return '대기중';
        case 'APPROVED':
            return '승인됨';
        case 'REJECTED':
            return '거절됨';
        default:
            return status;
    }
};

const formatDateTime = (value: string) => {
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

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ matchId, onClose }) => {
    const [match, setMatch] = useState<MatchDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [myApplication, setMyApplication] = useState<MyApplicationStatus>(DEFAULT_APPLICATION_STATUS);
    const [isStatusLoading, setIsStatusLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isApplicationsOpen, setIsApplicationsOpen] = useState(false);
    const [applications, setApplications] = useState<ApplicationSummary[]>([]);
    const [applicationsError, setApplicationsError] = useState<string | null>(null);
    const [isApplicationsLoading, setIsApplicationsLoading] = useState(false);
    const [processingApplicationId, setProcessingApplicationId] = useState<number | null>(null);

    const token = localStorage.getItem('accessToken');
    const claims = decodeAccessToken(token);
    const currentUserId =
        claims?.userId ??
        claims?.memberId ??
        claims?.id ??
        (claims?.sub && /^\d+$/.test(claims.sub) ? Number(claims.sub) : undefined);
    const currentNickname = claims?.nickname ?? claims?.name ?? claims?.sub;
    const isAuthor = Boolean(
        match &&
        (
            (typeof currentUserId === 'number' && typeof match.writerId === 'number' && currentUserId === match.writerId) ||
            (currentNickname && (currentNickname === match.writerNickname || currentNickname === match.writerName))
        )
    );

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            setDetailError(null);

            try {
                const response = await fetch(`/api/matches/${matchId}`);

                if (!response.ok) {
                    throw new Error('매치 상세 정보를 불러오지 못했습니다.');
                }

                const payload = await response.json();
                setMatch(extractResponseData<MatchDetailDto>(payload));
            } catch (error) {
                console.error(error);
                setDetailError(error instanceof Error ? error.message : '매치 상세 정보를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [matchId]);

    useEffect(() => {
        const fetchMyApplicationStatus = async () => {
            if (!token) {
                setMyApplication(DEFAULT_APPLICATION_STATUS);
                return;
            }

            setIsStatusLoading(true);

            try {
                const response = await fetch(`/api/matches/${matchId}/application/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('신청 상태를 불러오지 못했습니다.');
                }

                const payload = await response.json();
                setMyApplication(extractResponseData<MyApplicationStatus>(payload));
            } catch (error) {
                console.error(error);
                setMyApplication(DEFAULT_APPLICATION_STATUS);
            } finally {
                setIsStatusLoading(false);
            }
        };

        fetchMyApplicationStatus();
    }, [matchId, token]);

    const fetchApplications = async () => {
        if (!token) {
            setApplicationsError('로그인 후 신청자 목록을 확인할 수 있습니다.');
            return;
        }

        setIsApplicationsLoading(true);
        setApplicationsError(null);

        try {
            const response = await fetch(`/api/matches/${matchId}/applications`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('신청자 목록을 불러오지 못했습니다.');
            }

            const payload = await response.json();
            setApplications(extractResponseData<ApplicationSummary[]>(payload));
        } catch (error) {
            console.error(error);
            setApplicationsError(error instanceof Error ? error.message : '신청자 목록을 불러오지 못했습니다.');
        } finally {
            setIsApplicationsLoading(false);
        }
    };

    const handleOpenApplications = async () => {
        setIsApplicationsOpen(true);
        await fetchApplications();
    };

    const handleJoin = async () => {
        if (!match || isApplying) {
            return;
        }

        if (!token) {
            alert('로그인 후 참가 신청할 수 있습니다.');
            return;
        }

        if (myApplication.applied) {
            return;
        }

        if (!window.confirm(`'${match.title}' 경기에 참가 신청하시겠습니까?`)) {
            return;
        }

        setIsApplying(true);

        try {
            const response = await fetch(`/api/matches/${matchId}/apply`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const payload = await response.json().catch(() => null);
            const data = payload ? extractResponseData<MyApplicationStatus | { message?: string }>(payload) : null;

            if (!response.ok) {
                const message =
                    typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
                        ? data.message
                        : '참가 신청에 실패했습니다.';
                throw new Error(message);
            }

            if (data && typeof data === 'object' && 'applied' in data) {
                setMyApplication(data as MyApplicationStatus);
            } else {
                setMyApplication({
                    applied: true,
                    status: 'READY',
                    applicationId: null,
                });
            }

            alert('참가 신청이 완료되었습니다.');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '참가 신청 중 오류가 발생했습니다.');
        } finally {
            setIsApplying(false);
        }
    };

    const handleApplicationDecision = async (
        applicationId: number,
        status: 'APPROVED' | 'REJECTED',
    ) => {
        if (!token || processingApplicationId !== null) {
            return;
        }

        setProcessingApplicationId(applicationId);

        try {
            const response = await fetch(`/api/matches/${matchId}/applications/${applicationId}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                const message =
                    payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
                        ? payload.message
                        : '신청 상태 변경에 실패했습니다.';
                throw new Error(message);
            }

            setApplications((prev) =>
                prev.map((application) =>
                    application.applicationId === applicationId ? { ...application, status } : application,
                ),
            );
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '신청 상태 변경 중 오류가 발생했습니다.');
        } finally {
            setProcessingApplicationId(null);
        }
    };

    if (loading) {
        return null;
    }

    return (
        <>
            <div style={styles.overlay} onClick={onClose}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <button style={styles.closeBtn} onClick={onClose} aria-label="닫기">
                        X
                    </button>

                    {match && !detailError ? (
                        <>
                            <div style={styles.header}>
                                <h2 style={styles.title}>{match.title}</h2>
                                <span style={match.status === 'CLOSED' ? styles.badgeClosed : styles.badgeOpen}>
                                    {match.status === 'CLOSED' ? '마감' : '모집중'}
                                </span>
                            </div>

                            <div style={styles.infoList}>
                                <div style={styles.infoItem}>
                                    <span style={styles.icon}>일시</span>
                                    <span>{formatDateTime(match.matchDate)}</span>
                                </div>

                                <div style={styles.infoItem}>
                                    <span style={styles.icon}>장소</span>
                                    <div>
                                        <span style={{ fontWeight: 'bold' }}>{match.placeName}</span>
                                        {match.addressName ? <div>{match.addressName}</div> : null}
                                    </div>
                                </div>

                                <div style={styles.infoItem}>
                                    <span style={styles.icon}>인원</span>
                                    <span>
                                        현재 <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{match.currentPlayerCount}</span>명 /
                                        총 {match.maxPlayerCount}명
                                    </span>
                                </div>

                                {match.writerName || match.writerNickname ? (
                                    <div style={styles.infoItem}>
                                        <span style={styles.icon}>작성자</span>
                                        <span>{match.writerNickname || match.writerName}</span>
                                    </div>
                                ) : null}
                            </div>

                            <div style={styles.contentBox}>
                                <h4 style={styles.contentLabel}>상세 내용</h4>
                                <p style={styles.contentText}>{match.content || '상세 내용이 없습니다.'}</p>
                            </div>

                            <div style={styles.footer}>
                                {isAuthor ? (
                                    <button onClick={handleOpenApplications} style={styles.manageBtn}>
                                        신청자 목록 보기
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleJoin}
                                            style={{
                                                ...styles.joinBtn,
                                                backgroundColor: myApplication.applied ? '#94a3b8' : isApplying ? '#93c5fd' : '#3b82f6',
                                                cursor: myApplication.applied || isApplying ? 'not-allowed' : 'pointer',
                                            }}
                                            disabled={myApplication.applied || isApplying || isStatusLoading}
                                        >
                                            {isStatusLoading ? '상태 확인 중...' : isApplying ? '신청 처리 중...' : formatApplicationStatus(myApplication.status)}
                                        </button>
                                        {myApplication.applied ? (
                                            <p style={styles.applicationHint}>
                                                현재 상태: {formatApplicationStatus(myApplication.status)}
                                            </p>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={styles.emptyState}>{detailError || '정보를 불러오지 못했습니다.'}</div>
                    )}
                </div>
            </div>

            {isApplicationsOpen ? (
                <div style={styles.subOverlay} onClick={() => setIsApplicationsOpen(false)}>
                    <div style={styles.subModal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.subHeader}>
                            <h3 style={styles.subTitle}>신청자 목록</h3>
                            <button style={styles.closeBtn} onClick={() => setIsApplicationsOpen(false)} aria-label="닫기">
                                X
                            </button>
                        </div>

                        {isApplicationsLoading ? <p style={styles.subMessage}>신청자 목록을 불러오는 중...</p> : null}
                        {applicationsError ? <p style={styles.errorText}>{applicationsError}</p> : null}

                        {!isApplicationsLoading && !applicationsError ? (
                            applications.length > 0 ? (
                                <div style={styles.applicationList}>
                                    {applications.map((application) => (
                                        <div key={application.applicationId} style={styles.applicationCard}>
                                            <div style={styles.applicationMeta}>
                                                <strong>{application.applicantNickname}</strong>
                                                <span>{formatReviewStatus(application.status)}</span>
                                            </div>
                                            <div style={styles.applicationSubMeta}>
                                                <span>ID {application.applicantId}</span>
                                                <span>{formatDateTime(application.createdAt)}</span>
                                            </div>
                                            <div style={styles.actionRow}>
                                                <button
                                                    style={{
                                                        ...styles.approveBtn,
                                                        opacity: application.status === 'READY' ? 1 : 0.6,
                                                    }}
                                                    disabled={application.status !== 'READY' || processingApplicationId === application.applicationId}
                                                    onClick={() => handleApplicationDecision(application.applicationId, 'APPROVED')}
                                                >
                                                    승인
                                                </button>
                                                <button
                                                    style={{
                                                        ...styles.rejectBtn,
                                                        opacity: application.status === 'READY' ? 1 : 0.6,
                                                    }}
                                                    disabled={application.status !== 'READY' || processingApplicationId === application.applicationId}
                                                    onClick={() => handleApplicationDecision(application.applicationId, 'REJECTED')}
                                                >
                                                    거절
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={styles.subMessage}>현재 신청자가 없습니다.</p>
                            )
                        ) : null}
                    </div>
                </div>
            ) : null}
        </>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modal: {
        backgroundColor: 'white',
        width: '100%',
        maxWidth: '460px',
        borderRadius: '16px',
        padding: '25px',
        position: 'relative',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '16px',
        cursor: 'pointer',
        color: '#999',
        padding: '5px',
    },
    header: {
        marginBottom: '20px',
        paddingRight: '20px',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '22px',
        fontWeight: 'bold',
        color: '#333',
        wordBreak: 'keep-all',
    },
    badgeOpen: {
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: '#e6fcf5',
        color: '#0ca678',
        fontSize: '12px',
        fontWeight: 'bold',
    },
    badgeClosed: {
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: '#f1f3f5',
        color: '#868e96',
        fontSize: '12px',
        fontWeight: 'bold',
    },
    infoList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '25px',
    },
    infoItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '15px',
        color: '#444',
    },
    icon: {
        fontSize: '13px',
        width: '40px',
        flexShrink: 0,
        color: '#666',
        fontWeight: 'bold',
    },
    contentBox: {
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid #eee',
        marginBottom: '25px',
    },
    contentLabel: {
        margin: '0 0 8px 0',
        fontSize: '13px',
        color: '#888',
        fontWeight: '600',
    },
    contentText: {
        margin: 0,
        fontSize: '15px',
        color: '#333',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
    },
    footer: {
        marginTop: '10px',
    },
    joinBtn: {
        width: '100%',
        padding: '14px',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: 'bold',
    },
    manageBtn: {
        width: '100%',
        padding: '14px',
        color: 'white',
        backgroundColor: '#111827',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    applicationHint: {
        margin: '10px 0 0 0',
        fontSize: '13px',
        color: '#64748b',
        textAlign: 'center',
    },
    emptyState: {
        padding: '40px',
        textAlign: 'center',
        color: '#888',
    },
    subOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
        padding: '20px',
    },
    subModal: {
        width: '100%',
        maxWidth: '520px',
        backgroundColor: '#ffffff',
        borderRadius: '18px',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(15,23,42,0.18)',
        maxHeight: '85vh',
        overflowY: 'auto',
    },
    subHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '18px',
    },
    subTitle: {
        margin: 0,
        fontSize: '20px',
        color: '#0f172a',
    },
    subMessage: {
        margin: 0,
        color: '#64748b',
        textAlign: 'center',
        padding: '20px 0',
    },
    errorText: {
        margin: '8px 0',
        color: '#dc2626',
        textAlign: 'center',
    },
    applicationList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    applicationCard: {
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px',
        backgroundColor: '#f8fafc',
    },
    applicationMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        color: '#0f172a',
    },
    applicationSubMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '12px',
    },
    actionRow: {
        display: 'flex',
        gap: '8px',
    },
    approveBtn: {
        flex: 1,
        border: 'none',
        borderRadius: '8px',
        padding: '10px 12px',
        color: '#fff',
        backgroundColor: '#16a34a',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    rejectBtn: {
        flex: 1,
        border: 'none',
        borderRadius: '8px',
        padding: '10px 12px',
        color: '#fff',
        backgroundColor: '#dc2626',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
};

export default MatchDetailModal;
