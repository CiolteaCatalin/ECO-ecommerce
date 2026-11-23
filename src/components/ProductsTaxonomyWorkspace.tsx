import { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  BrandRecord,
  CategoryRecord,
  ProductAttributeRecord,
  ProductTagRecord,
} from '../types/commerce';

export type TaxonomySubpageKey =
  | 'branduri'
  | 'categorii'
  | 'etichete'
  | 'atribute'
  | 'import-export';

interface ProductsTaxonomyWorkspaceProps {
  subpage: TaxonomySubpageKey;
  onProductsImported?: () => void;
}

function slugifyRo(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SAMPLE_CSV = `Titlu,Handle,SKU,Categorie,Pret_RON,Stoc
Aplică Perete Alabastru,aplica-perete-alabastru,APL-ALB-01,Iluminat Arhitectural,340.00,18
Scaun Birou Ergonomic Air,scaun-birou-ergonomic-air,SCA-AIR-02,Mobilier Office,1290.00,12`;

export function ProductsTaxonomyWorkspace({
  subpage,
  onProductsImported,
}: ProductsTaxonomyWorkspaceProps) {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [tags, setTags] = useState<ProductTagRecord[]>([]);
  const [attributes, setAttributes] = useState<ProductAttributeRecord[]>([]);

  // Shared create form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [extra1, setExtra1] = useState('');
  const [extra2, setExtra2] = useState('');
  const [isFilterable, setIsFilterable] = useState(true);
  const [saving, setSaving] = useState(false);

  // Import / Export state
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'json' | null>(null);

  const loadData = useCallback(async () => {
    if (subpage === 'import-export') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        subpage === 'branduri'
          ? '/api/admin/brands'
          : subpage === 'categorii'
          ? '/api/admin/categories'
          : subpage === 'etichete'
          ? '/api/admin/tags'
          : '/api/admin/attributes';
      const res = await authFetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nu s-au putut încărca datele.');
      if (subpage === 'branduri') setBrands(data.brands ?? []);
      if (subpage === 'categorii') setCategories(data.categories ?? []);
      if (subpage === 'etichete') setTags(data.tags ?? []);
      if (subpage === 'atribute') setAttributes(data.attributes ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare de conexiune.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, subpage]);

  useEffect(() => {
    setName('');
    setSlug('');
    setExtra1('');
    setExtra2('');
    setError(null);
    setNotice(null);
    loadData();
  }, [loadData, subpage]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanSlug = slugifyRo(slug.trim() || cleanName);
    if (!cleanName || !cleanSlug) {
      setError('Denumirea și slug-ul URL sunt obligatorii.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      let endpoint = '/api/admin/brands';
      let payload: Record<string, unknown> = { name: cleanName, slug: cleanSlug };
      if (subpage === 'branduri') {
        endpoint = '/api/admin/brands';
        payload = { name: cleanName, slug: cleanSlug, website: extra1.trim() };
      } else if (subpage === 'categorii') {
        endpoint = '/api/admin/categories';
        payload = {
          name: cleanName,
          slug: cleanSlug,
          parentName: extra1.trim(),
          description: extra2.trim(),
        };
      } else if (subpage === 'etichete') {
        endpoint = '/api/admin/tags';
        payload = { name: cleanName, slug: cleanSlug, description: extra1.trim() };
      } else if (subpage === 'atribute') {
        endpoint = '/api/admin/attributes';
        payload = {
          name: cleanName,
          slug: cleanSlug,
          valuesText: extra1.trim(),
          isFilterable,
        };
      }
      const res = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nu s-a putut adăuga elementul.');
      setName('');
      setSlug('');
      setExtra1('');
      setExtra2('');
      setNotice('Înregistrarea a fost salvată în PostgreSQL.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    const endpoint =
      subpage === 'branduri'
        ? `/api/admin/brands/${id}`
        : subpage === 'categorii'
        ? `/api/admin/categories/${id}`
        : subpage === 'etichete'
        ? `/api/admin/tags/${id}`
        : `/api/admin/attributes/${id}`;
    const res = await authFetch(endpoint, { method: 'DELETE' });
    if (res.ok) {
      await loadData();
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = importText.trim();
    if (!raw) return;
    setImporting(true);
    setError(null);
    setNotice(null);
    try {
      let items: Array<{
        title: string;
        handle: string;
        sku: string;
        category: string;
        basePriceCents: number;
        stockQuantity: number;
      }> = [];

      if (raw.startsWith('[') || raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : parsed.products || parsed.items || [];
        items = arr.map((row: Record<string, unknown>) => {
          const title = String(row.title || row.Titlu || '').trim();
          const handle = slugifyRo(String(row.handle || row.Handle || title));
          const priceRon = Number(row.priceRon ?? row.Pret_RON ?? 0);
          const basePriceCents =
            typeof row.basePriceCents === 'number'
              ? Math.max(0, Math.round(row.basePriceCents))
              : Math.max(0, Math.round(priceRon * 100));
          return {
            title,
            handle,
            sku: String(row.sku || row.SKU || '').trim(),
            category: String(row.category || row.Categorie || 'General').trim(),
            basePriceCents,
            stockQuantity: Math.max(
              0,
              Math.round(Number(row.stockQuantity ?? row.Stoc ?? 10))
            ),
          };
        });
      } else {
        const lines = raw
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        const startIdx =
          lines[0]?.toLowerCase().includes('titlu') ||
          lines[0]?.toLowerCase().includes('title')
            ? 1
            : 0;
        for (const line of lines.slice(startIdx)) {
          const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const title = cols[0] || '';
          if (!title) continue;
          const handle = slugifyRo(cols[1] || title);
          const sku = cols[2] || '';
          const category = cols[3] || 'General';
          const priceRon = Number(cols[4] || 100);
          const stockQuantity = Math.max(0, Math.round(Number(cols[5] || 10)));
          items.push({
            title,
            handle,
            sku,
            category,
            basePriceCents: Math.max(0, Math.round(priceRon * 100)),
            stockQuantity,
          });
        }
      }

      const validItems = items.filter((it) => it.title && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(it.handle));
      if (validItems.length === 0) {
        throw new Error('Nu s-au detectat produse valide în conținutul introdus.');
      }

      const res = await authFetch('/api/admin/import/products', {
        method: 'POST',
        body: JSON.stringify({ items: validItems.slice(0, 100) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la import.');
      setNotice(`Import finalizat: ${data.imported} produse noi adăugate în catalog (Ciornă).`);
      setImportText('');
      onProductsImported?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Format CSV / JSON invalid.');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExportingFormat(format);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/export/products?format=${format}`);
      if (!res.ok) {
        throw new Error('Exportul produselor a eșuat.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv' ? 'produse-verda.csv' : 'produse-verda.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la export.');
    } finally {
      setExportingFormat(null);
    }
  };

  if (subpage === 'import-export') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Import &amp; Export Catalog Produse
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Importă rapid produse în masă din CSV sau JSON și descarcă întregul catalog curent pentru backup sau sincronizare.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={exportingFormat !== null}
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-800 bg-[#EAF2FC] hover:bg-blue-100 border border-blue-200 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingFormat === 'csv' ? 'Se exportă...' : 'Exportă CSV'}</span>
            </button>
            <button
              type="button"
              disabled={exportingFormat !== null}
              onClick={() => handleExport('json')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingFormat === 'json' ? 'Se exportă...' : 'Exportă JSON'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-900">
            {notice}
          </div>
        )}

        <form
          onSubmit={handleImportSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Import produse din CSV sau JSON</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer">
                <span>Încarcă fișier .csv / .json</span>
                <input
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportText(await file.text());
                    }
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => setImportText(SAMPLE_CSV)}
                className="text-xs font-medium text-slate-600 hover:text-blue-700"
              >
                Încarcă exemplu CSV
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Coloane CSV suportate: <code className="font-mono text-blue-700">Titlu,Handle,SKU,Categorie,Pret_RON,Stoc</code> (maxim 100 produse per lot; produsele cu handle existent sunt sărite automat).
          </p>

          <textarea
            rows={8}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={SAMPLE_CSV}
            className="w-full p-3 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={importing || !importText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{importing ? 'Se importă...' : 'Rulează import în PostgreSQL'}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  const headerMeta: Record<
    Exclude<TaxonomySubpageKey, 'import-export'>,
    { title: string; subtitle: string; extra1Label: string; extra1Placeholder: string }
  > = {
    branduri: {
      title: 'Branduri Produse',
      subtitle: 'Gestionează producătorii și brandurile asociabile fiecărui produs din catalog.',
      extra1Label: 'Website oficial (opțional)',
      extra1Placeholder: 'https://brand.ro',
    },
    categorii: {
      title: 'Categorii Produse',
      subtitle: 'Organizează structura de categorii și subcategorii a magazinului online.',
      extra1Label: 'Categorie părinte',
      extra1Placeholder: 'ex: Iluminat sau gol pentru principală',
    },
    etichete: {
      title: 'Etichete Produse (Taguri)',
      subtitle: 'Etichete rapide pentru filtrare, promoții sau colecții (ex: Nou, B2B, Stoc Rapid).',
      extra1Label: 'Descriere scurtă',
      extra1Placeholder: 'Utilizare sau scop etichetă',
    },
    atribute: {
      title: 'Atribute & Specificații Tehnice',
      subtitle: 'Definește atribute reutilizabile (Material, Culoare, Putere, Garanție) cu valori predefinite.',
      extra1Label: 'Valori separate prin virgulă',
      extra1Placeholder: 'Stejar, Nuc, Alamă, Travertin',
    },
  };

  const meta = headerMeta[subpage];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          {meta.title}
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">{meta.subtitle}</p>
      </div>

      <form
        onSubmit={handleCreate}
        className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
      >
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Denumire *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              const v = e.target.value;
              setName(v);
              setSlug(slugifyRo(v));
            }}
            placeholder={`Nume ${subpage}`}
            className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Slug URL *
          </label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(slugifyRo(e.target.value))}
            placeholder="slug-url"
            className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>
        <div className={subpage === 'categorii' ? 'md:col-span-2' : 'md:col-span-4'}>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {meta.extra1Label}
          </label>
          <input
            type="text"
            value={extra1}
            onChange={(e) => setExtra1(e.target.value)}
            placeholder={meta.extra1Placeholder}
            className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>
        {subpage === 'categorii' && (
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Descriere
            </label>
            <input
              type="text"
              value={extra2}
              onChange={(e) => setExtra2(e.target.value)}
              placeholder="Opțional"
              className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
            />
          </div>
        )}
        <div className="md:col-span-2 flex items-center gap-2">
          {subpage === 'atribute' && (
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={isFilterable}
                onChange={(e) => setIsFilterable(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Filtru</span>
            </label>
          )}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adaugă</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-900">
          {notice}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Se încarcă datele...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4F8FD] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Denumire</th>
                  <th className="py-2.5 px-4">Slug URL</th>
                  <th className="py-2.5 px-4">Detalii / Valori</th>
                  <th className="py-2.5 px-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subpage === 'branduri' &&
                  brands.map((b) => (
                    <tr key={b.id} className="hover:bg-blue-50/30">
                      <td className="py-3 px-4 font-medium text-slate-900">{b.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-blue-700">{b.slug}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{b.website || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id)}
                          aria-label={`Șterge ${b.name}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                {subpage === 'categorii' &&
                  categories.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/30">
                      <td className="py-3 px-4 font-medium text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-blue-700">{c.slug}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {c.parentName ? `Părinte: ${c.parentName}` : 'Categorie principală'}
                        {c.description ? ` · ${c.description}` : ''}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          aria-label={`Șterge ${c.name}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                {subpage === 'etichete' &&
                  tags.map((t) => (
                    <tr key={t.id} className="hover:bg-blue-50/30">
                      <td className="py-3 px-4 font-medium text-slate-900">{t.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-blue-700">{t.slug}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{t.description || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          aria-label={`Șterge ${t.name}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                {subpage === 'atribute' &&
                  attributes.map((a) => (
                    <tr key={a.id} className="hover:bg-blue-50/30">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {a.name}{' '}
                        <span className="text-[11px] text-blue-700 font-normal">
                          {a.isFilterable ? '· Filtrabil' : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-blue-700">{a.slug}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{a.valuesText || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          aria-label={`Șterge ${a.name}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
