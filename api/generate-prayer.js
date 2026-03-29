import { setupCors, handlePreflight } from './lib/cors.js';
import { checkRateLimit, applyRateLimitHeaders, sendRateLimitExceeded } from './lib/rateLimit.js';

// Emotion labels for prompt
const EMOTION_LABELS = {
  peace: '평화로운',
  gratitude: '감사하는',
  repentance: '회개하는',
  hope: '소망하는',
  sadness: '위로가 필요한',
};

/**
 * Build prayer prompt based on context
 */
function buildPrayerPrompt(topic, loopContext = null) {
  // Quick prayer (no loop context)
  if (!loopContext) {
    return `사용자의 기도 제목: "${topic}"

위 주제로 따뜻하고 위로가 되는 기독교 기도문을 작성하세요.

- 제목: 기도문의 주제를 담은 짧은 제목
- 본문: 300~500자 내외의 기도문. 나-전달법을 사용하고, 정중한 경어체를 사용합니다. 마지막에 "예수님의 이름으로 기도드립니다. 아멘."으로 끝맺습니다.

JSON 형식으로 응답하세요. 줄바꿈은 실제 줄바꿈 문자가 아닌 \\n으로 표현하세요.`;
  }

  // Loop prayer with context
  const { dayNumber, emotion, continuePrayer, previousCheckin } = loopContext;
  const emotionLabel = EMOTION_LABELS[emotion] || '평화로운';

  let prompt = `사용자의 기도 제목: "${topic}"

이 기도는 ${dayNumber}일째 이어지는 기도 여정입니다.
오늘의 마음 상태: ${emotionLabel}
`;

  if (previousCheckin?.note) {
    prompt += `사용자가 어제 남긴 메모: "${previousCheckin.note}"\n`;
  }

  if (continuePrayer && dayNumber > 1) {
    prompt += `\n이전 기도에 이어서, 연속성 있는 기도문을 작성해주세요. 마치 같은 이야기가 계속되는 것처럼요.\n`;
  }

  prompt += `
${emotionLabel} 마음을 담아 따뜻하고 위로가 되는 기독교 기도문을 작성하세요.

- 제목: 기도문의 주제를 담은 짧은 제목 (일차나 날짜는 포함하지 마세요)
- 본문: 300~500자 내외의 기도문. 나-전달법을 사용하고, 정중한 경어체를 사용합니다.
- ${emotionLabel} 감정에 어울리는 성경 구절 1개를 자연스럽게 포함해주세요.
- 마지막에 "예수님의 이름으로 기도드립니다. 아멘."으로 끝맺습니다.

JSON 형식으로 응답하세요. 줄바꿈은 실제 줄바꿈 문자가 아닌 \\n으로 표현하세요.`;

  return prompt;
}

export default async function handler(req, res) {
  // Setup CORS with domain restriction
  setupCors(req, res);

  // Handle preflight
  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check rate limit
  const limitResult = checkRateLimit(req, 'prayer_generation');
  applyRateLimitHeaders(res, limitResult, 'prayer_generation');

  if (!limitResult.allowed) {
    return sendRateLimitExceeded(res, limitResult);
  }

  const { topic, loopContext } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Prayer topic is required' });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'API configuration error',
        details: 'Server configuration issue'
      });
    }

    // Build prompt based on context (loop or quick prayer)
    const prompt = buildPrayerPrompt(topic, loopContext);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: '기도문의 제목'
                },
                content: {
                  type: 'string',
                  description: '기도문의 본문 내용'
                }
              },
              required: ['title', 'content']
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return res.status(500).json({
        error: 'Failed to generate prayer',
        details: `API returned ${response.status}`
      });
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const prayerData = JSON.parse(text);
      return res.status(200).json(prayerData);
    } catch (parseError) {
      console.error('Parse error:', parseError.message);
      return res.status(500).json({
        error: 'Failed to parse prayer response'
      });
    }
  } catch (error) {
    console.error('Error generating prayer:', error);
    return res.status(500).json({
      error: 'Internal server error during prayer generation'
    });
  }
}
