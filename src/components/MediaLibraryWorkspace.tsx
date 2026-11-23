import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { MediaAssetRecord } from '../types/commerce';
import { ProductImage } from './ProductImage';

interface MediaLibraryWorkspaceProps {
  pickerMode?: boolean;
  onSelectUrl?: (url: string, altText: string) => void;
}

function formatKb(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function MediaLibraryWorkspace({
  pickerMode = false,
  onSelectUrl,
}: MediaLibraryWorkspaceProps) {
  const { authFetch } = useAuth();
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [autoWebp, setAutoWebp] = useState(true);
  const [quality, setQuality] = useState(84);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/media');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nu s-a putut încărca biblioteca Media.');
      setAssets(data.assets ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare de conexiune.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const dataBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error(`Nu s-a putut citi fișierul ${file.name}`));
          reader.readAsDataURL(file);
        });
        const res = await authFetch('/api/admin/media/upload', {
          method: 'POST',
          body: JSON.stringify({
            filename: file.name,
            title: file.name.replace(/\.[^.]+$/, ''),
            altText: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
            dataBase64,
            convertToWebp: autoWebp,
            quality,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Eroare la încărcarea ${file.name}`);
        }
      }
      await loadAssets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la încărcare.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConvertWebp = async (id: number) => {
    setConvertingId(id);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/media/${id}/convert-webp`, {
        method: 'POST',
        body: JSON.stringify({ quality }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la conversie WebP.');
      await loadAssets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la conversie WebP.');
    } finally {
      setConvertingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    await authFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
    await loadAssets();
  };

  const handleCopy = (url: string) => {
    const full = url.startsWith('http')
      ? url
      : `${window.location.origin}${url}`;
    navigator.clipboard?.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1600);
    void full;
  };

  const visible = assets.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.originalFilename.toLowerCase().includes(q) ||
      a.url.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {!pickerMode && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Bibliotecă Media &amp; Optimizare WebP
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Încarcă imagini, obține linkuri interne permanente pentru produse sau pagini HTML și convertește orice imagine la WebP la cerere.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAssets}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-[#F4F8FD] hover:bg-blue-50 border border-slate-200 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualizează</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Se încarcă...' : 'Încarcă imagini'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload & WebP Controls */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFilesSelected(e.dataTransfer.files);
        }}
        className="bg-white border border-dashed border-blue-300 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#EAF2FC] text-blue-600 flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Trage imagini aici sau selectează fișiere (JPG, PNG, WebP, AVIF — max 8 MB)
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Linkurile interne generate (<code className="font-mono text-blue-700">/media/...</code>) funcționează direct în Catalog, Pagini HTML și Blog.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoWebp}
              onChange={(e) => setAutoWebp(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Generează și WebP automat la upload</span>
          </label>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Calitate WebP:</span>
            <input
              type="number"
              min={40}
              max={100}
              value={quality}
              onChange={(e) =>
                setQuality(Math.max(40, Math.min(100, Number(e.target.value) || 84)))
              }
              className="w-16 px-2 py-1 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded"
            />
            <span>%</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-[#EAF2FC] hover:bg-blue-100 border border-blue-200 rounded-lg"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Se procesează...' : 'Selectează fișiere'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-medium text-slate-600 font-mono tabular-nums">
            {visible.length} fișiere media în bibliotecă
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută după nume sau link intern..."
            className="sm:w-72 px-3 py-1.5 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-500">Se încarcă biblioteca media...</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nu există imagini care să corespundă căutării. Încarcă prima imagine mai sus.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4F8FD] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Previzualizare</th>
                  <th className="py-2.5 px-4">Fișier &amp; Dimensiuni</th>
                  <th className="py-2.5 px-4">Link intern original</th>
                  <th className="py-2.5 px-4">Versiune WebP</th>
                  <th className="py-2.5 px-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((asset) => {
                  const hasWebp = Boolean(asset.webpUrl);
                  const savingsPct =
                    hasWebp && asset.sizeBytes > 0
                      ? Math.round(
                          ((asset.sizeBytes - asset.webpSizeBytes) / asset.sizeBytes) * 100
                        )
                      : 0;

                  return (
                    <tr key={asset.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <ProductImage
                          src={asset.webpUrl || asset.url}
                          alt={asset.altText || asset.title}
                          className="w-14 h-14 rounded-lg border border-slate-200 shrink-0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-slate-900">
                          {asset.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                          {asset.width} × {asset.height} px · {formatKb(asset.sizeBytes)} ·{' '}
                          {asset.mimeType}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <code className="text-[11px] font-mono text-slate-700 bg-[#F4F8FD] px-2 py-1 rounded border border-slate-200 max-w-[230px] truncate">
                            {asset.url}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(asset.url)}
                            title="Copiază link intern original"
                            className="p-1.5 text-slate-500 hover:text-blue-700 border border-slate-200 rounded-md bg-white"
                          >
                            {copiedUrl === asset.url ? (
                              <Check className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {pickerMode && onSelectUrl && (
                            <button
                              type="button"
                              onClick={() => onSelectUrl(asset.url, asset.altText || asset.title)}
                              className="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 whitespace-nowrap"
                            >
                              Alege original
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {hasWebp ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <code className="text-[11px] font-mono text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200 max-w-[220px] truncate">
                                {asset.webpUrl}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopy(asset.webpUrl)}
                                title="Copiază link WebP"
                                className="p-1.5 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md bg-white"
                              >
                                {copiedUrl === asset.webpUrl ? (
                                  <Check className="w-3.5 h-3.5 text-blue-700" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {pickerMode && onSelectUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSelectUrl(asset.webpUrl, asset.altText || asset.title)
                                  }
                                  className="px-2 py-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded whitespace-nowrap"
                                >
                                  Alege WebP
                                </button>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-emerald-700 tabular-nums">
                              {formatKb(asset.webpSizeBytes)}
                              {savingsPct > 0 ? ` (-${savingsPct}% dimensiune)` : ''}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={convertingId === asset.id}
                            onClick={() => handleConvertWebp(asset.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-[#EAF2FC] hover:bg-blue-100 border border-blue-200 rounded-lg disabled:opacity-50 whitespace-nowrap"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {convertingId === asset.id
                                ? 'Se convertește...'
                                : 'Convertește la WebP'}
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {hasWebp && (
                            <button
                              type="button"
                              disabled={convertingId === asset.id}
                              onClick={() => handleConvertWebp(asset.id)}
                              title="Regenerează WebP la calitatea curentă"
                              className="p-1.5 text-slate-500 hover:text-blue-700 border border-slate-200 rounded-md"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(asset.id)}
                            aria-label={`Șterge ${asset.title}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
