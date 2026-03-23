import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchMap from '../components/MatchMap';
import MatchDetailModal from '../components/MatchDetailModal';
import type { Match } from '../components/MatchMap';
import { clearAccessToken, isAuthenticated as hasAccessToken, subscribeAuthChange } from '../utils/auth';
import { buildApiUrl } from '../utils/api';
import { isPastMatch } from '../utils/matchApi';
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
    currentPlayerCount?: number;
    maxPlayerCount?: number;
    latitude: number;
    longitude: number;
    matchDate: string;
    distance?: number;
}

const MainBoard: React.FC = () => {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => hasAccessToken());
    const [matches, setMatches] = useState<Match[]>([]);
    const [keyword, setKeyword] = useState('');
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
    const [center, setCenter] = useState<{ lat: number; lng: number }>({
        lat: 37.5665,
        lng: 126.978,
    });

    useEffect(() => {
        const syncAuthState = () => {
            setIsLoggedIn(hasAccessToken());
        };

        return subscribeAuthChange(syncAuthState);
    }, []);

    useEffect(() => {
        if (!navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition((position) => {
            setCenter({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            });
        });
    }, []);

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const response = await fetch(
                    buildApiUrl(`/api/matches/nearby?latitude=${center.lat}&longitude=${center.lng}&distance=5.0`),
                );

                if (!response.ok) {
                    throw new Error('서버 응답에 실패했습니다.');
                }

                const jsonResponse = await response.json();
                const result = (jsonResponse.data ?? []) as MatchResponseDto[];

                const parsedData: Match[] = result.filter((item) => !isPastMatch(item.matchDate)).map((item) => ({
                    matchId: item.matchId || item.id || 0,
                    title: item.title,
                    placeName: item.placeName || '장소 정보 없음',
                    latitude: item.latitude,
                    longitude: item.longitude,
                    matchDate: item.matchDate,
                    distance: item.distance,
                    currentPlayerCount: item.currentPlayerCount,
                    maxPlayerCount: item.maxPlayerCount,
                }));

                setMatches(parsedData);
            } catch (error) {
                console.error('매치 목록을 불러오지 못했습니다.', error);
                setMatches([]);
            }
        };

        void fetchMatches();
    }, [center]);

    const handleSearch = () => {
        if (!keyword.trim()) {
            alert('검색어를 입력해 주세요.');
            return;
        }

        if (!window.kakao?.maps?.services) {
            return;
        }

        const places = new window.kakao.maps.services.Places();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        places.keywordSearch(keyword, (data: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const target = data[0];
                setCenter({ lat: Number.parseFloat(target.y), lng: Number.parseFloat(target.x) });
                return;
            }

            alert('검색 결과가 없습니다.');
        });
    };

    const handleLogout = () => {
        clearAccessToken();
        alert('로그아웃되었습니다.');
        window.location.reload();
    };

    return (
        <div className="main-board">
            <header className="main-board__header">
                <div className="page-shell main-board__header-inner">
                    <div className="main-board__toolbar">
                        <div className="main-board__brand" onClick={() => window.location.reload()}>
                            <h1 className="main-board__brand-title">Mercenary</h1>
                        </div>

                        <div className="main-board__actions">
                            {isLoggedIn ? (
                                <>
                                    <button onClick={() => navigate('/match/create')} style={styles.primaryBtn}>등록</button>
                                    <button onClick={() => navigate('/mypage')} style={styles.secondaryBtn}>마이페이지</button>
                                    <button onClick={handleLogout} style={styles.secondaryBtn}>로그아웃</button>
                                </>
                            ) : (
                                <button onClick={() => navigate('/login')} style={styles.primaryBtn}>로그인</button>
                            )}
                        </div>
                    </div>

                    <div className="main-board__search">
                        <input
                            type="text"
                            placeholder="지역 검색 예: 강남역"
                            className="main-board__search-input"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} style={{ ...styles.primaryBtn, backgroundColor: '#334155' }}>이동</button>
                    </div>
                </div>
            </header>

            <main className="page-shell main-board__content">
                <div className="main-board__map-panel">
                    <MatchMap
                        matches={matches}
                        center={center}
                        onMarkerClick={(id: number) => setSelectedMatchId(id)}
                    />
                </div>

                <section className="main-board__list-panel">
                    <div className="main-board__list-header">
                        <h3 className="main-board__list-title">매치 목록 ({matches.length})</h3>
                    </div>

                    <div className="main-board__list-body">
                        {matches.length === 0 ? (
                            <div className="main-board__empty">주변에 등록된 경기가 없습니다.</div>
                        ) : (
                            matches.map((match) => (
                                <div
                                    key={match.matchId}
                                    style={styles.card}
                                    onClick={() => setSelectedMatchId(match.matchId || 0)}
                                >
                                    <h4 style={styles.cardTitle}>{match.title || match.placeName}</h4>
                                    <p style={styles.cardMeta}>
                                        인원 {match.currentPlayerCount ?? 0}/{match.maxPlayerCount ?? 0}명
                                    </p>
                                    <p style={styles.cardPlace}>장소 {match.placeName}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>

            {selectedMatchId && (
                <MatchDetailModal
                    matchId={selectedMatchId}
                    onClose={() => setSelectedMatchId(null)}
                    onMissingMatch={(missingMatchId) => {
                        setMatches((prev) => prev.filter((match) => match.matchId !== missingMatchId));
                    }}
                />
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    primaryBtn: {
        padding: '10px 16px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        whiteSpace: 'nowrap',
    },
    secondaryBtn: {
        padding: '10px 16px',
        backgroundColor: '#888',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        whiteSpace: 'nowrap',
    },
    card: {
        backgroundColor: 'white',
        padding: '14px',
        marginBottom: '10px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    cardTitle: {
        margin: '0 0 6px 0',
        fontSize: '15px',
        color: '#0f172a',
    },
    cardPlace: {
        margin: 0,
        fontSize: '13px',
        color: '#64748b',
    },
    cardMeta: {
        margin: '4px 0 0 0',
        fontSize: '13px',
        color: '#334155',
        fontWeight: 600,
    },
};

export default MainBoard;
