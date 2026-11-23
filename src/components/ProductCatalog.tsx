import { useEffect, useMemo, useState } from 'react';
import { Eye, FileQuestion, Pencil, Plus, Search, Send, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney, type ProductRecord, type ProductStatus } from '../types/commerce';
import { ProductImage } from './ProductImage';

export type CatalogFilterKey =
  | 'all'
  | ProductStatus
  | 'price_on_request'
  | 'low_stock'
  | 'out_of_stock';

interface ProductCatalogProps {
  products: ProductRecord[];
  loading: boolean;
  error: string | null;
  initialFilter?: CatalogFilterKey;
  onCreateNew: () => void;
  onEdit: (product: ProductRecord) => void;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
  onQuoteSubmitted?: () => void;
}

const STATUS_TABS: Array<{ key: CatalogFilterKey; label: string }> = [
  { key: 'all', label: 'Toate produsele' },
  { key: 'published', label: 'Publicate' },
  { key: 'price_on_request', label: 'Preț la cerere' },
  { key: 'draft', label: 'Ciorne' },
  { key: 'low_stock', label: 'Stoc redus' },
  { key: 'out_of_stock', label: 'Stoc epuizat' },
  { key: 'archived', label: 'Arhivate' },
];

export function ProductCatalog({
  products,
  loading,
  error,
  initialFilter = 'all',
  onCreateNew,
  onEdit,
  onDelete,
  onRefresh,
  onQuoteSubmitted,
}: ProductCatalogProps) {
  const { authFetch } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CatalogFilterKey>(initialFilter);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setStatusFilter(initialFilter);
  }, [initialFilter]);

  // Storefront product preview & "Cere ofertă" test modal
  const [previewProduct, setPreviewProduct] = useState<ProductRecord | null>(null);
  const [quoteName, setQuoteName] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteCompany, setQuoteCompany] = useState('');
  const [quoteQty, setQuoteQty] = useState(1);
  const [quoteMsg, setQuoteMsg] = useState('');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const avail = Math.max(0, p.stockQuantity - p.reservedQuantity);
      if (statusFilter === 'price_on_request' && !p.priceOnRequest) return false;
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
        p.category.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
    });
  }, [products, search, statusFilter]);

  const metrics = useMemo(() => {
    const published = products.filter((p) => p.status === 'published').length;
    const priceOnRequest = products.filter((p) => p.priceOnRequest).length;
    const tieredCount = products.filter((p) => p.priceTiers.length > 0).length;
    const lowStock = products.filter(
      (p) =>
        p.manageInventory &&
        p.stockQuantity - p.reservedQuantity <= p.lowStockThreshold
    ).length;
    return { published, priceOnRequest, tieredCount, lowStock };
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

  const openStorePreview = (product: ProductRecord) => {
    setPreviewProduct(product);
    setQuoteQty(Math.max(1, product.minOrderQty || 1));
    setQuoteResult(null);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewProduct) return;
    setQuoteSubmitting(true);
    setQuoteResult(null);
    try {
      const res = await authFetch('/api/store/quotes', {
        method: 'POST',
        body: JSON.stringify({
          productId: previewProduct.id ?? null,
          productTitle: previewProduct.title,
          productHandle: previewProduct.handle,
          customerName: quoteName.trim(),
          customerEmail: quoteEmail.trim(),
          customerPhone: quotePhone.trim(),
          companyName: quoteCompany.trim(),
          requestedQty: quoteQty,
          message: quoteMsg.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuoteResult(
          `Cererea ${data.quote?.requestNumber || ''} a fost înregistrată în PostgreSQL și apare acum în Comenzi → Cereri ofertă.`
        );
        setQuoteName('');
        setQuoteEmail('');
        setQuotePhone('');
        setQuoteCompany('');
        setQuoteMsg('');
        onQuoteSubmitted?.();
      } else {
        setQuoteResult(data.error || 'Nu s-a putut trimite cererea.');
      }
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const statusText = (s: ProductStatus) =>
    s === 'published' ? 'Publicat' : s === 'draft' ? 'Ciornă' : 'Arhivat';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Total Produse</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums font-mono">
            {products.length}
          </div>
          <div className="mt-1 text-xs text-blue-700 tabular-nums">
            {metrics.published} publicate în magazin
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Preț la cerere</div>
          <div className="mt-1.5 text-2xl font-semibold text-blue-600 tabular-nums font-mono">
            {metrics.priceOnRequest}
          </div>
          <div className="mt-1 text-xs text-slate-500">Vizibile, doar cu ofertă</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Praguri de Preț</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums font-mono">
            {metrics.tieredCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Produse cu preț pe volum</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Alerte Stoc Redus</div>
          <div
            className={`mt-1.5 text-2xl font-semibold tabular-nums font-mono ${
              metrics.lowStock > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {metrics.lowStock}
          </div>
          <div className="mt-1 text-xs text-slate-500">Sub pragul minim</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[#EAF2FC] rounded-lg w-fit overflow-x-auto max-w-full">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-blue-900'
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
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
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
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="px-4 py-3.5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-48 bg-blue-50 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-blue-50 rounded animate-pulse" />
                </div>
                <div className="h-3.5 w-20 bg-blue-50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              Niciun produs găsit pentru filtrele selectate
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Modifică criteriile de căutare sau adaugă un produs nou în catalog.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Creează primul produs</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4F8FD] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Produs</th>
                  <th className="py-2.5 px-4">SKU / Categorie</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Stoc</th>
                  <th className="py-2.5 px-4 text-right">Reguli Cant.</th>
                  <th className="py-2.5 px-4 text-right">Preț &amp; Comandă</th>
                  <th className="py-2.5 px-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
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
                      ? 'text-blue-700'
                      : product.status === 'draft'
                      ? 'text-amber-700'
                      : 'text-slate-500';

                  return (
                    <tr
                      key={product.id ?? product.handle}
                      onClick={() => onEdit(product)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
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
                            className="w-10 h-10 rounded-lg border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 truncate">
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
                          {product.brand ? ` · ${product.brand}` : ''}
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
                            isLow ? 'text-amber-700' : 'text-slate-900'
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
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {product.priceOnRequest ? (
                          <div>
                            <div className="text-xs font-semibold text-blue-700">
                              Preț la cerere
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Solicitare ofertă · necomandabil
                            </div>
                          </div>
                        ) : (
                          <div className="font-mono tabular-nums">
                            <div className="text-xs font-medium text-slate-900">
                              {formatMoney(
                                product.basePriceCents,
                                product.currency
                              )}
                              {product.compareAtPriceCents &&
                              product.compareAtPriceCents >
                                product.basePriceCents ? (
                                <span className="ml-1.5 text-slate-400 line-through font-normal">
                                  {formatMoney(
                                    product.compareAtPriceCents,
                                    product.currency
                                  )}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-blue-700">
                              {product.priceTiers.length}{' '}
                              {product.priceTiers.length === 1
                                ? 'prag'
                                : 'praguri'}
                            </div>
                          </div>
                        )}
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
                              onClick={() => openStorePreview(product)}
                              title="Previzualizare magazin / Cere ofertă"
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEdit(product)}
                              aria-label={`Editează ${product.title}`}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
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

      {/* Modal Previzualizare Storefront + Formular Cere Ofertă */}
      {previewProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          onClick={() => setPreviewProduct(null)}
        >
          <div
            className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-[#F4F8FD] flex items-center justify-between">
              <div className="text-xs font-semibold text-blue-700">
                Previzualizare afișare în magazin · /{previewProduct.handle}
              </div>
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                <div className="sm:col-span-5">
                  <ProductImage
                    src={
                      previewProduct.thumbnailUrl ||
                      previewProduct.galleryImages[0]?.url ||
                      ''
                    }
                    alt={previewProduct.title}
                    className="w-full h-48 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="sm:col-span-7 space-y-3">
                  <div className="text-xs text-slate-500">
                    {previewProduct.category} · {previewProduct.sku}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {previewProduct.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {previewProduct.shortDescription ||
                      'Fără descriere scurtă completată.'}
                  </p>

                  {previewProduct.priceOnRequest ? (
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                        <FileQuestion className="w-4 h-4 text-blue-600" />
                        <span>Preț la cerere</span>
                      </div>
                      <p className="text-xs text-blue-800">
                        Acest produs este vizibil public în magazin, însă comanda directă în coș este dezactivată. Clienții trimit solicitare de ofertă mai jos.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-[#F4F8FD] border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-500">Preț unitar</div>
                        <div className="text-lg font-semibold font-mono text-slate-900">
                          {formatMoney(
                            previewProduct.basePriceCents,
                            previewProduct.currency
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg opacity-90"
                      >
                        Adaugă în coș (Min {previewProduct.minOrderQty})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {previewProduct.priceOnRequest && (
                <form
                  onSubmit={handleQuoteSubmit}
                  className="border-t border-slate-200 pt-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Cere ofertă pentru „{previewProduct.title}”
                    </h4>
                    <span className="text-xs text-slate-500">
                      Salvare reală în PostgreSQL
                    </span>
                  </div>

                  {quoteResult && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                      {quoteResult}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={quoteName}
                      onChange={(e) => setQuoteName(e.target.value)}
                      placeholder="Nume și prenume *"
                      className="px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input
                      type="email"
                      required
                      value={quoteEmail}
                      onChange={(e) => setQuoteEmail(e.target.value)}
                      placeholder="Email de contact *"
                      className="px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={quotePhone}
                      onChange={(e) => setQuotePhone(e.target.value)}
                      placeholder="Telefon"
                      className="px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={quoteCompany}
                      onChange={(e) => setQuoteCompany(e.target.value)}
                      placeholder="Firmă / Companie (opțional)"
                      className="px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Cantitate dorită
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={quoteQty}
                        onChange={(e) =>
                          setQuoteQty(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-full px-3 py-2 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Detalii proiect / specificații
                      </label>
                      <input
                        type="text"
                        value={quoteMsg}
                        onChange={(e) => setQuoteMsg(e.target.value)}
                        placeholder="ex: Termen livrare dorit, finisaj personalizat..."
                        className="w-full px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewProduct(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg"
                    >
                      Închide
                    </button>
                    <button
                      type="submit"
                      disabled={quoteSubmitting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {quoteSubmitting ? 'Se trimite...' : 'Cere ofertă'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
