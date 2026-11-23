import { useCallback, useEffect, useState } from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney, type CouponRecord } from '../types/commerce';
import { GenericModulePanel } from './GenericModulePanel';

export type MarketingSubpageKey = 'cupoane' | 'reguli-cos';

interface MarketingWorkspaceProps {
  subpage?: MarketingSubpageKey;
}

export function MarketingWorkspace({ subpage = 'cupoane' }: MarketingWorkspaceProps) {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<MarketingSubpageKey>(subpage);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New coupon form
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed_cents'>('percent');
  const [discountInput, setDiscountInput] = useState('10');
  const [minOrderRon, setMinOrderRon] = useState('0');
  const [maxUses, setMaxUses] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setActiveTab(subpage);
  }, [subpage]);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/coupons');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nu s-au putut încărca cupoanele.');
      setCoupons(data.coupons ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare de conexiune.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (activeTab === 'cupoane') {
      loadCoupons();
    }
  }, [activeTab, loadCoupons]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const numVal = Number(discountInput) || 0;
      const discountValue =
        discountType === 'percent'
          ? Math.max(1, Math.min(99, Math.round(numVal)))
          : Math.max(100, Math.round(numVal * 100));
      const minOrderCents = Math.max(0, Math.round((Number(minOrderRon) || 0) * 100));
      const parsedMax = maxUses.trim() ? Math.max(1, Math.round(Number(maxUses))) : null;

      const res = await authFetch('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          title: title.trim(),
          discountType,
          discountValue,
          minOrderCents,
          maxUses: parsedMax,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nu s-a putut crea cuponul.');
      setCode('');
      setTitle('');
      setDiscountInput('10');
      setMinOrderRon('0');
      setMaxUses('');
      await loadCoupons();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCoupon = async (coupon: CouponRecord) => {
    await authFetch(`/api/admin/coupons/${coupon.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    await loadCoupons();
  };

  const handleDeleteCoupon = async (id: number) => {
    await authFetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    await loadCoupons();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Marketing &amp; Reduceri
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Administrează codurile promoționale din checkout, pragurile minime de coș și pachetele combo.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-[#EAF2FC] rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('cupoane')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'cupoane'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-blue-900'
            }`}
          >
            Coduri de reducere
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reguli-cos')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'reguli-cos'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-blue-900'
            }`}
          >
            Reguli coș &amp; pachete
          </button>
        </div>
      </div>

      {activeTab === 'cupoane' ? (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateCoupon}
            className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cod cupon *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VERDA15"
                className="w-full px-3 py-2 text-sm font-mono uppercase bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Campanie / Titlu *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Reducere Prima Comandă"
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tip reducere
              </label>
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as 'percent' | 'fixed_cents')
                }
                className="w-full px-2.5 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              >
                <option value="percent">Procent (%)</option>
                <option value="fixed_cents">Sumă fixă (RON)</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {discountType === 'percent' ? '%' : 'RON'}
              </label>
              <input
                type="number"
                min={1}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="w-full px-2.5 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Coș minim (RON)
              </label>
              <input
                type="number"
                min={0}
                value={minOrderRon}
                onChange={(e) => setMinOrderRon(e.target.value)}
                className="w-full px-2.5 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Limită uz
              </label>
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="∞"
                className="w-full px-2.5 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={saving || !code.trim() || !title.trim()}
                className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg whitespace-nowrap"
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

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-sm text-slate-500">Se încarcă cupoanele...</div>
            ) : coupons.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Nu există încă coduri de reducere configurate.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F4F8FD] text-xs font-medium text-slate-500">
                      <th className="py-2.5 px-4">Cod Cupon</th>
                      <th className="py-2.5 px-4">Campanie</th>
                      <th className="py-2.5 px-4 text-right">Valoare Reducere</th>
                      <th className="py-2.5 px-4 text-right">Coș Minim</th>
                      <th className="py-2.5 px-4 text-right">Utilizări</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-blue-50/30">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-700">
                          <span className="inline-flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" />
                            {c.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{c.title}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {c.discountType === 'percent'
                            ? `${c.discountValue}%`
                            : formatMoney(c.discountValue, 'RON')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600">
                          {c.minOrderCents > 0 ? formatMoney(c.minOrderCents, 'RON') : 'Fără prag'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                          {c.usageCount} / {c.maxUses ?? '∞'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleCoupon(c)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border ${
                              c.isActive
                                ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {c.isActive ? 'Activ' : 'Inactiv'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(c.id)}
                            aria-label={`Șterge cuponul ${c.code}`}
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
      ) : (
        <div className="space-y-6">
          <GenericModulePanel
            moduleKey="cart_discount_rules"
            title="Reguli automate de discount în coș"
            description="Discounturi aplicate automat în coș fără cod promoțional (ex: reducere la depășirea unui prag valoric)."
            codeLabel="Prag / Condiție"
            codePlaceholder="ex: MIN-1000-RON"
            extraPlaceholder='{"discountPercent": 5, "freeShipping": true}'
          />
          <GenericModulePanel
            moduleKey="combo_rules"
            title="Pachete Combo & Produse Împreună"
            description="Asociază produse complementare vândute cu reducere la achiziția simultană."
            codeLabel="Cod Pachet"
            codePlaceholder="ex: COMBO-OFFICE"
            extraPlaceholder='{"discountPercent": 12}'
          />
        </div>
      )}
    </div>
  );
}
