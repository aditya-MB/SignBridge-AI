
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import Avatar from './Avatar';
import { encodeAudio } from '../services/gemini';

const SpeechToSign: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wordQueueRef = useRef<string[]>([]);
  const animationIntervalRef = useRef<number | null>(null);

  // Process word queue to make signs distinct
  useEffect(() => {
    if (isListening) {
      animationIntervalRef.current = window.setInterval(() => {
        if (wordQueueRef.current.length > 0) {
          const nextWord = wordQueueRef.current.shift();
          if (nextWord) setCurrentWord(nextWord);
        } else {
          setCurrentWord('');
        }
      }, 800); // 800ms per sign for legibility
    } else {
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
      setCurrentWord('');
      wordQueueRef.current = [];
    }
    return () => {
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    };
  }, [isListening]);

  const extractKeywords = (text: string) => {
    const commonWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'it'];
    const words = text.split(/\s+/);
    const filtered = words.filter(w => w.length > 3 && !commonWords.includes(w.toLowerCase()));
    setKeywords(prev => Array.from(new Set([...prev, ...filtered.slice(-8)])));
    
    // Add new words to the animation queue
    words.forEach(word => {
      if (word.trim()) wordQueueRef.current.push(word.trim());
    });
  };

  const startListening = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: "You are a sign language interpreter for the deaf and hard of hearing. Your primary goal is to provide real-time transcription. Be concise and prioritize educational or key terminology."
        },
        callbacks: {
          onopen: () => {
            setIsListening(true);
            const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              const pcmBlob = {
                data: encodeAudio(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                setTranscription(prev => (prev + ' ' + text).trim());
                extractKeywords(text);
              }
            }
          },
          onerror: (e) => console.error("Live API Error:", e),
          onclose: () => setIsListening(false),
        }
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone access.");
    }
  };

  const stopListening = async () => {
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsListening(false);
    setCurrentWord('');
    wordQueueRef.current = [];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="aspect-[4/5] relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
          <Avatar isSpeaking={isListening} currentWord={currentWord} />
          
          <div className="absolute top-4 left-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase backdrop-blur-md border shadow-lg ${isListening ? 'bg-red-500/90 border-red-400 text-white animate-pulse' : 'bg-white/90 border-slate-200 text-slate-600'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-white' : 'bg-slate-300'}`}></span>
              {isListening ? 'Interpreter Active' : 'Interpreter Idle'}
            </div>
          </div>

          {isListening && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 flex justify-center">
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full bg-indigo-400 transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, (wordQueueRef.current.length / 10) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${isListening ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-300'}`}></div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none mb-1">
                {isListening ? 'Capturing Audio' : 'Microphone Ready'}
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                {isListening ? 'Processing speech to sign...' : 'Click start to begin translation'}
              </p>
            </div>
          </div>
          <button
            onClick={isListening ? stopListening : startListening}
            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-3 active:scale-95 ${
              isListening 
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
            }`}
          >
            <i className={`fas ${isListening ? 'fa-stop-circle' : 'fa-play-circle'} text-lg`}></i>
            {isListening ? 'Stop' : 'Start Interpreter'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
          
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="text-slate-900 font-bold flex items-center gap-2">
              <i className="fas fa-quote-left text-indigo-500 opacity-50"></i>
              Live Captions
            </h3>
            <button 
              onClick={() => setTranscription('')} 
              className="text-slate-400 hover:text-indigo-600 transition-colors text-xs font-bold uppercase"
            >
              Clear Log
            </button>
          </div>
          <div className="flex-1 bg-slate-50/50 rounded-xl p-5 overflow-y-auto max-h-[300px] text-slate-700 leading-relaxed font-medium custom-scrollbar border border-slate-100">
            {transcription ? (
              <span className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {transcription}
                <span className="w-1.5 h-4 bg-indigo-400 inline-block ml-1 animate-pulse rounded-full"></span>
              </span>
            ) : (
              <p className="text-slate-400 italic text-sm text-center py-10">Speech will be transcribed here and interpreted by the avatar above.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white relative border border-slate-800">
          <div className="absolute top-4 right-4 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
          </div>
          <h4 className="text-indigo-300 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <i className="fas fa-tags"></i>
            Contextual Keywords
          </h4>
          <div className="flex flex-wrap gap-2.5">
            {keywords.length > 0 ? keywords.map((k, i) => (
              <span key={i} className="px-3.5 py-1.5 bg-indigo-500/10 rounded-lg text-sm border border-indigo-500/20 hover:bg-indigo-500/20 transition-all cursor-default text-indigo-100 font-medium">
                {k}
              </span>
            )) : (
              <p className="text-slate-500 text-xs italic">Awaiting key terminology...</p>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4 items-start shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
            <i className="fas fa-hands-helping text-xl"></i>
          </div>
          <div>
            <h5 className="font-bold text-amber-900 text-sm mb-1">Lexical Sign-Delay</h5>
            <p className="text-xs text-amber-700 leading-snug">
              To ensure legibility, the avatar interprets words at a rhythmic pace. The progress bar shows the queue of words currently being processed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechToSign;
