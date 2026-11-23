import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  Minus,
  Plus,
  Save,
  Star,
  Trash2,
} from 'lucide-react';
import {
  formatMoney,
  STUDIO_IMAGE_PRESETS,
  type ProductRecord,
  type ProductStatus,
  type TierCalculationResult,
} from '../types/commerce';
import { useAuth } from '../context/AuthContext';
import { ProductImage } from './ProductImage';

interface ProductEditorProps {
  initialProduct: ProductRecord;
  onSave: (product: ProductRecord) => Promise<void>;
  onCancel: () => void;
}

type EditorTab =
  | 'general'
  | 'media'
  | 'inventory'
  | 'pricing'
  | 'variants'
  | 'seo';

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: 'general', label: 'General & Descrieri' },
  { id: 'media', label: 'Poze & Galerie' },
  { id: 'inventory', label: 'Stocuri & Min/Max/Step' },
  { id: 'pricing', label: 'Prețuri & Praguri (Tiered)' },
  { id: 'variants', label: 'Variante' },
  { id: 'seo', label: 'SEO & OpenGraph' },
];

function slugifyHandle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ProductEditor({
  initialProduct,
  onSave,
  onCancel,
}: ProductEditorProps) {
  const { authFetch } = useAuth();
  const [form, setForm] = useState<ProductRecord>(initialProduct);
  const [activeTab, setActiveTab] = useState<EditorTab>('general');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewLongDesc, setPreviewLongDesc] = useState(false);

  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');

  const [simQty, setSimQty] = useState<number>(
    Math.max(1, initialProduct.minOrderQty || 1)
  );
  const [serverCalc, setServerCalc] = useState<TierCalculationResult | null>(
    null
  );
  const [calcLoading, setCalcLoading] = useState(false);

  const isEditing = Boolean(form.id);

  const updateField = <K extends keyof ProductRecord>(
    key: K,
    value: ProductRecord[K]
  ) => {
    setSaveSuccess(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const localPricePreview = useMemo(() => {
    const min = Math.max(1, form.minOrderQty);
    const step = Math.max(1, form.stepQty);
    const max = form.maxOrderQty;
    const availableStock = Math.max(
      0,
      form.stockQuantity - form.reservedQuantity
    );

    const errors: string[] = [];
    if (simQty < min) errors.push(`Cantitatea minimă de comandă este ${min}.`);
    if (max !== null && simQty > max)
      errors.push(`Cantitatea maximă de comandă este ${max}.`);
    if ((simQty - min) % step !== 0)
      errors.push(`Cantitatea trebuie să crească în pași de ${step} începând de la ${min}.`);
    if (form.manageInventory && !form.allowBackorder && simQty > availableStock)
      errors.push(`Depășește stocul disponibil (${availableStock} buc.).`);

    const matchedTier = [...form.priceTiers]
      .sort((a, b) => b.minQty - a.minQty)
      .find(
        (t) => simQty >= t.minQty && (t.maxQty === null || simQty <= t.maxQty)
      );

    const unitPriceCents = matchedTier
      ? matchedTier.unitPriceCents
      : form.basePriceCents;
    const totalPriceCents = unitPriceCents * simQty;
    const savingsCents = Math.max(
      0,
      form.basePriceCents * simQty - totalPriceCents
    );

    return {
      requestedQty: simQty,
      valid: errors.length === 0,
      validationErrors: errors,
      unitPriceCents,
      totalPriceCents,
      savingsCents,
      appliedTier: matchedTier ?? null,
      availableStock,
    };
  }, [form, simQty]);

  const handleServerCalculate = async () => {
    if (!form.id) return;
    setCalcLoading(true);
    try {
      const res = await authFetch('/api/admin/calculate-price', {
        method: 'POST',
        body: JSON.stringify({ productId: form.id, quantity: simQty }),
      });
      if (res.ok) {
        const data = await res.json();
        setServerCalc(data.calculation);
      }
    } finally {
      setCalcLoading(false);
    }
  };

  const handleAddGalleryImage = (urlToAdd?: string, altToAdd?: string) => {
    const url = (urlToAdd ?? newImageUrl).trim();
    if (!url) return;
    const altText = (altToAdd ?? newImageAlt).trim() || form.title || 'Fotografie produs';
    const nextImages = [
      ...form.galleryImages,
      {
        url,
        altText,
        sortOrder: form.galleryImages.length,
        isPrimary: form.galleryImages.length === 0 && !form.thumbnailUrl,
      },
    ];
    setForm((prev) => ({
      ...prev,
      thumbnailUrl: prev.thumbnailUrl || url,
      galleryImages: nextImages,
    }));
    if (!urlToAdd) {
      setNewImageUrl('');
      setNewImageAlt('');
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    const chosen = form.galleryImages[index];
    if (!chosen) return;
    setForm((prev) => ({
      ...prev,
      thumbnailUrl: chosen.url,
      galleryImages: prev.galleryImages.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      })),
    }));
  };

  const handleMoveGalleryImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= form.galleryImages.length) return;
    const copy = [...form.galleryImages];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    updateField(
      'galleryImages',
      copy.map((img, i) => ({ ...img, sortOrder: i }))
    );
  };

  const handleRemoveGalleryImage = (index: number) => {
    const remaining = form.galleryImages
      .filter((_, i) => i !== index)
      .map((img, i) => ({ ...img, sortOrder: i }));
    updateField('galleryImages', remaining);
  };

  const handleAddTier = () => {
    const lastTier = form.priceTiers[form.priceTiers.length - 1];
    const nextMin = lastTier
      ? (lastTier.maxQty ?? lastTier.minQty + 9) + 1
      : Math.max(1, form.minOrderQty);
    const nextPrice = Math.max(
      100,
      Math.round((lastTier?.unitPriceCents ?? form.basePriceCents) * 0.9)
    );
    updateField('priceTiers', [
      ...form.priceTiers,
      {
        minQty: nextMin,
        maxQty: null,
        unitPriceCents: nextPrice,
        discountLabel: `Prag ${form.priceTiers.length + 1}`,
      },
    ]);
  };

  const handleAddVariant = () => {
    updateField('variants', [
      ...form.variants,
      {
        title: `Variantă ${form.variants.length + 1}`,
        sku: form.sku ? `${form.sku}-V${form.variants.length + 1}` : '',
        priceCents: form.basePriceCents,
        stockQuantity: 10,
        optionsJson: '{"Finisaj": "Standard"}',
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccess(false);

    if (!form.title.trim()) {
      setErrorMsg('Titlul produsului este obligatoriu.');
      setActiveTab('general');
      return;
    }
    if (!form.handle.trim()) {
      setErrorMsg('Handle-ul URL este obligatoriu.');
      setActiveTab('general');
      return;
    }
    if (form.maxOrderQty !== null && form.maxOrderQty < form.minOrderQty) {
      setErrorMsg('Cantitatea maximă trebuie să fie >= cantitatea minimă.');
      setActiveTab('inventory');
      return;
    }

    setSaving(true);
    try {
      await onSave(form);
      setSaveSuccess(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Eroare la salvarea produsului.');
    } finally {
      setSaving(false);
    }
  };

  const serpTitle = form.seoTitle.trim() || form.title || 'Titlu Pagină Produs';
  const serpDesc =
    form.seoDescription.trim() ||
    form.shortDescription.trim() ||
    'Configurează meta descrierea în secțiunea SEO pentru a controla afișarea în motoarele de căutare.';
  const serpUrl =
    form.canonicalUrl.trim() ||
    `https://magazin.verda-commerce.ro/produs/${form.handle || 'produs-handle'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-teal-900/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Înapoi</span>
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#0F2928] truncate">
              {form.title || 'Produs nou extins'}
            </h2>
            <div className="text-xs text-slate-500 font-mono truncate">
              {form.medusaProductId ? `${form.medusaProductId} · ` : ''}
              /{form.handle || 'handle-nesalvat'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <select
            value={form.status}
            onChange={(e) =>
              updateField('status', e.target.value as ProductStatus)
            }
            aria-label="Status produs"
            className="px-3 py-2 text-xs font-medium bg-[#F7FBFA] border border-teal-900/15 rounded-lg text-[#0F2928] focus:outline-none focus:border-teal-600"
          >
            <option value="draft">Ciornă</option>
            <option value="published">Publicat</option>
            <option value="archived">Arhivat</option>
          </select>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {saving
                ? 'Se salvează...'
                : isEditing
                ? 'Salvează modificările'
                : 'Creează produs'}
            </span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {saveSuccess && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-900">
          Produsul a fost salvat în PostgreSQL și sincronizat cu API-ul storefront.
        </div>
      )}

      <div className="flex items-center gap-1 p-1 bg-[#E7F3F1] rounded-lg overflow-x-auto">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white border border-teal-900/10 rounded-xl p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Titlu produs *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    const nextTitle = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      title: nextTitle,
                      handle:
                        !prev.id && !prev.handle
                          ? slugifyHandle(nextTitle)
                          : prev.handle,
                    }));
                  }}
                  placeholder="ex: Lampă de masă din travertin"
                  className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Subtitlu
                </label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => updateField('subtitle', e.target.value)}
                  placeholder="Subtitlu scurt produs"
                  className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Handle URL *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateField('handle', slugifyHandle(form.title))
                    }
                    className="text-xs font-medium text-teal-700 hover:text-teal-800"
                  >
                    Generează automat
                  </button>
                </div>
                <input
                  type="text"
                  value={form.handle}
                  onChange={(e) =>
                    updateField('handle', slugifyHandle(e.target.value))
                  }
                  placeholder="lampa-travertin"
                  className="w-full px-3 py-2 text-sm font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Descriere scurtă (afişată în listări și sub titlu)
                </label>
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  {form.shortDescription.length} / 300
                </span>
              </div>
              <textarea
                rows={3}
                value={form.shortDescription}
                onChange={(e) =>
                  updateField('shortDescription', e.target.value)
                }
                placeholder="Rezumat concis al avantajelor și materialelor..."
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Descriere lungă (specificații detaliate &amp; text complet)
                </label>
                <button
                  type="button"
                  onClick={() => setPreviewLongDesc((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{previewLongDesc ? 'Editează text' : 'Previzualizează'}</span>
                </button>
              </div>
              {previewLongDesc ? (
                <div className="min-h-[200px] p-4 bg-[#F7FBFA] border border-teal-900/15 rounded-lg text-sm text-[#0F2928] whitespace-pre-wrap leading-relaxed">
                  {form.longDescription || 'Nu a fost completată descrierea lungă.'}
                </div>
              ) : (
                <textarea
                  rows={8}
                  value={form.longDescription}
                  onChange={(e) =>
                    updateField('longDescription', e.target.value)
                  }
                  placeholder="Specificații tehnice, dimensiuni, instrucțiuni de întreținere..."
                  className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600 leading-relaxed"
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-teal-900/10 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#0F2928]">
              Organizare &amp; Atribute JSON
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Categorie
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Colecție
              </label>
              <input
                type="text"
                value={form.collectionName}
                onChange={(e) => updateField('collectionName', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Câmpuri adiționale (Metadata JSON)
              </label>
              <textarea
                rows={6}
                value={form.metadataJson}
                onChange={(e) => updateField('metadataJson', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'media' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white border border-teal-900/10 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#0F2928]">
                  Galerie foto produs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reordonează imaginile, setează textul alternativ (ALT) și alege imaginea principală.
                </p>
              </div>
              <span className="text-xs font-mono text-teal-800 tabular-nums">
                {form.galleryImages.length} imagini
              </span>
            </div>

            {form.galleryImages.length === 0 ? (
              <div className="p-8 border border-dashed border-teal-900/20 rounded-xl text-center text-sm text-slate-500">
                Nu există imagini în galerie. Adaugă un URL din dreapta sau alege din activele de studio.
              </div>
            ) : (
              <div className="divide-y divide-teal-900/10 border border-teal-900/10 rounded-xl overflow-hidden">
                {form.galleryImages.map((img, idx) => (
                  <div
                    key={`${img.url}-${idx}`}
                    className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-white"
                  >
                    <ProductImage
                      src={img.url}
                      alt={img.altText || form.title}
                      className="w-16 h-16 rounded-lg border border-teal-900/10 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <input
                        type="text"
                        value={img.url}
                        onChange={(e) => {
                          const next = [...form.galleryImages];
                          next[idx] = { ...next[idx], url: e.target.value };
                          updateField('galleryImages', next);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-teal-900/15 rounded-md"
                      />
                      <input
                        type="text"
                        value={img.altText}
                        onChange={(e) => {
                          const next = [...form.galleryImages];
                          next[idx] = { ...next[idx], altText: e.target.value };
                          updateField('galleryImages', next);
                        }}
                        placeholder="Text alternativ (ALT)"
                        className="w-full px-2.5 py-1.5 text-xs border border-teal-900/15 rounded-md"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                          img.isPrimary || form.thumbnailUrl === img.url
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-slate-700 border-teal-900/15 hover:bg-teal-50'
                        }`}
                      >
                        <Star className="w-3 h-3" />
                        <span>
                          {img.isPrimary || form.thumbnailUrl === img.url
                            ? 'Principală'
                            : 'Setează principală'}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveGalleryImage(idx, -1)}
                        className="p-1.5 text-slate-500 hover:text-teal-800 disabled:opacity-30 border border-teal-900/15 rounded-md"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === form.galleryImages.length - 1}
                        onClick={() => handleMoveGalleryImage(idx, 1)}
                        className="p-1.5 text-slate-500 hover:text-teal-800 disabled:opacity-30 border border-teal-900/15 rounded-md"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="p-1.5 text-slate-500 hover:text-red-600 border border-teal-900/15 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-teal-900/10 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#0F2928]">
                Adaugă imagine după URL
              </h3>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  URL imagine
                </label>
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://cdn.magazin.ro/produs.jpg"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Text ALT
                </label>
                <input
                  type="text"
                  value={newImageAlt}
                  onChange={(e) => setNewImageAlt(e.target.value)}
                  placeholder="Descriere imagine"
                  className="w-full px-3 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddGalleryImage()}
                className="w-full px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
              >
                Adaugă în galerie
              </button>
            </div>

            <div className="bg-white border border-teal-900/10 rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-[#0F2928]">
                Imagini Studio Rapide
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {STUDIO_IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() =>
                      handleAddGalleryImage(preset.url, preset.label)
                    }
                    className="group text-left border border-teal-900/10 rounded-lg overflow-hidden hover:border-teal-600 transition-colors"
                  >
                    <ProductImage
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-24"
                    />
                    <div className="p-2 text-xs font-medium text-slate-700 truncate group-hover:text-teal-800">
                      + {preset.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white border border-teal-900/10 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[#0F2928]">
                Stoc &amp; Identificare
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => updateField('sku', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Cod de bare (EAN)
                  </label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => updateField('barcode', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Greutate (grame)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.weightGrams}
                    onChange={(e) =>
                      updateField('weightGrams', Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Stoc fizic
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.stockQuantity}
                    onChange={(e) =>
                      updateField('stockQuantity', Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Stoc rezervat
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.reservedQuantity}
                    onChange={(e) =>
                      updateField('reservedQuantity', Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Prag alertă stoc redus
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.lowStockThreshold}
                    onChange={(e) =>
                      updateField('lowStockThreshold', Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-teal-900/10">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.manageInventory}
                    onChange={(e) => updateField('manageInventory', e.target.checked)}
                    className="rounded border-teal-900/25 text-teal-600 focus:ring-teal-600"
                  />
                  <span>Urmărește stocul (manage inventory)</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowBackorder}
                    onChange={(e) => updateField('allowBackorder', e.target.checked)}
                    className="rounded border-teal-900/25 text-teal-600 focus:ring-teal-600"
                  />
                  <span>Permite precomenzi fără stoc (backorder)</span>
                </label>
              </div>
            </div>

            <div className="pt-6 border-t border-teal-900/10">
              <h3 className="text-sm font-semibold text-[#0F2928]">
                Reguli Cantitate Comandă (Min / Max / Step)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Validate automat atât în panoul de administrare, cât și la checkout în storefront.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Cantitate Minimă *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.minOrderQty}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value) || 1);
                      updateField('minOrderQty', val);
                      setSimQty(val);
                    }}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Cantitate Maximă (gol = nelimitat)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxOrderQty ?? ''}
                    onChange={(e) =>
                      updateField(
                        'maxOrderQty',
                        e.target.value === ''
                          ? null
                          : Math.max(1, Number(e.target.value) || 1)
                      )
                    }
                    placeholder="Nelimitat"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Pas Incrementare (Step) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.stepQty}
                    onChange={(e) =>
                      updateField('stepQty', Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-teal-900/10 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#0F2928]">
              Simulator Selector Cantitate Storefront
            </h3>
            <p className="text-xs text-slate-500">
              Testează comportamentul cu Min ({form.minOrderQty}), Max ({form.maxOrderQty ?? '∞'}) și Pas (+{form.stepQty}).
            </p>

            <div className="p-4 bg-[#F7FBFA] border border-teal-900/10 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  Cantitate testată
                </span>
                <div className="inline-flex items-center border border-teal-900/20 bg-white rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setSimQty((q) => Math.max(form.minOrderQty, q - form.stepQty))
                    }
                    className="p-2 text-teal-800 hover:bg-teal-50"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={simQty}
                    onChange={(e) =>
                      setSimQty(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-16 text-center text-sm font-mono tabular-nums py-1.5 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSimQty((q) => {
                        const next = q + form.stepQty;
                        return form.maxOrderQty !== null
                          ? Math.min(form.maxOrderQty, next)
                          : next;
                      })
                    }
                    className="p-2 text-teal-800 hover:bg-teal-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs border-t border-teal-900/10 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Validare reguli</span>
                  <span
                    className={`font-medium ${
                      localPricePreview.valid ? 'text-teal-700' : 'text-red-600'
                    }`}
                  >
                    {localPricePreview.valid ? 'Cantitate validă' : 'Încălcare regulă'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stoc disponibil</span>
                  <span className="font-mono tabular-nums text-slate-800">
                    {localPricePreview.availableStock} buc.
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Preț unitar aplicat</span>
                  <span className="font-mono tabular-nums text-[#0F2928] font-medium">
                    {formatMoney(localPricePreview.unitPriceCents, form.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total linie</span>
                  <span className="font-mono tabular-nums text-teal-800 font-semibold">
                    {formatMoney(localPricePreview.totalPriceCents, form.currency)}
                  </span>
                </div>
              </div>

              {localPricePreview.validationErrors.length > 0 && (
                <ul className="text-xs text-red-600 space-y-1 border-t border-red-200 pt-2">
                  {localPricePreview.validationErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white border border-teal-900/10 rounded-xl p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Monedă
                </label>
                <select
                  value={form.currency}
                  onChange={(e) =>
                    updateField('currency', e.target.value as ProductRecord['currency'])
                  }
                  className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                >
                  <option value="RON">RON</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Preț bază ({form.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={(form.basePriceCents / 100).toFixed(2)}
                  onChange={(e) =>
                    updateField(
                      'basePriceCents',
                      Math.max(0, Math.round(Number(e.target.value || 0) * 100))
                    )
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Preț vechi (tăiat)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={
                    form.compareAtPriceCents !== null
                      ? (form.compareAtPriceCents / 100).toFixed(2)
                      : ''
                  }
                  onChange={(e) =>
                    updateField(
                      'compareAtPriceCents',
                      e.target.value === ''
                        ? null
                        : Math.max(0, Math.round(Number(e.target.value) * 100))
                    )
                  }
                  placeholder="Opțional"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Cotă TVA (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.taxRatePercent}
                  onChange={(e) =>
                    updateField(
                      'taxRatePercent',
                      Math.min(100, Math.max(0, Number(e.target.value) || 0))
                    )
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-teal-900/10 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F2928]">
                    Praguri de preț în funcție de cantitate (Tiered Pricing)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Prețul unitar scade automat pe măsură ce cantitatea din coș atinge pragul definit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adaugă prag</span>
                </button>
              </div>

              {form.priceTiers.length === 0 ? (
                <div className="p-6 border border-dashed border-teal-900/20 rounded-xl text-center text-xs text-slate-500">
                  Nu există praguri definite. Se folosește prețul de bază pentru orice cantitate.
                </div>
              ) : (
                <div className="overflow-x-auto border border-teal-900/10 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F7FBFA] border-b border-teal-900/10 text-slate-500">
                        <th className="py-2.5 px-3">Cant. Min</th>
                        <th className="py-2.5 px-3">Cant. Max</th>
                        <th className="py-2.5 px-3">Preț unitar ({form.currency})</th>
                        <th className="py-2.5 px-3">Discount</th>
                        <th className="py-2.5 px-3">Etichetă prag</th>
                        <th className="py-2.5 px-3 text-right">Șterge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-900/5">
                      {form.priceTiers.map((tier, idx) => {
                        const pctOff =
                          form.basePriceCents > 0
                            ? Math.round(
                                ((form.basePriceCents - tier.unitPriceCents) /
                                  form.basePriceCents) *
                                  100
                              )
                            : 0;
                        return (
                          <tr key={idx}>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min={1}
                                value={tier.minQty}
                                onChange={(e) => {
                                  const next = [...form.priceTiers];
                                  next[idx] = {
                                    ...next[idx],
                                    minQty: Math.max(1, Number(e.target.value) || 1),
                                  };
                                  updateField('priceTiers', next);
                                }}
                                className="w-20 px-2 py-1 font-mono tabular-nums border border-teal-900/15 rounded-md"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min={tier.minQty}
                                value={tier.maxQty ?? ''}
                                placeholder="∞"
                                onChange={(e) => {
                                  const next = [...form.priceTiers];
                                  next[idx] = {
                                    ...next[idx],
                                    maxQty:
                                      e.target.value === ''
                                        ? null
                                        : Math.max(
                                            tier.minQty,
                                            Number(e.target.value) || tier.minQty
                                          ),
                                  };
                                  updateField('priceTiers', next);
                                }}
                                className="w-20 px-2 py-1 font-mono tabular-nums border border-teal-900/15 rounded-md"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={(tier.unitPriceCents / 100).toFixed(2)}
                                onChange={(e) => {
                                  const next = [...form.priceTiers];
                                  next[idx] = {
                                    ...next[idx],
                                    unitPriceCents: Math.max(
                                      0,
                                      Math.round(Number(e.target.value || 0) * 100)
                                    ),
                                  };
                                  updateField('priceTiers', next);
                                }}
                                className="w-28 px-2 py-1 font-mono tabular-nums border border-teal-900/15 rounded-md"
                              />
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums">
                              <span
                                className={
                                  pctOff > 0
                                    ? 'text-teal-700 font-medium'
                                    : 'text-slate-500'
                                }
                              >
                                {pctOff > 0 ? `-${pctOff}%` : '0%'}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={tier.discountLabel}
                                onChange={(e) => {
                                  const next = [...form.priceTiers];
                                  next[idx] = {
                                    ...next[idx],
                                    discountLabel: e.target.value,
                                  };
                                  updateField('priceTiers', next);
                                }}
                                placeholder="En-gros / B2B"
                                className="w-36 px-2 py-1 border border-teal-900/15 rounded-md"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  updateField(
                                    'priceTiers',
                                    form.priceTiers.filter((_, i) => i !== idx)
                                  )
                                }
                                className="p-1 text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          <div className="lg:col-span-4 bg-white border border-teal-900/10 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#0F2928]">
              Calculator Praguri Preț
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Cantitate evaluată
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={simQty}
                  onChange={(e) =>
                    setSimQty(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="flex-1 px-3 py-2 text-sm font-mono tabular-nums bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                />
                {form.id && (
                  <button
                    type="button"
                    disabled={calcLoading}
                    onClick={handleServerCalculate}
                    className="px-3 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg whitespace-nowrap shrink-0"
                  >
                    {calcLoading ? 'Verific...' : 'Verifică API'}
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#F7FBFA] border border-teal-900/10 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Prag aplicat</span>
                <span className="font-medium text-[#0F2928]">
                  {localPricePreview.appliedTier?.discountLabel || 'Preț de bază'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Preț unitar</span>
                <span className="font-mono tabular-nums font-medium text-[#0F2928]">
                  {formatMoney(localPricePreview.unitPriceCents, form.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total ({simQty} buc.)</span>
                <span className="font-mono tabular-nums font-semibold text-[#0F2928]">
                  {formatMoney(localPricePreview.totalPriceCents, form.currency)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-teal-900/10">
                <span className="text-slate-500">Economie volum</span>
                <span className="font-mono tabular-nums font-medium text-teal-700">
                  {formatMoney(localPricePreview.savingsCents, form.currency)}
                </span>
              </div>
            </div>

            {serverCalc && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900 font-mono">
                Răspuns API: {formatMoney(serverCalc.unitPriceCents, form.currency)} / buc ·{' '}
                {serverCalc.valid ? 'valid' : serverCalc.validationErrors[0]}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'variants' && (
        <div className="bg-white border border-teal-900/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0F2928]">
                Variante Produs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Definește variante pe culori, finisaje sau dimensiuni cu SKU și stoc dedicat.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddVariant}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adaugă variantă</span>
            </button>
          </div>

          {form.variants.length === 0 ? (
            <div className="p-8 border border-dashed border-teal-900/20 rounded-xl text-center text-xs text-slate-500">
              Nu există variante adăugate. Se utilizează SKU-ul principal ({form.sku || 'nesetat'}).
            </div>
          ) : (
            <div className="overflow-x-auto border border-teal-900/10 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7FBFA] border-b border-teal-900/10 text-slate-500">
                    <th className="py-2.5 px-3">Titlu Variantă</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Preț ({form.currency})</th>
                    <th className="py-2.5 px-3">Stoc</th>
                    <th className="py-2.5 px-3">Opțiuni JSON</th>
                    <th className="py-2.5 px-3 text-right">Șterge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-900/5">
                  {form.variants.map((variant, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={variant.title}
                          onChange={(e) => {
                            const next = [...form.variants];
                            next[idx] = { ...next[idx], title: e.target.value };
                            updateField('variants', next);
                          }}
                          className="w-48 px-2 py-1 border border-teal-900/15 rounded-md"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) => {
                            const next = [...form.variants];
                            next[idx] = { ...next[idx], sku: e.target.value };
                            updateField('variants', next);
                          }}
                          className="w-36 px-2 py-1 font-mono border border-teal-900/15 rounded-md"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={(variant.priceCents / 100).toFixed(2)}
                          onChange={(e) => {
                            const next = [...form.variants];
                            next[idx] = {
                              ...next[idx],
                              priceCents: Math.max(
                                0,
                                Math.round(Number(e.target.value || 0) * 100)
                              ),
                            };
                            updateField('variants', next);
                          }}
                          className="w-28 px-2 py-1 font-mono tabular-nums border border-teal-900/15 rounded-md"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          value={variant.stockQuantity}
                          onChange={(e) => {
                            const next = [...form.variants];
                            next[idx] = {
                              ...next[idx],
                              stockQuantity: Math.max(0, Number(e.target.value) || 0),
                            };
                            updateField('variants', next);
                          }}
                          className="w-20 px-2 py-1 font-mono tabular-nums border border-teal-900/15 rounded-md"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={variant.optionsJson}
                          onChange={(e) => {
                            const next = [...form.variants];
                            next[idx] = {
                              ...next[idx],
                              optionsJson: e.target.value,
                            };
                            updateField('variants', next);
                          }}
                          className="w-44 px-2 py-1 font-mono border border-teal-900/15 rounded-md"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              'variants',
                              form.variants.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-600"
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
      )}

      {activeTab === 'seo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white border border-teal-900/10 rounded-xl p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Titlu SEO
                </label>
                <span
                  className={`text-xs font-mono tabular-nums ${
                    form.seoTitle.length > 60 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {form.seoTitle.length} / 60
                </span>
              </div>
              <input
                type="text"
                value={form.seoTitle}
                onChange={(e) => updateField('seoTitle', e.target.value)}
                placeholder="Implicit titlul produsului dacă rămâne gol"
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Meta Descriere
                </label>
                <span
                  className={`text-xs font-mono tabular-nums ${
                    form.seoDescription.length > 160
                      ? 'text-amber-600'
                      : 'text-slate-400'
                  }`}
                >
                  {form.seoDescription.length} / 160
                </span>
              </div>
              <textarea
                rows={3}
                value={form.seoDescription}
                onChange={(e) => updateField('seoDescription', e.target.value)}
                placeholder="Descrierea afișată în rezultatele Google..."
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Cuvinte cheie (separate prin virgulă)
              </label>
              <input
                type="text"
                value={form.seoKeywords}
                onChange={(e) => updateField('seoKeywords', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  URL Canonic
                </label>
                <input
                  type="text"
                  value={form.canonicalUrl}
                  onChange={(e) => updateField('canonicalUrl', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Imagine OpenGraph (Social Share)
                </label>
                <input
                  type="text"
                  value={form.ogImageUrl}
                  onChange={(e) => updateField('ogImageUrl', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={form.noIndex}
                onChange={(e) => updateField('noIndex', e.target.checked)}
                className="rounded border-teal-900/25 text-teal-600 focus:ring-teal-600"
              />
              <span>Setează meta robots pe noindex, nofollow</span>
            </label>
          </div>

          <div className="lg:col-span-5 bg-white border border-teal-900/10 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#0F2928]">
              Previzualizare Google SERP
            </h3>
            <div className="p-4 border border-teal-900/10 rounded-lg bg-[#F7FBFA] space-y-1">
              <div className="text-xs text-slate-500 truncate font-mono">
                {serpUrl}
              </div>
              <div className="text-base font-medium text-teal-800 leading-snug">
                {serpTitle}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {serpDesc}
              </p>
            </div>
            {(form.ogImageUrl || form.thumbnailUrl) && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-medium text-slate-600">
                  Imagine Social Card
                </div>
                <ProductImage
                  src={form.ogImageUrl || form.thumbnailUrl}
                  alt={serpTitle}
                  className="w-full h-44 rounded-lg border border-teal-900/10"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
