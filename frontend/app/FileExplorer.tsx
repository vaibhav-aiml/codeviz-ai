'use client';

import { useState } from 'react';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, X, Copy, Check } from 'lucide-react';

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
    // Try different path variations
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
        console.log('Trying:', url);
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
    setFileContent(content || 'Unable to load file content');
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

  const getLanguageClass = (filename: string) => {
    if (filename.endsWith('.py')) return 'text-blue-400';
    if (filename.endsWith('.js') || filename.endsWith('.ts')) return 'text-yellow-400';
    if (filename.endsWith('.jsx') || filename.endsWith('.tsx')) return 'text-cyan-400';
    if (filename.endsWith('.css')) return 'text-pink-400';
    if (filename.endsWith('.html')) return 'text-orange-400';
    if (filename.endsWith('.json')) return 'text-green-400';
    if (filename.endsWith('.md')) return 'text-gray-400';
    return 'text-purple-400';
  };

  const renderTree = (path: string = '/', level: number = 0) => {
    const node = fileTree[path];
    if (!node) return null;

    const isExpanded = expandedFolders.has(path);
    const paddingLeft = level * 16;

    return (
      <div key={path}>
        {path !== '/' && (
          <div
            className="flex items-center space-x-1 py-1 px-2 hover:bg-white/5 rounded cursor-pointer text-sm"
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => toggleFolder(path)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            )}
            <span className="text-gray-300 truncate">{path.split('/').pop()}</span>
          </div>
        )}

        {isExpanded && (
          <div>
            {node.dirs.map((dir) => {
              const childPath = buildPath(path, dir);
              return renderTree(childPath, level + 1);
            })}
            
            {node.files.map((file) => {
              const filePath = buildPath(path, file);
              return (
                <div
                  key={filePath}
                  className={`flex items-center space-x-1 py-1 px-2 hover:bg-white/5 rounded cursor-pointer text-sm ${
                    selectedFile === filePath ? 'bg-blue-500/20' : ''
                  }`}
                  style={{ paddingLeft: `${(level + 1) * 16}px` }}
                  onClick={() => openFile(filePath)}
                >
                  <File className={`w-4 h-4 flex-shrink-0 ${getLanguageClass(file)}`} />
                  <span className="text-gray-300 truncate">{file}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Folder className="w-5 h-5 text-yellow-400" />
          <span>Repository Files</span>
        </h2>
        
        <div className="bg-slate-950 rounded-xl p-4 max-h-96 overflow-y-auto border border-white/5">
          {renderTree()}
        </div>
      </div>

      {fullScreen && selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <File className={`w-5 h-5 ${getLanguageClass(selectedFile)}`} />
                <span className="text-sm font-mono text-gray-300">{selectedFile}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={copyToClipboard} className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button onClick={() => setFullScreen(false)} className="p-1.5 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full mr-3"></div>
                  Loading...
                </div>
              ) : (
                <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">{fileContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}