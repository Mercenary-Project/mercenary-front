import React, { useState } from 'react';
import Postcode from 'react-daum-postcode'; // 주소 검색 라이브러리
import './MatchCreateForm.css'; // 스타일 파일

// Kakao Maps API 타입 우회 선언 (ESLint 오류 방지 포함)
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao: any;
    }
}

interface ApiResponse {
    code: number;
    message: string;
    data: number | null;
}

interface MatchCreateFormProps {
    onMatchCreated: () => void; // 생성 성공 시 목록 갱신 함수
}

// 초기 폼 데이터
const initialFormData = {
    writerId: 1,
    city: '',
    district: '',
    neighborhood: '', // 주소 검색으로 자동 입력
    placeName: '',
    longitude: 0,   // Geocoding으로 자동 입력
    latitude: 0,    // Geocoding으로 자동 입력
    matchDate: new Date(Date.now() + 3600000).toISOString().substring(0, 16), // 1시간 후
    maxPlayerCount: 10,
    description: '용병 모집 설명입니다. 많은 참여 바랍니다.',
};

const MatchCreateForm: React.FC<MatchCreateFormProps> = ({ onMatchCreated }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isPostcodeOpen, setIsPostcodeOpen] = useState(false); // 주소 검색 팝업 상태

    // 1. 주소 검색 완료 핸들러
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddressComplete = (data: any) => {
        setIsPostcodeOpen(false); // 팝업 닫기

        // 도로명 주소 또는 지번 주소 가져오기
        const fullAddress = data.roadAddress || data.jibunAddress;

        // 주소 파싱 (시/구/동)
        const addressParts = fullAddress.split(' ');

        setFormData(prev => ({
            ...prev,
            city: addressParts[0] || '',
            district: addressParts[1] || '',
            neighborhood: addressParts[2] || '',
            placeName: data.buildingName || fullAddress, // 건물명이 있으면 사용
        }));

        // 2. 좌표 변환 실행 (Geocoding)
        geocodeAddress(fullAddress);
    };

    // 주소 -> 좌표(위도/경도) 변환 함수
    const geocodeAddress = (address: string) => {
        if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
            setStatusMessage('⚠️ 카카오 지도 SDK가 로드되지 않았습니다.');
            return;
        }

        const geocoder = new window.kakao.maps.services.Geocoder();

        geocoder.addressSearch(address,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (result: any, status: any) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    const { x: longitude, y: latitude } = result[0];

                    setFormData(prev => ({
                        ...prev,
                        longitude: parseFloat(longitude),
                        latitude: parseFloat(latitude),
                    }));
                    setStatusMessage(`✅ 주소 검색 완료: 위도 ${latitude}, 경도 ${longitude}`);
                } else {
                    setStatusMessage('⚠️ 주소를 좌표로 변환하는 데 실패했습니다.');
                }
            }
        );
    };

    // 입력값 변경 핸들러
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let finalValue: any = value;

        if (type === 'number') {
            finalValue = parseInt(value) || 0;
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    // 폼 제출 (API 호출)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.city || !formData.longitude || !formData.description) {
            setStatusMessage('❌ 주소 검색, 장소 이름, 설명은 필수입니다.');
            return;
        }

        setIsLoading(true);
        setStatusMessage('매치 생성 요청 중...');

        try {
            const response = await fetch('/api/matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const jsonResponse: ApiResponse = await response.json();
                setStatusMessage(`✅ 매치 생성 성공! ID: ${jsonResponse.data}. 목록 갱신됨.`);
                onMatchCreated(); // 목록 새로고침
                setFormData(initialFormData); // 폼 초기화
            } else {
                const jsonErrorResponse = await response.json();
                setStatusMessage(`⚠️ 오류: ${jsonErrorResponse.message || response.statusText}`);
            }
        } catch (err) {
            setStatusMessage('서버 통신 중 오류가 발생했습니다.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="match-create-form-container">
            <h2>⚽ 용병 매치 생성</h2>
            <form onSubmit={handleSubmit} className="match-form">

                {/* 주소 검색 영역 */}
                <div className="form-group address-group">
                    <label>장소 주소:</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={`${formData.city} ${formData.district} ${formData.neighborhood}`}
                            placeholder="주소 검색 버튼을 눌러주세요"
                            readOnly
                            className="address-display"
                        />
                        <button
                            type="button"
                            onClick={() => setIsPostcodeOpen(true)}
                            className="search-button"
                            disabled={isLoading}
                        >
                            주소 검색
                        </button>
                    </div>

                    {isPostcodeOpen && (
                        <div className="postcode-popup">
                            <Postcode
                                onComplete={handleAddressComplete}
                                autoClose={false}
                                style={{ height: '100%' }}
                            />
                            <button
                                type="button"
                                onClick={() => setIsPostcodeOpen(false)}
                                className="close-popup-button"
                            >
                                닫기
                            </button>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label>장소 이름:</label>
                    <input name="placeName" value={formData.placeName} onChange={handleChange} placeholder="예: 강남 풋살장" required disabled={isLoading} />
                </div>

                {/* 위도/경도 (숨김 처리 또는 디버깅용 표시) */}
                <div className="form-group hidden-geo">
                    <p>Lat: {formData.latitude} / Lng: {formData.longitude}</p>
                </div>

                <div className="form-group">
                    <label>경기 날짜/시간:</label>
                    <input type="datetime-local" name="matchDate" value={formData.matchDate} onChange={handleChange} required disabled={isLoading} />
                </div>

                <div className="form-group">
                    <label>최대 인원:</label>
                    <input type="number" name="maxPlayerCount" value={formData.maxPlayerCount} onChange={handleChange} min="2" max="22" required disabled={isLoading} />
                </div>

                <div className="form-group">
                    <label>설명:</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} required disabled={isLoading} />
                </div>

                <button type="submit" disabled={isLoading || formData.longitude === 0} className="submit-button">
                    {isLoading ? '생성 중...' : '매치 생성 등록'}
                </button>
            </form>

            {statusMessage && <p className="status-message">{statusMessage}</p>}
        </div>
    );
};

export default MatchCreateForm;