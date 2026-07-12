import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, Sparkles, RefreshCw, Volume2, FileText, Wand2, Headphones,
  Split, Music, Mic, Activity, BarChart2, ArrowDownCircle,
  MoveHorizontal, Filter, ChevronLeft, ChevronRight, Upload, FileAudio,
  Loader2, PlaySquare, Download, Clock, ExternalLink, Link2,
  Zap, Copy, Search, Trash2, CheckCircle2, XCircle, ArrowRight, FlaskConical,
  HelpCircle, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '@/api/client';

// ── Tool Registry ────────────────────────────────────────────────────────────

interface ToolDef {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  type?: 'file' | 'url_or_file' | 'redirect' | 'record';
  endpoint?: string;
  redirectTo?: string;
  extraFields?: ExtraField[];
}

interface ExtraField {
  name: string;
  label: string;
  type: 'select' | 'range' | 'number';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  default: string | number;
}

// ── File type auto-detection for converter ──────────────────────────────────
function detectAudioFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = { mp3: 'mp3', wav: 'wav', flac: 'flac', ogg: 'ogg', aac: 'aac', m4a: 'aac', wma: 'wav', webm: 'ogg', opus: 'ogg' };
  return map[ext] || 'unknown';
}

function suggestConversionTargets(currentFormat: string): string[] {
  const all = ['mp3', 'wav', 'flac', 'ogg', 'aac'];
  return all.filter(f => f !== currentFormat);
}

const AUDIO_TOOLS: ToolDef[] = [
  {
    id: 'vocal-remover', name: 'Vocal Remover',
    description: 'Isolate or remove vocals from any music track using AI.',
    icon: Scissors, type: 'file', endpoint: '/vocal-remover',
    extraFields: [{
      name: 'mode', label: 'Output', type: 'select',
      options: [{ value: 'vocals', label: 'Isolated Vocals' }, { value: 'accompaniment', label: 'Instrumental Only' }],
      default: 'vocals',
    }],
  },
  {
    id: 'audio-enhancer', name: 'Audio Enhancer',
    description: 'Clean up background noise and enhance speech clarity.',
    icon: Sparkles, type: 'file', endpoint: '/audio-enhancer',
    extraFields: [{
      name: 'strength', label: 'Enhancement Strength', type: 'range', min: 0.2, max: 2.0, step: 0.1, default: 1.2,
    }],
  },
  {
    id: 'audio-converter', name: 'Audio Converter',
    description: 'Convert audio files between MP3, WAV, FLAC, and more.',
    icon: RefreshCw, type: 'file', endpoint: '/audio-converter',
    extraFields: [
      {
        name: 'target_format', label: 'Target Format', type: 'select',
        options: [
          { value: 'mp3', label: 'MP3' }, { value: 'wav', label: 'WAV' },
          { value: 'flac', label: 'FLAC' }, { value: 'ogg', label: 'OGG' },
          { value: 'aac', label: 'AAC' },
        ],
        default: 'mp3',
      },
      {
        name: 'bitrate', label: 'Bitrate', type: 'select',
        options: [
          { value: '128k', label: '128 kbps' }, { value: '192k', label: '192 kbps' },
          { value: '256k', label: '256 kbps' }, { value: '320k', label: '320 kbps' },
        ],
        default: '192k',
      },
    ],
  },
  {
    id: 'text-to-speech', name: 'Text to Speech',
    description: 'Convert written text into ultra-realistic speech.',
    icon: Volume2, type: 'redirect', redirectTo: '/generate',
  },
  {
    id: 'speech-to-text', name: 'Speech to Text',
    description: 'Accurately transcribe audio files into text.',
    icon: FileText, type: 'file', endpoint: '/speech-to-text',
  },
  {
    id: 'voice-changer', name: 'Voice Changer',
    description: 'Change voice using existing voices from the hub.',
    icon: Wand2, type: 'redirect', redirectTo: '/generate',
  },
  {
    id: 'echo-remover', name: 'Echo Remover',
    description: 'Remove room reverb and echo from recordings.',
    icon: Headphones, type: 'file', endpoint: '/echo-remover',
  },
  {
    id: 'stem-splitter', name: 'Stem Splitter',
    description: 'Split songs into vocals, drums, bass, and instruments.',
    icon: Split, type: 'file', endpoint: '/stem-splitter',
  },
  {
    id: 'key-bpm-finder', name: 'Key & BPM Finder',
    description: 'Analyze audio to find its musical key and tempo.',
    icon: Music, type: 'file', endpoint: '/key-bpm-finder',
  },
  {
    id: 'voice-recorder', name: 'Voice Recorder',
    description: 'Record high-quality audio directly in your browser.',
    icon: Mic, type: 'record',
  },
  {
    id: 'silence-detection', name: 'Silence Detection',
    description: 'Automatically detect and remove silent parts.',
    icon: Activity, type: 'file', endpoint: '/silence-detection',
    extraFields: [
      { name: 'min_silence_ms', label: 'Min Silence (ms)', type: 'number', min: 100, max: 5000, step: 100, default: 500 },
      { name: 'silence_thresh_db', label: 'Threshold (dB)', type: 'number', min: -60, max: -10, step: 5, default: -40 },
    ],
  },
  {
    id: 'audio-visualizer', name: 'Audio Visualizer',
    description: 'Generate beautiful waveforms from audio.',
    icon: BarChart2, type: 'file', endpoint: '/audio-visualizer',
  },
  {
    id: 'voice-extractor', name: 'Voice Extractor',
    description: 'Extract audio from any URL, video, or recording.',
    icon: Link2, type: 'url_or_file', endpoint: '/extract-audio',
  },
  {
    id: 'audio-ducking', name: 'Audio Ducking',
    description: 'Automatically lower background music during speech.',
    icon: ArrowDownCircle, type: 'file', endpoint: '/audio-ducking',
    extraFields: [
      { name: 'duck_amount_db', label: 'Duck Amount (dB)', type: 'number', min: -30, max: -3, step: 3, default: -12 },
    ],
  },
  {
    id: 'audio-stretch', name: 'AI Audio Stretch',
    description: 'Change duration without altering pitch.',
    icon: MoveHorizontal, type: 'file', endpoint: '/audio-stretch',
    extraFields: [
      { name: 'speed_factor', label: 'Speed Factor', type: 'range', min: 0.25, max: 4.0, step: 0.25, default: 1.5 },
    ],
  },
  {
    id: 'noise-reduction', name: 'Noise Reduction',
    description: 'Advanced AI denoiser for professional cleanup.',
    icon: Filter, type: 'file', endpoint: '/noise-reduction',
    extraFields: [{
      name: 'strength', label: 'Reduction Strength', type: 'range', min: 0.2, max: 2.0, step: 0.1, default: 1.0,
    }],
  },
];

const ITEMS_PER_PAGE = 8;

// ── Recents storage ──────────────────────────────────────────────────────────

interface RecentItem {
  id: string;
  toolName: string;
  toolId: string;
  outputUrl: string;
  filename: string;
  timestamp: number;
  meta?: Record<string, any>;
}

function loadRecents(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem('vocaria_tool_recents') || '[]');
  } catch { return []; }
}

function saveRecent(item: RecentItem) {
  const recents = loadRecents();
  recents.unshift(item);
  localStorage.setItem('vocaria_tool_recents', JSON.stringify(recents.slice(0, 50)));
}

function clearRecents() {
  localStorage.removeItem('vocaria_tool_recents');
}

// ══════════════════════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════════════════════

export default function VoiceTools() {
  const navigate = useNavigate();

  // Grid state
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [showRecents, setShowRecents] = useState(false);

  // Tool workspace state
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Recents
  const [recents, setRecents] = useState<RecentItem[]>(loadRecents());

  const activeTool = AUDIO_TOOLS.find((t) => t.id === activeToolId);

  // ── Reset workspace when tool changes ──
  const openTool = useCallback((tool: ToolDef) => {
    if (tool.type === 'redirect' && tool.redirectTo) {
      navigate(tool.redirectTo);
      return;
    }
    setActiveToolId(tool.id);
    setFile(null);
    setUrlInput('');
    setResult(null);
    setTaskId(null);
    setIsProcessing(false);
    setRecordedBlob(null);
    setShowCompare(false);

    // Initialize extra field defaults
    const defaults: Record<string, any> = {};
    tool.extraFields?.forEach((f) => { defaults[f.name] = f.default; });
    setExtraFieldValues(defaults);
  }, [navigate]);

  // ── Poll for task result ──
  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await api.get(`/tools/status/${taskId}`);

        if (cancelled) return;

        if (data.status === 'completed') {
          setIsProcessing(false);
          setResult(data.result);

          // Save to recents
          const outputUrl = data.result?.output_url || data.result?.stems?.vocals || '';
          const fname = data.result?.filename || 'output';
          if (outputUrl && activeTool) {
            const item: RecentItem = {
              id: crypto.randomUUID(),
              toolName: activeTool.name,
              toolId: activeTool.id,
              outputUrl,
              filename: fname,
              timestamp: Date.now(),
              meta: data.result,
            };
            saveRecent(item);
            setRecents(loadRecents());
          }
          toast.success('Processing complete!');
          setTaskId(null);
        } else if (data.status === 'failed') {
          setIsProcessing(false);
          toast.error(data.result?.error || data.error || 'Processing failed.');
          setTaskId(null);
        } else {
          setProcessingStep(data.meta?.step || 'processing');
          setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelled) setTimeout(poll, 3000);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [taskId, activeTool]);

  // ── Submit handler ──
  const handleProcess = async () => {
    if (!activeTool || !activeTool.endpoint) return;
    setIsProcessing(true);
    setProcessingStep('uploading');
    setResult(null);

    try {
      const formData = new FormData();

      if (activeTool.type === 'url_or_file') {
        if (urlInput.trim()) {
          formData.append('url', urlInput.trim());
        } else if (file) {
          formData.append('file', file);
        } else {
          toast.error('Provide a URL or upload a file.');
          setIsProcessing(false);
          return;
        }
      } else {
        if (!file) {
          toast.error('Please upload an audio file first.');
          setIsProcessing(false);
          return;
        }
        formData.append('file', file);
      }

      // Append extra fields
      for (const [key, val] of Object.entries(extraFieldValues)) {
        formData.append(key, String(val));
      }

      const { data } = await api.post(`/tools${activeTool.endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTaskId(data.task_id);
      setProcessingStep('queued');
    } catch (err: any) {
      setIsProcessing(false);
      const msg = err.response?.data?.detail || err.message || 'Failed to start processing.';
      toast.error(msg);
    }
  };

  // ── Recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 44100, channelCount: 1 } });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setFile(new File([blob], 'recording.webm', { type: 'audio/webm' }));
        stream.getTracks().forEach((t) => t.stop());
        toast.success('Recording saved!');
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      toast('Recording started...', { icon: '🎙️' });
    } catch {
      toast.error('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    // Auto-detect format for audio converter and suggest conversion target
    if (activeTool?.id === 'audio-converter' && f.name) {
      const detected = detectAudioFormat(f.name);
      if (detected !== 'unknown') {
        const suggestions = suggestConversionTargets(detected);
        if (suggestions.length > 0) {
          setExtraFieldValues(prev => ({ ...prev, target_format: suggestions[0] }));
          toast.success(`Detected ${detected.toUpperCase()} — auto-selected ${suggestions[0].toUpperCase()} as target.`, { duration: 3000 });
        }
      }
    }
  };

  const handleClearRecents = () => {
    clearRecents();
    setRecents([]);
    toast.success('Recents cleared.');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="w-full pb-12">

      {/* ── GRID VIEW ── */}
      {!activeTool && !showRecents && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-8 pb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4">
            <div>
              <div className="flex items-center gap-3">
                <Wand2 className="w-6 h-6 text-gray-800" />
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-500 animate-text-pan" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Voice Tools
                </h1>
              </div>
              <p className="text-gray-500 font-medium mt-1.5 text-sm">
                Professional AI-powered audio processing suite
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate('/quality')}
                className="btn btn-secondary flex items-center gap-2"
              >
                <FlaskConical size={14} /> Quality Lab
              </button>
              <button
                onClick={() => setShowRecents(true)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Clock size={14} /> Recent ({recents.length})
              </button>
            </div>
          </div>

          <div className="w-full mt-10">
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
              initial="hidden"
              animate="show"
              className="flex flex-wrap justify-center gap-y-12 gap-x-8 md:gap-x-12 max-w-[1200px] mx-auto"
            >
              {AUDIO_TOOLS.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                    key={feature.id}
                    onClick={() => openTool(feature)}
                    className="relative flex flex-col items-center text-center cursor-pointer group w-36"
                  >
                    <div className="w-20 h-20 mb-4 rounded-[1.25rem] flex items-center justify-center bg-gray-50 border border-gray-100 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:bg-white group-hover:border-indigo-100 transition-all duration-300">
                      <Icon size={32} strokeWidth={1.5} className="text-[#1a2b3c] group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <span className="font-bold text-[15px] text-[#333] group-hover:text-indigo-900 transition-colors">
                      {feature.name}
                    </span>
                    
                    {/* Tooltip content */}
                    <div className="absolute z-50 bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-52 p-3.5 bg-black text-white text-[13px] leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-2xl text-center pointer-events-none">
                      {feature.description}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rotate-45"></div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* ── RECENTS VIEW ── */}
      {showRecents && !activeTool && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowRecents(false)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-2xl font-bold text-[#1a2b3c]">Recent Outputs</h2>
            </div>
            {recents.length > 0 && (
              <button onClick={handleClearRecents} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                <Trash2 size={14} /> Clear All
              </button>
            )}
          </div>

          {recents.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Clock size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-lg">No recent outputs yet.</p>
              <p className="text-sm mt-1">Process some audio and it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recents.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#1a2b3c] text-white flex items-center justify-center flex-shrink-0">
                      {(() => { const t = AUDIO_TOOLS.find((x) => x.id === item.toolId); return t ? <t.icon size={18} /> : <FileAudio size={18} />; })()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1a2b3c] truncate">{item.filename}</p>
                      <p className="text-xs text-gray-400">{item.toolName} · {new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={item.outputUrl} download={item.filename} className="p-2 rounded-lg bg-[#1a2b3c] text-white hover:bg-[#2a4059] transition-colors" title="Download">
                      <Download size={16} />
                    </a>
                    <button onClick={() => navigate('/studio')} className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors text-xs font-medium" title="Edit in Studio">
                      Studio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── TOOL WORKSPACE ── */}
      {activeTool && activeTool.type !== 'redirect' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl rounded-3xl shadow-lg overflow-hidden" style={{ background: 'var(--bg, #fff)', border: '1px solid var(--border-2, #eee)' }}>
          {/* Header */}
          <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border-2, #eee)', background: 'var(--bg-2, #f8f9fa)' }}>
            <button
              onClick={() => { setActiveToolId(null); setResult(null); }}
              className="p-2 -ml-2 rounded-lg transition-colors" style={{ color: 'var(--fg-4, #888)' }}
            >
              <ChevronLeft size={24} />
            </button>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'var(--fg, #1a2b3c)', color: '#fff' }}>
              <activeTool.icon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--fg, #1a2b3c)' }}>{activeTool.name}</h2>
              <p className="text-sm" style={{ color: 'var(--fg-4, #888)' }}>{activeTool.description}</p>
            </div>
          </div>

          <div className="p-8 space-y-6">

            {/* ── Result View ── */}
            {result && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
                    <CheckCircle2 size={24} /> Processing Complete
                  </div>
                  
                  {(result.output_url || result.stems) && (file || urlInput || recordedBlob) && (
                    <button
                      onClick={() => setShowCompare(!showCompare)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        showCompare 
                          ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' 
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      <Split size={16} />
                      {showCompare ? 'Hide Comparison' : 'Compare Original vs New'}
                    </button>
                  )}
                </div>

                {/* ── Comparison View ── */}
                <AnimatePresence>
                  {showCompare && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Original Input</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <audio 
                              controls 
                              className="w-full h-11" 
                              src={file ? URL.createObjectURL(file) : (recordedBlob ? URL.createObjectURL(recordedBlob) : urlInput)} 
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Processed Output</span>
                          </div>
                          <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100 shadow-sm shadow-indigo-50">
                            {result.output_url ? (
                               <audio controls className="w-full h-11" src={result.output_url} />
                            ) : result.stems?.vocals ? (
                               <audio controls className="w-full h-11" src={result.stems.vocals as string} />
                            ) : (
                               <div className="h-11 flex items-center justify-center text-sm text-gray-400">No audio preview</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Info about changes */}
                {result.meta && Object.keys(result.meta).filter(k => k !== 'step').length > 0 && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex gap-4 items-start">
                    <Info className="text-indigo-500 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-indigo-900 mb-2">Processing Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-[13px] text-indigo-800">
                        {Object.entries(result.meta).map(([k, v]) => {
                          if (k === 'step') return null;
                          return (
                            <div key={k} className="flex justify-between border-b border-indigo-100/50 pb-1">
                              <span className="font-semibold capitalize text-indigo-900/70">{k.replace(/_/g, ' ')}</span> 
                              <span className="text-indigo-900">{String(v)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Key/BPM result display */}
                {result.key && result.bpm && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-5 text-center">
                      <p className="text-3xl font-black text-[#1a2b3c]">{result.key}</p>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Musical Key</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-5 text-center">
                      <p className="text-3xl font-black text-[#1a2b3c]">{result.bpm}</p>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">BPM</p>
                    </div>
                  </div>
                )}

                {/* Transcript result */}
                {result.transcript && (
                  <div className="bg-gray-50 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold text-sm text-gray-600">Transcript ({result.language})</p>
                      <button onClick={() => { navigator.clipboard.writeText(result.transcript); toast.success('Copied!'); }} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Copy size={12} /> Copy</button>
                    </div>
                    <p className="text-[#1a2b3c] text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">{result.transcript}</p>
                  </div>
                )}

                {/* Stem splitter results */}
                {result.stems && (
                  <div className="space-y-2">
                    {Object.entries(result.stems).map(([stem, stemUrl]) => (
                      <div key={stem} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="font-medium capitalize text-[#1a2b3c]">{stem}</span>
                        <a href={stemUrl as string} download={`${stem}.wav`} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
                          <Download size={14} /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Silence detection stats */}
                {result.silence_removed_ms !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-600">
                    <p>Removed <strong>{(result.silence_removed_ms / 1000).toFixed(1)}s</strong> of silence</p>
                    <p>Original: {(result.original_duration_ms / 1000).toFixed(1)}s → New: {(result.new_duration_ms / 1000).toFixed(1)}s</p>
                  </div>
                )}

                {/* Waveform image */}
                {result.filename === 'waveform.png' && result.output_url && (
                  <img src={result.output_url} alt="Waveform" className="w-full rounded-xl border border-gray-200" />
                )}

                {/* Generic download + Quick Actions */}
                {result.output_url && (
                  <div className="space-y-4">
                    <a
                      href={result.output_url}
                      download={result.filename}
                      className="w-full py-4 bg-[#1a2b3c] hover:bg-[#2a4059] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-3 transition-colors"
                    >
                      <Download size={20} /> Download {result.filename}
                    </a>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button onClick={() => navigate('/generate')} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors">
                        <Zap size={14} /> Generate
                      </button>
                      <button onClick={() => navigate('/clone')} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition-colors">
                        <Copy size={14} /> Clone
                      </button>
                      <button onClick={() => navigate('/detection')} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold transition-colors">
                        <Search size={14} /> Detect
                      </button>
                      <button onClick={() => navigate('/studio')} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors">
                        <ExternalLink size={14} /> Studio
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setResult(null); setFile(null); setUrlInput(''); }}
                  className="w-full py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                >
                  Process Another File
                </button>
              </div>
            )}

            {/* ── Input View (no result yet) ── */}
            {!result && (
              <>
                {/* URL input for Voice Extractor */}
                {activeTool.type === 'url_or_file' && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700">Paste a URL (YouTube, etc.)</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        className="flex-1 rounded-xl border border-gray-200 p-3 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex-1 h-px bg-gray-200" />
                      OR upload a video/audio file
                      <span className="flex-1 h-px bg-gray-200" />
                    </div>
                  </div>
                )}

                {/* Recording mode */}
                {activeTool.type === 'record' ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <Mic size={40} className={isRecording ? 'text-white' : 'text-gray-700'} />
                    </button>
                    <p className="mt-6 text-gray-600 font-medium">
                      {isRecording ? 'Recording... Click to stop.' : recordedBlob ? 'Recording saved. You can record again or download below.' : 'Click the microphone to start recording'}
                    </p>
                    {recordedBlob && (
                      <a
                        href={URL.createObjectURL(recordedBlob)}
                        download="recording.webm"
                        className="mt-4 flex items-center gap-2 px-6 py-3 bg-[#1a2b3c] text-white font-bold rounded-xl shadow-md hover:bg-[#2a4059] transition-colors"
                      >
                        <Download size={18} /> Download Recording
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    {/* File upload zone */}
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed ${file ? 'border-[#1a2b3c] bg-slate-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'} rounded-2xl p-12 cursor-pointer transition-colors`}>
                      {file ? (
                        <>
                          <FileAudio className="w-12 h-12 text-[#1a2b3c] mb-4" />
                          <span className="text-[#1a2b3c] font-bold text-lg">{file.name}</span>
                          <span className="text-gray-500 text-sm mt-2">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-gray-400 mb-4" />
                          <span className="text-gray-700 font-bold text-lg">Click or drag an audio file</span>
                          <span className="text-gray-400 text-sm mt-2">Supports MP3, WAV, FLAC, video files (Max 50MB)</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="audio/*,video/*" onChange={handleFileUpload} disabled={isProcessing} />
                    </label>

                    {/* Extra fields */}
                    {activeTool.extraFields && activeTool.extraFields.length > 0 && (
                      <div className="space-y-4 pt-2">
                        {activeTool.extraFields.map((field) => (
                          <div key={field.name} className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                              {field.label}
                              {field.type === 'range' && <span className="text-indigo-600 font-mono text-xs">{extraFieldValues[field.name]}</span>}
                            </label>
                            {field.type === 'select' && (
                              <select
                                className="w-full rounded-xl border-gray-200 p-3 focus:ring-indigo-500 focus:border-indigo-500"
                                value={extraFieldValues[field.name] ?? field.default}
                                onChange={(e) => setExtraFieldValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                              >
                                {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            )}
                            {field.type === 'range' && (
                              <input
                                type="range"
                                className="w-full accent-[#1a2b3c]"
                                min={field.min} max={field.max} step={field.step}
                                value={extraFieldValues[field.name] ?? field.default}
                                onChange={(e) => setExtraFieldValues((prev) => ({ ...prev, [field.name]: parseFloat(e.target.value) }))}
                              />
                            )}
                            {field.type === 'number' && (
                              <input
                                type="number"
                                className="w-full rounded-xl border-gray-200 p-3 focus:ring-indigo-500 focus:border-indigo-500"
                                min={field.min} max={field.max} step={field.step}
                                value={extraFieldValues[field.name] ?? field.default}
                                onChange={(e) => setExtraFieldValues((prev) => ({ ...prev, [field.name]: parseFloat(e.target.value) }))}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action button */}
                    <button
                      onClick={handleProcess}
                      disabled={isProcessing || (!file && !(activeTool.type === 'url_or_file' && urlInput.trim()))}
                      className="w-full py-4 bg-[#1a2b3c] hover:bg-[#2a4059] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> {processingStep === 'uploading' ? 'Uploading...' : `Processing (${processingStep})...`}</>
                      ) : (
                        <><PlaySquare size={20} /> Run {activeTool.name}</>
                      )}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
