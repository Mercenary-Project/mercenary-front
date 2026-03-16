import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { extractAccessToken, setAccessToken } from '../utils/auth';
import { buildApiUrl } from '../utils/api';

const LoginCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const hasFetched = useRef(false);

    useEffect(() => {
        const code = searchParams.get('code');

        if (!code || hasFetched.current) {
            return;
        }

        hasFetched.current = true;

        const login = async () => {
            try {
                const response = await axios.post(buildApiUrl('/api/auth/kakao'), { code });
                const accessToken = extractAccessToken(response.data);

                if (!accessToken) {
                    throw new Error('kakao login response does not include accessToken');
                }

                setAccessToken(accessToken);
                alert('로그인에 성공했습니다.');
                navigate('/', { replace: true });
            } catch (error) {
                console.error('login callback failed:', error);
                alert('로그인 처리에 실패했습니다. 백엔드 응답 형식을 확인해 주세요.');
                navigate('/login', { replace: true });
            }
        };

        void login();
    }, [navigate, searchParams]);

    return (
        <div
            style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <h2>로그인 처리 중입니다...</h2>
            <p>잠시만 기다려 주세요.</p>
        </div>
    );
};

export default LoginCallback;
