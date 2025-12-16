// mercenary-frontend/src/components/MatchDetail.tsx

import React, { useState } from 'react';

interface ApiResponse {
    code: number;
    message: string;
}

// 💡 [핵심] onApplySuccess (갱신 함수)를 받도록 타입 정의 추가
interface MatchDetailProps {
    matchId: number;
    onApplySuccess: () => void; // 부모가 내려준 함수
}

const MatchDetail: React.FC<MatchDetailProps> = ({ matchId, onApplySuccess }) => {
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleApply = async () => {
        setIsLoading(true);
        setStatusMessage('신청 처리 중...');

        // [Mock User ID] 테스트용 ID
        const mockUserId = 100;

        const url = `/api/matches/${matchId}/apply`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: mockUserId }),
            });

            const jsonResponse: ApiResponse = await response.json();

            if (jsonResponse.code === 200) {
                setStatusMessage(`✅ 신청 성공!`);

                // 💡 [핵심] 신청 성공 시 부모에게 알려서 목록/지도 갱신
                onApplySuccess();

            } else if (jsonResponse.code === 400) {
                setStatusMessage(`❌ 신청 실패: ${jsonResponse.message}`);
            } else {
                setStatusMessage(`⚠️ 오류: ${jsonResponse.message}`);
            }

        } catch (err) {
            setStatusMessage('서버 통신 중 오류가 발생했습니다.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', border: '2px solid #007bff', borderRadius: '8px', marginTop: '20px', backgroundColor: '#f0f8ff' }}>
            <h3>⚽ 매치 신청 테스트 (Redisson Lock 검증)</h3>
            <p>아래 버튼을 누르면 <strong>{matchId}번 매치</strong>에 선착순 신청을 시도합니다.</p>

            <button
                onClick={handleApply}
                disabled={isLoading}
                style={{
                    padding: '12px 24px',
                    backgroundColor: isLoading ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}
            >
                {isLoading ? '처리 중...' : '지금 용병 신청하기'}
            </button>

            {statusMessage && <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '1.1em' }}>{statusMessage}</p>}
        </div>
    );
};

export default MatchDetail;