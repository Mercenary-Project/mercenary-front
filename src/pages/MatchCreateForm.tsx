import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// CSS 파일 Import
import '../components/MatchCreateForm.css';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao: any;
    }
}

const CreateMatch: React.FC = () => {
    const navigate = useNavigate();
    const mapContainer = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markerRef = useRef<any>(null);

    // 1. 입력 데이터 State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [matchDate, setMatchDate] = useState('');

    // ✅ 인원 관련 State 분리 (현재 인원 / 최대 인원)
    const [currentPlayerCount, setCurrentPlayerCount] = useState(1); // 기본 본인 1명
    const [maxPlayerCount, setMaxPlayerCount] = useState(5);        // 기본 12명

    // 2. 위치 데이터 State
    const [district, setDistrict] = useState('');
    const [placeName, setPlaceName] = useState('');
    const [fullAddress, setFullAddress] = useState('');
    const [latitude, setLatitude] = useState(37.5665);
    const [longitude, setLongitude] = useState(126.9780);

    // 3. 검색어 State
    const [keyword, setKeyword] = useState('');

    const updateAddressFromCoords = (lat: number, lng: number) => {
        if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) return;
        const geocoder = new window.kakao.maps.services.Geocoder();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geocoder.coord2Address(lng, lat, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const addr = result[0].address;
                const roadAddr = result[0].road_address;
                const finalAddress = roadAddr ? roadAddr.address_name : addr.address_name;
                setFullAddress(finalAddress);
                if (addr && addr.region_2depth_name) {
                    setDistrict(addr.region_2depth_name);
                }
            }
        });
    };

    useEffect(() => {
        if (!window.kakao || !mapContainer.current) return;
        const options = {
            center: new window.kakao.maps.LatLng(latitude, longitude),
            level: 3
        };
        mapRef.current = new window.kakao.maps.Map(mapContainer.current, options);
        markerRef.current = new window.kakao.maps.Marker({
            position: mapRef.current.getCenter()
        });
        markerRef.current.setMap(mapRef.current);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const locPosition = new window.kakao.maps.LatLng(lat, lng);
                mapRef.current.setCenter(locPosition);
                markerRef.current.setPosition(locPosition);
                setLatitude(lat);
                setLongitude(lng);
                updateAddressFromCoords(lat, lng);
            });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.kakao.maps.event.addListener(mapRef.current, 'click', function(mouseEvent: any) {
            const latlng = mouseEvent.latLng;
            markerRef.current.setPosition(latlng);
            setLatitude(latlng.getLat());
            setLongitude(latlng.getLng());
            setPlaceName("지도에서 선택된 위치");
            updateAddressFromCoords(latlng.getLat(), latlng.getLng());
        });
    }, []);

    const handleSearch = () => {
        if (!keyword.trim()) return alert("검색어를 입력하세요");
        const ps = new window.kakao.maps.services.Places();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ps.keywordSearch(keyword, (data: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const target = data[0];
                const lat = parseFloat(target.y);
                const lng = parseFloat(target.x);
                const moveLatLon = new window.kakao.maps.LatLng(lat, lng);
                mapRef.current.setCenter(moveLatLon);
                markerRef.current.setPosition(moveLatLon);
                setLatitude(lat);
                setLongitude(lng);
                setPlaceName(target.place_name);
                updateAddressFromCoords(lat, lng);
            } else {
                alert("검색 결과가 없습니다.");
            }
        });
    };

    const handleSubmit = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            alert("로그인이 필요합니다.");
            return;
        }
        if (!title || !matchDate || !placeName) {
            alert("제목, 날짜, 장소는 필수 입력 사항입니다.");
            return;
        }

        // ✅ 현재 인원이 모집 정원보다 많은지 체크
        if (currentPlayerCount > maxPlayerCount) {
            alert("현재 인원이 모집 정원보다 많을 수 없습니다.");
            return;
        }

        const requestData = {
            title,
            content,
            matchDate: matchDate,
            currentPlayerCount: Number(currentPlayerCount), // ✅ 현재 인원 전송
            maxPlayerCount: Number(maxPlayerCount),       // ✅ 모집 정원 전송
            placeName,
            fullAddress,
            district,
            latitude,
            longitude
        };

        try {
            const response = await fetch('/api/matches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(requestData)
            });
            if (response.ok) {
                alert("매치 등록 성공! ⚽");
                navigate('/');
            } else {
                const errorData = await response.json();
                alert("등록 실패: " + (errorData.message || "오류 발생"));
            }
        } catch (error) {
            console.error("에러 발생:", error);
            alert("서버 연결 실패");
        }
    };

    return (
        <div className="mc-container">
            <div className="mc-header">
                <button onClick={() => navigate(-1)} className="mc-back-btn">←</button>
                <h1 className="mc-header-title">매치 등록</h1>
                <div style={{ width: '24px' }}></div>
            </div>

            <div className="mc-content">

                {/* 1. 경기 정보 */}
                <div className="mc-card">
                    <h3 className="mc-section-title">경기 정보</h3>

                    <div className="mc-input-group">
                        <label className="mc-label">제목</label>
                        <input
                            type="text"
                            className="mc-input"
                            placeholder="예: 이번주 토요일 6vs6 매치"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* ✅ 일시 (한 줄 전체 사용) */}
                    <div className="mc-input-group">
                        <label className="mc-label">일시</label>
                        <input
                            type="datetime-local"
                            className="mc-input"
                            value={matchDate}
                            onChange={(e) => setMatchDate(e.target.value)}
                        />
                    </div>

                    {/* ✅ 인원 입력 (한 줄에 50:50 배치) */}
                    <div className="mc-row">
                        <div style={{ flex: 1 }} className="mc-input-group">
                            <label className="mc-label">현재 인원</label>
                            <input
                                type="number"
                                className="mc-input"
                                value={currentPlayerCount}
                                min={1}
                                onChange={(e) => setCurrentPlayerCount(Number(e.target.value))}
                            />
                        </div>
                        <div style={{ flex: 1 }} className="mc-input-group">
                            <label className="mc-label">모집 정원</label>
                            <input
                                type="number"
                                className="mc-input"
                                value={maxPlayerCount}
                                min={2}
                                onChange={(e) => setMaxPlayerCount(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="mc-input-group">
                        <label className="mc-label">내용</label>
                        <textarea
                            className="mc-textarea"
                            placeholder="준비물, 실력 등 상세 내용을 적어주세요."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                </div>

                {/* 2. 장소 선택 */}
                <div className="mc-card">
                    <h3 className="mc-section-title">장소 선택</h3>

                    <div className="mc-search-box">
                        <input
                            type="text"
                            className="mc-search-input"
                            placeholder="장소 검색 (예: 잠실 종합운동장)"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} className="mc-search-btn">검색</button>
                    </div>

                    <div ref={mapContainer} className="mc-map-area"></div>

                    <div className="mc-location-result">
                        <div className="mc-input-group">
                            <label className="mc-label">장소명</label>
                            <input
                                type="text"
                                className="mc-readonly-input"
                                style={{ fontWeight: 'bold' }}
                                value={placeName}
                                onChange={(e) => setPlaceName(e.target.value)}
                                placeholder="지도에서 선택하거나 검색하세요"
                            />
                        </div>

                        <div className="mc-row">
                            <div style={{ flex: 1 }} className="mc-input-group">
                                <label className="mc-label">지역(구)</label>
                                <input type="text" className="mc-readonly-input" value={district} readOnly />
                            </div>
                            <div style={{ flex: 2 }} className="mc-input-group">
                                <label className="mc-label">상세 주소</label>
                                <input type="text" className="mc-readonly-input" value={fullAddress} readOnly />
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={handleSubmit} className="mc-submit-btn">
                    매치 등록하기
                </button>
            </div>
        </div>
    );
};

export default CreateMatch;