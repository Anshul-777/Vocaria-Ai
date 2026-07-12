import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Reveal } from '@/hooks/motionVariants';
import { Wrench, Upload, FileAudio, Scissors, Headphones, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TOOLS = [
  {
    id: 'vocal-remover',
    title: 'Vocal Remover',
    description: 'Isolate or remove vocals from any music track using AI.',
    icon: Scissors,
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  {
    id: 'noise-reduction',
    title: 'Noise Reduction',
    description: 'Clean up background noise, hums, and hiss from your voice recordings.',
    icon: Headphones,
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  {
    id: 'format-converter',
    title: 'Audio Converter',
    description: 'Convert audio files between MP3, WAV, FLAC, OGG, and more.',
    icon: FileAudio,
    color: 'from-purple-500 to-indigo-500',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
  },
];

export default function VoiceTools() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = () => {
    if (!file) {
      toast.error('Please upload a file first.');
      return;
    }
    
    setIsProcessing(true);
    // Simulate processing for now as backend endpoints are not defined yet
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(`${TOOLS.find(t => t.id === activeTool)?.title} applied successfully!`);
      setFile(null);
    }, 2500);
  };

  return (
    <div className="w-full pb-12 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Wrench className="w-6 h-6 text-gray-800" />
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500 animate-text-pan" style={{ fontFamily: "'Playfair Display', serif" }}>
                Voice Tools
              </h1>
            </div>
            <p className="text-gray-500 font-medium mt-1.5 text-sm">
              A suite of AI-powered utilities for processing and enhancing audio.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Tools Grid */}
      {!activeTool ? (
        <Reveal delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div 
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col items-start gap-4"
                >
                  <div className={`w-12 h-12 rounded-xl ${tool.bg} ${tool.text} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{tool.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                  <div className="mt-auto pt-4">
                    <span className="text-sm font-semibold text-gray-400 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                      Open Tool &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      ) : (
        /* Active Tool Interface */
        <Reveal className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {(() => {
            const tool = TOOLS.find(t => t.id === activeTool);
            if (!tool) return null;
            const Icon = tool.icon;
            return (
              <div className="flex flex-col">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { setActiveTool(null); setFile(null); }}
                      className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mr-2"
                    >
                      &larr; Back
                    </button>
                    <div className={`w-8 h-8 rounded-lg ${tool.bg} ${tool.text} flex items-center justify-center`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{tool.title}</h2>
                      <p className="text-xs text-gray-500">{tool.description}</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 max-w-2xl mx-auto w-full text-center space-y-6">
                  {/* File Uploader */}
                  <div className="space-y-2">
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed ${file ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'} rounded-2xl p-10 cursor-pointer transition-colors`}>
                      {file ? (
                        <>
                          <FileAudio className="w-10 h-10 text-indigo-500 mb-3" />
                          <span className="text-indigo-600 font-bold text-base">{file.name}</span>
                          <span className="text-indigo-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-gray-400 mb-3" />
                          <span className="text-gray-700 font-bold text-base">Click or drag an audio file</span>
                          <span className="text-gray-400 text-sm mt-1">MP3, WAV, FLAC (Max 50MB)</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="audio/*,video/*" onChange={handleFileUpload} disabled={isProcessing} />
                    </label>
                  </div>

                  {/* Process Button */}
                  <button 
                    onClick={handleProcess}
                    disabled={isProcessing || !file}
                    className={`w-full py-3.5 bg-gradient-to-r ${tool.color} hover:opacity-90 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Processing Audio...</>
                    ) : (
                      <><Icon size={18} /> Apply {tool.title}</>
                    )}
                  </button>

                  {!isProcessing && !file && (
                    <p className="text-xs text-gray-400 mt-4">
                      Note: Tools are currently in beta and processes are simulated on the frontend until backend integration is finalized.
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </Reveal>
      )}
    </div>
  );
}
