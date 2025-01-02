'use client';

import { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface Project {
  id: string;
  port: number;
  files: Record<string, string>;
}

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectId: string;
}

interface ApiSettings {
  apiKey: string;
  model: string;
}

interface SetupModalProps {
  isOpen: boolean;
  onSave: (settings: ApiSettings) => void;
  initialSettings?: ApiSettings;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Çeşitli görevler için yeni nesil özellikler, hız ve çoklu formatlı oluşturma' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Çeşitli görevlerde hızlı ve çok yönlü performans' },
  { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B', description: 'Yüksek hacimli ve düşük zeka gerektiren görevler' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Daha fazla zeka gerektiren karmaşık akıl yürütme görevleri' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro (15.02.2025\'te desteği sonlanacak)', description: 'Doğal dil görevleri, çok dönüşlü metin ve kod sohbeti ve kod oluşturma' },
  { id: 'text-embedding-004', name: 'Text Embedding', description: 'Metin dizelerinin alaka düzeyini ölçme' },
  { id: 'aqa', name: 'AQA', description: 'Sorulara kaynak temelli yanıtlar verme' },
];

function DeleteDialog({ isOpen, onClose, onConfirm, projectId }: DeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-white text-lg font-mono mb-4">Delete Project</h2>
        <p className="text-[#8b949e] font-mono mb-6">
          Are you sure you want to delete Project {projectId}? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-[#8b949e] hover:text-white font-mono text-sm border border-[#30363d] hover:bg-[#30363d]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-mono text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupModal({ isOpen, onSave, initialSettings }: SetupModalProps) {
  const [apiKey, setApiKey] = useState(initialSettings?.apiKey || '');
  const [selectedModel, setSelectedModel] = useState(initialSettings?.model || AVAILABLE_MODELS[0].id);
  const [error, setError] = useState('');

  // Modal açıldığında mevcut ayarları yükle
  useEffect(() => {
    if (initialSettings) {
      setApiKey(initialSettings.apiKey);
      setSelectedModel(initialSettings.model);
    }
  }, [initialSettings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    if (!apiKey.startsWith('AIza')) {
      setError('Invalid API Key format');
      return;
    }

    onSave({
      apiKey: apiKey.trim(),
      model: selectedModel,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-white text-lg font-mono mb-6">
          {initialSettings ? 'Update Settings' : 'Setup Required'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[#8b949e] font-mono text-sm mb-2">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError('');
              }}
              placeholder="Enter your API key..."
              className="w-full bg-[#0d1117] text-[#c9d1d9] px-4 py-2 rounded border border-[#30363d] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-[#8b949e] font-mono text-sm mb-2">
              Select Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-[#0d1117] text-[#c9d1d9] px-4 py-2 rounded border border-[#30363d] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] font-mono text-sm"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-red-400 font-mono text-sm">{error}</p>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSubmit}
              className="px-6 py-2 rounded bg-[#238636] text-white font-mono text-sm hover:bg-[#2ea043] transition-colors"
            >
              {initialSettings ? 'Update' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [loadingSteps, setLoadingSteps] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [apiSettings, setApiSettings] = useState<ApiSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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

  useEffect(() => {
    // Local storage'dan ayarları kontrol et
    const savedSettings = localStorage.getItem('apiSettings');
    if (savedSettings) {
      setApiSettings(JSON.parse(savedSettings));
    } else {
      setShowSetup(true);
    }
  }, []);

  const handleSaveSettings = (settings: ApiSettings) => {
    localStorage.setItem('apiSettings', JSON.stringify(settings));
    setApiSettings(settings);
    setShowSetup(false);
  };

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
    if (!input.trim() || isGenerating || !apiSettings) return;

    try {
      setIsGenerating(true);
      setError(null);
      setLoadingSteps('Generating code...');

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          input,
          apiKey: apiSettings.apiKey,
          model: apiSettings.model
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate application');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setLoadingSteps('Installing dependencies...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setLoadingSteps('Starting development server...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setLoadingSteps('Preparing preview...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProjects(prev => [...prev, {
        id: data.projectId,
        port: data.port,
        files: data.files
      }]);

      setSelectedProject(data.projectId);
      setFiles(data.files);
      setPreviewUrl(`http://localhost:${data.port}`);
      setInput(''); // Input'u temizle
      setLoadingSteps(''); // Loading mesajını temizle

    } catch (error) {
      console.error('Error generating application:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate application');
      setLoadingSteps('');
    } finally {
      setIsGenerating(false);
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

  // Proje silme işlevi
  const handleDeleteProject = async (projectId: string) => {
    setProjectToDelete(projectId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/delete-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: projectToDelete }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Projeyi listeden kaldır
      setProjects(projects.filter(p => p.id !== projectToDelete));

      // Eğer silinen proje seçili olan projeyse, seçimi temizle
      if (selectedProject === projectToDelete) {
        setSelectedProject(null);
        setFiles({});
        setPreviewUrl('');
      }

    } catch (error) {
      console.error('Error deleting project:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete project');
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  // Seçilen modelin adını bul
  const getSelectedModelName = () => {
    if (!apiSettings?.model) return '';
    const model = AVAILABLE_MODELS.find(m => m.id === apiSettings.model);
    return model ? model.name : '';
  };

  // Settings modal için güncelleme fonksiyonu
  const handleUpdateSettings = (settings: ApiSettings) => {
    localStorage.setItem('apiSettings', JSON.stringify(settings));
    setApiSettings(settings);
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Navbar */}
      <nav className="bg-[#161b22] border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Logo" className="h-12 w-12" />
              <div className="flex flex-col">
                <h1 className="text-white text-xl font-mono">Code Generator</h1>
                {apiSettings?.model && (
                  <span className="text-[#8b949e] text-sm font-mono">
                    Using {getSelectedModelName()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-all duration-200"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <button
                onClick={handleDownload}
                disabled={!selectedProject}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all duration-200 ${
                  selectedProject
                    ? 'bg-white text-black hover:bg-gray-100 hover:shadow-lg'
                    : 'bg-[#21262d] text-[#8b949e] cursor-not-allowed border border-[#30363d]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Project
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-12 py-6">
        {/* Input Section */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="relative">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <textarea
                  value={loadingSteps || input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isGenerating}
                  placeholder="Describe your application... (e.g., Create a todo app with dark theme)"
                  rows={3}
                  className={`w-full bg-[#161b22] text-[#c9d1d9] px-4 py-3 rounded-lg border border-[#30363d] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] font-mono text-sm resize-none ${
                    isGenerating ? 'animate-pulse' : ''
                  }`}
                />
                {isGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#161b22] bg-opacity-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#58a6ff] border-t-transparent"></div>
                      <span className="text-[#58a6ff] font-mono text-sm">{loadingSteps}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isGenerating || !input.trim() || !apiSettings}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm transition-all duration-200 ${
                    isGenerating || !input.trim() || !apiSettings
                      ? 'bg-[#21262d] text-[#8b949e] cursor-not-allowed'
                      : 'bg-[#238636] text-white hover:bg-[#2ea043] shadow-lg hover:shadow-xl hover:shadow-[#238636]/20'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Generate Application</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
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
                <div className="flex items-center gap-2">
                  <select
                    value={selectedProject || ''}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="flex-1 bg-[#0d1117] text-[#8b949e] px-3 py-1.5 rounded border border-[#30363d] text-sm font-mono focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        Project {project.id}
                      </option>
                    ))}
                  </select>
                  {selectedProject && (
                    <button
                      onClick={() => handleDeleteProject(selectedProject)}
                      disabled={loading}
                      className={`text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-[#1f2428] ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Delete project"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
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

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        projectId={projectToDelete || ''}
      />
      
      <SetupModal
        isOpen={showSetup}
        onSave={handleSaveSettings}
      />

      {apiSettings && (
        <SetupModal
          isOpen={showSettings}
          onSave={handleUpdateSettings}
          initialSettings={apiSettings}
        />
      )}
    </div>
  );
}
