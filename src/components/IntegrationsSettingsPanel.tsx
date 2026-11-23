import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  KeyRound,
  Save,
  Truck,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type IntegrationProviderKey = 'fancourier' | 'sameday' | 'smartbill';

interface IntegrationsSettingsPanelProps {
  provider: IntegrationProviderKey;
  onBack?: () => void;
}

interface FanForm {
  enabled: boolean;
  baseUrl: string;
  clientId: string;
  username: string;
  password: string;
  defaultService: string;
  defaultPayment: 'sender' | 'recipient';
  defaultWeightKg: number;
  defaultLengthCm: number;
  defaultWidthCm: number;
  defaultHeightCm: number;
  defaultOptions: string;
  senderCounty: string;
  senderLocality: string;
  senderStreet: string;
}

interface SamedayForm {
  enabled: boolean;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  username: string;
  password: string;
  pickupPointId: string;
  contactPersonId: string;
  serviceId: string;
  defaultPackageType: '0' | '1' | '2';
  defaultAwbPayment: '1' | '2' | '3';
  defaultWeightKg: number;
}

interface SmartBillForm {
  enabled: boolean;
  email: string;
  apiTokenV1: string;
  apiTokenV3: string;
  companyVatCode: string;
  invoiceSeriesName: string;
  proformaSeriesName: string;
  measuringUnitName: string;
  defaultTaxName: string;
  defaultTaxPercentage: number;
  isTaxIncluded: boolean;
  isVatPayer: boolean;
  currency: string;
  autoSendEmail: boolean;
}

const PROVIDER_META: Record<
  IntegrationProviderKey,
  { title: string; subtitle: string; docsNote: string }
> = {
  fancourier: {
    title: 'Configurare FAN Courier API v2.0',
    subtitle:
      'Autentificare Bearer Token (selfAWB), servicii interne, dimensiuni colet implicite, generare și tipărire AWB PDF.',
    docsNote:
      'Endpoint oficial: https://api.fancourier.ro (POST /login, GET /reports/services, POST /intern-awb, GET /awb/label).',
  },
  sameday: {
    title: 'Configurare Sameday Courier API',
    subtitle:
      'Autentificare X-AUTH-USERNAME / X-AUTH-PASSWORD, preluare automată Pickup Points & Servicii și emitere AWB.',
    docsNote:
      'Sandbox: https://sameday-api.demo.zitec.com · Producție: https://api.sameday.ro (POST /api/authenticate, GET /api/client/pickup-points, POST /api/awb).',
  },
  smartbill: {
    title: 'Configurare SmartBill Cloud API (V1 & V3)',
    subtitle:
      'Emitere automată facturi & proforme din comenzi, sincronizare serii documente și cote TVA reale.',
    docsNote:
      'V1 Basic Auth (https://ws.smartbill.ro/SBORO/api) pentru /invoice/v2, /estimate/v2, /tax, /series · V3 Bearer Token pentru gestiuni/depozite.',
  },
};

export function IntegrationsSettingsPanel({
  provider,
  onBack,
}: IntegrationsSettingsPanelProps) {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [secrets, setSecrets] = useState<{
    hasPassword?: boolean;
    hasApiTokenV1?: boolean;
    hasApiTokenV3?: boolean;
  }>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(
    null
  );

  const [fanForm, setFanForm] = useState<FanForm>({
    enabled: false,
    baseUrl: 'https://api.fancourier.ro',
    clientId: '',
    username: '',
    password: '',
    defaultService: 'Standard',
    defaultPayment: 'sender',
    defaultWeightKg: 1,
    defaultLengthCm: 30,
    defaultWidthCm: 20,
    defaultHeightCm: 15,
    defaultOptions: '',
    senderCounty: 'Bucuresti',
    senderLocality: 'Bucuresti',
    senderStreet: '',
  });

  const [samedayForm, setSamedayForm] = useState<SamedayForm>({
    enabled: false,
    environment: 'sandbox',
    baseUrl: 'https://sameday-api.demo.zitec.com',
    username: '',
    password: '',
    pickupPointId: '',
    contactPersonId: '',
    serviceId: '',
    defaultPackageType: '0',
    defaultAwbPayment: '1',
    defaultWeightKg: 1,
  });

  const [smartbillForm, setSmartbillForm] = useState<SmartBillForm>({
    enabled: false,
    email: '',
    apiTokenV1: '',
    apiTokenV3: '',
    companyVatCode: '',
    invoiceSeriesName: 'FAC',
    proformaSeriesName: 'PRO',
    measuringUnitName: 'buc',
    defaultTaxName: 'Normala',
    defaultTaxPercentage: 19,
    isTaxIncluded: true,
    isVatPayer: true,
    currency: 'RON',
    autoSendEmail: false,
  });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setSaveNotice(null);
    setErrorMsg(null);
    setTestResult(null);
    try {
      const res = await authFetch(`/api/admin/integrations/${provider}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nu s-au putut încărca setările.');
      setSecrets(data.secrets || {});
      if (provider === 'fancourier' && data.config) setFanForm(data.config);
      if (provider === 'sameday' && data.config) setSamedayForm(data.config);
      if (provider === 'smartbill' && data.config) setSmartbillForm(data.config);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Eroare de încărcare.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, provider]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveNotice(null);
    setErrorMsg(null);
    try {
      const bodyPayload =
        provider === 'fancourier'
          ? fanForm
          : provider === 'sameday'
          ? samedayForm
          : smartbillForm;

      const res = await authFetch(`/api/admin/integrations/${provider}`, {
        method: 'PUT',
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nu s-a putut salva configurația.');
      setSecrets(data.secrets || {});
      if (provider === 'fancourier' && data.config) setFanForm(data.config);
      if (provider === 'sameday' && data.config) setSamedayForm(data.config);
      if (provider === 'smartbill' && data.config) setSmartbillForm(data.config);
      setSaveNotice(
        'Credențialele și parametrii au fost salvate securizat în PostgreSQL (parolele și tokenurile rămân protejate pe server).'
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Eroare la salvare.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setErrorMsg(null);
    setTestResult(null);
    try {
      // Save current form first so test uses latest inputs
      const bodyPayload =
        provider === 'fancourier'
          ? fanForm
          : provider === 'sameday'
          ? samedayForm
          : smartbillForm;
      const saveRes = await authFetch(`/api/admin/integrations/${provider}`, {
        method: 'PUT',
        body: JSON.stringify(bodyPayload),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Date invalide înainte de test.');
      setSecrets(saveData.secrets || {});

      const res = await authFetch(`/api/admin/integrations/${provider}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.connected) {
        throw new Error(data.error || 'Conexiunea API a eșuat.');
      }
      setTestResult(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Eroare la testarea conexiunii.');
    } finally {
      setTesting(false);
    }
  };

  const meta = PROVIDER_META[provider];

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg whitespace-nowrap shrink-0 mt-0.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Setări</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              {provider === 'smartbill' ? (
                <Receipt className="w-4 h-4 text-blue-600" />
              ) : (
                <Truck className="w-4 h-4 text-blue-600" />
              )}
              <h2 className="text-lg font-semibold text-slate-900">
                {meta.title}
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">{meta.subtitle}</p>
            <p className="text-[11px] font-mono text-blue-700 mt-1">
              {meta.docsNote}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={testing || loading}
            onClick={handleTest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-800 bg-[#EAF2FC] hover:bg-blue-100 border border-blue-200 disabled:opacity-50 rounded-lg whitespace-nowrap"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>
              {testing ? 'Se testează API...' : 'Testează conexiunea & Încarcă date'}
            </span>
          </button>
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Se salvează...' : 'Salvează configurația'}</span>
          </button>
        </div>
      </div>

      {saveNotice && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">
          Se încarcă configurația...
        </div>
      ) : provider === 'fancourier' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <label className="inline-flex items-center gap-2.5 p-3 rounded-lg bg-[#F4F8FD] border border-blue-100 cursor-pointer text-xs font-semibold text-slate-900">
            <input
              type="checkbox"
              checked={fanForm.enabled}
              onChange={(e) => setFanForm({ ...fanForm, enabled: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Activează integrarea live FAN Courier v2.0 pentru comenzile din panou</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                URL API FAN Courier
              </label>
              <input
                type="text"
                value={fanForm.baseUrl}
                onChange={(e) => setFanForm({ ...fanForm, baseUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Client ID (selfAWB) *
              </label>
              <input
                type="text"
                value={fanForm.clientId}
                onChange={(e) => setFanForm({ ...fanForm, clientId: e.target.value })}
                placeholder="ex: 7032158"
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Username selfAWB *
              </label>
              <input
                type="text"
                value={fanForm.username}
                onChange={(e) => setFanForm({ ...fanForm, username: e.target.value })}
                placeholder="utilizator_selfawb"
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Parolă selfAWB *</span>
                {secrets.hasPassword && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-700">
                    <KeyRound className="w-3 h-3" /> Salvată
                  </span>
                )}
              </label>
              <input
                type="password"
                value={fanForm.password}
                onChange={(e) => setFanForm({ ...fanForm, password: e.target.value })}
                placeholder={
                  secrets.hasPassword
                    ? '•••••••• (lasă gol pentru a păstra)'
                    : 'Introdu parola selfAWB'
                }
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-slate-100">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Serviciu implicit (POST /intern-awb)
              </label>
              <select
                value={fanForm.defaultService}
                onChange={(e) =>
                  setFanForm({ ...fanForm, defaultService: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              >
                <option value="Standard">Standard</option>
                <option value="Cont Colector">Cont Colector (Ramburs)</option>
                <option value="FANbox">FANbox</option>
                <option value="CollectPoint">CollectPoint</option>
                <option value="RedCode">RedCode</option>
                <option value="Express Loco 1H">Express Loco 1H</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Plătitor transport
              </label>
              <select
                value={fanForm.defaultPayment}
                onChange={(e) =>
                  setFanForm({
                    ...fanForm,
                    defaultPayment: e.target.value as 'sender' | 'recipient',
                  })
                }
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              >
                <option value="sender">Expeditor (sender)</option>
                <option value="recipient">Destinatar (recipient)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Greutate (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={fanForm.defaultWeightKg}
                onChange={(e) =>
                  setFanForm({ ...fanForm, defaultWeightKg: Number(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dimensiuni L×l×H (cm)
              </label>
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="number"
                  value={fanForm.defaultLengthCm}
                  onChange={(e) =>
                    setFanForm({ ...fanForm, defaultLengthCm: Number(e.target.value) || 30 })
                  }
                  className="px-2 py-2 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
                  title="Lungime cm"
                />
                <input
                  type="number"
                  value={fanForm.defaultWidthCm}
                  onChange={(e) =>
                    setFanForm({ ...fanForm, defaultWidthCm: Number(e.target.value) || 20 })
                  }
                  className="px-2 py-2 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
                  title="Lățime cm"
                />
                <input
                  type="number"
                  value={fanForm.defaultHeightCm}
                  onChange={(e) =>
                    setFanForm({ ...fanForm, defaultHeightCm: Number(e.target.value) || 15 })
                  }
                  className="px-2 py-2 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
                  title="Înălțime cm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Opțiuni AWB (ex: A, X)
              </label>
              <input
                type="text"
                value={fanForm.defaultOptions}
                onChange={(e) => setFanForm({ ...fanForm, defaultOptions: e.target.value })}
                placeholder="A, X, P"
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>
      ) : provider === 'sameday' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <label className="inline-flex items-center gap-2.5 p-3 rounded-lg bg-[#F4F8FD] border border-blue-100 cursor-pointer text-xs font-semibold text-slate-900">
            <input
              type="checkbox"
              checked={samedayForm.enabled}
              onChange={(e) => setSamedayForm({ ...samedayForm, enabled: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Activează integrarea live Sameday Client API pentru comenzile din panou</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mediu API Sameday
              </label>
              <select
                value={samedayForm.environment}
                onChange={(e) => {
                  const env = e.target.value === 'production' ? 'production' : 'sandbox';
                  setSamedayForm({
                    ...samedayForm,
                    environment: env,
                    baseUrl:
                      env === 'production'
                        ? 'https://api.sameday.ro'
                        : 'https://sameday-api.demo.zitec.com',
                  });
                }}
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              >
                <option value="sandbox">Sandbox Demo (zitec.com)</option>
                <option value="production">Producție (api.sameday.ro)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                URL Bază API
              </label>
              <input
                type="text"
                value={samedayForm.baseUrl}
                onChange={(e) => setSamedayForm({ ...samedayForm, baseUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                X-AUTH-USERNAME *
              </label>
              <input
                type="text"
                value={samedayForm.username}
                onChange={(e) => setSamedayForm({ ...samedayForm, username: e.target.value })}
                placeholder="ex: numeclientAPI"
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span>X-AUTH-PASSWORD *</span>
                {secrets.hasPassword && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-700">
                    <KeyRound className="w-3 h-3" /> Salvată
                  </span>
                )}
              </label>
              <input
                type="password"
                value={samedayForm.password}
                onChange={(e) => setSamedayForm({ ...samedayForm, password: e.target.value })}
                placeholder={
                  secrets.hasPassword ? '•••••••• (lasă gol pentru a păstra)' : 'Parolă API Sameday'
                }
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ID Pickup Point *
              </label>
              <input
                type="text"
                value={samedayForm.pickupPointId}
                onChange={(e) =>
                  setSamedayForm({ ...samedayForm, pickupPointId: e.target.value })
                }
                placeholder="ex: 1234"
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ID Persoană Contact *
              </label>
              <input
                type="text"
                value={samedayForm.contactPersonId}
                onChange={(e) =>
                  setSamedayForm({ ...samedayForm, contactPersonId: e.target.value })
                }
                placeholder="ex: 5678"
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ID Serviciu Sameday *
              </label>
              <input
                type="text"
                value={samedayForm.serviceId}
                onChange={(e) =>
                  setSamedayForm({ ...samedayForm, serviceId: e.target.value })
                }
                placeholder="ex: 7 (24H)"
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tip colet (packageType)
              </label>
              <select
                value={samedayForm.defaultPackageType}
                onChange={(e) =>
                  setSamedayForm({
                    ...samedayForm,
                    defaultPackageType: e.target.value as '0' | '1' | '2',
                  })
                }
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              >
                <option value="0">0 · Colet standard</option>
                <option value="1">1 · Plic</option>
                <option value="2">2 · Colet mare / agabaritic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Plătitor AWB
              </label>
              <select
                value={samedayForm.defaultAwbPayment}
                onChange={(e) =>
                  setSamedayForm({
                    ...samedayForm,
                    defaultAwbPayment: e.target.value as '1' | '2' | '3',
                  })
                }
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              >
                <option value="1">1 · Client (Expeditor)</option>
                <option value="2">2 · Destinatar</option>
                <option value="3">3 · Terț</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Greutate (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={samedayForm.defaultWeightKg}
                onChange={(e) =>
                  setSamedayForm({
                    ...samedayForm,
                    defaultWeightKg: Number(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <label className="inline-flex items-center gap-2.5 p-3 rounded-lg bg-[#F4F8FD] border border-blue-100 cursor-pointer text-xs font-semibold text-slate-900">
            <input
              type="checkbox"
              checked={smartbillForm.enabled}
              onChange={(e) =>
                setSmartbillForm({ ...smartbillForm, enabled: e.target.checked })
              }
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Activează emiterea de Facturi și Proforme SmartBill Cloud direct din Comenzi</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email cont SmartBill (V1) *
              </label>
              <input
                type="email"
                value={smartbillForm.email}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, email: e.target.value })
                }
                placeholder="cont@firma.ro"
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Token API V1 (Basic Auth) *</span>
                {secrets.hasApiTokenV1 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-700">
                    <KeyRound className="w-3 h-3" /> Salvat
                  </span>
                )}
              </label>
              <input
                type="password"
                value={smartbillForm.apiTokenV1}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, apiTokenV1: e.target.value })
                }
                placeholder={
                  secrets.hasApiTokenV1
                    ? '•••••••• (lasă gol pentru a păstra)'
                    : 'Token din SmartBill -> Integrări'
                }
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Token API V3 (Bearer, opțional)</span>
                {secrets.hasApiTokenV3 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-700">
                    <KeyRound className="w-3 h-3" /> Salvat
                  </span>
                )}
              </label>
              <input
                type="password"
                value={smartbillForm.apiTokenV3}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, apiTokenV3: e.target.value })
                }
                placeholder={
                  secrets.hasApiTokenV3
                    ? '•••••••• (lasă gol pentru a păstra)'
                    : 'Bearer Token V3 pentru depozite/NIR'
                }
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                CIF Firmă (companyVatCode) *
              </label>
              <input
                type="text"
                value={smartbillForm.companyVatCode}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, companyVatCode: e.target.value })
                }
                placeholder="ex: RO12345678"
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Serie Factură
              </label>
              <input
                type="text"
                value={smartbillForm.invoiceSeriesName}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, invoiceSeriesName: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Serie Proformă
              </label>
              <input
                type="text"
                value={smartbillForm.proformaSeriesName}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, proformaSeriesName: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                U.M. Implicită
              </label>
              <input
                type="text"
                value={smartbillForm.measuringUnitName}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, measuringUnitName: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Denumire TVA SmartBill
              </label>
              <input
                type="text"
                value={smartbillForm.defaultTaxName}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, defaultTaxName: e.target.value })
                }
                placeholder="Normala"
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cotă TVA (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={smartbillForm.defaultTaxPercentage}
                onChange={(e) =>
                  setSmartbillForm({
                    ...smartbillForm,
                    defaultTaxPercentage: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Monedă implicită
              </label>
              <input
                type="text"
                value={smartbillForm.currency}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, currency: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={smartbillForm.isVatPayer}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, isVatPayer: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Firmă plătitoare de TVA</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={smartbillForm.isTaxIncluded}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, isTaxIncluded: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Prețurile produselor includ TVA (isTaxIncluded: true)</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={smartbillForm.autoSendEmail}
                onChange={(e) =>
                  setSmartbillForm({ ...smartbillForm, autoSendEmail: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Trimite automat factura pe email către client</span>
            </label>
          </div>
        </div>
      )}

      {/* Live API Test Diagnostics & 1-click picker */}
      {testResult && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>Conexiune reușită cu {provider.toUpperCase()} — Date preluate live</span>
          </div>

          {provider === 'fancourier' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-semibold text-slate-700 mb-2">
                  Servicii disponibile (click pentru a seta implicit):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {((testResult.services as Array<{ name?: string; id?: number }>) || []).map(
                    (s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          s.name && setFanForm({ ...fanForm, defaultService: s.name })
                        }
                        className="px-2.5 py-1 bg-[#EAF2FC] hover:bg-blue-100 text-blue-900 rounded border border-blue-200"
                      >
                        {s.name || JSON.stringify(s)}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700 mb-2">
                  Filiale returnate ({String(testResult.branchesCount || 0)}):
                </div>
                <pre className="p-2.5 bg-[#F4F8FD] border border-slate-200 rounded-lg max-h-40 overflow-auto font-mono text-[11px]">
                  {JSON.stringify(testResult.branches, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {provider === 'sameday' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-semibold text-slate-700 mb-2">
                  Pickup Points (click pentru a completa ID Pickup + Contact):
                </div>
                <div className="space-y-1.5 max-h-48 overflow-auto">
                  {((testResult.pickupPoints as Array<{
                    id?: number;
                    alias?: string;
                    pickupPointContactPerson?: Array<{ id?: number; name?: string }>;
                  }>) || []).map((pp) => (
                    <button
                      key={pp.id}
                      type="button"
                      onClick={() =>
                        setSamedayForm({
                          ...samedayForm,
                          pickupPointId: String(pp.id || ''),
                          contactPersonId: String(
                            pp.pickupPointContactPerson?.[0]?.id ||
                              samedayForm.contactPersonId
                          ),
                        })
                      }
                      className="w-full text-left px-3 py-2 bg-[#F4F8FD] hover:bg-blue-50 border border-slate-200 rounded-lg"
                    >
                      <span className="font-mono font-semibold text-blue-700">
                        #{pp.id}
                      </span>{' '}
                      · {pp.alias || 'Punct ridicare'}
                      {pp.pickupPointContactPerson?.[0]
                        ? ` (Contact #${pp.pickupPointContactPerson[0].id}: ${pp.pickupPointContactPerson[0].name})`
                        : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700 mb-2">
                  Servicii Sameday (click pentru a selecta ID Serviciu):
                </div>
                <div className="space-y-1.5 max-h-48 overflow-auto">
                  {((testResult.services as Array<{ id?: number; name?: string }>) || []).map(
                    (srv) => (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() =>
                          setSamedayForm({
                            ...samedayForm,
                            serviceId: String(srv.id || ''),
                          })
                        }
                        className="w-full text-left px-3 py-2 bg-[#F4F8FD] hover:bg-blue-50 border border-slate-200 rounded-lg"
                      >
                        <span className="font-mono font-semibold text-blue-700">
                          #{srv.id}
                        </span>{' '}
                        · {srv.name}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {provider === 'smartbill' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-semibold text-slate-700 mb-2">
                  Cote TVA din SmartBill (click pentru a aplica):
                </div>
                <div className="flex flex-wrap gap-2">
                  {((testResult.taxes as Array<{ name?: string; percentage?: number }>) || []).map(
                    (t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setSmartbillForm({
                            ...smartbillForm,
                            defaultTaxName: t.name || 'Normala',
                            defaultTaxPercentage: Number(t.percentage ?? 19),
                          })
                        }
                        className="px-3 py-1.5 bg-[#EAF2FC] hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-900 font-mono"
                      >
                        {t.name} ({t.percentage}%)
                      </button>
                    )
                  )}
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700 mb-2">
                  Serii documente SmartBill:
                </div>
                <div className="flex flex-wrap gap-2">
                  {((testResult.series as Array<{ name?: string; type?: string }>) || []).map(
                    (sr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (!sr.name) return;
                          if (sr.type === 'p') {
                            setSmartbillForm({ ...smartbillForm, proformaSeriesName: sr.name });
                          } else {
                            setSmartbillForm({ ...smartbillForm, invoiceSeriesName: sr.name });
                          }
                        }}
                        className="px-3 py-1.5 bg-[#F4F8FD] hover:bg-blue-50 border border-slate-200 rounded-lg font-mono"
                      >
                        {sr.name} ({sr.type === 'p' ? 'Proformă' : 'Factură'})
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
