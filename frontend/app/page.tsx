'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Terminal,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileCode2,
  Star,
  GitFork,
  ArrowRight,
  ExternalLink,
  Share2,
  Activity
} from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';
import FileExplorer from './FileExplorer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

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
    size_kb?: number;
    language?: string;
    error?: string;
  };
  file_tree?: Record<string, { dirs: string[]; files: string[] }>;
}

const PRESET_REPOS = [
  { name: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi', branch: 'master' },
  { name: 'tailwindlabs/tailwindcss', url: 'https://github.com/tailwindlabs/tailwindcss', branch: 'main' },
  { name: 'vercel/next.js', url: 'https://github.com/vercel/next.js', branch: 'canary' },
];

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [analysisId, setAnalysisId] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState<'findings' | 'explorer'>('findings');
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('id') || params.get('analysis_id');
    if (urlId) {
      const fetchStatus = async () => {
        setAnalysisId(urlId);
        setLoading(true);
        setStatus('analyzing');
        try {
          const res = await axios.get(`${API_URL}/api/status/${urlId}`);
          const { status: currentStatus, result: currentResult } = res.data;
          setStatus(currentStatus);
          if (currentStatus === 'completed' && currentResult) {
            setResult(currentResult);
          } else if (currentStatus === 'failed') {
            setError('Analysis task failed or expired.');
          }
        } catch {
          setError('Analysis not found.');
        } finally {
          setLoading(false);
        }
      };
      fetchStatus();
    }
    return () => cancelAnimationFrame(timer);
  }, []);

  // Honest timer tracking seconds during execution
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading && status && status !== 'completed' && status !== 'failed') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setAnalysisId('');
    setStatus('queued');
    setElapsedSeconds(0);

    try {
      const response = await axios.post(`${API_URL}/api/analyze`, { repo_url: repoUrl, branch: branch });
      const newAnalysisId = response.data.analysis_id;
      setAnalysisId(newAnalysisId);

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`${API_URL}/api/status/${newAnalysisId}`);
          const { status: currentStatus, result: currentResult } = statusResponse.data;
          setStatus(currentStatus);
          if (currentStatus === 'completed') {
            setResult(currentResult);
            setLoading(false);
            clearInterval(pollInterval);
          } else if (currentStatus === 'failed') {
            setError('Analysis task failed. Please check repository accessibility.');
            setLoading(false);
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Status poll error:', err);
        }
      }, 2000);
    } catch (err: unknown) {
      let msg = 'Failed to start analysis. Please verify the URL and try again.';
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!analysisId) return;
    const shareUrl = `${window.location.origin}/analysis/${analysisId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const pipelineStages = [
    { key: 'queued', label: 'Queued' },
    { key: 'cloning', label: 'Git Shallow Clone' },
    { key: 'analyzing', label: 'Code Extraction & AI Inference' },
    { key: 'completed', label: 'Diagram Bloomed' },
  ];

  const getStageIndex = (currentStatus: string | null) => {
    switch (currentStatus) {
      case 'queued': return 0;
      case 'cloning': return 1;
      case 'analyzing': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center font-mono text-xs text-[#94A3B8]">
        <Activity className="w-5 h-5 animate-spin text-[#6366F1] mr-2" />
        <span>Initializing Workbench...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E17] text-[#E2E8F0] flex flex-col bg-grid-pattern">
      {/* Header Toolbar */}
      <header className="border-b border-[#232D3F] bg-[#121824]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-[#6366F1] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[#6366F1]/20">
              C
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[#E2E8F0] tracking-tight">CodeViz AI</span>
              <span className="text-[#64748B]">/</span>
              <span className="text-[#94A3B8]">Architecture Workbench</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 bg-[#1A2332] border border-[#232D3F] rounded-md text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[#94A3B8]">Groq Llama-3.3-70B Engine</span>
            </div>

            <a
              href="https://github.com/vaibhav-aiml/codeviz-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-[#1A2332] rounded-md text-[#94A3B8] hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#6366F1]"
              title="View GitHub Repository"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {!result ? (
          /* Landing & Input Workspace */
          <div className="max-w-4xl mx-auto space-y-8 py-6">
            {/* Technical Title Banner */}
            <div className="space-y-4 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#1A2332] border border-[#232D3F] rounded-md text-xs font-mono text-[#6366F1]">
                <Terminal className="w-3.5 h-3.5" />
                <span>Codebase Architecture Digest & Visualization</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Understand Unfamiliar Repositories <span className="text-[#6366F1]">In Seconds</span>
              </h1>
              <p className="text-[#94A3B8] text-sm md:text-base max-w-2xl leading-relaxed">
                Clone, inspect structure, and synthesize interactive Mermaid architecture diagrams directly from GitHub source code.
              </p>
            </div>

            {/* Input CLI Bar */}
            <div className="bg-[#121824] border border-[#232D3F] rounded-2xl p-6 shadow-2xl space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4 font-mono">
                <div className="space-y-2">
                  <label className="text-xs text-[#94A3B8] flex items-center justify-between">
                    <span>Target Repository URL</span>
                    <span className="text-[11px] text-[#64748B]">GitHub HTTPS only</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6366F1] font-bold text-sm">$</span>
                    <input
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository"
                      className="w-full pl-8 pr-4 py-3.5 bg-[#0A0E17] border border-[#232D3F] focus:border-[#6366F1] rounded-xl text-xs md:text-sm text-[#E2E8F0] placeholder-[#64748B] transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-xs text-[#94A3B8]">Branch</label>
                    <div className="relative">
                      <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B]" />
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        className="w-full pl-8 pr-3 py-3 bg-[#0A0E17] border border-[#232D3F] focus:border-[#6366F1] rounded-xl text-xs text-[#E2E8F0] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-3 flex items-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] disabled:bg-[#1A2332] disabled:text-[#64748B] text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-[#6366F1]/20 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#6366F1]"
                    >
                      {loading ? (
                        <>
                          <Activity className="w-4 h-4 animate-spin text-white" />
                          <span>Executing Pipeline...</span>
                        </>
                      ) : (
                        <>
                          <span>Execute Architecture Digest</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Preset Chips */}
              <div className="pt-2 border-t border-[#232D3F] flex items-center flex-wrap gap-2 text-xs font-mono">
                <span className="text-[#64748B] mr-1">Quick Benchmarks:</span>
                {PRESET_REPOS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setRepoUrl(preset.url);
                      setBranch(preset.branch);
                    }}
                    className="px-2.5 py-1 bg-[#1A2332] hover:bg-[#232D3F] border border-[#232D3F] rounded-lg text-[#0EA5E9] hover:text-white transition-colors focus-visible:ring-1 focus-visible:ring-[#6366F1]"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Honest Pipeline Status Telemetry Console */}
            {status && !error && (
              <div className="bg-[#121824] border border-[#232D3F] rounded-2xl p-6 font-mono text-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#232D3F]">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-[#6366F1] animate-spin" />
                    <span className="font-semibold text-white">Pipeline Telemetry Stream</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[#94A3B8]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Elapsed: {elapsedSeconds}s</span>
                  </div>
                </div>

                {/* Pipeline Stepper Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  {pipelineStages.map((stage, idx) => {
                    const activeIdx = getStageIndex(status);
                    const isCurrent = idx === activeIdx;
                    const isDone = idx < activeIdx;

                    return (
                      <div
                        key={stage.key}
                        className={`p-3 rounded-xl border text-center transition-colors ${
                          isCurrent
                            ? 'bg-[#1A2332] border-[#6366F1] text-white shadow-md'
                            : isDone
                            ? 'bg-[#121824] border-[#10B981]/40 text-[#10B981]'
                            : 'bg-[#0A0E17] border-[#232D3F] text-[#64748B]'
                        }`}
                      >
                        <div className="text-[10px] text-[#64748B] mb-1 font-bold">STEP 0{idx + 1}</div>
                        <div className="font-medium text-xs truncate">{stage.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Callout */}
            {error && (
              <div className="p-4 bg-[#1A1015] border border-[#7F1D1D] rounded-2xl flex items-center space-x-3 text-xs font-mono">
                <XCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
                <span className="text-[#F87171]">{error}</span>
              </div>
            )}
          </div>
        ) : (
          /* Results Architecture Workbench */
          <div className="space-y-6">
            {/* Results Action & Telemetry Header */}
            <div className="bg-[#121824] border border-[#232D3F] rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 font-mono text-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl text-[#10B981]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm">Architecture Synthesis Complete</h2>
                  <p className="text-[#94A3B8] text-[11px] mt-0.5">
                    Processed in {result.processing_time || elapsedSeconds}s • {result.files_analyzed || 30} source files analyzed
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleShare}
                  className="px-3.5 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold rounded-xl transition-colors flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#6366F1]"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedShare ? 'Link Copied!' : 'Share Analysis Link'}</span>
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setStatus(null);
                    setError(null);
                    setRepoUrl('');
                  }}
                  className="px-3.5 py-2 bg-[#1A2332] hover:bg-[#232D3F] text-[#E2E8F0] border border-[#232D3F] rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-[#6366F1]"
                >
                  Analyze New Repository
                </button>
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