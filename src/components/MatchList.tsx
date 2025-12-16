// mercenary-frontend/src/components/MatchList.tsx

import React from 'react';

// 💡 [핵심] App.tsx의 Match 인터페이스와 구조를 맞춰야 에러가 안 납니다.
interface Match {
    matchId: number;
    placeName: string;
    district: string;
    matchDate: string;
    maxPlayerCount: number;
    currentPlayerCount: number;
    distance: number;
    latitude: number;  // App.tsx와 통일
    longitude: number; // App.tsx와 통일
}

// 💡 [핵심] 부모로부터 받을 Props 정의 (이게 없어서 오류가 났던 것)
interface MatchListProps {
    matches: Match[];
    loading: boolean;
    error: string | null;
}

const MatchList: React.FC<MatchListProps> = ({ matches, loading, error }) => {

    if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>매치 목록을 불러오는 중...</div>;
    if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>에러: {error}</div>;

    return (
        <div>
            <h2>🔥 내 주변 매치 목록 (텍스트 뷰)</h2>
            {matches.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>주변 10km 이내에 조회된 매치가 없습니다.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {matches.map((match) => (
                        <li key={match.matchId} style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '15px',
                            margin: '10px 0',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                                {match.placeName}
                                <span style={{ fontSize: '0.8em', color: '#666', fontWeight: 'normal', marginLeft: '10px' }}>
                                    ({match.district})
                                </span>
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#555' }}>
                                <span>📅 {new Date(match.matchDate).toLocaleString()}</span>
                                <span>👥 {match.currentPlayerCount} / {match.maxPlayerCount}명</span>
                            </div>
                            <p style={{ fontWeight: 'bold', color: '#007bff', marginTop: '10px' }}>
                                📍 거리: {match.distance.toFixed(2)} km
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MatchList;