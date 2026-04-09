#!/usr/bin/env python3.11
# -*- coding: utf-8 -*-
"""
Final Working DashScope TTS Python Bridge
Using the correct API parameters based on successful test
"""

import os
import sys
import base64
import json
import argparse
import urllib.request

# Add user site-packages to path to ensure dashscope is found
import site
site.addsitedir(os.path.expanduser("~/.local/lib/python3.11/site-packages"))

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
        # Using the correct format based on successful test
        response = MultiModalConversation.call(
            api_key=api_key,
            model='qwen3-tts-flash',
            text=text,  # Pass text as a direct parameter
            voice=voice,  # Pass voice as a direct parameter
            language_type='Chinese',  # Use the exact parameter name from working script
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

                if audio_data_attr and audio_data_attr.strip():
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
    parser = argparse.ArgumentParser(description='Final Working DashScope TTS Bridge')
    parser.add_argument('--text', '-t', required=True, help='Text to synthesize')
    parser.add_argument('--voice', '-v', default='Cherry', help='Voice name')
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