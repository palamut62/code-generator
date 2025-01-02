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
  isDeleting: boolean;
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

function DeleteDialog({ isOpen, onClose, onConfirm, projectId, isDeleting }: DeleteDialogProps) {
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
            disabled={isDeleting}
            className={`px-4 py-2 rounded text-[#8b949e] hover:text-white font-mono text-sm border border-[#30363d] hover:bg-[#30363d] transition-colors ${
              isDeleting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-colors ${
              isDeleting
                ? 'bg-red-500/50 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600'
            } text-white`}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </>
            )}
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate application');
      }

      const data = await response.json();

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
      setInput('');
      setLoadingSteps('');

    } catch (error) {
      console.error('Error generating application:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate application');
      setLoadingSteps('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedProject || isDownloading) return;

    try {
      setIsDownloading(true);

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: selectedProject }),
      });

      if (!response.ok) {
        throw new Error('Failed to download project');
      }

      // Blob olarak yanıtı al
      const blob = await response.blob();

      // Download link oluştur
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code-generator-${selectedProject}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Error downloading project:', error);
      setError(error instanceof Error ? error.message : 'Failed to download project');
    } finally {
      setIsDownloading(false);
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
      setIsDeleting(true);
      setError(null);

      // Önce projeyi durdur
      try {
        await fetch('/api/stop-project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId: projectToDelete }),
        });
      } catch (error) {
        console.warn('Failed to stop project:', error);
      }

      // Sonra projeyi sil
      const response = await fetch('/api/delete-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: projectToDelete }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      // State'leri temizle
      if (selectedProject === projectToDelete) {
        setPreviewUrl(''); // Önce preview URL'ini temizle
        setSelectedProject(null);
        setFiles({});
      }

      // Projeyi listeden kaldır
      setProjects(prev => prev.filter(p => p.id !== projectToDelete));

    } catch (error) {
      console.error('Error deleting project:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete project');
    } finally {
      setIsDeleting(false);
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
    <div className="min-h-screen bg-[#0D1117] flex flex-col">
      {/* Navbar */}
      <nav className="bg-[#161b22] border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Logo" className="h-10 w-10" />
              <div className="flex flex-col">
                <h1 className="text-white text-lg font-mono">Code Generator</h1>
                {apiSettings?.model && (
                  <span className="text-[#8b949e] text-xs font-mono">
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
                disabled={!selectedProject || isDownloading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all duration-200 ${
                  !selectedProject || isDownloading
                    ? 'bg-[#21262d] text-[#8b949e] cursor-not-allowed border border-[#30363d]'
                    : 'bg-white text-black hover:bg-gray-100 hover:shadow-lg'
                }`}
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#8b949e] border-t-transparent"></div>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-4">
        {/* Input Section */}
        <div className="mb-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-lg">
            <div className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <textarea
                    value={loadingSteps || input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isGenerating}
                    placeholder="Describe your application... (e.g., Create a todo app with dark theme)"
                    rows={2}
                    className={`w-full bg-[#0d1117] text-[#c9d1d9] px-4 py-3 rounded-lg border border-[#30363d] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] font-mono text-sm resize-none placeholder:text-[#8b949e]/50 ${
                      isGenerating ? 'animate-pulse' : ''
                    }`}
                  />
                  {isGenerating && (
                    <div className="mt-2 flex items-center gap-2 text-[#58a6ff] text-xs font-mono">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                      <span>{loadingSteps}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-center">
                  <button
                    onClick={handleSubmit}
                    disabled={isGenerating || !input.trim() || !apiSettings}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm transition-all duration-200 h-[42px] ${
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
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-3 flex items-center gap-2 text-red-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-mono">{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Code and Preview Sections */}
        <div className="grid grid-cols-2 gap-4 h-[calc(100vh-220px)]">
          {/* Code Section */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-lg overflow-hidden">
            <div className="border-b border-[#30363d] bg-[#161b22]">
              <div className="flex items-center gap-2 p-3">
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
            <div className="h-[calc(100%-48px)] overflow-auto">
              {/* Monaco Editor */}
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-lg overflow-hidden">
            <div className="border-b border-[#30363d] bg-[#161b22] p-3">
              <h2 className="text-white font-mono text-sm">Preview</h2>
            </div>
            <div className="h-[calc(100%-48px)] bg-[#0d1117]">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-none"
                  title="Preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#8b949e] font-mono text-sm">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                      <span>Starting preview...</span>
                    </div>
                  ) : (
                    <span>Select a project to see the preview</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <SetupModal
        isOpen={showSetup}
        onSave={handleSaveSettings}
      />

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteDialogOpen(false);
            setProjectToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        projectId={projectToDelete || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}
