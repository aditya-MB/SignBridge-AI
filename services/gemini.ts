
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

export const getGeminiInstance = () => {
  return new GoogleGenAI({ apiKey: API_KEY });
};

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

export const translateSignToText = async (base64Image: string): Promise<string> => {
  const ai = getGeminiInstance();
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

export const generateSpeechFromText = async (text: string) => {
  const ai = getGeminiInstance();
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

export const decodeAudioData = async (
  base64: string,
  ctx: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

export const encodeAudio = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};
