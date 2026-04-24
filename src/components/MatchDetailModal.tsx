import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../utils/api';
import { apiFetch } from '../utils/apiFetch';
import {
    extractResponseData,
    extractResponseMessage,
    formatDateTime,
    formatReviewStatus,
    isMatchFull,
    isPastMatch,
    type ApplicationDecisionStatus,
} from '../utils/matchApi';
import { useAuth } from '../context/useAuth';

interface MatchDetailModalProps {
    matchId: number;
    onClose: () => void;
    onMissingMatch?: (matchId: number) => void;
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
    status: ApplicationDecisionStatus | null;
    applicationId: number | null;
};

type ApplicationSummary = {
    applicationId: number;
    applicantId: number;
    applicantNickname: string;
    status: ApplicationDecisionStatus;
    createdAt: string;
};

const DEFAULT_APPLICATION_STATUS: MyApplicationStatus = {
    applied: false,
    status: null,
    applicationId: null,
};

const normalizeMyApplicationStatus = (data: unknown): MyApplicationStatus => {
    if (!data || typeof data !== 'object') {
        return DEFAULT_APPLICATION_STATUS;
    }

    const candidate = data as Partial<MyApplicationStatus>;

    return {
        applied:
            typeof candidate.applied === 'boolean'
                ? candidate.applied
                : Boolean(candidate.status ?? candidate.applicationId),
        status: (candidate.status as ApplicationDecisionStatus | null | undefined) ?? null,
        applicationId: typeof candidate.applicationId === 'number' ? candidate.applicationId : null,
    };
};

const formatApplicationStatus = (status: MyApplicationStatus['status']) => {
    switch (status) {
        case 'READY':
            return '신청 완료';
        case 'APPROVED':
            return '승인 완료';
        case 'REJECTED':
            return '거절됨';
        case 'CANCELED':
            return '신청 취소';
        default:
            return '신청하기';
    }
};

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ matchId, onClose, onMissingMatch }) => {
    const navigate = useNavigate();
    const missingMatchHandledRef = useRef(false);
    const [match, setMatch] = useState<MatchDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [myApplication, setMyApplication] = useState<MyApplicationStatus>(DEFAULT_APPLICATION_STATUS);
    const [isStatusLoading, setIsStatusLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [applications, setApplications] = useState<ApplicationSummary[]>([]);
    const [applicationsError, setApplicationsError] = useState<string | null>(null);
    const [isApplicationsLoading, setIsApplicationsLoading] = useState(false);
    const [processingApplicationId, setProcessingApplicationId] = useState<number | null>(null);
    const [canManageApplications, setCanManageApplications] = useState(false);

    const { token, user } = useAuth();
    const isAuthorByPayload = Boolean(
        match &&
        (
            (typeof user?.userId === 'number' && typeof match.writerId === 'number' && user.userId === match.writerId) ||
            (user?.nickname && (user.nickname === match.writerNickname || user.nickname === match.writerName))
        )
    );
    const isPastDue = match ? isPastMatch(match.matchDate) : false;
    const isFull = match ? isMatchFull(match.currentPlayerCount, match.maxPlayerCount) : false;
    const isClosed = match?.status === 'CLOSED';
    const isJoinBlockedByMatchState = isClosed || isPastDue || isFull;
    const shouldShowManagementUi = isAuthorByPayload || canManageApplications;
    const isJoinDisabled = !token || isApplying || isStatusLoading || myApplication.applied || isJoinBlockedByMatchState;

    const handleMissingMatch = useCallback(() => {
        if (missingMatchHandledRef.current) {
            return;
        }

        missingMatchHandledRef.current = true;
        alert('삭제되었거나 만료된 게시글입니다.');
        onMissingMatch?.(matchId);
        onClose();
    }, [matchId, onClose, onMissingMatch]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const fetchDetail = useCallback(async () => {
        setLoading(true);
        setDetailError(null);

        try {
            const response = await apiFetch(buildApiUrl(`/api/matches/${matchId}`));
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(extractResponseMessage(payload, 'Failed to load match detail.'));
            }

            const data = extractResponseData<MatchDetailDto>(payload);

            if (!data) {
                throw new Error('Match detail is empty.');
            }

            setMatch(data);
        } catch (error) {
            console.error(error);
            setMatch(null);
            setDetailError(error instanceof Error ? error.message : 'Failed to load match detail.');
            handleMissingMatch();
        } finally {
            setLoading(false);
        }
    }, [handleMissingMatch, matchId]);

    const fetchMyApplicationStatus = useCallback(async () => {
        if (!token) {
            setMyApplication(DEFAULT_APPLICATION_STATUS);
            return;
        }

        setIsStatusLoading(true);

        try {
            const response = await apiFetch(buildApiUrl(`/api/matches/${matchId}/application/me`));

            if (response.status === 404) {
                setMyApplication(DEFAULT_APPLICATION_STATUS);
                return;
            }

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(extractResponseMessage(payload, 'Failed to load application status.'));
            }

            setMyApplication(normalizeMyApplicationStatus(extractResponseData(payload)));
        } catch (error) {
            console.error(error);
            setMyApplication(DEFAULT_APPLICATION_STATUS);
        } finally {
            setIsStatusLoading(false);
        }
    }, [matchId, token]);

    const fetchApplications = useCallback(async () => {
        if (!token) {
            setApplications([]);
            setApplicationsError(null);
            setCanManageApplications(false);
            return false;
        }

        setIsApplicationsLoading(true);
        setApplicationsError(null);

        try {
            const response = await apiFetch(buildApiUrl(`/api/matches/${matchId}/applications`));
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                if (response.status === 403) {
                    setApplications([]);
                    setCanManageApplications(false);
                    return false;
                }

                throw new Error(extractResponseMessage(payload, 'Failed to load applications.'));
            }

            const data = extractResponseData<ApplicationSummary[]>(payload);
            setApplications(Array.isArray(data) ? data : []);
            setCanManageApplications(true);
            return true;
        } catch (error) {
            console.error(error);
            setApplications([]);
            setCanManageApplications(false);
            setApplicationsError(error instanceof Error ? error.message : 'Failed to load applications.');
            return false;
        } finally {
            setIsApplicationsLoading(false);
        }
    }, [matchId, token]);

    useEffect(() => {
        void fetchDetail();
    }, [fetchDetail]);

    useEffect(() => {
        if (!token) {
            setCanManageApplications(false);
            void fetchMyApplicationStatus();
            return;
        }

        if (isAuthorByPayload) {
            void fetchApplications();
            return;
        }

        const resolveRole = async () => {
            const canManage = await fetchApplications();

            if (!canManage) {
                await fetchMyApplicationStatus();
            }
        };

        void resolveRole();
    }, [fetchApplications, fetchMyApplicationStatus, isAuthorByPayload, token]);

    const handleLoginRedirect = () => {
        alert('로그인이 필요합니다.');
        onClose();
        navigate('/login');
    };

    const handleJoin = async () => {
        if (!match || isApplying || myApplication.applied || isJoinBlockedByMatchState) {
            return;
        }

        if (!token) {
            handleLoginRedirect();
            return;
        }

        if (!window.confirm(`'${match.title}' 경기에 신청하시겠습니까?`)) {
            return;
        }

        setIsApplying(true);

        try {
            const response = await apiFetch(buildApiUrl(`/api/matches/${matchId}/apply`), {
                method: 'POST',
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(extractResponseMessage(payload, '참가 신청에 실패했습니다.'));
            }

            alert('참가 신청이 완료되었습니다.');
            await fetchMyApplicationStatus();
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
            const response = await apiFetch(buildApiUrl(`/api/matches/${matchId}/applications/${applicationId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(extractResponseMessage(payload, '신청 상태 변경에 실패했습니다.'));
            }

            await Promise.all([fetchApplications(), fetchDetail()]);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '신청 상태 변경 중 오류가 발생했습니다.');
        } finally {
            setProcessingApplicationId(null);
        }
    };

    if (loading || !match) {
        return null;
    }

    const joinButtonLabel = isPastDue
        ? '지난 경기'
        : isFull
            ? '정원 마감'
            : isClosed
                ? '모집 마감'
                : isStatusLoading
                    ? '신청 상태 확인 중...'
                    : isApplying
                        ? '신청 처리 중...'
                        : formatApplicationStatus(myApplication.status);

    const joinHint = myApplication.applied
        ? `현재 상태: ${formatApplicationStatus(myApplication.status)}`
        : isPastDue
            ? '지난 경기는 신청할 수 없습니다.'
            : isFull
                ? '정원이 마감된 경기는 신청할 수 없습니다.'
                : null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
                <button style={styles.closeBtn} onClick={onClose} aria-label="닫기">
                    X
                </button>

                {!detailError ? (
                    <>
                        <div style={styles.header}>
                            <h2 style={styles.title}>{match.title}</h2>
                            <span style={isJoinBlockedByMatchState ? styles.badgeClosed : styles.badgeOpen}>
                                {isPastDue ? '지난 경기' : isJoinBlockedByMatchState ? '모집 마감' : '모집 중'}
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
                                    <span style={styles.primaryText}>{match.placeName}</span>
                                    {match.addressName ? <div>{match.addressName}</div> : null}
                                </div>
                            </div>

                            <div style={styles.infoItem}>
                                <span style={styles.icon}>인원</span>
                                <span>
                                    현재 <span style={styles.highlightText}>{match.currentPlayerCount}</span>명 / 총 {match.maxPlayerCount}명
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
                            <p style={styles.contentText}>{match.content || '등록된 상세 내용이 없습니다.'}</p>
                        </div>

                        {shouldShowManagementUi ? (
                            <div style={styles.managementSection}>
                                <div style={styles.sectionHeader}>
                                    <div>
                                        <h4 style={styles.sectionTitle}>신청자 관리</h4>
                                        <p style={styles.sectionDescription}>
                                            신청 목록을 확인하고 승인 또는 거절 처리할 수 있습니다.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => void fetchApplications()}
                                        style={styles.refreshBtn}
                                        disabled={isApplicationsLoading}
                                    >
                                        새로고침
                                    </button>
                                </div>

                                {isApplicationsLoading ? <p style={styles.subMessage}>신청 목록을 불러오는 중입니다.</p> : null}
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
                                                            disabled={
                                                                application.status !== 'READY' ||
                                                                processingApplicationId === application.applicationId
                                                            }
                                                            onClick={() => void handleApplicationDecision(application.applicationId, 'APPROVED')}
                                                        >
                                                            승인
                                                        </button>
                                                        <button
                                                            style={{
                                                                ...styles.rejectBtn,
                                                                opacity: application.status === 'READY' ? 1 : 0.6,
                                                            }}
                                                            disabled={
                                                                application.status !== 'READY' ||
                                                                processingApplicationId === application.applicationId
                                                            }
                                                            onClick={() => void handleApplicationDecision(application.applicationId, 'REJECTED')}
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
                        ) : (
                            <div style={styles.footer}>
                                {!token ? (
                                    <>
                                        <button
                                            onClick={handleLoginRedirect}
                                            style={{ ...styles.joinBtn, backgroundColor: '#10b981', cursor: 'pointer' }}
                                        >
                                            로그인 후 신청하기
                                        </button>
                                        <p style={styles.applicationHint}>비로그인 상태에서는 로그인 후 신청할 수 있습니다.</p>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleJoin}
                                            style={{
                                                ...styles.joinBtn,
                                                backgroundColor: myApplication.applied || isJoinBlockedByMatchState ? '#94a3b8' : isApplying ? '#6ee7b7' : '#10b981',
                                                cursor: isJoinDisabled ? 'not-allowed' : 'pointer',
                                            }}
                                            disabled={isJoinDisabled}
                                        >
                                            {joinButtonLabel}
                                        </button>
                                        {joinHint ? <p style={styles.applicationHint}>{joinHint}</p> : null}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div style={styles.emptyState}>{detailError}</div>
                )}
            </div>
        </div>
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
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '560px',
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
        position: 'absolute',
        top: '18px',
        right: '18px',
    },
    header: {
        marginBottom: '20px',
        paddingRight: '28px',
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
        width: '44px',
        flexShrink: 0,
        color: '#666',
        fontWeight: 'bold',
    },
    primaryText: {
        fontWeight: 'bold',
    },
    highlightText: {
        color: '#16a34a',
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
        fontWeight: 600,
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
        color: '#ffffff',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: 'bold',
    },
    applicationHint: {
        margin: '10px 0 0 0',
        fontSize: '13px',
        color: '#64748b',
        textAlign: 'center',
    },
    managementSection: {
        borderTop: '1px solid #e5e7eb',
        paddingTop: '20px',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        alignItems: 'flex-start',
        marginBottom: '14px',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '18px',
        color: '#0f172a',
    },
    sectionDescription: {
        margin: '6px 0 0 0',
        color: '#64748b',
        fontSize: '13px',
    },
    refreshBtn: {
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        color: '#334155',
        borderRadius: '8px',
        padding: '8px 12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
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
        gap: '8px',
    },
    applicationSubMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '12px',
        flexWrap: 'wrap',
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
        color: '#ffffff',
        backgroundColor: '#10b981',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    rejectBtn: {
        flex: 1,
        border: 'none',
        borderRadius: '8px',
        padding: '10px 12px',
        color: '#ffffff',
        backgroundColor: '#dc2626',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    emptyState: {
        padding: '40px',
        textAlign: 'center',
        color: '#888',
    },
};

export default MatchDetailModal;
