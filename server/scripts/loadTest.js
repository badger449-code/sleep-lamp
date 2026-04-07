import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.TTS_API_KEY || 'sk-7e32b11d13d04652bb234d90976b5521';
const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/text-to-audio';
const MODEL = 'qwen3-tts-vd-2026-01-26';

const TOTAL_REQUESTS = 100;
const CONCURRENCY = 20; // sending 20 per batch to simulate high QPS locally

async function runLoadTest() {
  console.log(`[Load Test] 开始执行高并发测试 (目标：100次请求)...`);
  
  let successCount = 0;
  let errorCount = 0;
  const latencies = [];

  const payload = {
    model: MODEL,
    input: { text: "你好，欢迎使用睡眠故事系统" },
    voice: { speed: 1.0 },
    audio_config: { format: "wav", sample_rate: 24000 }
  };

  const makeRequest = async () => {
    const start = Date.now();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error(response.status);
      
      // Read buffer to finish request
      await response.arrayBuffer();
      
      latencies.push(Date.now() - start);
      successCount++;
    } catch (e) {
      errorCount++;
    }
  };

  // Run in batches
  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY && (i + j) < TOTAL_REQUESTS; j++) {
      batch.push(makeRequest());
    }
    await Promise.all(batch);
  }

  // Calculate stats
  latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95) - 1;
  const p95 = latencies.length > 0 ? latencies[Math.max(0, p95Index)] : 0;
  const errorRate = (errorCount / TOTAL_REQUESTS) * 100;

  console.log(`\n=== 负载测试结果 ===`);
  console.log(`总请求数: ${TOTAL_REQUESTS}`);
  console.log(`成功: ${successCount}, 失败: ${errorCount}`);
  console.log(`错误率: ${errorRate.toFixed(2)}% (目标 < 1%)`);
  console.log(`95th 延迟: ${p95} ms (目标 < 800ms)`);

  if (errorRate > 1 || p95 > 800) {
    console.warn(`[⚠️] 注意：未达到设定的性能或稳定性指标。由于是调用远端真实 API，受网络环境和账户并发限制影响。`);
  } else {
    console.log(`[✅] 测试通过！`);
  }
}

runLoadTest();