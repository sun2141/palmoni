import { Link } from 'react-router-dom';
import './Legal.css';

export function Privacy() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <Link to="/" className="legal-back">← 홈으로</Link>

                <h1>개인정보처리방침</h1>
                <p className="legal-date">시행일: 2026년 3월 18일</p>

                <section>
                    <h2>1. 개인정보의 수집 및 이용 목적</h2>
                    <p>
                        Palmoni(이하 "서비스")는 다음의 목적을 위하여 개인정보를 수집하고 있습니다.
                    </p>
                    <ul>
                        <li><strong>회원 관리:</strong> 서비스 이용에 따른 본인확인, 개인식별, 불량회원의 부정이용 방지</li>
                        <li><strong>서비스 제공:</strong> 기도문 생성, 저장, 예약 기도 기능 제공</li>
                        <li><strong>서비스 개선:</strong> 서비스 이용 통계, 사용자 경험 개선</li>
                    </ul>
                </section>

                <section>
                    <h2>2. 수집하는 개인정보 항목</h2>
                    <ul>
                        <li><strong>필수 항목:</strong> 이메일 주소 (소셜 로그인 시)</li>
                        <li><strong>선택 항목:</strong> 프로필 이름, 프로필 이미지</li>
                        <li><strong>자동 수집 항목:</strong> 접속 IP, 쿠키, 서비스 이용 기록, 기기 정보</li>
                    </ul>
                </section>

                <section>
                    <h2>3. 개인정보의 보유 및 이용기간</h2>
                    <p>
                        회원 탈퇴 시 또는 수집 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
                        단, 관계법령에 따라 보존할 필요가 있는 경우 법령에서 정한 기간 동안 보관합니다.
                    </p>
                    <ul>
                        <li>서비스 이용 기록: 회원 탈퇴 시까지</li>
                        <li>결제 기록: 5년 (전자상거래법)</li>
                    </ul>
                </section>

                <section>
                    <h2>4. 개인정보의 제3자 제공</h2>
                    <p>
                        서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
                        다만, 다음의 경우에는 예외로 합니다.
                    </p>
                    <ul>
                        <li>이용자가 사전에 동의한 경우</li>
                        <li>법령의 규정에 의하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                    </ul>
                </section>

                <section>
                    <h2>5. 광고 및 쿠키</h2>
                    <p>
                        서비스는 Google AdSense를 통해 광고를 게재합니다.
                        Google은 사용자의 관심사에 맞는 광고를 게재하기 위해 쿠키를 사용할 수 있습니다.
                    </p>
                    <ul>
                        <li>사용자는 Google 광고 설정에서 맞춤 광고를 비활성화할 수 있습니다.</li>
                        <li>쿠키 설정은 브라우저 설정에서 관리할 수 있습니다.</li>
                    </ul>
                    <p>
                        자세한 내용은{' '}
                        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
                            Google 광고 정책
                        </a>
                        을 참조하세요.
                    </p>
                </section>

                <section>
                    <h2>6. 개인정보의 안전성 확보 조치</h2>
                    <p>서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
                    <ul>
                        <li>개인정보의 암호화</li>
                        <li>해킹 등에 대비한 기술적 대책</li>
                        <li>개인정보에 대한 접근 제한</li>
                    </ul>
                </section>

                <section>
                    <h2>7. 이용자의 권리</h2>
                    <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
                    <ul>
                        <li>개인정보 열람 요청</li>
                        <li>오류 등이 있을 경우 정정 요청</li>
                        <li>삭제 요청</li>
                        <li>처리 정지 요청</li>
                    </ul>
                </section>

                <section>
                    <h2>8. 개인정보 보호책임자</h2>
                    <p>
                        서비스의 개인정보 보호책임자는 다음과 같습니다.
                    </p>
                    <ul>
                        <li><strong>이메일:</strong> privacy@palmoni.app</li>
                    </ul>
                </section>

                <section>
                    <h2>9. 개인정보처리방침의 변경</h2>
                    <p>
                        이 개인정보처리방침은 법령이나 서비스 정책의 변경에 따라 수정될 수 있으며,
                        변경 시 서비스 내 공지를 통해 안내합니다.
                    </p>
                </section>

                <div className="legal-footer">
                    <Link to="/terms">이용약관</Link>
                    <span>|</span>
                    <Link to="/">홈으로</Link>
                </div>
            </div>
        </div>
    );
}
