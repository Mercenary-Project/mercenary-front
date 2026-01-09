import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchMap from '../components/MatchMap';

// 1. 프론트엔드에서 사용할 깔끔한 데이터 타입
export interface Match {
    matchId: number;
    title: string;
    placeName: string;
    latitude: number;
    longitude: number;
    matchDate: string;
}

// 2. 백엔드에서 날아오는 원본 데이터 타입 (any 대체용)
// 물음표(?)는 데이터가 있을 수도 있고 없을 수도 있다는 뜻입니다.
interface MatchResponseDto {
    id?: number;
    matchId?: number;
    title: string;
    placeName?: string;
    latitude: number;
    longitude: number;
    matchDate: string;
    // 필요한 경우 다른 필드 추가
}

const MainBoard: React.FC = () => {
    const navigate = useNavigate();
    const [isLoggedIn] = useState<boolean>(() => !!localStorage.getItem('accessToken'));
    const [matches, setMatches] = useState<Match[]>([]);

    // 반응형 상태
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 매치 목록 불러오기
    useEffect(() => {
        const fetchMatches = async () => {
            const token = localStorage.getItem('accessToken');
            try {
                const response = await fetch('/api/matches', {
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    // any를 쓰지 않기 위해 unknown으로 먼저 받음
                    const result: unknown = await response.json();

                    let rawData: MatchResponseDto[] = [];

                    // 타입 가드: result가 배열인지, 아니면 { data: [] } 형태인지 확인
                    if (Array.isArray(result)) {
                        rawData = result as MatchResponseDto[];
                    } else if (
                        typeof result === 'object' &&
                        result !== null &&
                        'data' in result &&
                        Array.isArray((result as { data: any[] }).data)
                    ) {
                        rawData = (result as { data: MatchResponseDto[] }).data;
                    }

                    // 여기서 any 없이 안전하게 변환
                    const matchData = rawData.map((item) => ({
                        matchId: item.id || item.matchId || 0,
                        title: item.title,
                        placeName: item.placeName || "장소 미정",
                        latitude: item.latitude,
                        longitude: item.longitude,
                        matchDate: item.matchDate,
                    }));

                    setMatches(matchData);
                } else {
                    console.error("데이터 불러오기 실패:", response.status);
                }
            } catch (error) {
                console.error("서버 에러:", error);
            }
        };
        fetchMatches();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        alert("로그아웃 되었습니다.");
        window.location.reload();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f0f2f5' }}>

            {/* 상단 헤더 */}
            <div style={{
                padding: '15px',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>⚽</span>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#333' }}>매치 찾기</h1>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {isLoggedIn ? (
                        <>
                            <button
                                onClick={() => navigate('/match/create')}
                                style={styles.primaryBtn}
                            >
                                + 등록
                            </button>
                            <button
                                onClick={handleLogout}
                                style={styles.secondaryBtn}
                            >
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            style={styles.primaryBtn}
                        >
                            로그인
                        </button>
                    )}
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div style={{
                display: 'flex',
                flex: 1,
                flexDirection: isMobile ? 'column' : 'row',
                overflow: 'hidden'
            }}>

                {/* 지도 영역 */}
                <div style={{
                    flex: isMobile ? '0 0 40%' : '1',
                    position: 'relative',
                    borderBottom: isMobile ? '1px solid #ddd' : 'none'
                }}>
                    <MatchMap matches={matches} />

                    <div style={{
                        position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(255,255,255,0.9)', padding: '5px 12px', borderRadius: '20px',
                        fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10
                    }}>
                        내 주변 매치 {matches.length}개
                    </div>
                </div>

                {/* 리스트 영역 */}
                <div style={{
                    width: isMobile ? '100%' : '380px',
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    borderLeft: isMobile ? 'none' : '1px solid #ddd'
                }}>
                    <div style={{ padding: '15px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#555' }}>
                            매치 목록
                        </h3>

                        {matches.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                                <p>등록된 매치가 없거나<br/>로딩 중입니다.</p>
                            </div>
                        ) : (
                            matches.map((match) => (
                                <div
                                    key={match.matchId}
                                    style={styles.card}
                                    onClick={() => alert(`${match.title}\n상세 페이지로 이동 기능 구현 필요`)}
                                >
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#333' }}>
                                        {match.title}
                                    </h4>
                                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#666', gap: '5px' }}>
                                        <span>📍 {match.placeName}</span>
                                    </div>
                                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>📅 {new Date(match.matchDate).toLocaleDateString()}</span>
                                        <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>모집중</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎨 스타일 객체 타입 정의 (에러 해결 핵심!)
// React.CSSProperties를 사용하면 fontWeight 등의 자동완성이 지원되고 에러가 안 납니다.
const styles: { [key: string]: React.CSSProperties } = {
    primaryBtn: {
        padding: '8px 12px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 'bold', // as 'bold' 제거함
        cursor: 'pointer',
    },
    secondaryBtn: {
        padding: '8px 12px',
        backgroundColor: '#999',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
        cursor: 'pointer',
    },
    card: {
        backgroundColor: 'white',
        padding: '15px',
        marginBottom: '10px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        border: '1px solid #eee',
        transition: 'transform 0.1s',
    }
};

export default MainBoard;