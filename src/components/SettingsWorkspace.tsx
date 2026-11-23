import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Save } from 'lucide-react';
import { SETTINGS_GROUPS } from '../config/navigation';
import { useAuth } from '../context/AuthContext';
import type { ProductRecord } from '../types/commerce';
import { GenericModulePanel } from './GenericModulePanel';
import { StoreApiInspector } from './StoreApiInspector';
import { BlueprintViewer } from './BlueprintViewer';

interface SettingsWorkspaceProps {
  subPageId: string;
  products: ProductRecord[];
  onSelectSubPage: (id: string) => void;
}

const DEFAULT_FORM_VALUES: Record<string, Record<string, string>> = {
  domains_ssl: {
    primaryDomain: 'magazin.verda-commerce.ro',
    wwwRedirect: 'Activ (non-www -> www)',
    sslStatus: 'Certificat SSL Auto-Renew Activ',
  },
  general: {
    storeName: 'Verda Commerce',
    supportEmail: 'contact@verda-commerce.ro',
    phone: '+40 722 000 111',
    companyName: 'SC Verda Commerce SRL',
    cui: 'RO12345678',
    instagram: 'https://instagram.com/verdacommerce',
  },
  brand: {
    brandTitle: 'Verda Commerce',
    accentColor: '#0D9488',
    logoUrl: '/src/assets/images/product_ceramic_lamp_1795418708491.jpg',
    faviconUrl: '/favicon.ico',
  },
  display: {
    productsPerPage: '24',
    defaultSort: 'Cele mai populare',
    showOutOfStock: 'Da (cu etichetă Indisponibil)',
  },
  localization: {
    defaultLanguage: 'Română (RO)',
    extraLanguages: 'Engleză (EN), Maghiară (HU)',
    defaultCurrency: 'RON',
  },
  access_security: {
    storeAvailability: 'Magazin Public Activ',
    maintenanceMode: 'Dezactivat',
    rateLimitPerMinute: '120 cereri / minut',
  },
  cart: {
    allowGuestCart: 'Da',
    autoReserveMinutes: '30',
    enforceMinMaxStep: 'Activ (strict pe backend)',
  },
  checkout: {
    checkoutType: 'One-Page Checkout (Single Step)',
    requirePhone: 'Da',
    b2bInvoiceFields: 'CUI + Reg. Com. vizibile',
  },
  orders_config: {
    orderPrefix: 'CMD-2026-',
    autoGenerateInvoice: 'Activ (SmartBill / Oblio)',
    defaultStatus: 'În așteptare',
  },
  catalog_config: {
    showTieredPricingTable: 'Activ pe pagina de produs',
    decimalPrecision: '2 zecimale',
    skuRequired: 'Da',
  },
  inventory_config: {
    decrementStockOn: 'Plasare comandă',
    lowStockAlertEmail: 'stocuri@verda-commerce.ro',
    allowBackorderGlobal: 'Per produs',
  },
  search_config: {
    engine: 'PostgreSQL Full-Text + Sinonime',
    minChars: '2',
    fuzzyMatching: 'Activ',
  },
  privacy_cookies: {
    gdprBanner: 'Activ (Consimțământ granular)',
    privacyPolicyUrl: '/politica-confidentialitate',
    cookieRetentionDays: '180',
  },
  seo_global: {
    titleSuffix: ' | Verda Commerce',
    robotsTxt: 'User-agent: *\nAllow: /',
    sitemapAutoUpdate: 'Activ',
  },
  notifications: {
    emailOrderConfirmed: 'Activ (Client + Admin)',
    smsAwbGenerated: 'Activ (Client)',
    lowStockAlert: 'Activ (Admin)',
  },
  slug_rules: {
    productPrefix: '/produs/',
    categoryPrefix: '/categorie/',
    lowercaseOnly: 'Da',
  },
  smtp_server: {
    smtpHost: 'smtp.resend.com',
    smtpPort: '587',
    senderName: 'Verda Commerce',
    senderEmail: 'comenzi@verda-commerce.ro',
  },
  import_migration: {
    sourcePlatform: 'WooCommerce / Shopify / CSV / Medusa',
    batchSize: '100 produse / lot',
    preserveHandles: 'Da',
  },
};

export function SettingsWorkspace({
  subPageId,
  products,
  onSelectSubPage,
}: SettingsWorkspaceProps) {
  const { authFetch } = useAuth();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [apiSubTab, setApiSubTab] = useState<'keys' | 'store-api' | 'blueprint'>(
    'keys'
  );

  // Find active setting item across all 6 groups
  const activeItem = SETTINGS_GROUPS.flatMap((g) => g.items).find(
    (item) => item.id === subPageId
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

  // Hub view ("Toate setările")
  if (subPageId === 'setari-hub' || !activeItem) {
    return (
      <div className="space-y-8">
        {SETTINGS_GROUPS.map((group) => (
          <section key={group.title} className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#0F2928]">
                {group.title}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">{group.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSubPage(item.id)}
                  className="text-left bg-white border border-teal-900/10 hover:border-teal-600 rounded-xl p-5 transition-colors flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#0F2928] group-hover:text-teal-700">
                        {item.title}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // API si webhook-uri (includes API Keys, Store API Inspector, and Medusa v2 Blueprint!)
  if (activeItem.mode === 'api-blueprint') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-teal-900/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectSubPage('setari-hub')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Setări</span>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-[#0F2928]">
                {activeItem.title}
              </h2>
              <p className="text-xs text-slate-600">{activeItem.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#E7F3F1] rounded-lg">
            <button
              type="button"
              onClick={() => setApiSubTab('keys')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                apiSubTab === 'keys'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-teal-900'
              }`}
            >
              Chei API &amp; Webhook-uri
            </button>
            <button
              type="button"
              onClick={() => setApiSubTab('store-api')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                apiSubTab === 'store-api'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-teal-900'
              }`}
            >
              Inspector Store API
            </button>
            <button
              type="button"
              onClick={() => setApiSubTab('blueprint')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                apiSubTab === 'blueprint'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-teal-900'
              }`}
            >
              Fișiere Medusa v2
            </button>
          </div>
        </div>

        {apiSubTab === 'keys' && (
          <GenericModulePanel
            moduleKey="api_keys"
            title="Chei API & Webhook-uri"
            description="Generează chei Publishable pentru storefront-ul Node.js și adrese webhook pentru notificări externe."
            codeLabel="Cheie / Endpoint"
            codePlaceholder="pk_live_... sau https://..."
          />
        )}
        {apiSubTab === 'store-api' && <StoreApiInspector products={products} />}
        {apiSubTab === 'blueprint' && <BlueprintViewer />}
      </div>
    );
  }

  // Module-based settings (taxe, livrare, redirecturi, statusuri, etc.)
  if (activeItem.mode === 'module') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onSelectSubPage('setari-hub')}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-800 bg-white border border-teal-900/15 hover:bg-teal-50 rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Înapoi la toate setările</span>
        </button>
        <GenericModulePanel
          moduleKey={activeItem.key}
          title={activeItem.title}
          description={activeItem.description}
        />
      </div>
    );
  }

  // Form-based setting persisted in store_settings
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
      <div className="bg-white border border-teal-900/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectSubPage('setari-hub')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Setări</span>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-[#0F2928]">
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
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Se salvează...' : 'Salvează setările'}</span>
        </button>
      </div>

      {savedMsg && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-900">
          Setările pentru <strong>{activeItem.title}</strong> au fost salvate în PostgreSQL.
        </div>
      )}

      <div className="bg-white border border-teal-900/10 rounded-xl p-6">
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
                    className="w-full px-3 py-2 text-sm font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
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
                    className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
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
