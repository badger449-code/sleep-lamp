#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple DashScope TTS Python Bridge
用于从 Node.js 调用 Python TTS SDK
"""

import os
import sys
import base64
import json
import argparse
import subprocess

def synthesize_audio(text, voice, api_key):
    """
    使用 curl 命令直接调用 DashScope API
    这是一种绕过复杂 Python 包依赖的简单方法
    """
    import tempfile
    
    # 创建临时文件来存储音频
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
        temp_filename = temp_file.name
    
    try:
        # 使用 curl 命令调用 DashScope API
        import shlex
        cmd_str = f"curl -X POST -H 'Authorization: Bearer {api_key}' -H 'Content-Type: application/json' -d '{json.dumps({'model': 'text2audio-v2', 'input': {'text': text}, 'parameters': {'voice': voice, 'output_format': 'wav', 'sample_rate': 24000}})}' 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/text-to-audio' --output '{temp_filename}' 2>&1"
        
        result = os.system(cmd_str)
        
        if result != 0:
            print(f'[ERROR] API call failed with code: {result}', file=sys.stderr)
            return False
            
        # 读取音频文件并输出到 stdout
        with open(temp_filename, 'rb') as f:
            audio_data = f.read()
            sys.stdout.buffer.write(audio_data)
            sys.stdout.buffer.flush()
            
        return True
    except Exception as e:
        print(f'[ERROR] {str(e)}', file=sys.stderr)
        return False
    finally:
        # 清理临时文件
        try:
            os.unlink(temp_filename)
        except:
            pass


def main():
    parser = argparse.ArgumentParser(description='Simple DashScope TTS Bridge')
    parser.add_argument('--text', '-t', required=True, help='Text to synthesize')
    parser.add_argument('--voice', '-v', default='Alloy', help='Voice name')
    parser.add_argument('--api-key', '-k', required=True, help='API Key')
    parser.add_argument('--stdout', action='store_true', help='Output binary to stdout directly')

    args = parser.parse_args()

    if args.stdout:
        success = synthesize_audio(args.text, args.voice, args.api_key)
        sys.exit(0 if success else 1)
    else:
        print('[ERROR] This simplified bridge only supports stdout output', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()