// mercenary-frontend/src/components/MatchDetail.tsx

import React, { useState } from 'react';

// API 응답의 Message만 받음
interface ApiResponse {
    code: number;
    message: string;
}

// MatchList에서 매치 ID를 프롭스로 받는다고 가정
interface MatchDetailProps {
    matchId: number;
}

const MatchDetail: React.FC<MatchDetailProps> = ({ matchId }) => {
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // [핵심] Redisson 락이 적용된 API 호출
    const handleApply = async () => {
        setIsLoading(true);
        setStatusMessage('신청 처리 중...');

        // 💡 [Mock User ID] 실제 로그인 대신 임시 사용자 ID (100)를 사용합니다.
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

            // 200 OK (성공), 400 Bad Request (실패: 마감/중복)
            if (jsonResponse.code === 200) {
                setStatusMessage(` 신청 성공! 현재 인원수가 변경되었는지 확인하세요.`);
            } else if (jsonResponse.code === 400) {
                // Global Exception Handler가 처리한 '정원 마감' 등의 메시지
                setStatusMessage(` 신청 실패: ${jsonResponse.message}`);
            } else {
                setStatusMessage(`알 수 없는 오류: ${jsonResponse.message}`);
            }

        } catch (err) {
            setStatusMessage('서버 통신 중 오류가 발생했습니다.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '15px', border: '1px solid #ddd', marginTop: '20px' }}>
            <h3>{matchId}번 매치 신청</h3>
            <p>⚠️ 주의: 이 버튼은 백엔드의 분산 락 로직을 호출합니다.</p>

            <button
                onClick={handleApply}
                disabled={isLoading}
                style={{ padding: '10px 20px', backgroundColor: isLoading ? '#ccc' : '#007bff', color: 'white', border: 'none' }}
            >
                {isLoading ? '처리 중...' : '용병 신청하기'}
            </button>

            {statusMessage && <p style={{ marginTop: '10px', fontWeight: 'bold' }}>{statusMessage}</p>}
        </div>
    );
};

export default MatchDetail;