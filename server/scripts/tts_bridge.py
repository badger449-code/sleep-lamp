#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DashScope TTS Python Bridge
用于从 Node.js 调用 Python TTS SDK
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


def synthesize_to_file(text, voice, language, api_key, output_file):
    """合成语音并保存到文件"""
    try:
        response = MultiModalConversation.call(
            api_key=api_key,
            model='qwen3-tts-flash',
            text=text,
            voice=voice,
            language_type=language,
            stream=False
        )

        if hasattr(response, 'output') and response.output and hasattr(response.output, 'audio'):
            audio = response.output.audio
            
            # Print the entire output for debugging
            # print(f'[DEBUG] Full response output: {response.output}', file=sys.stderr)
            
            if audio:
                # Sometimes audio might be a dict instead of an object with attributes
                if isinstance(audio, dict):
                    audio_url = audio.get('url', None)
                    audio_data_attr = audio.get('data', None)
                else:
                    audio_url = getattr(audio, 'url', None)
                    audio_data_attr = getattr(audio, 'data', None)

                if audio_url:
                    audio_data = download_audio(audio_url)
                    if audio_data:
                        if to_stdout:
                            sys.stdout.buffer.write(audio_data)
                            sys.stdout.buffer.flush()
                            return True
                        elif output_file:
                            with open(output_file, 'wb') as f:
                                f.write(audio_data)
                            print(f'[OK] Audio saved to: {output_file}', file=sys.stderr)
                            return True

                if audio_data_attr:
                    wav_bytes = base64.b64decode(audio_data_attr)
                    if to_stdout:
                        sys.stdout.buffer.write(wav_bytes)
                        sys.stdout.buffer.flush()
                        return True
                    elif output_file:
                        with open(output_file, 'wb') as f:
                            f.write(wav_bytes)
                        print(f'[OK] Audio saved to: {output_file}', file=sys.stderr)
                        return True

        print(f'[ERROR] No audio data in response: {response}', file=sys.stderr)
        return False

    except Exception as e:
        print(f'[ERROR] {str(e)}', file=sys.stderr)
        return False


def synthesize_streaming(text, voice, language, api_key, output_file=None, to_stdout=False):
    """流式合成语音"""
    try:
        response = MultiModalConversation.call(
            api_key=api_key,
            model='qwen3-tts-flash',
            text=text,
            voice=voice,
            language_type=language,
            stream=True
        )

        audio_chunks = []
        for chunk in response:
            if chunk.output is not None:
                audio = chunk.output.audio
                if audio and hasattr(audio, 'data') and audio.data:
                    wav_bytes = base64.b64decode(audio.data)
                    
                    if to_stdout:
                        sys.stdout.buffer.write(wav_bytes)
                        sys.stdout.buffer.flush()
                    else:
                        audio_chunks.append(wav_bytes)

        if to_stdout:
            return True

        if audio_chunks and output_file:
            combined = b''.join(audio_chunks)
            with open(output_file, 'wb') as f:
                f.write(combined)
            print(f'[OK] Streaming audio saved: {len(combined)} bytes', file=sys.stderr)
            return True

        print(f'[ERROR] No streaming audio received', file=sys.stderr)
        return False

    except Exception as e:
        print(f'[ERROR] {str(e)}', file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description='DashScope TTS Bridge')
    parser.add_argument('--text', '-t', required=True, help='Text to synthesize')
    parser.add_argument('--voice', '-v', default='Cherry', help='Voice name')
    parser.add_argument('--language', '-l', default='Chinese', help='Language')
    parser.add_argument('--api-key', '-k', required=True, help='API Key')
    parser.add_argument('--output', '-o', default='output.wav', help='Output file')
    parser.add_argument('--stream', '-s', action='store_true', help='Use streaming')
    parser.add_argument('--stdout', action='store_true', help='Output binary to stdout directly')

    args = parser.parse_args()

    # Make stdout binary if we are outputting to it directly
    if args.stdout and sys.platform == "win32":
        import msvcrt
        import os
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)

    if args.stream or args.stdout:
        success = synthesize_streaming(args.text, args.voice, args.language, args.api_key, args.output, args.stdout)
    else:
        success = synthesize_to_file(args.text, args.voice, args.language, args.api_key, args.output)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()