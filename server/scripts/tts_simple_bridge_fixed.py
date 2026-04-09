#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DashScope TTS Python Bridge - Fixed Version
Using the correct MultiModalConversation API
"""

import os
import sys
import base64
import json
import argparse
import subprocess

def synthesize_audio(text, voice, api_key):
    """
    使用 curl 命令调用 DashScope MultiModalConversation TTS API
    """
    import tempfile
    
    # 创建临时文件来存储音频
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
        temp_filename = temp_file.name
    
    try:
        # 使用 curl 命令调用 DashScope MultiModalConversation API
        import urllib.parse
        payload = {
            "model": "text-to-speech",
            "input": {"text": text},
            "parameters": {
                "voice": voice,
                "audio_format": "wav",
                "sample_rate": 24000
            }
        }
        
        # Execute the API call using curl
        cmd = [
            'curl', '-X', 'POST',
            '-H', f'Authorization: Bearer {api_key}',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps(payload),
            '-o', temp_filename,
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-to-speech'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f'[ERROR] API call failed: {result.stderr}', file=sys.stderr)
            return False
            
        # Check if the response is an error message
        with open(temp_filename, 'r', encoding='utf-8', errors='ignore') as f:
            response_content = f.read(1000)  # Read first 1000 chars to check for errors
            
        if '"code"' in response_content and '"message"' in response_content:
            # This appears to be an error response, not audio
            print(f'[ERROR] API returned error: {response_content}', file=sys.stderr)
            return False
            
        # Read the audio file and output to stdout
        with open(temp_filename, 'rb') as f:
            audio_data = f.read()
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