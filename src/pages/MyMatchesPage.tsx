import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    extractResponseData,
    extractResponseMessage,
    formatDateTime,
    formatReviewStatus,
    isPastMatch,
    type AppliedMatchSummary,
    type ApplicationSummary,
    type MatchSummary,
} from '../utils/matchApi';
import { buildApiUrl } from '../utils/api';
import { apiFetch } from '../utils/apiFetch';
import { useAuth } from '../context/useAuth';

type LoadedApplications = Record<number, ApplicationSummary[]>;
type ApplicationErrors = Record<number, string>;
type ExpandedMatches = Record<number, boolean>;
type LoadingMatches = Record<number, boolean>;
type TabKey = 'authored' | 'applied' | 'archived';

type ArchiveItem = {
    id: number;
    title: string;
    placeName?: string;
    matchDate: string;
    badgeText: string;
};

const MY_MATCH_ENDPOINT = buildApiUrl('/api/matches/my');
const MY_APPLIED_MATCH_ENDPOINT = buildApiUrl('/api/matches/applied');
const MAIN_PRIMARY_BUTTON_COLOR = '#10b981';
const MAIN_SECONDARY_BUTTON_COLOR = '#f1f5f9';

const getMatchId = (match: MatchSummary) => match.matchId ?? match.id ?? 0;

const MyMatchesPage: React.FC = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabKey>('authored');
    const [authoredMatches, setAuthoredMatches] = useState<MatchSummary[]>([]);
    const [appliedMatches, setAppliedMatches] = useState<AppliedMatchSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [expandedMatches, setExpandedMatches] = useState<ExpandedMatches>({});
    const [applicationsByMatch, setApplicationsByMatch] = useState<LoadedApplications>({});
    const [loadingByMatch, setLoadingByMatch] = useState<LoadingMatches>({});
    const [errorByMatch, setErrorByMatch] = useState<ApplicationErrors>({});
    const [processingKey, setProcessingKey] = useState<string | null>(null);
    const [openMenuMatchId, setOpenMenuMatchId] = useState<number | null>(null);

    useEffect(() => {
        if (openMenuMatchId === null) return;
        const close = () => setOpenMenuMatchId(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [openMenuMatchId]);

    const visibleAuthoredMatches = authoredMatches.filter((match) => !isPastMatch(match.matchDate));
    const archivedAuthoredMatches = authoredMatches.filter((match) => isPastMatch(match.matchDate));
    const visibleAppliedMatches = appliedMatches.filter((match) => !isPastMatch(match.matchDate));
    const archivedAppliedMatches = appliedMatches.filter((match) => isPastMatch(match.matchDate));


    const fetchAuthoredMatches = useCallback(async () => {
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        const response = await apiFetch(MY_MATCH_ENDPOINT);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(extractResponseMessage(payload, '내가 작성한 게시글을 불러오지 못했습니다.'));
        }

        const data = extractResponseData<MatchSummary[]>(payload);
        setAuthoredMatches(Array.isArray(data) ? data : []);
    }, [navigate, token]);

    const fetchAppliedMatches = useCallback(async () => {
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        const response = await apiFetch(MY_APPLIED_MATCH_ENDPOINT);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(extractResponseMessage(payload, '내가 신청한 게시글을 불러오지 못했습니다.'));
        }

        const data = extractResponseData<AppliedMatchSummary[]>(payload);
        setAppliedMatches(Array.isArray(data) ? data : []);
    }, [navigate, token]);

    const refreshAllMatches = useCallback(async () => {
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        setIsLoading(true);
        setPageError(null);

        try {
            await Promise.all([fetchAuthoredMatches(), fetchAppliedMatches()]);
        } catch (error) {
            console.error(error);
            setPageError(error instanceof Error ? error.message : '마이페이지 정보를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [fetchAppliedMatches, fetchAuthoredMatches, navigate, token]);

    const fetchApplications = useCallback(async (matchId: number) => {
        if (!token || loadingByMatch[matchId]) {
            return;
        }

        setLoadingByMatch((prev) => ({ ...prev, [matchId]: true }));
        setErrorByMatch((prev) => ({ ...prev, [matchId]: '' }));

        try {
            const response = await apiFetch(buildApiUrl(`/api/matches/${matchId}/applications`));
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
        void refreshAllMatches();
    }, [refreshAllMatches]);

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

        setProcessingKey(`decision-${matchId}-${applicationId}`);

        try {
            const response = await apiFetch(buildApiUrl(`/api/matches/${matchId}/applications/${applicationId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
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

    const handleCancelMyApplication = async (matchId: number) => {
        if (!token || processingKey) {
            return;
        }

        setProcessingKey(`cancel-${matchId}`);

        try {
            const response = await apiFetch(buildApiUrl(`/api/matches/${matchId}/application/me`), {
                method: 'DELETE',
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(extractResponseMessage(payload, '신청 취소에 실패했습니다.'));
            }

            await fetchAppliedMatches();
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '신청 취소 중 오류가 발생했습니다.');
        } finally {
            setProcessingKey(null);
        }
    };

    const handleDeleteMatch = async (matchId: number, title: string) => {
        if (!token || processingKey) {
            return;
        }

        const shouldDelete = window.confirm(`'${title}' 매치를 삭제하시겠습니까?`);

        if (!shouldDelete) {
            return;
        }

        setProcessingKey(`delete-${matchId}`);

        try {
            const response = await apiFetch(buildApiUrl(`/api/matches/${matchId}`), {
                method: 'DELETE',
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(extractResponseMessage(payload, '매치 삭제에 실패했습니다.'));
            }

            setAuthoredMatches((prev) => prev.filter((match) => getMatchId(match) !== matchId));
            setExpandedMatches((prev) => {
                const next = { ...prev };
                delete next[matchId];
                return next;
            });
            setApplicationsByMatch((prev) => {
                const next = { ...prev };
                delete next[matchId];
                return next;
            });
            setLoadingByMatch((prev) => {
                const next = { ...prev };
                delete next[matchId];
                return next;
            });
            setErrorByMatch((prev) => {
                const next = { ...prev };
                delete next[matchId];
                return next;
            });

            alert('매치가 성공적으로 삭제되었습니다.');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '매치 삭제 중 오류가 발생했습니다.');
        } finally {
            setProcessingKey(null);
        }
    };

    const renderAuthoredMatches = () => {
        if (visibleAuthoredMatches.length === 0) {
            return <div style={styles.emptyBox}>진행 중인 내가 쓴 글이 아직 없습니다.</div>;
        }

        return (
            <div style={styles.matchList}>
                {visibleAuthoredMatches.map((match) => {
                    const matchId = getMatchId(match);
                    const applications = applicationsByMatch[matchId] ?? [];
                    const isExpanded = Boolean(expandedMatches[matchId]);
                    const isApplicationsLoading = Boolean(loadingByMatch[matchId]);
                    const applicationsError = errorByMatch[matchId];
                    const isDeleting = processingKey === `delete-${matchId}`;

                    return (
                        <article key={matchId} style={styles.matchCard}>
                            <div style={styles.matchHeader}>
                                <div style={styles.matchMeta}>
                                    <h2 style={styles.matchTitle}>{match.title}</h2>
                                    <div style={styles.matchSubText}>
                                        <span>{match.placeName || '장소 미정'}</span>
                                        <span>{formatDateTime(match.matchDate)}</span>
                                        {match.isFullyBooked
                                            ? <span>모집완료</span>
                                            : match.slots && match.slots.some(s => s.available > 0)
                                                ? <span>{match.slots.reduce((n, s) => n + s.available, 0)}자리 모집중</span>
                                                : null}
                                    </div>
                                </div>
                                <div style={styles.matchActionGroup}>
                                    <button
                                        type="button"
                                        style={styles.primaryButton}
                                        onClick={() => handleToggleApplications(matchId)}
                                        disabled={isDeleting}
                                    >
                                        {isExpanded ? '신청자 닫기' : '신청자 보기'}
                                    </button>
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            type="button"
                                            style={styles.menuButton}
                                            disabled={Boolean(processingKey)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuMatchId(openMenuMatchId === matchId ? null : matchId);
                                            }}
                                        >
                                            ⋮
                                        </button>
                                        {openMenuMatchId === matchId && (
                                            <div style={styles.dropdown} onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    style={styles.dropdownItem}
                                                    onClick={() => {
                                                        setOpenMenuMatchId(null);
                                                        navigate(`/match/${matchId}/edit`);
                                                    }}
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    type="button"
                                                    style={styles.dropdownItemDanger}
                                                    disabled={Boolean(processingKey)}
                                                    onClick={() => {
                                                        setOpenMenuMatchId(null);
                                                        void handleDeleteMatch(matchId, match.title);
                                                    }}
                                                >
                                                    {isDeleting ? '삭제 중...' : '삭제'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {match.content ? <p style={styles.matchContent}>{match.content}</p> : null}

                            {isExpanded ? (
                                <section style={styles.applicationSection}>
                                    {isApplicationsLoading ? <p style={styles.subMessage}>신청자 목록을 불러오는 중입니다.</p> : null}
                                    {!isApplicationsLoading && applicationsError ? <p style={styles.errorText}>{applicationsError}</p> : null}
                                    {!isApplicationsLoading && !applicationsError && applications.length === 0 ? (
                                        <p style={styles.subMessage}>아직 신청자가 없습니다.</p>
                                    ) : null}
                                    {!isApplicationsLoading && !applicationsError && applications.length > 0 ? (
                                        <div style={styles.applicationList}>
                                            {applications.map((application) => {
                                                const isProcessing = processingKey === `decision-${matchId}-${application.applicationId}`;
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
        );
    };

    const renderAppliedMatches = () => {
        if (visibleAppliedMatches.length === 0) {
            return <div style={styles.emptyBox}>진행 중인 내가 신청한 글이 아직 없습니다.</div>;
        }

        return (
            <div style={styles.matchList}>
                {visibleAppliedMatches.map((match) => {
                    const canCancel = match.status === 'READY';
                    const isProcessing = processingKey === `cancel-${match.matchId}`;

                    return (
                        <article key={match.applicationId} style={styles.matchCard}>
                            <div style={styles.matchHeader}>
                                <div style={styles.matchMeta}>
                                    <h2 style={styles.matchTitle}>{match.title}</h2>
                                    <div style={styles.matchSubText}>
                                        <span>{match.placeName || '장소 미정'}</span>
                                        <span>{formatDateTime(match.matchDate)}</span>
                                        <span>작성자 {match.writerName || '-'}</span>
                                        {match.isFullyBooked
                                            ? <span>모집완료</span>
                                            : match.slots && match.slots.some(s => s.available > 0)
                                                ? <span>{match.slots.reduce((n, s) => n + s.available, 0)}자리 모집중</span>
                                                : null}
                                    </div>
                                </div>
                                <span style={canCancel ? styles.badgeReady : styles.badgeDone}>
                                    {formatReviewStatus(match.status)}
                                </span>
                            </div>

                            <div style={styles.appliedActionRow}>
                                <button
                                    type="button"
                                    style={canCancel ? styles.secondaryButton : styles.disabledButton}
                                    disabled={!canCancel || isProcessing}
                                    onClick={() => void handleCancelMyApplication(match.matchId)}
                                >
                                    {isProcessing ? '취소 중...' : '신청 취소'}
                                </button>
                            </div>
                        </article>
                    );
                })}
            </div>
        );
    };

    const renderArchiveSection = (heading: string, description: string, items: ArchiveItem[]) => {
        if (items.length === 0) {
            return null;
        }

        return (
            <section style={styles.archiveSection}>
                <div style={styles.archiveSectionHeader}>
                    <h2 style={styles.archiveSectionTitle}>{heading}</h2>
                    <p style={styles.archiveSectionDescription}>{description}</p>
                </div>
                <div style={styles.matchList}>
                    {items.map((item) => (
                        <article key={item.id} style={styles.matchCard}>
                            <div style={styles.matchHeader}>
                                <div style={styles.matchMeta}>
                                    <h2 style={styles.matchTitle}>{item.title}</h2>
                                    <div style={styles.matchSubText}>
                                        <span>{item.placeName || '장소 미정'}</span>
                                        <span>{formatDateTime(item.matchDate)}</span>
                                    </div>
                                </div>
                                <span style={styles.badgeDone}>{item.badgeText}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        );
    };

    const renderArchivedMatches = () => {
        const archivedAuthoredItems: ArchiveItem[] = archivedAuthoredMatches.map((match) => ({
            id: getMatchId(match),
            title: match.title,
            placeName: match.placeName,
            matchDate: match.matchDate,
            badgeText: '지난 내가 쓴 글',
        }));
        const archivedAppliedItems: ArchiveItem[] = archivedAppliedMatches.map((match) => ({
            id: match.applicationId,
            title: match.title,
            placeName: match.placeName,
            matchDate: match.matchDate,
            badgeText: formatReviewStatus(match.status),
        }));

        if (archivedAuthoredItems.length === 0 && archivedAppliedItems.length === 0) {
            return <div style={styles.emptyBox}>보관된 지난 경기가 아직 없습니다.</div>;
        }

        return (
            <div style={styles.archiveList}>
                {renderArchiveSection(
                    '내가 쓴 지난 경기',
                    '이미 지난 일정은 메인 목록에서 숨겨지고 이곳에서만 확인할 수 있습니다.',
                    archivedAuthoredItems,
                )}
                {renderArchiveSection(
                    '내가 신청한 지난 경기',
                    '신청 이력은 기록으로만 보관되고 추가 작업은 할 수 없습니다.',
                    archivedAppliedItems,
                )}
            </div>
        );
    };

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <div className="page-shell" style={styles.headerInner}>
                    <div>
                        <h1 style={styles.title}>마이페이지</h1>
                        <p style={styles.subtitle}>내가 작성한 글과 신청한 글을 이곳에서 관리합니다.</p>
                    </div>
                    <div style={styles.headerActions}>
                        <button type="button" style={styles.secondaryButton} onClick={() => navigate('/')}>
                            메인으로
                        </button>
                    </div>
                </div>
            </header>

            <main className="page-shell" style={styles.content}>
                <div style={styles.tabRow}>
                    <button
                        type="button"
                        style={activeTab === 'authored' ? styles.activeTabButton : styles.tabButton}
                        onClick={() => setActiveTab('authored')}
                    >
                        내가 쓴 글
                    </button>
                    <button
                        type="button"
                        style={activeTab === 'applied' ? styles.activeTabButton : styles.tabButton}
                        onClick={() => setActiveTab('applied')}
                    >
                        내가 신청한 글
                    </button>
                    <button
                        type="button"
                        style={activeTab === 'archived' ? styles.activeTabButton : styles.tabButton}
                        onClick={() => setActiveTab('archived')}
                    >
                        보관함
                    </button>
                </div>

                {isLoading ? <div style={styles.emptyBox}>마이페이지 정보를 불러오는 중입니다.</div> : null}
                {!isLoading && pageError ? <div style={styles.errorBox}>{pageError}</div> : null}
                {!isLoading && !pageError ? (
                    activeTab === 'authored'
                        ? renderAuthoredMatches()
                        : activeTab === 'applied'
                            ? renderAppliedMatches()
                            : renderArchivedMatches()
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
    tabRow: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap',
    },
    tabButton: {
        padding: '12px 16px',
        backgroundColor: MAIN_SECONDARY_BUTTON_COLOR,
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        color: '#475569',
        cursor: 'pointer',
        fontWeight: 700,
    },
    activeTabButton: {
        padding: '12px 16px',
        backgroundColor: '#334155',
        border: '1px solid #334155',
        borderRadius: '12px',
        color: '#ffffff',
        cursor: 'pointer',
        fontWeight: 700,
    },
    archiveList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    archiveSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
    },
    archiveSectionHeader: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    archiveSectionTitle: {
        margin: 0,
        fontSize: '20px',
        color: '#0f172a',
    },
    archiveSectionDescription: {
        margin: 0,
        color: '#64748b',
        fontSize: '14px',
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
    appliedActionRow: {
        marginTop: '16px',
        display: 'flex',
        justifyContent: 'flex-end',
    },
    matchActionGroup: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    menuButton: {
        padding: '6px 10px',
        backgroundColor: MAIN_SECONDARY_BUTTON_COLOR,
        color: '#475569',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: '18px',
        lineHeight: 1,
        whiteSpace: 'nowrap',
    },
    dropdown: {
        position: 'absolute',
        top: 'calc(100% + 6px)',
        right: 0,
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        zIndex: 10,
        minWidth: '110px',
        overflow: 'hidden',
    },
    dropdownItem: {
        display: 'block',
        width: '100%',
        padding: '12px 16px',
        backgroundColor: 'transparent',
        border: 'none',
        textAlign: 'left' as const,
        cursor: 'pointer',
        fontWeight: 600,
        color: '#1e293b',
        fontSize: '14px',
    },
    dropdownItemDanger: {
        display: 'block',
        width: '100%',
        padding: '12px 16px',
        backgroundColor: 'transparent',
        border: 'none',
        borderTop: '1px solid #f1f5f9',
        textAlign: 'left' as const,
        cursor: 'pointer',
        fontWeight: 600,
        color: '#dc2626',
        fontSize: '14px',
    },
    primaryButton: {
        padding: '10px 16px',
        backgroundColor: MAIN_PRIMARY_BUTTON_COLOR,
        color: '#ffffff',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 700,
        whiteSpace: 'nowrap',
    },
    secondaryButton: {
        padding: '10px 16px',
        backgroundColor: MAIN_SECONDARY_BUTTON_COLOR,
        color: '#475569',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 700,
        whiteSpace: 'nowrap',
    },
    disabledButton: {
        padding: '10px 16px',
        backgroundColor: '#b5b5b5',
        color: '#f8fafc',
        border: 'none',
        borderRadius: '10px',
        cursor: 'not-allowed',
        fontWeight: 700,
        whiteSpace: 'nowrap',
    },
    approveButton: {
        flex: 1,
        padding: '10px 12px',
        border: 'none',
        borderRadius: '10px',
        backgroundColor: MAIN_PRIMARY_BUTTON_COLOR,
        color: '#ffffff',
        cursor: 'pointer',
        fontWeight: 700,
    },
    rejectButton: {
        flex: 1,
        padding: '10px 12px',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        backgroundColor: MAIN_SECONDARY_BUTTON_COLOR,
        color: '#475569',
        cursor: 'pointer',
        fontWeight: 700,
    },
    dangerButton: {
        padding: '10px 16px',
        border: 'none',
        borderRadius: '10px',
        backgroundColor: '#dc2626',
        color: '#ffffff',
        cursor: 'pointer',
        fontWeight: 700,
        whiteSpace: 'nowrap',
    },
    badgeReady: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 10px',
        borderRadius: '999px',
        backgroundColor: '#dbeafe',
        color: '#1d4ed8',
        fontWeight: 700,
        fontSize: '12px',
    },
    badgeDone: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 10px',
        borderRadius: '999px',
        backgroundColor: '#e2e8f0',
        color: '#475569',
        fontWeight: 700,
        fontSize: '12px',
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
