import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeroSectionProps {
  currentUser?: any;
}

export default function HeroSection({ currentUser }: HeroSectionProps) {
  return (
    <div className="relative w-full min-h-[85vh] lg:min-h-[92vh] bg-[#050505] flex items-center pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
      
      {/* Imagem de Fundo Completa com degrade escuro para garantir perfeita legibilidade */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://i.postimg.cc/kG5gtcj8/CAPA-CFA.png"
          alt="CFA Academy"
          className="w-full h-full object-cover object-right md:object-center"
          referrerPolicy="no-referrer"
        />
        {/* Degradê horizontal: mais escuro na esquerda para dar contraste perfeito aos textos */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/85 sm:via-[#050505]/75 to-transparent"></div>
        {/* Degradê vertical suave para transição suave com a navbar e as seções seguintes */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/60"></div>
      </div>

      {/* Conteúdo Principal Sobreposto */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="flex flex-col items-start space-y-6 text-left max-w-2xl lg:max-w-3xl">
          
          <span className="bg-black/60 backdrop-blur-md border border-white/15 text-[#e9c349] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest font-mono shadow-md">
            Cassaminha Financial Academy
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] font-headline drop-shadow-lg">
            Aprenda as Habilidades <span className="text-[#e9c349]">Que Geram Resultados</span>
          </h1>

          <p className="text-gray-300 text-base sm:text-lg md:text-xl leading-relaxed font-body drop-shadow-md">
            Tenha acesso a cursos práticos de alto impacto criados por especialistas de diversos nichos. Desenvolva novos talentos, domine ferramentas modernas e conquiste seus objetivos passo a passo.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 sm:pt-6 w-full sm:w-auto">
            <Link 
              to={currentUser ? "/library" : "/criar-conta"} 
              className="w-full sm:w-auto bg-[#e9c349] text-black px-8 py-4 rounded-xl font-bold hover:bg-[#d4b03f] transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-xl shadow-[#e9c349]/25 font-headline active:scale-95"
            >
              {currentUser ? "Acessar Minha Área" : "Criar Minha Conta Grátis"} <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="#cursos" 
              className="w-full sm:w-auto bg-black/60 backdrop-blur-md border border-gray-600 hover:border-gray-400 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center justify-center text-center font-headline shadow-lg"
            >
              Explorar Catálogo de Cursos
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
