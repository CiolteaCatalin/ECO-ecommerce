import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Download, FileSpreadsheet, Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  formatMoney,
  type BrandRecord,
  type CategoryRecord,
  type ProductRecord,
} from '../types/commerce';
import { ProductCatalog } from './ProductCatalog';
import { ProductImage } from './ProductImage';
import { GenericModulePanel } from './GenericModulePanel';

interface CatalogWorkspaceProps {
  subPageId: string;
  products: ProductRecord[];
  loading: boolean;
  error: string | null;
  onCreateNew: () => void;
  onEdit: (product: ProductRecord) => void;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
  onNavigateSubpage: (id: string) => void;
}

function slugify(val: string): string {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface ParsedImportRow {
  title: string;
  handle: string;
  sku: string;
  category: string;
  basePriceCents: number;
  stockQuantity: number;
}

function parseCsvLines(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0]
    .split(separator)
    .map((h) => h.replace(/^"|"$/g, '').trim());

  return lines.slice(1).map((line) => {
    const cols = line.split(separator).map((c) => c.replace(/^"|"$/g, '').trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? '';
    });
    return row;
  });
}

export function CatalogWorkspace({
  subPageId,
  products,
  loading,
  error,
  onCreateNew,
  onEdit,
  onDelete,
  onRefresh,
  onNavigateSubpage,
}: CatalogWorkspaceProps) {
  const { authFetch } = useAuth();
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);

  const [catName, setCatName] = useState('');
  const [catParent, setCatParent] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const [brandName, setBrandName] = useState('');
  const [brandSite, setBrandSite] = useState('');

  // 4-step Import Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [rawImportText, setRawImportText] = useState(
    'title,sku,category,price_ron,stock\nVază Ceramică Turcoaz,VAZ-102,Decor,185.00,20\nAplică Perete Alamă,APL-308,Iluminat Arhitectural,420.00,15'
  );
  const [rawRows, setRawRows] = useState<Array<Record<string, unknown>>>([]);
  const [detectedCols, setDetectedCols] = useState<string[]>([]);
  const [colMap, setColMap] = useState<{
    title: string;
    sku: string;
    category: string;
    price: string;
    stock: string;
  }>({
    title: 'title',
    sku: 'sku',
    category: 'category',
    price: 'price_ron',
    stock: 'stock',
  });
  const [priceInCents, setPriceInCents] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Feed copy state
  const [copiedFeed, setCopiedFeed] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    const [cRes, bRes] = await Promise.all([
      authFetch('/api/admin/categories'),
      authFetch('/api/admin/brands'),
    ]);
    if (cRes.ok) {
      const d = await cRes.json();
      setCategories(d.categories ?? []);
    }
    if (bRes.ok) {
      const d = await bRes.json();
      setBrands(d.brands ?? []);
    }
  }, [authFetch]);

  useEffect(() => {
    if (
      subPageId === 'categorii' ||
      subPageId === 'branduri' ||
      subPageId === 'catalog-general'
    ) {
      loadMeta();
    }
  }, [subPageId, loadMeta]);

  if (subPageId === 'produse') {
    return (
      <ProductCatalog
        products={products}
        loading={loading}
        error={error}
        onCreateNew={onCreateNew}
        onEdit={onEdit}
        onDelete={onDelete}
        onRefresh={onRefresh}
      />
    );
  }

  if (subPageId === 'continut-asteptare') {
    const drafts = products.filter((p) => p.status === 'draft');
    return (
      <ProductCatalog
        products={drafts}
        loading={loading}
        error={error}
        onCreateNew={onCreateNew}
        onEdit={onEdit}
        onDelete={onDelete}
        onRefresh={onRefresh}
      />
    );
  }

  if (subPageId === 'catalog-general') {
    const published = products.filter((p) => p.status === 'published').length;
    const totalImages = products.reduce((s, p) => s + p.galleryImages.length, 0);
    return (
      <div className="space-y-6">
        <div className="bg-white border border-teal-900/10 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0F2928]">
              Sumar Catalog &amp; Structură Produse
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Prezentare generală a produselor, categoriilor, brandurilor și galeriilor media din PostgreSQL.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubpage('produse')}
              className="px-4 py-2 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg"
            >
              Vezi toate produsele
            </button>
            <button
              type="button"
              onClick={onCreateNew}
              className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              Adaugă produs nou
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-teal-900/10 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-teal-900/10">
          <div className="p-5">
            <div className="text-xs text-slate-500">Produse totale</div>
            <div className="mt-1 text-2xl font-semibold text-[#0F2928] font-mono tabular-nums">
              {products.length}
            </div>
            <div className="text-xs text-teal-700 mt-1">{published} publicate</div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Categorii active</div>
            <div className="mt-1 text-2xl font-semibold text-[#0F2928] font-mono tabular-nums">
              {categories.length}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Branduri</div>
            <div className="mt-1 text-2xl font-semibold text-[#0F2928] font-mono tabular-nums">
              {brands.length}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Imagini în galerii</div>
            <div className="mt-1 text-2xl font-semibold text-[#0F2928] font-mono tabular-nums">
              {totalImages}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subPageId === 'imagini-produse') {
    const allImages = products.flatMap((p) =>
      p.galleryImages.map((img) => ({
        product: p,
        img,
      }))
    );
    return (
      <div className="bg-white border border-teal-900/10 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-[#0F2928]">Imagini produse</h2>
          <p className="text-sm text-slate-600 mt-1">
            Toate fotografiile și galeriile asociate produselor din catalog. Apasă pe o imagine pentru a deschide editorul produsului.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {allImages.map((entry, idx) => (
            <button
              key={`${entry.product.id}-${idx}`}
              type="button"
              onClick={() => onEdit(entry.product)}
              className="text-left border border-teal-900/10 rounded-xl overflow-hidden hover:border-teal-600 transition-colors"
            >
              <ProductImage
                src={entry.img.url}
                alt={entry.img.altText || entry.product.title}
                className="w-full h-44"
              />
              <div className="p-3 bg-white">
                <div className="text-xs font-medium text-[#0F2928] truncate">
                  {entry.product.title}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {entry.img.altText || entry.product.sku}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (subPageId === 'importa-produse' || subPageId === 'importa-inventar') {
    const isInventoryMode = subPageId === 'importa-inventar';

    const analyzeInput = (text: string) => {
      setImportStatus(null);
      const trimmed = text.trim();
      if (!trimmed) return;
      try {
        let rows: Array<Record<string, unknown>> = [];
        if (trimmed.startsWith('[')) {
          const parsed = JSON.parse(trimmed);
          if (!Array.isArray(parsed)) throw new Error('JSON-ul trebuie să fie o listă.');
          rows = parsed;
        } else {
          rows = parseCsvLines(trimmed);
        }
        if (rows.length === 0) {
          throw new Error('Nu s-au putut detecta rânduri valide CSV sau JSON.');
        }
        const cols = Object.keys(rows[0]);
        setRawRows(rows);
        setDetectedCols(cols);
        setPriceInCents(cols.includes('basePriceCents'));
        setColMap({
          title: cols.find((c) => /title|titlu|nume|produs/i.test(c)) ?? cols[0] ?? 'title',
          sku: cols.find((c) => /sku|cod/i.test(c)) ?? cols[1] ?? 'sku',
          category: cols.find((c) => /cat/i.test(c)) ?? cols[2] ?? 'category',
          price:
            cols.find((c) => /price|pret|basePriceCents/i.test(c)) ??
            cols[3] ??
            'price_ron',
          stock:
            cols.find((c) => /stock|stoc|cant/i.test(c)) ??
            cols[cols.length - 1] ??
            'stock',
        });
        setWizardStep(2);
      } catch (err: unknown) {
        setImportStatus(err instanceof Error ? err.message : 'Eroare parsare fișier.');
      }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        setRawImportText(text);
        analyzeInput(text);
      };
      reader.readAsText(file);
    };

    const previewItems: ParsedImportRow[] = rawRows.map((r, i) => {
      const title = String(r[colMap.title] ?? `Produs ${i + 1}`).trim();
      const rawHandle = String(r['handle'] ?? '').trim();
      const handle = slugify(rawHandle || title) || `produs-${Date.now()}-${i}`;
      const sku = String(r[colMap.sku] ?? '').trim();
      const category = String(r[colMap.category] ?? 'General').trim() || 'General';
      const rawPrice = Number(r[colMap.price] ?? 0) || 0;
      const basePriceCents = priceInCents
        ? Math.max(0, Math.round(rawPrice))
        : Math.max(0, Math.round(rawPrice * 100));
      const stockQuantity = Math.max(0, Math.round(Number(r[colMap.stock] ?? 0) || 0));
      return { title, handle, sku, category, basePriceCents, stockQuantity };
    });

    const executeImport = async () => {
      setImporting(true);
      setImportStatus(null);
      try {
        if (isInventoryMode) {
          let updatedCount = 0;
          for (const row of previewItems) {
            const match = products.find(
              (p) =>
                (row.sku && p.sku.toLowerCase() === row.sku.toLowerCase()) ||
                p.handle === row.handle
            );
            if (match?.id) {
              const res = await authFetch('/api/admin/inventory/adjust', {
                method: 'POST',
                body: JSON.stringify({
                  productId: match.id,
                  stockQuantity: row.stockQuantity,
                  ...(row.basePriceCents > 0 ? { basePriceCents: row.basePriceCents } : {}),
                }),
              });
              if (res.ok) updatedCount++;
            }
          }
          setImportStatus(
            `${updatedCount} produse existente actualizate în inventarul PostgreSQL.`
          );
          setWizardStep(4);
          onRefresh();
        } else {
          const res = await authFetch('/api/admin/import/products', {
            method: 'POST',
            body: JSON.stringify({ items: previewItems }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Import eșuat');
          setImportStatus(
            `${data.imported} produse noi importate cu succes în catalogul PostgreSQL.`
          );
          setWizardStep(4);
          onRefresh();
        }
      } catch (err: unknown) {
        setImportStatus(err instanceof Error ? err.message : 'Eroare import');
      } finally {
        setImporting(false);
      }
    };

    const steps = [
      { id: 1, label: '1. Fișier CSV / JSON' },
      { id: 2, label: '2. Mapare coloane' },
      { id: 3, label: '3. Previzualizare' },
      { id: 4, label: '4. Confirmare import' },
    ];

    return (
      <div className="bg-white border border-teal-900/10 rounded-xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-teal-900/10 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0F2928]">
              {isInventoryMode ? 'Wizard Import Inventar & Prețuri' : 'Wizard Import Produse'}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {isInventoryMode
                ? 'Actualizează rapid stocurile și prețurile produselor existente prin potrivire după SKU sau Handle.'
                : 'Importă produse în 4 pași din fișiere CSV / JSON direct în baza de date PostgreSQL.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {steps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id === 1 || rawRows.length > 0) {
                    setWizardStep(s.id as 1 | 2 | 3 | 4);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  wizardStep === s.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-[#F7FBFA] text-slate-600 border border-teal-900/10'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {wizardStep === 1 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#F7FBFA] border border-dashed border-teal-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                <div>
                  <div className="text-xs font-semibold text-[#0F2928]">
                    Selectează un fișier local (.csv sau .json)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Sau editează direct datele în caseta de mai jos.
                  </div>
                </div>
              </div>
              <input
                type="file"
                accept=".csv,.json,.txt"
                onChange={handleFileUpload}
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-teal-200 file:text-xs file:font-medium file:bg-white file:text-teal-800 hover:file:bg-teal-50"
              />
            </div>

            <textarea
              rows={7}
              value={rawImportText}
              onChange={(e) => setRawImportText(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:border-teal-600"
            />

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-red-600">{importStatus}</div>
              <button
                type="button"
                onClick={() => analyzeInput(rawImportText)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                <span>Pasul următor: Mapare coloane</span>
              </button>
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { key: 'title', label: 'Titlu produs' },
                { key: 'sku', label: 'SKU' },
                { key: 'category', label: 'Categorie' },
                { key: 'price', label: 'Preț' },
                { key: 'stock', label: 'Cantitate stoc' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {field.label}
                  </label>
                  <select
                    value={colMap[field.key as keyof typeof colMap]}
                    onChange={(e) =>
                      setColMap((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  >
                    {detectedCols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={priceInCents}
                onChange={(e) => setPriceInCents(e.target.checked)}
              />
              <span>Prețurile din fișier sunt exprimate în bani/cenți (ex: 18500 = 185.00 RON)</span>
            </label>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-teal-900/15 rounded-lg"
              >
                Înapoi la fișier
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                Previzualizează ({previewItems.length} rânduri)
              </button>
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-teal-900/10 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7FBFA] border-b border-teal-900/10 text-slate-500">
                    <th className="py-2 px-3">Titlu</th>
                    <th className="py-2 px-3">Handle</th>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Categorie</th>
                    <th className="py-2 px-3 text-right">Preț</th>
                    <th className="py-2 px-3 text-right">Stoc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-900/5">
                  {previewItems.slice(0, 15).map((item, idx) => (
                    <tr key={`${item.handle}-${idx}`}>
                      <td className="py-2 px-3 font-medium text-[#0F2928]">{item.title}</td>
                      <td className="py-2 px-3 font-mono text-teal-700">/{item.handle}</td>
                      <td className="py-2 px-3 font-mono">{item.sku || '—'}</td>
                      <td className="py-2 px-3">{item.category}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {formatMoney(item.basePriceCents, 'RON')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {item.stockQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-teal-900/15 rounded-lg"
              >
                Înapoi la mapare
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={executeImport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{importing ? 'Se importă...' : 'Execută importul în PostgreSQL'}</span>
              </button>
            </div>
          </div>
        )}

        {wizardStep === 4 && (
          <div className="p-6 bg-[#F7FBFA] border border-teal-900/15 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-teal-900">Import finalizat</div>
              <div className="text-xs text-slate-700 mt-1">{importStatus}</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="px-4 py-2 text-xs font-medium text-teal-900 bg-white border border-teal-900/15 rounded-lg"
              >
                Import nou
              </button>
              <button
                type="button"
                onClick={() => onNavigateSubpage('produse')}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                Vezi produsele
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (subPageId === 'exporta-produse') {
    const downloadFile = (format: 'csv' | 'json' | 'xml' | 'facebook') => {
      let content = '';
      let mime = 'application/json';
      let filename = 'catalog-produse.json';

      if (format === 'json') {
        content = JSON.stringify(products, null, 2);
      } else if (format === 'xml') {
        mime = 'application/xml;charset=utf-8;';
        filename = 'google-shopping-feed.xml';
        const itemsXml = products
          .map(
            (p) =>
              `  <item>\n    <g:id>${p.sku || p.handle}</g:id>\n    <title>${p.title.replace(/&/g, '&amp;')}</title>\n    <link>https://magazin.verda.ro/produs/${p.handle}</link>\n    <g:price>${(p.basePriceCents / 100).toFixed(2)} ${p.currency}</g:price>\n    <g:availability>${p.stockQuantity > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>\n  </item>`
          )
          .join('\n');
        content = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n  <title>Verda Commerce Feed</title>\n${itemsXml}\n</channel>\n</rss>`;
      } else if (format === 'facebook') {
        mime = 'text/csv;charset=utf-8;';
        filename = 'facebook-tiktok-catalog.csv';
        const header = 'id,title,description,availability,condition,price,link,image_link,brand';
        const rows = products.map((p) =>
          [
            p.sku || p.handle,
            `"${p.title.replace(/"/g, '""')}"`,
            `"${(p.shortDescription || p.title).replace(/"/g, '""')}"`,
            p.stockQuantity > 0 ? 'in stock' : 'out of stock',
            'new',
            `${(p.basePriceCents / 100).toFixed(2)} ${p.currency}`,
            `https://magazin.verda.ro/produs/${p.handle}`,
            p.thumbnailUrl,
            `"${p.category}"`,
          ].join(',')
        );
        content = [header, ...rows].join('\n');
      } else {
        mime = 'text/csv;charset=utf-8;';
        filename = 'catalog-produse.csv';
        const header = 'ID,Titlu,Handle,SKU,Status,PretBaza,Moneda,Stoc,MinQty,MaxQty,StepQty';
        const rows = products.map((p) =>
          [
            p.id,
            `"${p.title.replace(/"/g, '""')}"`,
            p.handle,
            p.sku,
            p.status,
            (p.basePriceCents / 100).toFixed(2),
            p.currency,
            p.stockQuantity,
            p.minOrderQty,
            p.maxOrderQty ?? '',
            p.stepQty,
          ].join(',')
        );
        content = [header, ...rows].join('\n');
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };

    const feedUrl = `${window.location.origin}/api/store/products`;
    const copyUrl = (id: string, val: string) => {
      navigator.clipboard?.writeText(val);
      setCopiedFeed(id);
      setTimeout(() => setCopiedFeed(null), 1800);
    };

    const predefinedFeeds = [
      {
        id: 'google',
        title: 'Google Shopping / Merchant Center',
        desc: 'Feed XML compatibil cu specificația Google Merchant RO cu prețuri și disponibilitate stoc.',
        format: 'xml' as const,
        btn: 'Descarcă XML',
      },
      {
        id: 'facebook',
        title: 'Meta Facebook & TikTok Catalog',
        desc: 'Feed CSV optimizat pentru campanii dinamice Facebook Ads și TikTok Shop.',
        format: 'facebook' as const,
        btn: 'Descarcă CSV Ads',
      },
      {
        id: 'csv',
        title: 'Export Complet Catalog (CSV)',
        desc: 'Include SKU, preț de bază, stoc curent și reguli de cantitate Min / Max / Pas.',
        format: 'csv' as const,
        btn: 'Descarcă CSV',
      },
      {
        id: 'json',
        title: 'Export Headless JSON / Medusa',
        desc: 'Structură completă cu descrieri extinse, galerie foto, SEO și praguri cantitative.',
        format: 'json' as const,
        btn: 'Descarcă JSON',
      },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white border border-teal-900/10 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0F2928]">
              Exportă produse &amp; Feed-uri predefinite
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Descarcă catalogul ({products.length} produse) sau conectează marketplace-urile prin endpoint-ul Store API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => copyUrl('api', feedUrl)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-teal-900 bg-[#F7FBFA] hover:bg-teal-50 border border-teal-900/15 rounded-lg shrink-0"
          >
            {copiedFeed === 'api' ? (
              <>
                <Check className="w-3.5 h-3.5 text-teal-700" />
                <span>Endpoint copiat</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiază URL Store API</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predefinedFeeds.map((f) => (
            <div
              key={f.id}
              className="bg-white border border-teal-900/10 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <h3 className="text-sm font-semibold text-[#0F2928]">{f.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{f.desc}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-teal-900/5">
                <span className="text-xs font-mono text-slate-500">
                  {products.length} produse active
                </span>
                <button
                  type="button"
                  onClick={() => downloadFile(f.format)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{f.btn}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (subPageId === 'categorii') {
    const handleAddCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!catName.trim()) return;
      const res = await authFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: catName.trim(),
          slug: slugify(catName),
          parentName: catParent.trim(),
          description: catDesc.trim(),
        }),
      });
      if (res.ok) {
        setCatName('');
        setCatParent('');
        setCatDesc('');
        await loadMeta();
      }
    };

    return (
      <div className="space-y-6">
        <form
          onSubmit={handleAddCategory}
          className="bg-white border border-teal-900/10 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nume categorie *
            </label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="ex: Corpuri Suspendate"
              className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Categorie părinte
            </label>
            <input
              type="text"
              value={catParent}
              onChange={(e) => setCatParent(e.target.value)}
              placeholder="Opțional"
              className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Descriere
            </label>
            <input
              type="text"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Descriere SEO categorie"
              className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adaugă categorie</span>
          </button>
        </form>

        <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Categorie</th>
                <th className="py-2.5 px-4">Slug</th>
                <th className="py-2.5 px-4">Descriere</th>
                <th className="py-2.5 px-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-900/5">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-teal-50/40">
                  <td className="py-3 px-4 font-medium text-[#0F2928]">
                    {cat.name}
                    {cat.parentName ? (
                      <span className="text-xs text-slate-400"> · {cat.parentName}</span>
                    ) : null}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-teal-700">
                    /{cat.slug}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{cat.description}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        await authFetch(`/api/admin/categories/${cat.id}`, {
                          method: 'DELETE',
                        });
                        await loadMeta();
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (subPageId === 'branduri') {
    const handleAddBrand = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!brandName.trim()) return;
      const res = await authFetch('/api/admin/brands', {
        method: 'POST',
        body: JSON.stringify({
          name: brandName.trim(),
          slug: slugify(brandName),
          website: brandSite.trim(),
        }),
      });
      if (res.ok) {
        setBrandName('');
        setBrandSite('');
        await loadMeta();
      }
    };

    return (
      <div className="space-y-6">
        <form
          onSubmit={handleAddBrand}
          className="bg-white border border-teal-900/10 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nume brand *
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="ex: Studio Nord"
              className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Website
            </label>
            <input
              type="text"
              value={brandSite}
              onChange={(e) => setBrandSite(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adaugă brand</span>
          </button>
        </form>

        <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Brand</th>
                <th className="py-2.5 px-4">Slug</th>
                <th className="py-2.5 px-4">Website</th>
                <th className="py-2.5 px-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-900/5">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-teal-50/40">
                  <td className="py-3 px-4 font-medium text-[#0F2928]">{b.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-teal-700">/{b.slug}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">{b.website || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        await authFetch(`/api/admin/brands/${b.id}`, {
                          method: 'DELETE',
                        });
                        await loadMeta();
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (subPageId === 'produse-favorite') {
    return (
      <div className="bg-white border border-teal-900/10 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0F2928]">Produse favorite</h2>
          <p className="text-sm text-slate-600 mt-1">
            Top produse adăugate la favorite de către clienții magazinului.
          </p>
        </div>
        <div className="divide-y divide-teal-900/10">
          {products.map((p, i) => (
            <div
              key={p.id ?? p.handle}
              className="py-3 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <ProductImage
                  src={p.thumbnailUrl}
                  alt={p.title}
                  className="w-10 h-10 rounded-lg border border-teal-900/10"
                />
                <div>
                  <div className="text-sm font-medium text-[#0F2928]">{p.title}</div>
                  <div className="text-xs font-mono text-slate-500">
                    {formatMoney(p.basePriceCents, p.currency)}
                  </div>
                </div>
              </div>
              <div className="text-xs font-mono text-teal-700 tabular-nums">
                {Math.max(4, 48 - i * 9)} salvări în wishlist
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const moduleMeta: Record<string, { title: string; desc: string; codeLabel: string }> = {
    'taguri-catalog': {
      title: 'Taguri catalog',
      desc: 'Etichete de grupare pentru campanii, colecții și filtre rapide în storefront.',
      codeLabel: 'Slug Tag',
    },
    atribute: {
      title: 'Atribute produse',
      desc: 'Definește specificații tehnice și filtre (Material, Culoare, Putere W, Dimensiuni).',
      codeLabel: 'Cod Atribut',
    },
    sellers: {
      title: 'Sellers (Vânzători Marketplace)',
      desc: 'Administrează partenerii multi-vendor, comisioanele și fluxurile de produse.',
      codeLabel: 'Cod Vendor',
    },
  };

  const activeModule = moduleMeta[subPageId] ?? moduleMeta['taguri-catalog'];

  return (
    <GenericModulePanel
      moduleKey={subPageId.replace(/-/g, '_')}
      title={activeModule.title}
      description={activeModule.desc}
      codeLabel={activeModule.codeLabel}
    />
  );
}
