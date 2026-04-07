/**
 * Call DashScope's qwen3-asr-flash API to transcribe audio
 * @param {string} audioBase64 - The base64 encoded audio data (e.g., from a webm/ogg file)
 * @returns {Promise<string>} - The transcribed text
 */
export async function transcribeAudio(audioBase64) {
  // Try to get DASHSCOPE_API_KEY first, fallback to TTS_API_KEY since they usually share the same Bailian key
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.TTS_API_KEY;
  if (!apiKey) {
    throw new Error('DASHSCOPE_API_KEY or TTS_API_KEY is not set in environment variables');
  }

  // DashScope MultiModal API endpoint for Qwen models
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

  try {
    // Ensure the base64 string has the proper data URI prefix if not already present
    // The frontend should send standard base64 without prefix to save bandwidth, 
    // we'll format it as a webm audio data URI which is standard for MediaRecorder
    const formattedAudio = audioBase64.startsWith('data:') 
      ? audioBase64 
      : `data:audio/webm;base64,${audioBase64}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable' // We use synchronous mode for a single short audio clip
      },
      body: JSON.stringify({
        model: 'qwen3-asr-flash',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  audio: formattedAudio
                }
              ]
            }
          ]
        },
        parameters: {
          result_format: 'message',
          asr_options: {
            enable_itn: false // Match the Python example
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('ASR API Error:', errorData);
      throw new Error(`ASR API failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Extract text from the DashScope MultiModal response structure
    if (data.output && data.output.choices && data.output.choices[0] && data.output.choices[0].message) {
      const contentArray = data.output.choices[0].message.content;
      if (Array.isArray(contentArray) && contentArray.length > 0) {
        return contentArray[0].text || '';
      }
    }
    
    return '';
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw error;
  }
}
