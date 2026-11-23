export type ProductStatus = 'draft' | 'published' | 'archived';

export interface GalleryImage {
  id?: number;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface PriceTier {
  id?: number;
  minQty: number;
  maxQty: number | null;
  unitPriceCents: number;
  discountLabel: string;
}

export interface ProductVariant {
  id?: number;
  title: string;
  sku: string;
  priceCents: number;
  stockQuantity: number;
  optionsJson: string;
}

export interface ProductRecord {
  id?: number;
  medusaProductId?: string;
  title: string;
  subtitle: string;
  handle: string;
  status: ProductStatus;
  shortDescription: string;
  longDescription: string;
  thumbnailUrl: string;
  category: string;
  collectionName: string;
  sku: string;
  barcode: string;
  basePriceCents: number;
  compareAtPriceCents: number | null;
  currency: 'EUR' | 'RON' | 'USD' | 'GBP';
  taxRatePercent: number;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  manageInventory: boolean;
  allowBackorder: boolean;
  minOrderQty: number;
  maxOrderQty: number | null;
  stepQty: number;
  weightGrams: number;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  canonicalUrl: string;
  ogImageUrl: string;
  noIndex: boolean;
  metadataJson: string;
  galleryImages: GalleryImage[];
  priceTiers: PriceTier[];
  variants: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TierCalculationResult {
  requestedQty: number;
  valid: boolean;
  validationErrors: string[];
  unitPriceCents: number;
  totalPriceCents: number;
  savingsCents: number;
  appliedTier: PriceTier | null;
  availableStock: number;
}

export interface BlueprintFile {
  path: string;
  content: string;
}

export interface OrderRecord {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: 'pending' | 'processing' | 'processed' | 'returned';
  returnStatus: 'none' | 'requested' | 'approved' | 'completed';
  paymentStatus: string;
  paymentMethod: string;
  shippingMethod: string;
  awbNumber: string;
  shippingCity: string;
  totalCents: number;
  currency: string;
  itemsCount: number;
  notes: string;
  createdAt: string;
}

export interface OrderCounts {
  all: number;
  pending: number;
  processing: number;
  processed: number;
  returned: number;
  returnRequests: number;
}

export interface CustomerRecord {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  groupName: string;
  ordersCount: number;
  totalSpentCents: number;
  newsletterSubscribed: boolean;
  isBlacklisted: boolean;
  city: string;
  lastLoginAt: string;
  createdAt: string;
}

export interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  parentName: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

export interface BrandRecord {
  id: number;
  name: string;
  slug: string;
  website: string;
  isActive: boolean;
}

export interface CouponRecord {
  id: number;
  code: string;
  title: string;
  discountType: 'percent' | 'fixed_cents';
  discountValue: number;
  minOrderCents: number;
  usageCount: number;
  maxUses: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface BlogPostRecord {
  id: number;
  title: string;
  slug: string;
  category: string;
  tags: string;
  status: 'published' | 'draft';
  excerpt: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: number;
  actorEmail: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: string;
  newValue: string;
  details: string;
  createdAt: string;
}

export interface ModuleItemRecord {
  id: number;
  moduleKey: string;
  title: string;
  code: string;
  status: string;
  dataJson: string;
  createdAt: string;
}

export interface DashboardSummary {
  kpis: {
    pendingOrders: number;
    processingOrders: number;
    processedOrders: number;
    returnRequests: number;
    totalOrders: number;
    totalRevenueCents: number;
    avgOrderCents: number;
    totalProducts: number;
    outOfStockProducts: number;
    publishedProducts: number;
    totalCategories: number;
    totalBrands: number;
    totalCustomers: number;
    newsletterSubscribers: number;
  };
  recentOrders: OrderRecord[];
  recentLogs: AuditLogRecord[];
}

export const STUDIO_IMAGE_PRESETS = [
  {
    label: 'Lampă Travertin',
    url: '/src/assets/images/product_ceramic_lamp_1795418708491.jpg',
  },
  {
    label: 'Espressor Nocturne',
    url: '/src/assets/images/product_espresso_machine_1795418708508.jpg',
  },
  {
    label: 'Fotoliu Stejar Afumat',
    url: '/src/assets/images/product_oak_chair_1795418708504.jpg',
  },
  {
    label: 'Boxă Monolith Nuc',
    url: '/src/assets/images/product_audio_speaker_1795418708462.jpg',
  },
];

export function formatMoney(cents: number, currency = 'RON'): string {
  const value = cents / 100;
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function createEmptyProduct(): ProductRecord {
  return {
    title: '',
    subtitle: '',
    handle: '',
    status: 'draft',
    shortDescription: '',
    longDescription: '',
    thumbnailUrl: '',
    category: 'General',
    collectionName: '',
    sku: '',
    barcode: '',
    basePriceCents: 10000,
    compareAtPriceCents: null,
    currency: 'RON',
    taxRatePercent: 19,
    stockQuantity: 25,
    reservedQuantity: 0,
    lowStockThreshold: 5,
    manageInventory: true,
    allowBackorder: false,
    minOrderQty: 1,
    maxOrderQty: null,
    stepQty: 1,
    weightGrams: 500,
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    canonicalUrl: '',
    ogImageUrl: '',
    noIndex: false,
    metadataJson: '{}',
    galleryImages: [],
    priceTiers: [
      {
        minQty: 1,
        maxQty: 9,
        unitPriceCents: 10000,
        discountLabel: 'Standard',
      },
      {
        minQty: 10,
        maxQty: null,
        unitPriceCents: 8500,
        discountLabel: 'Volum 10+ (-15%)',
      },
    ],
    variants: [],
  };
}
