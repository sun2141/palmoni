import { setupCors, handlePreflight } from './lib/cors.js';
import { checkRateLimit, applyRateLimitHeaders, sendRateLimitExceeded } from './lib/rateLimit.js';

export default async function handler(req, res) {
  // Setup CORS with domain restriction
  setupCors(req, res);

  // Handle preflight
  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check rate limit
  const limitResult = checkRateLimit(req, 'prayer_generation');
  applyRateLimitHeaders(res, limitResult, 'prayer_generation');

  if (!limitResult.allowed) {
    return sendRateLimitExceeded(res, limitResult);
  }

  const { topic } = req.query;

  if (!topic) {
    return res.status(400).json({ error: 'Prayer topic is required' });
  }

  // Set up Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Handle client disconnect
  let isConnected = true;
  req.on('close', () => {
    isConnected = false;
  });

  // Set timeout for the request (25 seconds)
  const timeout = setTimeout(() => {
    if (isConnected) {
      res.write(`data: ${JSON.stringify({ error: 'Request timeout' })}\n\n`);
      res.end();
    }
  }, 25000);

  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      res.write(`data: ${JSON.stringify({ error: 'API configuration error' })}\n\n`);
      res.end();
      return;
    }

    // Generate prayer content using Google Gemini REST API
    const prompt = `사용자의 기도 제목: "${topic}"

위 주제로 따뜻하고 위로가 되는 기독교 기도문을 작성하세요.

- 제목: 기도문의 주제를 담은 짧은 제목
- 본문: 300~500자 내외의 기도문. 나-전달법을 사용하고, 정중한 경어체를 사용합니다. 마지막에 "예수님의 이름으로 기도드립니다. 아멘."으로 끝맺습니다.

JSON 형식으로 응답하세요. 줄바꿈은 실제 줄바꿈 문자가 아닌 \\n으로 표현하세요.`;

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

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      if (isConnected) {
        res.write(`data: ${JSON.stringify({ error: 'Failed to generate prayer' })}\n\n`);
        res.end();
      }
      return;
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      // Parse the JSON response
      const prayerData = JSON.parse(text);
      const fullText = `${prayerData.title}\n\n${prayerData.content}`;

      // Stream the text in chunks for better performance
      const chunkSize = 10;
      const chars = fullText.split('');

      for (let i = 0; i < chars.length && isConnected; i += chunkSize) {
        const chunk = chars.slice(i, i + chunkSize).join('');
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);

        // Small delay for typing effect
        if (i % 30 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Send completion signal
      if (isConnected) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }

    } catch (parseError) {
      console.error('Parse error:', parseError);
      if (isConnected) {
        res.write(`data: ${JSON.stringify({ error: 'Failed to parse prayer response' })}\n\n`);
        res.end();
      }
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error generating prayer:', error);
    if (isConnected) {
      res.write(`data: ${JSON.stringify({ error: 'Internal server error during prayer generation' })}\n\n`);
      res.end();
    }
  }
}
