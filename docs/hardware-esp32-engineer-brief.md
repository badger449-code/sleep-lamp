# 小智硬件工程师（ESP32 嵌入式）任职规范

## 文档信息

- **角色 ID**: `hardware-esp32-engineer`
- **向谁汇报**: CTO（小虾米技术身份）
- **创建日期**: 2026-04-22
- **基于**: 小智官方 Wiki 全量文档研究 + GitHub API 源码分析

---

## 一、技术上下文

### 1.1 小智整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     ESP32 设备（小智固件）                      │
│   唤醒词检测 → 语音采集(OPUS) → WebSocket/MQTT → 云端        │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴──────────────────┐
            ▼                                    ▼
    ┌───────────────┐               ┌─────────────────────────┐
    │ MQTT Gateway  │               │   xiaozhi-esp32-server  │
    │ (Node.js)     │  WebSocket    │   (Python)              │
    │ 端口1883/8884 │ ──────────▶  │   OTA接口 :8003          │
    │ +8007管理API  │               │   WS接口  :8000          │
    └───────────────┘               └─────────────────────────┘
                                                      │
                                    ┌─────────────────┴────────────────┐
                                    ▼                                  ▼
                           ┌──────────────┐              ┌──────────────────────────┐
                           │ 阿里云百炼    │              │ MCP接入点 (可选)          │
                           │ ASR/LLM/TTS │              │ 工具扩展能力              │
                           └──────────────┘              └──────────────────────────┘
```

**关键认知**：
- 小智固件已经是一个完整的语音交互设备，开箱即用
- **Sleep Lamp 的目标不是重复造轮子**，而是在小智固件基础上做二次开发
- 需要在 ESP32 固件层新增 IoT 控制协议，让设备能接收来自云梦后端的指令（如"播放睡前故事"、"调节灯光色温"）

---

### 1.2 通信协议（已实测）

#### WebSocket 文本消息格式

```json
// 客户端 → 服务端（开始监听）
{ "session_id": "", "type": "listen", "state": "start", "mode": "auto" }

// 服务端 → 客户端（TTS状态）
{ "type": "tts", "state": "start", "text": "正在播放..." }
{ "type": "tts", "state": "stop" }

// 服务端 → 客户端（情感 emoji）
{ "type": "llm", "text": "😊", "emotion": "happy" }

// 客户端 → 服务端（中止）
{ "session_id": "", "type": "abort", "reason": "wake_word_detected" }

// MCP工具调用
{ "session_id": "", "type": "mcp", "payload": {...} }
```

#### WebSocket 连接握手

```
Headers:
  Authorization: Bearer <access_token>
  Protocol-Version: 1
  Device-Id: <MAC地址>
  Client-Id: <UUID>

Hello交换:
  客户端发送: { "type": "hello", "version": 1, "transport": "websocket",
                "features": { "mcp": true },
                "audio_params": { "format": "opus", "sample_rate": 16000,
                                  "channels": 1, "frame_duration": 60 } }
  服务端响应: { "type": "hello", "transport": "websocket",
                "audio_params": { "format": "opus", "sample_rate": 24000,
                                  "channels": 1, "frame_duration": 60 } }
```

#### 音频格式

| 参数 | 值 |
|------|-----|
| 编码格式 | OPUS |
| 采样率 | 24000Hz（服务端）/ 16000Hz（客户端） |
| 声道 | 1（单声道） |
| 帧时长 | 60ms |
| 传输方式 | 二进制帧 |

---

### 1.3 OTA 机制（设备激活流程）

```
ESP32上电 → 请求OTA接口 → 返回WebSocket地址 + MQTT配置
                            ↓
                    MQTT连接到 Gateway
                            ↓
                    WebSocket连接到 xiaozhi-server
```

OTA 请求示例：
```bash
curl 'http://<server>:8003/xiaozhi/ota/' \
  -H 'Device-Id: 11:22:33:44:55:66' \
  --data-raw '{"application":{"version":"1.0.1","elf_sha256":"1"},
               "board":{"mac":"11:22:33:44:55:66"}}'
```

OTA 响应（包含 MQTT 配置）：
```json
{
  "websocket":{"url":"ws://<server>:8000/xiaozhi/v1/"},
  "mqtt":{
    "endpoint":"<mqtt-gateway-ip>:1883",
    "client_id":"GID_default@@@11:22:33:44:55:66@@@...",
    "username":"eyJ...",
    "password":"...",
    "publish_topic":"device-server",
    "subscribe_topic":"devices/p2p/11_22_33_44_55_66"
  }
}
```

---

### 1.4 MQTT Gateway 配置

`.env` 文件关键配置：

```env
PUBLIC_IP=<公网IP>
MQTT_PORT=1883        # MQTT TCP端口
UDP_PORT=8884         # MQTT over UDP端口
API_PORT=8007         # 管理API端口
MQTT_SIGNATURE_KEY=<签名密钥>
SERVER_SECRET=<与xiaozhi-server的auth_key一致>
```

---

### 1.5 MCP 协议（工具扩展）

MCP（Model Context Protocol）是让大模型调用外部工具的标准协议。

```python
# FastMCP 示例
from mcp.server.fastmcp import FastMCP
mcp = FastMCP("SleepLamp")

@mcp.tool()
def play_story(story_id: str, voice: str = "female_night") -> dict:
    """播放睡前故事，可选声音风格"""
    return {"success": True, "story_id": story_id, "status": "playing"}

# MCP Hub（可选）
# - 多端点管理、分组、工具同步
# - Docker 部署：docker-compose up -d
# - Web 控制台：http://localhost:3000
```

MCP 注意事项：
- 工具名称和参数名要清晰，让大模型知道何时调用
- 函数文档注释（"""..."""）决定大模型何时使用工具
- 返回值限制在 1024 字节内
- 每个 MCP 接入点的连接数有上限

---

### 1.6 小智支持的开发板

| 开发板 | 固件名称 | 参考价格 | 特点 |
|--------|---------|---------|------|
| **ESP32-S3-BOX-3** | v2.2.4_esp-box-3.zip | 299元 | 乐鑫官方，触控屏，带外壳 |
| **M5Stack CoreS3** | v2.2.4_m5stack-core-s3.zip | 259元 | 工业级，摄像头支持 |
| **立创·实战派 ESP32-S3** | v2.2.4_lichuang-dev.zip | 148元 | 国产，屏幕显示对话 |
| **Xmini-C3** | v2.2.4_xmini-c3.zip | 49-80元 | 虾哥设计，迷你性价比 |
| **Movecall Moji** | v2.2.4_movecall-moji-esp32s3.zip | 116元 | 带电池，便携 |
| **酷世 DIY ESP32-S3-SP-V3** | v2.2.4_kevin-sp-v3.zip | 119元起 | 带屏幕，电池接口 |

**Sleep Lamp 推荐板子**：待定，需根据产品形态选择

---

### 1.7 MCP Hub（xiaozhi-mcphub）

面向小智生态的 MCP 管理平台：
- 多端点管理与状态监控
- 工具同步（服务器工具变化时主动通知小智端点）
- 分组与智能路由（pgvector 向量检索）
- 支持 stdio / SSE / HTTP 三类 MCP 服务器
- Docker 一键部署

```bash
git clone https://github.com/huangjunsen0406/xiaozhi-mcphub.git
cd xiaozhi-mcphub
docker-compose up -d
# 访问 http://localhost:3000
```

---

### 1.8 Emoji 情感列表（20种）

| Emoji | 情感 | Emoji | 情感 |
|-------|------|-------|------|
| 😶 | neutral | 🙂 | happy |
| 😆 | laughing | 😂 | funny |
| 😔 | sad | 😠 | angry |
| 😭 | crying | 😍 | loving |
| 😳 | embarrassed | 😲 | surprised |
| 😱 | shocked | 🤔 | thinking |
| 😉 | winking | 😎 | cool |
| 😌 | relaxed | 🤤 | delicious |
| 😘 | kissy | 😏 | confident |
| 😴 | sleepy | 😜 | silly |

---

### 1.9 MCP Pipe + HyperChat（轻量级 MCP 接入）

适合快速验证 MCP 能力：
- **HyperChat**：全平台支持，Docker 一键部署，内置工具（网页访问、命令执行等）
- **MCP Pipe**：Windows 专用 GUI，将 MCP 工具桥接到小智接入点
- 步骤：安装软件 → 创建 MCP 网关 → 配置连接 → 赋予小智工具能力

---

## 二、核心任务

### 2.1 主任务：ESP32 固件二次开发

**目标**：让小智设备能响应云梦后端下发的 IoT 控制指令（播放故事、灯光控制等），而非仅做语音对话。

**技术路径**：
1. 在小智固件（ESP-IDF + freeRTOS）基础上，新增 IoT 协议层
2. 复用小智的 WebSocket 连接，复用其 ASR/LLM/TTS 能力
3. 新增一个独立的 MQTT 客户端（或利用小智现有 MQTT 通道），订阅来自云梦后端的控制指令
4. 将控制指令转化为 ESP32 GPIO / PWM 控制（驱动灯带、电机等）

**待研究问题**（硬件工程师需回答）：
- 小智固件的 MQTT 通道是否可用？如何配置 broker 地址？
- ESP32 的 GPIO 引脚是否足够（Sleep Lamp 需要哪些外设）？
- 当前 Sleep Lamp 使用的开发板型号是什么？

---

### 2.2 辅助任务：OTA 接口对接

**目标**：让 ESP32 设备能从云梦后端获取 OTA 升级包。

**技术路径**：
1. 部署 xiaozhi-esp32-server 的 OTA 接口
2. 在云梦后端实现 OTA 控制逻辑（指定版本、强制推送等）
3. ESP32 固件中实现 OTA 升级流程（参考小智现有 OTA 实现）

---

### 2.3 MCP 工具扩展（视产品需求）

**目标**：让小智能通过 MCP 调用云梦后端提供的工具（如查询故事库、获取睡眠建议）。

**技术路径**：
1. 在云梦后端实现 MCP Server（FastMCP）
2. 通过 MCP Hub 或直连方式暴露给小智设备
3. 在小智的 system prompt 中引导大模型在适当场景调用工具

---

## 三、技术栈要求

| 模块 | 技术要求 |
|------|---------|
| ESP32 固件 | ESP-IDF 5.5+ / freeRTOS / C++ |
| MQTT | PubSubClient / Mosquitto |
| WebSocket | WebSocket Client (Arduino) |
| IoT 协议 | 可参考小智 IoT 协议 或自研 |
| 音频 | OPUS 编解码 / I2S / ES8311 |
| 工具链 | CMake / idf.py / esptool |
| 云端对接 | Python 3.10+ / MQTT Broker / WebSocket |

---

## 四、参考资料

| 文档 | 链接 | 说明 |
|------|------|------|
| 小智百科全书 | `F5krwD16viZoF0kKkvDcrZNYnhb` | 全量文档入口 |
| v2.2.4 固件下载 | `W14Kw1s1uieoKjkP8N0c1VVvn8d` | 129个固件列表 |
| Flash烧录教程 | `Zpz4wXBtdimBrLk25WdcXzxcnNS` | 无IDF环境烧录 |
| IDF开发环境 | `JEYDwTTALi5s2zkGlFGcDiRknXf` | Windows IDF 5.5.3 |
| WebSocket协议 | `M0XiwldO9iJwHikpXD5cEx71nKh` | 协议文档 |
| 通信协议 | `M0XiwldO9iJwHikpXD5cEx71nKh` | 连接建立流程 |
| Emoji协议 | `LDN2wbdRyi6evQk6xgXcTe6ened` | 情感显示 |
| MCP接入点说明 | `HiPEwZ37XiitnwktX13cEM5KnSb` | 官方MCP教程 |
| MCP Hub | `VrHAwQRRdiWS8ykHk44cbdpynGe` | MCP管理平台 |
| MCP第三方接入 | `OzyBwcRD1i5nONkHmMQcJPQOnwc` | HyperChat方案 |
| xiaozhi-esp32-server | GitHub API 已下载 | 后端源码 |
| MQTT网关集成 | `docs/mqtt-gateway-integration.md` | 已下载 |

---

## 五、交接清单

硬件工程师入职时需确认：

- [ ] 已阅读小智百科全书全量文档
- [ ] 已知晓小智 WebSocket 协议握手流程
- [ ] 已知晓 OTA 激活机制（MQTT配置下发）
- [ ] 已了解 MCP 协议扩展机制
- [ ] 确认 Sleep Lamp 使用的开发板型号
- [ ] 确认 GPIO 引脚需求（灯带、电机等）
- [ ] 已搭建 ESP-IDF 5.5 开发环境
- [ ] 已成功烧录一个小智固件并完成配网激活
- [ ] 已运行 xiaozhi-esp32-server（可本地或 Docker）
- [ ] 已知晓云梦后端当前状态（P0 已完成，待 ESP32 固件重写）

---

*文档版本：v1.0 | AI CEO 小虾米编制 | 2026-04-22*
