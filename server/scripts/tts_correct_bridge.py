#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Correct DashScope TTS Python Bridge
Using the correct API endpoint and model for text-to-speech
"""

import os
import sys
import json
import argparse
import subprocess

def synthesize_audio(text, voice, api_key):
    """
    使用 DashScope 正确的 TTS API 进行音频合成
    """
    import tempfile
    
    # 创建临时文件来存储音频
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
        temp_filename = temp_file.name
    
    try:
        # Using the correct DashScope TTS API endpoint
        # According to DashScope documentation, we should use the correct model name
        cmd = [
            'curl', '-X', 'POST',
            '-H', f'Authorization: Bearer {api_key}',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps({
                "model": "sambert-zhichu-v1",  # Correct TTS model
                "input": {"text": text},
                "parameters": {
                    "voice": voice,
                    "output_format": "wav",
                    "sample_rate": 24000
                }
            }),
            '-o', temp_filename,
            'https://dashscope.aliyuncs.com/api/v1/services/text-to-speech'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Check the response
        with open(temp_filename, 'r', encoding='utf-8', errors='ignore') as f:
            response_content = f.read()
        
        # If the response contains an error, print it and return False
        if '"code"' in response_content and '"message"' in response_content:
            print(f'[ERROR] API returned error: {response_content}', file=sys.stderr)
            return False
        
        # Read the audio file and output to stdout
        with open(temp_filename, 'rb') as f:
            audio_data = f.read()
            if len(audio_data) == 0:
                print('[ERROR] No audio data received', file=sys.stderr)
                return False
            sys.stdout.buffer.write(audio_data)
            sys.stdout.buffer.flush()
            
        return True
    except Exception as e:
        print(f'[ERROR] {str(e)}', file=sys.stderr)
        return False
    finally:
        # Clean up temporary file
        try:
            os.unlink(temp_filename)
        except:
            pass

def main():
    parser = argparse.ArgumentParser(description='DashScope TTS Bridge')
    parser.add_argument('--text', '-t', required=True, help='Text to synthesize')
    parser.add_argument('--voice', '-v', default='chinese-female-shuangqing', help='Voice name')
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