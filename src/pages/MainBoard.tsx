import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchMap from '../components/MatchMap';
import MatchDetailModal from '../components/MatchDetailModal';
import type { Match } from '../components/MatchMap';
import './MainBoard.css';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao: any;
    }
}

interface MatchResponseDto {
    id?: number;
    matchId?: number;
    title: string;
    content?: string;
    placeName?: string;
    latitude: number;
    longitude: number;
    matchDate: string;
    distance?: number;
}

const MainBoard: React.FC = () => {
    const navigate = useNavigate();

    // 로그인 여부
    const [isLoggedIn] = useState<boolean>(() => !!localStorage.getItem('accessToken'));

    const [matches, setMatches] = useState<Match[]>([]);
    const [keyword, setKeyword] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

    // 지도 중심 (기본값: 서울 시청)
    const [center, setCenter] = useState<{ lat: number, lng: number }>({
        lat: 37.5665, lng: 126.9780
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 내 위치 찾기
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCenter({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                }
            );
        }
    }, []);

    // 데이터 가져오기
    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const response = await fetch(
                    `/api/matches/nearby?latitude=${center.lat}&longitude=${center.lng}&distance=5.0`
                );

                if (!response.ok) throw new Error('서버 응답 실패');

                const jsonResponse = await response.json();
                const result = jsonResponse.data as MatchResponseDto[];

                const parsedData: Match[] = result.map((item) => ({
                    matchId: item.matchId || item.id || 0,
                    title: item.title,
                    placeName: item.placeName || '장소 정보 없음',
                    latitude: item.latitude,
                    longitude: item.longitude,
                    matchDate: item.matchDate,
                    distance: item.distance
                }));
                setMatches(parsedData);
            } catch (error) {
                console.error("매치 로딩 실패:", error);
                setMatches([]);
            }
        };
        fetchMatches();
    }, [center]);

    // 검색 핸들러
    const handleSearch = () => {
        if (!keyword.trim()) {
            alert("지역명을 입력해주세요");
            return;
        }
        if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) return;

        const ps = new window.kakao.maps.services.Places();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ps.keywordSearch(keyword, (data: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const target = data[0];
                setCenter({ lat: parseFloat(target.y), lng: parseFloat(target.x) });
            } else {
                alert("검색 결과가 없습니다.");
            }
        });
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        alert("로그아웃 되었습니다.");
        window.location.reload();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f9f9f9' }}>

            {/* ✅ [수정 1] 헤더 여백 확보 (padding, gap 추가) */}
            <div style={{
                padding: '15px 20px',
                backgroundColor: 'white',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px' // 로고줄과 검색창줄 사이 간격
            }}>
                {/* 윗줄: 로고 + 버튼들 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    {/* 로고 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => window.location.reload()}>
                        <span style={{ fontSize: '24px' }}>⚽</span>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>Mercenary</h1>
                    </div>

                    {/* 버튼들 */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {isLoggedIn ? (
                            <>
                                <button onClick={() => navigate('/match/create')} style={styles.primaryBtn}>등록</button>
                                <button onClick={handleLogout} style={styles.secondaryBtn}>로그아웃</button>
                            </>
                        ) : (
                            <button onClick={() => navigate('/login')} style={styles.primaryBtn}>로그인</button>
                        )}
                    </div>
                </div>

                {/* 아랫줄: 검색창 */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="지역 검색 (예: 강남역)"
                        style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} style={{ ...styles.primaryBtn, backgroundColor: '#333' }}>이동</button>
                </div>
            </div>

            {/* 메인 컨텐츠 (지도 + 리스트) */}
            <div style={{ display: 'flex', flex: 1, flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', padding: '10px', gap: '10px' }}>

                {/* 지도에  */}
                <div style={{
                    flex: isMobile ? '0 0 55%' : '1',
                    position: 'relative',
                    border: '1px solid #ccc',  // 테두리 추가
                    borderRadius: '8px',       // 모서리 살짝 둥글게
                    overflow: 'hidden',        // 둥근 모서리 적용을 위해
                    backgroundColor: '#eee'
                }}>
                    <MatchMap
                        matches={matches}
                        center={center}
                        onMarkerClick={(id: number) => setSelectedMatchId(id)}
                    />
                </div>

                {/* 리스트 영역 */}
                <div style={{
                    width: isMobile ? '100%' : '350px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: '#f8f8f8' }}>
                        {/* 글자색 #333 지정으로 잘 보이게 수정 */}
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                            매치 목록 ({matches.length})
                        </h3>
                    </div>

                    <div style={{ padding: '10px', overflowY: 'auto', flex: 1 }}>
                        {matches.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
                                주변에 등록된 경기가 없습니다.
                            </div>
                        ) : (
                            matches.map((match) => (
                                <div
                                    key={match.matchId}
                                    style={styles.card}
                                    onClick={() => setSelectedMatchId(match.matchId || 0)}
                                >
                                    <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#000' }}>{match.title || match.placeName}</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>📍 {match.placeName}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* 모달 */}
            {selectedMatchId && (
                <MatchDetailModal
                    matchId={selectedMatchId}
                    onClose={() => setSelectedMatchId(null)}
                />
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    primaryBtn: {
        padding: '8px 14px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        whiteSpace: 'nowrap' // 버튼 글자 줄바꿈 방지
    },
    secondaryBtn: {
        padding: '8px 14px',
        backgroundColor: '#888',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        whiteSpace: 'nowrap'
    },
    card: {
        backgroundColor: 'white',
        padding: '12px',
        marginBottom: '8px',
        borderRadius: '6px',
        border: '1px solid #eee',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }
};

export default MainBoard;