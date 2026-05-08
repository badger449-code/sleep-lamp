# Sleep Lamp 心理学话术审核与理论依据

**审核人**：心理学家  
**日期**：2026-04-19  
**版本**：v1.0

---

## 一、文件审核结果

| 文件 | 状态 | Patterns | 评分 | 备注 |
|------|------|----------|------|------|
| anxiety_script.json | ✅ 存在 | 3 | 9/10 | 认知行为技术运用得当，防御减轻技术有创意 |
| grievance_script.json | ✅ 存在 | 3 | 8.5/10 | 共情准确，部分脚本过长，需控制节奏 |
| excitement_script.json | ✅ 存在 | 3 | 7/10 | 隐喻丰富但存在激活风险，需修正 TTS 指引 |
| frustration_script.json | ✅ 存在 | 3 | 8.5/10 | 具身认知技术（身体收紧法）运用出色 |

---

## 二、各情绪话术心理学分析

### 2.1 焦虑（Anxiety）

**核心理论框架**：认知解离技术（ACT/CBT）、过渡性空间隐喻

**优势**：
- 「保安」隐喻将焦虑外化（externalization），减少自我攻击——这是维尔特鲁（Vaillant）防御层级中的**幽默**与**升华**级别
- 「白熊悖论」（越不想想越要想）直接利用元认知觉察，属于经典 CBT 技术
- 「大脑交接表」用隐喻绕过阻抗，是叙事疗法的话术技巧

**注意**：第4条「未落定的尘埃」隐喻文学性强，但在高焦虑状态下语义理解成本高，建议**降重**或标记为「低焦虑模式专用」。

**TTS 参数建议**：
- 语速：0.85x（比正常略慢，给予大脑处理空间）
- 音高：中等偏低（低沉的音色传递安全感，符合迷走神经激活规律）
- 停顿：在隐喻转折处停顿 400-600ms（「……其实，」之后）
- 音量：渐弱曲线（最后一句轻下去，引导副交感神经接管）

---

### 2.2 委屈（Grievance）

**核心理论框架**：情绪聚焦疗法（EFT）、加合法（Margulies）关于夜间反刍的机制

**优势**：
- 「懂事的你下班了，委屈上班了」——用角色外化将情绪与人格分离，阻止自我诊断
- 「不是你的错，但最后道歉的是我」——精准命中被动攻击型委屈的核心创伤
- 沼泽/云的隐喻保持了足够的距离感，既让情绪被看见，又不造成二次淹没

**注意**：部分 responses 偏长（>80字），高情绪强度用户可能无法听完。建议在烦躁值高的时段使用**精简版**（每组保留2条）。

**TTS 参数建议**：
- 语速：0.8x（慢于正常语速，配合叹息般的呼吸节奏）
- 音高：柔和偏低，避免上扬（上扬音色传递「加油」感，与委屈互斥）
- 停顿：「……」（此处300-500ms 等待）是关键，不应被 TTS 跳过
- 音量：保持平稳恒定，不应有音量起伏（委屈不需要激励）

---

### 2.3 兴奋睡不着（Excitement）⚠️ 需重点修正

**核心理论框架**：过度激活状态的去激活技术（Deactivation）、蔡格尼克效应（Zenkoebnik effect）

**严重问题**：

当前 excitement 脚本存在**话术目标与 TTS 参数不匹配**的根本性矛盾：

| 矛盾点 | 脚本内容 | 指定 TTS 参数 | 问题 |
|--------|----------|--------------|------|
| 隐喻激活 | 「小人在跳舞」「脚趾头想跟着动」| 语速 0.8x | 身体意象触发运动皮层，与去激活目标冲突 |
| 抽屉隐喻 | 「想象期待的画面，一张一张放进抽屉」 | 语调轻柔 | 主动意象创造需要视觉工作记忆，是激活而非抑制 |
| 「暖暖的」 | 「像开了暖气的房间，舍不得关掉」| 避免兴奋词汇 | 隐喻本身即传达温暖，「舍不得」强化执着 |

**修正后的心理学依据**：

兴奋睡不着本质上不是「正向情绪」问题，而是**皮质醇/多巴胺仍处于高位**，身体处于「预期奖励」状态而无法进入睡眠所需的低代谢模式。

话术目标应该是：**不否认兴奋，而是重新框定（reframe）期待的时间窗口**——让「明天」变成「已经确定会发生的事实」，从而解除大脑的「待确认」状态。

**修正后的 TTS 参数**：

```json
{
  "emotion": "excitement",
  "tts_parameters": {
    "speed": 0.75,
    "pitch": "low, steady",
    "rhythm": "long pauses, measured",
    "volume": "uniform, no swell",
    "tone": "warm but distant — like narrating a memory, not a future event",
    "avoid": ["dance", "jump", "exclaim", "warmth metaphors that imply reluctance to stop"],
    "key_technique": "temporal repositioning — move the excitement from 'tonight' to 'tomorrow morning'"
  }
}
```

**修正示例**（替换原第三条）：

> *「心里那件事，让你睡不着的本质是——它还没有发生。大脑还在等它。你知道它会发生，但身体不知道。所以身体还在待命。今晚，先让身体睡。等你醒来，它还是你的。它不会因为你今晚睡了一觉就消失。它会在的。明天，你精力充沛地醒来，它刚好在等你。」*

（这段话利用了**确定感替代待确认状态**的心理学原理，大脑一旦确认「这件事已经确定」，就不再消耗认知资源去「想着它」，皮质醇自然下降。）

---

### 2.4 烦躁睡不着（Frustration）

**核心理论框架**：具身认知（Embodied Cognition）、过度觉醒（Hyperarousal）模型、身体扫描介入

**本模块最大亮点：脚趾头收紧技术**

这是整个话术库里**最具实证依据**的技术之一：
- 原理：渐近性肌肉放松（Progressive Muscle Relaxation, PMR）的简化版
- 神经机制：强制收缩→放松循环激活副交感神经系统（哺乳类反射）
- 适合场景：用户「静不下来」但又需要躺着不动

**注意**：「不要强迫自己静下来」这句话在低烦躁时有效，但在高烦躁（怒火升级）时可能被解读为「放弃」。建议在 responses 中增加一个**高烦躁版本**的 suffix。

**TTS 参数建议**：

```json
{
  "emotion": "frustration",
  "tts_parameters": {
    "speed": 0.75,
    "pitch": "low",
    "rhythm": "deliberately slower than anxiety — 每句话之间多300ms",
    "volume": "steady, grounding — no emotional ups",
    "tone": "like a calm coach, not a therapist",
    "key_technique": "body grounding first, emotion labeling second — don't name the frustration until the body is ready"
  }
}
```

---

## 三、正面情绪话术缺口：愤怒（Anger）

**正面情绪体系（兴奋/烦躁/愤怒）中的最后一块**

当前 JSON 未覆盖 **愤怒睡不着**，建议新增 `anger_script.json`。

**心理学分析**：

愤怒是「正面情绪」中最难处理的一种——它具有高激活性、高能量、且常伴随**认知放大**（Cognitive Amplification，攻击框架下的认知扭曲）。

愤怒睡不着的心理机制：
1. **延迟性愤怒表达**（suppressed anger）：白天忍了，晚上身体替大脑表达
2. **反刍性愤怒**（angry rumination）：不断重放冲突画面，激活杏仁核
3. **正义感驱动**的睡不着：觉得自己被不公平对待，大脑处于「控诉状态」

**话术设计原则**：
- **不要否认愤怒的合理性**（这会触发防御）
- **不要引导发泄**（愤怒时大脑处于高皮质醇状态，发泄会强化而非消解）
- **正确策略**：将愤怒「打包存放」，等大脑前额叶恢复功能后再处理

**建议 TTS 参数**：
- 语速：0.7x（最慢——愤怒用户的认知带宽被占据，需要更慢的输入节奏）
- 音高：低而稳，避免「软下来」的音色（会触发「你不理解我」的防御）
- 节奏：句子短，每句之间停顿让用户有机会在脑中回应
- 核心情绪词：**「你有权生气」**——先承认，再转移

---

## 四、话术配置化建议

建议在 JSON schema 中新增两个字段，支持话术的分级使用：

```json
{
  "emotion": "anxiety",
  "version": "1.0",
  "intensity_levels": {
    "low": "brief, 1-2 sentences",
    "medium": "standard responses",
    "high": "defusion techniques, longer pauses"
  },
  "tts_parameters": {
    "speed": 0.85,
    "pitch": "medium-low",
    "pause_after_ms": 500,
    "volume_curve": "decrescendo"
  }
}
```

---

## 五、总结与优先任务

| 优先级 | 任务 | 类型 | 负责人 |
|--------|------|------|--------|
| P0 | 修正 excitement_script.json TTS 参数与话术逻辑矛盾 | 修正 | 心理学家提供依据 + narrative-designer 执行 |
| P1 | 新增 anger_script.json | 新建 | 心理学家起草 + narrative-designer 配置化 |
| P2 | anxiety_script.json 添加 intensity_levels 字段 | 增强 | narrative-designer |
| P3 | 所有脚本增加「高强度」版本 suffix | 增强 | narrative-designer |

---

*本文件为心理学理论依据文档，不直接修改 JSON 源文件。所有 JSON 变更由 narrative-designer 执行。*
