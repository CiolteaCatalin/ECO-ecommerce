import { useEffect, useState } from 'react';
import { Check, Copy, FileCode2, FolderTree } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { BlueprintFile } from '../types/commerce';

export function BlueprintViewer() {
  const { authFetch } = useAuth();
  const [files, setFiles] = useState<BlueprintFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch('/api/admin/blueprint-files');
        if (!res.ok) {
          throw new Error('Nu s-au putut încărca fișierele Medusa v2.');
        }
        const data = await res.json();
        if (active) {
          setFiles(data.files ?? []);
          if (data.files?.length > 0) {
            setSelectedPath(data.files[0].path);
          }
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Eroare la încărcare');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [authFetch]);

  const activeFile = files.find((f) => f.path === selectedPath) ?? files[0];

  const handleCopy = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <div className="bg-white border border-teal-900/10 rounded-xl p-8 text-sm text-slate-500">
        Se încarcă fișierele modulului Medusa v2...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-teal-900/10 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0F2928]">
            Structură Modul Custom Medusa v2 (pentru GitHub)
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Aceste fișiere sunt generate în folderul <span className="font-mono text-teal-800">/medusa-v2</span> al proiectului și includ modelele DML, link-urile de modul, workflow-ul cu rollback, rutele Admin/Store API și configurația Docker Compose.
          </p>
        </div>
        <div className="text-xs font-mono text-teal-800 tabular-nums shrink-0">
          {files.length} fișiere generate
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white border border-teal-900/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-teal-900/10 flex items-center gap-2 text-xs font-medium text-slate-600">
            <FolderTree className="w-4 h-4 text-teal-600" />
            <span>Arbore Fișiere</span>
          </div>
          <div className="divide-y divide-teal-900/5 max-h-[540px] overflow-y-auto">
            {files.map((file) => {
              const isActive = file.path === activeFile?.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-xs font-mono transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-700 hover:bg-teal-50/70'
                  }`}
                >
                  <FileCode2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-teal-100' : 'text-teal-600'
                    }`}
                  />
                  <span className="truncate">{file.path}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border border-teal-900/10 rounded-xl overflow-hidden">
          {activeFile ? (
            <>
              <div className="px-4 py-3 border-b border-teal-900/10 flex items-center justify-between gap-4">
                <span className="text-xs font-mono text-slate-700 truncate">
                  {activeFile.path}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-teal-700" />
                      <span>Copiat</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiază fișierul</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono leading-relaxed text-[#0F2928] bg-[#F7FBFA] overflow-x-auto max-h-[540px] overflow-y-auto">
                <code>{activeFile.content}</code>
              </pre>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
