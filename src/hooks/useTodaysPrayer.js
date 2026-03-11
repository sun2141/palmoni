import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveTodaysPrayerSession, getTodaysPrayerSession } from '../lib/supabaseClient';

/**
 * 오늘의 기도 시스템 훅
 *
 * 로직:
 * 1. 사용자가 기도를 맡기면, 오늘 자정까지 남은 시간을 계산
 * 2. 3시간 이상 남았으면 3번 기도 (즉시 + 2번 추가)
 * 3. 3시간 미만이면 1번만 기도
 * 4. 다음날 접속 시 "어제의 기도가 완료되었습니다" 메시지
 * 5. 로그인 사용자는 Supabase에 백업 (localStorage 손실 방지)
 */
export function useTodaysPrayer() {
    const { user } = useAuth();
    const [todaysPrayer, setTodaysPrayer] = useState(null);
    const [prayerTimes, setPrayerTimes] = useState([]);
    const [prayerStatus, setPrayerStatus] = useState('idle'); // idle, praying, completed
    const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
    const [showPrayingAnimation, setShowPrayingAnimation] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 초기 로드 완료 여부 (중복 로드 방지)
    const initialLoadDone = useRef(false);

    // localStorage 키
    const STORAGE_KEY = 'palmoni_todays_prayer';

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

    // 저장된 오늘의 기도 불러오기 (localStorage + Supabase 백업)
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
                        setTodaysPrayer(data.prayer);
                        setPrayerTimes(data.times.map(t => new Date(t)));
                        setCurrentPrayerIndex(data.currentIndex);
                        setPrayerStatus(data.status);
                        loaded = true;
                    } else if (savedDate < today && data.status !== 'idle') {
                        setPrayerStatus('yesterday_completed');
                        localStorage.removeItem(STORAGE_KEY);
                        loaded = true;
                    }
                } catch (e) {
                    console.error('Failed to parse saved prayer:', e);
                    // 파싱 실패해도 localStorage 유지 (서버에서 복구 시도)
                }
            }

            // 2. 로그인 사용자: Supabase에서 복구 시도 (localStorage 없거나 손상된 경우)
            if (!loaded && user) {
                try {
                    const { data, isYesterday, error } = await getTodaysPrayerSession(user.id);
                    if (data && !error) {
                        if (isYesterday) {
                            setPrayerStatus('yesterday_completed');
                        } else {
                            setTodaysPrayer(data.prayer);
                            setPrayerTimes(data.times.map(t => new Date(t)));
                            setCurrentPrayerIndex(data.currentIndex);
                            setPrayerStatus(data.status);

                            // localStorage에도 복원
                            const localData = {
                                prayer: data.prayer,
                                times: data.times,
                                currentIndex: data.currentIndex,
                                status: data.status,
                                date: new Date().toISOString(),
                            };
                            try {
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
                            } catch (storageError) {
                                console.warn('localStorage save failed:', storageError);
                            }
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

    // 기도 시간 체크 (더 정밀한 타이밍)
    useEffect(() => {
        if (prayerStatus !== 'praying' || prayerTimes.length === 0) return;

        const checkPrayerTime = () => {
            const now = new Date();
            const nextPrayerTime = prayerTimes[currentPrayerIndex];

            if (nextPrayerTime && now >= nextPrayerTime) {
                // 기도 시간이 되면 애니메이션 표시
                setShowPrayingAnimation(true);

                // 5초 후 다음 기도로 넘어감
                setTimeout(() => {
                    setShowPrayingAnimation(false);
                    const nextIndex = currentPrayerIndex + 1;

                    if (nextIndex >= prayerTimes.length) {
                        // 모든 기도 완료
                        setPrayerStatus('completed');
                        saveToStorage({ status: 'completed', currentIndex: nextIndex });
                    } else {
                        setCurrentPrayerIndex(nextIndex);
                        saveToStorage({ currentIndex: nextIndex });
                    }
                }, 5000);
            }
        };

        // 다음 기도 시간까지의 정확한 간격 계산
        const now = new Date();
        const nextPrayerTime = prayerTimes[currentPrayerIndex];
        let checkInterval = 60000; // 기본 1분

        if (nextPrayerTime) {
            const timeUntilNext = nextPrayerTime - now;
            if (timeUntilNext > 0 && timeUntilNext < 60000) {
                // 1분 이내면 더 정밀하게 체크
                checkInterval = Math.min(10000, timeUntilNext);
            }
        }

        const interval = setInterval(checkPrayerTime, checkInterval);
        checkPrayerTime(); // 즉시 한 번 체크

        return () => clearInterval(interval);
    }, [prayerStatus, prayerTimes, currentPrayerIndex]);

    // localStorage + Supabase 백업에 저장
    const saveToStorage = useCallback((updates = {}) => {
        const prayer = updates.prayer || todaysPrayer;
        const times = updates.times || prayerTimes.map(t => t.toISOString());

        const data = {
            prayer,
            times,
            currentIndex: updates.currentIndex ?? currentPrayerIndex,
            status: updates.status || prayerStatus,
            date: new Date().toISOString(),
        };

        // localStorage에 저장 (에러 핸들링)
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('localStorage save failed:', e);
            // QuotaExceededError 등의 경우에도 Supabase 백업은 진행
        }

        // 로그인 사용자: Supabase 백업
        if (user) {
            saveTodaysPrayerSession(user.id, data).catch(e => {
                console.error('Supabase backup failed:', e);
            });
        }
    }, [todaysPrayer, prayerTimes, currentPrayerIndex, prayerStatus, user]);

    // 새 기도 맡기기
    const submitPrayer = useCallback((prayer) => {
        const now = new Date();
        const times = calculatePrayerTimes(now);

        setTodaysPrayer(prayer);
        setPrayerTimes(times);
        setCurrentPrayerIndex(0);
        setPrayerStatus('praying');
        setShowPrayingAnimation(true);

        // 첫 번째 기도 즉시 시작
        setTimeout(() => {
            setShowPrayingAnimation(false);
            if (times.length > 1) {
                setCurrentPrayerIndex(1);
            } else {
                setPrayerStatus('completed');
            }
        }, 5000);

        // 저장 데이터 준비
        const data = {
            prayer,
            times: times.map(t => t.toISOString()),
            currentIndex: times.length > 1 ? 1 : 0,
            status: times.length > 1 ? 'praying' : 'completed',
            date: now.toISOString(),
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

        return {
            totalPrayers: times.length,
            nextPrayerTime: times.length > 1 ? times[1] : null,
            minutesUntilMidnight: getMinutesUntilMidnight(),
        };
    }, [user]);

    // 어제 기도 완료 메시지 확인
    const dismissYesterdayMessage = useCallback(() => {
        setPrayerStatus('idle');
    }, []);

    // 다음 기도까지 남은 시간 계산
    const getNextPrayerInfo = useCallback(() => {
        if (prayerStatus !== 'praying' || currentPrayerIndex >= prayerTimes.length) {
            return null;
        }

        const nextTime = prayerTimes[currentPrayerIndex];
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
    }, [prayerStatus, prayerTimes, currentPrayerIndex]);

    return {
        todaysPrayer,
        prayerTimes,
        prayerStatus,
        currentPrayerIndex,
        showPrayingAnimation,
        isLoading,
        submitPrayer,
        dismissYesterdayMessage,
        getNextPrayerInfo,
        totalPrayers: prayerTimes.length,
        completedPrayers: currentPrayerIndex,
        hasTodaysPrayer: prayerStatus === 'praying' || prayerStatus === 'completed',
        isYesterdayCompleted: prayerStatus === 'yesterday_completed',
    };
}
