import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../components/MatchCreateForm.css';
import { extractResponseData, extractResponseMessage, formatDateTimeLocalValue, type MatchSummary } from '../utils/matchApi';
import { getAccessToken } from '../utils/auth';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao: any;
    }
}

type EditableMatchDetail = MatchSummary & {
    fullAddress?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
};

const DEFAULT_LATITUDE = 37.5665;
const DEFAULT_LONGITUDE = 126.978;

const inferDistrict = (district?: string, fullAddress?: string) => {
    if (district?.trim()) {
        return district.trim();
    }

    const source = fullAddress?.trim();

    if (!source) {
        return '';
    }

    return source.split(' ')[1] ?? source;
};

const MatchCreateForm: React.FC = () => {
    const navigate = useNavigate();
    const { matchId } = useParams<{ matchId?: string }>();
    const mapContainer = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markerRef = useRef<any>(null);

    const numericMatchId = matchId ? Number(matchId) : null;
    const isEditMode = Number.isInteger(numericMatchId) && numericMatchId !== null;

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [matchDate, setMatchDate] = useState('');
    const [currentPlayerCount, setCurrentPlayerCount] = useState(1);
    const [maxPlayerCount, setMaxPlayerCount] = useState(5);
    const [district, setDistrict] = useState('');
    const [placeName, setPlaceName] = useState('');
    const [fullAddress, setFullAddress] = useState('');
    const [latitude, setLatitude] = useState(DEFAULT_LATITUDE);
    const [longitude, setLongitude] = useState(DEFAULT_LONGITUDE);
    const [keyword, setKeyword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditMode);

    const updateAddressFromCoords = (lat: number, lng: number) => {
        if (!window.kakao?.maps?.services) {
            return;
        }

        const geocoder = new window.kakao.maps.services.Geocoder();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geocoder.coord2Address(lng, lat, (result: any, status: any) => {
            if (status !== window.kakao.maps.services.Status.OK || !result?.[0]) {
                return;
            }

            const addr = result[0].address;
            const roadAddr = result[0].road_address;
            const resolvedAddress = roadAddr?.address_name || addr?.address_name || '';
            setFullAddress(resolvedAddress);
            setDistrict(addr?.region_2depth_name || inferDistrict('', resolvedAddress));
        });
    };

    useEffect(() => {
        if (!window.kakao?.maps || !mapContainer.current || mapRef.current) {
            return;
        }

        const center = new window.kakao.maps.LatLng(latitude, longitude);
        mapRef.current = new window.kakao.maps.Map(mapContainer.current, {
            center,
            level: 3,
        });
        markerRef.current = new window.kakao.maps.Marker({ position: center });
        markerRef.current.setMap(mapRef.current);

        if (navigator.geolocation && !isEditMode) {
            navigator.geolocation.getCurrentPosition((position) => {
                const nextLatitude = position.coords.latitude;
                const nextLongitude = position.coords.longitude;
                setLatitude(nextLatitude);
                setLongitude(nextLongitude);
                updateAddressFromCoords(nextLatitude, nextLongitude);
            });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.kakao.maps.event.addListener(mapRef.current, 'click', (mouseEvent: any) => {
            const latLng = mouseEvent.latLng;
            const nextLatitude = latLng.getLat();
            const nextLongitude = latLng.getLng();

            setLatitude(nextLatitude);
            setLongitude(nextLongitude);
            setPlaceName('선택한 위치');
            updateAddressFromCoords(nextLatitude, nextLongitude);
        });
    }, [isEditMode, latitude, longitude]);

    useEffect(() => {
        if (!mapRef.current || !markerRef.current || !window.kakao?.maps) {
            return;
        }

        const center = new window.kakao.maps.LatLng(latitude, longitude);
        mapRef.current.setCenter(center);
        markerRef.current.setPosition(center);
    }, [latitude, longitude]);

    useEffect(() => {
        if (!isEditMode || !numericMatchId) {
            return;
        }

        const fetchMatchDetail = async () => {
            setIsLoading(true);

            try {
                const response = await fetch(`/api/matches/${numericMatchId}`);
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(extractResponseMessage(payload, '매치 정보를 불러오지 못했습니다.'));
                }

                const data = extractResponseData<EditableMatchDetail>(payload);

                if (!data) {
                    throw new Error('매치 정보가 비어 있습니다.');
                }

                setTitle(data.title ?? '');
                setContent(data.content ?? '');
                setPlaceName(data.placeName ?? '');
                setFullAddress(data.fullAddress ?? data.addressName ?? '');
                setDistrict(inferDistrict(data.district, data.fullAddress ?? data.addressName));
                setLatitude(data.latitude ?? DEFAULT_LATITUDE);
                setLongitude(data.longitude ?? DEFAULT_LONGITUDE);
                setMatchDate(formatDateTimeLocalValue(data.matchDate));
                setCurrentPlayerCount(data.currentPlayerCount ?? 1);
                setMaxPlayerCount(data.maxPlayerCount ?? 5);
            } catch (error) {
                console.error(error);
                alert(error instanceof Error ? error.message : '매치 정보를 불러오는 중 오류가 발생했습니다.');
                navigate('/mypage', { replace: true });
            } finally {
                setIsLoading(false);
            }
        };

        void fetchMatchDetail();
    }, [isEditMode, navigate, numericMatchId]);

    const handleSearch = () => {
        if (!keyword.trim()) {
            alert('검색어를 입력해 주세요.');
            return;
        }

        if (!window.kakao?.maps?.services) {
            alert('지도 서비스를 불러오지 못했습니다.');
            return;
        }

        const places = new window.kakao.maps.services.Places();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        places.keywordSearch(keyword, (data: any, status: any) => {
            if (status !== window.kakao.maps.services.Status.OK || !data?.[0]) {
                alert('검색 결과가 없습니다.');
                return;
            }

            const target = data[0];
            const nextLatitude = Number.parseFloat(target.y);
            const nextLongitude = Number.parseFloat(target.x);

            setLatitude(nextLatitude);
            setLongitude(nextLongitude);
            setPlaceName(target.place_name ?? '');
            updateAddressFromCoords(nextLatitude, nextLongitude);
        });
    };

    const handleSubmit = async () => {
        const token = getAccessToken();

        if (!token) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        if (!title.trim() || !matchDate || !placeName.trim()) {
            alert('제목, 일시, 장소는 필수 입력 항목입니다.');
            return;
        }

        if (currentPlayerCount > maxPlayerCount) {
            alert('현재 인원은 모집 정원보다 클 수 없습니다.');
            return;
        }

        setIsSubmitting(true);

        const requestData = {
            title: title.trim(),
            content: content.trim(),
            matchDate,
            currentPlayerCount: Number(currentPlayerCount),
            maxPlayerCount: Number(maxPlayerCount),
            placeName: placeName.trim(),
            fullAddress: fullAddress.trim(),
            district: district.trim(),
            latitude,
            longitude,
        };

        try {
            const endpoint = isEditMode && numericMatchId ? `/api/matches/${numericMatchId}` : '/api/matches';
            const method = isEditMode ? 'PATCH' : 'POST';
            const response = await fetch(endpoint, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(extractResponseMessage(payload, isEditMode ? '매치 수정에 실패했습니다.' : '매치 등록에 실패했습니다.'));
            }

            alert(isEditMode ? '매치가 성공적으로 수정되었습니다.' : '매치가 성공적으로 등록되었습니다.');
            navigate(isEditMode ? '/mypage' : '/');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="mc-container">
                <div className="mc-content">
                    <div className="mc-card">매치 정보를 불러오는 중입니다.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="mc-container">
            <div className="mc-header">
                <button onClick={() => navigate(-1)} className="mc-back-btn" type="button" aria-label="뒤로가기">
                    ←
                </button>
                <h1 className="mc-header-title">{isEditMode ? '매치 수정' : '매치 등록'}</h1>
                <div style={{ width: '24px' }} />
            </div>

            <div className="mc-content">
                <div className="mc-card">
                    <h3 className="mc-section-title">경기 정보</h3>

                    <div className="mc-input-group">
                        <label className="mc-label">제목</label>
                        <input
                            type="text"
                            className="mc-input"
                            placeholder="예: 이번 주 토요일 6vs6 매치"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                        />
                    </div>

                    <div className="mc-input-group">
                        <label className="mc-label">일시</label>
                        <input
                            type="datetime-local"
                            className="mc-input"
                            value={matchDate}
                            onChange={(event) => setMatchDate(event.target.value)}
                        />
                    </div>

                    <div className="mc-row">
                        <div style={{ flex: 1 }} className="mc-input-group">
                            <label className="mc-label">현재 인원</label>
                            <input
                                type="number"
                                className="mc-input"
                                value={currentPlayerCount}
                                min={1}
                                onChange={(event) => setCurrentPlayerCount(Number(event.target.value))}
                            />
                        </div>
                        <div style={{ flex: 1 }} className="mc-input-group">
                            <label className="mc-label">모집 정원</label>
                            <input
                                type="number"
                                className="mc-input"
                                value={maxPlayerCount}
                                min={2}
                                onChange={(event) => setMaxPlayerCount(Number(event.target.value))}
                            />
                        </div>
                    </div>

                    <div className="mc-input-group">
                        <label className="mc-label">내용</label>
                        <textarea
                            className="mc-textarea"
                            placeholder="준비물, 실력, 전달 사항 등을 적어 주세요."
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                        />
                    </div>
                </div>

                <div className="mc-card">
                    <h3 className="mc-section-title">장소 선택</h3>

                    <div className="mc-search-box">
                        <input
                            type="text"
                            className="mc-search-input"
                            placeholder="장소 검색"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} className="mc-search-btn" type="button">
                            검색
                        </button>
                    </div>

                    <div ref={mapContainer} className="mc-map-area" />

                    <div className="mc-location-result">
                        <div className="mc-input-group">
                            <label className="mc-label">장소명</label>
                            <input
                                type="text"
                                className="mc-readonly-input"
                                style={{ fontWeight: 'bold' }}
                                value={placeName}
                                onChange={(event) => setPlaceName(event.target.value)}
                                placeholder="지도를 클릭하거나 검색해 주세요."
                            />
                        </div>

                        <div className="mc-row">
                            <div style={{ flex: 1 }} className="mc-input-group">
                                <label className="mc-label">지역구</label>
                                <input type="text" className="mc-readonly-input" value={district} readOnly />
                            </div>
                            <div style={{ flex: 2 }} className="mc-input-group">
                                <label className="mc-label">상세 주소</label>
                                <input type="text" className="mc-readonly-input" value={fullAddress} readOnly />
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={handleSubmit} className="mc-submit-btn" type="button" disabled={isSubmitting}>
                    {isSubmitting ? (isEditMode ? '매치 수정 중...' : '매치 등록 중...') : isEditMode ? '매치 수정하기' : '매치 등록하기'}
                </button>
            </div>
        </div>
    );
};

export default MatchCreateForm;
