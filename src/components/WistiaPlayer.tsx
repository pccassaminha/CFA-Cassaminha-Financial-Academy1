import React from 'react';
import { extractWistiaId } from '../utils/wistia';

interface WistiaPlayerProps {
  videoId: string;
}

export default function WistiaPlayer({ videoId }: WistiaPlayerProps) {
  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-[#0e0e0e] flex items-center justify-center rounded-2xl border border-outline-variant/20">
        <span className="text-on-surface-variant font-label text-sm">Nenhum vídeo vinculado.</span>
      </div>
    );
  }

  const cleanId = extractWistiaId(videoId);

  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/30 bg-black">
      <iframe
        src={`https://fast.wistia.net/embed/iframe/${cleanId}?videoFoam=true`}
        title="CFA Video Player"
        allow="autoplay; fullscreen"
        frameBorder="0"
        scrolling="no"
        className="w-full h-full"
        name="wistia_embed"
      ></iframe>
      <script src="https://fast.wistia.net/assets/external/E-v1.js" async></script>
    </div>
  );
}
