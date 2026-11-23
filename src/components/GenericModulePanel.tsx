import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ModuleItemRecord } from '../types/commerce';

interface GenericModulePanelProps {
  moduleKey: string;
  title: string;
  description: string;
  codeLabel?: string;
  codePlaceholder?: string;
  extraPlaceholder?: string;
}

export function GenericModulePanel({
  moduleKey,
  title,
  description,
  codeLabel = 'Cod / Referință',
  codePlaceholder = 'ex: COD-01 sau /ruta',
  extraPlaceholder = 'ex: {"activ": true}',
}: GenericModulePanelProps) {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<ModuleItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newStatus, setNewStatus] = useState('active');
  const [newDataJson, setNewDataJson] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/modules/${moduleKey}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la încărcare.');
      setItems(data.items ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare necunoscută.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, moduleKey]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/modules/${moduleKey}`, {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          code: newCode.trim(),
          status: newStatus,
          dataJson: newDataJson.trim() || '{}',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la salvare.');
      setNewTitle('');
      setNewCode('');
      setNewDataJson('{}');
      await loadItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: ModuleItemRecord) => {
    const nextStatus =
      item.status === 'active' || item.status === 'published'
        ? 'inactive'
        : 'active';
    await authFetch(`/api/admin/modules/${moduleKey}/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadItems();
  };

  const handleDelete = async (id: number) => {
    await authFetch(`/api/admin/modules/${moduleKey}/${id}`, {
      method: 'DELETE',
    });
    await loadItems();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-teal-900/10 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0F2928]">{title}</h2>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        </div>
        <div className="text-xs font-mono text-teal-800 tabular-nums shrink-0">
          {items.length} înregistrări în PostgreSQL
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="bg-white border border-teal-900/10 rounded-xl p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
      >
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Denumire / Titlu *
          </label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={`Adaugă element în ${title}`}
            className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {codeLabel}
          </label>
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder={codePlaceholder}
            className="w-full px-3 py-2 text-sm font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Configurație (JSON)
          </label>
          <input
            type="text"
            value={newDataJson}
            onChange={(e) => setNewDataJson(e.target.value)}
            placeholder={extraPlaceholder}
            className="w-full px-3 py-2 text-xs font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
          />
        </div>
        <div className="md:col-span-2 flex gap-2">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="px-2.5 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:border-teal-600"
            aria-label="Status"
          >
            <option value="active">Activ</option>
            <option value="draft">Ciornă</option>
            <option value="inactive">Inactiv</option>
          </select>
          <button
            type="submit"
            disabled={saving || !newTitle.trim()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adaugă</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Se încarcă datele...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nu există încă înregistrări pentru <strong>{title}</strong>. Folosește formularul de mai sus pentru a adăuga primul element.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Denumire</th>
                  <th className="py-2.5 px-4">{codeLabel}</th>
                  <th className="py-2.5 px-4">Parametri</th>
                  <th className="py-2.5 px-4">Stare</th>
                  <th className="py-2.5 px-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-900/5">
                {items.map((item) => {
                  const isOn =
                    item.status === 'active' || item.status === 'published';
                  const isUrlLike =
                    item.code.startsWith('/') || item.code.startsWith('http');
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-teal-50/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-[#0F2928]">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        <div className="inline-flex items-center gap-2">
                          <span>{item.code || '—'}</span>
                          {isUrlLike && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(item.code);
                                setCopiedId(item.id);
                                setTimeout(() => setCopiedId(null), 1500);
                              }}
                              title="Copiază referință"
                              className="p-1 text-slate-400 hover:text-teal-700"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-teal-700" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 max-w-xs truncate">
                        {item.dataJson}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                            isOn
                              ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>
                            {item.status === 'active'
                              ? 'Activ'
                              : item.status === 'published'
                              ? 'Publicat'
                              : item.status === 'draft'
                              ? 'Ciornă'
                              : 'Inactiv'}
                          </span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Șterge ${item.title}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
