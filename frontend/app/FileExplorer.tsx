'use client';

import { useState } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, X, Copy, Check, Terminal } from 'lucide-react';

interface FileNode {
  dirs: string[];
  files: string[];
}

interface FileTree {
  [key: string]: FileNode;
}

interface FileExplorerProps {
  fileTree: FileTree;
  analysisId: string;
  apiUrl: string;
}

export default function FileExplorer({ fileTree, analysisId, apiUrl }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const findFileContent = async (filePath: string) => {
    const variations = [
      filePath,
      filePath.replace(/^\//, ''),
      '/' + filePath.replace(/^\//, ''),
      filePath.replace(/\//g, '\\'),
      filePath.replace(/\\/g, '/'),
    ];

    for (const path of variations) {
      try {
        const url = `${apiUrl}/api/file-content/${analysisId}?path=${encodeURIComponent(path)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          return data.content;
        }
      } catch {
        continue;
      }
    }
    return null;
  };

  const openFile = async (filePath: string) => {
    setSelectedFile(filePath);
    setFullScreen(true);
    setLoading(true);
    
    const content = await findFileContent(filePath);
    setFileContent(content || '// Content unavailable or binary file.');
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildPath = (parent: string, name: string) => {
    if (parent === '/') return `/${name}`;
    return `${parent}/${name}`;
  };

  const getLanguageColor = (filename: string) => {
    if (filename.endsWith('.py')) return 'text-[#60A5FA]';
    if (filename.endsWith('.js') || filename.endsWith('.ts')) return 'text-[#FBBF24]';
    if (filename.endsWith('.jsx') || filename.endsWith('.tsx')) return 'text-[#38BDF8]';
    if (filename.endsWith('.json') || filename.endsWith('.md')) return 'text-[#C084FC]';
    return 'text-[#94A3B8]';
  };

  const renderTree = (currentPath: string = '/') => {
    const node = fileTree[currentPath];
    if (!node) return null;

    return (
      <div key={currentPath} className="space-y-0.5 text-xs font-mono">
        {node.dirs.map((dir) => {
          const fullDirPath = buildPath(currentPath, dir);
          const dirExpanded = expandedFolders.has(fullDirPath);
          return (
            <div key={fullDirPath}>
              <button
                onClick={() => toggleFolder(fullDirPath)}
                className="w-full flex items-center space-x-1.5 py-1 px-2 hover:bg-[#1A2332] text-[#E2E8F0] rounded transition-colors text-left focus-visible:ring-1 focus-visible:ring-[#6366F1]"
              >
                {dirExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                )}
                {dirExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-[#6366F1]" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-[#6366F1]" />
                )}
                <span className="truncate">{dir}</span>
              </button>
              {dirExpanded && (
                <div className="pl-4 border-l border-[#232D3F] ml-2.5 my-0.5">
                  {renderTree(fullDirPath)}
                </div>
              )}
            </div>
          );
        })}

        {node.files.map((file) => {
          const fullFilePath = buildPath(currentPath, file);
          return (
            <button
              key={fullFilePath}
              onClick={() => openFile(fullFilePath)}
              className="w-full flex items-center space-x-2 py-1 px-2 hover:bg-[#1A2332] text-[#94A3B8] hover:text-[#E2E8F0] rounded transition-colors text-left focus-visible:ring-1 focus-visible:ring-[#6366F1]"
            >
              <FileText className={`w-3.5 h-3.5 ${getLanguageColor(file)}`} />
              <span className="truncate">{file}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-[#121824] border border-[#232D3F] rounded-xl overflow-hidden font-mono text-xs">
      {/* Explorer Header */}
      <div className="px-4 py-3 bg-[#0A0E17] border-b border-[#232D3F] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-[#6366F1]" />
          <span className="font-semibold text-[#E2E8F0]">File Inspector Tree</span>
        </div>
        <span className="text-[11px] text-[#64748B]">Click file to inspect source</span>
      </div>

      {/* Tree Content */}
      <div className="p-3 max-h-96 overflow-y-auto">
        {renderTree('/')}
      </div>

      {/* Code Viewer Modal */}
      {fullScreen && selectedFile && (
        <div className="fixed inset-0 z-50 bg-[#0A0E17]/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
          <div className="bg-[#121824] border border-[#232D3F] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-[#0A0E17] border-b border-[#232D3F] flex items-center justify-between">
              <div className="flex items-center space-x-2 overflow-hidden pr-4">
                <FileText className="w-4 h-4 text-[#6366F1] flex-shrink-0" />
                <span className="font-mono text-xs text-[#E2E8F0] truncate">{selectedFile}</span>
              </div>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={copyToClipboard}
                  disabled={loading}
                  className="px-2.5 py-1.5 bg-[#1A2332] hover:bg-[#232D3F] text-[#E2E8F0] border border-[#232D3F] rounded-lg text-xs transition-colors flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#6366F1]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                
                <button
                  onClick={() => setFullScreen(false)}
                  className="p-1.5 hover:bg-[#232D3F] text-[#94A3B8] hover:text-white rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[#6366F1]"
                  title="Close Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Code Viewer Body */}
            <div className="flex-1 overflow-auto p-4 bg-[#0A0E17] font-mono text-xs leading-relaxed text-[#E2E8F0]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-[#94A3B8]">
                  <span>Fetching file contents...</span>
                </div>
              ) : (
                <pre className="whitespace-pre overflow-x-auto selection:bg-[#6366F1] selection:text-white">
                  {fileContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}