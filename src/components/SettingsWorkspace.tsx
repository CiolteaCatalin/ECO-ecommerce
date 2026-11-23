import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Save } from 'lucide-react';
import { SIMPLE_SETTINGS_CARDS } from '../config/navigation';
import { useAuth } from '../context/AuthContext';
import type { ProductRecord } from '../types/commerce';
import { GenericModulePanel } from './GenericModulePanel';
import { StoreApiInspector } from './StoreApiInspector';
import { BlueprintViewer } from './BlueprintViewer';
import {
  IntegrationsSettingsPanel,
  type IntegrationProviderKey,
} from './IntegrationsSettingsPanel';

interface SettingsWorkspaceProps {
  products: ProductRecord[];
  initialCardId?: string;
}

const DEFAULT_FORM_VALUES: Record<string, Record<string, string>> = {
  general: {
    storeName: 'Verda Commerce',
    supportEmail: 'contact@verda-commerce.ro',
    phone: '+40 722 000 111',
    companyName: 'SC Verda Commerce SRL',
    cui: 'RO12345678',
    instagram: 'https://instagram.com/verdacommerce',
  },
  seo_global: {
    titleSuffix: ' | Verda Commerce',
    robotsTxt: 'User-agent: *\nAllow: /',
    sitemapAutoUpdate: 'Activ',
  },
  domains_ssl: {
    primaryDomain: 'magazin.verda-commerce.ro',
    wwwRedirect: 'Activ (non-www -> www)',
    sslStatus: 'Certificat SSL Auto-Renew Activ',
    accentColor: '#2563EB',
  },
  checkout: {
    checkoutType: 'One-Page Checkout (Single Step)',
    orderPrefix: 'CMD-2026-',
    b2bInvoiceFields: 'CUI + Reg. Com. vizibile',
    allowGuestCart: 'Da',
  },
};

export function SettingsWorkspace({
  products,
  initialCardId = 'setari-hub',
}: SettingsWorkspaceProps) {
  const { authFetch } = useAuth();
  const [selectedCardId, setSelectedCardId] = useState<string>(initialCardId);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [apiSubTab, setApiSubTab] = useState<'store-api' | 'blueprint' | 'keys'>(
    'store-api'
  );

  useEffect(() => {
    setSelectedCardId(initialCardId);
  }, [initialCardId]);

  const activeItem = SIMPLE_SETTINGS_CARDS.find(
    (item) => item.id === selectedCardId
  );

  const loadSettingForm = useCallback(
    async (settingKey: string) => {
      setLoading(true);
      setSavedMsg(false);
      try {
        const res = await authFetch(`/api/admin/settings/${settingKey}`);
        const defaults = DEFAULT_FORM_VALUES[settingKey] ?? {
          status: 'Activ',
          observatii: '',
        };
        if (res.ok) {
          const payload = await res.json();
          const merged = { ...defaults, ...(payload.data || {}) };
          setFormValues(merged);
        } else {
          setFormValues(defaults);
        }
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    if (activeItem && activeItem.mode === 'form') {
      loadSettingForm(activeItem.key);
    }
  }, [activeItem, loadSettingForm]);

  if (selectedCardId === 'setari-hub' || !activeItem) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Setări generale magazin
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Configurări esențiale pentru datele magazinului, SEO global, livrare, taxe și integrarea headless Medusa v2.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SIMPLE_SETTINGS_CARDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedCardId(item.id)}
              className="text-left bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 rounded-xl p-5 transition-colors flex flex-col justify-between gap-3 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                    {item.title}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activeItem.mode === 'integration') {
    return (
      <IntegrationsSettingsPanel
        provider={activeItem.key as IntegrationProviderKey}
        onBack={() => setSelectedCardId('setari-hub')}
      />
    );
  }

  if (activeItem.mode === 'api-blueprint') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedCardId('setari-hub')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Setări</span>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {activeItem.title}
              </h2>
              <p className="text-xs text-slate-600">{activeItem.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#EAF2FC] rounded-lg">
            <button
              type="button"
              onClick={() => setApiSubTab('store-api')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                apiSubTab === 'store-api'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              Inspector Store API
            </button>
            <button
              type="button"
              onClick={() => setApiSubTab('blueprint')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                apiSubTab === 'blueprint'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              Fișiere Medusa v2
            </button>
            <button
              type="button"
              onClick={() => setApiSubTab('keys')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                apiSubTab === 'keys'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              Chei API &amp; Webhook-uri
            </button>
          </div>
        </div>

        {apiSubTab === 'store-api' && <StoreApiInspector products={products} />}
        {apiSubTab === 'blueprint' && <BlueprintViewer />}
        {apiSubTab === 'keys' && (
          <GenericModulePanel
            moduleKey="api_keys"
            title="Chei API & Webhook-uri"
            description="Generează chei Publishable pentru storefront-ul Node.js și adrese webhook pentru notificări externe."
            codeLabel="Cheie / Endpoint"
            codePlaceholder="pk_live_... sau https://..."
          />
        )}
      </div>
    );
  }

  if (activeItem.mode === 'module') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedCardId('setari-hub')}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-slate-200 hover:bg-blue-50 rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Înapoi la Setări generale</span>
        </button>
        <GenericModulePanel
          moduleKey={activeItem.key}
          title={activeItem.title}
          description={activeItem.description}
        />
      </div>
    );
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(false);
    try {
      const res = await authFetch(`/api/admin/settings/${activeItem.key}`, {
        method: 'PUT',
        body: JSON.stringify(formValues),
      });
      if (res.ok) setSavedMsg(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedCardId('setari-hub')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Setări</span>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {activeItem.title}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {activeItem.description}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Se salvează...' : 'Salvează setările'}</span>
        </button>
      </div>

      {savedMsg && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-900">
          Setările pentru <strong>{activeItem.title}</strong> au fost salvate în PostgreSQL.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {loading ? (
          <div className="text-sm text-slate-500">Se încarcă configurația...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Object.entries(formValues).map(([fieldKey, val]) => (
              <div key={fieldKey}>
                <label className="block text-xs font-medium text-slate-700 mb-1.5 capitalize">
                  {fieldKey.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                </label>
                {val.includes('\n') ? (
                  <textarea
                    rows={4}
                    value={val}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [fieldKey]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={val}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [fieldKey]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
