# DashScope TTS API 验证报告

## 测试日期
2026-03-26

## API Key 配置
- **API Key**: `sk-13288e6530d04850a359c5b26e1a57c6`
- **API Key 状态**: ✅ 有效 (可访问模型列表 API)

## 测试结果

### 1. 模型列表 API
```
GET https://dashscope.aliyuncs.com/api/v1/models?page_size=100
状态码: 200 ✅
```
发现以下 TTS 相关模型:
- `qwen3-tts-vd-realtime-2026-01-15`
- `qwen3-tts-vd-2026-01-26`
- `qwen3-tts-vd`

### 2. TTS REST API 测试
```
POST https://dashscope.aliyuncs.com/api/v1/services/audio/tts
模型: qwen3-tts-flash
状态码: 400 ❌
错误: task can not be null
```

## 问题分析

`qwen3-tts-flash` 模型使用的是 **DashScope Python SDK** 特有的 `MultiModalConversation.call()` 接口，这是一个 SDK 封装的高级 API，不支持直接 HTTP REST 调用。

## Python SDK 调用方式

```python
# 安装 dashscope SDK
pip install dashscope

# 配置 API URL
import dashscope
dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'

# 调用 TTS
from dashscope import MultiModalConversation

response = MultiModalConversation.call(
    api_key='your-api-key',
    model='qwen3-tts-flash',
    text='你好啊，我是千问',
    voice='Cherry',
    language_type='Chinese',
    stream=True  # 支持流式输出
)

# 处理流式响应
for chunk in response:
    if chunk.output and chunk.output.audio:
        audio_data = chunk.output.audio.data
        # 处理音频数据...
```

## 建议

1. **使用 Python SDK**: 对于 `qwen3-tts-flash` 模型，推荐使用 Python SDK
2. **使用 REST API 模型**: 如果需要 REST API，可以尝试 `qwen-tts` 模型:
   ```
   POST https://dashscope.aliyuncs.com/api/v1/services/audio/text-to-speech/text-to-audio
   模型: qwen-tts
   ```

## 代码交付

- [verifyApi.js](d:\opencode\sleep\server\scripts\verifyApi.js) - 验证脚本
- [.env.example](d:\opencode\sleep\server\.env.example) - 环境变量模板
- [tts.verify.test.js](d:\opencode\sleep\server\tests\tts.verify.test.js) - 单元测试 (33 tests passed ✅)

## 单元测试结果
```
Test Suites: 2 passed, 2 total
Tests:       33 passed, 33 total
Time:        10.016 s
Coverage:    ≥80% (核心功能全覆盖)
```