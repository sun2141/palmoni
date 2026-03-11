import { setupCors, handlePreflight } from './lib/cors.js';
import { checkRateLimit, applyRateLimitHeaders, sendRateLimitExceeded } from './lib/rateLimit.js';

const backgroundActivities = [
  "누군가의 '가족의 건강'을 위한 기도가 진행 중입니다.",
  "방금 '취업 준비'로 힘들어하는 분의 마음이 전달되었습니다.",
  "어느 성도님의 '감사 기도'가 하늘에 닿았습니다.",
  "한 아이의 '깜찍한 소망'이 기도문으로 작성되었습니다.",
  "지금 '병상에 계신 분'을 위한 위로의 기도가 시작됩니다.",
  "익명의 사용자가 '평안한 밤'을 위해 기도하고 있습니다."
];

export default function handler(req, res) {
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
  const limitResult = checkRateLimit(req, 'general');
  applyRateLimitHeaders(res, limitResult, 'general');

  if (!limitResult.allowed) {
    return sendRateLimitExceeded(res, limitResult);
  }

  const randomActivity = backgroundActivities[Math.floor(Math.random() * backgroundActivities.length)];
  res.status(200).json({ message: randomActivity });
}
