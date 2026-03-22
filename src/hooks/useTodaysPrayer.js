import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveTodaysPrayerSession, getTodaysPrayerSession } from '../lib/supabaseClient';

/**
 * 오늘의 기도 시스템 훅 (단순화 버전)
 *
 * 새로운 로직:
 * 1. 앱 접속 시 팔모니가 기도하는 애니메이션 표시
 * 2. 기도문 생성 시에도 애니메이션 표시
 * 3. 오늘 기도한 횟수 추적 (가볍게)
 * 4. 어제 기도 완료 메시지
 */
export function useTodaysPrayer() {
    const { user } = useAuth();
    const [todaysPrayers, setTodaysPrayers] = useState([]); // 오늘 기도한 목록
    const [showPrayingAnimation, setShowPrayingAnimation] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isYesterdayCompleted, setIsYesterdayCompleted] = useState(false);

    // 초기 로드 완료 여부
    const initialLoadDone = useRef(false);
    const previousUserId = useRef(user?.id);

    // localStorage 키
    const STORAGE_KEY = 'palmoni_todays_prayers';

    // localStorage에 저장
    const saveToStorage = useCallback((prayers) => {
        const data = {
            prayers: prayers.map(p => ({
                topic: p.topic,
                title: p.title,
                prayedAt: p.prayedAt,
            })),
            date: new Date().toISOString(),
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('localStorage save failed:', e);
        }

        // 로그인 사용자: Supabase 백업
        if (user) {
            saveTodaysPrayerSession(user.id, data).catch(e => {
                console.error('Supabase backup failed:', e);
            });
        }
    }, [user]);

    // 로그아웃/로그인 감지
    useEffect(() => {
        const prevId = previousUserId.current;
        const currId = user?.id;

        if (prevId && !currId) {
            // 로그아웃
            setTodaysPrayers([]);
            setIsYesterdayCompleted(false);
            initialLoadDone.current = false;
            localStorage.removeItem(STORAGE_KEY);
        }

        if (currId && prevId !== currId) {
            // 다른 계정 로그인
            setTodaysPrayers([]);
            initialLoadDone.current = false;
        }

        previousUserId.current = currId;
    }, [user]);

    // 저장된 기도 불러오기
    useEffect(() => {
        if (initialLoadDone.current) return;

        const loadPrayerSession = async () => {
            setIsLoading(true);
            let loaded = false;

            // 로그인 사용자: Supabase에서 먼저 로드
            if (user) {
                try {
                    const { data, isYesterday, error } = await getTodaysPrayerSession(user.id);
                    if (data && !error) {
                        if (isYesterday) {
                            setIsYesterdayCompleted(true);
                            setTodaysPrayers([]);
                            localStorage.removeItem(STORAGE_KEY);
                        } else if (data.prayers && Array.isArray(data.prayers)) {
                            setTodaysPrayers(data.prayers);
                        }
                        loaded = true;
                    }
                } catch (e) {
                    console.error('Failed to load from Supabase:', e);
                }
            }

            // localStorage 시도
            if (!loaded) {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    try {
                        const data = JSON.parse(saved);
                        const savedDate = new Date(data.date).toDateString();
                        const today = new Date().toDateString();

                        if (savedDate === today) {
                            if (data.prayers && Array.isArray(data.prayers)) {
                                setTodaysPrayers(data.prayers);
                            }
                        } else if (savedDate < today) {
                            const hadPrayers = data.prayers?.length > 0;
                            if (hadPrayers) {
                                setIsYesterdayCompleted(true);
                            }
                            localStorage.removeItem(STORAGE_KEY);
                        }
                    } catch (e) {
                        console.error('Failed to parse saved prayer:', e);
                    }
                }
            }

            setIsLoading(false);
            initialLoadDone.current = true;
        };

        loadPrayerSession();
    }, [user]);

    // 기도 기록 추가 (기도문 생성 완료 후 호출)
    const addPrayer = useCallback((prayer) => {
        const newPrayer = {
            topic: prayer.topic,
            title: prayer.title,
            prayedAt: new Date().toISOString(),
        };

        setTodaysPrayers(prev => {
            const updated = [...prev, newPrayer];
            saveToStorage(updated);
            return updated;
        });
    }, [saveToStorage]);

    // 기도 애니메이션 시작
    const startPrayingAnimation = useCallback(() => {
        setShowPrayingAnimation(true);
    }, []);

    // 기도 애니메이션 종료
    const stopPrayingAnimation = useCallback(() => {
        setShowPrayingAnimation(false);
    }, []);

    // 어제 기도 완료 메시지 확인
    const dismissYesterdayMessage = useCallback(() => {
        setIsYesterdayCompleted(false);
    }, []);

    return {
        todaysPrayers,
        todaysPrayerCount: todaysPrayers.length,
        showPrayingAnimation,
        isLoading,
        isYesterdayCompleted,
        addPrayer,
        startPrayingAnimation,
        stopPrayingAnimation,
        dismissYesterdayMessage,
    };
}
