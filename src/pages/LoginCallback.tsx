// src/pages/LoginCallback.tsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LoginCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');

    useEffect(() => {
        if (code) {
            // 1. 백엔드에 인증 코드 전달
            fetch('/api/auth/kakao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.accessToken) {
                        // 2. 받은 JWT를 브라우저에 저장
                        localStorage.setItem('accessToken', data.accessToken);
                        console.log('✅ 로그인 성공! JWT 저장 완료');
                        // 3. 메인 페이지로 이동
                        navigate('/');
                    }
                })
                .catch((err) => {
                    console.error('❌ 로그인 요청 실패:', err);
                    alert('로그인에 실패했습니다.');
                    navigate('/login');
                });
        }
    }, [code, navigate]);

    return (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <h2>로그인 처리 중입니다... ⚽</h2>
            <p>잠시만 기다려 주세요.</p>
        </div>
    );
};

export default LoginCallback;