'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadPNG, downloadPDF } from './exportUtils';

interface MermaidDiagramProps {
  code: string;
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [zoomed, setZoomed] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const renderDiagram = async () => {
      if (!code) return;
      
      setIsLoading(true);
      setError('');
      setSvg('');
      
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        
        let cleanedCode = code
          .replace(/→/g, '-->')
          .replace(/⇒/g, '==>')
          .trim();
        
        if (!cleanedCode.startsWith('graph') && !cleanedCode.startsWith('flowchart')) {
          cleanedCode = 'graph TD\n' + cleanedCode;
        }
        
        const id = `mermaid-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(id, cleanedCode);
        
        if (!cancelled) {
          setSvg(renderedSvg);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Mermaid error:', err);
          setError(err.message || 'Failed to render diagram');
          setIsLoading(false);
        }
      }
    };
    
    renderDiagram();
    
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleDownloadSVG = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture-diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    if (diagramRef.current) {
      await downloadPNG(diagramRef.current, 'architecture-diagram');
    }
  };

  const handleDownloadPDF = async () => {
    if (diagramRef.current) {
      await downloadPDF(diagramRef.current, 'architecture-diagram');
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center flex-wrap gap-2">
        <button
          onClick={() => setZoomed(!zoomed)}
          className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all"
        >
          {zoomed ? '🔍 Zoom Out' : '🔍 Zoom In'}
        </button>
        <button
          onClick={handleDownloadSVG}
          disabled={!svg}
          className="px-3 py-1.5 text-sm bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-all disabled:opacity-50"
        >
          📥 SVG
        </button>
        <button
          onClick={handleDownloadPNG}
          disabled={!svg}
          className="px-3 py-1.5 text-sm bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg transition-all disabled:opacity-50"
        >
          🖼️ PNG
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={!svg}
          className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-all disabled:opacity-50"
        >
          📄 PDF
        </button>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all"
        >
          {showRaw ? '👁️ Hide Code' : '👁️ View Code'}
        </button>
        <span className={`w-2 h-2 rounded-full ml-auto ${error ? 'bg-red-400' : isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></span>
        <span className="text-xs text-gray-400">
          {error ? 'Error' : isLoading ? 'Rendering...' : 'Ready'}
        </span>
      </div>

      {/* Raw Code */}
      {showRaw && (
        <pre className="text-xs text-gray-400 font-mono bg-slate-950 rounded-lg p-4 overflow-x-auto border border-white/10">
          {code}
        </pre>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Diagram */}
      {!error && (
        <div
          className={`bg-slate-950 rounded-xl border border-white/10 overflow-auto transition-all duration-300 ${
            zoomed ? 'fixed inset-4 z-50 p-8' : ''
          }`}
          style={{ maxHeight: zoomed ? '100vh' : '500px' }}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full mr-3"></div>
              Rendering diagram...
            </div>
          )}
          {svg && (
            <div
              ref={diagramRef}
              className="flex justify-center p-4"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      )}
    </div>
  );
}