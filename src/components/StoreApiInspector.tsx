import { useEffect, useState } from 'react';
import { Check, Copy, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney, type ProductRecord, type TierCalculationResult } from '../types/commerce';

interface StoreApiInspectorProps {
  products: ProductRecord[];
}

export function StoreApiInspector({ products }: StoreApiInspectorProps) {
  const { authFetch } = useAuth();
  const [selectedHandle, setSelectedHandle] = useState<string>(
    products[0]?.handle ?? ''
  );
  const [payloadJson, setPayloadJson] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [testQty, setTestQty] = useState<number>(10);
  const [calcResult, setCalcResult] = useState<TierCalculationResult | null>(
    null
  );

  useEffect(() => {
    if (!selectedHandle && products.length > 0) {
      setSelectedHandle(products[0].handle);
    }
  }, [products, selectedHandle]);

  const selectedProduct = products.find((p) => p.handle === selectedHandle);

  const fetchStoreEndpoint = async () => {
    if (!selectedHandle) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/store/products/${encodeURIComponent(selectedHandle)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cererea API a eșuat.');
      }
      setPayloadJson(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la interogare.');
    } finally {
      setLoading(false);
    }
  };

  const runTierCalculation = async () => {
    if (!selectedProduct?.id) return;
    try {
      const res = await authFetch('/api/admin/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: testQty,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCalcResult(data.calculation);
      }
    } catch {
      // handled silently
    }
  };

  useEffect(() => {
    if (selectedHandle) {
      fetchStoreEndpoint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHandle]);

  const handleCopy = async () => {
    if (!payloadJson) return;
    await navigator.clipboard.writeText(payloadJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-teal-900/10 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0F2928]">
            Inspector Store API (Headless)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Verifică răspunsul JSON live din PostgreSQL pentru frontend-ul Node.js și testează calculul pragurilor de preț.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedHandle}
            onChange={(e) => setSelectedHandle(e.target.value)}
            aria-label="Selectează produs"
            className="px-3 py-2 text-xs font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:border-teal-600"
          >
            {products.map((p) => (
              <option key={p.handle} value={p.handle}>
                /api/store/products/{p.handle}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchStoreEndpoint}
            disabled={loading || !selectedHandle}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{loading ? 'Se încarcă...' : 'Interoghează API'}</span>
          </button>
        </div>
      </div>

      {selectedProduct && (
        <div className="bg-white border border-teal-900/10 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-700 whitespace-nowrap">
              Testează cantitatea &amp; pragul:
            </label>
            <input
              type="number"
              min={1}
              value={testQty}
              onChange={(e) =>
                setTestQty(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-24 px-3 py-1.5 text-sm font-mono tabular-nums border border-teal-900/15 rounded-lg"
            />
            <button
              type="button"
              onClick={runTierCalculation}
              className="px-3.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg whitespace-nowrap shrink-0"
            >
              Calculează
            </button>
          </div>

          {calcResult && (
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
              <span
                className={
                  calcResult.valid
                    ? 'text-teal-700 font-medium'
                    : 'text-red-600 font-medium'
                }
              >
                {calcResult.valid
                  ? 'Cantitate validă'
                  : calcResult.validationErrors[0] || 'Invalid'}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-700">
                Unitar: {formatMoney(calcResult.unitPriceCents, selectedProduct.currency)}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-[#0F2928] font-semibold">
                Total: {formatMoney(calcResult.totalPriceCents, selectedProduct.currency)}
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-teal-900/10 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-600">
            GET /api/store/products/{selectedHandle || '...'}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-teal-700" />
                <span>Copiat</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiază JSON</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono leading-relaxed text-[#0F2928] bg-[#F7FBFA] overflow-x-auto max-h-[520px] overflow-y-auto">
          <code>{payloadJson || '// Selectează un produs pentru a inspecta răspunsul JSON.'}</code>
        </pre>
      </div>
    </div>
  );
}
