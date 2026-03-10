import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * 오늘의 기도 시스템 훅
 *
 * 로직:
 * 1. 사용자가 기도를 맡기면, 오늘 자정까지 남은 시간을 계산
 * 2. 3시간 이상 남았으면 3번 기도 (즉시 + 2번 추가)
 * 3. 3시간 미만이면 1번만 기도
 * 4. 다음날 접속 시 "어제의 기도가 완료되었습니다" 메시지
 */
export function useTodaysPrayer() {
    const { user } = useAuth();
    const [todaysPrayer, setTodaysPrayer] = useState(null);
    const [prayerTimes, setPrayerTimes] = useState([]);
    const [prayerStatus, setPrayerStatus] = useState('idle'); // idle, praying, completed
    const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
    const [showPrayingAnimation, setShowPrayingAnimation] = useState(false);

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

    // 저장된 오늘의 기도 불러오기
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const savedDate = new Date(data.date).toDateString();
                const today = new Date().toDateString();

                if (savedDate === today) {
                    // 오늘 기도가 있으면 복원
                    setTodaysPrayer(data.prayer);
                    setPrayerTimes(data.times.map(t => new Date(t)));
                    setCurrentPrayerIndex(data.currentIndex);
                    setPrayerStatus(data.status);
                } else if (savedDate < today && data.status !== 'idle') {
                    // 어제 기도가 있었으면 완료 상태로 표시
                    setPrayerStatus('yesterday_completed');
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (e) {
                console.error('Failed to parse saved prayer:', e);
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    // 기도 시간 체크 (1분마다)
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

        const interval = setInterval(checkPrayerTime, 60000); // 1분마다 체크
        checkPrayerTime(); // 즉시 한 번 체크

        return () => clearInterval(interval);
    }, [prayerStatus, prayerTimes, currentPrayerIndex]);

    // localStorage에 저장
    const saveToStorage = useCallback((updates = {}) => {
        const data = {
            prayer: todaysPrayer,
            times: prayerTimes.map(t => t.toISOString()),
            currentIndex: currentPrayerIndex,
            status: prayerStatus,
            date: new Date().toISOString(),
            ...updates,
            prayer: updates.prayer || todaysPrayer,
            times: updates.times || prayerTimes.map(t => t.toISOString()),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [todaysPrayer, prayerTimes, currentPrayerIndex, prayerStatus]);

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

        // localStorage에 저장
        const data = {
            prayer,
            times: times.map(t => t.toISOString()),
            currentIndex: times.length > 1 ? 1 : 0,
            status: times.length > 1 ? 'praying' : 'completed',
            date: now.toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        return {
            totalPrayers: times.length,
            nextPrayerTime: times.length > 1 ? times[1] : null,
            minutesUntilMidnight: getMinutesUntilMidnight(),
        };
    }, []);

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
        submitPrayer,
        dismissYesterdayMessage,
        getNextPrayerInfo,
        totalPrayers: prayerTimes.length,
        completedPrayers: currentPrayerIndex,
        hasTodaysPrayer: prayerStatus === 'praying' || prayerStatus === 'completed',
        isYesterdayCompleted: prayerStatus === 'yesterday_completed',
    };
}
