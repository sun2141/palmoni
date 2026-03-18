import { useEffect, useRef } from 'react';
import './AdBanner.css';

/**
 * Google AdSense 배너 컴포넌트
 *
 * Google 정책 준수:
 * - 광고와 콘텐츠 명확히 구분
 * - 광고 표시 라벨 포함
 * - 충분한 여백 확보
 * - 클릭 유도 금지
 */
export function AdBanner({
    slot,
    format = 'auto',
    responsive = true,
    className = '',
    style = {},
}) {
    const adRef = useRef(null);
    const isInitialized = useRef(false);

    useEffect(() => {
        // 중복 초기화 방지
        if (isInitialized.current) return;

        // AdSense 스크립트가 로드되었는지 확인
        if (typeof window !== 'undefined' && window.adsbygoogle && adRef.current) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                isInitialized.current = true;
            } catch (error) {
                console.error('AdSense error:', error);
            }
        }
    }, []);

    // AdSense 클라이언트 ID (나중에 실제 ID로 교체 필요)
    const adClient = import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-XXXXXXXXXXXXXXXX';

    return (
        <div className={`ad-banner-container ${className}`} style={style}>
            <div className="ad-label">광고</div>
            <ins
                ref={adRef}
                className="adsbygoogle ad-banner"
                style={{ display: 'block' }}
                data-ad-client={adClient}
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive={responsive ? 'true' : 'false'}
            />
        </div>
    );
}

/**
 * 홈 화면 하단 광고 (기도 결과 아래)
 */
export function HomeBottomAd() {
    return (
        <AdBanner
            slot="HOME_BOTTOM_SLOT"
            format="rectangle"
            className="home-bottom-ad"
        />
    );
}

/**
 * 내 기도문 목록 중간 광고 (네이티브 스타일)
 */
export function FeedInlineAd() {
    return (
        <AdBanner
            slot="FEED_INLINE_SLOT"
            format="fluid"
            className="feed-inline-ad"
        />
    );
}
