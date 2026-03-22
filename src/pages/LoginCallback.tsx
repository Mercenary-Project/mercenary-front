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

const getAxiosErrorMessage = (error: unknown, fallback: string) => {
    if (!axios.isAxiosError(error)) {
        return fallback;
    }

    const responseMessage =
        error.response?.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
            ? error.response.data.message
            : '';

    if (responseMessage) {
        return responseMessage;
    }

    if (error.response?.status === 403) {
        return '백엔드에서 403을 반환했습니다. 카카오 client_id 또는 redirect_uri 설정 불일치를 확인해 주세요.';
    }

    if (error.code === 'ERR_NETWORK') {
        return '네트워크 오류가 발생했습니다. 프록시 또는 백엔드 서버 상태를 확인해 주세요.';
    }

    return fallback;
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
                    throw new Error('카카오 로그인 응답에 accessToken이 없습니다.');
                }

                setAccessToken(accessToken);
                alert('로그인에 성공했습니다.');
                navigate('/', { replace: true });
            } catch (error) {
                console.error('login callback failed:', error);
                alert(getAxiosErrorMessage(error, '로그인 처리에 실패했습니다. 백엔드 응답을 확인해 주세요.'));
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
