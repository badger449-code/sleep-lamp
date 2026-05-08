import { Readable } from 'stream';
import https from 'https';
import http from 'http';

let failureCount = 0;
let circuitBreakerTrippedUntil = 0;

export const resetCircuitBreaker = () => {
  failureCount = 0;
  circuitBreakerTrippedUntil = 0;
};

const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Generate TTS audio stream using DashScope HTTP API directly (no Python)
 * API: https://dashscope.aliyuncs.com/api/v1/services/audiogen/speech-generate
 */
async function fetchAudioFromDashScope(text, voice) {
  const apiKey = process.env.TTS_API_KEY || process.env.DASHSCOPE_API_KEY || '';
  const apiUrl = process.env.TTS_API_URL || 'https://dashscope.aliyuncs.com/api/v1';
  const model = process.env.TTS_MODEL || 'qwen3-tts-flash';
  
  if (!apiKey) {
    throw new Error('TTS_API_KEY or DASHSCOPE_API_KEY is not set');
  }

  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: model,
      input: { text: text },
      parameters: {
        voice: voice || 'Kai',
        format: 'wav',
        sample_rate: 24000,
        volume: 50,
        rate: 1.0
      }
    });

    const url = new URL(apiUrl);
    if (!url.pathname.includes('/services/audiogen/speech-generate')) {
      url.pathname = '/api/v1/services/audiogen/speech-generate';
    }

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav'
      }
    }, (res) => {
      if (res.statusCode === 200) {
        resolve(res);
      } else {
        let errorData = '';
        res.on('data', chunk => { errorData += chunk; });
        res.on('end', () => {
          reject(new Error(`TTS API error ${res.statusCode}: ${errorData}`));
        });
      }
    });

    req.on('error', reject);  // This was missing!
    req.write(requestBody);
    req.end();
  });
}

export const generateAudioStream = async function (text, voiceParams = {}, audioConfig = {}) {
  if (Date.now() < circuitBreakerTrippedUntil) {
    throw new Error('TTS Service is currently unavailable (Circuit Breaker Tripped).');
  }

  if (voiceParams.speed !== undefined && (voiceParams.speed < 0.5 || voiceParams.speed > 2.0)) {
    throw new Error('Invalid speed');
  }
  if (voiceParams.pitch !== undefined && (voiceParams.pitch < -12 || voiceParams.pitch > 12)) {
    throw new Error('Invalid pitch');
  }

  let voice = 'Kai';
  if (voiceParams.id) {
    voice = voiceParams.id;
  } else if (voiceParams.gender === 'male') {
    voice = 'Kai';
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const stream = await fetchAudioFromDashScope(text, voice);
      failureCount = 0;
      return stream;
    } catch (error) {
      attempt++;
      failureCount++;
      console.error(`[TTS Error] Attempt ${attempt} failed: ${error.message}`);

      if (failureCount >= 10) {
        console.error('[ALARM] TTS Circuit Breaker Tripped! Pausing for 60 seconds.');
        circuitBreakerTrippedUntil = Date.now() + 60 * 1000;
        failureCount = 0;
        throw new Error('TTS Service is currently unavailable (Circuit Breaker Tripped).');
      }

      if (attempt >= maxAttempts) {
        throw error;
      }

      await delay(Math.pow(2, attempt) * 500);
    }
  }
};
