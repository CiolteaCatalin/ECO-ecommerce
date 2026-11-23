import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Code2, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { NavSectionId } from '../config/navigation';
import type { OrdersTabKey } from './OrdersWorkspace';
import {
  formatMoney,
  type DashboardSummary,
  type ProductRecord,
} from '../types/commerce';

interface DashboardOverviewProps {
  products: ProductRecord[];
  onNavigate: (section: NavSectionId, opts?: { ordersTab?: OrdersTabKey }) => void;
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
        throw new Error(
          data.error || 'Nu s-a putut încărca panoul de control.'
        );
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
    const map = new Map<
      string,
      { name: string; count: number; stockValueCents: number }
    >();
    for (const p of products) {
      const cat = p.category || 'General';
      const entry = map.get(cat) || {
        name: cat,
        count: 0,
        stockValueCents: 0,
      };
      entry.count += 1;
      if (!p.priceOnRequest) {
        entry.stockValueCents += p.basePriceCents * p.stockQuantity;
      }
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
    const stepX =
      chronological.length > 1 ? width / (chronological.length - 1) : width;

    return chronological.map((o, idx) => {
      const x = chronological.length === 1 ? width / 2 : idx * stepX;
      const y = height - 12 - (o.totalCents / maxVal) * (height - 24);
      return { x, y, label: o.orderNumber, value: o.totalCents };
    });
  }, [summary]);

  const svgLinePath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints
      .map(
        (pt, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
      )
      .join(' ');
  }, [chartPoints]);

  const svgAreaPath = useMemo(() => {
    if (chartPoints.length < 2) return '';
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${svgLinePath} L ${last.x.toFixed(1)} 110 L ${first.x.toFixed(
      1
    )} 110 Z`;
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
        <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
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
          className="px-4 py-2 text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
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
      tone: kpis.pendingOrders > 0 ? 'text-blue-600' : 'text-slate-900',
      onClick: () => onNavigate('comenzi', { ordersTab: 'pending' }),
    },
    {
      label: 'Cereri ofertă noi (Preț la cerere)',
      value: kpis.quoteRequestsNew ?? 0,
      tone:
        (kpis.quoteRequestsNew ?? 0) > 0 ? 'text-blue-700' : 'text-slate-900',
      onClick: () => onNavigate('comenzi', { ordersTab: 'quotes' }),
    },
    {
      label: 'Comenzi în procesare',
      value: kpis.processingOrders,
      onClick: () => onNavigate('comenzi', { ordersTab: 'processing' }),
    },
    {
      label: 'Produse totale în catalog',
      value: kpis.totalProducts,
      onClick: () => onNavigate('produse'),
    },
    {
      label: 'Produse cu „Preț la cerere”',
      value: kpis.priceOnRequestProducts ?? 0,
      tone: 'text-blue-700',
      onClick: () => onNavigate('produse'),
    },
    {
      label: 'Produse cu stoc epuizat',
      value: kpis.outOfStockProducts,
      tone: kpis.outOfStockProducts > 0 ? 'text-red-600' : 'text-slate-900',
      onClick: () => onNavigate('produse'),
    },
    {
      label: 'Pagini site & SEO configurate',
      value: kpis.sitePagesCount ?? 0,
      onClick: () => onNavigate('pagini'),
    },
    {
      label: 'Clienți înregistrați',
      value: kpis.totalCustomers,
      onClick: () => onNavigate('clienti'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Panou de control magazin
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Administrare simplificată pentru produse, comenzi, cereri de ofertă, pagini din cod și SEO.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-[#F4F8FD] hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizează</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pagini')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Pagini &amp; SEO</span>
          </button>
          <button
            type="button"
            onClick={onCreateProduct}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Produs nou</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Statistici și acces rapid
            </h2>
            <span className="text-xs text-slate-500">PostgreSQL Live</span>
          </div>
          <div className="divide-y divide-slate-100">
            {catalogStatRows.map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={row.onClick}
                className="w-full px-5 py-2.5 flex items-center justify-between text-left hover:bg-[#F4F8FD] transition-colors group"
              >
                <span className="text-xs text-slate-700 group-hover:text-blue-800">
                  {row.label}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`font-mono tabular-nums text-sm font-semibold ${
                      row.tone ?? 'text-slate-900'
                    }`}
                  >
                    {row.value}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Statistici vânzări
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('comenzi')}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Vezi comenzi
            </button>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-200 divide-x divide-slate-200">
            <div className="p-4">
              <div className="text-xs text-slate-500">Total vânzări nete</div>
              <div className="mt-1 text-lg font-semibold text-blue-600 font-mono tabular-nums">
                {formatMoney(kpis.totalRevenueCents, 'RON')}
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs text-slate-500">Valoare medie comandă</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 font-mono tabular-nums">
                {formatMoney(kpis.avgOrderCents, 'RON')}
              </div>
            </div>
          </div>

          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <span>Dinamica valorică a comenzilor recente</span>
              <span className="font-mono tabular-nums">
                {kpis.totalOrders} comenzi
              </span>
            </div>
            {chartPoints.length > 0 ? (
              <svg
                viewBox="0 0 420 110"
                className="w-full h-28 overflow-visible"
                role="img"
                aria-label="Grafic comenzi recente"
              >
                <defs>
                  <linearGradient id="verdaBlueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.24" />
                    <stop
                      offset="100%"
                      stopColor="#2563EB"
                      stopOpacity="0.02"
                    />
                  </linearGradient>
                </defs>
                {svgAreaPath && (
                  <path d={svgAreaPath} fill="url(#verdaBlueArea)" />
                )}
                {svgLinePath && (
                  <path
                    d={svgLinePath}
                    fill="none"
                    stroke="#2563EB"
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
                    stroke="#2563EB"
                    strokeWidth="2"
                  >
                    <title>{`${pt.label}: ${formatMoney(
                      pt.value,
                      'RON'
                    )}`}</title>
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
              <div className="text-xs text-slate-400">
                Nicio categorie configurată.
              </div>
            ) : (
              <div className="space-y-2">
                {topCategories.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-b-0"
                  >
                    <span className="text-slate-900 font-medium truncate">
                      {cat.name} · {cat.count} prod.
                    </span>
                    <span className="font-mono tabular-nums text-blue-700 shrink-0 ml-2">
                      {formatMoney(cat.stockValueCents, 'RON')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Comenzi recente
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('comenzi')}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Vezi toate
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {summary.recentOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() =>
                  onNavigate('comenzi', {
                    ordersTab:
                      order.status === 'processing'
                        ? 'processing'
                        : order.status === 'processed'
                        ? 'processed'
                        : 'pending',
                  })
                }
                className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F4F8FD] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-900">
                      {order.orderNumber}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span
                      className={
                        order.status === 'pending'
                          ? 'text-blue-600 font-medium'
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
                  <div className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                    {formatMoney(order.totalCents, order.currency)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {order.itemsCount} prod.
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-slate-200 bg-[#F4F8FD] flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              Ultimele modificări în panou
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {summary.recentLogs.length === 0 ? (
              <div className="px-5 py-4 text-xs text-slate-400">
                Nicio acțiune recentă în jurnal.
              </div>
            ) : (
              summary.recentLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="px-5 py-2.5 text-xs">
                  <div className="font-medium text-slate-900 truncate">
                    {log.action}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                    {log.actorEmail} ·{' '}
                    {new Date(log.createdAt).toLocaleString('ro-RO')}
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
