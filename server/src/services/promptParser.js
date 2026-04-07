import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.DASHSCOPE_API_KEY || process.env.TTS_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const fastModelName = process.env.FAST_LLM_MODEL || 'qwen-turbo';

const openai = new OpenAI({ apiKey, baseURL });

let fastLlmUnavailableUntil = 0;
const FAST_LLM_CIRCUIT_BREAKER_MS = 5 * 60 * 1000;

const DEFAULT_VOICE_PARAMS = {
  gender: 'female',
  timbre: 'sweet',
  pitch: 0, // mapping low/medium/high to -6/0/6 or similar
  speed: 1.0,
  emotion: 'calm',
  character: 'storyteller',
  scene: 'fairy_tale' // default scene
};

const ENUMS = {
  gender: ['male', 'female'],
  emotion: ['happy', 'sad', 'angry', 'calm', 'excited', 'fearful', 'tender'],
  character: ['storyteller', 'broadcaster', 'customer_service', 'loli', 'uncle', 'youth'],
  scene: ['fairy_tale', 'suspense', 'cozy', 'nature', 'none']
};

export const EMOTIONS = {
  HAPPY: '愉悦',
  RELAXED: '放松',
  NEUTRAL: '一般',
  LOW: '低落',
  ANXIOUS: '焦虑',
  ANGRY: '愤怒',
  FEARFUL: '恐惧'
};

/**
 * Analyzes the user's emotion and returns a label with confidence score.
 * @param {string} prompt 
 * @returns {Promise<{label: string, confidence: number}>}
 */
export async function analyzeEmotion(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { label: EMOTIONS.NEUTRAL, confidence: 0.5 };
  }

  if (Date.now() < fastLlmUnavailableUntil) {
    return { label: EMOTIONS.NEUTRAL, confidence: 0.5 };
  }

  const systemPrompt = `
你是一个情绪解析引擎。请分析用户的输入，提取出情绪标签：[愉悦, 放松, 一般, 低落, 焦虑, 愤怒, 恐惧]。
返回 JSON 格式：{"label": "情绪标签", "confidence": 置信度(0-1)}。
  `;

  try {
    const response = await openai.chat.completions.create({
      model: fastModelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      label: Object.values(EMOTIONS).includes(parsed.label) ? parsed.label : EMOTIONS.NEUTRAL,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
    };

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
    if (isQuotaOrPermission) {
      fastLlmUnavailableUntil = Date.now() + FAST_LLM_CIRCUIT_BREAKER_MS;
    }
    console.error('[PromptParser] Emotion analysis failed:', error.message);
    return { label: EMOTIONS.NEUTRAL, confidence: 0.5 };
  }
}

/**
 * Maps natural language to enum values or boundaries
 */
export async function parseVoiceParamsFromPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    console.log('[PromptParser] No prompt provided, using default voice params.');
    return { ...DEFAULT_VOICE_PARAMS };
  }

  if (Date.now() < fastLlmUnavailableUntil) {
    return { ...DEFAULT_VOICE_PARAMS };
  }

  const systemPrompt = `
You are an intent recognition engine for a TTS system and ambient sound controller. 
Extract voice parameters and story scene from the user's natural language prompt.
Return ONLY a valid JSON object. Do not wrap in markdown blocks like \`\`\`json.
If a parameter is not mentioned, omit it from the JSON.

Available parameters:
- gender: "male" or "female"
- timbre: string (e.g., "sweet", "magnetic", "clear")
- pitch: integer between -12 and 12 (map "low" to -6, "high" to 6, "medium" to 0)
- speed: float between 0.5 and 2.0 (e.g., "fast" -> 1.5, "slow" -> 0.8)
- emotion: "happy", "sad", "angry", "calm", "excited", "fearful", "tender"
- character: "storyteller", "broadcaster", "customer_service", "loli", "uncle", "youth"
- scene: "fairy_tale" (for fairy tales, magic, fantasy), "suspense" (for suspense, horror, adventure), "cozy" (for cozy, daily life, healing), "nature" (for nature, outdoor), "none" (if no specific scene)

Example: "用清澈的男声，语速稍微快一点，讲一个森林里的奇幻故事"
Output: {"gender": "male", "timbre": "clear", "speed": 1.2, "scene": "fairy_tale"}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: fastModelName, // or standard model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const parsedStr = response.choices[0].message.content;
    const parsed = JSON.parse(parsedStr);

    const result = { ...DEFAULT_VOICE_PARAMS };

    // Map and validate
    if (parsed.gender && ENUMS.gender.includes(parsed.gender)) result.gender = parsed.gender;
    if (parsed.timbre) result.timbre = parsed.timbre;
    if (typeof parsed.pitch === 'number') {
      result.pitch = Math.max(-12, Math.min(12, parsed.pitch));
    }
    if (typeof parsed.speed === 'number') {
      result.speed = Math.max(0.5, Math.min(2.0, parsed.speed));
    }
    if (parsed.emotion && ENUMS.emotion.includes(parsed.emotion)) result.emotion = parsed.emotion;
    if (parsed.character && ENUMS.character.includes(parsed.character)) result.character = parsed.character;
    if (parsed.scene && ENUMS.scene.includes(parsed.scene)) result.scene = parsed.scene;

    console.log(`[PromptParser] Parsed params: ${JSON.stringify(result)}`);
    return result;

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
    if (isQuotaOrPermission) {
      fastLlmUnavailableUntil = Date.now() + FAST_LLM_CIRCUIT_BREAKER_MS;
    }
    console.error('[PromptParser] Failed to parse prompt:', error.message);
    console.log('[PromptParser] Using default voice params.');
    return { ...DEFAULT_VOICE_PARAMS };
  }
}
