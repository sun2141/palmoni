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

  // 로그인 성공 시 호출할 콜백 저장
  const onLoginSuccessRef = useRef(null);

  // 세션 초기화 및 복원
  useEffect(() => {
    let mounted = true;
    let initTimeout = null;

    const initializeAuth = async () => {
      // 타임아웃 설정 (5초 후에도 완료되지 않으면 강제 초기화)
      initTimeout = setTimeout(() => {
        if (mounted && !isInitialized) {
          console.warn('Auth initialization timeout - forcing completion');
          setLoading(false);
          setIsInitialized(true);
        }
      }, 5000);

      try {
        // 저장된 세션 복원 시도
        const { data: { session: restoredSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session restore error:', error);
        }

        if (mounted) {
          if (restoredSession?.user) {
            setSession(restoredSession);
            setUser(restoredSession.user);
            // 프로필 로드 실패해도 앱은 계속 진행
            try {
              await loadUserProfile(restoredSession.user.id);
            } catch (profileErr) {
              console.warn('Profile load failed:', profileErr);
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
          setIsInitialized(true);
          if (initTimeout) clearTimeout(initTimeout);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
          if (initTimeout) clearTimeout(initTimeout);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await loadUserProfile(newSession.user.id);

          // 로그인 성공 콜백 실행
          if (event === 'SIGNED_IN' && onLoginSuccessRef.current) {
            setTimeout(() => {
              onLoginSuccessRef.current?.(newSession.user);
              onLoginSuccessRef.current = null;
            }, 100);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // 앱이 백그라운드에서 돌아왔을 때 세션 확인
    let lastVisibilityCheck = Date.now();
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mounted) {
        const now = Date.now();
        const timeSinceLastCheck = now - lastVisibilityCheck;
        lastVisibilityCheck = now;

        try {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();

          // 세션 에러 발생 시 (토큰 만료 등)
          if (error) {
            console.warn('Session check error:', error.message);
            // 세션 갱신 시도
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.warn('Session refresh failed:', refreshError.message);
              // 세션 갱신 실패 - 로그아웃 처리
              if (user) {
                setUser(null);
                setProfile(null);
                setSession(null);
                setLoading(false);
              }
              return;
            }
            // 세션 갱신 성공
            if (refreshData.session) {
              setSession(refreshData.session);
              setUser(refreshData.session.user);
              return;
            }
          }

          // 세션이 만료되었거나 변경된 경우
          if (!currentSession && user) {
            // 로그아웃 상태로 변경
            setUser(null);
            setProfile(null);
            setSession(null);
            setLoading(false);
          } else if (currentSession?.user?.id !== user?.id) {
            // 세션이 변경된 경우 (다른 탭에서 로그인/로그아웃)
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            if (currentSession?.user) {
              await loadUserProfile(currentSession.user.id);
            } else {
              setProfile(null);
            }
          } else if (currentSession && timeSinceLastCheck > 30 * 60 * 1000) {
            // 30분 이상 백그라운드에 있었으면 세션 갱신
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData?.session) {
              setSession(refreshData.session);
            }
          }
        } catch (err) {
          console.error('Visibility change session check error:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // iOS Safari bfcache 복원 시 세션 확인
    const handlePageShow = async (event) => {
      if (event.persisted && mounted) {
        // bfcache에서 복원됨 - 세션 확인 필요
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
          } else if (user) {
            // 세션 만료됨
            setUser(null);
            setProfile(null);
            setSession(null);
          }
        } catch (err) {
          console.warn('PageShow session check error:', err);
        }
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

  const value = {
    user,
    profile,
    session,
    loading,
    isInitialized,
    refreshProfile,
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
