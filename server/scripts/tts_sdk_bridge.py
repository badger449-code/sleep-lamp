#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DashScope TTS Python Bridge - Using Official SDK
"""

import os
import sys
import base64
import json
import argparse

# Add user site-packages to path to ensure dashscope is found
import site
site.addsitedir(os.path.expanduser("~/.local/lib/python3.11/site-packages"))

try:
    import dashscope
    from dashscope.audio.tts import speech
except ImportError as e:
    print(f'[ERROR] Failed to import dashscope: {str(e)}', file=sys.stderr)
    sys.exit(1)

def synthesize_audio(text, voice, api_key):
    """
    使用 DashScope SDK 进行 TTS 合成
    """
    try:
        # Set the API key
        dashscope.api_key = api_key
        
        # Call the TTS API
        response = speech(
            model='sambert-zhichu-v1',  # Using a known TTS model
            text=text,
            voice=voice,
            output_format='wav',
            sample_rate=24000
        )
        
        if response.get('code') != 'Success':
            print(f'[ERROR] TTS API failed: {response.get("message", "Unknown error")}', file=sys.stderr)
            return False
            
        # Get the audio content
        audio_data = response['output']['audio']
        
        # Decode base64 audio data
        wav_bytes = base64.b64decode(audio_data)
        
        # Output to stdout
        sys.stdout.buffer.write(wav_bytes)
        sys.stdout.buffer.flush()
        
        return True
    except Exception as e:
        print(f'[ERROR] {str(e)}', file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description='DashScope TTS Bridge')
    parser.add_argument('--text', '-t', required=True, help='Text to synthesize')
    parser.add_argument('--voice', '-v', default='zhichu', help='Voice name')
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