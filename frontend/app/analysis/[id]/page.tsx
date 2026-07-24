'use client';

import { use, useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, Layers, FileCode, Leaf, Lightbulb, Star, GitFork, AlertCircle, Eye, Flower2, ArrowLeft, Share2 } from 'lucide-react';
import MermaidDiagram from '../../MermaidDiagram';
import FileExplorer from '../../FileExplorer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AnalysisResultData {
  mermaid_code: string;
  summary: string;
  key_components: string[];
  key_patterns: string[];
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
  const [status, setStatus] = useState<string | null>('analyzing');
  const [result, setResult] = useState<AnalysisResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    axios.get(`${API_URL}/api/status/${analysisId}`)
      .then(res => {
        if (!isSubscribed) return;
        const { status: currentStatus, result: currentResult } = res.data;
        setStatus(currentStatus);
        if (currentStatus === 'completed' && currentResult) {
          setResult(currentResult);
        } else if (currentStatus === 'failed') {
          setError('Analysis failed or was not found.');
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
    <div className="min-h-screen bg-[#0a0d14] text-white overflow-x-hidden">
      {/* Header */}
      <header className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-[#0a0d14]/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Leaf className="w-6 h-6 text-[#0a0d14]" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                CodeViz AI
              </h1>
              <p className="text-xs text-gray-500">Shared Architecture Analysis</p>
            </div>
          </Link>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-medium transition-all flex items-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>{copied ? 'Link Copied!' : 'Share Analysis'}</span>
            </button>
            <Link href="/" className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>New Analysis</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-8 relative z-10">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
            <p className="text-gray-400">Loading analysis result...</p>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto p-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center space-x-4">
            <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-200">Analysis Not Found</h3>
              <p className="text-sm text-red-300/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-200">Persisted Architecture Result</span>
              </div>
              <span className="text-xs font-mono text-emerald-400/80">ID: {analysisId}</span>
            </div>

            <div className="bg-white/3 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Architecture Diagram</span>
              </h2>
              <MermaidDiagram code={result.mermaid_code} />
            </div>

            <div className="bg-white/3 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-teal-400" />
                <span>Architecture Summary</span>
              </h2>
              <p className="text-gray-300 leading-relaxed">{result.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/3 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                  <span>Key Components</span>
                </h3>
                <ul className="space-y-3">
                  {result.key_components.map((c: string, i: number) => (
                    <li key={i} className="flex items-center space-x-3 text-gray-300">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <span>Design Patterns</span>
                </h3>
                <ul className="space-y-3">
                  {result.key_patterns.map((p: string, i: number) => (
                    <li key={i} className="flex items-center space-x-3 text-gray-300">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {result.repo_stats && !result.repo_stats.error && (
              <div className="bg-white/3 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold mb-6">Repository Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Star, color: 'text-yellow-400', val: result.repo_stats.stars, label: 'Stars' },
                    { icon: GitFork, color: 'text-blue-400', val: result.repo_stats.forks, label: 'Forks' },
                    { icon: AlertCircle, color: 'text-red-400', val: result.repo_stats.open_issues, label: 'Issues' },
                    { icon: Eye, color: 'text-emerald-400', val: result.repo_stats.watchers, label: 'Watchers' }
                  ].map((s, i) => (
                    <div key={i} className="text-center p-4 bg-black/20 rounded-xl">
                      <s.icon className={`w-6 h-6 ${s.color} mx-auto mb-2`} />
                      <div className={`text-2xl font-bold ${s.color}`}>{s.val?.toLocaleString() || 0}</div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.file_tree && <FileExplorer fileTree={result.file_tree} analysisId={analysisId} apiUrl={API_URL} />}
          </>
        )}
      </main>
    </div>
  );
}
