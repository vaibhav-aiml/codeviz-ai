'use client';

import { use, useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Layers,
  FileCode2,
  Star,
  GitFork,
  ArrowLeft,
  Share2
} from 'lucide-react';
import MermaidDiagram from '../../MermaidDiagram';
import FileExplorer from '../../FileExplorer';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/+$/, '');

interface AnalysisResultData {
  mermaid_code: string;
  summary: string;
  key_components: string[];
  key_patterns: string[];
  processing_time?: number;
  files_analyzed?: number;
  repo_stats?: {
    stars?: number;
    forks?: number;
    open_issues?: number;
    watchers?: number;
    error?: string;
  };
  file_tree?: Record<string, { dirs: string[]; files: string[] }>;
}

export default function SharedAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const analysisId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnalysisResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'findings' | 'explorer'>('findings');

  useEffect(() => {
    let isSubscribed = true;
    axios.get(`${API_URL}/api/status/${analysisId}`)
      .then(res => {
        if (!isSubscribed) return;
        const { status: currentStatus, result: currentResult } = res.data;
        if (currentStatus === 'completed' && currentResult) {
          setResult(currentResult);
        } else if (currentStatus === 'failed') {
          setError('Analysis task failed or was not found.');
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isSubscribed) return;
        setError('Analysis result not found or expired.');
        setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [analysisId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-[#E2E8F0] flex flex-col bg-grid-pattern font-sans">
      {/* Header */}
      <header className="border-b border-[#232D3F] bg-[#121824]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between font-mono text-xs">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-7 h-7 bg-[#6366F1] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[#6366F1]/20 group-hover:scale-105 transition-transform">
              C
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[#E2E8F0] tracking-tight">CodeViz AI</span>
              <span className="text-[#64748B]">/</span>
              <span className="text-[#94A3B8]">Shared Analysis</span>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold rounded-lg transition-colors flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#6366F1]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Share Direct Link'}</span>
            </button>
            <Link
              href="/"
              className="px-3 py-1.5 bg-[#1A2332] hover:bg-[#232D3F] text-[#E2E8F0] border border-[#232D3F] rounded-lg transition-colors flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#6366F1]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Workbench Body */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-3 font-mono text-xs text-[#94A3B8]">
            <Loader2 className="w-6 h-6 animate-spin text-[#6366F1]" />
            <span>Fetching stored architecture analysis...</span>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto p-4 bg-[#1A1015] border border-[#7F1D1D] rounded-2xl flex items-center space-x-3 font-mono text-xs">
            <XCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
            <span className="text-[#F87171]">{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Results Action & Telemetry Header */}
            <div className="bg-[#121824] border border-[#232D3F] rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 font-mono text-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl text-[#10B981]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm">Persisted Architecture Snapshot</h2>
                  <p className="text-[#94A3B8] text-[11px] mt-0.5">
                    Analysis ID: {analysisId}
                  </p>
                </div>
              </div>
            </div>

            {/* Split View Workbench (65% Left Diagram / 35% Right Inspector) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (65% Width): Diagram Workbench */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-[#121824] border border-[#232D3F] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#232D3F] font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-[#6366F1]" />
                      <span className="font-semibold text-white">System Architecture Canvas</span>
                    </div>
                  </div>
                  <MermaidDiagram code={result.mermaid_code} />
                </div>
              </div>

              {/* Right Column (35% Width): Tabbed Inspector Panel */}
              <div className="lg:col-span-4 space-y-4 font-mono text-xs">
                <div className="bg-[#121824] border border-[#232D3F] rounded-2xl p-4 space-y-4">
                  {/* Tab Controls */}
                  <div className="flex items-center space-x-1 bg-[#0A0E17] p-1 border border-[#232D3F] rounded-xl">
                    <button
                      onClick={() => setActiveTab('findings')}
                      className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                        activeTab === 'findings' ? 'bg-[#6366F1] text-white font-semibold' : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      Findings
                    </button>
                    <button
                      onClick={() => setActiveTab('explorer')}
                      className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                        activeTab === 'explorer' ? 'bg-[#6366F1] text-white font-semibold' : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      File Explorer
                    </button>
                  </div>

                  {/* Tab 1: Findings */}
                  {activeTab === 'findings' && (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="space-y-2">
                        <div className="text-[#94A3B8] flex items-center space-x-1.5">
                          <FileCode2 className="w-3.5 h-3.5 text-[#0EA5E9]" />
                          <span>Executive Architectural Summary</span>
                        </div>
                        <div className="bg-[#0A0E17] border border-[#232D3F] rounded-xl p-3 text-xs leading-relaxed text-[#E2E8F0] font-sans">
                          {result.summary}
                        </div>
                      </div>

                      {/* Key Components */}
                      <div className="space-y-2">
                        <div className="text-[#94A3B8]">Key Components</div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.key_components.map((comp, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-[#1A2332] border border-[#232D3F] rounded-lg text-[#6366F1]">
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Design Patterns */}
                      <div className="space-y-2">
                        <div className="text-[#94A3B8]">Architectural Patterns</div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.key_patterns.map((pat, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-[#1A2332] border border-[#232D3F] rounded-lg text-[#8B5CF6]">
                              {pat}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Repo Stats Grid */}
                      {result.repo_stats && !result.repo_stats.error && (
                        <div className="pt-2 border-t border-[#232D3F] space-y-2">
                          <div className="text-[#94A3B8]">Repository Telemetry</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 bg-[#0A0E17] border border-[#232D3F] rounded-xl text-center">
                              <Star className="w-3.5 h-3.5 text-[#F59E0B] mx-auto mb-1" />
                              <div className="font-bold text-white">{result.repo_stats.stars?.toLocaleString() || 0}</div>
                              <div className="text-[10px] text-[#64748B]">Stars</div>
                            </div>
                            <div className="p-2.5 bg-[#0A0E17] border border-[#232D3F] rounded-xl text-center">
                              <GitFork className="w-3.5 h-3.5 text-[#0EA5E9] mx-auto mb-1" />
                              <div className="font-bold text-white">{result.repo_stats.forks?.toLocaleString() || 0}</div>
                              <div className="text-[10px] text-[#64748B]">Forks</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Explorer */}
                  {activeTab === 'explorer' && (
                    <div>
                      {result.file_tree ? (
                        <FileExplorer fileTree={result.file_tree} analysisId={analysisId} apiUrl={API_URL} />
                      ) : (
                        <div className="text-center py-6 text-[#64748B]">File tree unavailable</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#232D3F] py-4 bg-[#0A0E17]">
        <div className="container mx-auto px-4 text-center text-xs font-mono text-[#64748B]">
          CodeViz AI — Precision Codebase Architecture Engine
        </div>
      </footer>
    </div>
  );
}
