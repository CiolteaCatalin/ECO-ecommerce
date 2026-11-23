import { getStoreSetting, upsertStoreSetting } from '../db/workspace.ts';

export type IntegrationProvider = 'fancourier' | 'sameday' | 'smartbill';

export interface FanCourierConfig {
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

export interface SamedayConfig {
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

export interface SmartBillConfig {
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

export const DEFAULT_FANCOURIER: FanCourierConfig = {
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
};

export const DEFAULT_SAMEDAY: SamedayConfig = {
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
};

export const DEFAULT_SMARTBILL: SmartBillConfig = {
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
};

const ALLOWED_PROVIDER_HOSTS: Record<IntegrationProvider, string[]> = {
  fancourier: ['api.fancourier.ro'],
  sameday: ['sameday-api.demo.zitec.com', 'api.sameday.ro'],
  smartbill: ['ws.smartbill.ro', 'api.smartbill.ro'],
};

export function validateProviderBaseUrl(
  provider: IntegrationProvider,
  rawUrl: string
): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'https:') {
    throw new Error('URL-ul API trebuie să folosească protocolul HTTPS.');
  }
  const allowed = ALLOWED_PROVIDER_HOSTS[provider];
  if (!allowed.includes(parsed.hostname)) {
    throw new Error(
      `Host nepermis (${parsed.hostname}). Domenii acceptate: ${allowed.join(', ')}.`
    );
  }
  return parsed.origin;
}

function settingKeyFor(provider: IntegrationProvider): string {
  return `integration_${provider}`;
}

export async function getRawIntegrationConfig<T extends object>(
  provider: IntegrationProvider,
  defaults: T
): Promise<T> {
  const row = await getStoreSetting(settingKeyFor(provider));
  if (!row) return { ...defaults };
  try {
    const parsed = JSON.parse(row.dataJson) as Partial<T>;
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

export async function getMaskedIntegrationConfig(provider: IntegrationProvider) {
  if (provider === 'fancourier') {
    const cfg = await getRawIntegrationConfig('fancourier', DEFAULT_FANCOURIER);
    const { password, ...rest } = cfg;
    return {
      config: { ...rest, password: '' },
      secrets: { hasPassword: Boolean(password) },
    };
  }
  if (provider === 'sameday') {
    const cfg = await getRawIntegrationConfig('sameday', DEFAULT_SAMEDAY);
    const { password, ...rest } = cfg;
    return {
      config: { ...rest, password: '' },
      secrets: { hasPassword: Boolean(password) },
    };
  }
  const cfg = await getRawIntegrationConfig('smartbill', DEFAULT_SMARTBILL);
  const { apiTokenV1, apiTokenV3, ...rest } = cfg;
  return {
    config: { ...rest, apiTokenV1: '', apiTokenV3: '' },
    secrets: {
      hasApiTokenV1: Boolean(apiTokenV1),
      hasApiTokenV3: Boolean(apiTokenV3),
    },
  };
}

export async function saveIntegrationConfig(
  provider: IntegrationProvider,
  incoming: Record<string, unknown>,
  actorEmail: string
) {
  if (provider === 'fancourier') {
    const existing = await getRawIntegrationConfig(
      'fancourier',
      DEFAULT_FANCOURIER
    );
    const safeUrl = validateProviderBaseUrl(
      'fancourier',
      String(incoming.baseUrl || DEFAULT_FANCOURIER.baseUrl)
    );
    const incomingPass =
      typeof incoming.password === 'string' ? incoming.password.trim() : '';
    const merged: FanCourierConfig = {
      enabled: Boolean(incoming.enabled),
      baseUrl: safeUrl,
      clientId: String(incoming.clientId ?? existing.clientId).trim(),
      username: String(incoming.username ?? existing.username).trim(),
      password:
        incomingPass && !incomingPass.startsWith('••')
          ? incomingPass
          : existing.password,
      defaultService:
        String(incoming.defaultService ?? existing.defaultService).trim() ||
        'Standard',
      defaultPayment:
        incoming.defaultPayment === 'recipient' ? 'recipient' : 'sender',
      defaultWeightKg: Math.max(
        0.1,
        Number(incoming.defaultWeightKg ?? existing.defaultWeightKg) || 1
      ),
      defaultLengthCm: Math.max(
        1,
        Number(incoming.defaultLengthCm ?? existing.defaultLengthCm) || 30
      ),
      defaultWidthCm: Math.max(
        1,
        Number(incoming.defaultWidthCm ?? existing.defaultWidthCm) || 20
      ),
      defaultHeightCm: Math.max(
        1,
        Number(incoming.defaultHeightCm ?? existing.defaultHeightCm) || 15
      ),
      defaultOptions: String(
        incoming.defaultOptions ?? existing.defaultOptions
      ).trim(),
      senderCounty: String(
        incoming.senderCounty ?? existing.senderCounty
      ).trim(),
      senderLocality: String(
        incoming.senderLocality ?? existing.senderLocality
      ).trim(),
      senderStreet: String(
        incoming.senderStreet ?? existing.senderStreet
      ).trim(),
    };
    await upsertStoreSetting(
      settingKeyFor('fancourier'),
      JSON.stringify(merged),
      actorEmail
    );
    return getMaskedIntegrationConfig('fancourier');
  }

  if (provider === 'sameday') {
    const existing = await getRawIntegrationConfig('sameday', DEFAULT_SAMEDAY);
    const env = incoming.environment === 'production' ? 'production' : 'sandbox';
    const rawUrl =
      typeof incoming.baseUrl === 'string' && incoming.baseUrl.trim()
        ? incoming.baseUrl
        : env === 'production'
        ? 'https://api.sameday.ro'
        : 'https://sameday-api.demo.zitec.com';
    const safeUrl = validateProviderBaseUrl('sameday', rawUrl);
    const incomingPass =
      typeof incoming.password === 'string' ? incoming.password.trim() : '';
    const merged: SamedayConfig = {
      enabled: Boolean(incoming.enabled),
      environment: env,
      baseUrl: safeUrl,
      username: String(incoming.username ?? existing.username).trim(),
      password:
        incomingPass && !incomingPass.startsWith('••')
          ? incomingPass
          : existing.password,
      pickupPointId: String(
        incoming.pickupPointId ?? existing.pickupPointId
      ).trim(),
      contactPersonId: String(
        incoming.contactPersonId ?? existing.contactPersonId
      ).trim(),
      serviceId: String(incoming.serviceId ?? existing.serviceId).trim(),
      defaultPackageType:
        incoming.defaultPackageType === '1' || incoming.defaultPackageType === '2'
          ? incoming.defaultPackageType
          : '0',
      defaultAwbPayment:
        incoming.defaultAwbPayment === '2' || incoming.defaultAwbPayment === '3'
          ? incoming.defaultAwbPayment
          : '1',
      defaultWeightKg: Math.max(
        0.1,
        Number(incoming.defaultWeightKg ?? existing.defaultWeightKg) || 1
      ),
    };
    await upsertStoreSetting(
      settingKeyFor('sameday'),
      JSON.stringify(merged),
      actorEmail
    );
    return getMaskedIntegrationConfig('sameday');
  }

  const existing = await getRawIntegrationConfig('smartbill', DEFAULT_SMARTBILL);
  const token1 =
    typeof incoming.apiTokenV1 === 'string' ? incoming.apiTokenV1.trim() : '';
  const token3 =
    typeof incoming.apiTokenV3 === 'string' ? incoming.apiTokenV3.trim() : '';
  const merged: SmartBillConfig = {
    enabled: Boolean(incoming.enabled),
    email: String(incoming.email ?? existing.email).trim(),
    apiTokenV1:
      token1 && !token1.startsWith('••') ? token1 : existing.apiTokenV1,
    apiTokenV3:
      token3 && !token3.startsWith('••') ? token3 : existing.apiTokenV3,
    companyVatCode: String(
      incoming.companyVatCode ?? existing.companyVatCode
    )
      .trim()
      .toUpperCase(),
    invoiceSeriesName:
      String(
        incoming.invoiceSeriesName ?? existing.invoiceSeriesName
      ).trim() || 'FAC',
    proformaSeriesName:
      String(
        incoming.proformaSeriesName ?? existing.proformaSeriesName
      ).trim() || 'PRO',
    measuringUnitName:
      String(
        incoming.measuringUnitName ?? existing.measuringUnitName
      ).trim() || 'buc',
    defaultTaxName:
      String(incoming.defaultTaxName ?? existing.defaultTaxName).trim() ||
      'Normala',
    defaultTaxPercentage: Math.max(
      0,
      Math.min(
        100,
        Number(incoming.defaultTaxPercentage ?? existing.defaultTaxPercentage)
      )
    ),
    isTaxIncluded:
      incoming.isTaxIncluded === undefined
        ? existing.isTaxIncluded
        : Boolean(incoming.isTaxIncluded),
    isVatPayer:
      incoming.isVatPayer === undefined
        ? existing.isVatPayer
        : Boolean(incoming.isVatPayer),
    currency:
      String(incoming.currency ?? existing.currency).trim().toUpperCase() ||
      'RON',
    autoSendEmail: Boolean(incoming.autoSendEmail),
  };
  await upsertStoreSetting(
    settingKeyFor('smartbill'),
    JSON.stringify(merged),
    actorEmail
  );
  return getMaskedIntegrationConfig('smartbill');
}

// ==========================================
// FAN COURIER v2.0 LIVE API CLIENT
// ==========================================

async function fanCourierLogin(cfg: FanCourierConfig): Promise<string> {
  if (!cfg.username || !cfg.password) {
    throw new Error(
      'Completează Username și Parola selfAWB în Setări → FAN Courier API.'
    );
  }
  const baseUrl = validateProviderBaseUrl('fancourier', cfg.baseUrl);
  const res = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: cfg.username, password: cfg.password }),
    signal: AbortSignal.timeout(12000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    message?: string;
    data?: { token?: string };
    token?: string;
  };
  const token = data?.data?.token || data?.token;
  if (!res.ok || !token) {
    throw new Error(
      data?.message || `Autentificare FAN Courier eșuată (HTTP ${res.status}).`
    );
  }
  return token;
}

export async function testFanCourierConnection() {
  const cfg = await getRawIntegrationConfig('fancourier', DEFAULT_FANCOURIER);
  const token = await fanCourierLogin(cfg);
  const baseUrl = validateProviderBaseUrl('fancourier', cfg.baseUrl);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  const [branchesRes, servicesRes] = await Promise.all([
    fetch(`${baseUrl}/reports/branches`, {
      headers,
      signal: AbortSignal.timeout(12000),
    }),
    fetch(`${baseUrl}/reports/services`, {
      headers,
      signal: AbortSignal.timeout(12000),
    }),
  ]);

  const branchesJson = (await branchesRes.json().catch(() => ({}))) as {
    data?: unknown[];
  };
  const servicesJson = (await servicesRes.json().catch(() => ({}))) as {
    data?: unknown[];
  };

  return {
    connected: true,
    branchesCount: Array.isArray(branchesJson.data)
      ? branchesJson.data.length
      : 0,
    branches: Array.isArray(branchesJson.data)
      ? branchesJson.data.slice(0, 15)
      : [],
    services: Array.isArray(servicesJson.data) ? servicesJson.data : [],
  };
}

export async function createFanCourierAwb(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingCity: string;
  paymentMethod: string;
  totalCents: number;
  itemsCount: number;
  notes: string;
}) {
  const cfg = await getRawIntegrationConfig('fancourier', DEFAULT_FANCOURIER);
  if (!cfg.clientId) {
    throw new Error('Lipsește Client ID selfAWB în configurarea FAN Courier.');
  }
  const token = await fanCourierLogin(cfg);
  const baseUrl = validateProviderBaseUrl('fancourier', cfg.baseUrl);
  const isCod = order.paymentMethod.toLowerCase().includes('ramburs');
  const codRon = isCod ? Number((order.totalCents / 100).toFixed(2)) : 0;
  const optionsArr = cfg.defaultOptions
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = {
    clientId: Number(cfg.clientId) || cfg.clientId,
    shipments: [
      {
        info: {
          service:
            isCod && cfg.defaultService === 'Standard'
              ? 'Cont Colector'
              : cfg.defaultService || 'Standard',
          packages: { parcel: 1, envelopes: 0 },
          weight: cfg.defaultWeightKg || 1,
          cod: codRon,
          declaredValue: Number((order.totalCents / 100).toFixed(2)),
          payment: cfg.defaultPayment || 'sender',
          observation: `${order.orderNumber} (${order.itemsCount} prod.) ${order.notes}`.slice(
            0,
            200
          ),
          content: `Comanda ${order.orderNumber}`,
          dimensions: {
            length: cfg.defaultLengthCm || 30,
            width: cfg.defaultWidthCm || 20,
            height: cfg.defaultHeightCm || 15,
          },
          ...(optionsArr.length > 0 ? { options: optionsArr } : {}),
        },
        recipient: {
          name: order.customerName,
          phone: order.customerPhone || '0700000000',
          email: order.customerEmail,
          address: {
            county: order.shippingCity || 'Bucuresti',
            locality: order.shippingCity || 'Bucuresti',
            street: order.shippingCity || 'Strada Principala',
            streetNo: '1',
          },
        },
      },
    ],
  };

  const res = await fetch(`${baseUrl}/intern-awb`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    response?: Array<{ awbNumber?: number | string; errors?: unknown }>;
    message?: string;
  };
  const first = data?.response?.[0];
  if (!res.ok || !first?.awbNumber) {
    throw new Error(
      data?.message ||
        (first?.errors ? JSON.stringify(first.errors) : '') ||
        `Eroare FAN Courier /intern-awb (HTTP ${res.status}).`
    );
  }
  return {
    awbNumber: String(first.awbNumber),
    raw: first,
  };
}

export async function fetchFanCourierAwbPdf(awbNumber: string): Promise<Buffer> {
  const cfg = await getRawIntegrationConfig('fancourier', DEFAULT_FANCOURIER);
  if (!cfg.clientId) {
    throw new Error('Lipsește Client ID FAN Courier.');
  }
  const token = await fanCourierLogin(cfg);
  const baseUrl = validateProviderBaseUrl('fancourier', cfg.baseUrl);
  const url = new URL(`${baseUrl}/awb/label`);
  url.searchParams.set('clientId', cfg.clientId);
  url.searchParams.append('awbs[]', awbNumber);
  url.searchParams.set('pdf', '1');
  url.searchParams.set('language', 'ro');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Nu s-a putut descărca eticheta AWB FAN Courier (HTTP ${res.status}).`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ==========================================
// SAMEDAY CLIENT API
// ==========================================

async function samedayAuthenticate(cfg: SamedayConfig): Promise<string> {
  if (!cfg.username || !cfg.password) {
    throw new Error(
      'Completează Username și Parola în Setări → Sameday Courier API.'
    );
  }
  const baseUrl = validateProviderBaseUrl('sameday', cfg.baseUrl);
  const res = await fetch(`${baseUrl}/api/authenticate?remember_me=1`, {
    method: 'POST',
    headers: {
      'X-AUTH-USERNAME': cfg.username,
      'X-AUTH-PASSWORD': cfg.password,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(12000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    token?: string;
    message?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data?.token) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `Autentificare Sameday eșuată (HTTP ${res.status}).`
    );
  }
  return data.token;
}

export async function testSamedayConnection() {
  const cfg = await getRawIntegrationConfig('sameday', DEFAULT_SAMEDAY);
  const token = await samedayAuthenticate(cfg);
  const baseUrl = validateProviderBaseUrl('sameday', cfg.baseUrl);
  const headers = {
    'X-AUTH-TOKEN': token,
    Accept: 'application/json',
  };

  const [pickupRes, servicesRes] = await Promise.all([
    fetch(`${baseUrl}/api/client/pickup-points`, {
      headers,
      signal: AbortSignal.timeout(12000),
    }),
    fetch(`${baseUrl}/api/client/services`, {
      headers,
      signal: AbortSignal.timeout(12000),
    }),
  ]);

  const pickupJson = (await pickupRes.json().catch(() => ({}))) as {
    data?: unknown[];
  };
  const servicesJson = (await servicesRes.json().catch(() => ({}))) as {
    data?: unknown[];
  };

  return {
    connected: true,
    pickupPoints: Array.isArray(pickupJson.data) ? pickupJson.data : [],
    services: Array.isArray(servicesJson.data) ? servicesJson.data : [],
  };
}

export async function createSamedayAwb(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingCity: string;
  paymentMethod: string;
  totalCents: number;
  itemsCount: number;
  notes: string;
}) {
  const cfg = await getRawIntegrationConfig('sameday', DEFAULT_SAMEDAY);
  if (!cfg.pickupPointId || !cfg.contactPersonId || !cfg.serviceId) {
    throw new Error(
      'Selectează Pickup Point, Persoana de contact și Serviciul Sameday din Setări → Sameday Courier API.'
    );
  }
  const token = await samedayAuthenticate(cfg);
  const baseUrl = validateProviderBaseUrl('sameday', cfg.baseUrl);
  const isCod = order.paymentMethod.toLowerCase().includes('ramburs');
  const codRon = isCod ? (order.totalCents / 100).toFixed(2) : '0';

  const params = new URLSearchParams();
  params.set('pickupPoint', cfg.pickupPointId);
  params.set('contactPerson', cfg.contactPersonId);
  params.set('packageType', cfg.defaultPackageType || '0');
  params.set('packageNumber', '1');
  params.set('packageWeight', String(cfg.defaultWeightKg || 1));
  params.set('service', cfg.serviceId);
  params.set('awbPayment', cfg.defaultAwbPayment || '1');
  params.set('cashOnDelivery', codRon);
  params.set('insuredValue', '0');
  params.set('thirdPartyPickup', '0');
  params.set('awbRecipient[name]', order.customerName);
  params.set('awbRecipient[phoneNumber]', order.customerPhone || '0700000000');
  params.set('awbRecipient[email]', order.customerEmail);
  params.set('awbRecipient[countyString]', order.shippingCity || 'Bucuresti');
  params.set('awbRecipient[cityString]', order.shippingCity || 'Bucuresti');
  params.set('awbRecipient[address]', order.shippingCity || 'Strada Principala 1');
  params.set('awbRecipient[personType]', '0');
  params.set('parcels[0][weight]', String(cfg.defaultWeightKg || 1));
  params.set('clientInternalReference', order.orderNumber);
  params.set(
    'observation',
    `${order.orderNumber} · ${order.itemsCount} prod.`.slice(0, 180)
  );

  const res = await fetch(`${baseUrl}/api/awb`, {
    method: 'POST',
    headers: {
      'X-AUTH-TOKEN': token,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    awbNumber?: string;
    message?: string;
    errors?: unknown;
  };
  if (!res.ok || !data?.awbNumber) {
    throw new Error(
      data?.message ||
        (data?.errors ? JSON.stringify(data.errors) : '') ||
        `Eroare Sameday /api/awb (HTTP ${res.status}).`
    );
  }
  return { awbNumber: String(data.awbNumber), raw: data };
}

// ==========================================
// SMARTBILL CLOUD API (V1 + V3)
// ==========================================

function smartBillBasicHeader(cfg: SmartBillConfig): string {
  if (!cfg.email || !cfg.apiTokenV1) {
    throw new Error(
      'Completează Email-ul și Token-ul API V1 în Setări → SmartBill API.'
    );
  }
  const encoded = Buffer.from(`${cfg.email}:${cfg.apiTokenV1}`, 'utf8').toString(
    'base64'
  );
  return `Basic ${encoded}`;
}

export async function testSmartBillConnection() {
  const cfg = await getRawIntegrationConfig('smartbill', DEFAULT_SMARTBILL);
  if (!cfg.companyVatCode) {
    throw new Error('Completează CIF-ul firmei (ex: RO12345678).');
  }
  const auth = smartBillBasicHeader(cfg);
  const headers = { Authorization: auth, Accept: 'application/json' };
  const cif = encodeURIComponent(cfg.companyVatCode);

  const [taxRes, seriesRes] = await Promise.all([
    fetch(`https://ws.smartbill.ro/SBORO/api/tax?cif=${cif}`, {
      headers,
      signal: AbortSignal.timeout(12000),
    }),
    fetch(`https://ws.smartbill.ro/SBORO/api/series?cif=${cif}`, {
      headers,
      signal: AbortSignal.timeout(12000),
    }),
  ]);

  const taxJson = (await taxRes.json().catch(() => ({}))) as {
    errorText?: string;
    taxes?: unknown[];
  };
  const seriesJson = (await seriesRes.json().catch(() => ({}))) as {
    errorText?: string;
    list?: unknown[];
  };

  if (!taxRes.ok || taxJson.errorText) {
    throw new Error(
      taxJson.errorText || `Conexiune SmartBill V1 eșuată (HTTP ${taxRes.status}).`
    );
  }

  let v3Warehouses: unknown[] | null = null;
  if (cfg.apiTokenV3) {
    const v3Res = await fetch(
      `https://api.smartbill.ro/v3/companies/${cif}/warehouses`,
      {
        headers: {
          Authorization: `Bearer ${cfg.apiTokenV3}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (v3Res.ok) {
      const v3Json = (await v3Res.json().catch(() => ({}))) as {
        results?: unknown[];
      };
      v3Warehouses = Array.isArray(v3Json.results) ? v3Json.results : [];
    }
  }

  return {
    connected: true,
    taxes: Array.isArray(taxJson.taxes) ? taxJson.taxes : [],
    series: Array.isArray(seriesJson.list) ? seriesJson.list : [],
    v3Warehouses,
  };
}

export async function emitSmartBillDocument(
  order: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingCity: string;
    totalCents: number;
    currency: string;
    itemsCount: number;
    notes: string;
  },
  docType: 'invoice' | 'proforma'
) {
  const cfg = await getRawIntegrationConfig('smartbill', DEFAULT_SMARTBILL);
  if (!cfg.companyVatCode) {
    throw new Error('Lipsește CIF-ul firmei în configurarea SmartBill.');
  }
  const auth = smartBillBasicHeader(cfg);
  const today = new Date().toISOString().slice(0, 10);
  const seriesName =
    docType === 'proforma' ? cfg.proformaSeriesName : cfg.invoiceSeriesName;
  const endpoint =
    docType === 'proforma'
      ? 'https://ws.smartbill.ro/SBORO/api/estimate/v2'
      : 'https://ws.smartbill.ro/SBORO/api/invoice/v2';

  const qty = Math.max(1, order.itemsCount || 1);
  const totalRon = Number((order.totalCents / 100).toFixed(2));
  const unitPrice = Number((totalRon / qty).toFixed(2));

  const payload = {
    companyVatCode: cfg.companyVatCode,
    seriesName,
    issueDate: today,
    currency: order.currency || cfg.currency || 'RON',
    language: 'RO',
    precision: 2,
    useStock: false,
    sendEmail: cfg.autoSendEmail,
    observations: `Comandă online ${order.orderNumber}${order.notes ? ` · ${order.notes}` : ''}`.slice(
      0,
      300
    ),
    client: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone || undefined,
      city: order.shippingCity || 'București',
      country: 'Romania',
      saveToDb: false,
    },
    products: [
      {
        name: `Produse conform comandă ${order.orderNumber}`,
        code: order.orderNumber,
        measuringUnitName: cfg.measuringUnitName || 'buc',
        currency: order.currency || cfg.currency || 'RON',
        quantity: qty,
        price: unitPrice,
        isTaxIncluded: cfg.isTaxIncluded,
        taxName: cfg.isVatPayer ? cfg.defaultTaxName || 'Normala' : undefined,
        taxPercentage: cfg.isVatPayer ? cfg.defaultTaxPercentage : 0,
        saveToDb: false,
      },
    ],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  const data = (await res.json().catch(() => ({}))) as {
    errorText?: string;
    series?: string;
    number?: string;
    url?: string;
    documentViewUrl?: string;
    errors?: Array<{ param?: string; message?: string; code?: string }>;
  };

  if (!res.ok || data.errorText || (data.errors && data.errors.length > 0)) {
    const errMsg =
      data.errorText ||
      data.errors?.map((e) => `${e.param || ''} ${e.message || ''}`).join('; ') ||
      `Eroare SmartBill (HTTP ${res.status}).`;
    throw new Error(errMsg);
  }

  return {
    series: String(data.series || seriesName),
    number: String(data.number || ''),
    url: String(data.documentViewUrl || data.url || ''),
  };
}

export async function fetchSmartBillInvoicePdf(
  seriesName: string,
  number: string
): Promise<Buffer> {
  const cfg = await getRawIntegrationConfig('smartbill', DEFAULT_SMARTBILL);
  const auth = smartBillBasicHeader(cfg);
  const url = new URL('https://ws.smartbill.ro/SBORO/api/invoice/pdf');
  url.searchParams.set('cif', cfg.companyVatCode);
  url.searchParams.set('seriesname', seriesName);
  url.searchParams.set('number', number);

  // Per SmartBill OpenAPI spec: DO NOT send Accept: application/pdf
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: auth,
      Accept: 'application/octet-stream',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Nu s-a putut descărca PDF-ul SmartBill (HTTP ${res.status}).`);
  }
  return Buffer.from(await res.arrayBuffer());
}
