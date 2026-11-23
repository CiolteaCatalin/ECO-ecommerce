import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Plus,
  RotateCcw,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  formatMoney,
  type CustomerRecord,
  type OrderCounts,
  type OrderRecord,
  type ProductRecord,
} from '../types/commerce';
import { GenericModulePanel } from './GenericModulePanel';

interface OrdersWorkspaceProps {
  subPageId: string;
  onCountsUpdated?: (counts: OrderCounts) => void;
  onNavigateSubpage?: (subPageId: string) => void;
}

const SUBPAGE_META: Record<
  string,
  { title: string; subtitle: string; filter: string }
> = {
  'comenzi-asteptare': {
    title: 'Comenzi în așteptare',
    subtitle: 'Comenzi noi recepționate care așteaptă confirmarea și pregătirea coletului.',
    filter: 'pending',
  },
  'comenzi-procesare': {
    title: 'Comenzi în procesare',
    subtitle: 'Comenzi aflate în curs de împachetare, facturare și generare AWB.',
    filter: 'processing',
  },
  'comenzi-procesate': {
    title: 'Comenzi procesate',
    subtitle: 'Comenzi finalizate, predate curierului sau livrate către clienți.',
    filter: 'processed',
  },
  'borderou-expedieri': {
    title: 'Borderou expedieri',
    subtitle: 'Centralizator AWB-uri și predare zilnică către curierii integrați.',
    filter: 'all',
  },
  'comenzi-retur': {
    title: 'Comenzi de retur',
    subtitle: 'Comenzi returnate integral sau parțial și statusul rambursărilor.',
    filter: 'returned',
  },
  'cereri-retur': {
    title: 'Cereri retur',
    subtitle: 'Solicitări de retur deschise de clienți care necesită aprobare.',
    filter: 'return_requests',
  },
};

const ORDER_TABS: Array<{ id: string; label: string; filter: string }> = [
  { id: 'comenzi-asteptare', label: 'În așteptare', filter: 'pending' },
  { id: 'comenzi-procesare', label: 'În procesare', filter: 'processing' },
  { id: 'comenzi-procesate', label: 'Procesate', filter: 'processed' },
  { id: 'comenzi-retur', label: 'Retururi', filter: 'returned' },
  { id: 'cereri-retur', label: 'Cereri retur', filter: 'return_requests' },
  { id: 'borderou-expedieri', label: 'Toate comenzile', filter: 'all' },
];

interface DraftLineItem {
  product: ProductRecord;
  quantity: number;
  unitPriceCents: number;
}

function resolveClientUnitPrice(product: ProductRecord, qty: number): number {
  const sorted = [...(product.priceTiers || [])].sort((a, b) => b.minQty - a.minQty);
  for (const tier of sorted) {
    if (qty >= tier.minQty && (tier.maxQty === null || qty <= tier.maxQty)) {
      return tier.unitPriceCents;
    }
  }
  return product.basePriceCents;
}

export function OrdersWorkspace({
  subPageId,
  onCountsUpdated,
  onNavigateSubpage,
}: OrdersWorkspaceProps) {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [counts, setCounts] = useState<OrderCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkWorking, setBulkWorking] = useState(false);

  // Multi-field filters
  const [filterOrderNo, setFilterOrderNo] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterCourier, setFilterCourier] = useState('');

  // Full New Order Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<ProductRecord[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<CustomerRecord[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);
  const [deductStock, setDeductStock] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingCity, setShippingCity] = useState('București');
  const [shippingMethod, setShippingMethod] = useState('FAN Courier Express');
  const [paymentMethod, setPaymentMethod] = useState('Card Online (Netopia)');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [customTotalRon, setCustomTotalRon] = useState('');
  const [notes, setNotes] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  if (subPageId === 'feeduri-comenzi') {
    return (
      <GenericModulePanel
        moduleKey="order_feeds"
        title="Feed-uri de comenzi"
        description="Configurează exportul automat al comenzilor către ERP, SmartBill, Oblio sau sisteme externe de logistică."
        codeLabel="Format / URL"
        codePlaceholder="XML / JSON Webhook"
      />
    );
  }

  const meta = SUBPAGE_META[subPageId] ?? SUBPAGE_META['comenzi-asteptare'];

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/orders?status=${meta.filter}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders ?? []);
        setSelectedIds([]);
        if (data.counts) {
          setCounts(data.counts);
          onCountsUpdated?.(data.counts);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, meta.filter, onCountsUpdated]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!showBuilder) return;
    let active = true;
    (async () => {
      const [pRes, cRes] = await Promise.all([
        authFetch('/api/admin/products'),
        authFetch('/api/admin/customers'),
      ]);
      if (!active) return;
      if (pRes.ok) {
        const pd = await pRes.json();
        setCatalogProducts(pd.products ?? []);
      }
      if (cRes.ok) {
        const cd = await cRes.json();
        setExistingCustomers(cd.customers ?? []);
      }
    })();
    return () => {
      active = false;
    };
  }, [showBuilder, authFetch]);

  const handleStatusChange = async (
    orderId: number,
    updates: { status?: string; returnStatus?: string; awbNumber?: string }
  ) => {
    await authFetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    await loadOrders();
  };

  const handleGenerateAwb = async (order: OrderRecord) => {
    const prefix = order.shippingMethod.toLowerCase().includes('sameday')
      ? 'SMD'
      : 'FAN';
    const awb = `${prefix}${Math.floor(100000000 + Math.random() * 899999999)}`;
    await handleStatusChange(order.id, {
      awbNumber: awb,
      status: order.status === 'pending' ? 'processing' : order.status,
    });
  };

  const handleBulkAction = async (action: 'confirm' | 'process' | 'awb') => {
    if (selectedIds.length === 0) return;
    setBulkWorking(true);
    try {
      for (const id of selectedIds) {
        const order = orders.find((o) => o.id === id);
        if (!order) continue;
        if (action === 'confirm') {
          await authFetch(`/api/admin/orders/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'processing' }),
          });
        } else if (action === 'process') {
          await authFetch(`/api/admin/orders/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'processed' }),
          });
        } else if (action === 'awb' && !order.awbNumber) {
          const prefix = order.shippingMethod.toLowerCase().includes('sameday') ? 'SMD' : 'FAN';
          const awb = `${prefix}${Math.floor(100000000 + Math.random() * 899999999)}`;
          await authFetch(`/api/admin/orders/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              awbNumber: awb,
              status: order.status === 'pending' ? 'processing' : order.status,
            }),
          });
        }
      }
      await loadOrders();
    } finally {
      setBulkWorking(false);
    }
  };

  const calculatedTotalCents = useMemo(() => {
    if (lineItems.length > 0) {
      return lineItems.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
    }
    return Math.max(0, Math.round(Number(customTotalRon || 0) * 100));
  }, [lineItems, customTotalRon]);

  const totalUnitsCount = useMemo(() => {
    if (lineItems.length > 0) {
      return lineItems.reduce((sum, l) => sum + l.quantity, 0);
    }
    return 1;
  }, [lineItems]);

  const addProductLine = (product: ProductRecord) => {
    if (!product.id) return;
    setLineItems((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        const nextQty = existing.quantity + (product.stepQty || 1);
        const unitPriceCents = resolveClientUnitPrice(product, nextQty);
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: nextQty, unitPriceCents } : l
        );
      }
      const initialQty = product.minOrderQty || 1;
      return [
        ...prev,
        {
          product,
          quantity: initialQty,
          unitPriceCents: resolveClientUnitPrice(product, initialQty),
        },
      ];
    });
    setProductSearch('');
  };

  const updateLineQty = (productId: number, qty: number) => {
    const safeQty = Math.max(1, qty);
    setLineItems((prev) =>
      prev.map((l) =>
        l.product.id === productId
          ? {
              ...l,
              quantity: safeQty,
              unitPriceCents: resolveClientUnitPrice(l.product, safeQty),
            }
          : l
      )
    );
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) return;
    setSavingOrder(true);
    try {
      const res = await authFetch('/api/admin/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          paymentStatus,
          paymentMethod,
          shippingMethod,
          shippingCity,
          totalCents: calculatedTotalCents,
          itemsCount: totalUnitsCount,
          notes,
          deductStock,
          items: lineItems
            .filter((l) => Boolean(l.product.id))
            .map((l) => ({ productId: l.product.id as number, quantity: l.quantity })),
        }),
      });
      if (res.ok) {
        setShowBuilder(false);
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setNotes('');
        setLineItems([]);
        setCustomTotalRon('');
        await loadOrders();
      }
    } finally {
      setSavingOrder(false);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (
        filterOrderNo.trim() &&
        !o.orderNumber.toLowerCase().includes(filterOrderNo.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        filterEmail.trim() &&
        !o.customerEmail.toLowerCase().includes(filterEmail.trim().toLowerCase()) &&
        !o.customerName.toLowerCase().includes(filterEmail.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        filterPhone.trim() &&
        !o.customerPhone.toLowerCase().includes(filterPhone.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        filterCourier.trim() &&
        !o.shippingMethod.toLowerCase().includes(filterCourier.trim().toLowerCase()) &&
        !o.awbNumber.toLowerCase().includes(filterCourier.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [orders, filterOrderNo, filterEmail, filterPhone, filterCourier]);

  const matchingCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return [];
    return existingCustomers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [customerSearch, existingCustomers]);

  const matchingProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return catalogProducts.slice(0, 5);
    return catalogProducts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.handle.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [productSearch, catalogProducts]);

  const statusLabel = (status: string) => {
    if (status === 'pending') return 'În așteptare';
    if (status === 'processing') return 'În procesare';
    if (status === 'processed') return 'Procesată';
    if (status === 'returned') return 'Retur';
    return status;
  };

  const paymentLabel = (ps: string) => {
    if (ps === 'paid') return 'Plată finalizată';
    if (ps === 'refund_pending') return 'Rambursare în curs';
    return 'Plată în așteptare';
  };

  const allSelected = filtered.length > 0 && filtered.every((o) => selectedIds.includes(o.id));

  return (
    <div className="space-y-6">
      {counts && (
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-teal-900/10 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-teal-900/10">
          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">În așteptare</div>
            <div className="mt-1.5 text-2xl font-semibold text-teal-700 font-mono tabular-nums">
              {counts.pending}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">În procesare</div>
            <div className="mt-1.5 text-2xl font-semibold text-[#0F2928] font-mono tabular-nums">
              {counts.processing}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Procesate</div>
            <div className="mt-1.5 text-2xl font-semibold text-[#0F2928] font-mono tabular-nums">
              {counts.processed}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Cereri retur</div>
            <div className="mt-1.5 text-2xl font-semibold text-amber-700 font-mono tabular-nums">
              {counts.returnRequests}
            </div>
          </div>
        </div>
      )}

      {/* Builder complet comandă nouă */}
      {showBuilder && (
        <form
          onSubmit={handleCreateOrder}
          className="bg-white border border-teal-900/15 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-teal-900/10 pb-4">
            <div>
              <h3 className="text-base font-semibold text-[#0F2928]">
                Adaugă o comandă nouă
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Selectează un client existent sau introdu datele, adaugă produse cu calcul automat pe praguri și ajustează stocul.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-teal-900 border border-teal-900/15 rounded-lg"
            >
              Închide
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Stânga: Produse din comandă */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Adaugă produs din catalog
                </label>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Caută după nume produs sau SKU..."
                  className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
                />
                {matchingProducts.length > 0 && (
                  <div className="mt-1.5 border border-teal-900/10 rounded-lg divide-y divide-teal-900/5 bg-white">
                    {matchingProducts.map((p) => (
                      <button
                        key={p.id ?? p.handle}
                        type="button"
                        onClick={() => addProductLine(p)}
                        className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-teal-50/50 text-left"
                      >
                        <span className="font-medium text-[#0F2928] truncate">
                          {p.title}{' '}
                          <span className="font-mono text-slate-400">({p.sku || p.handle})</span>
                        </span>
                        <span className="font-mono tabular-nums text-teal-800 shrink-0 ml-2">
                          {formatMoney(p.basePriceCents, p.currency)} · Stoc {p.stockQuantity}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {lineItems.length > 0 ? (
                <div className="border border-teal-900/10 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F7FBFA] border-b border-teal-900/10 text-slate-500">
                        <th className="py-2 px-3">Produs</th>
                        <th className="py-2 px-3 text-right">Preț unitar</th>
                        <th className="py-2 px-3 text-right">Cantitate</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                        <th className="py-2 px-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-900/5">
                      {lineItems.map((line) => (
                        <tr key={line.product.id}>
                          <td className="py-2 px-3 font-medium text-[#0F2928]">
                            {line.product.title}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">
                            {formatMoney(line.unitPriceCents, 'RON')}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(e) =>
                                line.product.id &&
                                updateLineQty(line.product.id, Number(e.target.value) || 1)
                              }
                              className="w-16 px-2 py-1 text-right font-mono border border-teal-900/15 rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                            {formatMoney(line.unitPriceCents * line.quantity, 'RON')}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setLineItems((prev) =>
                                  prev.filter((x) => x.product.id !== line.product.id)
                                )
                              }
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sau introdu valoare manuală comandă (RON)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={customTotalRon}
                    onChange={(e) => setCustomTotalRon(e.target.value)}
                    placeholder="ex: 450.00"
                    className="w-48 px-3 py-2 text-sm font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-teal-900/10">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={deductStock}
                    onChange={(e) => setDeductStock(e.target.checked)}
                    className="rounded border-teal-900/30 text-teal-600 focus:ring-teal-600"
                  />
                  <span>Ajustează automat stocul produselor din comandă</span>
                </label>
                <div className="text-sm font-semibold text-[#0F2928] font-mono tabular-nums">
                  TOTAL: {formatMoney(calculatedTotalCents, 'RON')}
                </div>
              </div>
            </div>

            {/* Dreapta: Client & Plată / Livrare */}
            <div className="lg:col-span-5 space-y-3 border-t lg:border-t-0 lg:border-l border-teal-900/10 lg:pl-6 pt-4 lg:pt-0">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Caută client existent (auto-completare)
                </label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Caută după nume, email sau telefon..."
                  className="w-full px-3 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                />
                {matchingCustomers.length > 0 && (
                  <div className="mt-1 border border-teal-900/10 rounded-lg divide-y divide-teal-900/5 bg-white">
                    {matchingCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCustomerName(c.fullName);
                          setCustomerEmail(c.email);
                          setCustomerPhone(c.phone);
                          setShippingCity(c.city || 'București');
                          setCustomerSearch('');
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-teal-50/50"
                      >
                        <span className="font-medium text-[#0F2928]">{c.fullName}</span>
                        <span className="text-slate-500"> · {c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nume client *"
                  className="px-3 py-2 text-xs bg-white border border-teal-900/15 rounded-lg"
                />
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Email client *"
                  className="px-3 py-2 text-xs bg-white border border-teal-900/15 rounded-lg"
                />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Telefon"
                  className="px-3 py-2 text-xs bg-white border border-teal-900/15 rounded-lg"
                />
                <input
                  type="text"
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  placeholder="Oraș livrare"
                  className="px-3 py-2 text-xs bg-white border border-teal-900/15 rounded-lg"
                />
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'pending')}
                  className="px-3 py-2 text-xs bg-white border border-teal-900/15 rounded-lg"
                >
                  <option value="paid">Plată finalizată</option>
                  <option value="pending">Plată în așteptare</option>
                </select>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-teal-900/15 rounded-lg"
                >
                  <option value="Card Online (Netopia)">Card Online (Netopia)</option>
                  <option value="Ramburs la curier">Ramburs la curier</option>
                  <option value="Transfer Bancar B2B">Transfer Bancar B2B</option>
                </select>
              </div>

              <input
                type="text"
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
                placeholder="Metodă livrare (ex: FAN Courier Express)"
                className="w-full px-3 py-2 text-xs bg-white border border-teal-900/15 rounded-lg"
              />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notă internă comandă..."
                className="w-full px-3 py-2 text-xs bg-white border border-teal-900/15 rounded-lg"
              />

              <button
                type="submit"
                disabled={savingOrder}
                className="w-full py-2.5 px-4 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {savingOrder ? 'Se înregistrează...' : 'Înregistrează comanda'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
        {/* Header + Taburi Status */}
        <div className="p-5 border-b border-teal-900/10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0F2928]">{meta.title}</h2>
              <p className="text-sm text-slate-600 mt-0.5">{meta.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowBuilder((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adaugă o comandă nouă</span>
            </button>
          </div>

          {onNavigateSubpage && (
            <div className="flex items-center gap-1 p-1 bg-[#E7F3F1] rounded-lg w-fit overflow-x-auto max-w-full">
              {ORDER_TABS.map((tab) => {
                const active = subPageId === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onNavigateSubpage(tab.id)}
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
          )}

          {/* Filtre multi-câmp stil MerchantPro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <input
              type="text"
              value={filterOrderNo}
              onChange={(e) => setFilterOrderNo(e.target.value)}
              placeholder="ID / Nr. comandă"
              className="px-3 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
            />
            <input
              type="text"
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.target.value)}
              placeholder="Nume sau Email client"
              className="px-3 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
            />
            <input
              type="text"
              value={filterPhone}
              onChange={(e) => setFilterPhone(e.target.value)}
              placeholder="Telefon client"
              className="px-3 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
            />
            <input
              type="text"
              value={filterCourier}
              onChange={(e) => setFilterCourier(e.target.value)}
              placeholder="Curier sau AWB"
              className="px-3 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
            />
            <button
              type="button"
              onClick={() => {
                setFilterOrderNo('');
                setFilterEmail('');
                setFilterPhone('');
                setFilterCourier('');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-[#F7FBFA] hover:bg-teal-50 border border-teal-900/15 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetează filtre</span>
            </button>
          </div>

          {/* Bară acțiuni în masă */}
          {selectedIds.length > 0 && (
            <div className="p-3 bg-[#E6F4F2] border border-teal-900/15 rounded-lg flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-medium text-teal-950 font-mono tabular-nums">
                {selectedIds.length} comenzi selectate
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={bulkWorking}
                  onClick={() => handleBulkAction('confirm')}
                  className="px-3 py-1.5 text-xs font-medium text-teal-900 bg-white border border-teal-900/15 hover:bg-teal-50 rounded-md"
                >
                  Confirmă în procesare
                </button>
                <button
                  type="button"
                  disabled={bulkWorking}
                  onClick={() => handleBulkAction('awb')}
                  className="px-3 py-1.5 text-xs font-medium text-teal-900 bg-white border border-teal-900/15 hover:bg-teal-50 rounded-md"
                >
                  Generează AWB-uri
                </button>
                <button
                  type="button"
                  disabled={bulkWorking}
                  onClick={() => handleBulkAction('process')}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md"
                >
                  Marchează procesate
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-500">Se încarcă comenzile...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nu există comenzi care să corespundă filtrelor curente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? filtered.map((o) => o.id) : [])
                      }
                      aria-label="Selectează toate comenzile"
                      className="rounded border-teal-900/30 text-teal-600"
                    />
                  </th>
                  <th className="py-2.5 px-3">Comandă</th>
                  <th className="py-2.5 px-4">Client &amp; Livrare</th>
                  <th className="py-2.5 px-4">Curier / AWB</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4 text-right">Opțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-900/5">
                {filtered.map((order) => {
                  const isExpanded = expandedId === order.id;
                  const isSelected = selectedIds.includes(order.id);
                  return (
                    <Fragment key={order.id}>
                      <tr className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              setSelectedIds((prev) =>
                                e.target.checked
                                  ? [...prev, order.id]
                                  : prev.filter((id) => id !== order.id)
                              )
                            }
                            aria-label={`Selectează ${order.orderNumber}`}
                            className="rounded border-teal-900/30 text-teal-600"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#0F2928] hover:text-teal-700"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-teal-700" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{order.orderNumber}</span>
                          </button>
                          <div className="text-[11px] text-slate-500 pl-5 mt-0.5">
                            {new Date(order.createdAt).toLocaleString('ro-RO')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#0F2928]">
                            {order.customerName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.customerEmail} · {order.shippingCity}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="text-slate-700">{order.shippingMethod}</div>
                          <div className="font-mono text-teal-700">
                            {order.awbNumber || 'Fără AWB'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleStatusChange(order.id, { status: e.target.value })
                            }
                            aria-label={`Status ${order.orderNumber}`}
                            className="px-2.5 py-1 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-md focus:outline-none focus:border-teal-600"
                          >
                            <option value="pending">În așteptare</option>
                            <option value="processing">În procesare</option>
                            <option value="processed">Procesată</option>
                            <option value="returned">Retur</option>
                          </select>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {statusLabel(order.status)} · {paymentLabel(order.paymentStatus)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <div className="font-semibold text-[#0F2928]">
                            {formatMoney(order.totalCents, order.currency)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {order.itemsCount} prod. · {order.paymentMethod}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {order.returnStatus === 'requested' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(order.id, {
                                    returnStatus: 'approved',
                                    status: 'returned',
                                  })
                                }
                                title="Aprobă cererea de retur"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprobă retur</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(order.id, {
                                    returnStatus: 'completed',
                                    status: 'processed',
                                  })
                                }
                                title="Respinge cererea de retur"
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Respinge</span>
                              </button>
                            </div>
                          ) : !order.awbNumber ? (
                            <button
                              type="button"
                              onClick={() => handleGenerateAwb(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Generează AWB</span>
                            </button>
                          ) : (
                            <span className="text-xs font-mono text-slate-500">
                              AWB generat
                            </span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#F7FBFA]">
                          <td colSpan={7} className="px-6 py-4 text-xs text-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <div className="font-semibold text-[#0F2928] mb-1">
                                  Date contact și livrare
                                </div>
                                <div>Client: {order.customerName}</div>
                                <div>Email: {order.customerEmail}</div>
                                <div>Telefon: {order.customerPhone || 'Nespecificat'}</div>
                                <div>Localitate: {order.shippingCity}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-[#0F2928] mb-1">
                                  Detalii plată și expediere
                                </div>
                                <div>Metodă plată: {order.paymentMethod}</div>
                                <div>Status plată: {paymentLabel(order.paymentStatus)}</div>
                                <div>Curier: {order.shippingMethod}</div>
                                <div>AWB: {order.awbNumber || 'Negenerat'}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-[#0F2928] mb-1">
                                  Observații și retur
                                </div>
                                <div>Notă: {order.notes || 'Fără observații interne.'}</div>
                                <div>Status retur: {order.returnStatus}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
