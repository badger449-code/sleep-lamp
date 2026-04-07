# 睡前AI故事续写机 (Sleep Story AI)

## 项目背景
在快节奏的现代生活中，许多人面临入睡困难的问题。本项目旨在提供一个“语音交互式睡前故事续写机”，通过语音识别（STT）、大语言模型（LLM）生成和语音合成（TTS）的闭环，为用户提供沉浸式、个性化的助眠故事体验。用户只需轻声说出他们想要的梦境开头，AI 就会用温柔的声音继续编织故事，引导用户进入梦乡。

## 核心功能
1. **语音交互录入**：支持用户通过麦克风输入简短的语音提示，系统自动将其转化为文本。
2. **AI 智能续写**：根据用户的提示，结合专属的“助眠人格”提示词，生成平缓、温柔、无冲突的睡前故事。
3. **流式语音合成 (TTS)**：故事生成过程中，系统将文本分段流式转换为高质量的语音音频，并实时播放，提供无缝体验。
4. **助眠环境控制**：提供白噪音（如雨声）和星空动态背景，增强沉浸感。
5. **Agent 提示词管理**：支持在前端直接选择不同的 AI 人格（如默认温柔讲述者、梦幻童话风、星际漫游风），甚至自定义系统提示词，实现高度个性化的故事风格。

## 技术架构
项目采用前后端分离的架构：

### 前端 (Client)
- **核心框架**: React 18 + Vite
- **样式方案**: Tailwind CSS + Framer Motion (用于动画交互)
- **图标库**: Lucide React
- **关键 API**: Web Speech API (用于浏览器端语音识别)、Web Audio API (用于音频流播放)
- **通信协议**: WebSocket (与后端进行实时文本和音频流交互)

### 后端 (Server)
- **核心框架**: Node.js + Express + `ws` (WebSocket)
- **AI 模型集成**:
  - **LLM**: OpenAI SDK (兼容 DeepSeek 等其他大模型接口)，用于流式生成故事文本。
  - **TTS**: 阿里云百炼 `qwen3-tts-vd-2026-01-26` 模型，通过 RESTful API 调用，支持自然语言解析音色与情感。

## 部署方式

### 环境准备
1. 安装 Node.js (v18+ 推荐)
2. 获取大模型 API Key（如 OpenAI 或 DeepSeek）
3. 获取阿里云百炼 API Key 用于 TTS 服务

### 后端部署
```bash
cd server
npm install
# 复制并配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入所需环境变量
# 必需的 TTS 环境变量：
# TTS_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TTS_MODEL=qwen3-tts-vd-2026-01-26
# TTS_DEFAULT_VOICE=female
npm run dev # 开发模式启动
```

### 提示词示例库 (Prompt Library)
通过在前端设定的自然语言提示词中加入以下描述，AI 即可自动识别并应用对应的语音配置：
- **性别与声线**: "用清澈的男声讲述"、"用甜美的女声"、"磁性的声音"
- **情感**: "带有开心的情感"、"平静的语调"、"有些悲伤"
- **语速**: "语速稍微慢一点"、"加快语速"
- **角色**: "像播音员一样"、"像客服一样耐心"、"像大叔讲故事"

**组合示例**：
> "你是一个温柔的睡前故事讲述者。请用甜美的女声，平静的情感，语速稍微慢一点（0.8倍速），像讲童话故事一样开始讲述。"
后端服务默认运行在 `http://localhost:3000`。

### 前端部署
```bash
cd client
npm install
npm run dev # 启动前端开发服务器
```
前端服务默认运行在 `http://localhost:5173`。构建生产版本请使用 `npm run build`。

## 使用指南
1. 打开前端页面后，页面会展示星空背景和交互按钮。
2. **设置提示词**：点击右上角的“提示词设定”图标，选择预设的 AI 人格或输入自定义的提示词。
3. **选择声音**：在底部下拉菜单中选择喜欢的声音（如晓伊、云希等）。
4. **环境音**：点击底部的白噪音按钮，开启或关闭背景白噪音。
5. **开始交互**：长按屏幕中央的麦克风按钮，说出你想要的梦境（例如：“我走进了一片发光的森林”），松开按钮后，AI 将开始处理并为您娓娓道来。

## 维护说明
- **扩展提示词**：可以在 `client/src/config/prompts.js` 中添加更多的预设模板。
- **网络连接问题**：如果 WebSocket 经常断开，请检查网络代理或防火墙设置。前端连接地址目前配置在 `client/src/hooks/useStoryMachine.js` 中，生产环境需调整为实际域名。

## 音色选择器组件接入指南 (VoiceSelector)

本系统集成了完整的阿里云官方音色选择器组件，支持从“芊悦”到“粤语-阿清”等 49 种高品质官方音色。

### 特性
- 完整包含官方最新支持的音色数据（含性别、语言标签）
- 使用 Zustand 进行全局状态管理，自动在多个组件间同步 `voiceId`
- 支持按语言（普通话、粤语、方言）和性别进行快速过滤，以及文本搜索
- 响应式设计，兼容桌面端与移动端下拉面板交互

### 接入步骤
1. **安装依赖**：如果项目中尚未安装，请运行 `npm install zustand lucide-react framer-motion`
2. **引入状态**：在需要获取当前音色标识的地方，使用 `useVoiceStore` Hook：
   ```jsx
   import { useVoiceStore } from '@/store/useVoiceStore';
   
   function MyComponent() {
     const { voiceId } = useVoiceStore();
     // 使用 voiceId 调用 TTS 接口
   }
   ```
3. **渲染组件**：直接渲染 `<VoiceSelector />` 组件，无需传入任何 props：
   ```jsx
   import { VoiceSelector } from '@/components/common/VoiceSelector';
   
   <VoiceSelector />
   ```
4. **组件演示**：可通过访问 `/demo` 路由（如 `http://localhost:5173/demo`）查看组件效果与交互状态。
5. **单元测试**：使用 Vitest 和 Testing Library 进行测试，运行 `npx vitest run --coverage` 查看测试覆盖率。
