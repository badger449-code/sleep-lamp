#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DashScope TTS Python Bridge - Using Official API
"""

import os
import sys
import json
import argparse
import subprocess
import tempfile
import base64

def synthesize_audio(text, voice, api_key):
    """
    使用 DashScope API 进行音频合成
    """
    # 创建临时文件存储音频
    temp_fd, temp_path = tempfile.mkstemp(suffix='.wav')
    
    try:
        # 使用 curl 调用 DashScope TTS API
        # Using the correct API endpoint for DashScope TTS
        curl_cmd = [
            'curl', 
            '-X', 'POST',
            '-H', f'Authorization: Bearer {api_key}',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps({
                "model": "speech-tts",  # Using the correct model name
                "input": {"text": text},
                "parameters": {
                    "voice": voice,
                    "output_format": "wav",
                    "sample_rate": 24000
                }
            }),
            '-o', temp_path,
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-to-speech/synthesis'
        ]
        
        result = subprocess.run(curl_cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f'[ERROR] API call failed: {result.stderr}', file=sys.stderr)
            return False
        
        # Read the response file to check for errors
        with open(temp_path, 'r', encoding='utf-8', errors='ignore') as f:
            response_text = f.read()
        
        # Check if the response contains an error
        if '"code"' in response_text and '"message"' in response_text:
            # This is an error response, not audio data
            print(f'[ERROR] API returned error: {response_text}', file=sys.stderr)
            return False
        
        # If we got here, read the audio data and output to stdout
        with open(temp_path, 'rb') as f:
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
            os.close(temp_fd)
            os.unlink(temp_path)
        except:
            pass

def main():
    parser = argparse.ArgumentParser(description='DashScope TTS Bridge')
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