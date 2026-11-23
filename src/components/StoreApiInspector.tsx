import { useEffect, useState } from 'react';
import { Check, Copy, FileQuestion, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  formatMoney,
  type ProductRecord,
  type TierCalculationResult,
} from '../types/commerce';

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
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Inspector Store API (Headless)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Verifică răspunsul JSON live din PostgreSQL pentru storefront-ul Node.js, inclusiv câmpurile <code className="font-mono">price_on_request</code> și <code className="font-mono">orderable</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedHandle}
            onChange={(e) => {
              setSelectedHandle(e.target.value);
              setCalcResult(null);
            }}
            aria-label="Selectează produs"
            className="px-3 py-2 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{loading ? 'Se încarcă...' : 'Interoghează API'}</span>
          </button>
        </div>
      </div>

      {selectedProduct && selectedProduct.priceOnRequest && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
          <FileQuestion className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Produs cu Preț la cerere:</strong> În JSON-ul de mai jos,{' '}
            <code className="font-mono">price_on_request: true</code> și{' '}
            <code className="font-mono">orderable: false</code> semnalează frontend-ului să afișeze butonul „Cere ofertă” (POST <code className="font-mono">/api/store/quotes</code>) în locul coșului de cumpărături.
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              className="w-24 px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg bg-[#F4F8FD]"
            />
            <button
              type="button"
              onClick={runTierCalculation}
              className="px-3.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg whitespace-nowrap shrink-0"
            >
              Calculează
            </button>
          </div>

          {calcResult && (
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
              <span
                className={
                  calcResult.valid
                    ? 'text-blue-700 font-medium'
                    : 'text-red-600 font-medium'
                }
              >
                {calcResult.valid
                  ? 'Cantitate validă'
                  : calcResult.validationErrors[0] || 'Invalid'}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-700">
                Unitar:{' '}
                {formatMoney(calcResult.unitPriceCents, selectedProduct.currency)}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-900 font-semibold">
                Total:{' '}
                {formatMoney(
                  calcResult.totalPriceCents,
                  selectedProduct.currency
                )}
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

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-600">
            GET /api/store/products/{selectedHandle || '...'}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-blue-700" />
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
        <pre className="p-4 text-xs font-mono leading-relaxed text-slate-900 bg-[#F4F8FD] overflow-x-auto max-h-[520px] overflow-y-auto">
          <code>
            {payloadJson ||
              '// Selectează un produs pentru a inspecta răspunsul JSON.'}
          </code>
        </pre>
      </div>
    </div>
  );
}
