#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Working DashScope TTS Python Bridge
Using the same implementation as the verified working script
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
        with urllib.request.urlopen(url, timeout=30) as response:
            audio_data = response.read()
        return audio_data
    except Exception as e:
        print(f'[ERROR] Download failed: {str(e)}', file=sys.stderr)
        return None


def synthesize_audio(text, voice, api_key):
    """
    使用 DashScope API 合成音频
    """
    try:
        response = MultiModalConversation.call(
            api_key=api_key,
            model='qwen3-tts-flash',  # Using the verified working model
            input={'text': text},
            parameters={
                'voice': voice,
                'language': 'Chinese',
                'audio_format': 'wav',
                'sample_rate': 24000
            },
            stream=False
        )

        if hasattr(response, 'output') and response.output and hasattr(response.output, 'audio'):
            audio = response.output.audio
            if audio:
                audio_url = getattr(audio, 'url', None)
                audio_data_attr = getattr(audio, 'data', None)

                if audio_url:
                    audio_data = download_audio(audio_url)
                    if audio_data:
                        sys.stdout.buffer.write(audio_data)
                        sys.stdout.buffer.flush()
                        return True

                if audio_data_attr:
                    wav_bytes = base64.b64decode(audio_data_attr)
                    sys.stdout.buffer.write(wav_bytes)
                    sys.stdout.buffer.flush()
                    return True

        print(f'[ERROR] No audio data in response: {response}', file=sys.stderr)
        return False

    except Exception as e:
        print(f'[ERROR] {str(e)}', file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description='Working DashScope TTS Bridge')
    parser.add_argument('--text', '-t', required=True, help='Text to synthesize')
    parser.add_argument('--voice', '-v', default='Alloy', help='Voice name')
    parser.add_argument('--api-key', '-k', required=True, help='API Key')
    parser.add_argument('--stdout', action='store_true', help='Output binary to stdout directly')

    args = parser.parse_args()

    if args.stdout:
        success = synthesize_audio(args.text, args.voice, args.api_key)
        sys.exit(0 if success else 1)
    else:
        print('[ERROR] This bridge only supports stdout output', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()