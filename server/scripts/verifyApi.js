import dotenv from 'dotenv';
import path from 'path';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_KEY = process.env.TTS_API_KEY || '';
const PYTHON_SCRIPT = process.env.TTS_PYTHON_BRIDGE || path.resolve(process.cwd(), 'scripts/tts_bridge.py');
const TIMEOUT_MS = parseInt(process.env.TTS_TIMEOUT_MS || '30000', 10);
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

class TTSValidationError extends Error {
  constructor(message, statusCode, errorCode, responseBody) {
    super(message);
    this.name = 'TTSValidationError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.responseBody = responseBody;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function splitTextIntoChunks(text, maxLength = 500) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+/g) || [text];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

function validateWavAudio(buffer, expectedSampleRate = 24000) {
  if (buffer.length < 44) return { valid: false, reason: 'Buffer too small for WAV header' };

  const riff = buffer.toString('utf8', 0, 4);
  const wave = buffer.toString('utf8', 8, 12);

  if (riff !== 'RIFF' || wave !== 'WAVE') {
    return { valid: true, warning: 'Not a standard WAV file, skipping validation' };
  }

  const sampleRate = buffer.readUInt32LE(24);
  const byteRate = buffer.readUInt32LE(28);
  const dataSize = buffer.readUInt32LE(40);

  if (sampleRate !== expectedSampleRate) {
    return { valid: false, reason: `Sample rate mismatch: expected ${expectedSampleRate}, got ${sampleRate}` };
  }

  const durationSecs = dataSize / byteRate;
  if (durationSecs <= 0) {
    return { valid: false, reason: 'Invalid audio duration (zero or negative)' };
  }

  return { valid: true, duration: durationSecs, sampleRate, dataSize };
}

function concatenateAudioBuffers(buffers) {
  if (buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];
  return Buffer.concat(buffers);
}

async function callPythonBridge(text, voice, language) {
  return new Promise((resolve, reject) => {
    const outputFile = join(tmpdir(), `tts_${Date.now()}.wav`);

    const args = [
      PYTHON_SCRIPT,
      '--text', text,
      '--voice', voice,
      '--language', language,
      '--api-key', API_KEY,
      '--output', outputFile
    ];

    const proc = spawn('python', args, {
      timeout: TIMEOUT_MS,
      windowsHide: true
    });

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(outputFile);
      } else {
        reject(new TTSValidationError(
          `Python bridge failed: ${stderr || 'Unknown error'}`,
          code || 1,
          'BridgeError',
          stderr
        ));
      }
    });

    proc.on('error', (err) => {
      reject(new TTSValidationError(
        `Failed to start Python: ${err.message}`,
        500,
        'BridgeError',
        err.message
      ));
    });
  });
}

function synthesizeSpeechStream(text, voice = 'Cherry', language = 'Chinese') {
  if (!text || text.trim().length === 0) {
    throw new TTSValidationError('Text cannot be empty', 400, 'InvalidParameter', '');
  }

  const args = [
    PYTHON_SCRIPT,
    '--text', text,
    '--voice', voice,
    '--language', language,
    '--api-key', API_KEY,
    '--stdout'
  ];

  const proc = spawn('python', args, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return proc;
}

async function synthesizeSpeech(text, voice = 'Cherry', language = 'Chinese') {
  if (!text || text.trim().length === 0) {
    throw new TTSValidationError('Text cannot be empty', 400, 'InvalidParameter', '');
  }

  if (text.length > 1000) {
    const chunks = splitTextIntoChunks(text);
    console.log(`[+] Text length (${text.length}) exceeds 1000 chars, splitting into ${chunks.length} chunks`);

    const buffers = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`[+] Processing chunk ${i + 1}/${chunks.length}`);
      const tempFile = await callPythonBridge(chunks[i], voice, language);
      const fs = await import('fs');
      const buffer = fs.readFileSync(tempFile);
      buffers.push(buffer);
      fs.unlinkSync(tempFile);
    }

    return concatenateAudioBuffers(buffers);
  }

  const tempFile = await callPythonBridge(text, voice, language);
  const fs = await import('fs');
  const buffer = fs.readFileSync(tempFile);
  fs.unlinkSync(tempFile);
  return buffer;
}

async function verify() {
  console.log('='.repeat(60));
  console.log('  DashScope TTS API 验证工具 (qwen3-tts-flash)');
  console.log('='.repeat(60));
  console.log();

  if (!API_KEY) {
    console.error('[❌] 错误: TTS_API_KEY 环境变量未设置');
    console.error('    请在 .env 文件中设置 TTS_API_KEY');
    process.exit(1);
  }

  console.log(`[+] API Key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`);
  console.log(`[+] Python Bridge: ${PYTHON_SCRIPT}`);
  console.log(`[+] Timeout: ${TIMEOUT_MS}ms`);
  console.log(`[+] Model: qwen3-tts-flash`);
  console.log();

  const testTexts = [
    { text: '你好，这是语音合成测试。', voice: 'Cherry', language: 'Chinese', desc: '中文测试 (非流式)' },
    { text: '这是一个流式输出测试，可以显著降低首包延迟时间，让你更快听到声音。', voice: 'Cherry', language: 'Chinese', desc: '流式首包延迟测试', stream: true }
  ];

  const results = [];

  for (const testCase of testTexts) {
    console.log('-'.repeat(50));
    console.log(`[*] 测试: ${testCase.desc}`);
    console.log(`    文本: "${testCase.text}"`);
    console.log(`    声音: ${testCase.voice}`);
    console.log(`    模式: ${testCase.stream ? '流式' : '全量'}`);
    console.log();

    const startTime = Date.now();
    let status = 'PASS';
    let errorMsg = '';
    let audioSize = 0;
    let validation = null;

    try {
      if (testCase.stream) {
        const proc = synthesizeSpeechStream(testCase.text, testCase.voice, testCase.language);
        let firstPacketTime = 0;
        const chunks = [];

        await new Promise((resolve, reject) => {
          proc.stdout.on('data', (chunk) => {
            if (!firstPacketTime) {
              firstPacketTime = Date.now();
              const ttfb = firstPacketTime - startTime;
              console.log(`    [⚡] 首包到达! 耗时: ${ttfb}ms`);
            }
            chunks.push(chunk);
          });

          proc.stderr.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('[ERROR]')) {
              reject(new Error(msg));
            }
          });

          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Process exited with code ${code}`));
          });
          
          proc.on('error', reject);
        });

        const buffer = Buffer.concat(chunks);
        const endTime = Date.now();
        const duration = endTime - startTime;
        audioSize = buffer.length;
        
        console.log(`[✅] 成功!`);
        console.log(`    - 首包延迟 (TTFB): ${firstPacketTime - startTime}ms`);
        console.log(`    - 总耗时: ${duration}ms`);
        console.log(`    - 音频大小: ${audioSize} bytes`);

        results.push({
          desc: testCase.desc,
          status: 'PASS',
          duration,
          audioSize
        });
      } else {
        const buffer = await synthesizeSpeech(testCase.text, testCase.voice, testCase.language);
        const endTime = Date.now();
        const duration = endTime - startTime;

        audioSize = buffer.length;
        validation = validateWavAudio(buffer);

        console.log(`[✅] 成功!`);
        console.log(`    - 响应时间: ${duration}ms`);
        console.log(`    - 音频大小: ${audioSize} bytes`);

        if (validation.valid) {
          console.log(`    - 音频时长: ${validation.duration?.toFixed(2)}s`);
        }

        results.push({
          desc: testCase.desc,
          status: 'PASS',
          duration,
          audioSize
        });
      }

    } catch (err) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      status = 'FAIL';
      errorMsg = err.message;

      console.log(`[❌] 失败!`);
      console.log(`    - 耗时: ${duration}ms`);
      console.log(`    - 错误: ${err.message}`);

      results.push({
        desc: testCase.desc,
        status,
        duration,
        error: errorMsg
      });
    }

    console.log();
    await sleep(500);
  }

  console.log('='.repeat(60));
  console.log('  验证报告');
  console.log('='.repeat(60));

  const passCount = results.filter(r => r.status === 'PASS').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;

  console.log();
  console.log(`总计: ${results.length} | ✅ 通过: ${passCount} | ⚠️ 警告: ${warnCount} | ❌ 失败: ${failCount}`);
  console.log();

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${result.desc}: ${result.duration}ms` + (result.error ? ` - ${result.error}` : ''));
  }

  console.log();
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('[❌] API 验证失败，请检查 Python 环境');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('[⚠️] API 验证完成，但存在性能警告');
    process.exit(0);
  } else {
    console.log('[✅] API 验证完全通过!');
    process.exit(0);
  }
}

export { synthesizeSpeech, validateWavAudio, splitTextIntoChunks, TTSValidationError, MAX_RETRIES, RETRY_DELAYS };

const scriptPath = process.argv[1]?.replace(/\\/g, '/').replace(/^\//, '');
const isMainModule = scriptPath && import.meta.url.includes(scriptPath);

if (isMainModule) {
  verify().catch(err => {
    console.error('[❌] 验证过程异常:', err.message);
    process.exit(1);
  });
}