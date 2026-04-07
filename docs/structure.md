# 项目文件结构与说明文档

本文档详细描述了“睡前AI故事续写机”项目中各个主要文件夹和关键文件的职责、包含内容、依赖关系以及开发维护时的注意事项。

---

## 根目录 (`d:\opencode\sleep\`)
项目的根工作区，包含前端和后端的独立子项目目录，以及一些全局的规划与文档文件。

- **`client/`**: 前端 React 项目目录。
- **`server/`**: 后端 Node.js 项目目录。
- **`docs/`**: 项目文档目录（包含当前文件结构说明）。
- **`README.md`**: 项目整体说明文档，包含背景、功能、部署和使用指南。
- **`睡前AI故事续写机 - 技术分析与规划.md`**: 项目早期的技术选型、架构设计与需求分析报告。
- **`文档审查报告.md`**: 项目文档质量与规范性的审查记录。

---

## 1. 前端端项目 (`client/`)
基于 React + Vite 构建的单页应用，负责用户界面展示、语音录入和音频播放。

### 1.1 `client/public/`
存放不需要经过构建工具（Vite）处理的静态资源文件。
- **`audio/rain.mp3`**: 内置的雨声白噪音文件，由 `NoiseControl.jsx` 依赖。

### 1.2 `client/src/`
前端核心源代码目录。

#### `client/src/components/`
React 组件库，按照功能进行了分类：
- **`common/`**: 通用UI与环境控制组件。
  - **`NoiseControl.jsx`**: 白噪音播放控制组件，负责播放/暂停本地的 `rain.mp3`。
  - **`StarryBackground.jsx`**: 动态星空背景组件，使用纯 CSS 和简单逻辑生成视觉效果，增强沉浸感。
  - **`VoiceSelector.jsx`**: TTS声音选择下拉框组件，负责向状态机更新当前选择的语音角色。
- **`features/`**: 特定功能模块组件。
  - **`PromptSettings.jsx`**: **Agent提示词设定模块**。提供预设人格选择和自定义提示词输入面板，向应用暴露当前选中的提示词内容。

#### `client/src/config/`
前端静态配置目录。
- **`prompts.js`**: 定义了 AI 助眠人格的默认与预设中文提示词（如：温柔讲述者、梦幻童话风等）。供 `PromptSettings.jsx` 依赖和调用。

#### `client/src/hooks/`
自定义 React Hooks 目录。
- **`useStoryMachine.js`**: **前端核心状态机**。
  - **职责**: 封装了语音识别（Web Speech API）、WebSocket 通信以及音频流播放（Web Audio API）的复杂逻辑。
  - **依赖**: 依赖浏览器的原生语音与音频 API。
  - **注意事项**: 涉及浏览器权限获取，开发时需注意处理“用户拒绝麦克风权限”等异常情况。音频流的播放需要由用户交互（如点击）触发才能解除 AudioContext 的挂起状态。

#### `client/src/styles/`
全局与模块样式目录。
- **`App.css` / `index.css`**: 包含全局的 CSS 变量、Tailwind 指令以及自定义的滚动条、动画等样式。

#### 关键入口文件
- **`App.jsx`**: 主应用组件。负责组装各子组件（背景、按钮、提示词面板等），并桥接 `useStoryMachine` 的状态与 UI 渲染。
- **`main.jsx`**: React 挂载入口，引入全局样式并渲染 `<App />`。

---

## 2. 后端项目 (`server/`)
基于 Express 和 ws 构建的 Node.js 服务，负责连接 LLM 生成文本，并调用 TTS 服务合成音频。

### 2.1 `server/src/`
后端核心源代码目录。

#### `server/src/services/`
核心第三方服务对接层。
- **`llmService.js`**: **大语言模型服务**。
  - **职责**: 封装 OpenAI SDK，接收前端传来的用户 Prompt 和 System Prompt，并以流式（Stream）形式返回生成的故事文本。
  - **依赖**: `openai` npm 包，依赖 `.env` 中的 `OPENAI_API_KEY`。
  - **注意事项**: 默认采用 DeepSeek 模型，如果更改为 GPT-3.5/4，需注意调整 API Base URL 和模型名称。
- **`ttsService.js`**: **语音合成服务**。
  - **职责**: 接收文本片段，调用微软 Edge TTS 或 Azure TTS 接口，将文本转化为音频流（Buffer）。
  - **依赖**: `@azure/cognitiveservices-speech-sdk` 等音频处理库。
  - **注意事项**: 返回的是音频流，由于浏览器播放限制，需确保返回完整的音频片段，否则可能会出现解码错误。

#### 关键入口文件
- **`server/src/index.js`**: **后端主入口与 WebSocket 控制器**。
  - **职责**: 启动 Express HTTP 服务（用于健康检查等）以及 WebSocket 服务。监听前端的 `start_story` 消息，串联 LLM 与 TTS 流程：先通过 `llmService` 获取文本流，进行**按句分割**，然后将完整的句子送入 `ttsService` 生成音频，最终将文本和 Base64 编码的音频块通过 WebSocket 发送回前端。
  - **注意事项**: 句子分割逻辑目前基于简单的正则表达式（如遇到句号、叹号分割），在处理复杂标点时可能需要进一步优化以保证断句自然。

### 2.2 配置与依赖文件
- **`server/.env` / `.env.example`**: 环境变量配置。存放敏感信息如 API 密钥、端口号等。**切勿将真实的 `.env` 文件提交到版本控制系统**。
- **`server/package.json`**: 后端依赖描述文件。定义了 `npm run dev` (使用 nodemon) 和 `npm start` 等启动脚本。
