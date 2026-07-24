'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadPNG, downloadPDF } from './exportUtils';
import { Maximize2, Minimize2, Download, FileText, Code2, AlertTriangle, Loader2 } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
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
        
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            darkMode: true,
            background: '#0A0E17',
            primaryColor: '#1A2332',
            primaryTextColor: '#E2E8F0',
            primaryBorderColor: '#6366F1',
            lineColor: '#64748B',
            secondaryColor: '#121824',
            tertiaryColor: '#0A0E17',
          },
          fontFamily: 'JetBrains Mono, monospace',
        });
        
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
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Mermaid rendering error:', err);
          const errorMsg = err instanceof Error ? err.message : 'Failed to parse & render Mermaid diagram syntax';
          setError(errorMsg);
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
    <div className="space-y-3">
      {/* Precision Controls Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-2 bg-[#121824] border border-[#232D3F] rounded-xl text-xs font-mono">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoomed(!zoomed)}
            className="px-2.5 py-1.5 bg-[#1A2332] hover:bg-[#232D3F] text-[#E2E8F0] border border-[#232D3F] rounded-lg transition-colors flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#6366F1]"
            title="Toggle fullscreen diagram view"
          >
            {zoomed ? <Minimize2 className="w-3.5 h-3.5 text-[#94A3B8]" /> : <Maximize2 className="w-3.5 h-3.5 text-[#94A3B8]" />}
            <span>{zoomed ? 'Exit Zoom' : 'Fullscreen'}</span>
          </button>
          
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="px-2.5 py-1.5 bg-[#1A2332] hover:bg-[#232D3F] text-[#E2E8F0] border border-[#232D3F] rounded-lg transition-colors flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#6366F1]"
          >
            <Code2 className="w-3.5 h-3.5 text-[#6366F1]" />
            <span>{showRaw ? 'Hide Code' : 'Source Code'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadSVG}
            disabled={!svg}
            className="px-2.5 py-1.5 bg-[#1A2332] hover:bg-[#232D3F] text-[#0EA5E9] border border-[#232D3F] rounded-lg transition-colors disabled:opacity-40 flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#6366F1]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SVG</span>
          </button>

          <button
            onClick={handleDownloadPNG}
            disabled={!svg}
            className="px-2.5 py-1.5 bg-[#1A2332] hover:bg-[#232D3F] text-[#10B981] border border-[#232D3F] rounded-lg transition-colors disabled:opacity-40 flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#6366F1]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={!svg}
            className="px-2.5 py-1.5 bg-[#1A2332] hover:bg-[#232D3F] text-[#8B5CF6] border border-[#232D3F] rounded-lg transition-colors disabled:opacity-40 flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#6366F1]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <div className="h-4 w-px bg-[#232D3F] mx-1" />

          <div className="flex items-center space-x-1.5 px-2 py-1 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${error ? 'bg-[#EF4444]' : isLoading ? 'bg-[#F59E0B] animate-pulse' : 'bg-[#10B981]'}`} />
            <span className="text-[#94A3B8]">
              {error ? 'Parse Error' : isLoading ? 'Rendering' : 'Rendered'}
            </span>
          </div>
        </div>
      </div>

      {/* Raw Code Inspector Drawer */}
      {showRaw && (
        <div className="border border-[#232D3F] rounded-xl bg-[#0A0E17] p-4 overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#232D3F] text-xs font-mono text-[#94A3B8]">
            <span>Mermaid Syntax Definition</span>
            <span>UTF-8</span>
          </div>
          <pre className="text-xs text-[#E2E8F0] font-mono overflow-x-auto leading-relaxed selection:bg-[#6366F1] selection:text-white">
            {code}
          </pre>
        </div>
      )}

      {/* Error Callout */}
      {error && (
        <div className="bg-[#1A1015] border border-[#7F1D1D] rounded-xl p-4 flex items-start space-x-3 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#FCA5A5]">Mermaid Syntax Exception</span>
            <p className="text-[#F87171] leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Diagram Canvas Container */}
      {!error && (
        <div
          className={`bg-[#0A0E17] rounded-xl border border-[#232D3F] overflow-auto transition-all duration-200 ${
            zoomed ? 'fixed inset-6 z-50 p-8 shadow-2xl bg-[#0A0E17]/95 backdrop-blur-xl border-[#6366F1]/50' : 'p-6 min-h-[320px]'
          }`}
          style={{ maxHeight: zoomed ? 'calc(100vh - 48px)' : '520px' }}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-48 text-[#94A3B8] text-xs font-mono space-x-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#6366F1]" />
              <span>Generating vector canvas layout...</span>
            </div>
          )}
          {svg && (
            <div
              ref={diagramRef}
              className="flex justify-center items-center min-h-[280px]"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      )}
    </div>
  );
}