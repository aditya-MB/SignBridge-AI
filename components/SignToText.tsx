
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { translateSignToText, generateSpeechFromText, decodeAudioData } from '../services/gemini';

const SignToText: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Safely attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream, isCapturing]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      setIsCapturing(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Please allow camera access to use this feature.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const playAudio = async (text: string) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      
      const base64Audio = await generateSpeechFromText(text);
      if (base64Audio && audioCtxRef.current) {
        const buffer = await decodeAudioData(base64Audio, audioCtxRef.current);
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtxRef.current.destination);
        source.start();
      }
    } catch (err) {
      console.error("Audio playback failed:", err);
    }
  };

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !isCapturing) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      
      setIsProcessing(true);
      try {
        const result = await translateSignToText(base64Image);
        
        // Final sanity check for result quality
        if (result && result.trim() && !result.includes('{') && result.length > 0) {
          setTranscription(prev => {
            // Avoid repeating the exact same word if it was just captured
            if (prev.length > 0 && prev[0].toLowerCase() === result.toLowerCase()) {
              return prev;
            }
            // Trigger audio only for new unique results
            playAudio(result);
            return [result, ...prev].slice(0, 10);
          });
        }
      } catch (error) {
        console.error("Translation error:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [isProcessing, isCapturing]);

  useEffect(() => {
    let interval: number;
    if (isCapturing) {
      interval = window.setInterval(captureFrame, 3500); 
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCapturing, captureFrame]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="flex flex-col gap-4">
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video shadow-2xl ring-1 ring-slate-800">
          {!isCapturing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-4 p-6 text-center">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-hand-paper text-3xl text-indigo-400"></i>
              </div>
              <h3 className="text-white font-bold text-xl">Ready to interpret?</h3>
              <p className="text-sm max-w-xs">Position yourself clearly in front of the camera for the best sign recognition.</p>
              <button 
                onClick={startCamera}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center gap-2"
              >
                <i className="fas fa-camera"></i>
                Start Sign Interpretation
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]" 
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-2 border ${isProcessing ? 'bg-amber-500/90 border-amber-400 text-white animate-pulse' : 'bg-green-500/90 border-green-400 text-white'}`}>
                  <span className={`w-2 h-2 rounded-full bg-white ${isProcessing ? 'animate-bounce' : ''}`}></span>
                  {isProcessing ? 'Analyzing...' : 'Watching'}
                </span>
                <button 
                  onClick={stopCamera}
                  className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur transition-all border border-red-400"
                  title="Stop Camera"
                >
                  <i className="fas fa-power-off"></i>
                </button>
              </div>
              {isProcessing && (
                <div className="absolute inset-0 border-4 border-indigo-500/30 pointer-events-none animate-pulse"></div>
              )}
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col">
          <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
            <i className="fas fa-comment-dots text-indigo-600"></i>
            Live Sign History
          </h3>
          <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {transcription.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <i className="fas fa-keyboard text-2xl mb-2 opacity-20"></i>
                <p className="text-sm italic">Recognition history will appear here...</p>
              </div>
            ) : (
              transcription.map((text, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-xl transition-all duration-500 transform translate-y-0 ${i === 0 ? 'bg-indigo-600 text-white shadow-md scale-100 font-semibold' : 'bg-slate-50 text-slate-600 opacity-60 scale-95'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="capitalize">{text}</span>
                    {i === 0 && <i className="fas fa-volume-up text-xs opacity-70"></i>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Instructions</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 font-bold">1</div>
              <div>
                <h4 className="font-bold text-slate-900">Good Lighting</h4>
                <p className="text-sm text-slate-500">Ensure your face and hands are well-lit for accurate tracking.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 font-bold">2</div>
              <div>
                <h4 className="font-bold text-slate-900">Sign Clearly</h4>
                <p className="text-sm text-slate-500">Hold signs for a moment. Interpretation happens every few seconds.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 font-bold">3</div>
              <div>
                <h4 className="font-bold text-slate-900">Listen for Output</h4>
                <p className="text-sm text-slate-500">The translated text will be automatically spoken by the AI voice.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <i className="fas fa-brain"></i>
            </div>
            <h4 className="font-bold">Gemini Engine Status</h4>
          </div>
          <p className="text-slate-400 text-sm mb-4">Filtering out technical noise to provide clean word-for-word transcriptions.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-3 rounded-lg border border-white/10">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1 text-[10px]">Processing</div>
              <div className="text-indigo-400 font-mono text-sm">Strict Text</div>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/10">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1 text-[10px]">Filtering</div>
              <div className="text-indigo-400 font-mono text-sm">Active</div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-600/10 rounded-full blur-2xl group-hover:bg-indigo-600/20 transition-all"></div>
          <h4 className="font-bold text-indigo-900 mb-2">Refined Recognition</h4>
          <p className="text-sm text-indigo-700 leading-relaxed">
            We've improved our noise reduction. If the model generates technical output, it is automatically discarded so only real signs appear.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignToText;
