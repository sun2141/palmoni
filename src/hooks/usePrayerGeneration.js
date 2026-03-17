import { useState, useCallback, useRef } from 'react';

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

      const response = await fetch('/api/generate-prayer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      setProgress(3); // Step 3: Comforting

      // Simulate streaming effect by gradually revealing text
      await streamText(data.title, setTitle, 30);
      await streamText(data.content, setContent, 20);

      setProgress(4); // Step 4: Complete

      return { title: data.title, content: data.content };
    } catch (err) {
      console.error('Error generating prayer:', err);
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
