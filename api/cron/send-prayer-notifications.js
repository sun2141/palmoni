import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client (service_role 키 사용)
const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

// Firebase Admin SDK 대신 FCM HTTP v1 API 직접 호출
// 서버리스 환경에서 더 가벼움
async function sendFCMMessage(token, title, body, data = {}) {
    const projectId = 'palmoni';
    const accessToken = await getAccessToken();

    const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: {
                    token,
                    notification: { title, body },
                    data,
                    webpush: {
                        notification: {
                            icon: '/apple-touch-icon.png',
                            badge: '/favicon-32.png',
                            tag: 'palmoni-prayer',
                            renotify: true
                        },
                        fcm_options: {
                            link: 'https://palmoni.vercel.app'
                        }
                    }
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`FCM 전송 실패: ${error}`);
    }

    return response.json();
}

// Google OAuth2 액세스 토큰 가져오기
async function getAccessToken() {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

    if (!serviceAccount.private_key) {
        throw new Error('Firebase 서비스 계정 키가 설정되지 않았습니다');
    }

    const jwt = await createJWT(serviceAccount);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    const data = await tokenResponse.json();
    return data.access_token;
}

// JWT 생성 (Firebase 인증용)
async function createJWT(serviceAccount) {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };

    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '');
    const signInput = `${headerB64}.${payloadB64}`;

    // Node.js crypto로 서명
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signInput);
    const signature = sign.sign(serviceAccount.private_key, 'base64url');

    return `${signInput}.${signature}`;
}

export default async function handler(req, res) {
    // Vercel Cron 인증 확인
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // 오늘 기도 시간이 된 사용자들 조회
        // todays_prayer_sessions에서 현재 시간에 기도해야 하는 세션 찾기
        const { data: sessions, error: sessionsError } = await supabaseAdmin
            .from('todays_prayer_sessions')
            .select('user_id, session_data')
            .eq('session_date', today);

        if (sessionsError) {
            console.error('세션 조회 실패:', sessionsError);
            return res.status(500).json({ error: '세션 조회 실패' });
        }

        // 현재 시간 기준으로 기도 시간인 사용자 필터링
        const usersToNotify = [];
        const nowTime = now.getTime();
        const fiveMinutes = 5 * 60 * 1000;

        for (const session of sessions || []) {
            const sessionData = session.session_data;
            if (!sessionData?.prayers) continue;

            for (const prayer of sessionData.prayers) {
                if (prayer.status !== 'praying') continue;

                const currentIndex = prayer.currentIndex || 0;
                const times = prayer.times || [];

                if (currentIndex < times.length) {
                    const prayerTime = new Date(times[currentIndex]).getTime();
                    // 기도 시간 5분 이내면 알림 대상
                    if (Math.abs(nowTime - prayerTime) < fiveMinutes) {
                        usersToNotify.push({
                            userId: session.user_id,
                            topic: prayer.prayer?.topic || '기도'
                        });
                        break; // 사용자당 하나만
                    }
                }
            }
        }

        if (usersToNotify.length === 0) {
            return res.json({ message: '알림 대상 없음', count: 0 });
        }

        // 해당 사용자들의 FCM 토큰 조회
        const userIds = usersToNotify.map(u => u.userId);
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from('push_subscriptions')
            .select('user_id, fcm_token')
            .in('user_id', userIds)
            .eq('is_active', true);

        if (subError) {
            console.error('구독 조회 실패:', subError);
            return res.status(500).json({ error: '구독 조회 실패' });
        }

        // 푸시 알림 전송
        const results = [];
        for (const sub of subscriptions || []) {
            const userInfo = usersToNotify.find(u => u.userId === sub.user_id);
            if (!userInfo) continue;

            try {
                await sendFCMMessage(
                    sub.fcm_token,
                    '🙏 팔모니가 기도 중입니다',
                    `"${userInfo.topic}" - 지금 팔모니가 당신을 위해 기도하고 있습니다.`,
                    { type: 'prayer_time', topic: userInfo.topic }
                );
                results.push({ userId: sub.user_id, success: true });
            } catch (error) {
                console.error(`푸시 전송 실패 (${sub.user_id}):`, error.message);
                results.push({ userId: sub.user_id, success: false, error: error.message });

                // 토큰이 만료된 경우 비활성화
                if (error.message.includes('not a valid FCM registration token')) {
                    await supabaseAdmin
                        .from('push_subscriptions')
                        .update({ is_active: false })
                        .eq('fcm_token', sub.fcm_token);
                }
            }
        }

        const successCount = results.filter(r => r.success).length;
        return res.json({
            message: `알림 전송 완료`,
            total: results.length,
            success: successCount,
            failed: results.length - successCount
        });

    } catch (error) {
        console.error('Cron 실행 오류:', error);
        return res.status(500).json({ error: error.message });
    }
}
