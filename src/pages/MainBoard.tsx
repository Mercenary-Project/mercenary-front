import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchMap from '../components/MatchMap';
import MatchDetailModal from '../components/MatchDetailModal';
import type { Match } from '../components/MatchMap';
import { useAuth } from '../context/useAuth';
import { buildApiUrl } from '../utils/api';
import { apiFetch } from '../utils/apiFetch';
import { isPastMatch } from '../utils/matchApi';
import { POSITION_LABEL, type PositionSlot } from '../types/match';
import './MainBoard.css';


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
    slots?: PositionSlot[];
    isFullyBooked?: boolean;
}

const MainBoard: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated: isLoggedIn, logout } = useAuth();
    const [matches, setMatches] = useState<Match[]>([]);
    const [keyword, setKeyword] = useState('');
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [center, setCenter] = useState<{ lat: number; lng: number }>({
        lat: 37.5665,
        lng: 126.978,
    });

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
                const response = await apiFetch(
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
                    slots: item.slots,
                    isFullyBooked: item.isFullyBooked,
                }));

                setMatches(parsedData);
            } catch (error) {
                console.error('매치 목록을 불러오지 못했습니다.', error);
                setMatches([]);
            }
        };

        void fetchMatches();
    }, [center]);

    const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
    const toDateKey = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    const todayKey = toDateKey(new Date());
    const getWeekDates = (): Date[] => {
        const base = new Date();
        base.setDate(base.getDate() + weekOffset * 7);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            return d;
        });
    };
    const displayedMatches = selectedDate
        ? matches.filter((m) => m.matchDate?.startsWith(selectedDate))
        : matches;

    const formatMatchTime = (matchDate?: string): string => {
        if (!matchDate) return '--:--';
        try {
            const d = new Date(matchDate);
            return d.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Asia/Seoul',
            });
        } catch {
            return '--:--';
        }
    };

    const handleSearch = () => {
        if (!keyword.trim()) {
            alert('검색어를 입력해 주세요.');
            return;
        }

        if (!window.kakao?.maps?.services) {
            return;
        }

        const places = new window.kakao.maps.services.Places();
        places.keywordSearch(keyword, (data: KakaoPlaceResult[], status: string) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const target = data[0];
                setCenter({ lat: Number.parseFloat(target.y), lng: Number.parseFloat(target.x) });
                return;
            }

            alert('검색 결과가 없습니다.');
        });
    };

    const handleLogout = () => {
        logout();
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

            <div className="page-shell main-board__date-section">
                <div className="main-board__date-strip">
                    <button
                        className="main-board__date-nav"
                        onClick={() => setWeekOffset((w) => w - 1)}
                    >‹</button>
                    {getWeekDates().map((date) => {
                        const key = toDateKey(date);
                        const dow = date.getDay();
                        const isSelected = selectedDate === key;
                        const isToday = key === todayKey;
                        let btnClass = 'main-board__date-btn';
                        if (isSelected) btnClass += ' main-board__date-btn--active';
                        else if (isToday) btnClass += ' main-board__date-btn--today';
                        if (dow === 0) btnClass += ' main-board__date-btn--sun';
                        if (dow === 6) btnClass += ' main-board__date-btn--sat';
                        return (
                            <button
                                key={key}
                                className={btnClass}
                                onClick={() => setSelectedDate(isSelected ? null : key)}
                            >
                                <span className="main-board__date-num">{date.getDate()}</span>
                                <span className="main-board__date-day">{DAY_NAMES[dow]}</span>
                            </button>
                        );
                    })}
                    <button
                        className="main-board__date-nav"
                        onClick={() => setWeekOffset((w) => w + 1)}
                    >›</button>
                </div>
            </div>

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
                        <h3 className="main-board__list-title">매치 목록 ({displayedMatches.length})</h3>
                    </div>

                    <div className="main-board__list-body">
                        {displayedMatches.length === 0 ? (
                            <div className="main-board__empty">
                                {selectedDate ? '선택한 날짜에 등록된 경기가 없습니다.' : '주변에 등록된 경기가 없습니다.'}
                            </div>
                        ) : (
                            displayedMatches.map((match) => (
                                <div
                                    key={match.matchId}
                                    className="main-board__match-card"
                                    onClick={() => setSelectedMatchId(match.matchId || 0)}
                                >
                                    <span className="main-board__match-time">
                                        {formatMatchTime(match.matchDate)}
                                    </span>
                                    <div className="main-board__match-info">
                                        <h4 className="main-board__match-title">{match.title || match.placeName}</h4>
                                        <p className="main-board__match-place">{match.placeName}</p>
                                        {match.slots && match.slots.length > 0 && (
                                            <div className="main-board__match-slots">
                                                {match.slots
                                                    .filter(s => s.available > 0)
                                                    .map(s => (
                                                        <span key={s.position} className="main-board__slot-tag">
                                                            {POSITION_LABEL[s.position]}
                                                        </span>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                    {match.isFullyBooked ? (
                                        <span className="main-board__match-full-badge">모집완료</span>
                                    ) : null}
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
        padding: '10px 20px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '700',
        fontSize: '14px',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
        transition: 'all 0.2s ease',
    },
    secondaryBtn: {
        padding: '10px 20px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
    },
};

export default MainBoard;
