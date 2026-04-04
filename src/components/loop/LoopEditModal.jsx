import { useState } from 'react';
import { EmotionSelector } from './EmotionSelector';
import './LoopEditModal.css';

/**
 * 매일 기도 편집 모달
 * 제목, 기도 내용, 감정 수정 가능
 */
export function LoopEditModal({ loop, onSave, onClose }) {
    const [title, setTitle] = useState(loop.title || '');
    const [topic, setTopic] = useState(loop.topic || '');
    const [emotion, setEmotion] = useState(loop.current_emotion || 'peace');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) return;
        setSaving(true);
        await onSave({ title: title.trim(), topic: topic.trim(), emotion });
        setSaving(false);
    };

    return (
        <div className="loop-edit-overlay" onClick={onClose}>
            <div className="loop-edit-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="loop-edit-handle" />

                <div className="loop-edit-header">
                    <h2>매일 기도 수정</h2>
                    <button className="loop-edit-close" onClick={onClose}>✕</button>
                </div>

                <div className="loop-edit-body">
                    <div className="edit-form-section">
                        <label className="edit-label">
                            <span>🏷️</span> 기도 이름
                        </label>
                        <input
                            className="edit-input"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="예: 가족을 위한 기도"
                            maxLength={50}
                        />
                    </div>

                    <div className="edit-form-section">
                        <label className="edit-label">
                            <span>🙏</span> 기도 내용
                        </label>
                        <textarea
                            className="edit-textarea"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="기도하고 싶은 내용을 적어주세요"
                            maxLength={200}
                            rows={4}
                        />
                        <span className="edit-char-count">{topic.length}/200</span>
                    </div>

                    <div className="edit-form-section">
                        <label className="edit-label">
                            <span>💫</span> 현재 마음
                        </label>
                        <EmotionSelector
                            selected={emotion}
                            onChange={setEmotion}
                            variant="horizontal"
                        />
                    </div>
                </div>

                <div className="loop-edit-actions">
                    <button className="edit-cancel-btn" onClick={onClose} disabled={saving}>
                        취소
                    </button>
                    <button
                        className="edit-save-btn"
                        onClick={handleSave}
                        disabled={saving || !title.trim()}
                    >
                        {saving ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}
