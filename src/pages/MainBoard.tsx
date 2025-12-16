// src/pages/MainBoard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // 로그아웃용
import MatchList from '../components/MatchList';
import MatchDetail from '../components/MatchDetail';
import MatchCreateForm from '../components/MatchCreateForm';
import MatchMap from '../components/MatchMap';

export interface Match {
    matchId: number; placeName: string; district: string;
    matchDate: string; maxPlayerCount: number; currentPlayerCount: number;
    distance: number; latitude: number; longitude: number;
}

const MainBoard: React.FC = () => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMatches = useCallback(async () => {
        setLoading(true);
        const myLatitude = 37.500000;
        const myLongitude = 127.030000;
        const distanceKm = 10;
        const url = `/api/matches/nearby?latitude=${myLatitude}&longitude=${myLongitude}&distanceKm=${distanceKm}`;

        try {
            const response = await fetch(url);
            const jsonResponse = await response.json();
            if (jsonResponse.code === 200) {
                setMatches(jsonResponse.data);
                setError(null);
            } else {
                setMatches([]);
                if(jsonResponse.code !== 200) setError(jsonResponse.message);
            }
        } catch (err) {
            setError('서버 연결에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMatches(); }, [fetchMatches]);

    // 로그아웃 처리
    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        navigate('/login');
    };

    const isLoggedIn = !!localStorage.getItem('accessToken');

    return (
        <div className="app-container">
            <header className="app-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1>⚽ Mercenary</h1>
                    {isLoggedIn ? (
                        <button onClick={handleLogout} className="logout-btn">로그아웃</button>
                    ) : (
                        <button onClick={() => navigate('/login')} className="login-btn">로그인</button>
                    )}
                </div>
                <p>위치 기반 실시간 용병 매칭 서비스</p>
            </header>

            <main>
                <section className="section-container"><MatchCreateForm onMatchCreated={fetchMatches} /></section>
                <hr className="section-divider" />
                <section className="section-container"><MatchMap matches={matches} /></section>
                <section className="section-container"><MatchList matches={matches} loading={loading} error={error} /></section>
                <hr className="section-divider" />
                <section className="section-container"><MatchDetail matchId={1} onApplySuccess={fetchMatches} /></section>
            </main>
        </div>
    );
};

export default MainBoard;