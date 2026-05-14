'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Loader2, GitBranch, CheckCircle, XCircle, Layers, Lightbulb, FileCode, Timer, Zap, Star, GitFork, AlertCircle, Eye, Code2, Sparkles, ArrowRight, Boxes, Cpu, Wand2, ExternalLink, Leaf, Moon, Sun, Cloud, Flower2 } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';
import FileExplorer from './FileExplorer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function ParticleField() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float-particle"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: i % 3 === 0 ? '#a78bfa' : i % 3 === 1 ? '#67e8f9' : '#34d399',
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${Math.random() * 15 + 10}s`,
            opacity: Math.random() * 0.6 + 0.2,
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [analysisId, setAnalysisId] = useState<string>('');
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null); setAnalysisId(''); setStatus('queued');
    try {
      const response = await axios.post(`${API_URL}/api/analyze`, { repo_url: repoUrl, branch: branch });
      const newAnalysisId = response.data.analysis_id;
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`${API_URL}/api/status/${newAnalysisId}`);
          const { status: currentStatus, result: currentResult } = statusResponse.data;
          setStatus(currentStatus);
          if (currentStatus === 'completed') { setResult(currentResult); setAnalysisId(newAnalysisId); setLoading(false); clearInterval(pollInterval); }
          else if (currentStatus === 'failed') { setError('Analysis failed. Please try again.'); setLoading(false); clearInterval(pollInterval); }
        } catch (err) { console.error('Polling error:', err); }
      }, 2000);
    } catch (err) { setError('Failed to start analysis. Please check the URL and try again.'); setLoading(false); }
  };

  if (!mounted) return <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-400" /></div>;

  const getStatusIcon = (s: string) => {
    switch (s) { case 'completed': return <CheckCircle className="w-5 h-5 text-emerald-400" />; case 'failed': return <XCircle className="w-5 h-5 text-red-400" />; default: return <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />; }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white overflow-x-hidden">
      <ParticleField />

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-7xl -translate-x-1/2 -translate-y-1/2 animate-pulse-slow" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-purple-500/10 via-indigo-500/5 to-transparent rounded-full blur-7xl translate-x-1/4 animate-pulse-slower" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-gradient-to-t from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-7xl animate-pulse-slow" />
        {/* Nature-inspired vine lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,50 Q25,30 50,50 T100,50" fill="none" stroke="#34d399" strokeWidth="0.2" className="animate-draw" />
          <path d="M0,70 Q30,90 60,60 T100,70" fill="none" stroke="#67e8f9" strokeWidth="0.15" className="animate-draw-delayed" />
          <path d="M0,30 Q20,10 40,40 T100,20" fill="none" stroke="#a78bfa" strokeWidth="0.2" className="animate-draw-slower" />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-[#0a0d14]/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Leaf className="w-6 h-6 text-[#0a0d14]" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">CodeViz AI</h1>
              <p className="text-xs text-gray-500">Cosmic Architecture Visualizer</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a href="https://github.com/vaibhav-aiml/codeviz-ai" target="_blank" className="text-sm text-gray-400 hover:text-emerald-300 transition-colors flex items-center space-x-1">
              <ExternalLink className="w-4 h-4" /><span className="hidden sm:inline">GitHub</span>
            </a>
            <button onClick={() => document.getElementById('analyze-section')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-sm text-emerald-300 hover:bg-emerald-500/20 transition-all">
              Start Exploring
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {!result ? (
          <section className="container mx-auto px-4 pt-16 pb-16">
            {/* Hero */}
            <div className="text-center relative mb-20">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full blur-2xl opacity-30 animate-pulse-slow" />
                <div className="relative inline-flex items-center space-x-2 px-5 py-2.5 bg-[#0a0d14]/80 border border-emerald-500/30 rounded-full backdrop-blur-xl">
                  <div className="flex -space-x-1">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                    <div className="w-3 h-3 bg-teal-400 rounded-full" />
                  </div>
                  <span className="text-sm text-emerald-300 font-medium">Explore the Cosmos of Code</span>
                </div>
              </div>

              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-none tracking-tight">
                <span className="block bg-gradient-to-b from-white via-gray-100 to-gray-400 bg-clip-text text-transparent mb-2">
                  Where Code
                </span>
                <span className="block bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent animate-aurora">
                  Meets Nature
                </span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
                Watch your codebase bloom into beautiful architecture diagrams. 
                AI-powered analysis that reveals the organic structure of any repository.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-16">
                <button onClick={() => document.getElementById('analyze-section')?.scrollIntoView({ behavior: 'smooth' })} className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-lg font-semibold hover:shadow-2xl hover:shadow-emerald-500/30 transition-all hover:scale-105 flex items-center space-x-2">
                  <span>Begin Journey</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="https://github.com/vaibhav-aiml/codeviz-ai" target="_blank" className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all flex items-center space-x-2">
                  <ExternalLink className="w-5 h-5" /><span>GitHub</span>
                </a>
              </div>

              {/* Floating cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-20">
                {[
                  { icon: Moon, title: 'Deep Analysis', desc: 'AI dives into every file', color: 'emerald' },
                  { icon: Sun, title: 'Clear Insights', desc: 'Beautiful visual output', color: 'teal' },
                  { icon: Flower2, title: 'Organic Growth', desc: 'Understand any codebase', color: 'cyan' },
                ].map((card, i) => (
                  <div key={i} className="group relative bg-white/3 border border-white/5 rounded-2xl p-8 hover:bg-white/5 hover:border-emerald-500/20 transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm">
                    <div className={`w-14 h-14 bg-${card.color}-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                      <card.icon className={`w-7 h-7 text-${card.color}-400`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* How It Works - Timeline */}
            <div className="max-w-4xl mx-auto mb-20">
              <h2 className="text-3xl font-bold text-center mb-16">
                <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">The Growth Process</span>
              </h2>
              <div className="relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/50 via-teal-500/30 to-transparent" />
                {[
                  { step: '01', title: 'Plant the Seed', desc: 'Paste any GitHub repository URL', icon: GitBranch },
                  { step: '02', title: 'Root Analysis', desc: 'AI explores every file and folder', icon: Search },
                  { step: '03', title: 'Blossom & Reveal', desc: 'Watch the architecture diagram bloom', icon: Flower2 },
                ].map((item, i) => (
                  <div key={i} className={`relative flex items-center mb-12 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`w-1/2 ${i % 2 === 0 ? 'pr-12 text-right' : 'pl-12'}`}>
                      <div className="bg-white/3 border border-white/5 rounded-2xl p-6 inline-block hover:border-emerald-500/20 transition-all">
                        <span className="text-xs text-emerald-400 font-mono">{item.step}</span>
                        <h3 className="text-lg font-semibold mt-1">{item.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                      </div>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="w-1/2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Input Section */}
            <div id="analyze-section" className="max-w-3xl mx-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-3xl blur-xl" />
                <div className="relative bg-[#0a0d14]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl">
                  <div className="text-center mb-6">
                    <Cloud className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <h2 className="text-2xl font-bold">Ready to Explore?</h2>
                    <p className="text-gray-500 text-sm mt-1">Enter a repository URL to begin</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                      <input type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/username/repository" className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-gray-600 transition-all text-lg" required />
                    </div>
                    <div className="flex gap-4">
                      <div className="w-28">
                        <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="w-full px-4 py-4 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white transition-all text-center" />
                      </div>
                      <button type="submit" disabled={loading} className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-700 disabled:to-gray-800 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center space-x-3 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20">
                        {loading ? <><Loader2 className="w-6 h-6 animate-spin" /><span>Growing...</span></> : <><span>Start Analysis</span><ArrowRight className="w-6 h-6" /></>}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* Results */
          <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-3 backdrop-blur-sm">
              <Flower2 className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-200">Analysis bloomed successfully!</span>
            </div>

            <div className="bg-white/3 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2"><Layers className="w-5 h-5 text-emerald-400" /><span>Architecture Diagram</span></h2>
              <MermaidDiagram code={result.mermaid_code} />
            </div>

            <div className="bg-white/3 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2"><FileCode className="w-5 h-5 text-teal-400" /><span>Architecture Summary</span></h2>
              <p className="text-gray-300 leading-relaxed">{result.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/3 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2"><Leaf className="w-5 h-5 text-emerald-400" /><span>Key Components</span></h3>
                <ul className="space-y-3">{result.key_components.map((c: string, i: number) => (<li key={i} className="flex items-center space-x-3 text-gray-300"><div className="w-2 h-2 bg-emerald-400 rounded-full" /><span>{c}</span></li>))}</ul>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2"><Lightbulb className="w-5 h-5 text-yellow-400" /><span>Design Patterns</span></h3>
                <ul className="space-y-3">{result.key_patterns.map((p: string, i: number) => (<li key={i} className="flex items-center space-x-3 text-gray-300"><div className="w-2 h-2 bg-yellow-400 rounded-full" /><span>{p}</span></li>))}</ul>
              </div>
            </div>

            {result.repo_stats && !result.repo_stats.error && (
              <div className="bg-white/3 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold mb-6">Repository Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[{ icon: Star, color: 'text-yellow-400', val: result.repo_stats.stars, label: 'Stars' }, { icon: GitFork, color: 'text-blue-400', val: result.repo_stats.forks, label: 'Forks' }, { icon: AlertCircle, color: 'text-red-400', val: result.repo_stats.open_issues, label: 'Issues' }, { icon: Eye, color: 'text-emerald-400', val: result.repo_stats.watchers, label: 'Watchers' }].map((s, i) => (
                    <div key={i} className="text-center p-4 bg-black/20 rounded-xl"><s.icon className={`w-6 h-6 ${s.color} mx-auto mb-2`} /><div className={`text-2xl font-bold ${s.color}`}>{s.val?.toLocaleString() || 0}</div><div className="text-xs text-gray-400">{s.label}</div></div>
                  ))}
                </div>
              </div>
            )}

            {result.file_tree && <FileExplorer fileTree={result.file_tree} analysisId={analysisId} apiUrl={API_URL} />}

            <div className="text-center pb-12">
              <button onClick={() => { setResult(null); setStatus(null); setError(null); setRepoUrl(''); setAnalysisId(''); }} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
                Analyze Another Repository
              </button>
            </div>
          </div>
        )}

        {status && status !== 'completed' && !error && !result && (
          <div className="max-w-3xl mx-auto px-4 mb-8"><div className="p-4 rounded-xl flex items-center space-x-3 bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-sm">{getStatusIcon(status)}<span className="capitalize font-medium">{status.replace(/_/g, ' ')}</span></div></div>
        )}
        {error && (
          <div className="max-w-3xl mx-auto px-4 mb-8"><div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-3 backdrop-blur-sm"><XCircle className="w-5 h-5 text-red-400" /><span className="text-red-200">{error}</span></div></div>
        )}
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">🌿 CodeViz AI — Where code meets nature</div>
      </footer>

      <style jsx global>{`
        @keyframes pulse-slow { 0%,100% { opacity:0.3; } 50% { opacity:0.6; } }
        @keyframes pulse-slower { 0%,100% { opacity:0.2; } 50% { opacity:0.5; } }
        @keyframes float-particle { 0%,100% { transform: translateY(0) translateX(0); opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 100% { transform: translateY(-100vh) translateX(50px); opacity:0; } }
        @keyframes draw { 0% { stroke-dashoffset: 200; } 100% { stroke-dashoffset: 0; } }
        @keyframes draw-delayed { 0% { stroke-dashoffset: 200; } 50% { stroke-dashoffset: 200; } 100% { stroke-dashoffset: 0; } }
        @keyframes draw-slower { 0% { stroke-dashoffset: 200; } 70% { stroke-dashoffset: 200; } 100% { stroke-dashoffset: 0; } }
        @keyframes aurora { 0%,100% { filter: hue-rotate(0deg); } 50% { filter: hue-rotate(20deg); } }
        .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
        .animate-pulse-slower { animation: pulse-slower 8s ease-in-out infinite; }
        .animate-float-particle { animation: float-particle linear infinite; }
        .animate-draw { stroke-dasharray: 200; animation: draw 3s ease-out forwards; }
        .animate-draw-delayed { stroke-dasharray: 200; animation: draw-delayed 5s ease-out forwards; }
        .animate-draw-slower { stroke-dasharray: 200; animation: draw-slower 7s ease-out forwards; }
        .animate-aurora { animation: aurora 8s ease-in-out infinite; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}