import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kakao: any;
    }
}

const MatchCreateForm: React.FC = () => {
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
    const [maxPlayerCount, setMaxPlayerCount] = useState(12);

    // 2. 위치 데이터 State
    const [district, setDistrict] = useState('');
    const [placeName, setPlaceName] = useState('');
    const [fullAddress, setFullAddress] = useState('');
    const [latitude, setLatitude] = useState(37.5665);
    const [longitude, setLongitude] = useState(126.9780);

    // 3. 검색어 State
    const [keyword, setKeyword] = useState('');

    // ✅ [수정됨] 이 함수를 useEffect보다 위로 올렸습니다. (순서 중요!)
    // 좌표로 주소와 행정구역(구) 알아내는 함수
    const updateAddressFromCoords = (lat: number, lng: number) => {
        if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) return;

        const geocoder = new window.kakao.maps.services.Geocoder();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geocoder.coord2Address(lng, lat, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const addr = result[0].address;

                // 상세 주소 업데이트
                setFullAddress(addr.address_name);

                // '구' 정보 자동 입력
                if (addr.region_2depth_name) {
                    setDistrict(addr.region_2depth_name);
                }

                console.log("📍 주소 자동 발견:", addr.address_name);
            }
        });
    };

    // ✅ 지도 초기화 (함수 정의 후 실행)
    useEffect(() => {
        if (!window.kakao || !mapContainer.current) return;

        // 지도 생성
        const options = {
            center: new window.kakao.maps.LatLng(latitude, longitude),
            level: 3
        };
        mapRef.current = new window.kakao.maps.Map(mapContainer.current, options);

        // 마커 생성
        markerRef.current = new window.kakao.maps.Marker({
            position: mapRef.current.getCenter()
        });
        markerRef.current.setMap(mapRef.current);

        // 📍 초기 내 위치 가져오기
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const locPosition = new window.kakao.maps.LatLng(lat, lng);
                mapRef.current.setCenter(locPosition);
                markerRef.current.setPosition(locPosition);

                setLatitude(lat);
                setLongitude(lng);

                // 여기서 위의 함수를 호출하므로, 함수가 먼저 정의되어 있어야 함
                updateAddressFromCoords(lat, lng);
            });
        }

        // 🖱️ 지도 클릭 이벤트
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.kakao.maps.event.addListener(mapRef.current, 'click', function(mouseEvent: any) {
            const latlng = mouseEvent.latLng;

            markerRef.current.setPosition(latlng);
            setLatitude(latlng.getLat());
            setLongitude(latlng.getLng());

            updateAddressFromCoords(latlng.getLat(), latlng.getLng());
        });

    }, []); // 의존성 배열 비움 (최초 1회 실행)


    // 🔍 장소 검색 핸들러
    const handleSearch = () => {
        if (!keyword.trim()) return;
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
                setPlaceName(target.place_name); // 장소명 자동 입력

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
            alert("제목, 날짜, 장소 이름은 필수입니다.");
            return;
        }

        const requestData = {
            title,
            content,
            matchDate: matchDate + ":00",
            maxPlayerCount: Number(maxPlayerCount),
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
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                >
                    ⬅️
                </button>
                <h2 style={{ margin: 0 }}>매치 등록</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <label style={{ fontWeight: 'bold' }}>경기 정보</label>
                <input
                    type="text"
                    placeholder="제목 (예: 이번주 토요일 6vs6)"
                    style={styles.input}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="datetime-local"
                        style={{ ...styles.input, flex: 2 }}
                        value={matchDate}
                        onChange={(e) => setMatchDate(e.target.value)}
                    />
                    <input
                        type="number"
                        placeholder="인원"
                        style={{ ...styles.input, flex: 1 }}
                        value={maxPlayerCount}
                        onChange={(e) => setMaxPlayerCount(Number(e.target.value))}
                    />
                </div>

                <textarea
                    placeholder="내용 (준비물, 실력 등 상세 내용을 적어주세요)"
                    rows={4}
                    style={{ ...styles.input, resize: 'none' }}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />

                <hr style={{ margin: '10px 0', border: '0', borderTop: '1px solid #eee' }} />

                <label style={{ fontWeight: 'bold' }}>장소 선택</label>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="장소 검색 (예: 잠실 종합운동장)"
                        style={{ ...styles.input, flex: 1 }}
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} style={styles.searchBtn}>검색</button>
                </div>

                <div style={{ position: 'relative', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                    <div ref={mapContainer} style={{ width: '100%', height: '300px' }} />
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px', fontSize: '12px',
                        borderTop: '1px solid #eee'
                    }}>
                        📍 핀 위치: {district ? `[${district}]` : ''} {fullAddress || '지도를 클릭하여 위치를 지정하세요'}
                    </div>
                </div>

                <input
                    type="text"
                    placeholder="장소 이름 (지도 검색 시 자동 입력)"
                    style={{ ...styles.input, backgroundColor: '#f9f9f9',color: '#666' }}
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="지역 (자동)"
                        style={{ ...styles.input, flex: 1, backgroundColor: '#f9f9f9', color: '#666' }}
                        value={district}
                        readOnly
                    />
                    <input
                        type="text"
                        placeholder="상세 주소"
                        style={{ ...styles.input, flex: 2, backgroundColor: '#f9f9f9', color: '#666' }}
                        value={fullAddress}
                        readOnly
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    style={styles.submitBtn}>
                    매치 등록하기
                </button>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    input: {
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none'
    },
    searchBtn: {
        padding: '0 15px',
        backgroundColor: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    submitBtn: {
        marginTop: '10px',
        padding: '16px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }
};

export default MatchCreateForm;