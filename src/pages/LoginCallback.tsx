import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const LoginCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    //  중요: 요청을 보냈는지 체크하는 변수 (화면이 그려져도 초기화 안 됨)
    const hasFetched = useRef(false);

    useEffect(() => {
        const code = searchParams.get('code');

        // 1. 코드가 없거나, 이미 요청을 보낸 상태면 아무것도 하지 않음 (중복 방지)
        if (!code || hasFetched.current) return;

        // 2. "나 이제 요청 보낸다!" 라고 표시
        hasFetched.current = true;

        const login = async () => {
            try {
                console.log("백엔드로 인가 코드 전송:", code);

                const response = await axios.post('http://localhost:8080/api/auth/kakao', {
                    code: code,
                });

                // 성공 시
                console.log("로그인 성공 응답:", response.data);
                const { accessToken } = response.data;

                localStorage.setItem('accessToken', accessToken);
                alert('로그인 성공! 환영합니다.');

                // 메인 페이지로 이동
                navigate('/', { replace: true });

            } catch (error) {
                console.error("로그인 실패:", error);
                alert("로그인 처리에 실패했습니다. 다시 시도해주세요.");
                navigate('/login', { replace: true });
            }
        };

        login();

    }, [searchParams, navigate]);

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <h2>로그인 처리 중입니다...</h2>
            <p>잠시만 기다려주세요.</p>
        </div>
    );
};

export default LoginCallback;