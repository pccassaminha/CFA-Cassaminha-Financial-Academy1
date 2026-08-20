import React from 'react';

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

  // Se o usuário passar uma URL completa do Wistia (ex: https://fast.wistia.net/embed/iframe/abc123xyz ou https://xxx.wistia.com/medias/abc123xyz), extrai apenas o ID
  let cleanId = videoId.trim();
  if (cleanId.includes('wistia.net/embed/iframe/')) {
    cleanId = cleanId.split('wistia.net/embed/iframe/')[1].split('?')[0];
  } else if (cleanId.includes('wistia.com/medias/')) {
    cleanId = cleanId.split('wistia.com/medias/')[1].split('?')[0];
  }

  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/30 bg-black">
      <iframe
        src={`https://fast.wistia.net/embed/iframe/${cleanId}?videoFoam=true`}
        title="CFA Video Player"
        allow="autoplay; fullscreen"
        allowTransparency={true}
        frameBorder="0"
        scrolling="no"
        className="w-full h-full"
        name="wistia_embed"
      ></iframe>
      <script src="https://fast.wistia.net/assets/external/E-v1.js" async></script>
    </div>
  );
}
