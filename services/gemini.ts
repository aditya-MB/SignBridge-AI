
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

/**
 * Cleans the model output by removing markdown code blocks, 
 * JSON artifacts, and excessive whitespace.
 */
const cleanModelOutput = (text: string): string => {
  if (!text) return "";
  
  let cleaned = text.trim();
  
  // Remove markdown code blocks (e.g., ```json ... ```)
  cleaned = cleaned.replace(/```(?:json|text|)?([\s\S]*?)```/gi, '$1');
  
  // Remove common empty JSON-like patterns that the model sometimes spits out
  cleaned = cleaned.replace(/\{[\s\S]*?\}/g, '');
  
  // Strip any remaining special formatting and trim again
  cleaned = cleaned.replace(/[\n\r\t]/g, ' ').trim();
  
  return cleaned;
};

// Fix: Always use the required initialization pattern inside each service call
export const translateSignToText = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: "Identify the sign language gesture in this image. Output ONLY the word or short phrase. DO NOT use markdown, DO NOT use JSON, and DO NOT add explanations. If no clear sign is seen, return exactly: NO_SIGN.",
          },
        ],
      },
    });
    
    // Fix: Access response text as a property, not a method
    const rawText = response.text || "";
    const cleaned = cleanModelOutput(rawText);
    
    // Filter out our custom sentinel or any tiny/garbage artifacts
    if (cleaned === "NO_SIGN" || cleaned.length < 1 || cleaned === "{}") {
      return "";
    }
    
    return cleaned;
  } catch (error) {
    console.error("Error translating sign:", error);
    return "";
  }
};

// Fix: Always use the required initialization pattern inside each service call
export const generateSpeechFromText = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
};

/**
 * Standard manual decode function as per Gemini API guidelines.
 */
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Standard audio decoding helper for raw PCM data as per Gemini API guidelines.
 */
export const decodeAudioData = async (
  base64: string,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  const data = decode(base64);
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

/**
 * Standard manual encode function as per Gemini API guidelines.
 */
export const encodeAudio = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};
