import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Prioritize DashScope if API key is available, fallback to DeepSeek/OpenAI
const apiKey = process.env.DASHSCOPE_API_KEY || process.env.TTS_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const modelName = process.env.LLM_MODEL || 'qwen-plus';

console.log(`Initializing LLM Service with Base URL: ${baseURL}, Model: ${modelName}`);

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: baseURL,
});

const defaultSystemPrompt = "You are a gentle bedtime storyteller. Your goal is to lull the listener to sleep. \n\nGuidelines:\n1. Tone: Soothing, calm, slow-paced, and whispering.\n2. Content: Focus on sensory details (soft textures, gentle sounds, pleasant scents). Avoid ANY conflict, tension, loud noises, or fast action.\n3. Structure: Use short, simple sentences that are easy to read aloud. Add natural pauses.\n4. Length: Keep the story flowing gently like a slow river.\n\nStart the story immediately based on the user's prompt.";

let llmUnavailableUntil = 0;
const LLM_CIRCUIT_BREAKER_MS = 5 * 60 * 1000;
const FALLBACK_TEXT = 'LLM 当前不可用（可能是配额已用尽或权限不足）。请检查控制台额度/开关，或更换可用的 Key 后重试。';

export const streamStory = async function* (historyOrPrompt, systemPrompt = defaultSystemPrompt) {
  if (Date.now() < llmUnavailableUntil) {
    yield FALLBACK_TEXT;
    return;
  }

  try {
    let messages = [
      { 
        role: "system", 
        content: systemPrompt || defaultSystemPrompt
      }
    ];

    if (Array.isArray(historyOrPrompt)) {
      messages = messages.concat(historyOrPrompt);
    } else {
      messages.push({ role: "user", content: historyOrPrompt });
    }

    const stream = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1500,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    const status = error?.status;
    const code = error?.code;
    const type = error?.type;
    const providerCode = error?.error?.code;
    const isQuotaOrPermission =
      status === 401 ||
      status === 403 ||
      code === 'AllocationQuota.FreeTierOnly' ||
      type === 'AllocationQuota.FreeTierOnly' ||
      providerCode === 'AllocationQuota.FreeTierOnly';

    console.error('LLM Error:', { status, code, type, providerCode, message: error?.message });

    if (isQuotaOrPermission) {
      llmUnavailableUntil = Date.now() + LLM_CIRCUIT_BREAKER_MS;
      yield FALLBACK_TEXT;
      return;
    }

    yield 'LLM 暂时不可用，请稍后重试。';
  }
};
