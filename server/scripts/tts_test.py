#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DashScope TTS 验证脚本
使用 qwen3-tts-flash 模型
"""

import os
import sys
import base64
import json
import argparse
import urllib.request
import dashscope
from dashscope import MultiModalConversation

dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'

def download_audio(url):
    """从 URL 下载音频文件"""
    try:
        print(f'[*] 下载音频 from: {url[:80]}...')
        with urllib.request.urlopen(url, timeout=30) as response:
            audio_data = response.read()
        print(f'[✅] 下载成功! 大小: {len(audio_data)} bytes')
        return audio_data
    except Exception as e:
        print(f'[❌] 下载失败: {str(e)}')
        return None


def synthesize(text, voice='Cherry', language='Chinese', api_key=None, stream=False):
    """
    调用 TTS API 合成语音
    """
    if not api_key:
        api_key = os.getenv('DASHSCOPE_API_KEY')
        if not api_key:
            print('[❌] 错误: 未提供 API Key，请设置 DASHSCOPE_API_KEY 环境变量')
            return None

    print(f'[*] 开始 TTS 合成...')
    print(f'    文本: {text[:50]}{"..." if len(text) > 50 else ""}')
    print(f'    声音: {voice}')
    print(f'    语言: {language}')

    try:
        response = MultiModalConversation.call(
            api_key=api_key,
            model='qwen3-tts-flash',
            text=text,
            voice=voice,
            language_type=language,
            stream=stream
        )

        if hasattr(response, 'output') and response.output and hasattr(response.output, 'audio'):
            audio = response.output.audio
            if audio:
                audio_url = getattr(audio, 'url', None)
                audio_data_attr = getattr(audio, 'data', None)

                if audio_url:
                    print(f'[📍] 音频 URL: {audio_url[:80]}...')
                    return download_audio(audio_url)

                if audio_data_attr:
                    wav_bytes = base64.b64decode(audio_data_attr)
                    print(f'[✅] 合成成功! 音频大小: {len(wav_bytes)} bytes')
                    return wav_bytes

        print('[❌] 合成失败: 未获取到音频数据')
        print(f'[DEBUG] Response: {response}')
        return None

    except Exception as e:
        print(f'[❌] 错误: {str(e)}')
        import traceback
        traceback.print_exc()
        return None


def save_audio(audio_data, output_file):
    """保存音频数据到文件"""
    if audio_data and len(audio_data) > 0:
        with open(output_file, 'wb') as f:
            f.write(audio_data)
        print(f'[💾] 已保存到: {output_file}')
        return True
    return False


def main():
    parser = argparse.ArgumentParser(description='DashScope TTS 验证工具')
    parser.add_argument('--text', '-t', type=str, help='要合成的文本')
    parser.add_argument('--voice', '-v', type=str, default='Cherry', help='声音名称 (默认: Cherry)')
    parser.add_argument('--language', '-l', type=str, default='Chinese', help='语言类型 (默认: Chinese)')
    parser.add_argument('--api-key', '-k', type=str, help='API Key')
    parser.add_argument('--output', '-o', type=str, default='output.wav', help='输出文件 (默认: output.wav)')
    parser.add_argument('--stream', '-s', action='store_true', help='使用流式输出')

    args = parser.parse_args()

    if not args.text:
        print('=' * 60)
        print('  DashScope TTS 验证工具')
        print('=' * 60)
        print()
        args.text = input('请输入要合成的文本: ')

    if not args.text:
        print('[❌] 错误: 必须提供要合成的文本')
        sys.exit(1)

    api_key = args.api_key or os.getenv('DASHSCOPE_API_KEY')
    if not api_key:
        print('[❌] 错误: 未提供 API Key')
        print('请通过 --api-key 参数或设置 DASHSCOPE_API_KEY 环境变量')
        sys.exit(1)

    print()
    print('=' * 60)
    print(f'  API Key: {api_key[:8]}...{api_key[-4:]}')
    print(f'  模型: qwen3-tts-flash')
    print(f'  声音: {args.voice}')
    print('=' * 60)
    print()

    audio_data = synthesize(
        text=args.text,
        voice=args.voice,
        language=args.language,
        api_key=api_key,
        stream=args.stream
    )

    if audio_data and len(audio_data) > 0:
        save_audio(audio_data, args.output)
        print()
        print('[✅] TTS 验证成功!')
        sys.exit(0)
    else:
        print()
        print('[❌] TTS 验证失败')
        sys.exit(1)


if __name__ == '__main__':
    main()