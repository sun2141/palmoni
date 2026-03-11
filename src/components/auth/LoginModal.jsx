import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast';
import './LoginModal.css';

export function LoginModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { signInWithGoogle, signInWithKakao, signInWithEmail, signUpWithEmail } = useAuth();
  const toast = useToast();

  const handleSocialSignIn = async (provider) => {
    setLoading(true);
    setError('');

    let result;
    switch (provider) {
      case 'google':
        result = await signInWithGoogle();
        break;
      case 'kakao':
        result = await signInWithKakao();
        break;
      default:
        result = { error: 'Unknown provider' };
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onSuccess?.();
      onClose();
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let result;
    if (mode === 'signin') {
      result = await signInWithEmail(email, password);
    } else {
      // 회원가입 유효성 검사
      if (!displayName.trim()) {
        setError('이름을 입력해주세요');
        setLoading(false);
        return;
      }
      if (!birthDate) {
        setError('생년월일을 입력해주세요');
        setLoading(false);
        return;
      }
      // 만 14세 이상 확인
      const birth = new Date(birthDate);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())
        ? age - 1
        : age;
      if (actualAge < 14) {
        setError('만 14세 이상만 가입할 수 있습니다');
        setLoading(false);
        return;
      }
      if (!agreedToTerms) {
        setError('서비스 이용약관에 동의해주세요');
        setLoading(false);
        return;
      }
      result = await signUpWithEmail(email, password, displayName, birthDate);
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      if (mode === 'signup') {
        setError('');
        setMode('signin');
        toast.success('회원가입이 완료되었습니다. 이메일을 확인해주세요.');
      } else {
        onSuccess?.();
        onClose();
      }
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <h2>{mode === 'signin' ? '로그인' : '회원가입'}</h2>
        <p className="modal-subtitle">
          {mode === 'signin'
            ? '계정에 로그인하여 기도문을 저장하고 관리하세요'
            : '새 계정을 만들어 Palmoni와 함께 시작하세요'}
        </p>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* Social Sign In Buttons */}
        <div className="social-buttons">
          {/* Kakao */}
          <button
            className="social-btn kakao-btn"
            onClick={() => handleSocialSignIn('kakao')}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#000000" d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18-.16.55-.58 2-.66 2.31-.1.39.14.39.3.28.12-.08 1.93-1.31 2.71-1.84.65.09 1.32.14 2.01.14 4.42 0 8-2.79 8-6.07C17 3.79 13.42 1 9 1z"/>
            </svg>
            카카오로 계속하기
          </button>

          {/* Google */}
          <button
            className="social-btn google-btn"
            onClick={() => handleSocialSignIn('google')}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52A4.8 4.8 0 014.5 7.5V5.42H1.83a8 8 0 000 7.17z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.42L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
            </svg>
            Google로 계속하기
          </button>

        </div>

        <div className="divider">
          <span>또는 이메일로</span>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth}>
          {mode === 'signup' && (
            <>
              <input
                type="text"
                placeholder="이름 (실명)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                required
              />
              <div className="birth-date-field">
                <label>생년월일</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={loading}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </>
          )}

          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            minLength={6}
          />

          {mode === 'signup' && (
            <label className="terms-checkbox">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={loading}
              />
              <span>
                <a href="/terms" target="_blank" rel="noopener noreferrer">서비스 이용약관</a> 및{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">개인정보처리방침</a>에 동의합니다
              </span>
            </label>
          )}

          <button
            type="submit"
            className="email-auth-btn"
            disabled={loading}
          >
            {loading
              ? '처리 중...'
              : mode === 'signin'
              ? '로그인'
              : '회원가입'}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="toggle-mode">
          {mode === 'signin' ? (
            <>
              계정이 없으신가요?{' '}
              <button onClick={() => setMode('signup')}>회원가입</button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{' '}
              <button onClick={() => setMode('signin')}>로그인</button>
            </>
          )}
        </p>

        {/* Guest option */}
        <button className="guest-btn" onClick={handleContinueAsGuest}>
          게스트로 계속하기 (하루 3회 제한)
        </button>
      </div>
    </div>
  );
}
