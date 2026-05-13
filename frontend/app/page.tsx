'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader2, GitBranch, CheckCircle, XCircle, Layers, Lightbulb, FileCode, Timer, Zap, Star, GitFork, AlertCircle, Eye, Code2, Sparkles, ArrowRight, Boxes, Cpu, Wand2, ExternalLink } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';
import FileExplorer from './FileExplorer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [analysisId, setAnalysisId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setAnalysisId('');
    setStatus('queued');

    try {
      const response = await axios.post(`${API_URL}/api/analyze`, { repo_url: repoUrl, branch: branch });
      const newAnalysisId = response.data.analysis_id;

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`${API_URL}/api/status/${newAnalysisId}`);
          const { status: currentStatus, result: currentResult } = statusResponse.data;
          setStatus(currentStatus);

          if (currentStatus === 'completed') {
            setResult(currentResult);
            setAnalysisId(newAnalysisId);
            setLoading(false);
            clearInterval(pollInterval);
          } else if (currentStatus === 'failed') {
            setError('Analysis failed. Please try again.');
            setLoading(false);
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);
    } catch (err) {
      setError('Failed to start analysis. Please check the URL and try again.');
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const getStatusIcon = (currentStatus: string) => {
    switch (currentStatus) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <Loader2 className="w-5 h-5 animate-spin text-blue-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <GitBranch className="w-6 h-6" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold">CodeViz AI</h1>
              <p className="text-xs text-gray-500">Architecture Diagram Generator</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span className="text-xs text-purple-300">AI Powered</span>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {!result ? (
          <>
            <section className="container mx-auto px-4 pt-20 pb-16 text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">AI-Powered Code Analysis</span>
              </div>

              <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                  Visualize Any
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Codebase Instantly
                </span>
              </h2>

              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
                Paste any GitHub repository URL and get AI-powered architecture diagrams, design patterns, and code insights.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
                {[
                  { icon: Cpu, title: 'AI Analysis', desc: 'Powered by Groq & Llama 3.3' },
                  { icon: Boxes, title: 'Architecture Maps', desc: 'Interactive Mermaid diagrams' },
                  { icon: Wand2, title: 'Smart Insights', desc: 'Design patterns & components' },
                ].map((feature, i) => (
                  <div key={i} className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 hover:scale-105">
                    <feature.icon className="w-8 h-8 text-purple-400 mb-3" />
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-500">{feature.desc}</p>
                  </div>
                ))}
              </div>

              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400">GitHub Repository URL</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                      <input type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/username/repository" className="w-full pl-12 pr-4 py-4 bg-black/30 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600 transition-all" required />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2 text-gray-400">Branch</label>
                      <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="w-full px-4 py-4 bg-black/30 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all" />
                    </div>
                    <div className="flex-1 flex items-end">
                      <button type="submit" disabled={loading} className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-800 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 disabled:cursor-not-allowed">
                        {loading ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Analyzing...</span></> : <><span>Analyze Repository</span><ArrowRight className="w-5 h-5" /></>}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </>
        ) : (
          <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-200">Analysis completed successfully!</span>
            </div>

            {/* Mermaid Diagram */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>Architecture Diagram</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Live</span>
              </h2>
              <MermaidDiagram code={result.mermaid_code} />
            </div>

            {/* Architecture Summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-blue-400" />
                <span>Architecture Summary</span>
              </h2>
              <p className="text-gray-300 leading-relaxed">{result.summary}</p>
            </div>

            {/* Key Components & Design Patterns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-green-400" />
                  <span>Key Components</span>
                </h3>
                <ul className="space-y-3">
                  {result.key_components.map((component: string, index: number) => (
                    <li key={index} className="flex items-center space-x-3 text-gray-300">
                      <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                      <span>{component}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <span>Design Patterns</span>
                </h3>
                <ul className="space-y-3">
                  {result.key_patterns.map((pattern: string, index: number) => (
                    <li key={index} className="flex items-center space-x-3 text-gray-300">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"></div>
                      <span>{pattern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* GitHub Stats */}
            {result.repo_stats && !result.repo_stats.error && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-6">GitHub Repository Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-950 rounded-xl border border-yellow-500/20">
                    <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-400">{result.repo_stats.stars?.toLocaleString() || 0}</div>
                    <div className="text-xs text-gray-400 mt-1">Stars</div>
                  </div>
                  <div className="text-center p-4 bg-slate-950 rounded-xl border border-blue-500/20">
                    <GitFork className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-400">{result.repo_stats.forks?.toLocaleString() || 0}</div>
                    <div className="text-xs text-gray-400 mt-1">Forks</div>
                  </div>
                  <div className="text-center p-4 bg-slate-950 rounded-xl border border-red-500/20">
                    <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-400">{result.repo_stats.open_issues?.toLocaleString() || 0}</div>
                    <div className="text-xs text-gray-400 mt-1">Open Issues</div>
                  </div>
                  <div className="text-center p-4 bg-slate-950 rounded-xl border border-green-500/20">
                    <Eye className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-400">{result.repo_stats.watchers?.toLocaleString() || 0}</div>
                    <div className="text-xs text-gray-400 mt-1">Watchers</div>
                  </div>
                </div>
                {result.repo_stats.description && (
                  <div className="mt-4 p-4 bg-slate-950 rounded-xl"><p className="text-sm text-gray-300">{result.repo_stats.description}</p></div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.repo_stats.language && <span className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-300 rounded-full">{result.repo_stats.language}</span>}
                  {result.repo_stats.topics?.map((topic: string) => (
                    <span key={topic} className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-300 rounded-full">{topic}</span>
                  ))}
                </div>
              </div>
            )}

            {/* File Explorer */}
            {result.file_tree && (
              <FileExplorer fileTree={result.file_tree} analysisId={analysisId} apiUrl={API_URL} />
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <FileCode className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-blue-400">{result.files_analyzed}</div>
                <div className="text-sm text-gray-400">Files Analyzed</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <Timer className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-purple-400">{result.processing_time}s</div>
                <div className="text-sm text-gray-400">Processing Time</div>
              </div>
            </div>

            <div className="text-center pb-12">
              <button onClick={() => { setResult(null); setStatus(null); setError(null); setRepoUrl(''); setAnalysisId(''); }} className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all">
                Analyze Another Repository
              </button>
            </div>
          </div>
        )}

        {status && status !== 'completed' && !error && !result && (
          <div className="max-w-3xl mx-auto px-4 mb-8">
            <div className="p-4 rounded-xl flex items-center space-x-3 bg-blue-500/10 border border-blue-500/30">
              {getStatusIcon(status)}
              <span className="capitalize font-medium">{status.replace(/_/g, ' ')}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto px-4 mb-8">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          CodeViz AI - Architecture Diagram Generator
        </div>
      </footer>
    </div>
  );
}