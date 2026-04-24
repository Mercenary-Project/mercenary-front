import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { extractAccessToken, setAccessToken } from '../utils/auth';
import { DEV_LOGIN_ENDPOINT, KAKAO_LOGIN_URL } from '../utils/api';

const DEV_LOGIN_USERS = [
    { kakaoId: 1001, nickname: 'test-user-1', label: '테스트 계정 1로 로그인' },
    { kakaoId: 1002, nickname: 'test-user-2', label: '테스트 계정 2로 로그인' },
] as const;

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
        return '백엔드에서 403을 반환했습니다. dev-login 활성화 여부 또는 카카오 설정 값을 확인해 주세요.';
    }

    if (error.code === 'ERR_NETWORK') {
        return '네트워크 요청에 실패했습니다. 프록시 또는 백엔드 서버 상태를 확인해 주세요.';
    }

    return fallback;
};

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isDevLoggingIn, setIsDevLoggingIn] = useState<string | null>(null);
    const isDevMode = import.meta.env.DEV;
    const isKakaoLoginReady = KAKAO_LOGIN_URL.length > 0;

    const handleKakaoLogin = () => {
        if (!isKakaoLoginReady) {
            alert('카카오 로그인 환경변수가 없습니다. VITE_KAKAO_REST_API_KEY, VITE_KAKAO_REDIRECT_URI 값을 확인해 주세요.');
            return;
        }

        window.location.assign(KAKAO_LOGIN_URL);
    };

    const handleDevLogin = async (user: (typeof DEV_LOGIN_USERS)[number]) => {
        if (!isDevMode || isDevLoggingIn) {
            return;
        }

        setIsDevLoggingIn(user.nickname);

        try {
            const response = await axios.post(DEV_LOGIN_ENDPOINT, {
                kakaoId: user.kakaoId,
                nickname: user.nickname,
            });
            const accessToken = extractAccessToken(response.data);

            if (!accessToken) {
                throw new Error('dev-login 응답에 accessToken이 없습니다.');
            }

            setAccessToken(accessToken);
            alert(`${user.nickname} 계정으로 로그인했습니다.`);
            navigate('/', { replace: true });
        } catch (error) {
            console.error('dev-login failed:', error);
            alert(getAxiosErrorMessage(error, '개발용 테스트 로그인에 실패했습니다.'));
        } finally {
            setIsDevLoggingIn(null);
        }
    };

    return (
        <div style={styles.page}>
            <div className="page-shell" style={styles.shell}>
                <div style={styles.loginBox}>
                    <h1 style={styles.title}>Mercenary</h1>
                    <p style={styles.subtitle}>로컬 테스트용 로그인 방식을 선택해 주세요.</p>

                    <button
                        type="button"
                        onClick={handleKakaoLogin}
                        style={{
                            ...styles.kakaoBtn,
                            opacity: isKakaoLoginReady ? 1 : 0.55,
                            cursor: isKakaoLoginReady ? 'pointer' : 'not-allowed',
                        }}
                        disabled={!isKakaoLoginReady}
                    >
                        <span style={styles.kakaoIcon}>K</span>
                        카카오로 시작하기
                    </button>

                    {!isKakaoLoginReady ? (
                        <p style={styles.warningText}>
                            `VITE_KAKAO_LOGIN_URL` 또는 `VITE_KAKAO_REST_API_KEY` / `VITE_KAKAO_REDIRECT_URI`
                            설정이 필요합니다.
                        </p>
                    ) : null}

                    {isDevMode ? (
                        <div style={styles.devPanel}>
                            <div style={styles.devPanelHeader}>
                                <strong style={styles.devTitle}>개발용 테스트 로그인</strong>
                                <span style={styles.devBadge}>DEV ONLY</span>
                            </div>
                            <p style={styles.devDescription}>
                                로컬에서 카카오 로그인이 불안정하면 아래 테스트 계정으로 바로 로그인할 수 있습니다.
                            </p>

                            <div style={styles.devButtonGroup}>
                                {DEV_LOGIN_USERS.map((user) => (
                                    <button
                                        key={user.nickname}
                                        type="button"
                                        style={styles.devLoginBtn}
                                        onClick={() => void handleDevLogin(user)}
                                        disabled={isDevLoggingIn !== null}
                                    >
                                        {isDevLoggingIn === user.nickname ? '로그인 중...' : user.label}
                                    </button>
                                ))}
                            </div>

                            <p style={styles.devHint}>
                                개발용 로그인 엔드포인트: <code>{DEV_LOGIN_ENDPOINT}</code>
                            </p>
                            <p style={styles.devHint}>
                                카카오 인증 URL: <code>{KAKAO_LOGIN_URL || '미설정'}</code>
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)',
    },
    shell: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginBox: {
        width: '100%',
        maxWidth: '440px',
        padding: '40px 32px',
        borderRadius: '20px',
        backgroundColor: '#ffffff',
        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)',
        textAlign: 'center',
        border: '1px solid #dbe2ea',
    },
    title: {
        margin: '0 0 12px 0',
        color: '#0f172a',
        fontSize: '32px',
        lineHeight: 1.2,
    },
    subtitle: {
        color: '#64748b',
        margin: '0 0 28px 0',
        fontSize: '15px',
    },
    kakaoBtn: {
        width: '100%',
        padding: '14px 16px',
        backgroundColor: '#FEE500',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: 700,
        color: '#3C1E1E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
    },
    kakaoIcon: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '26px',
        height: '26px',
        borderRadius: '999px',
        backgroundColor: 'rgba(60, 30, 30, 0.12)',
        fontSize: '14px',
        fontWeight: 800,
    },
    warningText: {
        margin: '12px 0 0 0',
        color: '#b45309',
        fontSize: '13px',
        lineHeight: 1.5,
        textAlign: 'left',
    },
    devPanel: {
        marginTop: '20px',
        padding: '18px',
        borderRadius: '14px',
        border: '1px dashed #94a3b8',
        backgroundColor: '#f8fafc',
        textAlign: 'left',
    },
    devPanelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
    },
    devTitle: {
        color: '#0f172a',
        fontSize: '14px',
    },
    devBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: '999px',
        backgroundColor: '#dbeafe',
        color: '#1d4ed8',
        fontSize: '11px',
        fontWeight: 700,
    },
    devDescription: {
        margin: '10px 0 14px 0',
        color: '#64748b',
        fontSize: '13px',
        lineHeight: 1.5,
    },
    devButtonGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    devLoginBtn: {
        width: '100%',
        padding: '12px 14px',
        borderRadius: '10px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 700,
    },
    devHint: {
        margin: '12px 0 0 0',
        color: '#64748b',
        fontSize: '12px',
        lineHeight: 1.5,
        wordBreak: 'break-all',
    },
};

export default Login;
