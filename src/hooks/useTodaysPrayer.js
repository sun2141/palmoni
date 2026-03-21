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
    const previousUserId = useRef(user?.id);
    const lastSubmitTime = useRef(0); // 중복 submitPrayer 방지
    const processingPrayerRef = useRef(new Set());
    const lastVisibilityTime = useRef(Date.now());

    // localStorage 키
    const STORAGE_KEY = 'palmoni_todays_prayers';

    // 자정까지 남은 시간(분) 계산
    const getMinutesUntilMidnight = useCallback(() => {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        return Math.floor((midnight - now) / (1000 * 60));
    }, []);

    // 기도 시간 계산 (10분 후 첫 기도 시작, 이후 자정까지 균등 분배)
    const calculatePrayerTimes = useCallback((startTime) => {
        const minutesLeft = getMinutesUntilMidnight();
        const FIRST_PRAYER_DELAY = 10; // 첫 기도까지 10분 대기

        // 첫 번째 기도: 10분 후
        const firstPrayerTime = new Date(startTime.getTime() + FIRST_PRAYER_DELAY * 60 * 1000);
        const times = [firstPrayerTime];

        // 첫 기도 이후 남은 시간 계산
        const minutesAfterFirst = minutesLeft - FIRST_PRAYER_DELAY;

        if (minutesAfterFirst >= 120) { // 첫 기도 후 2시간 이상 남으면 3회 기도
            // 남은 시간을 균등 분배하여 2번 더 기도
            const interval = Math.floor(minutesAfterFirst / 3);
            times.push(new Date(firstPrayerTime.getTime() + interval * 60 * 1000));
            times.push(new Date(firstPrayerTime.getTime() + interval * 2 * 60 * 1000));
        } else if (minutesAfterFirst >= 30) { // 30분 이상 남으면 2회 기도
            const interval = Math.floor(minutesAfterFirst / 2);
            times.push(new Date(firstPrayerTime.getTime() + interval * 60 * 1000));
        }
        // 30분 미만이면 1회만 기도

        return times;
    }, [getMinutesUntilMidnight]);

    // localStorage에만 저장 (내부용)
    const saveToStorageInternal = useCallback((prayers) => {
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
    }, []);

    // localStorage + Supabase 백업에 저장 (useEffect보다 먼저 정의)
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

    // 로그아웃/로그인 감지하여 상태 관리
    useEffect(() => {
        const prevId = previousUserId.current;
        const currId = user?.id;

        // 로그아웃 (user가 있었다가 없어진 경우)
        if (prevId && !currId) {
            setTodaysPrayers([]);
            setIsYesterdayCompleted(false);
            setShowPrayingAnimation(false);
            setActivePrayerIndex(-1);
            initialLoadDone.current = false;
            // localStorage도 정리 (다른 계정 로그인 시 혼선 방지)
            localStorage.removeItem(STORAGE_KEY);
        }

        // 다른 계정으로 로그인 또는 재로그인 (user가 변경된 경우)
        if (currId && prevId !== currId) {
            setTodaysPrayers([]);
            initialLoadDone.current = false;
        }

        previousUserId.current = currId;
    }, [user]);

    // 앱이 백그라운드에서 돌아왔을 때 상태 새로고침
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                const timeSinceLastVisible = now - lastVisibilityTime.current;

                // 5분 이상 백그라운드에 있었으면 상태 새로고침
                if (timeSinceLastVisible > 5 * 60 * 1000) {
                    initialLoadDone.current = false;
                    setIsLoading(true);
                }
                lastVisibilityTime.current = now;
            }
        };

        // 네트워크 재연결 시 상태 새로고침 (컴퓨터 절전 모드 복귀 등)
        const handleOnline = () => {
            const now = Date.now();
            const timeSinceLastVisible = now - lastVisibilityTime.current;

            // 네트워크 재연결 시 데이터 동기화
            if (timeSinceLastVisible > 60 * 1000) { // 1분 이상 오프라인이었으면
                initialLoadDone.current = false;
                setIsLoading(true);
            }
            lastVisibilityTime.current = now;
        };

        // iOS Safari bfcache 복원 시 상태 새로고침
        const handlePageShow = (event) => {
            if (event.persisted) {
                // bfcache에서 복원됨 - 데이터 새로고침 필요
                initialLoadDone.current = false;
                setIsLoading(true);
                lastVisibilityTime.current = Date.now();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);
        window.addEventListener('pageshow', handlePageShow);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, []);

    // 저장된 오늘의 기도들 불러오기 (로그인 사용자: Supabase 우선, 비로그인: localStorage)
    useEffect(() => {
        if (initialLoadDone.current) return;

        const loadPrayerSession = async () => {
            setIsLoading(true);
            let loaded = false;

            // 로그인 사용자: Supabase에서 먼저 로드 (신뢰할 수 있는 소스)
            if (user) {
                try {
                    const { data, isYesterday, error } = await getTodaysPrayerSession(user.id);
                    if (data && !error) {
                        if (isYesterday) {
                            // 어제 데이터 - 완료 메시지만 표시하고 데이터는 로드하지 않음
                            setIsYesterdayCompleted(true);
                            setTodaysPrayers([]); // 오늘 기도는 비어있음
                            // localStorage도 정리
                            localStorage.removeItem(STORAGE_KEY);
                        } else {
                            // 오늘 데이터 - 새 형식 또는 기존 형식 처리
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

                            // localStorage에도 동기화
                            try {
                                saveToStorageInternal(data.prayers || [data]);
                            } catch (syncError) {
                                console.warn('Failed to sync to localStorage:', syncError);
                            }
                        }
                        loaded = true;
                    }
                } catch (e) {
                    console.error('Failed to load from Supabase:', e);
                    // Supabase 실패해도 계속 진행 (localStorage 시도)
                }
            }

            // 비로그인 사용자 또는 Supabase에서 로드 실패: localStorage 시도
            if (!loaded) {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    try {
                        const data = JSON.parse(saved);
                        const savedDate = new Date(data.date).toDateString();
                        const today = new Date().toDateString();

                        if (savedDate === today) {
                            // 새 형식 (배열) 또는 기존 형식 (단일) 처리
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
                        } else if (savedDate < today) {
                            // 어제 데이터가 있으면
                            const hadPrayers = data.prayers?.length > 0 || data.prayer;
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
    }, [user, saveToStorageInternal]);

    // 앱 로드 시 지난 기도 시간들을 모두 건너뛰기 (애니메이션 없이)
    // 최초 로드 시 한 번만 실행
    const skipPastPrayersRef = useRef(false);
    useEffect(() => {
        if (isLoading || todaysPrayers.length === 0) return;
        // 이미 처리했으면 스킵
        if (skipPastPrayersRef.current) return;
        skipPastPrayersRef.current = true;

        const now = new Date();
        const nowTime = now.getTime();
        const fiveMinutes = 5 * 60 * 1000;
        let needsUpdate = false;

        const updatedPrayers = todaysPrayers.map(prayer => {
            if (prayer.status !== 'praying') return prayer;

            // 지난 기도 시간들을 모두 건너뛰기
            let newIndex = prayer.currentIndex;
            while (newIndex < prayer.times.length) {
                const prayerTime = prayer.times[newIndex].getTime();
                const timeDiff = nowTime - prayerTime;

                // 5분 이상 지난 기도는 건너뜀
                if (timeDiff > fiveMinutes) {
                    console.log('지난 기도 건너뜀:', newIndex, '시간차:', Math.floor(timeDiff / 60000), '분');
                    newIndex++;
                } else {
                    break;
                }
            }

            if (newIndex !== prayer.currentIndex) {
                needsUpdate = true;
                if (newIndex >= prayer.times.length) {
                    return { ...prayer, currentIndex: newIndex, status: 'completed' };
                }
                return { ...prayer, currentIndex: newIndex };
            }
            return prayer;
        });

        if (needsUpdate) {
            setTodaysPrayers(updatedPrayers);
            saveToStorage(updatedPrayers);
        }
    }, [isLoading, todaysPrayers.length, saveToStorage]); // 의존성 추가

    // 각 기도의 시간 체크 (모든 진행 중인 기도를 독립적으로 관리)
    // todaysPrayers를 ref로 관리하여 effect 재실행 최소화
    const todaysPrayersRef = useRef(todaysPrayers);
    useEffect(() => {
        todaysPrayersRef.current = todaysPrayers;
    }, [todaysPrayers]);

    useEffect(() => {
        const prayingPrayers = todaysPrayers.filter(p => p.status === 'praying');
        if (prayingPrayers.length === 0) return;

        const checkPrayerTimes = () => {
            const prayers = todaysPrayersRef.current;
            const now = new Date();
            const nowTime = now.getTime();
            const fiveMinutes = 5 * 60 * 1000;

            prayers.forEach((prayer, prayerIdx) => {
                if (prayer.status !== 'praying') return;

                // 이미 처리 중인 기도는 건너뜀
                if (processingPrayerRef.current.has(prayerIdx)) return;

                const nextPrayerTime = prayer.times[prayer.currentIndex];
                if (!nextPrayerTime) return;

                const prayerTime = nextPrayerTime.getTime();
                const timeDiff = nowTime - prayerTime;

                // 기도 시간이 아직 안 됐으면 (미래 시간) 건너뜀
                if (timeDiff < 0) return;

                // 기도 시간이 5분 이상 지났으면 (이미 놓친 기도) 조용히 건너뛰기
                if (timeDiff > fiveMinutes) {
                    console.log('기도 시간이 지남, 건너뜀:', prayer.currentIndex);
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
                    return;
                }

                // 기도 시간이 됐고 5분 이내면 애니메이션 표시
                // 처리 중 표시
                processingPrayerRef.current.add(prayerIdx);

                // 기도 시간이 되면 애니메이션 표시
                setShowPrayingAnimation(true);
                setActivePrayerIndex(prayerIdx);

                // 20초 후 다음 기도로 넘어감 (기도문 읽을 시간 확보)
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

                    // 처리 완료 표시
                    processingPrayerRef.current.delete(prayerIdx);
                }, 20000); // 20초
            });
        };

        const interval = setInterval(checkPrayerTimes, 30000); // 30초마다 체크

        // 앱 시작 시 즉시 체크하지 않고 1초 후에 체크 (다른 effect들이 완료되도록)
        const initialCheck = setTimeout(checkPrayerTimes, 1000);

        return () => {
            clearInterval(interval);
            clearTimeout(initialCheck);
        };
    // prayingCount만 의존하여 새 기도 추가 시에만 재실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todaysPrayers.length, saveToStorage]);

    // 새 기도 맡기기 (기존 기도에 추가)
    const submitPrayer = useCallback((prayer) => {
        const now = new Date();

        // 중복 호출 방지 (1초 이내 재호출 무시)
        if (now.getTime() - lastSubmitTime.current < 1000) {
            console.warn('Duplicate submitPrayer call ignored');
            return { totalPrayers: 0, nextPrayerTime: null, minutesUntilMidnight: 0 };
        }
        lastSubmitTime.current = now.getTime();

        const times = calculatePrayerTimes(now);

        const newPrayerEntry = {
            prayer,
            times,
            currentIndex: 0,
            status: 'praying'
        };

        // 기존 기도 목록에 새 기도 추가
        // 첫 번째 기도 시간 체크는 checkPrayerTimes useEffect에서 담당
        setTodaysPrayers(prev => {
            const newPrayers = [...prev, newPrayerEntry];
            // 즉시 저장
            saveToStorage(newPrayers);
            return newPrayers;
        });

        return {
            totalPrayers: times.length,
            nextPrayerTime: times.length > 1 ? times[1] : null,
            minutesUntilMidnight: getMinutesUntilMidnight(),
        };
    }, [saveToStorage, calculatePrayerTimes, getMinutesUntilMidnight]);

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
