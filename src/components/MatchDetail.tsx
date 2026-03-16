import React, { useState } from 'react';
import { buildApiUrl } from '../utils/api';

interface ApiResponse {
    code?: number;
    message: string;
}

interface MatchDetailProps {
    matchId: number;
    onApplySuccess: () => void;
}

const MatchDetail: React.FC<MatchDetailProps> = ({ matchId, onApplySuccess }) => {
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleApply = async () => {
        const token = localStorage.getItem('accessToken');

        if (!token) {
            setStatusMessage('로그인해야 신청할 수 있습니다.');
            return;
        }

        setIsLoading(true);
        setStatusMessage('신청 처리 중...');

        try {
            const response = await fetch(buildApiUrl(`/api/matches/${matchId}/apply`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const jsonResponse: ApiResponse | null = await response.json().catch(() => null);

            if (response.ok) {
                setStatusMessage(jsonResponse?.message || '신청이 완료되었습니다.');
                onApplySuccess();
            } else {
                setStatusMessage(`신청 실패: ${jsonResponse?.message || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error(error);
            setStatusMessage('서버 통신 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            style={{
                padding: '20px',
                border: '2px solid #007bff',
                borderRadius: '8px',
                marginTop: '20px',
                backgroundColor: '#f0f8ff',
            }}
        >
            <h3>매치 신청 테스트</h3>
            <p>
                아래 버튼을 누르면 <strong>{matchId}번 매치</strong>에 참가 신청을 시도합니다.
            </p>

            <button
                onClick={handleApply}
                disabled={isLoading}
                style={{
                    padding: '12px 24px',
                    backgroundColor: isLoading ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                }}
            >
                {isLoading ? '처리 중...' : '지금 용병 신청하기'}
            </button>

            {statusMessage ? <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '1.1em' }}>{statusMessage}</p> : null}
        </div>
    );
};

export default MatchDetail;
