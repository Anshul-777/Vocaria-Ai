import React, { useEffect, useState } from 'react'
import clsx from 'clsx'

interface Props {
  url?: string
  audioData?: ArrayBuffer
  blob?: Blob
  height?: number
  waveColor?: string
  progressColor?: string
  showControls?: boolean
  showDownload?: boolean
  downloadFilename?: string
  onReady?: (duration: number) => void
  className?: string
  highlightSegments?: Array<{ start: number; end: number; color: string }>
}

export default function WaveformVisualizer({
  url, audioData, blob, className, showDownload, downloadFilename
}: Props) {
  const [src, setSrc] = useState<string>('')

  useEffect(() => {
    let objectUrl = ''
    if (url) {
      setSrc(url)
    } else if (blob) {
      objectUrl = URL.createObjectURL(blob)
      setSrc(objectUrl)
    } else if (audioData) {
      objectUrl = URL.createObjectURL(new Blob([audioData]))
      setSrc(objectUrl)
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, blob, audioData])

  if (!src) return null

  return (
    <div className={clsx('bg-surface-50 rounded-xl p-4 border border-surface-200', className)}>
      <audio controls src={src} className="w-full" style={{ outline: 'none' }}>
        Your browser does not support the audio element.
      </audio>
      {showDownload && url && (
        <div className="mt-2 text-right">
          <a 
            href={url} 
            download={downloadFilename || 'audio.wav'}
            className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
          >
            Download Audio
          </a>
        </div>
      )}
    </div>
  )
}
