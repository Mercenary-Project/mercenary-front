import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    extractResponseData,
    extractResponseMessage,
    formatDateTime,
    formatReviewStatus,
    type ApplicationSummary,
    type MatchSummary,
} from '../utils/matchApi';
import { getAccessToken, subscribeAuthChange } from '../utils/auth';

type LoadedApplications = Record<number, ApplicationSummary[]>;
type ApplicationErrors = Record<number, string>;
type ExpandedMatches = Record<number, boolean>;
type LoadingMatches = Record<number, boolean>;

const MY_MATCH_ENDPOINT = '/api/matches/my';

const getMatchId = (match: MatchSummary) => match.matchId ?? match.id ?? 0;

const MyMatchesPage: React.FC = () => {
    const navigate = useNavigate();
    const [token, setToken] = useState<string | null>(() => getAccessToken());
    const [matches, setMatches] = useState<MatchSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [expandedMatches, setExpandedMatches] = useState<ExpandedMatches>({});
    const [applicationsByMatch, setApplicationsByMatch] = useState<LoadedApplications>({});
    const [loadingByMatch, setLoadingByMatch] = useState<LoadingMatches>({});
    const [errorByMatch, setErrorByMatch] = useState<ApplicationErrors>({});
    const [processingKey, setProcessingKey] = useState<string | null>(null);

    useEffect(() => {
        const syncAuthState = () => {
            setToken(getAccessToken());
        };

        return subscribeAuthChange(syncAuthState);
    }, []);

    const fetchMyMatches = useCallback(async () => {
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        setIsLoading(true);
        setPageError(null);

        try {
            const response = await fetch(MY_MATCH_ENDPOINT, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(extractResponseMessage(payload, '내가 작성한 게시글을 불러오지 못했습니다.'));
            }

            const data = extractResponseData<MatchSummary[]>(payload);
            setMatches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            setPageError(error instanceof Error ? error.message : '내가 작성한 게시글을 불러오지 못했습니다.');
            setMatches([]);
        } finally {
            setIsLoading(false);
        }
    }, [navigate, token]);

    const fetchApplications = useCallback(async (matchId: number) => {
        if (!token || loadingByMatch[matchId]) {
            return;
        }

        setLoadingByMatch((prev) => ({ ...prev, [matchId]: true }));
        setErrorByMatch((prev) => ({ ...prev, [matchId]: '' }));

        try {
            const response = await fetch(`/api/matches/${matchId}/applications`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(extractResponseMessage(payload, '신청자 목록을 불러오지 못했습니다.'));
            }

            const data = extractResponseData<ApplicationSummary[]>(payload);
            setApplicationsByMatch((prev) => ({
                ...prev,
                [matchId]: Array.isArray(data) ? data : [],
            }));
        } catch (error) {
            console.error(error);
            setErrorByMatch((prev) => ({
                ...prev,
                [matchId]: error instanceof Error ? error.message : '신청자 목록을 불러오지 못했습니다.',
            }));
        } finally {
            setLoadingByMatch((prev) => ({ ...prev, [matchId]: false }));
        }
    }, [loadingByMatch, token]);

    useEffect(() => {
        void fetchMyMatches();
    }, [fetchMyMatches]);

    const handleToggleApplications = (matchId: number) => {
        const nextExpanded = !expandedMatches[matchId];
        setExpandedMatches((prev) => ({ ...prev, [matchId]: nextExpanded }));

        if (nextExpanded && applicationsByMatch[matchId] === undefined) {
            void fetchApplications(matchId);
        }
    };

    const handleApplicationDecision = async (
        matchId: number,
        applicationId: number,
        status: 'APPROVED' | 'REJECTED',
    ) => {
        if (!token || processingKey) {
            return;
        }

        setProcessingKey(`${matchId}-${applicationId}`);

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
                throw new Error(extractResponseMessage(payload, '신청 상태 변경에 실패했습니다.'));
            }

            await fetchApplications(matchId);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '신청 상태 변경 중 오류가 발생했습니다.');
        } finally {
            setProcessingKey(null);
        }
    };

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <div className="page-shell" style={styles.headerInner}>
                    <div>
                        <h1 style={styles.title}>내 게시글 관리</h1>
                        <p style={styles.subtitle}>내가 올린 게시글과 신청자 목록을 한 화면에서 확인합니다.</p>
                    </div>
                    <div style={styles.headerActions}>
                        <button type="button" style={styles.secondaryButton} onClick={() => navigate('/')}>
                            메인으로
                        </button>
                        <button type="button" style={styles.primaryButton} onClick={() => void fetchMyMatches()}>
                            새로고침
                        </button>
                    </div>
                </div>
            </header>

            <main className="page-shell" style={styles.content}>
                {isLoading ? <div style={styles.emptyBox}>내 게시글을 불러오는 중입니다.</div> : null}
                {!isLoading && pageError ? <div style={styles.errorBox}>{pageError}</div> : null}
                {!isLoading && !pageError && matches.length === 0 ? (
                    <div style={styles.emptyBox}>작성한 게시글이 아직 없습니다.</div>
                ) : null}

                {!isLoading && !pageError && matches.length > 0 ? (
                    <div style={styles.matchList}>
                        {matches.map((match) => {
                            const matchId = getMatchId(match);
                            const applications = applicationsByMatch[matchId] ?? [];
                            const isExpanded = Boolean(expandedMatches[matchId]);
                            const isApplicationsLoading = Boolean(loadingByMatch[matchId]);
                            const applicationsError = errorByMatch[matchId];

                            return (
                                <article key={matchId} style={styles.matchCard}>
                                    <div style={styles.matchHeader}>
                                        <div style={styles.matchMeta}>
                                            <h2 style={styles.matchTitle}>{match.title}</h2>
                                            <div style={styles.matchSubText}>
                                                <span>{match.placeName || '장소 미정'}</span>
                                                <span>{formatDateTime(match.matchDate)}</span>
                                                <span>
                                                    {match.currentPlayerCount ?? 0}/{match.maxPlayerCount ?? 0}명
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            style={styles.primaryButton}
                                            onClick={() => handleToggleApplications(matchId)}
                                        >
                                            {isExpanded ? '신청자 닫기' : '신청자 보기'}
                                        </button>
                                    </div>

                                    {match.content ? <p style={styles.matchContent}>{match.content}</p> : null}

                                    {isExpanded ? (
                                        <section style={styles.applicationSection}>
                                            {isApplicationsLoading ? <p style={styles.subMessage}>신청자 목록을 불러오는 중입니다.</p> : null}
                                            {!isApplicationsLoading && applicationsError ? <p style={styles.errorText}>{applicationsError}</p> : null}
                                            {!isApplicationsLoading && !applicationsError && applications.length === 0 ? (
                                                <p style={styles.subMessage}>아직 신청한 사람이 없습니다.</p>
                                            ) : null}
                                            {!isApplicationsLoading && !applicationsError && applications.length > 0 ? (
                                                <div style={styles.applicationList}>
                                                    {applications.map((application) => {
                                                        const isProcessing = processingKey === `${matchId}-${application.applicationId}`;
                                                        const canReview = application.status === 'READY' && !isProcessing;

                                                        return (
                                                            <div key={application.applicationId} style={styles.applicationCard}>
                                                                <div style={styles.applicationTopRow}>
                                                                    <strong>{application.applicantNickname}</strong>
                                                                    <span>{formatReviewStatus(application.status)}</span>
                                                                </div>
                                                                <div style={styles.applicationSubRow}>
                                                                    <span>ID {application.applicantId}</span>
                                                                    <span>{formatDateTime(application.createdAt)}</span>
                                                                </div>
                                                                <div style={styles.actionRow}>
                                                                    <button
                                                                        type="button"
                                                                        style={styles.approveButton}
                                                                        disabled={!canReview}
                                                                        onClick={() => void handleApplicationDecision(matchId, application.applicationId, 'APPROVED')}
                                                                    >
                                                                        승인
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        style={styles.rejectButton}
                                                                        disabled={!canReview}
                                                                        onClick={() => void handleApplicationDecision(matchId, application.applicationId, 'REJECTED')}
                                                                    >
                                                                        거절
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                        </section>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>
                ) : null}
            </main>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
    },
    headerInner: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '16px',
        alignItems: 'center',
        paddingTop: '24px',
        paddingBottom: '24px',
        flexWrap: 'wrap',
    },
    headerActions: {
        display: 'flex',
        gap: '10px',
    },
    title: {
        margin: 0,
        fontSize: '28px',
        color: '#0f172a',
    },
    subtitle: {
        margin: '8px 0 0 0',
        color: '#64748b',
    },
    content: {
        paddingTop: '24px',
        paddingBottom: '40px',
    },
    matchList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    matchCard: {
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '20px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
    },
    matchHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '16px',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
    },
    matchMeta: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: 0,
    },
    matchTitle: {
        margin: 0,
        color: '#0f172a',
        fontSize: '20px',
    },
    matchSubText: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        color: '#64748b',
        fontSize: '14px',
    },
    matchContent: {
        margin: '14px 0 0 0',
        color: '#334155',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
    },
    applicationSection: {
        marginTop: '18px',
        borderTop: '1px solid #e2e8f0',
        paddingTop: '18px',
    },
    applicationList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    applicationCard: {
        border: '1px solid #dbe2ea',
        borderRadius: '14px',
        backgroundColor: '#f8fafc',
        padding: '14px',
    },
    applicationTopRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        alignItems: 'center',
        color: '#0f172a',
        flexWrap: 'wrap',
    },
    applicationSubRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        marginTop: '6px',
        color: '#64748b',
        fontSize: '13px',
        flexWrap: 'wrap',
    },
    actionRow: {
        display: 'flex',
        gap: '10px',
        marginTop: '12px',
    },
    primaryButton: {
        padding: '10px 16px',
        backgroundColor: '#2563eb',
        color: '#ffffff',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 700,
        whiteSpace: 'nowrap',
    },
    secondaryButton: {
        padding: '10px 16px',
        backgroundColor: '#ffffff',
        color: '#334155',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 700,
        whiteSpace: 'nowrap',
    },
    approveButton: {
        flex: 1,
        padding: '10px 12px',
        border: 'none',
        borderRadius: '10px',
        backgroundColor: '#16a34a',
        color: '#ffffff',
        cursor: 'pointer',
        fontWeight: 700,
    },
    rejectButton: {
        flex: 1,
        padding: '10px 12px',
        border: 'none',
        borderRadius: '10px',
        backgroundColor: '#dc2626',
        color: '#ffffff',
        cursor: 'pointer',
        fontWeight: 700,
    },
    emptyBox: {
        borderRadius: '18px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        padding: '40px 20px',
        textAlign: 'center',
        color: '#64748b',
    },
    errorBox: {
        borderRadius: '18px',
        backgroundColor: '#fff1f2',
        border: '1px solid #fecdd3',
        padding: '20px',
        textAlign: 'center',
        color: '#be123c',
    },
    subMessage: {
        margin: 0,
        color: '#64748b',
        textAlign: 'center',
        padding: '12px 0',
    },
    errorText: {
        margin: 0,
        color: '#dc2626',
        textAlign: 'center',
        padding: '12px 0',
    },
};

export default MyMatchesPage;
