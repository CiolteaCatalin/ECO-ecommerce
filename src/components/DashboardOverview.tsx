import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { MenuCategoryId } from '../config/navigation';
import {
  formatMoney,
  type DashboardSummary,
  type ProductRecord,
} from '../types/commerce';

interface DashboardOverviewProps {
  products: ProductRecord[];
  onNavigate: (categoryId: MenuCategoryId, subPageId: string) => void;
  onCreateProduct: () => void;
}

export function DashboardOverview({
  products,
  onNavigate,
  onCreateProduct,
}: DashboardOverviewProps) {
  const { authFetch } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/dashboard');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nu s-a putut încărca panoul de control.');
      }
      setSummary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare de conexiune.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const topCategories = useMemo(() => {
    const map = new Map<string, { name: string; count: number; stockValueCents: number }>();
    for (const p of products) {
      const cat = p.category || 'General';
      const entry = map.get(cat) || { name: cat, count: 0, stockValueCents: 0 };
      entry.count += 1;
      entry.stockValueCents += p.basePriceCents * p.stockQuantity;
      map.set(cat, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => b.stockValueCents - a.stockValueCents)
      .slice(0, 4);
  }, [products]);

  const chartPoints = useMemo(() => {
    const orders = summary?.recentOrders ?? [];
    if (orders.length === 0) return [];
    const chronological = [...orders].reverse();
    const maxVal = Math.max(...chronological.map((o) => o.totalCents), 10000);
    const width = 420;
    const height = 110;
    const stepX = chronological.length > 1 ? width / (chronological.length - 1) : width;

    return chronological.map((o, idx) => {
      const x = chronological.length === 1 ? width / 2 : idx * stepX;
      const y = height - 12 - ((o.totalCents / maxVal) * (height - 24));
      return { x, y, label: o.orderNumber, value: o.totalCents };
    });
  }, [summary]);

  const svgLinePath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');
  }, [chartPoints]);

  const svgAreaPath = useMemo(() => {
    if (chartPoints.length < 2) return '';
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${svgLinePath} L ${last.x.toFixed(1)} 110 L ${first.x.toFixed(1)} 110 Z`;
  }, [chartPoints, svgLinePath]);

  const statusLabel = (status: string) => {
    if (status === 'pending') return 'În așteptare';
    if (status === 'processing') return 'În procesare';
    if (status === 'processed') return 'Procesată';
    if (status === 'returned') return 'Retur';
    return status;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-white border border-teal-900/10 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-white border border-teal-900/10 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-teal-900/10 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-teal-900/10 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 flex items-center justify-between gap-4">
        <div className="text-sm text-red-700">
          {error || 'Datele panoului nu au putut fi încărcate.'}
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          className="px-4 py-2 text-xs font-medium text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg"
        >
          Reîncarcă
        </button>
      </div>
    );
  }

  const { kpis } = summary;

  const catalogStatRows: Array<{
    label: string;
    value: number;
    tone?: string;
    onClick: () => void;
  }> = [
    {
      label: 'Comenzi în așteptare',
      value: kpis.pendingOrders,
      tone: kpis.pendingOrders > 0 ? 'text-teal-700' : 'text-[#0F2928]',
      onClick: () => onNavigate('comenzi', 'comenzi-asteptare'),
    },
    {
      label: 'Comenzi în procesare',
      value: kpis.processingOrders,
      onClick: () => onNavigate('comenzi', 'comenzi-procesare'),
    },
    {
      label: 'Cereri de retur active',
      value: kpis.returnRequests,
      tone: kpis.returnRequests > 0 ? 'text-amber-700' : 'text-[#0F2928]',
      onClick: () => onNavigate('comenzi', 'cereri-retur'),
    },
    {
      label: 'Produse totale în catalog',
      value: kpis.totalProducts,
      onClick: () => onNavigate('catalog', 'produse'),
    },
    {
      label: 'Produse publicate',
      value: kpis.publishedProducts,
      onClick: () => onNavigate('catalog', 'produse'),
    },
    {
      label: 'Produse cu stoc epuizat',
      value: kpis.outOfStockProducts,
      tone: kpis.outOfStockProducts > 0 ? 'text-red-600' : 'text-[#0F2928]',
      onClick: () => onNavigate('inventar', 'administrare-stocuri'),
    },
    {
      label: 'Categorii active',
      value: kpis.totalCategories,
      onClick: () => onNavigate('catalog', 'categorii'),
    },
    {
      label: 'Branduri înregistrate',
      value: kpis.totalBrands,
      onClick: () => onNavigate('catalog', 'branduri'),
    },
    {
      label: 'Clienți înregistrați',
      value: kpis.totalCustomers,
      onClick: () => onNavigate('clienti', 'clienti-lista'),
    },
    {
      label: 'Abonați newsletter',
      value: kpis.newsletterSubscribers,
      onClick: () => onNavigate('clienti', 'abonati-newsletter'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header operațional */}
      <div className="bg-white border border-teal-900/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#0F2928] tracking-tight">
            Panou de control magazin
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Privire de ansamblu asupra comenzilor, stocurilor, vânzărilor și activității din PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-900 bg-[#F7FBFA] hover:bg-teal-50 border border-teal-900/15 rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizează</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('comenzi', 'comenzi-asteptare')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <span>Procesează comenzi ({kpis.pendingOrders})</span>
          </button>
          <button
            type="button"
            onClick={onCreateProduct}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Produs nou</span>
          </button>
        </div>
      </div>

      {/* Grilă principală 3 coloane stil MerchantPro */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coloana 1: Statistici Catalog & Operațiuni */}
        <section className="lg:col-span-4 bg-white border border-teal-900/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-teal-900/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F2928]">
              Statistici catalog și operațiuni
            </h2>
            <span className="text-xs text-slate-500">Acces rapid</span>
          </div>
          <div className="divide-y divide-teal-900/5">
            {catalogStatRows.map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={row.onClick}
                className="w-full px-5 py-2.5 flex items-center justify-between text-left hover:bg-[#F7FBFA] transition-colors group"
              >
                <span className="text-xs text-slate-700 group-hover:text-teal-900">
                  {row.label}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`font-mono tabular-nums text-sm font-semibold ${
                      row.tone ?? 'text-[#0F2928]'
                    }`}
                  >
                    {row.value}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-700 transition-colors" />
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Coloana 2: Statistici Vânzări & Top Categorii */}
        <section className="lg:col-span-4 bg-white border border-teal-900/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-teal-900/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F2928]">
              Statistici vânzări
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('rapoarte', 'analiza-trafic')}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Raport detaliat
            </button>
          </div>

          <div className="grid grid-cols-2 border-b border-teal-900/10 divide-x divide-teal-900/10">
            <div className="p-4">
              <div className="text-xs text-slate-500">Total vânzări nete</div>
              <div className="mt-1 text-lg font-semibold text-teal-700 font-mono tabular-nums">
                {formatMoney(kpis.totalRevenueCents, 'RON')}
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs text-slate-500">Valoare medie comandă</div>
              <div className="mt-1 text-lg font-semibold text-[#0F2928] font-mono tabular-nums">
                {formatMoney(kpis.avgOrderCents, 'RON')}
              </div>
            </div>
          </div>

          <div className="p-5 border-b border-teal-900/10">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <span>Dinamica valorică a comenzilor recente</span>
              <span className="font-mono tabular-nums">{kpis.totalOrders} comenzi</span>
            </div>
            {chartPoints.length > 0 ? (
              <svg
                viewBox="0 0 420 110"
                className="w-full h-28 overflow-visible"
                role="img"
                aria-label="Grafic comenzi recente"
              >
                <defs>
                  <linearGradient id="verdaArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {svgAreaPath && <path d={svgAreaPath} fill="url(#verdaArea)" />}
                {svgLinePath && (
                  <path
                    d={svgLinePath}
                    fill="none"
                    stroke="#0D9488"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {chartPoints.map((pt) => (
                  <circle
                    key={pt.label}
                    cx={pt.x}
                    cy={pt.y}
                    r="3.2"
                    fill="#FFFFFF"
                    stroke="#0D9488"
                    strokeWidth="2"
                  >
                    <title>{`${pt.label}: ${formatMoney(pt.value, 'RON')}`}</title>
                  </circle>
                ))}
              </svg>
            ) : (
              <div className="h-24 flex items-center justify-center text-xs text-slate-400">
                Nu există comenzi pentru grafic.
              </div>
            )}
          </div>

          <div className="p-5 space-y-3">
            <div className="text-xs font-medium text-slate-700">
              Top categorii după valoarea inventarului
            </div>
            {topCategories.length === 0 ? (
              <div className="text-xs text-slate-400">Nicio categorie configurată.</div>
            ) : (
              <div className="space-y-2">
                {topCategories.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between text-xs py-1 border-b border-teal-900/5 last:border-b-0"
                  >
                    <span className="text-[#0F2928] font-medium truncate">
                      {cat.name} · {cat.count} prod.
                    </span>
                    <span className="font-mono tabular-nums text-teal-800 shrink-0 ml-2">
                      {formatMoney(cat.stockValueCents, 'RON')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Coloana 3: Comenzi Recente & Jurnal Activitate */}
        <section className="lg:col-span-4 bg-white border border-teal-900/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-teal-900/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F2928]">
              Comenzi recente
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('comenzi', 'comenzi-asteptare')}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Vezi toate
            </button>
          </div>
          <div className="divide-y divide-teal-900/5 max-h-[340px] overflow-y-auto">
            {summary.recentOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() =>
                  onNavigate(
                    'comenzi',
                    order.status === 'processing'
                      ? 'comenzi-procesare'
                      : order.status === 'processed'
                      ? 'comenzi-procesate'
                      : order.returnStatus === 'requested'
                      ? 'cereri-retur'
                      : 'comenzi-asteptare'
                  )
                }
                className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F7FBFA] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-[#0F2928]">
                      {order.orderNumber}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span
                      className={
                        order.status === 'pending'
                          ? 'text-teal-700 font-medium'
                          : order.status === 'returned'
                          ? 'text-amber-700 font-medium'
                          : 'text-slate-600'
                      }
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {order.customerName} · {order.shippingCity}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-semibold text-[#0F2928] tabular-nums">
                    {formatMoney(order.totalCents, order.currency)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {order.itemsCount} prod.
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-teal-900/10 bg-[#F7FBFA] flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              Ultimele acțiuni în sistem
            </span>
            <button
              type="button"
              onClick={() => onNavigate('rapoarte', 'loguri-activitate')}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Loguri complete
            </button>
          </div>
          <div className="divide-y divide-teal-900/5 max-h-48 overflow-y-auto">
            {summary.recentLogs.length === 0 ? (
              <div className="px-5 py-4 text-xs text-slate-400">
                Nicio acțiune recentă în jurnal.
              </div>
            ) : (
              summary.recentLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="px-5 py-2.5 text-xs">
                  <div className="font-medium text-[#0F2928] truncate">
                    {log.action}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                    {log.actorEmail} · {new Date(log.createdAt).toLocaleString('ro-RO')}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
