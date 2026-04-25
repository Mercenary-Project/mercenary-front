import React from 'react';
import { POSITION_LABEL, type PositionSlot } from '../types/match';

interface Match {
    matchId: number;
    placeName: string;
    district: string;
    matchDate: string;
    distance: number;
    latitude: number;
    longitude: number;
    slots?: PositionSlot[];
    isFullyBooked?: boolean;
}

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
            <h2>내 주변 매치 목록</h2>
            {matches.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>주변 10km 이내에 조회된 매치가 없습니다.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {matches.map((match) => {
                        const availableSlots = match.slots?.filter(s => s.available > 0) ?? [];
                        return (
                            <li key={match.matchId} style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '15px',
                                margin: '10px 0',
                                backgroundColor: '#fff',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
                                        {match.placeName}
                                        <span style={{ fontSize: '0.8em', color: '#666', fontWeight: 'normal', marginLeft: '10px' }}>
                                            ({match.district})
                                        </span>
                                    </h3>
                                    {match.isFullyBooked && (
                                        <span style={{
                                            fontSize: '12px', fontWeight: 700, color: '#64748b',
                                            background: '#f1f5f9', border: '1px solid #e2e8f0',
                                            borderRadius: '10px', padding: '3px 10px', whiteSpace: 'nowrap',
                                        }}>
                                            모집완료
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.9em', color: '#555', marginBottom: '8px' }}>
                                    📅 {new Date(match.matchDate).toLocaleString()}
                                </div>
                                {availableSlots.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {availableSlots.map(s => (
                                            <span key={s.position} style={{
                                                fontSize: '11px', fontWeight: 700, color: '#047857',
                                                background: '#f0fdf4', border: '1px solid #bbf7d0',
                                                borderRadius: '6px', padding: '2px 7px',
                                            }}>
                                                {POSITION_LABEL[s.position]}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <p style={{ fontWeight: 'bold', color: '#007bff', marginTop: '8px', marginBottom: 0 }}>
                                    📍 거리: {match.distance.toFixed(2)} km
                                </p>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default MatchList;