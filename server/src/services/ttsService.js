import { Readable } from 'stream';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let failureCount = 0;
let circuitBreakerTrippedUntil = 0;

export const resetCircuitBreaker = () => {
  failureCount = 0;
  circuitBreakerTrippedUntil = 0;
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchAudioFromDashScope(text, voice) {
  const apiKey = process.env.TTS_API_KEY || process.env.DASHSCOPE_API_KEY || '';
  const pythonScript = process.env.TTS_PYTHON_BRIDGE || path.resolve(__dirname, '../../scripts/tts_final_bridge.py');
  
  if (!apiKey) {
    throw new Error('TTS_API_KEY or DASHSCOPE_API_KEY is not set in environment variables');
  }

  return new Promise((resolve, reject) => {
    const args = [
      pythonScript,
      '--text', text,
      '--voice', voice,
      '--api-key', apiKey,
      '--stdout'
    ];

    const proc = spawn('python3.11', args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Resolve immediately with the stdout stream
    // We'll also handle the error on the stream itself
    resolve(proc.stdout);

    proc.on('error', (err) => {
      console.error(`Failed to start Python bridge: ${err.message}`);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python bridge failed (code ${code}): ${stderr || 'Unknown error'}`);
      }
    });
  });
}

export const generateAudioStream = async function (text, voiceParams = {}, audioConfig = {}) {
  // Circuit breaker check
  if (Date.now() < circuitBreakerTrippedUntil) {
    throw new Error('TTS Service is currently unavailable (Circuit Breaker Tripped). Please try again later.');
  }

  if (voiceParams.speed !== undefined && (voiceParams.speed < 0.5 || voiceParams.speed > 2.0)) {
    throw new Error('Invalid speed');
  }
  if (voiceParams.pitch !== undefined && (voiceParams.pitch < -12 || voiceParams.pitch > 12)) {
    throw new Error('Invalid pitch');
  }

  // Map voice params to model voices
  let voice = 'Chelsie'; // default female voice (千雪)
  if (voiceParams.id) {
    voice = voiceParams.id;
  } else if (voiceParams.gender === 'male') {
    voice = 'Alloy'; // or other male voice
  }

  // Retry logic with exponential backoff
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      // The bridge returns a stream directly or we wrap the buffer in a stream
      const stream = await fetchAudioFromDashScope(text, voice);
      
      // Success, reset circuit breaker
      failureCount = 0;
      return stream;

    } catch (error) {
      attempt++;
      failureCount++;
      console.error(`[TTS Error] Attempt ${attempt} failed: ${error.message}`);

      if (failureCount >= 10) {
        console.error('[ALARM] TTS Circuit Breaker Tripped! Pausing for 60 seconds.');
        circuitBreakerTrippedUntil = Date.now() + 60 * 1000; // 60s
        failureCount = 0; // reset count after trip
        throw new Error('TTS Service is currently unavailable (Circuit Breaker Tripped).');
      }

      if (attempt >= maxAttempts) {
        throw error;
      }

      // Exponential backoff
      await delay(Math.pow(2, attempt) * 500); // 1s, 2s
    }
  }
};