'use client';

import { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface Project {
  id: string;
  port: number;
  files: Record<string, string>;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState('src/app/page.tsx');
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Mevcut projeleri yükle
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        setProjects(data.projects);
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    loadProjects();
  }, []);

  // Proje değiştiğinde dosyaları ve önizlemeyi güncelle
  const handleProjectChange = async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedProject(projectId);
      
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setFiles(project.files);
        setProjectId(project.id);

        // Projeyi başlat
        const response = await fetch('/api/start-project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            projectId: project.id,
            port: project.port
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to start project');
        }

        setPreviewUrl(`http://localhost:${project.port}`);
      }
    } catch (error) {
      console.error('Error changing project:', error);
      setError(error instanceof Error ? error.message : 'Failed to change project');
    } finally {
      setLoading(false);
    }
  };

  // Preview'ı yenile ve projeyi yeniden başlat
  const handleRefresh = async () => {
    if (!projectId || !selectedProject) return;

    try {
      setLoading(true);
      setError(null);

      const project = projects.find(p => p.id === selectedProject);
      if (!project) return;

      // Projeyi yeniden başlat
      const response = await fetch('/api/start-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          projectId: project.id,
          port: project.port
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to restart project');
      }

      // iframe'i yenile
      const iframe = document.querySelector('iframe');
      if (iframe) {
        iframe.src = `http://localhost:${project.port}`;
      }
    } catch (error) {
      console.error('Error refreshing preview:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
      }
      
      setFiles(data.files);
      setProjectId(data.projectId);
      setPreviewUrl(`http://localhost:${data.port}`);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!projectId) return;

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Blob olarak yanıtı al
      const blob = await response.blob();
      
      // Download link oluştur
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code-generator-${projectId}.zip`;
      
      // Tıklama olayını tetikle
      document.body.appendChild(a);
      a.click();
      
      // Temizlik
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download project');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Header */}
      <header className="flex justify-between items-center px-12 py-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Code Generator" className="h-8" />
          <span className="text-white text-base font-mono">Code Generator</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-[#1a1e24] to-[#1B222C] text-[#8b949e] px-4 py-2 rounded-full text-sm font-mono border border-[#30363d]">
            Powered by Google Gemini 1.5 Flash
          </div>
          <button
            onClick={handleDownload}
            disabled={!projectId}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono ${
              projectId
                ? 'bg-white text-black hover:bg-gray-100'
                : 'bg-[#21262d] text-[#8b949e] cursor-not-allowed border border-[#30363d]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Project
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-12 py-6">
        {/* Input Section */}
        <div className="relative mb-8">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmit()}
            placeholder="Make changes to your app..."
            className="w-full bg-[#0d1117] text-white px-4 py-3 rounded-full border border-[#30363d] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] font-mono text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-[#1f2428]"
          >
            <svg className="w-5 h-5 text-[#8b949e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-[#ff000020] border border-[#ff000040] rounded-lg p-4 mb-8 text-[#ff6b6b] font-mono text-sm">
            {error}
          </div>
        )}

        {/* Code and Preview Sections */}
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 border-b border-[#30363d]">
              <div className="flex items-center gap-2">
                <span className="text-white font-mono text-sm">Code</span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(files[selectedFile] || '')}
                className="text-[#8b949e] hover:text-white p-1 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col h-[500px]">
              {/* Project Selection */}
              <div className="px-4 py-2 border-b border-[#30363d] bg-[#161b22]">
                <select
                  value={selectedProject || ''}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full bg-[#0d1117] text-[#8b949e] px-3 py-1.5 rounded border border-[#30363d] text-sm font-mono focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      Project {project.id}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Sidebar and Editor */}
              <div className="flex flex-1">
                {/* Sidebar */}
                <div className="w-64 border-r border-[#30363d] overflow-y-auto bg-[#0d1117]">
                  <div className="p-2">
                    {Object.keys(files).map((file) => (
                      <button
                        key={file}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left px-3 py-2 rounded text-sm font-mono ${
                          selectedFile === file
                            ? 'bg-[#1f2428] text-white'
                            : 'text-[#8b949e] hover:bg-[#1f2428] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate">{file}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Editor */}
                <div className="flex-1">
                  <Editor
                    height="100%"
                    defaultLanguage="typescript"
                    theme="vs-dark"
                    value={files[selectedFile] || ''}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                      readOnly: true,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      renderLineHighlight: 'all',
                      padding: { top: 16, bottom: 16 },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 border-b border-[#30363d]">
              <span className="text-white font-mono text-sm">Preview</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading || !selectedProject}
                  className={`text-[#8b949e] hover:text-white p-1 rounded ${
                    loading || !selectedProject ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button className="text-[#8b949e] hover:text-white p-1 rounded">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-[500px] bg-white">
              {previewUrl ? (
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  className="w-full h-full"
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#8b949e] font-mono text-sm">
                  {loading ? 'Starting preview...' : 'Select a project to see the preview'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-between items-center text-[#8b949e] font-mono text-sm">
          <div className="flex items-center gap-2">
            <span>← Version: 1 / 1 →</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>2293.33 tokens</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>1032 token/s</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>0.45s</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
