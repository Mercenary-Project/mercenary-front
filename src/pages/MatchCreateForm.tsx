import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import '../components/MatchCreateForm.css';
import { extractResponseData, extractResponseMessage, formatDateTimeLocalValue, type MatchSummary } from '../utils/matchApi';
import { buildApiUrl } from '../utils/api';
import { apiFetch } from '../utils/apiFetch';
import { useAuth } from '../context/useAuth';


type EditableMatchDetail = MatchSummary & {
    fullAddress?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
};

const DEFAULT_LATITUDE = 37.5665;
const DEFAULT_LONGITUDE = 126.978;

const inferDistrict = (district?: string, fullAddress?: string) => {
    if (district?.trim()) return district.trim();
    const source = fullAddress?.trim();
    if (!source) return '';
    return source.split(' ')[1] ?? source;
};

const matchSchema = z
    .object({
        title: z
            .string()
            .min(1, '제목을 입력해 주세요.')
            .max(100, '제목은 100자 이하로 입력해 주세요.'),
        content: z
            .string()
            .max(500, '내용은 500자 이하로 입력해 주세요.')
            .optional(),
        matchDate: z
            .string()
            .min(1, '일시를 선택해 주세요.')
            .refine((v) => new Date(v) > new Date(), '현재 시간 이후의 일시를 선택해 주세요.'),
        currentPlayerCount: z
            .number({ error: '숫자를 입력해 주세요.' })
            .min(1, '현재 인원은 1명 이상이어야 합니다.')
            .max(30, '최대 30명까지 설정 가능합니다.'),
        maxPlayerCount: z
            .number({ error: '숫자를 입력해 주세요.' })
            .min(2, '모집 정원은 2명 이상이어야 합니다.')
            .max(30, '최대 30명까지 설정 가능합니다.'),
        placeName: z.string().min(1, '지도에서 장소를 선택해 주세요.'),
        latitude: z.number(),
        longitude: z.number(),
        fullAddress: z.string().optional(),
        district: z.string().optional(),
    })
    .refine((data) => data.currentPlayerCount <= data.maxPlayerCount, {
        message: '현재 인원은 모집 정원보다 클 수 없습니다.',
        path: ['currentPlayerCount'],
    });

type MatchFormValues = z.infer<typeof matchSchema>;

const MatchCreateForm: React.FC = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const { matchId } = useParams<{ matchId?: string }>();
    const mapRef = useRef<KakaoMap | null>(null);
    const markerRef = useRef<KakaoMarker | null>(null);
    const mapContainer = useRef<HTMLDivElement>(null);

    const numericMatchId = matchId ? Number(matchId) : null;
    const isEditMode = Number.isInteger(numericMatchId) && numericMatchId !== null;

    const [keyword, setKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(isEditMode);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<MatchFormValues>({
        resolver: zodResolver(matchSchema),
        mode: 'onTouched',
        defaultValues: {
            title: '',
            content: '',
            matchDate: '',
            currentPlayerCount: 1,
            maxPlayerCount: 5,
            placeName: '',
            latitude: DEFAULT_LATITUDE,
            longitude: DEFAULT_LONGITUDE,
            fullAddress: '',
            district: '',
        },
    });

    const latitude = watch('latitude');
    const longitude = watch('longitude');

    const updateAddressFromCoords = useCallback(
        (lat: number, lng: number) => {
            if (!window.kakao?.maps?.services) return;
            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.coord2Address(lng, lat, (result: KakaoGeocoderResult[], status: string) => {
                if (status !== window.kakao.maps.services.Status.OK || !result?.[0]) return;
                const addr = result[0].address;
                const roadAddr = result[0].road_address;
                const resolvedAddress = roadAddr?.address_name || addr?.address_name || '';
                setValue('fullAddress', resolvedAddress, { shouldDirty: true });
                setValue('district', addr?.region_2depth_name || inferDistrict('', resolvedAddress), { shouldDirty: true });
            });
        },
        [setValue],
    );

    // 지도 초기화 (isLoading 해제 후 mapContainer가 DOM에 마운트된 뒤 실행)
    useEffect(() => {
        if (!window.kakao?.maps || !mapContainer.current || mapRef.current) return;

        const initCenter = new window.kakao.maps.LatLng(latitude, longitude);
        mapRef.current = new window.kakao.maps.Map(mapContainer.current, { center: initCenter, level: 3 });
        markerRef.current = new window.kakao.maps.Marker({ position: initCenter });
        markerRef.current.setMap(mapRef.current);

        if (navigator.geolocation && !isEditMode) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setValue('latitude', lat, { shouldDirty: true });
                setValue('longitude', lng, { shouldDirty: true });
                updateAddressFromCoords(lat, lng);
            });
        }

        window.kakao.maps.event.addListener(mapRef.current, 'click', (mouseEvent: KakaoMouseEvent) => {
            const latLng = mouseEvent.latLng;
            const lat = latLng.getLat();
            const lng = latLng.getLng();
            setValue('latitude', lat, { shouldDirty: true });
            setValue('longitude', lng, { shouldDirty: true });
            setValue('placeName', '선택한 위치', { shouldValidate: true });
            updateAddressFromCoords(lat, lng);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]);

    // 위도/경도 변경 시 지도 마커·센터 동기화
    useEffect(() => {
        if (!mapRef.current || !markerRef.current || !window.kakao?.maps) return;
        const center = new window.kakao.maps.LatLng(latitude, longitude);
        mapRef.current.setCenter(center);
        markerRef.current.setPosition(center);
    }, [latitude, longitude]);

    // 수정 모드: 기존 매치 데이터 로드
    useEffect(() => {
        if (!isEditMode || !numericMatchId) return;

        const fetchMatchDetail = async () => {
            setIsLoading(true);
            try {
                const response = await apiFetch(buildApiUrl(`/api/matches/${numericMatchId}`));
                const payload = await response.json().catch(() => null);
                if (!response.ok) {
                    throw new Error(extractResponseMessage(payload, '매치 정보를 불러오지 못했습니다.'));
                }
                const data = extractResponseData<EditableMatchDetail>(payload);
                if (!data) throw new Error('매치 정보가 비어 있습니다.');

                reset({
                    title: data.title ?? '',
                    content: data.content ?? '',
                    placeName: data.placeName ?? '',
                    fullAddress: data.fullAddress ?? data.addressName ?? '',
                    district: inferDistrict(data.district, data.fullAddress ?? data.addressName),
                    latitude: data.latitude ?? DEFAULT_LATITUDE,
                    longitude: data.longitude ?? DEFAULT_LONGITUDE,
                    matchDate: formatDateTimeLocalValue(data.matchDate),
                    currentPlayerCount: data.currentPlayerCount ?? 1,
                    maxPlayerCount: data.maxPlayerCount ?? 5,
                });
            } catch (error) {
                console.error(error);
                alert(error instanceof Error ? error.message : '매치 정보를 불러오는 중 오류가 발생했습니다.');
                navigate('/mypage', { replace: true });
            } finally {
                setIsLoading(false);
            }
        };

        void fetchMatchDetail();
    }, [isEditMode, navigate, numericMatchId, reset]);

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
        places.keywordSearch(keyword, (data: KakaoPlaceResult[], status: string) => {
            if (status !== window.kakao.maps.services.Status.OK || !data?.[0]) {
                alert('검색 결과가 없습니다.');
                return;
            }
            const target = data[0];
            const lat = Number.parseFloat(target.y);
            const lng = Number.parseFloat(target.x);
            setValue('latitude', lat, { shouldDirty: true });
            setValue('longitude', lng, { shouldDirty: true });
            setValue('placeName', target.place_name ?? '', { shouldValidate: true });
            updateAddressFromCoords(lat, lng);
        });
    };

    const onSubmit = async (data: MatchFormValues) => {
        if (!token) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        const requestData = {
            title: data.title.trim(),
            content: data.content?.trim() ?? '',
            matchDate: data.matchDate,
            currentPlayerCount: data.currentPlayerCount,
            maxPlayerCount: data.maxPlayerCount,
            placeName: data.placeName.trim(),
            fullAddress: data.fullAddress?.trim() ?? '',
            district: data.district?.trim() ?? '',
            latitude: data.latitude,
            longitude: data.longitude,
        };

        try {
            const endpoint = isEditMode && numericMatchId
                ? buildApiUrl(`/api/matches/${numericMatchId}`)
                : buildApiUrl('/api/matches');
            const method = isEditMode ? 'PATCH' : 'POST';
            const response = await apiFetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
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

            <form className="mc-content" onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="mc-card">
                    <h3 className="mc-section-title">경기 정보</h3>

                    <div className="mc-input-group">
                        <label className="mc-label">
                            제목 <span className="mc-required">*</span>
                        </label>
                        <input
                            {...register('title')}
                            type="text"
                            className={`mc-input${errors.title ? ' mc-input--error' : ''}`}
                            placeholder="예: 이번 주 수요일 6vs6 매치"
                        />
                        {errors.title && <p className="mc-field-error">{errors.title.message}</p>}
                    </div>

                    <div className="mc-input-group">
                        <label className="mc-label">
                            일시 <span className="mc-required">*</span>
                        </label>
                        <input
                            {...register('matchDate')}
                            type="datetime-local"
                            className={`mc-input${errors.matchDate ? ' mc-input--error' : ''}`}
                        />
                        {errors.matchDate && <p className="mc-field-error">{errors.matchDate.message}</p>}
                    </div>

                    <div className="mc-row">
                        <div style={{ flex: 1 }} className="mc-input-group">
                            <label className="mc-label">현재 인원</label>
                            <input
                                {...register('currentPlayerCount', { valueAsNumber: true })}
                                type="number"
                                className={`mc-input${errors.currentPlayerCount ? ' mc-input--error' : ''}`}
                                min={1}
                            />
                            {errors.currentPlayerCount && (
                                <p className="mc-field-error">{errors.currentPlayerCount.message}</p>
                            )}
                        </div>
                        <div style={{ flex: 1 }} className="mc-input-group">
                            <label className="mc-label">모집 정원</label>
                            <input
                                {...register('maxPlayerCount', { valueAsNumber: true })}
                                type="number"
                                className={`mc-input${errors.maxPlayerCount ? ' mc-input--error' : ''}`}
                                min={2}
                            />
                            {errors.maxPlayerCount && (
                                <p className="mc-field-error">{errors.maxPlayerCount.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="mc-input-group">
                        <label className="mc-label">내용</label>
                        <textarea
                            {...register('content')}
                            className={`mc-textarea${errors.content ? ' mc-input--error' : ''}`}
                            placeholder="준비물, 실력, 전달 사항 등을 적어 주세요."
                        />
                        {errors.content && <p className="mc-field-error">{errors.content.message}</p>}
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
                            <label className="mc-label">
                                장소명 <span className="mc-required">*</span>
                            </label>
                            <input
                                {...register('placeName')}
                                type="text"
                                className={`mc-readonly-input${errors.placeName ? ' mc-input--error' : ''}`}
                                style={{ fontWeight: 'bold' }}
                                placeholder="지도를 클릭하거나 검색해 주세요."
                            />
                            {errors.placeName && (
                                <p className="mc-field-error">{errors.placeName.message}</p>
                            )}
                        </div>

                        <div className="mc-row">
                            <div style={{ flex: 1 }} className="mc-input-group">
                                <label className="mc-label">지역구</label>
                                <input
                                    {...register('district')}
                                    type="text"
                                    className="mc-readonly-input"
                                    readOnly
                                />
                            </div>
                            <div style={{ flex: 2 }} className="mc-input-group">
                                <label className="mc-label">상세 주소</label>
                                <input
                                    {...register('fullAddress')}
                                    type="text"
                                    className="mc-readonly-input"
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <button className="mc-submit-btn" type="submit" disabled={isSubmitting}>
                    {isSubmitting
                        ? isEditMode ? '매치 수정 중...' : '매치 등록 중...'
                        : isEditMode ? '매치 수정하기' : '매치 등록하기'}
                </button>
            </form>
        </div>
    );
};

export default MatchCreateForm;
