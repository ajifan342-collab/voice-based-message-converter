import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { 
  Mic, 
  Square, 
  Copy, 
  Check, 
  RefreshCw, 
  Code, 
  Mail, 
  MessageSquare, 
  Zap,
  Volume2
} from "lucide-react";
import { cn } from "@/src/lib/utils";

// Initialize AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type ConversionType = "raw" | "formal" | "casual" | "code" | "email";

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [convertedText, setConvertedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversionType, setConversionType] = useState<ConversionType>("formal");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Timer for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "audio/webm",
                    data: base64Data,
                  },
                },
                {
                  text: "Transcribe this audio accurately. Only return the transcription, nothing else.",
                },
              ],
            },
          ],
        });

        const text = response.text || "";
        setTranscript(text);
        await transformText(text, conversionType);
      };
    } catch (err) {
      console.error("Error processing audio:", err);
      setError("Failed to process audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const transformText = async (text: string, type: ConversionType) => {
    if (!text) return;
    setIsProcessing(true);
    try {
      let prompt = "";
      switch (type) {
        case "formal":
          prompt = "Rewrite this spoken message into a professional and formal tone. Keep it concise but polite.";
          break;
        case "casual":
          prompt = "Rewrite this spoken message into a friendly, casual tone for a quick chat or text message.";
          break;
        case "code":
          prompt = "Convert this spoken message into a clean, professional code comment (e.g., JSDoc or standard comment style).";
          break;
        case "email":
          prompt = "Transform this spoken message into a structured professional email with a subject line and body.";
          break;
        case "raw":
          setConvertedText(text);
          return;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${prompt}\n\nInput: "${text}"`,
      });

      setConvertedText(response.text || "");
    } catch (err) {
      console.error("Error transforming text:", err);
      setError("Failed to transform text. Using raw transcript.");
      setConvertedText(text);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(convertedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#151619] rounded-2xl shadow-2xl overflow-hidden border border-white/5">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-white font-medium tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
              Voice Converter
            </h1>
            <p className="text-[#8E9299] text-[10px] uppercase tracking-widest mt-1 font-mono">
              AI-Powered Transcription Engine
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isRecording ? "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-white/20"
            )} />
            <span className="text-[#8E9299] text-[11px] font-mono uppercase tracking-tighter">
              {isRecording ? "Recording" : "Ready"}
            </span>
          </div>
        </div>

        {/* Main Interface */}
        <div className="p-6 space-y-6">
          {/* Recording Area */}
          <div className="relative flex flex-col items-center justify-center py-8 bg-white/5 rounded-xl border border-white/5">
            <div className="absolute top-4 right-4 font-mono text-[11px] text-[#8E9299]">
              {formatTime(recordingTime)}
            </div>
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                isRecording 
                  ? "bg-red-500/10 border-2 border-red-500 text-red-500 scale-110" 
                  : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
              )}
            >
              {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
            </button>
            
            <p className="mt-4 text-[#8E9299] text-xs font-medium">
              {isRecording ? "Tap to stop recording" : "Tap to start recording"}
            </p>

            {isProcessing && (
              <div className="absolute inset-0 bg-[#151619]/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
                <RefreshCw className="w-6 h-6 text-orange-500 animate-spin mb-2" />
                <span className="text-white text-[11px] font-mono uppercase tracking-widest">Processing</span>
              </div>
            )}
          </div>

          {/* Conversion Options */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: "raw", icon: Volume2, label: "Raw" },
              { id: "formal", icon: Mail, label: "Formal" },
              { id: "casual", icon: MessageSquare, label: "Casual" },
              { id: "code", icon: Code, label: "Code" },
              { id: "email", icon: Mail, label: "Email" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setConversionType(opt.id as ConversionType);
                  if (transcript) transformText(transcript, opt.id as ConversionType);
                }}
                className={cn(
                  "flex flex-col items-center gap-2 p-2 rounded-lg border transition-all",
                  conversionType === opt.id 
                    ? "bg-orange-500/10 border-orange-500/50 text-orange-500" 
                    : "bg-white/5 border-white/5 text-[#8E9299] hover:bg-white/10"
                )}
              >
                <opt.icon className="w-4 h-4" />
                <span className="text-[9px] uppercase font-bold tracking-tighter">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Output Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[#8E9299] text-[10px] uppercase font-mono tracking-widest">Output</label>
              {convertedText && (
                <button 
                  onClick={copyToClipboard}
                  className="text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            <div className="min-h-[120px] p-4 bg-white/5 rounded-xl border border-white/5 text-white text-sm leading-relaxed font-light">
              {convertedText || (
                <span className="text-[#8E9299] italic">
                  {transcript ? "Transforming..." : "Your converted message will appear here..."}
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] font-mono">
              ERROR: {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[#8E9299] text-[8px] uppercase font-bold tracking-widest">Engine</span>
              <span className="text-white text-[10px] font-mono">GEMINI-3.0-FLASH</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#8E9299] text-[8px] uppercase font-bold tracking-widest">Status</span>
              <span className="text-green-500 text-[10px] font-mono">ONLINE</span>
            </div>
          </div>
          <div className="text-[#8E9299] text-[8px] font-mono">
            v1.0.4-STABLE
          </div>
        </div>
      </div>
    </div>
  );
}
