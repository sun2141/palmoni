import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveTodaysPrayerSession, getTodaysPrayerSession } from '../lib/supabaseClient';

/**
 * 오늘의 기도 시스템 훅 (여러 기도 지원)
 *
 * 로직:
 * 1. 사용자가 기도를 맡기면, 오늘 자정까지 남은 시간을 계산
 * 2. 3시간 이상 남았으면 3번 기도 (즉시 + 2번 추가)
 * 3. 3시간 미만이면 1번만 기도
 * 4. 하루 최대 3개의 기도를 개별적으로 추적
 * 5. 다음날 접속 시 "어제의 기도가 완료되었습니다" 메시지
 * 6. 로그인 사용자는 Supabase에 백업 (localStorage 손실 방지)
 */
export function useTodaysPrayer() {
    const { user } = useAuth();
    // 여러 기도를 배열로 관리 (각 기도는 {prayer, times, currentIndex, status} 형태)
    const [todaysPrayers, setTodaysPrayers] = useState([]);
    const [showPrayingAnimation, setShowPrayingAnimation] = useState(false);
    const [activePrayerIndex, setActivePrayerIndex] = useState(-1); // 애니메이션 중인 기도 인덱스
    const [isLoading, setIsLoading] = useState(true);
    const [isYesterdayCompleted, setIsYesterdayCompleted] = useState(false);

    // 초기 로드 완료 여부 (중복 로드 방지)
    const initialLoadDone = useRef(false);

    // localStorage 키
    const STORAGE_KEY = 'palmoni_todays_prayers'; // 복수형으로 변경

    // 자정까지 남은 시간(분) 계산
    const getMinutesUntilMidnight = () => {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        return Math.floor((midnight - now) / (1000 * 60));
    };

    // 기도 시간 계산 (현재 ~ 자정 사이에 균등 분배)
    const calculatePrayerTimes = (startTime) => {
        const minutesLeft = getMinutesUntilMidnight();
        const times = [new Date(startTime)]; // 첫 번째 기도: 즉시

        if (minutesLeft >= 180) { // 3시간 이상
            // 남은 시간을 3등분하여 2번 더 기도
            const interval = Math.floor(minutesLeft / 3);
            times.push(new Date(startTime.getTime() + interval * 60 * 1000));
            times.push(new Date(startTime.getTime() + interval * 2 * 60 * 1000));
        }

        return times;
    };

    // 저장된 오늘의 기도들 불러오기 (localStorage + Supabase 백업)
    useEffect(() => {
        if (initialLoadDone.current) return;

        const loadPrayerSession = async () => {
            setIsLoading(true);
            let loaded = false;

            // 1. 먼저 localStorage에서 로드 시도
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    const savedDate = new Date(data.date).toDateString();
                    const today = new Date().toDateString();

                    if (savedDate === today) {
                        // 새 형식 (배열) 또는 기존 형식 (단일) 처리
                        if (data.prayers && Array.isArray(data.prayers)) {
                            // 새 형식: 여러 기도 배열
                            const restoredPrayers = data.prayers.map(p => ({
                                ...p,
                                times: p.times.map(t => new Date(t))
                            }));
                            setTodaysPrayers(restoredPrayers);
                        } else if (data.prayer) {
                            // 기존 형식: 단일 기도 -> 배열로 변환
                            const singlePrayer = {
                                prayer: data.prayer,
                                times: data.times.map(t => new Date(t)),
                                currentIndex: data.currentIndex,
                                status: data.status
                            };
                            setTodaysPrayers([singlePrayer]);
                        }
                        loaded = true;
                    } else if (savedDate < today) {
                        // 어제 데이터가 있으면
                        const hadPrayers = data.prayers?.length > 0 || data.prayer;
                        if (hadPrayers) {
                            setIsYesterdayCompleted(true);
                        }
                        localStorage.removeItem(STORAGE_KEY);
                        loaded = true;
                    }
                } catch (e) {
                    console.error('Failed to parse saved prayer:', e);
                }
            }

            // 2. 로그인 사용자: Supabase에서 복구 시도
            if (!loaded && user) {
                try {
                    const { data, isYesterday, error } = await getTodaysPrayerSession(user.id);
                    if (data && !error) {
                        if (isYesterday) {
                            setIsYesterdayCompleted(true);
                        } else {
                            // 새 형식 또는 기존 형식 처리
                            if (data.prayers && Array.isArray(data.prayers)) {
                                const restoredPrayers = data.prayers.map(p => ({
                                    ...p,
                                    times: p.times.map(t => new Date(t))
                                }));
                                setTodaysPrayers(restoredPrayers);
                            } else if (data.prayer) {
                                const singlePrayer = {
                                    prayer: data.prayer,
                                    times: data.times.map(t => new Date(t)),
                                    currentIndex: data.currentIndex,
                                    status: data.status
                                };
                                setTodaysPrayers([singlePrayer]);
                            }

                            // localStorage에도 복원
                            saveToStorageInternal(data.prayers || [data]);
                        }
                        loaded = true;
                    }
                } catch (e) {
                    console.error('Failed to load from Supabase:', e);
                }
            }

            setIsLoading(false);
            initialLoadDone.current = true;
        };

        loadPrayerSession();
    }, [user]);

    // 각 기도의 시간 체크 (모든 진행 중인 기도를 독립적으로 관리)
    useEffect(() => {
        const prayingPrayers = todaysPrayers.filter(p => p.status === 'praying');
        if (prayingPrayers.length === 0) return;

        const checkPrayerTimes = () => {
            const now = new Date();
            let updated = false;

            const newPrayers = todaysPrayers.map((prayer, prayerIdx) => {
                if (prayer.status !== 'praying') return prayer;

                const nextPrayerTime = prayer.times[prayer.currentIndex];
                if (nextPrayerTime && now >= nextPrayerTime) {
                    // 기도 시간이 되면 애니메이션 표시
                    setShowPrayingAnimation(true);
                    setActivePrayerIndex(prayerIdx);

                    // 5초 후 다음 기도로 넘어감
                    setTimeout(() => {
                        setShowPrayingAnimation(false);
                        setActivePrayerIndex(-1);

                        setTodaysPrayers(prev => {
                            const updatedPrayers = [...prev];
                            const currentPrayer = updatedPrayers[prayerIdx];
                            if (!currentPrayer) return prev;

                            const nextIndex = currentPrayer.currentIndex + 1;
                            if (nextIndex >= currentPrayer.times.length) {
                                currentPrayer.status = 'completed';
                                currentPrayer.currentIndex = nextIndex;
                            } else {
                                currentPrayer.currentIndex = nextIndex;
                            }
                            saveToStorage(updatedPrayers);
                            return updatedPrayers;
                        });
                    }, 5000);

                    updated = true;
                }
                return prayer;
            });

            if (updated) {
                // 즉시 상태는 업데이트하지 않음 (setTimeout에서 처리)
            }
        };

        const interval = setInterval(checkPrayerTimes, 30000); // 30초마다 체크
        checkPrayerTimes(); // 즉시 한 번 체크

        return () => clearInterval(interval);
    }, [todaysPrayers]);

    // localStorage에 저장 (내부용, useCallback 외부)
    const saveToStorageInternal = (prayers) => {
        const data = {
            prayers: prayers.map(p => ({
                prayer: p.prayer,
                times: p.times.map(t => t instanceof Date ? t.toISOString() : t),
                currentIndex: p.currentIndex,
                status: p.status
            })),
            date: new Date().toISOString(),
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('localStorage save failed:', e);
        }
    };

    // localStorage + Supabase 백업에 저장
    const saveToStorage = useCallback((prayers) => {
        const data = {
            prayers: prayers.map(p => ({
                prayer: p.prayer,
                times: p.times.map(t => t instanceof Date ? t.toISOString() : t),
                currentIndex: p.currentIndex,
                status: p.status
            })),
            date: new Date().toISOString(),
        };

        // localStorage에 저장
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

    // 새 기도 맡기기 (기존 기도에 추가)
    const submitPrayer = useCallback((prayer) => {
        const now = new Date();
        const times = calculatePrayerTimes(now);

        const newPrayerEntry = {
            prayer,
            times,
            currentIndex: 0,
            status: 'praying'
        };

        // 기존 기도 목록에 새 기도 추가
        setTodaysPrayers(prev => {
            const newPrayers = [...prev, newPrayerEntry];
            const prayerIdx = newPrayers.length - 1;

            // 첫 번째 기도 즉시 시작 (애니메이션)
            setShowPrayingAnimation(true);
            setActivePrayerIndex(prayerIdx);

            setTimeout(() => {
                setShowPrayingAnimation(false);
                setActivePrayerIndex(-1);

                setTodaysPrayers(currentPrayers => {
                    const updatedPrayers = [...currentPrayers];
                    const currentPrayer = updatedPrayers[prayerIdx];
                    if (!currentPrayer) return currentPrayers;

                    if (times.length > 1) {
                        currentPrayer.currentIndex = 1;
                    } else {
                        currentPrayer.status = 'completed';
                        currentPrayer.currentIndex = 1;
                    }
                    saveToStorage(updatedPrayers);
                    return updatedPrayers;
                });
            }, 5000);

            // 즉시 저장
            saveToStorage(newPrayers);
            return newPrayers;
        });

        return {
            totalPrayers: times.length,
            nextPrayerTime: times.length > 1 ? times[1] : null,
            minutesUntilMidnight: getMinutesUntilMidnight(),
        };
    }, [saveToStorage]);

    // 어제 기도 완료 메시지 확인
    const dismissYesterdayMessage = useCallback(() => {
        setIsYesterdayCompleted(false);
    }, []);

    // 특정 기도의 다음 기도까지 남은 시간 계산
    const getNextPrayerInfo = useCallback((prayerIndex) => {
        const prayer = todaysPrayers[prayerIndex];
        if (!prayer || prayer.status !== 'praying' || prayer.currentIndex >= prayer.times.length) {
            return null;
        }

        const nextTime = prayer.times[prayer.currentIndex];
        const now = new Date();
        const diffMs = nextTime - now;

        if (diffMs <= 0) return { remaining: '곧', time: nextTime };

        const diffMins = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        let remaining;
        if (hours > 0) {
            remaining = `${hours}시간 ${mins}분`;
        } else {
            remaining = `${mins}분`;
        }

        return { remaining, time: nextTime };
    }, [todaysPrayers]);

    // 전체 상태 계산
    const hasPrayingPrayers = todaysPrayers.some(p => p.status === 'praying');
    const hasCompletedPrayers = todaysPrayers.some(p => p.status === 'completed');

    return {
        // 여러 기도 지원
        todaysPrayers,
        showPrayingAnimation,
        activePrayerIndex,
        isLoading,
        submitPrayer,
        dismissYesterdayMessage,
        getNextPrayerInfo,
        // 전체 상태
        hasTodaysPrayer: todaysPrayers.length > 0,
        isYesterdayCompleted,
        hasPrayingPrayers,
        hasCompletedPrayers,
        prayerCount: todaysPrayers.length,
    };
}
