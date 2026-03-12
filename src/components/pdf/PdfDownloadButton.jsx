import { useState, lazy, Suspense } from 'react';
import './PdfDownloadButton.css';

// Lazy load PDF components (reduces initial bundle by ~400KB)
const LazyPDFDownloadLink = lazy(() =>
  import('@react-pdf/renderer').then(mod => ({ default: mod.PDFDownloadLink }))
);
const LazyPrayerPdfDocument = lazy(() =>
  import('./PrayerPdfDocument').then(mod => ({ default: mod.PrayerPdfDocument }))
);

// Compact button content helper
function CompactContent({ loading }) {
  return (
    <>
      <span className="pdf-icon">{loading ? '⏳' : '📄'}</span>
      <span className="pdf-text">{loading ? '준비중' : 'PDF'}</span>
    </>
  );
}

// Wrapper component that loads PDF module on demand
function PdfDownloadLinkWrapper({ prayer, fileName, compact }) {
  return (
    <Suspense fallback={
      <span className={compact ? 'pdf-download-btn-compact' : 'pdf-download-btn'}>
        {compact ? <CompactContent loading /> : '📄 PDF 모듈 로딩...'}
      </span>
    }>
      <LazyPDFDownloadLink
        document={
          <Suspense fallback={null}>
            <LazyPrayerPdfDocument prayer={prayer} />
          </Suspense>
        }
        fileName={fileName}
        className={compact ? 'pdf-download-btn-compact' : 'pdf-download-btn'}
      >
        {({ loading }) =>
          compact ? (
            <CompactContent loading={loading} />
          ) : (
            loading ? '📄 PDF 준비 중...' : '📄 PDF 다운로드'
          )
        }
      </LazyPDFDownloadLink>
    </Suspense>
  );
}

export function PdfDownloadButton({ prayer, compact = false }) {
  const [showPdf, setShowPdf] = useState(false);

  if (!prayer || !prayer.title || !prayer.content) {
    return null;
  }

  const fileName = `${prayer.title.substring(0, 20)}_${new Date(prayer.created_at).toLocaleDateString('ko-KR').replace(/\./g, '')}.pdf`;

  // Show placeholder button until user clicks
  if (!showPdf) {
    return (
      <button
        onClick={() => setShowPdf(true)}
        className={compact ? 'pdf-download-btn-compact' : 'pdf-download-btn'}
        title="PDF 다운로드"
      >
        {compact ? (
          <>
            <span className="pdf-icon">📄</span>
            <span className="pdf-text">PDF</span>
          </>
        ) : (
          '📄 PDF 다운로드'
        )}
      </button>
    );
  }

  return <PdfDownloadLinkWrapper prayer={prayer} fileName={fileName} compact={compact} />;
}
