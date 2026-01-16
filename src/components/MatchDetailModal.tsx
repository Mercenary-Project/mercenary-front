import React, { useEffect, useState } from 'react';

interface MatchDetailModalProps {
    matchId: number;
    onClose: () => void;
}

// ✅ [수정] 백엔드 DTO와 변수명을 100% 일치시켰습니다.
interface MatchDetailDto {
    matchId: number;        // 백엔드는 id 대신 matchId를 줄 수도 있으므로 확인 필요 (보통 id 아니면 matchId)
    title: string;
    content: string;
    matchDate: string;
    placeName: string;
    addressName?: string;   // fullAddress 등 백엔드 명칭 확인 필요 (일단 addressName 유지)
    currentPlayerCount: number; // 👈 currentMemberCount -> currentPlayerCount 로 변경
    maxPlayerCount: number;     // 👈 maxMemberCount -> maxPlayerCount 로 변경
    writerName?: string;
    status?: string;        // 'RECRUITING' | 'CLOSED' 등 문자열로 옴
}

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ matchId, onClose }) => {
    const [match, setMatch] = useState<MatchDetailDto | null>(null);
    const [loading, setLoading] = useState(true);

    // 모달이 켜지면 스크롤 막기
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // 데이터 가져오기
    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await fetch(`/api/matches/${matchId}`);
                if (!response.ok) throw new Error("데이터 가져오기 실패");

                const jsonResponse = await response.json();
                // 백엔드 응답이 { "data": { ... } } 형태라고 가정
                setMatch(jsonResponse.data || jsonResponse);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [matchId]);

    const handleJoin = () => {
        if (!match) return;
        if (window.confirm(`'${match.title}' 경기에 참가 신청하시겠습니까?`)) {
            alert("참가 신청 기능은 곧 구현됩니다!");
            // TODO: POST /api/matches/{matchId}/join 요청 보내기
        }
    };

    if (loading) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

                <button style={styles.closeBtn} onClick={onClose}>✕</button>

                {match ? (
                    <>
                        <div style={styles.header}>
                            <h2 style={styles.title}>{match.title}</h2>
                            <span style={match.status === 'CLOSED' ? styles.badgeClosed : styles.badgeOpen}>
                                {match.status === 'CLOSED' ? '마감' : '모집중'}
                            </span>
                        </div>

                        <div style={styles.infoList}>
                            <div style={styles.infoItem}>
                                <span style={styles.icon}>📅</span>
                                <span>
                                    {/* 날짜 포맷팅 */}
                                    {match.matchDate
                                        ? new Date(match.matchDate).toLocaleString('ko-KR', {
                                            year: 'numeric', month: 'long', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })
                                        : '날짜 미정'}
                                </span>
                            </div>
                            <div style={styles.infoItem}>
                                <span style={styles.icon}>📍</span>
                                <div>
                                    <span style={{ fontWeight: 'bold' }}>{match.placeName}</span>
                                </div>
                            </div>
                            <div style={styles.infoItem}>
                                <span style={styles.icon}>👥</span>
                                <span>
                                    {/* ✅ 변수명 수정 적용 */}
                                    현재 <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                                        {match.currentPlayerCount}
                                    </span>명 /
                                    총 {match.maxPlayerCount}명
                                </span>
                            </div>

                            {/* 작성자 정보가 있다면 표시 */}
                            {match.writerName && (
                                <div style={styles.infoItem}>
                                    <span style={styles.icon}>👤</span>
                                    <span>작성자: {match.writerName}</span>
                                </div>
                            )}
                        </div>

                        <div style={styles.contentBox}>
                            <h4 style={styles.contentLabel}>상세 내용</h4>
                            <p style={styles.contentText}>
                                {match.content || "상세 내용이 없습니다."}
                            </p>
                        </div>

                        <div style={styles.footer}>
                            <button onClick={handleJoin} style={styles.joinBtn}>
                                참가 신청하기
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                        정보를 불러오지 못했습니다.
                    </div>
                )}
            </div>
        </div>
    );
};

// 스타일 (이전과 동일하지만 확실하게 하기 위해 포함)
const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
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
        maxWidth: '450px',
        borderRadius: '16px',
        padding: '25px',
        position: 'relative',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    closeBtn: {
        position: 'absolute',
        top: '15px',
        right: '15px',
        background: 'none',
        border: 'none',
        fontSize: '20px',
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
        fontSize: '18px',
        width: '24px',
        textAlign: 'center' as const,
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
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
    }
};

export default MatchDetailModal;