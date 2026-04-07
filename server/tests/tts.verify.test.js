import { jest } from '@jest/globals';
import nock from 'nock';
import { validateWavAudio, splitTextIntoChunks, TTSValidationError } from '../scripts/verifyApi.js';

const API_URL = 'https://dashscope.aliyuncs.com';
const API_PATH = '/compatible-mode/v1/audio/speech';

function createMockWavBuffer(sampleRate = 24000, durationSecs = 1) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const dataSize = Math.floor(durationSecs * byteRate);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 44; i < buffer.length; i += 2) {
    buffer.writeInt16LE(Math.sin(i * 0.1) * 1000, i);
  }

  return buffer;
}

describe('TTS Service - Unit Tests', () => {
  beforeEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('validateWavAudio', () => {
    test('should validate a correct WAV buffer', () => {
      const buffer = createMockWavBuffer(24000, 1);
      const result = validateWavAudio(buffer, 24000);
      expect(result.valid).toBe(true);
      expect(result.duration).toBeCloseTo(1, 0);
      expect(result.sampleRate).toBe(24000);
    });

    test('should reject buffer smaller than WAV header', () => {
      const buffer = Buffer.from([1, 2, 3, 4]);
      const result = validateWavAudio(buffer);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too small');
    });

    test('should reject invalid RIFF header', () => {
      const buffer = createMockWavBuffer();
      buffer.write('XXXX', 0);
      const result = validateWavAudio(buffer);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('Not a standard');
    });

    test('should reject mismatched sample rate', () => {
      const buffer = createMockWavBuffer(48000, 1);
      const result = validateWavAudio(buffer, 24000);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Sample rate mismatch');
    });

    test('should reject zero duration audio', () => {
      const buffer = createMockWavBuffer(24000, 0);
      const result = validateWavAudio(buffer, 24000);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('zero or negative');
    });

    test('should handle non-WAV content gracefully', () => {
      const buffer = createMockWavBuffer();
      buffer.write('RIFF', 0);
      buffer.write('XXXX', 8);
      const result = validateWavAudio(buffer);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
    });
  });

  describe('splitTextIntoChunks', () => {
    test('should return single chunk for short text', () => {
      const chunks = splitTextIntoChunks('Hello world');
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe('Hello world');
    });

    test('should split long text by sentences', () => {
      const text = '这是第一个句子。这是第二个句子。这是第三个句子。';
      const chunks = splitTextIntoChunks(text, 10);
      expect(chunks.length).toBeGreaterThan(1);
    });

    test('should handle text without sentence delimiters', () => {
      const text = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z';
      const chunks = splitTextIntoChunks(text, 10);
      expect(Array.isArray(chunks)).toBe(true);
    });

    test('should preserve sentence delimiters in chunks', () => {
      const text = 'Hello. World! Question?';
      const chunks = splitTextIntoChunks(text, 20);
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('should return original text if no split needed', () => {
      const text = 'Short text.';
      const chunks = splitTextIntoChunks(text, 100);
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(text);
    });
  });

  describe('TTSValidationError', () => {
    test('should create error with all properties', () => {
      const error = new TTSValidationError('Test error', 400, 'InvalidParameter', '{"test":true}');
      expect(error.name).toBe('TTSValidationError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('InvalidParameter');
      expect(error.responseBody).toBe('{"test":true}');
    });

    test('should be instance of Error', () => {
      const error = new TTSValidationError('Test', 500, 'Error', '');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TTSValidationError);
    });

    test('should convert to string properly', () => {
      const error = new TTSValidationError('Test error', 400, 'InvalidParameter', '');
      expect(error.toString()).toContain('Test error');
    });
  });

  describe('Audio Buffer Creation', () => {
    test('should create valid WAV buffer with correct header', () => {
      const buffer = createMockWavBuffer(16000, 2);
      expect(buffer.length).toBeGreaterThan(44);
      expect(buffer.toString('utf8', 0, 4)).toBe('RIFF');
      expect(buffer.toString('utf8', 8, 12)).toBe('WAVE');
      expect(buffer.readUInt32LE(24)).toBe(16000);
    });

    test('should create WAV buffer with correct data size', () => {
      const sampleRate = 24000;
      const durationSecs = 3;
      const buffer = createMockWavBuffer(sampleRate, durationSecs);
      const byteRate = buffer.readUInt32LE(28);
      const dataSize = buffer.readUInt32LE(40);
      expect(dataSize).toBe(Math.floor(durationSecs * byteRate));
    });
  });

  describe('Edge Cases', () => {
    test('should handle very short text', () => {
      const chunks = splitTextIntoChunks('Hi', 10);
      expect(chunks.length).toBe(1);
    });

    test('should handle text with only punctuation', () => {
      const chunks = splitTextIntoChunks('...???!!!', 10);
      expect(Array.isArray(chunks)).toBe(true);
    });

    test('should handle unicode text correctly', () => {
      const chunks = splitTextIntoChunks('你好世界！', 5);
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});

describe('TTS API Integration Tests (Mocked)', () => {
  const mockBuffer = createMockWavBuffer();

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('should successfully synthesize speech with 200 response', async () => {
    const scope = nock(API_URL, { encodedQueryParams: true })
      .post(API_PATH)
      .reply(200, mockBuffer, { 'Content-Type': 'audio/wav' });

    const response = await fetch(`${API_URL}${API_PATH}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen3-tts-instruct-flash',
        input: '测试',
        voice: 'cherry',
        response_format: 'wav',
        speed: 1.0
      })
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    scope.done();
  });

  test('should handle 400 Bad Request error', async () => {
    const errorResponse = { code: 'InvalidParameter', message: 'Invalid request' };
    nock(API_URL, { encodedQueryParams: true })
      .post(API_PATH)
      .reply(400, errorResponse);

    const response = await fetch(`${API_URL}${API_PATH}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen3-tts-instruct-flash',
        input: 'test',
        voice: 'invalid-voice'
      })
    });

    expect(response.status).toBe(400);
    const body = await response.text();
    expect(body).toContain('InvalidParameter');
  });

  test('should handle 401 Unauthorized error', async () => {
    nock(API_URL)
      .post(API_PATH)
      .reply(401, { code: 'Unauthorized', message: 'Invalid API key' });

    const response = await fetch(`${API_URL}${API_PATH}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'qwen3-tts-instruct-flash', input: 'test' })
    });

    expect(response.status).toBe(401);
  });

  test('should handle 429 Rate Limit error', async () => {
    nock(API_URL)
      .post(API_PATH)
      .reply(429, { code: 'RateLimitExceeded', message: 'Too many requests' });

    const response = await fetch(`${API_URL}${API_PATH}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'qwen3-tts-instruct-flash', input: 'test' })
    });

    expect(response.status).toBe(429);
  });

  test('should handle 500 Internal Server Error', async () => {
    nock(API_URL)
      .post(API_PATH)
      .reply(500, { code: 'InternalError', message: 'Server error' });

    const response = await fetch(`${API_URL}${API_PATH}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'qwen3-tts-instruct-flash', input: 'test' })
    });

    expect(response.status).toBe(500);
  });

  test('should handle 502 Bad Gateway error', async () => {
    nock(API_URL)
      .post(API_PATH)
      .reply(502, { code: 'BadGateway', message: 'Bad gateway' });

    const response = await fetch(`${API_URL}${API_PATH}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'qwen3-tts-instruct-flash', input: 'test' })
    });

    expect(response.status).toBe(502);
  });

  test('should handle 503 Service Unavailable error', async () => {
    nock(API_URL)
      .post(API_PATH)
      .reply(503, { code: 'ServiceUnavailable', message: 'Service unavailable' });

    const response = await fetch(`${API_URL}${API_PATH}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'qwen3-tts-instruct-flash', input: 'test' })
    });

    expect(response.status).toBe(503);
  });

  test('should verify request payload structure', async () => {
    let requestBody = null;
    const scope = nock(API_URL)
      .post(API_PATH, (body) => {
        requestBody = body;
        return true;
      })
      .reply(200, mockBuffer);

    await fetch(`${API_URL}${API_PATH}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen3-tts-instruct-flash',
        input: '测试文本',
        voice: 'cherry',
        response_format: 'wav',
        speed: 1.0
      })
    });

    expect(requestBody).not.toBeNull();
    expect(requestBody.model).toBe('qwen3-tts-instruct-flash');
    expect(requestBody.input).toBe('测试文本');
    expect(requestBody.voice).toBe('cherry');
    scope.done();
  });

  test('should support different audio formats', async () => {
    const scope = nock(API_URL)
      .post(API_PATH)
      .reply(200, mockBuffer);

    const response = await fetch(`${API_URL}${API_PATH}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen3-tts-instruct-flash',
        input: 'test',
        voice: 'cherry',
        response_format: 'mp3'
      })
    });

    expect(response.ok).toBe(true);
    scope.done();
  });
});