

import React, { useState, useEffect } from 'react';

// 백엔드 MatchSearchResponseDto와 동일한 구조
interface Match {
    matchId: number;
    placeName: string;
    district: string;
    matchDate: string;
    maxPlayerCount: number;
    currentPlayerCount: number;
    distance: number; // Redis Geo 검색 결과의 핵심
}

const MatchList: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // [핵심] GET /api/matches/nearby API 호출
        const fetchMatches = async () => {
            // 서울 강남구 기준 좌표 (테스트를 위해 하드코딩)
            const testLatitude = 37.500000;
            const testLongitude = 127.030000;
            const distanceKm = 5;

            const url = `/api/matches/nearby?latitude=${testLatitude}&longitude=${testLongitude}&distanceKm=${distanceKm}`;

            try {
                const response = await fetch(url);

                // 전역 예외 처리기가 반환하는 표준 JSON 응답을 가정
                const jsonResponse = await response.json();

                if (jsonResponse.code === 200) {
                    setMatches(jsonResponse.data);
                } else {
                    // 백엔드의 GlobalExceptionHandler가 처리한 에러 메시지
                    setError(jsonResponse.message || '매치 목록을 불러오지 못했습니다.');
                }

            } catch (err) {
                setError('서버 연결에 실패했습니다.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
    }, []);

    if (loading) return <div>매치 목록을 불러오는 중...</div>;
    if (error) return <div style={{ color: 'red' }}>에러: {error}</div>;

    return (
        <div>
            <h2>🔥 내 주변 5km 매치 목록 (Redis Geo 검색)</h2>
            {matches.length === 0 ? (
                <p>주변에 매치가 없습니다.</p>
            ) : (
                <ul>
                    {matches.map((match) => (
                        <li key={match.matchId} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
                            <h3>{match.placeName} ({match.district})</h3>
                            <p>날짜: {new Date(match.matchDate).toLocaleString()}</p>
                            <p>인원: {match.currentPlayerCount} / {match.maxPlayerCount}</p>
                            <p style={{ fontWeight: 'bold' }}>거리: {match.distance.toFixed(2)} km</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MatchList;