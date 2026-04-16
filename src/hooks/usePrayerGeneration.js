import { useState, useCallback, useRef } from 'react';
import { logger } from '../lib/logger';

/**
 * Custom hook for prayer generation with streaming support
 * Centralizes prayer generation logic, streaming, emotion detection
 */
export function usePrayerGeneration() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0); // 0-4 for the 4-step process
  const isGeneratingRef = useRef(false); // 중복 호출 방지용 ref

  const generatePrayer = useCallback(async (topic) => {
    // 이미 생성 중이면 무시
    if (isGeneratingRef.current) {
      return null;
    }
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setTitle('');
    setContent('');
    setError(null);
    setProgress(1); // Step 1: Listening

    try {
      // Simulate progress steps for better UX
      setTimeout(() => setProgress(2), 500); // Step 2: Delivering

      let response;
      try {
        response = await fetch('/api/generate-prayer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topic }),
        });
      } catch (networkErr) {
        // fetch 자체가 실패 = 네트워크 오류
        setError('인터넷 연결을 확인해주세요.');
        setProgress(0);
        return null;
      }

      if (response.status === 429) {
        setError('오늘의 기도 생성 한도를 초과했습니다. 내일 다시 시도해주세요.');
        setProgress(0);
        return null;
      }

      if (!response.ok) {
        setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        setProgress(0);
        return null;
      }

      const data = await response.json();

      setProgress(3); // Step 3: Comforting

      // Simulate streaming effect by gradually revealing text
      await streamText(data.title, setTitle, 30);
      await streamText(data.content, setContent, 20);

      setProgress(4); // Step 4: Complete

      return { title: data.title, content: data.content };
    } catch (err) {
      logger.error('Error generating prayer:', err);
      setError('기도문을 생성하는 중 오류가 발생했습니다.');
      setProgress(0);
      return null;
    } finally {
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  }, []);

  // Helper function to stream text character by character
  const streamText = async (text, setter, delayMs) => {
    const chars = text.split('');
    let accumulated = '';

    for (let i = 0; i < chars.length; i++) {
      accumulated += chars[i];
      setter(accumulated);

      // Wait between characters for typing effect
      if (i < chars.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  };

  const reset = useCallback(() => {
    setTitle('');
    setContent('');
    setError(null);
    setProgress(0);
    setIsGenerating(false);
    isGeneratingRef.current = false;
  }, []);

  // 외부에서 기도문 설정 (복원용)
  const setPrayer = useCallback((prayerTitle, prayerContent) => {
    setTitle(prayerTitle);
    setContent(prayerContent);
    setProgress(4); // 완료 상태로 표시
  }, []);

  return {
    title,
    content,
    isGenerating,
    error,
    progress,
    generatePrayer,
    reset,
    setPrayer
  };
}
