'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader2, GitBranch, CheckCircle, XCircle, Layers, Lightbulb, FileCode, Timer, Zap, Star, GitFork, AlertCircle, Eye } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';

// API URL - works both locally and in Docker
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setStatus('queued');

    try {
      const response = await axios.post(`${API_URL}/api/analyze`, {
        repo_url: repoUrl,
        branch: branch,
      });

      const analysisId = response.data.analysis_id;

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `${API_URL}/api/status/${analysisId}`
          );

          const { status: currentStatus, result: currentResult } = statusResponse.data;
          setStatus(currentStatus);

          if (currentStatus === 'completed') {
            setResult(currentResult);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const getStatusIcon = (currentStatus: string) => {
    switch (currentStatus) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-blue-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">CodeViz AI</h1>
              <p className="text-xs text-gray-400">Architecture Diagram Generator</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-400">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>Powered by AI</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {!result && (
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Visualize Any Codebase
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Paste a GitHub repository URL and get an instant architecture diagram,
              component breakdown, and design patterns analysis.
            </p>
          </div>
        )}

        <div className="max-w-3xl mx-auto mb-12">
          <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                GitHub Repository URL
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-gray-300">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all"
                />
              </div>
              <div className="flex-1 flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Analyze Repository</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {status && status !== 'completed' && !error && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="p-4 rounded-xl flex items-center space-x-3 bg-blue-500/10 border border-blue-500/30">
              {getStatusIcon(status)}
              <span className="capitalize font-medium">{status.replace(/_/g, ' ')}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </div>
          </div>
        )}

        {result && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-200">Analysis completed successfully!</span>
            </div>

            {/* Mermaid Diagram - Live Rendering */}
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

            {/* GitHub Stats Section */}
            {result.repo_stats && !result.repo_stats.error && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
                  <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span>GitHub Repository Stats</span>
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-950 rounded-xl border border-yellow-500/20">
                    <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-400">
                      {result.repo_stats.stars?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Stars</div>
                  </div>
                  <div className="text-center p-4 bg-slate-950 rounded-xl border border-blue-500/20">
                    <GitFork className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-400">
                      {result.repo_stats.forks?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Forks</div>
                  </div>
                  <div className="text-center p-4 bg-slate-950 rounded-xl border border-red-500/20">
                    <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-400">
                      {result.repo_stats.open_issues?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Open Issues</div>
                  </div>
                  <div className="text-center p-4 bg-slate-950 rounded-xl border border-green-500/20">
                    <Eye className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-400">
                      {result.repo_stats.watchers?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Watchers</div>
                  </div>
                </div>

                {result.repo_stats.description && result.repo_stats.description !== "No description" && (
                  <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-white/5">
                    <p className="text-sm text-gray-300">{result.repo_stats.description}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {result.repo_stats.language && (
                    <span className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                      {result.repo_stats.language}
                    </span>
                  )}
                  {result.repo_stats.license && result.repo_stats.license !== "No license" && (
                    <span className="px-3 py-1.5 text-xs bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                      {result.repo_stats.license}
                    </span>
                  )}
                  {result.repo_stats.topics?.map((topic: string) => (
                    <span key={topic} className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <FileCode className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-400">Files Analyzed</span>
                </div>
                <div className="text-3xl font-bold text-blue-400">{result.files_analyzed}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Timer className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-gray-400">Processing Time</span>
                </div>
                <div className="text-3xl font-bold text-purple-400">{result.processing_time}s</div>
              </div>
            </div>

            {/* New Analysis Button */}
            <div className="text-center pb-12">
              <button
                onClick={() => {
                  setResult(null);
                  setStatus(null);
                  setError(null);
                  setRepoUrl('');
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all"
              >
                Analyze Another Repository
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          CodeViz AI - Architecture Diagram Generator
        </div>
      </footer>
    </div>
  );
}