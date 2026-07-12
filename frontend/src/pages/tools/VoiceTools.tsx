import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Sparkles, RefreshCw, Volume2, FileText, Wand2, Headphones, 
  Split, Music, Mic, Activity, BarChart2, ListMusic, ArrowDownCircle, 
  MoveHorizontal, Filter, ChevronLeft, ChevronRight, Upload, FileAudio, Loader2, PlaySquare
} from 'lucide-react';
import toast from 'react-hot-toast';

const AUDIO_TOOLS = [
  { id: 'vocal-remover', name: 'Vocal Remover', description: 'Isolate or remove vocals from any music track using AI.', icon: Scissors },
  { id: 'audio-enhancer', name: 'Audio Enhancer', description: 'Clean up background noise and enhance speech clarity.', icon: Sparkles },
  { id: 'audio-converter', name: 'Audio Converter', description: 'Convert audio files between MP3, WAV, FLAC, and more.', icon: RefreshCw },
  { id: 'text-to-speech', name: 'Text to Speech', description: 'Convert written text into ultra-realistic speech.', icon: Volume2, type: 'text' },
  { id: 'speech-to-text', name: 'Speech to Text', description: 'Accurately transcribe audio files into text.', icon: FileText },
  { id: 'voice-changer', name: 'Voice Changer', description: 'Modify your voice to sound like different characters.', icon: Wand2 },
  { id: 'echo-remover', name: 'Echo Remover', description: 'Remove room reverb and echo from recordings.', icon: Headphones },
  { id: 'stem-splitter', name: 'Stem Splitter', description: 'Split songs into vocals, drums, bass, and instruments.', icon: Split },
  { id: 'key-bpm-finder', name: 'Key & BPM Finder', description: 'Analyze audio to find its musical key and tempo.', icon: Music },
  { id: 'voice-recorder', name: 'Voice Recorder', description: 'Record high-quality audio directly in your browser.', icon: Mic, type: 'record' },
  { id: 'silence-detection', name: 'Silence Detection', description: 'Automatically detect and remove silent parts.', icon: Activity },
  { id: 'audio-visualizer', name: 'Audio Visualizer', description: 'Generate beautiful waveforms from audio.', icon: BarChart2 },
  { id: 'music-generator', name: 'AI Music Generator', description: 'Generate royalty-free music from text prompts.', icon: ListMusic, type: 'text' },
  { id: 'audio-ducking', name: 'Audio Ducking', description: 'Automatically lower background music during speech.', icon: ArrowDownCircle },
  { id: 'audio-stretch', name: 'AI Audio Stretch', description: 'Change duration without altering pitch.', icon: MoveHorizontal },
  { id: 'noise-reduction', name: 'Noise Reduction', description: 'Advanced AI denoiser for professional cleanup.', icon: Filter },
];

const ITEMS_PER_PAGE = 8;

export default function VoiceTools() {
  const [currentPage, setCurrentPage] = useState(0);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  
  // Tool state
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const totalPages = Math.ceil(AUDIO_TOOLS.length / ITEMS_PER_PAGE);

  const nextPage = () => setCurrentPage((prev) => (prev + 1) % totalPages);
  const prevPage = () => setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);

  const currentFeatures = AUDIO_TOOLS.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = () => {
    const tool = AUDIO_TOOLS.find(t => t.id === activeToolId);
    if (!tool) return;

    if (tool.type === 'text' && !textInput.trim()) {
      toast.error('Please enter some text first.');
      return;
    }
    if (!tool.type && !file) {
      toast.error('Please upload an audio file first.');
      return;
    }
    
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(`${tool.name} processed successfully!`);
      setFile(null);
      setTextInput('');
    }, 2500);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      toast.success('Recording saved successfully!');
    } else {
      setIsRecording(true);
      toast('Recording started...', { icon: '🎙️' });
    }
  };

  const activeTool = AUDIO_TOOLS.find(t => t.id === activeToolId);

  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center bg-white py-12 px-4 font-sans">
      
      {!activeTool ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-5xl flex flex-col items-center"
        >
          <h2 className="text-3xl md:text-[32px] font-bold text-[#1a2b3c] mb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
            Explore Voice Features
          </h2>

          <div className="w-full flex items-center justify-between">
            <button 
              onClick={prevPage}
              className="p-2 text-[#1a2b3c] hover:text-gray-500 transition-colors disabled:opacity-30"
            >
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
                        onClick={() => {
                          setActiveToolId(feature.id);
                          setFile(null);
                          setTextInput('');
                        }}
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

            <button 
              onClick={nextPage}
              className="p-2 text-[#1a2b3c] hover:text-gray-500 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={48} strokeWidth={1} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-16">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  currentPage === i ? 'bg-[#1a2b3c]' : 'bg-gray-300'
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl bg-white border border-gray-100 rounded-3xl shadow-lg overflow-hidden"
        >
          {/* Tool Header */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveToolId(null)}
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
          </div>

          {/* Tool Workspace */}
          <div className="p-8 space-y-6">
            
            {activeTool.type === 'text' ? (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Input Text / Prompt</label>
                <textarea 
                  rows={5}
                  className="w-full rounded-xl border-gray-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none p-4"
                  placeholder="Type your text or prompt here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            ) : activeTool.type === 'record' ? (
              <div className="flex flex-col items-center justify-center py-12">
                <button
                  onClick={toggleRecording}
                  className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Mic size={40} className={isRecording ? 'text-white' : 'text-gray-700'} />
                </button>
                <p className="mt-6 text-gray-600 font-medium">
                  {isRecording ? 'Recording in progress... Click to stop.' : 'Click the microphone to start recording'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
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
                      <span className="text-gray-400 text-sm mt-2">Supports MP3, WAV, FLAC (Max 50MB)</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept="audio/*,video/*" onChange={handleFileUpload} disabled={isProcessing} />
                </label>
              </div>
            )}

            {/* Action Button */}
            {activeTool.type !== 'record' && (
              <button 
                onClick={handleProcess}
                disabled={isProcessing || (!file && !activeTool.type) || (activeTool.type === 'text' && !textInput.trim())}
                className="w-full py-4 bg-[#1a2b3c] hover:bg-[#2a4059] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <><PlaySquare size={20} /> Run {activeTool.name}</>
                )}
              </button>
            )}

          </div>
        </motion.div>
      )}
    </div>
  );
}
