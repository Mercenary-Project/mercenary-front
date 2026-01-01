import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchMap from '../components/MatchMap';
import MatchList from '../components/MatchList';

const MainBoard: React.FC = () => {
    const navigate = useNavigate();

    // 1. 가짜 데이터 (Mock Data)
    // MatchList.tsx가 요구하는 모든 필드(maxPlayerCount, currentPlayerCount, distance)를 추가했습니다.
    const [matches] = useState([
        {
            matchId: 1,
            title: "잠실 풋살 6vs6 하실 분!",
            matchDate: "2024-05-20T19:00:00", // 날짜+시간 포맷
            matchTime: "19:00",
            placeName: "잠실 풋살장",
            district: "송파구",
            latitude: 37.512257,
            longitude: 127.100222,

            // 🔥 여기 3개가 빠져서 에러가 났던 겁니다! 추가 완료!
            maxPlayerCount: 12,
            currentPlayerCount: 10,
            distance: 2.5,

            fullAddress: "서울시 송파구 올림픽로 25",
            content: "초보도 환영합니다.",
            viewCount: 0,
            chatCount: 0,
            status: "RECRUITING"
        },
        {
            matchId: 2,
            title: "강남역 축구 용병 급구",
            matchDate: "2024-05-21T10:00:00",
            matchTime: "10:00",
            placeName: "강남역 인근",
            district: "강남구",
            latitude: 37.497942,
            longitude: 127.027621,

            // 🔥 두 번째 데이터에도 추가 완료!
            maxPlayerCount: 11,
            currentPlayerCount: 1,
            distance: 0.8,

            fullAddress: "서울시 강남구 강남대로",
            content: "골키퍼 보시는 분 환영합니다.",
            viewCount: 5,
            chatCount: 2,
            status: "RECRUITING"
        }
    ]);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        navigate('/login');
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* 상단 헤더 */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', margin: 0 }}>⚽ 용병 구하기</h1>
                <div>
                    <button
                        onClick={() => navigate('/match/create')}
                        style={{ marginRight: '10px', padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        + 매치 등록
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{ padding: '10px 15px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        로그아웃
                    </button>
                </div>
            </header>

            {/* 메인 컨텐츠 영역 */}
            <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                {/* 1. 지도 영역 */}
                <div style={{ height: '400px', backgroundColor: '#f0f0f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <MatchMap matches={matches} />
                </div>

                {/* 2. 리스트 영역 */}
                <div>
                    <MatchList matches={matches} loading={false} error={null} />
                </div>
            </div>
        </div>
    );
};

export default MainBoard;