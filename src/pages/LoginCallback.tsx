import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { extractAccessToken, setAccessToken } from '../utils/auth';
import { KAKAO_CODE_EXCHANGE_ENDPOINT } from '../utils/api';

const getHashParams = () => new URLSearchParams(window.location.hash.replace(/^#/, ''));

const getFirstParam = (searchParams: URLSearchParams, hashParams: URLSearchParams, keys: string[]) => {
    for (const key of keys) {
        const value = searchParams.get(key) ?? hashParams.get(key);

        if (value) {
            return value;
        }
    }

    return null;
};

const LoginCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const hasHandled = useRef(false);

    useEffect(() => {
        if (hasHandled.current) {
            return;
        }

        hasHandled.current = true;

        const hashParams = getHashParams();
        const authError = getFirstParam(searchParams, hashParams, ['error_description', 'error']);
        const directAccessToken = getFirstParam(searchParams, hashParams, ['accessToken', 'token']);
        const code = getFirstParam(searchParams, hashParams, ['code']);

        const handleCallback = async () => {
            try {
                if (authError) {
                    throw new Error(authError);
                }

                if (directAccessToken) {
                    setAccessToken(directAccessToken);
                    alert('로그인에 성공했습니다.');
                    navigate('/', { replace: true });
                    return;
                }

                if (!code) {
                    throw new Error('로그인에 필요한 인증 정보가 없습니다.');
                }

                const response = await axios.post(KAKAO_CODE_EXCHANGE_ENDPOINT, { code });
                const accessToken = extractAccessToken(response.data);

                if (!accessToken) {
                    throw new Error('kakao login response does not include accessToken');
                }

                setAccessToken(accessToken);
                alert('로그인에 성공했습니다.');
                navigate('/', { replace: true });
            } catch (error) {
                console.error('login callback failed:', error);
                alert(error instanceof Error ? error.message : '로그인 처리에 실패했습니다. 백엔드 응답을 확인해주세요.');
                navigate('/login', { replace: true });
            }
        };

        void handleCallback();
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
