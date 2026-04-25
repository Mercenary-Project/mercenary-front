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
import { POSITION_LABEL, type Position, type PositionSlot } from '../types/match';

type EditableMatchDetail = MatchSummary & {
    fullAddress?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
    slots?: PositionSlot[];
};

const DEFAULT_LATITUDE = 37.5665;
const DEFAULT_LONGITUDE = 126.978;

const POSITIONS = Object.keys(POSITION_LABEL) as Position[];

const inferDistrict = (district?: string, fullAddress?: string) => {
    if (district?.trim()) return district.trim();
    const source = fullAddress?.trim();
    if (!source) return '';
    return source.split(' ')[1] ?? source;
};

const positionSlotSchema = z.object({
    position: z.enum(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']),
    required: z.number().min(1),
});

const matchSchema = z.object({
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
    placeName: z.string().min(1, '지도에서 장소를 선택해 주세요.'),
    latitude: z.number(),
    longitude: z.number(),
    fullAddress: z.string().optional(),
    district: z.string().optional(),
    slots: z.array(positionSlotSchema).min(1, '포지션을 1개 이상 추가하세요.'),
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
    const [draftPosition, setDraftPosition] = useState<Position>('GK');
    const [draftRequired, setDraftRequired] = useState(1);

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
            slots: [],
            placeName: '',
            latitude: DEFAULT_LATITUDE,
            longitude: DEFAULT_LONGITUDE,
            fullAddress: '',
            district: '',
        },
    });

    const latitude = watch('latitude');
    const longitude = watch('longitude');
    const slots = watch('slots');

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

    useEffect(() => {
        if (!mapRef.current || !markerRef.current || !window.kakao?.maps) return;
        const center = new window.kakao.maps.LatLng(latitude, longitude);
        mapRef.current.setCenter(center);
        markerRef.current.setPosition(center);
    }, [latitude, longitude]);

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
                    slots: (data.slots ?? []).map((s) => ({ position: s.position, required: s.required })),
                });
            } catch (error) {
                alert(error instanceof Error ? error.message : '매치 정보를 불러오는 중 오류가 발생했습니다.');
                navigate('/mypage', { replace: true });
            } finally {
                setIsLoading(false);
            }
        };

        void fetchMatchDetail();
    }, [isEditMode, navigate, numericMatchId, reset]);

    const handleAddSlot = () => {
        if (slots.some((s) => s.position === draftPosition)) {
            alert(`${POSITION_LABEL[draftPosition]} 포지션은 이미 추가되었습니다.`);
            return;
        }
        setValue('slots', [...slots, { position: draftPosition, required: draftRequired }], { shouldValidate: true });
    };

    const handleRemoveSlot = (position: Position) => {
        setValue('slots', slots.filter((s) => s.position !== position), { shouldValidate: true });
    };

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
            placeName: data.placeName.trim(),
            fullAddress: data.fullAddress?.trim() ?? '',
            district: data.district?.trim() ?? '',
            latitude: data.latitude,
            longitude: data.longitude,
            slots: data.slots.map((s) => ({ position: s.position, required: s.required })),
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

                    <div className="mc-input-group">
                        <label className="mc-label">
                            포지션 모집 <span className="mc-required">*</span>
                        </label>
                        <div className="mc-slot-builder">
                            <select
                                className="mc-input mc-slot-select"
                                value={draftPosition}
                                onChange={(e) => setDraftPosition(e.target.value as Position)}
                            >
                                {POSITIONS.map((pos) => (
                                    <option key={pos} value={pos}>
                                        {pos} · {POSITION_LABEL[pos]}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                className="mc-input mc-slot-count"
                                value={draftRequired}
                                min={1}
                                max={20}
                                onChange={(e) => setDraftRequired(Math.max(1, Number(e.target.value)))}
                            />
                            <span className="mc-slot-unit">명</span>
                            <button
                                type="button"
                                className="mc-search-btn"
                                onClick={handleAddSlot}
                            >
                                추가
                            </button>
                        </div>
                        {slots.length > 0 && (
                            <div className="mc-slot-tags">
                                {slots.map((s) => (
                                    <span key={s.position} className="mc-slot-tag">
                                        <span className="mc-slot-tag-pos">{s.position}</span>
                                        <span className="mc-slot-tag-label">{POSITION_LABEL[s.position]}</span>
                                        <span className="mc-slot-tag-count">{s.required}명</span>
                                        <button
                                            type="button"
                                            className="mc-slot-tag-remove"
                                            onClick={() => handleRemoveSlot(s.position)}
                                            aria-label={`${POSITION_LABEL[s.position]} 제거`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        {errors.slots && <p className="mc-field-error">{errors.slots.message}</p>}
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
