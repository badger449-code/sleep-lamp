import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { streamStory } from './services/llmService.js';
import { generateAudioStream } from './services/ttsService.js';
import { parseVoiceParamsFromPrompt } from './services/promptParser.js';
import { transcribeAudio } from './services/asrService.js';

import { InteractionManager } from './services/enhancedInteractionService.js';
import { filterSensitiveWords } from './services/safetyService.js';
import { processUserInput } from './services/emotionService.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { executeEmotionSkill } from './skills/emotion_skills.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/api/tts/preview', async (req, res) => {
  try {
    const { text, voice } = req.body || {};
    if (typeof voice !== 'string' || !voice.trim()) {
      res.status(400).json({ error: 'voice is required' });
      return;
    }

    const normalizedText = typeof text === 'string' && text.trim() ? text.trim() : '你好，我是语音试听';
    const safeText = normalizedText.slice(0, 500);

    const voiceParams = { id: voice.trim() };
    const audioStream = await generateAudioStream(safeText, voiceParams, { format: 'wav', sample_rate: 24000 });

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');

    audioStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });

    audioStream.pipe(res);
  } catch {
    res.status(500).json({ error: 'preview_failed' });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

async function handleStoryGeneration(ws, prompt, systemPrompt, voiceId, requestId) {
  console.log(`Starting story with prompt: ${prompt}, voice: ${voiceId}`);
  
  if (voiceId) {
    ws.lastVoiceId = voiceId;
  }
  
  const rid = typeof requestId === 'string' && requestId.trim() ? requestId.trim() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const isCancelled = () => {
    if (ws.readyState !== 1) return true;
    if (ws.activeRequestId && ws.activeRequestId !== rid) return true;
    if (ws.cancelledRequestIds && ws.cancelledRequestIds.has(rid)) return true;
    return false;
  };
  const safeSend = (payload) => {
    if (isCancelled()) return;
    try {
      ws.send(JSON.stringify({ ...payload, requestId: rid }));
    } catch {
      return;
    }
  };

  // Interaction Flow Step 1-5
  if (!ws.interactionManager) {
    ws.interactionManager = new InteractionManager();
  }

  // 首先使用心理学情绪识别服务
  const emotionResult = processUserInput(prompt);
  
  let enhancedSystemPrompt = systemPrompt || '';
  
  // 检查是否是阶段2（情绪共情与深度放松）的典型输入
  // 根据prompts.js，阶段2处理负面情绪，需要心理学知识进行深度放松引导
  const isStage2Input = prompt.includes('今天') || prompt.includes('心情') || 
                       prompt.includes('感觉') || prompt.includes('难过') || 
                       prompt.includes('伤心') || prompt.includes('焦虑') ||
                       prompt.includes('失恋') || prompt.includes('沮丧') ||
                       prompt.includes('委屈') || prompt.includes('后悔') ||
                       prompt.includes('压力') || prompt.includes('烦恼') ||
                       prompt.includes('不开心') || prompt.includes('痛苦') ||
                       prompt.includes('生气') || prompt.includes('愤怒') ||
                       prompt.includes('恐惧') || prompt.includes('害怕') ||
                       prompt.includes('孤独') || prompt.includes('无助');
  
  let psychologyHandled = false; // 标记心理学技能是否已处理
  
  if (emotionResult.shouldUsePsychologyApproach || isStage2Input) {
    // 如果检测到特定情绪或类似阶段2的输入，使用心理学专业话术
    enhancedSystemPrompt += `\n[情绪分析：检测到用户当前处于${emotionResult.emotionAnalysis.emotion}状态，匹配关键词：${emotionResult.emotionAnalysis.matchedKeywords.join(', ')}]`;
    enhancedSystemPrompt += `\n[心理学干预：根据人本主义流派原则，采用无条件积极关注，慢语速、低音调，允许不完美，优先处理情绪而非解决问题]`;
    enhancedSystemPrompt += `\n[阶段2扩展：当前处于情绪共情与深度放松阶段，可突破6轮限制，运用心理学专业知识进行深度疏导]`;
    
    // 使用技能系统处理情绪（仅在明确检测到情绪时）
    if (emotionResult.shouldUsePsychologyApproach) {
      const skillResult = executeEmotionSkill(prompt, { 
        userInput: prompt,
        emotionAnalysis: emotionResult.emotionAnalysis 
      });
      
      // 直接发送心理学专业响应
      const psychologyResponse = skillResult.response;
      safeSend({ type: 'text_chunk', content: psychologyResponse });
      
      // 使用用户选定的音色，而不是重新解析，避免音色切换
      const voiceParams = { id: voiceId || ws.lastVoiceId || 'Kai' }; // 使用用户选定的音色
      const audioStream = await generateAudioStream(psychologyResponse, voiceParams);
      audioStream.on('data', (c) => {
        if (c && c.length > 0) { // 确保音频数据有效
          safeSend({ type: 'audio_chunk', content: c.toString('base64') });
        }
      });
      audioStream.on('error', (err) => {
        console.error('Audio stream error:', err);
      });
      
      psychologyHandled = true; // 标记心理学技能已处理
      
      // 不立即结束，而是继续正常流程以维持对话连贯性
    }
  }
  
  // 继续原有的交互管理器流程，让prompts.js的阶段逻辑正常运行
  // 但如果心理学技能已经处理了，则跳过原有流程以避免重复
  let flowResult;
  try {
    if (!psychologyHandled) {
      flowResult = await ws.interactionManager.processInput(prompt);
    } else {
      // 如果心理学技能已处理，则使用默认结果继续流程
      flowResult = {
        stage: 'stage2',  // 心理学处理属于阶段2
        rounds: 0,
        storyRounds: 0,
        text: '',
        shouldContinue: true
      };
    }
  } catch (e) {
    console.error('InteractionManager error:', e);
    // 如果增强版管理器出错，使用默认结果
    flowResult = {
      stage: 'stage1',
      rounds: 0,
      storyRounds: 0,
      text: '',
      shouldContinue: true
    };
  }
  
  // If safety intervention is needed
  if (flowResult.stage === 'SAFETY_INTERVENTION') {
    safeSend({ type: 'text_chunk', content: flowResult.text });
    const voiceParams = await parseVoiceParamsFromPrompt("");
    const audioStream = await generateAudioStream(flowResult.text, voiceParams);
    audioStream.on('data', (c) => safeSend({ type: 'audio_chunk', content: c.toString('base64') }));
    audioStream.on('end', () => safeSend({ type: 'story_end' }));
    return;
  }

  // Enhanced system prompt with flow context
  enhancedSystemPrompt += `\n[系统状态：当前处于${flowResult.stage}阶段，情绪追问：${flowResult.rounds}/6，故事对话：${flowResult.storyRounds}/5。请严格按 prompts.js 流程回复]`;

  // Add user prompt to history
  ws.history.push({ role: 'user', content: prompt });
  
  // Parse voice params from systemPrompt (or user prompt) asynchronously
  // But only when we're not handling psychology skill responses to prevent voice switching
  let voiceParamsPromise;
  if (emotionResult.shouldUsePsychologyApproach) {
    // For psychology skill responses, use the user-selected voice to maintain consistency
    voiceParamsPromise = Promise.resolve({ id: voiceId || ws.lastVoiceId || 'Kai' });
  } else {
    const textToParse = enhancedSystemPrompt + " " + prompt;
    voiceParamsPromise = parseVoiceParamsFromPrompt(textToParse).then(params => {
      if (ws.lastVoiceId) {
        params.id = ws.lastVoiceId;
      }
      return params;
    });
  }

  // Use an async generator to stream text from LLM
  let buffer = '';
  let fullResponse = '';
  let isLogStarted = false;
  let isSceneFound = false;
  let isNoiseDecayRequested = false;
  let streamBuffer = '';
  const LOG_MARKER = '---INTERNAL_LOG---';
  const SCENE_MARKER = /\[SCENE:\s*(\w+)\]/;
  const NOISE_DECAY_MARKER = '[NOISE_DECAY]';
  
  // Create a queue for TTS generation to not block the LLM stream
  let audioTaskChain = Promise.resolve();
  let ttsSentenceBuffer = [];
  let ttsSentenceChars = 0;
  let ttsChunkIndex = 0;
  // 优化：降低延迟，1 个句子就发送 TTS
  const TTS_MIN_SENTENCES = 1;  // 从 2 改成 1，立即发送
  const TTS_MAX_SENTENCES = 2;  // 从 4 改成 2，减少等待
  const TTS_SOFT_MAX_CHARS = 80;  // 从 140 改成 80，更早触发
  const TTS_HARD_MAX_CHARS = 150; // 从 260 改成 150，防止太长

  const getPauseMs = (rawText) => {
    const text = (rawText || '').trim();
    if (!text) return 220;
    if (/[。！？.!?]$/.test(text)) return 520;
    if (/[，,；;：:]$/.test(text)) return 280;
    return 220;
  };

  const queueTts = (text, pauseMs) => {
    audioTaskChain = audioTaskChain.then(async () => {
      if (isCancelled()) return;
      console.log(`Generating audio for: "${text}"`);
      try {
        const voiceParams = await voiceParamsPromise;
        const audioStream = await generateAudioStream(text, voiceParams, { format: 'wav', sample_rate: 24000 });

        const chunks = [];
        audioStream.on('data', (audioChunk) => {
          chunks.push(audioChunk);
        });

        await new Promise((resolve) => {
          audioStream.on('end', () => {
            const completeBuffer = Buffer.concat(chunks);
            if (completeBuffer.length > 0) {
              safeSend({ 
                type: 'audio_chunk', 
                content: completeBuffer.toString('base64'),
                pause_ms: pauseMs
              });
            }
            resolve();
          });
          audioStream.on('error', (err) => {
            console.error('Audio stream error:', err);
            resolve();
          });
        });
      } catch (e) {
        console.error('TTS Generation error:', e.message);
      }
    });
  };

  const flushTts = () => {
    const text = ttsSentenceBuffer.join('');
    ttsSentenceBuffer = [];
    ttsSentenceChars = 0;
    if (text.trim().length > 0) {
      const textToSpeak = ttsChunkIndex > 0 ? `……，${text}` : text;
      const pauseMs = getPauseMs(text);
      ttsChunkIndex += 1;
      queueTts(textToSpeak, pauseMs);
    }
  };

  const addSentenceToTts = (sentence) => {
    if (sentence.trim().length === 0) return;
    ttsSentenceBuffer.push(sentence);
    ttsSentenceChars += sentence.length;

    if (ttsSentenceBuffer.length >= TTS_MAX_SENTENCES || ttsSentenceChars >= TTS_HARD_MAX_CHARS) {
      flushTts();
      return;
    }

    if (ttsSentenceBuffer.length >= TTS_MIN_SENTENCES && ttsSentenceChars >= TTS_SOFT_MAX_CHARS) {
      flushTts();
    }
  };
  
  for await (const chunk of streamStory(ws.history, enhancedSystemPrompt)) {
    if (isCancelled()) return;
    // Sensitive word filtering on output
    const filteredChunk = filterSensitiveWords(chunk);
    fullResponse += filteredChunk;

    if (!isNoiseDecayRequested && fullResponse.includes(NOISE_DECAY_MARKER)) {
      isNoiseDecayRequested = true;
      console.log('[NOISE_DECAY] requested by LLM');
      safeSend({ type: 'noise_decay', content: { duration_ms: 60000 } });
    }
    
    if (isLogStarted) continue;

    streamBuffer += filteredChunk;

    // Detect [SCENE: id]
    if (!isSceneFound) {
      const sceneMatch = streamBuffer.match(SCENE_MARKER);
      if (sceneMatch) {
        isSceneFound = true;
        const sceneId = sceneMatch[1];
        console.log(`[SCENE DETERMINED] ${sceneId}`);
        safeSend({ type: 'scene_determined', content: sceneId });
        
        // Remove the scene tag from streamBuffer and continue
        streamBuffer = streamBuffer.replace(SCENE_MARKER, '');
      }
    }

    if (!isNoiseDecayRequested && streamBuffer.includes(NOISE_DECAY_MARKER)) {
      isNoiseDecayRequested = true;
      safeSend({ type: 'noise_decay', content: { duration_ms: 60000 } });
      streamBuffer = streamBuffer.replace(NOISE_DECAY_MARKER, '');
    }

    if (streamBuffer.includes(LOG_MARKER)) {
      isLogStarted = true;
      const parts = streamBuffer.split(LOG_MARKER);
      const storyPart = parts[0];
      if (storyPart) {
        safeSend({ type: 'text_chunk', content: storyPart });
        buffer += storyPart;
      }
      streamBuffer = ''; 
    } else {
      // Check if streamBuffer ends with a partial marker
      let potentialMatchLength = 0;
      
      // Check for LOG_MARKER partial
      for (let i = LOG_MARKER.length - 1; i > 0; i--) {
        if (streamBuffer.endsWith(LOG_MARKER.substring(0, i))) {
          potentialMatchLength = Math.max(potentialMatchLength, i);
          break;
        }
      }

      for (let i = NOISE_DECAY_MARKER.length - 1; i > 0; i--) {
        if (streamBuffer.endsWith(NOISE_DECAY_MARKER.substring(0, i))) {
          potentialMatchLength = Math.max(potentialMatchLength, i);
          break;
        }
      }

      // Check for SCENE_MARKER partial '['
      if (!isSceneFound) {
        // Find the LAST '[' in streamBuffer
        const lastBracket = streamBuffer.lastIndexOf('[');
        if (lastBracket !== -1) {
          // Check if everything from lastBracket to the end could be a partial [SCENE: id]
          const partial = streamBuffer.substring(lastBracket);
          // Simple regex to see if it looks like a partial [SCENE:
          if (/^\[(S(C(E(N(E(:(\s*(\w+)?)?)?)?)?)?)?)?$/.test(partial)) {
            potentialMatchLength = Math.max(potentialMatchLength, streamBuffer.length - lastBracket);
          }
        }
      }

      if (potentialMatchLength > 0) {
        // Send everything EXCEPT the potential match
        const toSend = streamBuffer.substring(0, streamBuffer.length - potentialMatchLength);
        if (toSend) {
          safeSend({ type: 'text_chunk', content: toSend });
          buffer += toSend;
          streamBuffer = streamBuffer.substring(streamBuffer.length - potentialMatchLength);
        }
        // Keep the potential match in streamBuffer for next iteration
      } else {
        // No potential match, send everything
        safeSend({ type: 'text_chunk', content: streamBuffer });
        buffer += streamBuffer;
        streamBuffer = '';
      }
    }
    
    if (isLogStarted) continue;

    const sentenceEndRegex = /([.!?。！？\n]+)/;
    let parts = buffer.split(sentenceEndRegex);
    while (parts.length > 2) {
      const sentence = parts[0] + parts[1];
      buffer = parts.slice(2).join('');
      addSentenceToTts(sentence);
      parts = buffer.split(sentenceEndRegex);
    }
  }
  
  // Final flush of streamBuffer if it wasn't a log
  if (!isLogStarted && streamBuffer) {
    safeSend({ type: 'text_chunk', content: streamBuffer });
    buffer += streamBuffer;
  }
  
  // Process remaining buffer
  if (buffer.trim().length > 0) {
    ttsSentenceBuffer.push(buffer);
    ttsSentenceChars += buffer.length;
    buffer = '';
  }
  
  if (ttsSentenceBuffer.length > 0) {
    flushTts();
  }
  
  // Wait for all TTS tasks to finish before sending story_end
  if (isCancelled()) return;
  await audioTaskChain;

  let parsedLogData = null;
  // Extract log data from fullResponse
  const dataMatch = fullResponse.match(/---INTERNAL_LOG---: ({.*?})/);
  if (dataMatch) {
    try {
      parsedLogData = JSON.parse(dataMatch[1]);
      console.log('[LOG RECORD]', parsedLogData);
      // Here you could write to a database or log file
    } catch (e) {
      console.warn('Failed to parse log data from LLM response');
    }
  }
  
  // Add assistant response to history
  ws.history.push({ role: 'assistant', content: fullResponse });
  
  // 如果故事结束（不论是 LLM 主动判定还是其他方式），进行归档
  if (parsedLogData && parsedLogData.listened_complete) {
    saveConversationToMarkdown(ws.history, parsedLogData);
  }

  safeSend({ type: 'story_end' });
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Store conversation history for this client
  ws.history = [];

  const safeJsonSend = (payload) => {
    try {
      if (ws.readyState !== 1) return;
      ws.send(JSON.stringify(payload));
    } catch {
      return;
    }
  };

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (!ws.cancelledRequestIds) ws.cancelledRequestIds = new Set();
      const normalizeRequestId = (value) => {
        if (typeof value === 'string' && value.trim()) return value.trim();
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      };
      
      // Handle audio input from client
      if (data.type === 'start_story_audio') {
        const audioBase64 = data.audio;
        const systemPrompt = data.systemPrompt;
        const voiceId = data.voice;
        const requestId = normalizeRequestId(data.requestId);

        if (ws.activeRequestId && typeof ws.activeRequestId === 'string') {
          ws.cancelledRequestIds.add(ws.activeRequestId);
        }
        ws.activeRequestId = requestId;
        
        console.log('Received audio from client, starting transcription...');
        
        try {
          // Transcribe the audio
          const prompt = await transcribeAudio(audioBase64);
          console.log(`Transcription result: "${prompt}"`);
          
          if (!prompt || prompt.trim() === '') {
            safeJsonSend({ type: 'error', content: '未能识别出语音，请再说一次。', requestId });
            safeJsonSend({ type: 'story_end', requestId });
            return;
          }
          
          // Send the transcribed text back to the client so the user can see it
          safeJsonSend({ type: 'transcription_result', content: prompt, requestId });
          
          // Proceed with the story generation using the transcribed prompt
          await handleStoryGeneration(ws, prompt, systemPrompt, voiceId, requestId).catch((err) => {
            console.error('handleStoryGeneration failed:', err?.message || err);
            safeJsonSend({ type: 'error', content: '故事生成失败，请稍后重试。', requestId });
            safeJsonSend({ type: 'story_end', requestId });
          });
        } catch (asrError) {
          console.error('ASR Error:', asrError);
          safeJsonSend({ type: 'error', content: '语音识别失败，请检查网络或稍后再试。', requestId });
          safeJsonSend({ type: 'story_end', requestId });
        }
      } else if (data.type === 'start_story') {
        const prompt = data.content;
        const systemPrompt = data.systemPrompt;
        const voiceId = data.voice;
        const requestId = normalizeRequestId(data.requestId);

        if (ws.activeRequestId && typeof ws.activeRequestId === 'string') {
          ws.cancelledRequestIds.add(ws.activeRequestId);
        }
        ws.activeRequestId = requestId;
        
        await handleStoryGeneration(ws, prompt, systemPrompt, voiceId, requestId).catch((err) => {
          console.error('handleStoryGeneration failed:', err?.message || err);
          safeJsonSend({ type: 'error', content: '故事生成失败，请稍后重试。', requestId });
          safeJsonSend({ type: 'story_end', requestId });
        });
      } else if (data.type === 'cancel_story') {
        const requestId = data.requestId;
        if (typeof requestId === 'string' && requestId.trim()) {
          ws.cancelledRequestIds.add(requestId.trim());
        }
      } else if (data.type === 'terminate_story') {
        console.log(`Story terminated by client. Reason: ${data.reason}`);
        
        // Get ending phrase from LLM
        const terminationPrompt = "用户长时间未回应或结束了对话。请根据当前故事体裁输出一句简短的晚安结束语（例如童话可以是'森林里的小动物们都睡了，晚安'），不要输出其他内容。";
        ws.history.push({ role: 'user', content: terminationPrompt });
        
        let fullResponse = '';
        for await (const chunk of streamStory(ws.history, "你是一个睡前故事讲述者，请直接输出一句晚安语。")) {
           safeJsonSend({ type: 'text_chunk', content: chunk });
           fullResponse += chunk;
        }
        
        ws.history.push({ role: 'assistant', content: fullResponse });

        // Generate final audio
        try {
           const voiceParams = await parseVoiceParamsFromPrompt(""); // Default voice
           if (ws.lastVoiceId) {
             voiceParams.id = ws.lastVoiceId;
           }
           const audioStream = await generateAudioStream(fullResponse, voiceParams, { format: 'wav', sample_rate: 24000 });
           const chunks = [];
           audioStream.on('data', (c) => chunks.push(c));
           audioStream.on('end', () => {
              const completeBuffer = Buffer.concat(chunks);
              if (completeBuffer.length > 0) {
                safeJsonSend({ type: 'audio_chunk', content: completeBuffer.toString('base64') });
              }
              safeJsonSend({ type: 'story_end' });
           });
        } catch(e) {
           safeJsonSend({ type: 'story_end' });
        }

        // 当用户主动终止时也保存归档
        saveConversationToMarkdown(ws.history, {
          story_id: '未命名故事',
          mood_final: '主动终止',
          listened_complete: false
        });
        
        // Return full history so client can save
        safeJsonSend({ type: 'story_saved', content: JSON.stringify(ws.history, null, 2) });
        
      }
    } catch (error) {
      console.error('Error processing message:', error);
      safeJsonSend({ type: 'error', content: error?.message || 'unknown_error' });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// 对话存档相关函数
async function saveConversationToMarkdown(history, logData) {
  try {
    // 创建存档目录
    const archiveDir = path.join(process.cwd(), '对话归档');
    await fs.mkdir(archiveDir, { recursive: true });

    // 生成文件名：故事ID_日期时间.md
    const date = new Date();
    const dateStr = `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日`;
    const timeStr = `${date.getHours().toString().padStart(2, '0')}时${date.getMinutes().toString().padStart(2, '0')}分`;
    const storyId = logData?.story_id || '未命名故事';
    const fileName = `${storyId}_${dateStr}_${timeStr}.md`;
    const filePath = path.join(archiveDir, fileName);

    // 构建 Markdown 内容
    let mdContent = `# 🌌 睡前故事归档\n\n`;
    mdContent += `> **故事 ID：** ${storyId}\n`;
    mdContent += `> **记录时间：** ${dateStr} ${timeStr}\n`;
    mdContent += `> **最终情绪：** ${logData?.mood_final || '未知'}\n`;
    mdContent += `> **是否听完：** ${logData?.listened_complete ? '是' : '否'}\n\n`;
    mdContent += `---\n\n`;

    // 过滤并格式化对话历史
    for (const msg of history) {
      if (msg.role === 'system') continue; // 过滤系统提示词
      
      const isUser = msg.role === 'user';
      const roleName = isUser ? '👤 **用户**' : '🌙 **故事讲述者**';
      
      // 清理 AI 回复中的内部标记
      let content = msg.content;
      if (!isUser) {
        content = content.replace(/---INTERNAL_LOG---[\s\S]*?$/, '').trim();
        content = content.replace(/\[SCENE:\s*(\w+)\]/g, '').trim();
        content = content.replace(/\[NOISE_DECAY\]/g, '').trim();
      }

      mdContent += `### ${roleName}\n\n`;
      mdContent += `${content}\n\n`;
      mdContent += `---\n\n`;
    }

    mdContent += `\n*愿你有一个甜美的梦。晚安。* 💤\n`;

    // 写入文件
    await fs.writeFile(filePath, mdContent, 'utf-8');
    console.log(`[存档成功] 对话已保存至: ${filePath}`);
  } catch (error) {
    console.error(`[存档失败] 无法保存对话:`, error);
  }
}

app.get('/', (req, res) => {
  res.send('Sleep Story AI Server is running');
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
