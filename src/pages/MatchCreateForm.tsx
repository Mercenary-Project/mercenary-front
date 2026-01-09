import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MatchCreateForm: React.FC = () => {
    const navigate = useNavigate();

    // 1. 입력값을 저장할 변수들 (State)
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [matchDate, setMatchDate] = useState('');
    const [maxPlayerCount, setMaxPlayerCount] = useState(12); // 기본 12명

    // 2. 서버로 데이터 보내는 함수
    const handleSubmit = async () => {
        // 토큰 가져오기 (로그인 안 했으면 튕겨내기)
        const token = localStorage.getItem('accessToken');
        if (!token) {
            alert("로그인이 필요합니다.");
            return;
        }

        // 유효성 검사
        if (!title || !matchDate || !content) {
            alert("제목, 날짜, 내용은 필수입니다.");
            return;
        }

        // 전송할 데이터 뭉치기 (DTO와 모양이 같아야 함)
        const requestData = {
            title: title,
            content: content,
            matchDate: matchDate + ":00", // 초 단위(:00)가 없으면 에러 날 수 있어서 붙임
            maxPlayerCount: Number(maxPlayerCount),

            // 🔥 중요: 아직 지도 기능이 없으므로 '잠실' 좌표를 강제로 넣어서 테스트합니다.
            placeName: "잠실 풋살장 (테스트)",
            fullAddress: "서울 송파구 올림픽로 25",
            district: "송파구",
            latitude: 37.512257,
            longitude: 127.100222
        };

        try {
            const response = await fetch('/api/matches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token // 헤더에 토큰 탑승!
                },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                alert("매치 등록 성공!");
                navigate('/'); // 메인 화면으로 이동
            } else {
                const errorData = await response.json();
                alert("등록 실패: " + (errorData.message || "알 수 없는 오류"));
            }
        } catch (error) {
            console.error("에러 발생:", error);
            alert("서버 연결 실패");
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>새 매치 등록하기</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>용병을 구하거나 팀을 찾기 위한 글을 작성하세요.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* 제목 입력 */}
                <input
                    type="text"
                    placeholder="제목 (예: 6vs6 풋살 용병 구합니다)"
                    style={{ padding: '12px', fontSize: '16px' }}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                {/* 날짜 입력 */}
                <input
                    type="datetime-local"
                    style={{ padding: '12px', fontSize: '16px' }}
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                />

                {/* 인원 수 입력 (추가함) */}
                <input
                    type="number"
                    placeholder="모집 인원 (기본 12명)"
                    style={{ padding: '12px', fontSize: '16px' }}
                    value={maxPlayerCount}
                    onChange={(e) => setMaxPlayerCount(Number(e.target.value))}
                />

                {/* 내용 입력 */}
                <textarea
                    placeholder="상세 내용 (실력, 준비물 등)"
                    rows={5}
                    style={{ padding: '12px', fontSize: '16px' }}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    {/* 등록 버튼에 onClick 연결 */}
                    <button
                        onClick={handleSubmit}
                        style={{ flex: 1, padding: '15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
                        등록하기
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        style={{ flex: 1, padding: '15px', backgroundColor: '#ddd', color: 'black', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
                    >
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchCreateForm;