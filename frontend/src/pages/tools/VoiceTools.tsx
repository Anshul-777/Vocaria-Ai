import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, Sparkles, RefreshCw, Volume2, FileText, Wand2, Headphones,
  Split, Music, Mic, Activity, BarChart2, ArrowDownCircle,
  MoveHorizontal, Filter, ChevronLeft, ChevronRight, Upload, FileAudio,
  Loader2, PlaySquare, Download, Clock, ExternalLink, Link2,
  Zap, Copy, Search, Trash2, CheckCircle2, XCircle, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

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
  const [currentPage, setCurrentPage] = useState(0);
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

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Recents
  const [recents, setRecents] = useState<RecentItem[]>(loadRecents());

  const totalPages = Math.ceil(AUDIO_TOOLS.length / ITEMS_PER_PAGE);
  const nextPage = () => setCurrentPage((p) => (p + 1) % totalPages);
  const prevPage = () => setCurrentPage((p) => (p - 1 + totalPages) % totalPages);
  const currentFeatures = AUDIO_TOOLS.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
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
        const res = await fetch(`${API_BASE}/api/v1/tools/status/${taskId}`);
        const data = await res.json();

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

      const res = await fetch(`${API_BASE}/api/v1/tools${activeTool.endpoint}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Request failed');
      }

      setTaskId(data.task_id);
      setProcessingStep('queued');
    } catch (err: any) {
      setIsProcessing(false);
      toast.error(err.message || 'Failed to start processing.');
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
    if (e.target.files?.[0]) setFile(e.target.files[0]);
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
    <div className="w-full min-h-[70vh] flex flex-col items-center bg-white py-12 px-4 font-sans">

      {/* ── GRID VIEW ── */}
      {!activeTool && !showRecents && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-5xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold text-[#1a2b3c]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Explore Voice Features
            </h2>
            <button
              onClick={() => setShowRecents(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
            >
              <Clock size={16} /> Recent ({recents.length})
            </button>
          </div>

          <div className="w-full flex items-center justify-between">
            <button onClick={prevPage} className="p-2 text-[#1a2b3c] hover:text-gray-500 transition-colors">
              <ChevronLeft size={48} strokeWidth={1} />
            </button>

            <div className="flex-1 overflow-hidden px-8 min-h-[300px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-y-16 gap-x-8"
                >
                  {currentFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.id}
                        onClick={() => openTool(feature)}
                        className="flex flex-col items-center text-center cursor-pointer group"
                      >
                        <div className="w-16 h-16 mb-4 flex items-center justify-center text-[#1a2b3c] group-hover:scale-110 transition-transform duration-300">
                          <Icon size={40} strokeWidth={1.5} />
                        </div>
                        <span className="text-[#1a2b3c] font-medium text-[15px] group-hover:text-indigo-600 transition-colors">
                          {feature.name}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            <button onClick={nextPage} className="p-2 text-[#1a2b3c] hover:text-gray-500 transition-colors">
              <ChevronRight size={48} strokeWidth={1} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-12">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${currentPage === i ? 'bg-[#1a2b3c]' : 'bg-gray-300'}`}
              />
            ))}
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl bg-white border border-gray-100 rounded-3xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
            <button
              onClick={() => { setActiveToolId(null); setResult(null); }}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="w-12 h-12 rounded-xl bg-[#1a2b3c] text-white flex items-center justify-center shadow-md">
              <activeTool.icon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a2b3c]">{activeTool.name}</h2>
              <p className="text-sm text-gray-500">{activeTool.description}</p>
            </div>
          </div>

          <div className="p-8 space-y-6">

            {/* ── Result View ── */}
            {result && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
                  <CheckCircle2 size={24} /> Processing Complete
                </div>

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
