import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney, type AuditLogRecord, type ProductRecord } from '../types/commerce';
import { ProductImage } from './ProductImage';

interface InventoryWorkspaceProps {
  subPageId: string;
  products: ProductRecord[];
  onRefreshProducts: () => void;
}

type InventoryFilterTab = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export function InventoryWorkspace({
  subPageId,
  products,
  onRefreshProducts,
}: InventoryWorkspaceProps) {
  const { authFetch } = useAuth();
  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        stockQuantity: number;
        basePriceRon: string;
        compareAtPriceRon: string;
        sku: string;
        barcode: string;
      }
    >
  >({});
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<InventoryFilterTab>('all');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    const map: Record<
      number,
      {
        stockQuantity: number;
        basePriceRon: string;
        compareAtPriceRon: string;
        sku: string;
        barcode: string;
      }
    > = {};
    for (const p of products) {
      if (p.id) {
        map[p.id] = {
          stockQuantity: p.stockQuantity,
          basePriceRon: (p.basePriceCents / 100).toFixed(2),
          compareAtPriceRon: p.compareAtPriceCents
            ? (p.compareAtPriceCents / 100).toFixed(2)
            : '',
          sku: p.sku,
          barcode: p.barcode,
        };
      }
    }
    setDrafts(map);
  }, [products]);

  const loadLogs = useCallback(
    async (entityType: 'stock' | 'price') => {
      setLogsLoading(true);
      try {
        const res = await authFetch(`/api/admin/audit-logs?entityType=${entityType}`);
        const data = await res.json();
        if (res.ok) setLogs(data.logs ?? []);
      } finally {
        setLogsLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    if (subPageId === 'istoric-stoc') {
      loadLogs('stock');
    } else if (subPageId === 'istoric-pret') {
      loadLogs('price');
    }
  }, [subPageId, loadLogs]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const avail = Math.max(0, p.stockQuantity - p.reservedQuantity);
      if (filterTab === 'in_stock' && avail <= 0) return false;
      if (
        filterTab === 'low_stock' &&
        (avail <= 0 || avail > p.lowStockThreshold)
      ) {
        return false;
      }
      if (filterTab === 'out_of_stock' && avail > 0) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q)
      );
    });
  }, [products, search, filterTab]);

  if (subPageId === 'istoric-stoc' || subPageId === 'istoric-pret') {
    const isStock = subPageId === 'istoric-stoc';
    return (
      <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-teal-900/10">
          <h2 className="text-lg font-semibold text-[#0F2928]">
            {isStock ? 'Istoric modificări stoc' : 'Istoric modificări preț'}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Jurnal automat în PostgreSQL pentru fiecare actualizare efectuată asupra{' '}
            {isStock ? 'cantităților din inventar' : 'prețurilor de bază'}.
          </p>
        </div>
        {logsLoading ? (
          <div className="p-6 text-sm text-slate-500">Se încarcă istoricul...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nu există încă modificări înregistrate. Modifică un{' '}
            {isStock ? 'stoc' : 'preț'} din secțiunea{' '}
            {isStock ? 'Administrare stocuri' : 'Administrare prețuri'} pentru a vedea jurnalul aici.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Acțiune</th>
                  <th className="py-2.5 px-4">Valoare veche</th>
                  <th className="py-2.5 px-4">Valoare nouă</th>
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4 text-right">Dată</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-900/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-teal-50/40">
                    <td className="py-3 px-4 font-medium text-[#0F2928]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {log.oldValue}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-teal-700">
                      {log.newValue}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {log.actorEmail}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 tabular-nums">
                      {new Date(log.createdAt).toLocaleString('ro-RO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const handleSaveRow = async (product: ProductRecord) => {
    if (!product.id) return;
    const draft = drafts[product.id];
    if (!draft) return;

    setSavingId(product.id);
    try {
      const payload: Record<string, unknown> = { productId: product.id };
      if (subPageId === 'administrare-stocuri') {
        payload.stockQuantity = Math.max(0, Number(draft.stockQuantity) || 0);
      } else if (subPageId === 'administrare-preturi') {
        payload.basePriceCents = Math.max(
          0,
          Math.round(Number(draft.basePriceRon || 0) * 100)
        );
        const oldVal = draft.compareAtPriceRon.trim();
        payload.compareAtPriceCents =
          oldVal && Number(oldVal) > 0 ? Math.round(Number(oldVal) * 100) : null;
      } else {
        payload.sku = draft.sku;
        payload.barcode = draft.barcode;
      }

      const res = await authFetch('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSavedId(product.id);
        setTimeout(() => setSavedId(null), 1600);
        onRefreshProducts();
      }
    } finally {
      setSavingId(null);
    }
  };

  const pageHeader =
    subPageId === 'administrare-stocuri'
      ? {
          title: 'Administrare stocuri',
          desc: 'Ajustare rapidă a stocurilor disponibile cu înregistrare automată în istoricul de inventar.',
        }
      : subPageId === 'administrare-preturi'
      ? {
          title: 'Administrare prețuri',
          desc: 'Actualizează rapid prețul de bază și prețul vechi (tăiat) al produselor direct în tabel.',
        }
      : {
          title: 'Coduri produse (SKU & EAN)',
          desc: 'Gestionează centralizat codurile SKU interne și codurile de bare EAN.',
        };

  const tabs: Array<{ key: InventoryFilterTab; label: string }> = [
    { key: 'all', label: 'Toate produsele' },
    { key: 'in_stock', label: 'Disponibil' },
    { key: 'low_stock', label: 'Stoc redus' },
    { key: 'out_of_stock', label: 'Stoc epuizat' },
  ];

  return (
    <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-teal-900/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0F2928]">{pageHeader.title}</h2>
            <p className="text-sm text-slate-600 mt-0.5">{pageHeader.desc}</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută produs, SKU, EAN..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#E7F3F1] rounded-lg w-fit overflow-x-auto">
          {tabs.map((tab) => {
            const active = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterTab(tab.key)}
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
              <th className="py-2.5 px-4">Produs</th>
              {subPageId === 'administrare-stocuri' && (
                <>
                  <th className="py-2.5 px-4">Stoc Rezervat</th>
                  <th className="py-2.5 px-4">Disponibil</th>
                  <th className="py-2.5 px-4">Stoc Total Nou</th>
                </>
              )}
              {subPageId === 'administrare-preturi' && (
                <>
                  <th className="py-2.5 px-4">Preț Curent</th>
                  <th className="py-2.5 px-4">Preț Total Nou</th>
                  <th className="py-2.5 px-4">Preț Vechi (tăiat)</th>
                  <th className="py-2.5 px-4">Praguri Volum</th>
                </>
              )}
              {subPageId === 'coduri-produse' && (
                <>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4">Cod Bare (EAN)</th>
                </>
              )}
              <th className="py-2.5 px-4 text-right">Salvare</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-teal-900/5">
            {filteredProducts.map((p) => {
              const id = p.id ?? 0;
              const draft = drafts[id];
              const avail = Math.max(0, p.stockQuantity - p.reservedQuantity);
              return (
                <tr key={id || p.handle} className="hover:bg-teal-50/40">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={p.thumbnailUrl}
                        alt={p.title}
                        className="w-9 h-9 rounded-lg border border-teal-900/10 shrink-0"
                      />
                      <div>
                        <div className="font-medium text-[#0F2928]">{p.title}</div>
                        <div className="text-xs font-mono text-slate-500">
                          {p.sku || p.handle}
                        </div>
                      </div>
                    </div>
                  </td>

                  {subPageId === 'administrare-stocuri' && (
                    <>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600">
                        {p.reservedQuantity} buc.
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums font-medium text-teal-800">
                        {avail} buc.
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          value={draft?.stockQuantity ?? p.stockQuantity}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                stockQuantity: Math.max(0, Number(e.target.value) || 0),
                              },
                            }))
                          }
                          className="w-28 px-3 py-1.5 text-sm font-mono tabular-nums border border-teal-900/15 rounded-lg focus:outline-none focus:border-teal-600"
                        />
                      </td>
                    </>
                  )}

                  {subPageId === 'administrare-preturi' && (
                    <>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600">
                        {formatMoney(p.basePriceCents, p.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={draft?.basePriceRon ?? (p.basePriceCents / 100).toFixed(2)}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [id]: {
                                  ...prev[id],
                                  basePriceRon: e.target.value,
                                },
                              }))
                            }
                            className="w-28 px-3 py-1.5 text-sm font-mono tabular-nums border border-teal-900/15 rounded-lg focus:outline-none focus:border-teal-600"
                          />
                          <span className="text-xs font-mono text-slate-500">
                            {p.currency}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="Opțional"
                          value={draft?.compareAtPriceRon ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                compareAtPriceRon: e.target.value,
                              },
                            }))
                          }
                          className="w-28 px-3 py-1.5 text-sm font-mono tabular-nums border border-teal-900/15 rounded-lg focus:outline-none focus:border-teal-600"
                        />
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-teal-700 tabular-nums">
                        {p.priceTiers.length} praguri
                      </td>
                    </>
                  )}

                  {subPageId === 'coduri-produse' && (
                    <>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={draft?.sku ?? p.sku}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], sku: e.target.value },
                            }))
                          }
                          className="w-40 px-3 py-1.5 text-xs font-mono border border-teal-900/15 rounded-lg focus:outline-none focus:border-teal-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={draft?.barcode ?? p.barcode}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], barcode: e.target.value },
                            }))
                          }
                          className="w-44 px-3 py-1.5 text-xs font-mono border border-teal-900/15 rounded-lg focus:outline-none focus:border-teal-600"
                        />
                      </td>
                    </>
                  )}

                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      disabled={savingId === id}
                      onClick={() => handleSaveRow(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {savedId === id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvat</span>
                        </>
                      ) : savingId === id ? (
                        <span>Se salvează...</span>
                      ) : (
                        <span>Salvează</span>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
