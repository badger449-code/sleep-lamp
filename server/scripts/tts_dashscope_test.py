#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script to verify correct DashScope TTS API usage
"""

import os
import sys
import json
import argparse
import subprocess
import tempfile

def test_synthesize_audio(text, voice, api_key):
    """
    Test using the correct DashScope TTS API
    """
    # Create a temporary file for audio output
    temp_fd, temp_path = tempfile.mkstemp(suffix='.wav')
    os.close(temp_fd)  # Close the file descriptor as we'll use the path
    
    try:
        # Use the correct API endpoint and model for DashScope TTS
        # Based on documentation, using the correct format
        import requests
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        # Correct payload for DashScope TTS API
        payload = {
            "model": "text2audio",  # Standard model name for TTS
            "input": text,
            "parameters": {
                "voice": voice,
                "audio_format": "wav",
                "sample_rate": 24000
            }
        }
        
        response = requests.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-to-speech',
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            print(f'[ERROR] API call failed with status {response.status_code}: {response.text}', file=sys.stderr)
            return False
        
        # Check if response is JSON (error) or binary (audio)
        try:
            response_json = response.json()
            if 'code' in response_json and response_json['code'] != 'Success':
                print(f'[ERROR] API returned error: {response_json}', file=sys.stderr)
                return False
        except ValueError:
            # If it's not JSON, it should be audio data
            audio_data = response.content
            if len(audio_data) == 0:
                print('[ERROR] No audio data received', file=sys.stderr)
                return False
                
            # Output audio data to stdout
            sys.stdout.buffer.write(audio_data)
            sys.stdout.buffer.flush()
            return True
        
        return True
        
    except Exception as e:
        print(f'[ERROR] {str(e)}', file=sys.stderr)
        return False
    finally:
        # Clean up temporary file
        try:
            os.unlink(temp_path)
        except:
            pass

def main():
    parser = argparse.ArgumentParser(description='DashScope TTS Test Bridge')
    parser.add_argument('--text', '-t', required=True, help='Text to synthesize')
    parser.add_argument('--voice', '-v', default='Alloy', help='Voice name')
    parser.add_argument('--api-key', '-k', required=True, help='API Key')
    parser.add_argument('--stdout', action='store_true', help='Output binary to stdout directly')

    args = parser.parse_args()

    if args.stdout:
        success = test_synthesize_audio(args.text, args.voice, args.api_key)
        sys.exit(0 if success else 1)
    else:
        print('[ERROR] This bridge only supports stdout output', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()