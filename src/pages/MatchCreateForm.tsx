import React from 'react';
import { useNavigate } from 'react-router-dom';
// import ReactDaumPostcode from 'react-daum-postcode'; // 나중에 주소 찾기 할 때 주석 해제

const MatchCreateForm: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>새 매치 등록하기</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>용병을 구하거나 팀을 찾기 위한 글을 작성하세요.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input type="text" placeholder="제목 (예: 6vs6 풋살 용병 구합니다)" style={{ padding: '12px', fontSize: '16px' }} />
                <input type="datetime-local" style={{ padding: '12px', fontSize: '16px' }} />
                <textarea placeholder="상세 내용 (실력, 준비물 등)" rows={5} style={{ padding: '12px', fontSize: '16px' }} />

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button style={{ flex: 1, padding: '15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
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