import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        // 캐시 정리 후 새로고침
        if ('caches' in window) {
            caches.keys().then(names => {
                Promise.all(names.map(name => caches.delete(name))).then(() => {
                    window.location.reload();
                });
            });
        } else {
            window.location.reload();
        }
    };

    handleClearData = () => {
        // 모든 로컬 데이터 정리
        localStorage.clear();
        sessionStorage.clear();
        this.handleReload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    fontFamily: 'sans-serif',
                    maxWidth: '400px',
                    margin: '50px auto'
                }}>
                    <h2 style={{ color: '#e74c3c' }}>앱 오류 발생</h2>
                    <p style={{ color: '#666', marginBottom: '20px' }}>
                        문제가 발생했습니다. 아래 버튼을 눌러 다시 시도해주세요.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                            onClick={this.handleReload}
                            style={{
                                padding: '12px 24px',
                                fontSize: '16px',
                                backgroundColor: '#6C47FF',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            새로고침
                        </button>
                        <button
                            onClick={this.handleClearData}
                            style={{
                                padding: '12px 24px',
                                fontSize: '16px',
                                backgroundColor: '#95a5a6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            데이터 초기화 후 새로고침
                        </button>
                    </div>
                    {this.state.error && (
                        <details style={{ marginTop: '20px', textAlign: 'left' }}>
                            <summary style={{ cursor: 'pointer', color: '#999' }}>
                                오류 상세 정보
                            </summary>
                            <pre style={{
                                fontSize: '12px',
                                background: '#f5f5f5',
                                padding: '10px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}>
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
