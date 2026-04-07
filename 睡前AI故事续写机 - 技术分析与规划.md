# 睡前AI故事续写机 - 技术分析与规划 (MVP & 实体产品原型)

## 1. 项目概述与阶段目标

### 1.1 产品定义
“睡前AI故事续写机”是一个**面向成年人的深度叙事体验**产品（非色情/低俗，而是情感疗愈、悬疑推理、科幻探索等深度内容）。

### 1.2 当前阶段：Web MVP (Demo)
*   **核心目标**：验证“语音输入 -> AI 生成 -> 语音播放”的流畅度和故事质量。
*   **形态**：Web 端单页应用（SPA），模拟未来实体产品的交互逻辑（如“按住说话”、“旋钮调节音量”）。
*   **用户规模**：单人或小范围演示，不考虑高并发。
*   **部署方式**：本地运行 (Localhost) 或单机云服务器。

### 1.3 未来规划：实体产品
*   **目标形态**：基于树莓派/ESP32 的独立硬件设备，放置于床头。
*   **交互方式**：物理按键、旋钮、语音唤醒（**唤醒词：小梦 小梦**）。
*   **连接方式**：Wi-Fi 接入后端服务。

---

## 2. 核心功能边界 (MVP)

为了快速验证核心价值，我们将功能裁剪至最小闭环：

### 2.1 必须实现 (P0)
- [ ] **语音交互循环**：
    -   用户按住按钮说话（输入 Prompt/续写指令）。
    -   系统识别语音转文字 (STT)。
    -   AI 生成故事文本 (LLM)。
    -   系统合成语音并播放 (TTS)。
- [ ] **流式响应 (Streaming)**：
    -   实现“边生成边播放”，将首字/首声延迟控制在 3 秒以内（极重要体验指标）。
- [ ] **白噪音背景**：
    -   支持 1-2 种白噪音（如雨声、篝火），可与人声混音播放。
- [ ] **基础故事控制**：
    -   暂停/继续播放。
    -   重新生成（如果不满意）。

### 2.2 暂时搁置 (P1/P2)
- [x] 用户注册/登录系统（直接使用 LocalStorage 或设备指纹）。
- [x] 支付系统。
- [x] 复杂历史记录（仅保留当前会话历史）。
- [x] 多语言支持（仅支持中文）。
- [x] 社区分享功能。

---

## 3. 技术选型 (Demo 优先)

在 Demo 阶段，我们**不计成本**追求最佳效果，以验证产品上限。

### 3.1 前端 (Web 模拟器)
*   **框架**：React 18 + Vite
*   **UI 库**：Tailwind CSS + Lucide React (图标)
*   **音频处理**：Web Audio API (原生) 或 Howler.js
*   **交互模拟**：使用 Framer Motion 制作按钮按压、声波纹动画，模拟硬件质感。

### 3.2 后端 (中转服务)
*   **运行时**：Node.js (Express/Koa)
*   **通信协议**：**WebSocket** (必须，用于全双工流式传输)
*   **部署**：本地电脑 + 内网穿透 (Ngrok/Cloudflare Tunnel) 即可，方便调试 HTTPS。

### 3.3 AI 服务 (追求效果)
*   **LLM (大脑)**：
    *   **首选**：**GPT-4o** 或 **Claude 3.5 Sonnet** (逻辑性强，文笔好)。
    *   **备选**：DeepSeek-V3 (成本低，中文能力强)。
*   **STT (听)**：
    *   **Web Speech API** (浏览器原生，免费，需 HTTPS，Demo 首选)。
    *   **OpenAI Whisper** (API 版，识别精准)。
*   **TTS (说)**：
    *   **首选**：**ElevenLabs** (情感表现力最强，适合讲故事，但在中国访问可能慢)。
    *   **备选**：**Azure TTS** (Neural Voice，中文效果极佳，延迟低)。
    *   **备选**：Edge TTS (免费方案，效果尚可)。

---

## 4. 架构设计 (MVP)

```mermaid
graph TD
    User[用户 (Web/未来硬件)] -->|WebSocket 音频流/文本| Server[Node.js 后端]
    
    subgraph "后端处理流"
        Server -->|1. 发送音频| STT[语音识别 (Whisper/WebSpeech)]
        STT -->|2. 返回文本| Server
        Server -->|3. 发送 Prompt| LLM[GPT-4o / Claude 3.5]
        LLM -->|4. 流式返回文本| Server
        Server -->|5. 流式发送文本| TTS[语音合成 (Azure/11Labs)]
        TTS -->|6. 返回音频流| Server
    end
    
    Server -->|7. 推送音频流 Chunk| User
```

### 关键数据流
1.  **用户输入**：按住麦克风 -> 录音 -> 停止 -> 发送音频 Blob。
2.  **处理**：后端识别为文本 -> 拼接 Prompt -> 调用 LLM Stream 接口。
3.  **合成与播放**：
    *   后端收到 LLM 的一段完整句子（通过标点符号判断）。
    *   立即调用 TTS 生成该句子的音频。
    *   将音频 Chunk 通过 WebSocket 推送给前端。
    *   前端维护一个 `AudioQueue`，顺序播放收到的音频片段。

---

## 5. 实体产品预研 (硬件迁移路径)

为了将来迁移到实体产品，软件架构需注意：

1.  **接口解耦**：前端与后端的交互应完全基于 API/WebSocket，不依赖浏览器特有 API（如 LocalStorage）。
2.  **硬件选型思考**：
    *   **主控**：树莓派 Zero 2 W (运行 Linux，可直接运行 Node.js/Python 脚本，开发最快) 或 ESP32-S3 (成本低，适合量产，需 C++/MicroPython 开发)。
    *   **音频模块**：I2S DAC (如 PCM5102) + 功放 + 喇叭。
    *   **麦克风**：I2S MEMS 麦克风 (如 INMP441)。
3.  **协议兼容**：目前的 WebSocket 架构可以直接被树莓派/ESP32 复用。

---

## 6. 开发计划 (MVP 冲刺)

### 第一周：核心链路打通
1.  搭建 React + Node.js 基础框架。
2.  实现 WebSocket 连接。
3.  调通 LLM 流式输出 (Text Stream)。
4.  调通 TTS 文本转音频 (Audio File)。

### 第二周：流式语音与交互
1.  实现“边生成边播放”逻辑 (Sentence-level Buffering)。
2.  前端实现类似“对讲机”的按住说话交互。
3.  引入背景白噪音混音。

### 第三周：优化与演示
1.  调整 Prompt，优化故事风格（成人深度向）。
2.  优化 TTS 语速和情感参数。
3.  UI 动效打磨（声波纹、呼吸灯效果）。

---

## 7. 风险与合规 (MVP)

*   **内容合规**：
    *   虽然是 Demo，建议在 Prompt 中加入 System Instruction：`Avoid explicit sexual content or violence. Keep the story emotional, immersive and suitable for adults.`
    *   如果演示给第三方看，建议接入简单的敏感词过滤。
*   **网络延迟**：
    *   TTS 和 LLM 的 API 均在海外（如果选 GPT/11Labs），需考虑科学上网环境或使用国内代理/中转。
*   **HTTPS**：
    *   本地开发必须配置 HTTPS 才能在手机浏览器上测试麦克风权限。建议使用 `mkcert` 生成本地证书。
