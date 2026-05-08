# 小智 ESP32 云端接入层设计方案

> **任务编号**：TASK-P1-IOT-001  
> **负责人**：语音 AI 集成工程师  
> **创建时间**：2026-04-19  
> **版本**：v1.0  
> **状态**：✅ 设计完成

---

## 1. 现状分析

| 组件 | 状态 |
|------|------|
| ESP32 已刷小智固件 | ✅ 完成 |
| 云端 MQTT Broker | ❌ 未部署 |
| 协议处理代码 | ❌ 未实现 |
| 现有 WebSocket 后端 | ✅ 已运行（port 3000） |

**核心挑战**：ESP32 通过 MQTT 协议上报音频数据，但现有后端基于 WebSocket 工作。需要新增 MQTT 接入层作为桥接。

---

## 2. MQTT Broker 选型

### 推荐方案：EMQX Enterprise 或 EMQX Open Source

| 对比项 | EMQX 开源版 | EMQX Cloud（云服务） |
|--------|-------------|---------------------|
| **协议支持** | MQTT 3.1.1/5.0 完整支持 | 同左 |
| **认证** | JWT / LDAP / PSK | JWT（托管） |
| **集群** | 开源版不支持自动集群 | 支持多可用区 |
| **费用** | 免费（自建） | 按连接数计费 |
| **适用规模** | < 10万并发连接 | 生产环境推荐 |

### 选型结论

**初期推荐：EMQX 开源自建**（Docker 部署 5 分钟内启动）
- 原因：Sleep Lamp 设备量初期有限，开源版完全满足
- 后期若设备量 > 1万，考虑迁移 EMQX Cloud

### JWT 认证配置

```yaml
# EMQX 认证规则（emqx.conf）
mqtt.auth.jwt.enable = on
mqtt.auth.jwt.secret = ${JWT_SECRET}
mqtt.auth.jwt.alg = "HS256"
mqtt.auth.jwt.claims_template = {
  "username": "${username}",
  "exp": ${exp}
}
```

**设备连接时的 JWT Payload 示例**：
```json
{
  "device_id": "lamp_001",
  "username": "esp32_xiaozhi",
  "exp": 1747747200
}
```

---

## 3. 协议子集设计

### 3.1 精简原则

移除 `noise_decay` 指令（ESP32 无法实现），改用静音音频替代。协议瘦身减少 ESP32 与 Broker 之间的通信开销。

### 3.2 保留指令

#### `scene_determined` — 场景确定

**Topic**：`devices/{device_id}/scene`

**Payload**：
```json
{
  "type": "scene_determined",
  "scene_id": "story_mode",
  "timestamp": 1713468000000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `scene_id` | string | 场景标识符（如 `story_mode`、`sleep_mode`、`music_mode`） |
| `timestamp` | number | 毫秒级时间戳 |

---

#### `audio_chunk` — 音频分块（8KB）

**Topic**：`devices/{device_id}/audio`

**Payload**：
```json
{
  "type": "audio_chunk",
  "seq": 42,
  "data": "<base64_encoded_8kb_audio>",
  "is_last": false,
  "timestamp": 1713468001000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `seq` | number | 序号，从 0 开始，用于重组 |
| `data` | string | Base64 编码的音频数据，每块 ≤ 8KB |
| `is_last` | boolean | `true` = 最后一块，触发转录 |
| `timestamp` | number | 毫秒级时间戳 |

**分块策略**：
- 每块固定 8KB（不含 Base64 开销）
- ESP32 侧累积满 8KB 即发送
- `is_last=true` 时，云端组装完整音频后触发 ASR

---

#### `story_end` — 故事结束

**Topic**：`devices/{device_id}/control`

**Payload**：
```json
{
  "type": "story_end",
  "story_id": "session_123",
  "listen_duration_ms": 120000,
  "timestamp": 1713468120000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `story_id` | string | 故事会话 ID |
| `listen_duration_ms` | number | 有效收听时长（毫秒） |
| `timestamp` | number | 毫秒级时间戳 |

---

### 3.3 新增指令：心跳 Ping-Pong

#### Ping（ESP32 → Broker）

**Topic**：`devices/{device_id}/ping`

```json
{
  "type": "ping",
  "uptime_ms": 3600000,
  "free_heap": 145600,
  "wifi_rssi": -67,
  "timestamp": 1713468000000
}
```

#### Pong（Broker → ESP32）

**Topic**：`devices/{device_id}/pong`

```json
{
  "type": "pong",
  "server_time": 1713468000000,
  "timestamp": 1713468000000
}
```

**心跳配置建议**：
- ESP32 每 30 秒发送一次 Ping
- 云端 10 秒内未收到 Ping，标记设备离线
- 云端响应 Pong 时附带服务器时间戳（用于 ESP32 时钟同步）

---

### 3.4 移除指令

| 指令 | 原因 | 替代方案 |
|------|------|----------|
| `noise_decay` | ESP32 固件无法实现 | 在 `audio_chunk` 发送结束后，云端插入一段 Base64 编码的静音音频（约 1-2 秒） |

---

### 3.5 完整指令集汇总

| 方向 | 指令 | Topic | 说明 |
|------|------|-------|------|
| ESP32 → 云 | `scene_determined` | `devices/{id}/scene` | 场景确定 |
| ESP32 → 云 | `audio_chunk` | `devices/{id}/audio` | 音频数据流 |
| ESP32 → 云 | `story_end` | `devices/{id}/control` | 故事播放结束 |
| ESP32 → 云 | `ping` | `devices/{id}/ping` | 心跳 |
| 云 → ESP32 | `pong` | `devices/{id}/pong` | 心跳响应 |
| 云 → ESP32 | `play_audio` | `devices/{id}/play` | 下行音频播放控制（未来扩展） |

---

## 4. 新增服务清单

### 4.1 mqttGatewayService.js（~400行）

**职责**：MQTT Broker 连接管理、协议转换、Webhook 分发

**核心功能**：
- 连接/重连 EMQX Broker（带指数退避）
- 订阅设备主题：`devices/+/audio`、`devices/+/scene`、`devices/+/ping`
- 将 MQTT 消息转换为内部事件
- JWT 验证（设备身份）
- 消息去重与防乱序（基于 `seq` 序号）
- 断连告警

**接口设计**：

```javascript
class MqttGatewayService {
  // 启动 MQTT 连接
  async connect(brokerUrl, options)

  // 订阅主题
  subscribe(topic)

  // 发布消息到设备
  async publishToDevice(deviceId, payload)

  // 注册消息处理器
  onMessage(topic, handler)

  // 获取设备在线状态
  getDeviceStatus(deviceId)

  // 关闭连接
  async disconnect()
}
```

**关键依赖**：`mqtt` npm 包（MQTT 3.1.1/5.0 客户端）

---

### 4.2 xiaozhiProtocolHandler.js（~300行）

**职责**：小智协议消息的解析、组装、状态机管理

**核心功能**：
- 解析 `audio_chunk` 并重组完整音频
- 调用 ASR 服务（复用现有 `asrService.js`）
- 管理会话状态机：`IDLE → LISTENING → PROCESSING → RESPONDING → IDLE`
- 处理 `scene_determined` 并路由到对应场景
- 触发 `story_end` 后执行归档逻辑
- 组装静音音频替代 `noise_decay`

**接口设计**：

```javascript
class XiaozhiProtocolHandler {
  // 追加音频分块（自动组装）
  appendAudioChunk(deviceId, chunk) => Promise<{ complete: boolean, audioBuffer?: Buffer }>

  // 处理完整音频（触发 ASR）
  async processAudio(deviceId, audioBuffer) => Promise<{ text: string }>

  // 处理场景切换
  handleSceneDetermined(deviceId, sceneId)

  // 处理故事结束
  async handleStoryEnd(deviceId, storyEndEvent)

  // 获取设备会话状态
  getSessionState(deviceId)

  // 重置设备会话
  resetSession(deviceId)
}
```

**状态机**：

```
IDLE ──(audio_chunk)──→ LISTENING ──(is_last=true)──→ PROCESSING
                                                              │
PROCESSING ──(ASR完成)──→ RESPONDING ◄──(audio_chunk来自云端)──┘
                                                              │
RESPONDING ──(story_end)──→ IDLE
```

---

### 4.3 deviceStateManager.js（~150行）

**职责**：设备状态与会话管理

**核心功能**：
- 设备注册表（device_id → metadata）
- 设备在线/离线状态追踪
- 设备元数据缓存（固件版本、最后活跃时间）
- 内存中维护设备状态（Map 结构）
- 定期清理超时会话

**接口设计**：

```javascript
class DeviceStateManager {
  // 注册设备
  registerDevice(deviceId, metadata)

  // 更新心跳
  updateHeartbeat(deviceId)

  // 获取设备信息
  getDevice(deviceId)

  // 获取所有设备
  listDevices(filter?: { onlineOnly?: boolean })

  // 标记设备离线
  markOffline(deviceId)

  // 设备是否存在
  hasDevice(deviceId)
}
```

---

## 5. 对接流程图

### 5.1 文字流程（完整交互链路）

```
┌─────────────────────────────────────────────────────────────────┐
│                          ESP32 设备                              │
│  [小智固件]                                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ MQTT (TLS)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EMQX MQTT Broker                             │
│  端口: 8883 (TLS) / 1883 (非TLS)                                │
│  认证: JWT                                                       │
│  Topic: devices/{device_id}/*                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ 
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               mqttGatewayService.js                             │
│  - JWT 验证                                                      │
│  - 消息去重（seq 序号）                                          │
│  - 路由到协议处理器                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                              │
              ▼                              ▼
┌─────────────────────────┐  ┌─────────────────────────────────┐
│ deviceStateManager.js   │  │  xiaozhiProtocolHandler.js      │
│ - 设备状态追踪          │  │  - 音频重组                      │
│ - 在线/离线管理          │  │  - ASR 调用                      │
└─────────────────────────┘  │  - 状态机管理                    │
                             └─────────────────┬───────────────┘
                                               │
                                               ▼
                             ┌─────────────────────────────────┐
                             │       现有后端服务               │
                             │  (index.js WebSocket / LLM / TTS) │
                             └─────────────────────────────────┘
```

### 5.2 音频采集→转录完整时序

```
ESP32                    Broker              mqttGateway          xiaozhiProtocol        现有后端
  │                        │                    │                    │                   │
  │─── ping ──────────────▶│                    │                    │                   │
  │◀── pong ───────────────│                    │                    │                   │
  │                        │                    │                    │                   │
  │─── scene_determined ──▶│─── 透传 ──────────▶│─── 事件 ──────────▶│                   │
  │                        │                    │                    │                   │
  │─── audio_chunk[0] ────▶│─── 透传 ──────────▶│                    │                   │
  │─── audio_chunk[1] ────▶│─── 透传 ──────────▶│─── 追加 ─────────▶│                   │
  │   ...                   │                    │                    │                   │
  │─── audio_chunk[N] ────▶│─── 透传 ──────────▶│─── is_last=true ─▶│── 组装完成 ──────▶│── ASR + LLM ────▶│
  │                        │                    │                    │                   │
  │◀── audio_stream ──────│◀── 转发 ───────────│◀── TTS音频 ───────│◀── 透传 ──────────│
  │   (WebSocket/TLS)       │                    │                    │                   │
  │                        │                    │                    │                   │
  │─── story_end ─────────▶│─── 透传 ──────────▶│─── 归档 ─────────▶│                   │
  │                        │                    │                    │                   │
```

### 5.3 MQTT Topic 层级设计

```
devices/
 └── {device_id}/
      ├── ping          (ESP32 → 云) 心跳
      ├── pong          (云 → ESP32) 心跳响应
      ├── scene         (ESP32 → 云) 场景确定
      ├── audio         (ESP32 → 云) 音频分块
      ├── control       (ESP32 → 云) 控制指令（story_end）
      └── play          (云 → ESP32) 下行音频（预留）
```

---

## 6. 风险评估

### 风险 1：VAD 检测精度依赖 ESP32 固件方案

**描述**：ESP32 固件内置 VAD（语音活动检测），但小智固件的 VAD 在以下场景可能表现不佳：
- 儿童低声说话（信号弱）
- 背景有白噪音（雨声、空调声）
- 多人同时说话（家庭场景）

**影响**：VAD 误判导致音频截断或静音段被当成语音

**缓解方案**：
- [ ] 前期：依赖固件 VAD，记录异常案例
- [ ] 迭代：云端接入独立的 VAD 服务（如 WebRTC VAD）进行二次校验
- [ ] 备选：若固件 VAD 不可靠，切换为全量音频流（牺牲带宽）

**评级**：⚠️ 中等风险

---

### 风险 2：唤醒词「小智小智」与语音助手冲突

**描述**：若用户家中已有小度/小爱等设备，唤醒词「小智小智」可能产生误唤醒。

**影响**：
- 邻居或视频通话中的他人喊「小智小智」导致 ESP32 误触发
- 用户混淆：不知道是哪个「小智」在响应

**缓解方案**：
- [ ] 支持自定义唤醒词（固件侧实现）
- [ ] 物理按键作为辅助唤醒（按压时说）
- [ ] 与量迹科技确认固件是否支持唤醒词配置

**评级**：⚠️ 中等风险

---

### 风险 3：MQTT 安全——设备伪造与中间人攻击

**描述**：
- 攻击者伪造 device_id 连接 Broker，消耗连接数配额
- 非加密连接下，音频数据可被窃听（设备隐私）
- JWT 密钥泄露导致全局设备被仿冒

**影响**：用户隐私泄露、服务可用性下降

**缓解方案**：
- [ ] 强制 TLS 连接（MQTTS，端口 8883）
- [ ] JWT 密钥独立管理，不写入代码仓库（使用环境变量或 KMS）
- [ ] 设备首次入网时使用设备证书（双向 TLS）
- [ ] Broker 侧配置连接数上限（单设备 1 连接）

**评级**：🔴 高风险，必须在上线前解决

---

### 风险 4：长连接稳定性——NAT 超时与心跳风暴

**描述**：
- ESP32 通过路由器联网，NAT 表超时可能导致连接断开
- 大量设备同时心跳（30s 间隔），Broker 消息突刺

**影响**：设备频繁掉线、QoS 2 重传风暴

**缓解方案**：
- [ ] MQTT KeepAlive 设置为 60 秒（小于 NAT 超时通常的 120s）
- [ ] 心跳间隔随机化（±5s 抖动），避免同步
- [ ] 指数退避重连（首次 1s → 2s → 4s → max 30s）

**评级**：🟡 低风险，工程可控

---

## 7. 部署架构（推荐）

```
                    ┌──────────────────────────────────┐
                    │        阿里云 ECS / VPS          │
                    │                                  │
                    │  ┌─────────────────────────────┐  │
                    │  │      Docker Compose         │  │
                    │  │                             │  │
                    │  │  ┌─────────────────────┐   │  │
                    │  │  │    EMQX Broker      │   │  │
                    │  │  │    (emqx:5.8.0)      │   │  │
                    │  │  └─────────────────────┘   │  │
                    │  │                             │  │
                    │  │  ┌─────────────────────┐   │  │
                    │  │  │  Node.js Services   │   │  │
                    │  │  │  - mqttGateway      │   │  │
                    │  │  │  - xiaozhiProtocol  │   │  │
                    │  │  │  - deviceState     │   │  │
                    │  │  │  - (现有后端)       │   │  │
                    │  │  └─────────────────────┘   │  │
                    │  │                             │  │
                    │  └─────────────────────────────┘  │
                    │                                  │
                    │  端口映射：                       │
                    │  - 1883 (MQTT)                   │
                    │  - 8883 (MQTTS)                  │
                    │  - 3000 (WebSocket / HTTP)       │
                    └──────────────────────────────────┘
```

---

## 8. 下一步行动

| 优先级 | 任务 | 依赖方 | 截止 |
|--------|------|--------|------|
| P0 | 部署 EMQX Docker 实例 | — | 2026-04-20 |
| P1 | 开发 mqttGatewayService.js | EMQX 部署完成 | 2026-04-21 |
| P1 | 开发 xiaozhiProtocolHandler.js | mqttGateway | 2026-04-21 |
| P2 | 开发 deviceStateManager.js | — | 2026-04-21 |
| P2 | 与量迹科技确认固件 VAD 能力 | 量迹科技 | 2026-04-21 |
| P3 | 联调测试：ESP32 ↔ EMQX ↔ 后端 | 固件就绪 | 2026-04-22 |

---

*本文档为设计方案，具体代码实现请参考各服务的 SKILL.md 或接口定义。*
