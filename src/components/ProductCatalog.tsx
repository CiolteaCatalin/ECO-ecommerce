import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { formatMoney, type ProductRecord, type ProductStatus } from '../types/commerce';
import { ProductImage } from './ProductImage';

interface ProductCatalogProps {
  products: ProductRecord[];
  loading: boolean;
  error: string | null;
  onCreateNew: () => void;
  onEdit: (product: ProductRecord) => void;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
}

type CatalogFilterKey = 'all' | ProductStatus | 'low_stock' | 'out_of_stock';

const STATUS_TABS: Array<{ key: CatalogFilterKey; label: string }> = [
  { key: 'all', label: 'Toate produsele' },
  { key: 'published', label: 'Publicate' },
  { key: 'draft', label: 'Ciorne' },
  { key: 'low_stock', label: 'Stoc redus' },
  { key: 'out_of_stock', label: 'Stoc epuizat' },
  { key: 'archived', label: 'Arhivate' },
];

export function ProductCatalog({
  products,
  loading,
  error,
  onCreateNew,
  onEdit,
  onDelete,
  onRefresh,
}: ProductCatalogProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CatalogFilterKey>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const avail = Math.max(0, p.stockQuantity - p.reservedQuantity);
      if (statusFilter === 'out_of_stock' && avail > 0) return false;
      if (
        statusFilter === 'low_stock' &&
        (avail <= 0 || avail > p.lowStockThreshold)
      ) {
        return false;
      }
      if (
        (statusFilter === 'published' ||
          statusFilter === 'draft' ||
          statusFilter === 'archived') &&
        p.status !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, search, statusFilter]);

  const metrics = useMemo(() => {
    const published = products.filter((p) => p.status === 'published').length;
    const totalAvailable = products.reduce(
      (sum, p) => sum + Math.max(0, p.stockQuantity - p.reservedQuantity),
      0
    );
    const tieredCount = products.filter((p) => p.priceTiers.length > 0).length;
    const lowStock = products.filter(
      (p) =>
        p.manageInventory &&
        p.stockQuantity - p.reservedQuantity <= p.lowStockThreshold
    ).length;
    return { published, totalAvailable, tieredCount, lowStock };
  }, [products]);

  const handleConfirmDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const statusText = (s: ProductStatus) =>
    s === 'published' ? 'Publicat' : s === 'draft' ? 'Ciornă' : 'Arhivat';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-teal-900/10 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-teal-900/10">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Total Produse</div>
          <div className="mt-1.5 text-2xl font-semibold text-[#0F2928] tabular-nums font-mono">
            {products.length}
          </div>
          <div className="mt-1 text-xs text-teal-700 tabular-nums">
            {metrics.published} publicate
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Stoc Disponibil</div>
          <div className="mt-1.5 text-2xl font-semibold text-[#0F2928] tabular-nums font-mono">
            {metrics.totalAvailable}
          </div>
          <div className="mt-1 text-xs text-slate-500">Unități disponibile</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Praguri de Preț</div>
          <div className="mt-1.5 text-2xl font-semibold text-teal-700 tabular-nums font-mono">
            {metrics.tieredCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Produse cu preț pe volum</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Alerte Stoc Redus</div>
          <div
            className={`mt-1.5 text-2xl font-semibold tabular-nums font-mono ${
              metrics.lowStock > 0 ? 'text-amber-600' : 'text-[#0F2928]'
            }`}
          >
            {metrics.lowStock}
          </div>
          <div className="mt-1 text-xs text-slate-500">Sub pragul minim</div>
        </div>
      </div>

      <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-teal-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[#E7F3F1] rounded-lg w-fit overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-teal-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Caută titlu, handle, SKU..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Produs nou</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 flex items-center justify-between gap-4 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-1 text-xs font-medium bg-white border border-red-200 rounded-md hover:bg-red-50 whitespace-nowrap shrink-0"
            >
              Reîncearcă
            </button>
          </div>
        )}

        {loading ? (
          <div className="divide-y divide-teal-900/5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="px-4 py-3.5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-teal-50 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-48 bg-teal-50 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-teal-50 rounded animate-pulse" />
                </div>
                <div className="h-3.5 w-20 bg-teal-50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-sm font-semibold text-[#0F2928]">
              Niciun produs găsit pentru filtrele selectate
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Modifică criteriile de căutare sau adaugă un produs nou în catalog.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Creează primul produs</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Produs</th>
                  <th className="py-2.5 px-4">SKU / Categorie</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Stoc</th>
                  <th className="py-2.5 px-4 text-right">Reguli Cant.</th>
                  <th className="py-2.5 px-4 text-right">Preț &amp; Praguri</th>
                  <th className="py-2.5 px-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-900/5 text-sm">
                {filtered.map((product) => {
                  const available = Math.max(
                    0,
                    product.stockQuantity - product.reservedQuantity
                  );
                  const isLow =
                    product.manageInventory &&
                    available <= product.lowStockThreshold;
                  const statusTone =
                    product.status === 'published'
                      ? 'text-teal-700'
                      : product.status === 'draft'
                      ? 'text-amber-700'
                      : 'text-slate-500';

                  return (
                    <tr
                      key={product.id ?? product.handle}
                      onClick={() => onEdit(product)}
                      className="hover:bg-teal-50/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[240px]">
                          <ProductImage
                            src={
                              product.thumbnailUrl ||
                              product.galleryImages[0]?.url ||
                              ''
                            }
                            alt={product.title}
                            className="w-10 h-10 rounded-lg border border-teal-900/10 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-[#0F2928] truncate">
                              {product.title}
                            </div>
                            <div className="text-xs text-slate-500 font-mono truncate">
                              /{product.handle}
                              {product.galleryImages.length > 0
                                ? ` · ${product.galleryImages.length} poze`
                                : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-mono text-slate-800">
                          {product.sku || '—'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {product.category}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-xs font-medium ${statusTone}`}>
                          {statusText(product.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                        <div
                          className={`text-xs font-medium ${
                            isLow ? 'text-amber-700' : 'text-[#0F2928]'
                          }`}
                        >
                          {available} disp.
                        </div>
                        <div className="text-xs text-slate-500">
                          {product.reservedQuantity} rez.
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                        <div className="text-xs text-slate-800">
                          Min {product.minOrderQty} /{' '}
                          {product.maxOrderQty ?? '∞'}
                        </div>
                        <div className="text-xs text-slate-500">
                          Pas +{product.stepQty}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                        <div className="text-xs font-medium text-[#0F2928]">
                          {formatMoney(product.basePriceCents, product.currency)}
                          {product.compareAtPriceCents &&
                          product.compareAtPriceCents > product.basePriceCents ? (
                            <span className="ml-1.5 text-slate-400 line-through font-normal">
                              {formatMoney(product.compareAtPriceCents, product.currency)}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-teal-700">
                          {product.priceTiers.length}{' '}
                          {product.priceTiers.length === 1 ? 'prag' : 'praguri'}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {confirmDeleteId === product.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={deletingId === product.id}
                              onClick={() =>
                                product.id && handleConfirmDelete(product.id)
                              }
                              className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md whitespace-nowrap"
                            >
                              {deletingId === product.id
                                ? 'Se șterge...'
                                : 'Confirmă'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                            >
                              Anulează
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEdit(product)}
                              aria-label={`Editează ${product.title}`}
                              className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                product.id && setConfirmDeleteId(product.id)
                              }
                              aria-label={`Șterge ${product.title}`}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
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
