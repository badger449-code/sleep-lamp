# CHANGELOG

## [Unreleased] - 2026-03-25

### Added
- **自然语言 TTS 参数解析**：在 prompt 层新增意图识别（基于 LLM），支持从用户设定的提示词中自动提取“性别、声线、情感、语速、角色”等参数，并映射为枚举值。
- **TTS 熔断与重试机制**：新增 HTTP 调用的指数退避重试（3次），以及熔断保护（连续失败10次暂停60秒）。
- **音频格式验证**：增加了 WAV 格式头解析，自动校验返回音频的采样率和时长。
- **测试与验证体系**：
  - 新增 `tests/tts.test.js` 单元测试文件，覆盖数值边界校验及参数传递。
  - 新增 `scripts/verifyApi.js` 一键验证 API Key、余额及模型状态。
  - 新增 `scripts/loadTest.js` 模拟高并发及 QPS 性能测试脚本。

### Changed
- **TTS 引擎整体迁移**：全面下线旧版的 Edge/Azure TTS 引擎，迁移至阿里云百炼大模型服务平台的 `qwen3-tts-vd-2026-01-26` 模型。
- **API 交互方式**：由 SDK 更改为标准的 RESTful API 调用（JSON 格式，Authorization: Bearer 鉴权）。
- **环境变量**：新增 `TTS_API_KEY`、`TTS_MODEL`、`TTS_DEFAULT_VOICE` 配置项。

### Removed
- 移除了 `msedge-tts` 及相关的依赖包和实现代码。

### 回滚方案 (Rollback Plan)
若新模型上线后出现严重的不稳定或 API 额度耗尽等问题，可通过以下步骤回滚：
1. **代码回滚**：检出上一个 Git Commit（包含 `msedge-tts` 实现的版本）。
2. **依赖恢复**：执行 `npm install msedge-tts`。
3. **前端兼容**：暂时移除提示词中关于具体情感和音色的复杂指令，因为旧版 TTS 仅支持简单的 `voice` 枚举字符串。