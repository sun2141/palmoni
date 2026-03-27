import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  // 앱 상태 새로고침 트리거
  const [stateVersion, setStateVersion] = useState(0);

  // 로그인 성공 시 호출할 콜백 저장
  const onLoginSuccessRef = useRef(null);
  const lastActiveTime = useRef(Date.now());
  const isCheckingSession = useRef(false);

  // 세션 초기화 및 복원
  useEffect(() => {
    let mounted = true;
    let initTimeout = null;
    let initializedViaEvent = false;

    const completeInitialization = (source) => {
      if (mounted && !isInitialized && !initializedViaEvent) {
        initializedViaEvent = true;
        setIsInitialized(true);
        if (initTimeout) clearTimeout(initTimeout);
        console.log(`[Auth] Initialization completed via ${source}`);
      }
    };

    // Listen for auth changes FIRST - this often fires before getSession returns
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('[Auth] Auth state changed:', event, newSession ? 'with session' : 'no session');

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // 세션이 있으면 프로필 로드
          try {
            await loadUserProfile(newSession.user.id);
          } catch (err) {
            console.warn('[Auth] Profile load failed in event handler:', err);
            setLoading(false);
          }

          // 로그인 성공 콜백 실행
          if (event === 'SIGNED_IN' && onLoginSuccessRef.current) {
            setTimeout(() => {
              onLoginSuccessRef.current?.(newSession.user);
              onLoginSuccessRef.current = null;
            }, 100);
          }

          // 세션이 있는 이벤트로 초기화 완료
          // INITIAL_SESSION, TOKEN_REFRESHED, SIGNED_IN 모두 처리
          if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
            completeInitialization(`onAuthStateChange(${event})`);
          }
        } else {
          setProfile(null);
          setLoading(false);

          // 세션 없는 INITIAL_SESSION도 초기화 완료로 처리
          if (event === 'INITIAL_SESSION') {
            completeInitialization('onAuthStateChange(INITIAL_SESSION - no session)');
          }
        }
      }
    );

    const initializeAuth = async () => {
      console.log('[Auth] Starting initialization...');
      const startTime = Date.now();

      // 타임아웃 설정 (5초 - onAuthStateChange가 보통 더 빨리 응답함)
      initTimeout = setTimeout(() => {
        if (mounted && !isInitialized && !initializedViaEvent) {
          console.warn('[Auth] Initialization timeout after 5s - forcing completion');
          setLoading(false);
          completeInitialization('timeout');
        }
      }, 5000);

      try {
        // 저장된 세션 복원 시도 (onAuthStateChange와 병렬로 진행)
        console.log('[Auth] Calling getSession...');
        const { data: { session: restoredSession }, error } = await supabase.auth.getSession();
        console.log('[Auth] getSession completed in', Date.now() - startTime, 'ms');

        if (error) {
          console.error('[Auth] Session restore error:', error);
        }

        // onAuthStateChange가 이미 처리했으면 스킵
        if (initializedViaEvent) {
          console.log('[Auth] Already initialized via event, skipping getSession result');
          return;
        }

        if (mounted) {
          if (restoredSession?.user) {
            setSession(restoredSession);
            setUser(restoredSession.user);
            try {
              console.log('[Auth] Loading profile...');
              await loadUserProfile(restoredSession.user.id);
              console.log('[Auth] Profile loaded in', Date.now() - startTime, 'ms total');
            } catch (profileErr) {
              console.warn('[Auth] Profile load failed:', profileErr);
              setLoading(false);
            }
          } else {
            console.log('[Auth] No session found');
            setLoading(false);
          }
          completeInitialization('getSession');
        }
      } catch (err) {
        console.error('[Auth] Initialization error:', err);
        if (mounted && !initializedViaEvent) {
          setLoading(false);
          completeInitialization('error');
        }
      }
    };

    initializeAuth();

    // 앱이 백그라운드에서 돌아왔을 때 세션 확인
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mounted) {
        // 중복 체크 방지
        if (isCheckingSession.current) return;
        isCheckingSession.current = true;

        const now = Date.now();
        const timeSinceLastActive = now - lastActiveTime.current;
        lastActiveTime.current = now;

        // 5분 미만이면 세션 체크 스킵 (불필요한 API 호출 방지)
        if (timeSinceLastActive < 5 * 60 * 1000) {
          isCheckingSession.current = false;
          return;
        }

        try {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();

          // 세션 에러 발생 시 (토큰 만료 등)
          if (error) {
            console.warn('Session check error:', error.message);
            // 세션 갱신 시도
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.warn('Session refresh failed:', refreshError.message);
              isCheckingSession.current = false;
              return;
            }
            // 세션 갱신 성공
            if (refreshData?.session) {
              setSession(refreshData.session);
              setUser(refreshData.session.user);
              await loadUserProfile(refreshData.session.user.id);
            }
            isCheckingSession.current = false;
            return;
          }

          // 현재 세션이 있으면 프로필만 새로고침
          if (currentSession?.user) {
            await loadUserProfile(currentSession.user.id);
            // 세션 갱신
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData?.session) {
              setSession(refreshData.session);
            }
          }
        } catch (err) {
          console.error('Visibility change session check error:', err);
        } finally {
          isCheckingSession.current = false;
        }
      } else if (document.visibilityState === 'hidden') {
        // 백그라운드로 전환 시 시간 기록
        lastActiveTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // iOS Safari bfcache 복원 시 - 단순히 stateVersion만 증가시켜 리렌더링 유도
    const handlePageShow = (event) => {
      if (event.persisted && mounted) {
        console.log('App restored from bfcache');
        setStateVersion(v => v + 1);
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    // 네트워크 재연결 시 세션 확인 (컴퓨터 절전 모드 복귀 등)
    const handleOnline = async () => {
      if (mounted && user) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            setSession(refreshData.session);
          }
        } catch (err) {
          console.warn('Online session refresh error:', err);
        }
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      mounted = false;
      if (initTimeout) clearTimeout(initTimeout);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Error refreshing profile:', err);
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return { data: null, error: error.message };
    }
  };

  const signInWithKakao = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in with Kakao:', error);
      return { data: null, error: error.message };
    }
  };

  const signInWithApple = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      return { data: null, error: error.message };
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in with email:', error);
      return { data: null, error: error.message };
    }
  };

  const signUpWithEmail = async (email, password, displayName, birthDate) => {
    try {
      // 동일 이름+생년월일 조합 중복 체크
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', displayName)
        .eq('birth_date', birthDate)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking duplicate:', checkError);
      }

      if (existing) {
        return { data: null, error: '이미 동일한 이름과 생년월일로 가입된 계정이 있습니다' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            full_name: displayName,
            birth_date: birthDate
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { data: null, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setSession(null);

      // 로그아웃 시 로컬 기도 데이터 초기화
      localStorage.removeItem('palmoni_todays_prayers');
      localStorage.removeItem('palmoni_todays_prayer'); // 기존 형식도 삭제
      localStorage.removeItem('palmoni_pending_prayer');

      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      return { error: error.message };
    }
  };

  // 로그인 성공 콜백 등록
  const setOnLoginSuccess = useCallback((callback) => {
    onLoginSuccessRef.current = callback;
  }, []);

  // 강제 새로고침 함수
  const forceRefresh = useCallback(async () => {
    if (session?.user) {
      try {
        await loadUserProfile(session.user.id);
        setStateVersion(v => v + 1);
      } catch (err) {
        console.error('Force refresh error:', err);
      }
    } else {
      setStateVersion(v => v + 1);
    }
  }, [session]);

  const value = {
    user,
    profile,
    session,
    loading,
    isInitialized,
    stateVersion, // 컴포넌트가 이 값을 의존성으로 사용하면 상태 변경 시 리렌더링됨
    refreshProfile,
    forceRefresh,
    signInWithGoogle,
    signInWithKakao,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    setOnLoginSuccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
