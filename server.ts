import express from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  createProduct,
  deleteProduct,
  getProductByHandle,
  getProductById,
  listProducts,
  resolveTieredPrice,
  seedDemoProductsIfEmpty,
  updateProduct,
} from './src/db/products.ts';
import {
  adjustProductInventoryOrPrice,
  createBlogPost,
  createBrand,
  createCategory,
  createCoupon,
  createCustomer,
  createMediaAsset,
  createModuleItem,
  createOrder,
  createProductAttribute,
  createProductTag,
  createQuoteRequest,
  createSitePage,
  deleteBlogPost,
  deleteBrand,
  deleteCategory,
  deleteCoupon,
  deleteMediaAsset,
  deleteModuleItem,
  deleteProductAttribute,
  deleteProductTag,
  deleteSitePage,
  getDashboardSummary,
  getMediaAssetById,
  getOrderById,
  getStoreSetting,
  listAuditLogs,
  listBlogPosts,
  listBrands,
  listCategories,
  listCoupons,
  listCustomers,
  listMediaAssets,
  listModuleItems,
  listOrders,
  listProductAttributes,
  listProductTags,
  listQuoteRequests,
  listSitePages,
  logAudit,
  seedWorkspaceDataIfEmpty,
  toggleCouponStatus,
  toggleCustomerFlag,
  toggleModuleItemStatus,
  updateBlogPost,
  updateMediaAssetWebp,
  updateOrderStatus,
  updateQuoteRequestStatus,
  updateSitePage,
  upsertStoreSetting,
} from './src/db/workspace.ts';
import {
  createFanCourierAwb,
  createSamedayAwb,
  emitSmartBillDocument,
  fetchFanCourierAwbPdf,
  fetchSmartBillInvoicePdf,
  getMaskedIntegrationConfig,
  saveIntegrationConfig,
  testFanCourierConnection,
  testSamedayConnection,
  testSmartBillConnection,
  type IntegrationProvider,
} from './src/lib/integrations.ts';

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '15mb' }));

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const ASSETS_IMAGES_DIR = path.resolve(process.cwd(), 'src/assets/images');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function isSafeImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/src/assets/') || trimmed.startsWith('/media/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const safeImageSchema = z
  .string()
  .max(1000)
  .refine(isSafeImageUrl, { message: 'URL-ul imaginii trebuie să fie https://, http:// sau /src/assets/...' });

const safeCanonicalSchema = z
  .string()
  .max(1000)
  .refine(isSafeHttpUrl, { message: 'URL-ul canonic trebuie să înceapă cu https:// sau http://' });

const productPayloadSchema = z
  .object({
    title: z.string().trim().min(1, 'Titlul produsului este obligatoriu').max(180),
    subtitle: z.string().trim().max(240).default(''),
    handle: z
      .string()
      .trim()
      .min(1, 'Handle-ul URL este obligatoriu')
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Handle-ul trebuie să fie format din litere mici și cratime'),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    shortDescription: z.string().trim().max(1000).default(''),
    longDescription: z.string().max(20000).default(''),
    thumbnailUrl: safeImageSchema.default(''),
    category: z.string().trim().max(120).default('General'),
    brand: z.string().trim().max(120).default(''),
    collectionName: z.string().trim().max(120).default(''),
    tags: z.string().trim().max(500).default(''),
    attributesJson: z.string().max(10000).default('[]'),
    sku: z.string().trim().max(100).default(''),
    barcode: z.string().trim().max(100).default(''),
    basePriceCents: z.number().int().min(0),
    compareAtPriceCents: z.number().int().min(0).nullable().default(null),
    currency: z.enum(['EUR', 'RON', 'USD', 'GBP']).default('RON'),
    taxRatePercent: z.number().int().min(0).max(100).default(19),
    priceOnRequest: z.boolean().default(false),
    stockQuantity: z.number().int().min(0).default(0),
    reservedQuantity: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(5),
    manageInventory: z.boolean().default(true),
    allowBackorder: z.boolean().default(false),
    minOrderQty: z.number().int().min(1).default(1),
    maxOrderQty: z.number().int().min(1).nullable().default(null),
    stepQty: z.number().int().min(1).default(1),
    weightGrams: z.number().int().min(0).default(0),
    seoTitle: z.string().trim().max(200).default(''),
    seoDescription: z.string().trim().max(500).default(''),
    seoKeywords: z.string().trim().max(400).default(''),
    canonicalUrl: safeCanonicalSchema.default(''),
    ogImageUrl: safeImageSchema.default(''),
    noIndex: z.boolean().default(false),
    metadataJson: z.string().max(10000).default('{}'),
    galleryImages: z
      .array(
        z.object({
          url: safeImageSchema.refine((u) => u.trim().length > 0, 'URL imagine obligatoriu'),
          altText: z.string().trim().max(250).default(''),
          sortOrder: z.number().int().min(0).default(0),
          isPrimary: z.boolean().default(false),
        })
      )
      .max(30)
      .default([]),
    priceTiers: z
      .array(
        z
          .object({
            minQty: z.number().int().min(1),
            maxQty: z.number().int().min(1).nullable().default(null),
            unitPriceCents: z.number().int().min(0),
            discountLabel: z.string().trim().max(80).default(''),
          })
          .refine((t) => t.maxQty === null || t.maxQty >= t.minQty, {
            message: 'Cantitatea maximă a pragului trebuie să fie >= cantitatea minimă',
          })
      )
      .max(25)
      .default([]),
    variants: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(160),
          sku: z.string().trim().max(100).default(''),
          priceCents: z.number().int().min(0).default(0),
          stockQuantity: z.number().int().min(0).default(0),
          optionsJson: z.string().max(2000).default('{}'),
        })
      )
      .max(50)
      .default([]),
  })
  .refine((data) => data.maxOrderQty === null || data.maxOrderQty >= data.minOrderQty, {
    message: 'Cantitatea maximă de comandă trebuie să fie >= cantitatea minimă',
    path: ['maxOrderQty'],
  });

function toMedusaStoreProduct(p: NonNullable<Awaited<ReturnType<typeof getProductById>>>) {
  let parsedMetadata: Record<string, unknown> = {};
  try {
    parsedMetadata = JSON.parse(p.metadataJson || '{}');
  } catch {
    parsedMetadata = {};
  }

  return {
    id: p.medusaProductId,
    internal_id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    handle: p.handle,
    status: p.status,
    price_on_request: p.priceOnRequest,
    orderable: !p.priceOnRequest,
    thumbnail: p.thumbnailUrl,
    category: p.category,
    brand: p.brand,
    collection: p.collectionName,
    tags: p.tags,
    sku: p.sku,
    weight: p.weightGrams,
    metadata: parsedMetadata,
    extended: {
      short_description: p.shortDescription,
      long_description: p.longDescription,
      price_on_request: p.priceOnRequest,
      orderable: !p.priceOnRequest,
      gallery: p.galleryImages.map((g) => ({
        id: g.id,
        url: g.url,
        alt_text: g.altText,
        sort_order: g.sortOrder,
        is_primary: g.isPrimary,
      })),
      inventory: {
        manage_inventory: p.manageInventory,
        allow_backorder: p.allowBackorder,
        stock_quantity: p.stockQuantity,
        reserved_quantity: p.reservedQuantity,
        available_quantity: Math.max(0, p.stockQuantity - p.reservedQuantity),
        low_stock_threshold: p.lowStockThreshold,
      },
      quantity_rules: {
        min_order_qty: p.minOrderQty,
        max_order_qty: p.maxOrderQty,
        step_qty: p.stepQty,
      },
      pricing: {
        price_on_request: p.priceOnRequest,
        currency_code: p.currency.toLowerCase(),
        base_unit_amount: p.priceOnRequest ? null : p.basePriceCents,
        compare_at_unit_amount: p.priceOnRequest ? null : p.compareAtPriceCents,
        tax_rate_percent: p.taxRatePercent,
        price_tiers: p.priceOnRequest
          ? []
          : p.priceTiers.map((t) => ({
              min_qty: t.minQty,
              max_qty: t.maxQty,
              unit_amount: t.unitPriceCents,
              label: t.discountLabel,
            })),
      },
      seo: {
        title: p.seoTitle || p.title,
        description: p.seoDescription || p.shortDescription,
        keywords: p.seoKeywords,
        canonical_url: p.canonicalUrl,
        og_image: p.ogImageUrl || p.thumbnailUrl,
        no_index: p.noIndex,
      },
    },
    variants: p.variants.map((v) => {
      let options: Record<string, string> = {};
      try {
        options = JSON.parse(v.optionsJson || '{}');
      } catch {
        options = {};
      }
      return {
        id: `variant_${v.id}`,
        title: v.title,
        sku: v.sku,
        inventory_quantity: v.stockQuantity,
        calculated_price: {
          currency_code: p.currency.toLowerCase(),
          calculated_amount: v.priceCents,
        },
        options,
      };
    }),
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

// Bootstrap & Authenticated Me
app.get('/api/admin/me', requireAuth, async (req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  res.json({
    user: {
      uid: req.user?.uid,
      email: req.user?.email,
      role: req.dbUser?.role ?? 'admin',
    },
  });
});

// Products CRUD
app.get('/api/admin/products', requireAuth, async (req: AuthRequest, res) => {
  try {
    await seedDemoProductsIfEmpty();
    await seedWorkspaceDataIfEmpty();
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const items = await listProducts({ search, status });
    res.json({ products: items, count: items.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Eroare la încărcarea produselor';
    res.status(500).json({ error: message });
  }
});

app.get('/api/admin/products/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID produs invalid' });
  }
  try {
    const product = await getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Produsul nu a fost găsit' });
    }
    res.json({ product });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Eroare la citirea produsului';
    res.status(500).json({ error: message });
  }
});

app.post('/api/admin/products', requireAuth, async (req: AuthRequest, res) => {
  const parsed = productPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Date invalide',
      issues: parsed.error.issues,
    });
  }
  try {
    const created = await createProduct(parsed.data);
    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(created.id),
      action: `Produs creat · ${created.title}`,
      newValue: created.sku,
    });
    const full = await getProductById(created.id);
    res.status(201).json({ product: full });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Eroare la crearea produsului';
    res.status(400).json({ error: message });
  }
});

app.put('/api/admin/products/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID produs invalid' });
  }
  const parsed = productPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Date invalide',
      issues: parsed.error.issues,
    });
  }
  try {
    const updated = await updateProduct(id, parsed.data);
    if (!updated) {
      return res.status(404).json({ error: 'Produsul nu a fost găsit' });
    }
    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(id),
      action: `Produs actualizat · ${updated.title}`,
      newValue: updated.status,
    });
    const full = await getProductById(id);
    res.json({ product: full });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Eroare la actualizarea produsului';
    res.status(400).json({ error: message });
  }
});

app.delete('/api/admin/products/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID produs invalid' });
  }
  try {
    const deleted = await deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Produsul nu a fost găsit' });
    }
    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(id),
      action: `Produs șters · ${deleted.title}`,
    });
    res.json({ deleted: true, id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Eroare la ștergerea produsului';
    res.status(500).json({ error: message });
  }
});

// Inventory & Price quick adjustment + audit logging
app.post('/api/admin/inventory/adjust', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    productId: z.number().int().positive(),
    stockQuantity: z.number().int().min(0).optional(),
    basePriceCents: z.number().int().min(0).optional(),
    compareAtPriceCents: z.number().int().min(0).nullable().optional(),
    sku: z.string().trim().max(100).optional(),
    barcode: z.string().trim().max(100).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Parametri invalizi' });
  }
  try {
    const updated = await adjustProductInventoryOrPrice({
      ...parsed.data,
      actorEmail: req.user?.email || 'admin',
    });
    if (!updated) {
      return res.status(404).json({ error: 'Produsul nu a fost găsit' });
    }
    res.json({ product: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Eroare la actualizare';
    res.status(500).json({ error: message });
  }
});

// Bulk import products from JSON/CSV payload
app.post('/api/admin/import/products', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    items: z
      .array(
        z.object({
          title: z.string().trim().min(1),
          handle: z.string().trim().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          sku: z.string().trim().default(''),
          category: z.string().trim().default('General'),
          basePriceCents: z.number().int().min(0).default(10000),
          stockQuantity: z.number().int().min(0).default(10),
        })
      )
      .min(1)
      .max(100),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Format import invalid' });
  }
  let imported = 0;
  for (const item of parsed.data.items) {
    try {
      await createProduct({
        title: item.title,
        subtitle: '',
        handle: item.handle,
        status: 'draft',
        shortDescription: '',
        longDescription: '',
        thumbnailUrl: '',
        category: item.category,
        collectionName: '',
        sku: item.sku,
        barcode: '',
        basePriceCents: item.basePriceCents,
        compareAtPriceCents: null,
        currency: 'RON',
        taxRatePercent: 19,
        priceOnRequest: false,
        stockQuantity: item.stockQuantity,
        reservedQuantity: 0,
        lowStockThreshold: 5,
        manageInventory: true,
        allowBackorder: false,
        minOrderQty: 1,
        maxOrderQty: null,
        stepQty: 1,
        weightGrams: 500,
        seoTitle: item.title,
        seoDescription: '',
        seoKeywords: '',
        canonicalUrl: '',
        ogImageUrl: '',
        noIndex: false,
        metadataJson: '{}',
        galleryImages: [],
        priceTiers: [],
        variants: [],
      });
      imported++;
    } catch {
      // skip duplicate handles
    }
  }
  await logAudit({
    actorEmail: req.user?.email || 'admin',
    entityType: 'activity',
    entityId: 'import',
    action: `Import produse executat (${imported} adăugate)`,
  });
  res.json({ imported });
});

// Calculate tiered pricing
app.post('/api/admin/calculate-price', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'productId și quantity sunt obligatorii' });
  }
  try {
    const product = await getProductById(parsed.data.productId);
    if (!product) {
      return res.status(404).json({ error: 'Produsul nu a fost găsit' });
    }
    if (product.priceOnRequest) {
      return res.json({
        calculation: {
          requestedQty: parsed.data.quantity,
          valid: false,
          priceOnRequest: true,
          validationErrors: ['Produs cu preț la cerere — necesită solicitare de ofertă.'],
          unitPriceCents: 0,
          totalPriceCents: 0,
          savingsCents: 0,
          appliedTier: null,
          availableStock: Math.max(0, product.stockQuantity - product.reservedQuantity),
        },
      });
    }
    const calculation = resolveTieredPrice(product, parsed.data.quantity);
    res.json({ calculation });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Eroare la calculul prețului';
    res.status(500).json({ error: message });
  }
});

// Dashboard Summary
app.get('/api/admin/dashboard', requireAuth, async (_req: AuthRequest, res) => {
  try {
    await seedDemoProductsIfEmpty();
    await seedWorkspaceDataIfEmpty();
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Eroare la încărcarea panoului' });
  }
});

// Orders API
app.get('/api/admin/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    await seedWorkspaceDataIfEmpty();
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const items = await listOrders(status);
    const all = await listOrders('all');
    const counts = {
      all: all.length,
      pending: all.filter((o) => o.status === 'pending').length,
      processing: all.filter((o) => o.status === 'processing').length,
      processed: all.filter((o) => o.status === 'processed').length,
      returned: all.filter((o) => o.status === 'returned').length,
      returnRequests: all.filter((o) => o.returnStatus === 'requested').length,
    };
    res.json({ orders: items, counts });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Eroare' });
  }
});

app.post('/api/admin/orders', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    customerName: z.string().trim().min(1),
    customerEmail: z.string().trim().email(),
    customerPhone: z.string().trim().default(''),
    paymentStatus: z.enum(['paid', 'pending', 'refund_pending']).default('paid'),
    paymentMethod: z.string().trim().default('Card Online'),
    shippingMethod: z.string().trim().default('FAN Courier'),
    shippingCity: z.string().trim().default('București'),
    totalCents: z.number().int().min(0),
    itemsCount: z.number().int().min(1).default(1),
    notes: z.string().trim().default(''),
    deductStock: z.boolean().optional().default(true),
    items: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.number().int().min(1),
        })
      )
      .optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Date comandă invalide' });
  }
  try {
    const created = await createOrder({
      ...parsed.data,
      actorEmail: req.user?.email || 'admin',
    });
    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(created.id),
      action: `Comandă nouă creată · ${created.orderNumber}`,
    });
    res.status(201).json({ order: created });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Eroare' });
  }
});

app.patch('/api/admin/orders/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID comandă invalid' });
  }
  const schema = z.object({
    status: z.enum(['pending', 'processing', 'processed', 'returned']).optional(),
    returnStatus: z.enum(['none', 'requested', 'approved', 'completed']).optional(),
    awbNumber: z.string().trim().max(80).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Parametri actualizați invalizi' });
  }
  try {
    const updated = await updateOrderStatus(id, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Comanda nu există' });
    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(id),
      action: `Comandă ${updated.orderNumber} actualizată`,
      newValue: `${updated.status}${updated.awbNumber ? ` · AWB ${updated.awbNumber}` : ''}`,
    });
    res.json({ order: updated });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Eroare' });
  }
});

// Customers API
app.get('/api/admin/customers', requireAuth, async (_req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  const rows = await listCustomers();
  res.json({ customers: rows });
});

app.post('/api/admin/customers', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    fullName: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string().trim().default(''),
    groupName: z.string().trim().default('Clienți Standard'),
    city: z.string().trim().default('București'),
    newsletterSubscribed: z.boolean().default(false),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Date client invalide' });
  }
  try {
    const created = await createCustomer(parsed.data);
    res.status(201).json({ customer: created });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Eroare' });
  }
});

app.patch('/api/admin/customers/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    field: z.enum(['isBlacklisted', 'newsletterSubscribed']),
    value: z.boolean(),
  });
  const parsed = schema.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    return res.status(400).json({ error: 'Date invalide' });
  }
  const updated = await toggleCustomerFlag(id, parsed.data.field, parsed.data.value);
  if (!updated) return res.status(404).json({ error: 'Client inexistent' });
  res.json({ customer: updated });
});

// Categories & Brands
app.get('/api/admin/categories', requireAuth, async (_req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  res.json({ categories: await listCategories() });
});

app.post('/api/admin/categories', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    parentName: z.string().trim().default(''),
    description: z.string().trim().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Date categorie invalide' });
  try {
    const created = await createCategory(parsed.data);
    res.status(201).json({ category: created });
  } catch {
    res.status(400).json({ error: 'Slug-ul categoriei există deja' });
  }
});

app.delete('/api/admin/categories/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid' });
  await deleteCategory(id);
  res.json({ deleted: true });
});

app.get('/api/admin/brands', requireAuth, async (_req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  res.json({ brands: await listBrands() });
});

app.post('/api/admin/brands', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    website: z.string().trim().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Date brand invalide' });
  try {
    const created = await createBrand(parsed.data);
    res.status(201).json({ brand: created });
  } catch {
    res.status(400).json({ error: 'Slug-ul brandului există deja' });
  }
});

app.delete('/api/admin/brands/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid' });
  await deleteBrand(id);
  res.json({ deleted: true });
});

// Coupons
app.get('/api/admin/coupons', requireAuth, async (_req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  res.json({ coupons: await listCoupons() });
});

app.post('/api/admin/coupons', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    code: z.string().trim().min(2).max(40),
    title: z.string().trim().min(1),
    discountType: z.enum(['percent', 'fixed_cents']),
    discountValue: z.number().int().min(1),
    minOrderCents: z.number().int().min(0).default(0),
    maxUses: z.number().int().min(1).nullable().default(null),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Date cupon invalide' });
  try {
    const created = await createCoupon({
      ...parsed.data,
      code: parsed.data.code.toUpperCase(),
    });
    res.status(201).json({ coupon: created });
  } catch {
    res.status(400).json({ error: 'Codul cuponului există deja' });
  }
});

app.patch('/api/admin/coupons/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const schema = z.object({ isActive: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    return res.status(400).json({ error: 'Date cupon invalide' });
  }
  const updated = await toggleCouponStatus(id, parsed.data.isActive);
  if (!updated) return res.status(404).json({ error: 'Cupon inexistent' });
  await logAudit({
    actorEmail: req.user?.email || 'admin',
    entityType: 'activity',
    entityId: String(id),
    action: `Cupon ${updated.code} ${updated.isActive ? 'activat' : 'dezactivat'}`,
  });
  res.json({ coupon: updated });
});

app.delete('/api/admin/coupons/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid' });
  await deleteCoupon(id);
  res.json({ deleted: true });
});

// Blog
app.get('/api/admin/blog', requireAuth, async (_req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  res.json({ posts: await listBlogPosts() });
});

app.post('/api/admin/blog', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    title: z.string().trim().min(1),
    slug: z.string().trim().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: z.string().trim().default('Ghiduri'),
    tags: z.string().trim().default(''),
    status: z.enum(['published', 'draft']).default('published'),
    excerpt: z.string().trim().default(''),
    content: z.string().trim().default(''),
    authorName: z.string().trim().default('Redacția Verda'),
    seoTitle: z.string().trim().max(200).default(''),
    seoDescription: z.string().trim().max(500).default(''),
    seoKeywords: z.string().trim().max(400).default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Date articol invalide' });
  try {
    const created = await createBlogPost(parsed.data);
    res.status(201).json({ post: created });
  } catch {
    res.status(400).json({ error: 'Slug-ul articolului există deja' });
  }
});

app.put('/api/admin/blog/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid' });
  const schema = z.object({
    title: z.string().trim().min(1),
    category: z.string().trim().default('Ghiduri'),
    status: z.enum(['published', 'draft']).default('published'),
    excerpt: z.string().trim().default(''),
    content: z.string().trim().default(''),
    seoTitle: z.string().trim().max(200).default(''),
    seoDescription: z.string().trim().max(500).default(''),
    seoKeywords: z.string().trim().max(400).default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Date articol invalide' });
  const updated = await updateBlogPost(id, parsed.data);
  if (!updated) return res.status(404).json({ error: 'Articol inexistent' });
  res.json({ post: updated });
});

app.delete('/api/admin/blog/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid' });
  await deleteBlogPost(id);
  res.json({ deleted: true });
});

// Site Pages (Custom Code + Per-Page SEO)
app.get('/api/admin/site-pages', requireAuth, async (_req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  res.json({ pages: await listSitePages() });
});

const sitePageSchema = z.object({
  title: z.string().trim().min(1, 'Titlul paginii este obligatoriu').max(180),
  slug: z
    .string()
    .trim()
    .min(1, 'URL-ul paginii este obligatoriu')
    .max(180)
    .regex(/^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/, 'Slug-ul trebuie să înceapă cu / și să conțină doar litere mici, cifre și cratime'),
  pageType: z.enum(['core', 'custom_code']).default('custom_code'),
  codeContent: z.string().max(100000).default(''),
  cssContent: z.string().max(50000).default(''),
  isPublished: z.boolean().default(true),
  seoTitle: z.string().trim().max(200).default(''),
  seoDescription: z.string().trim().max(500).default(''),
  seoKeywords: z.string().trim().max(400).default(''),
  canonicalUrl: safeCanonicalSchema.default(''),
  ogImageUrl: safeImageSchema.default(''),
  noIndex: z.boolean().default(false),
});

app.post('/api/admin/site-pages', requireAuth, async (req: AuthRequest, res) => {
  const parsed = sitePageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Date pagină invalide' });
  }
  try {
    const created = await createSitePage({
      ...parsed.data,
      pageType: 'custom_code',
    });
    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(created.id),
      action: `Pagină creată · ${created.title} (${created.slug})`,
    });
    res.status(201).json({ page: created });
  } catch {
    res.status(400).json({ error: 'Există deja o pagină cu acest URL slug' });
  }
});

app.put('/api/admin/site-pages/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid' });
  const parsed = sitePageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Date pagină invalide' });
  }
  try {
    const updated = await updateSitePage(id, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Pagina nu a fost găsită' });
    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(id),
      action: `Pagină/SEO actualizat · ${updated.title} (${updated.slug})`,
    });
    res.json({ page: updated });
  } catch {
    res.status(400).json({ error: 'Există deja o altă pagină cu acest URL slug' });
  }
});

app.delete('/api/admin/site-pages/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid' });
  const all = await listSitePages();
  const target = all.find((p) => p.id === id);
  if (!target) return res.status(404).json({ error: 'Pagina nu există' });
  if (target.pageType === 'core') {
    return res.status(400).json({ error: 'Paginile principale ale site-ului nu pot fi șterse, dar le poți edita SEO.' });
  }
  await deleteSitePage(id);
  res.json({ deleted: true });
});

app.get('/api/store/pages', requireAuth, async (_req: AuthRequest, res) => {
  const all = await listSitePages();
  const published = all.filter((p) => p.isPublished);
  res.json({
    pages: published.map((p) => ({
      slug: p.slug,
      title: p.title,
      page_type: p.pageType,
      html: p.codeContent,
      css: p.cssContent,
      seo: {
        title: p.seoTitle || p.title,
        description: p.seoDescription,
        keywords: p.seoKeywords,
        canonical_url: p.canonicalUrl,
        og_image: p.ogImageUrl,
        no_index: p.noIndex,
      },
    })),
  });
});

// Quote Requests (Cereri ofertă pentru produse Preț la cerere)
app.get('/api/admin/quotes', requireAuth, async (_req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  res.json({ quotes: await listQuoteRequests() });
});

app.post('/api/store/quotes', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    productId: z.number().int().positive().nullable().default(null),
    productTitle: z.string().trim().min(1).max(200),
    productHandle: z.string().trim().max(200).default(''),
    customerName: z.string().trim().min(1, 'Numele este obligatoriu').max(150),
    customerEmail: z.string().trim().email('Email invalid').max(180),
    customerPhone: z.string().trim().max(50).default(''),
    companyName: z.string().trim().max(150).default(''),
    requestedQty: z.number().int().min(1).max(100000).default(1),
    message: z.string().trim().max(2000).default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Date solicitare invalide' });
  }
  const created = await createQuoteRequest(parsed.data);
  await logAudit({
    actorEmail: req.user?.email || parsed.data.customerEmail,
    entityType: 'activity',
    entityId: String(created.id),
    action: `Cerere ofertă ${created.requestNumber} · ${created.productTitle}`,
    newValue: `${created.requestedQty} buc.`,
  });
  res.status(201).json({ quote: created });
});

app.patch('/api/admin/quotes/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid' });
  const schema = z.object({ status: z.enum(['new', 'quoted', 'closed']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Status invalid' });
  const updated = await updateQuoteRequestStatus(id, parsed.data.status);
  if (!updated) return res.status(404).json({ error: 'Cererea nu există' });
  res.json({ quote: updated });
});

// Audit Logs
app.get('/api/admin/audit-logs', requireAuth, async (req: AuthRequest, res) => {
  const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : undefined;
  res.json({ logs: await listAuditLogs(entityType) });
});

// Generic Module Items (Website, Marketing rules, Feeds, Shipping, Taxes, Redirects, etc.)
app.get('/api/admin/modules/:moduleKey', requireAuth, async (req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  const moduleKey = String(req.params.moduleKey || '').replace(/[^a-z0-9_]/gi, '');
  if (!moduleKey) return res.status(400).json({ error: 'Modul invalid' });
  res.json({ items: await listModuleItems(moduleKey) });
});

app.post('/api/admin/modules/:moduleKey', requireAuth, async (req: AuthRequest, res) => {
  const moduleKey = String(req.params.moduleKey || '').replace(/[^a-z0-9_]/gi, '');
  const schema = z.object({
    title: z.string().trim().min(1),
    code: z.string().trim().default(''),
    status: z.string().trim().default('active'),
    dataJson: z.string().default('{}'),
  });
  const parsed = schema.safeParse(req.body);
  if (!moduleKey || !parsed.success) {
    return res.status(400).json({ error: 'Date invalide' });
  }
  const created = await createModuleItem({
    moduleKey,
    ...parsed.data,
  });
  await logAudit({
    actorEmail: req.user?.email || 'admin',
    entityType: 'activity',
    entityId: `${moduleKey}:${created.id}`,
    action: `Element adăugat în ${moduleKey} · ${created.title}`,
  });
  res.status(201).json({ item: created });
});

app.patch('/api/admin/modules/:moduleKey/:id', requireAuth, async (req: AuthRequest, res) => {
  const moduleKey = String(req.params.moduleKey || '').replace(/[^a-z0-9_]/gi, '');
  const id = Number(req.params.id);
  const schema = z.object({ status: z.enum(['active', 'inactive', 'draft', 'published', 'pending']) });
  const parsed = schema.safeParse(req.body);
  if (!moduleKey || !Number.isInteger(id) || id <= 0 || !parsed.success) {
    return res.status(400).json({ error: 'Parametri invalizi' });
  }
  const updated = await toggleModuleItemStatus(moduleKey, id, parsed.data.status);
  if (!updated) return res.status(404).json({ error: 'Înregistrarea nu a fost găsită' });
  res.json({ item: updated });
});

app.delete('/api/admin/modules/:moduleKey/:id', requireAuth, async (req: AuthRequest, res) => {
  const moduleKey = String(req.params.moduleKey || '').replace(/[^a-z0-9_]/gi, '');
  const id = Number(req.params.id);
  if (!moduleKey || !Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Parametri invalizi' });
  }
  await deleteModuleItem(moduleKey, id);
  res.json({ deleted: true });
});

// Store Settings
app.get('/api/admin/settings/:settingKey', requireAuth, async (req: AuthRequest, res) => {
  const settingKey = String(req.params.settingKey || '').replace(/[^a-z0-9_]/gi, '');
  if (!settingKey) return res.status(400).json({ error: 'Cheie invalidă' });
  const setting = await getStoreSetting(settingKey);
  let data: Record<string, unknown> = {};
  if (setting) {
    try {
      data = JSON.parse(setting.dataJson);
    } catch {
      data = {};
    }
  }
  res.json({ settingKey, data, updatedAt: setting?.updatedAt ?? null, updatedBy: setting?.updatedBy ?? '' });
});

app.put('/api/admin/settings/:settingKey', requireAuth, async (req: AuthRequest, res) => {
  const settingKey = String(req.params.settingKey || '').replace(/[^a-z0-9_]/gi, '');
  if (!settingKey || typeof req.body !== 'object' || req.body === null) {
    return res.status(400).json({ error: 'Setări invalide' });
  }
  const saved = await upsertStoreSetting(
    settingKey,
    JSON.stringify(req.body),
    req.user?.email || 'admin'
  );
  await logAudit({
    actorEmail: req.user?.email || 'admin',
    entityType: 'activity',
    entityId: settingKey,
    action: `Setări actualizate · ${settingKey}`,
  });
  res.json({ saved: true, updatedAt: saved.updatedAt });
});

// Store API Preview Endpoints
app.get('/api/store/products', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const items = await listProducts({ status: 'published' });
    res.json({
      products: items.map((p) => toMedusaStoreProduct(p)),
      count: items.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Eroare la încărcarea produselor';
    res.status(500).json({ error: message });
  }
});

app.get('/api/store/products/:handle', requireAuth, async (req: AuthRequest, res) => {
  const handle = String(req.params.handle || '').trim();
  if (!handle) {
    return res.status(400).json({ error: 'Handle produs obligatoriu' });
  }
  try {
    const product = await getProductByHandle(handle);
    if (!product) {
      return res.status(404).json({ error: 'Produsul nu a fost găsit' });
    }
    res.json({ product: toMedusaStoreProduct(product) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Eroare la încărcarea produsului';
    res.status(500).json({ error: message });
  }
});

// Medusa v2 Blueprint File Browser
const BLUEPRINT_FILES = [
  'medusa-config.ts',
  'docker-compose.yml',
  '.env.medusa.example',
  'src/modules/product-extended/index.ts',
  'src/modules/product-extended/service.ts',
  'src/modules/product-extended/models/product-extension.ts',
  'src/modules/product-extended/models/gallery-image.ts',
  'src/modules/product-extended/models/price-tier.ts',
  'src/links/product-extended-link.ts',
  'src/workflows/upsert-product-extended.ts',
  'src/api/admin/products/[id]/extended/route.ts',
  'src/api/store/products/[id]/extended/route.ts',
];

app.get('/api/admin/blueprint-files', requireAuth, (_req: AuthRequest, res) => {
  const baseDir = path.resolve(process.cwd(), 'medusa-v2');
  const files = BLUEPRINT_FILES.map((relPath) => {
    const resolved = path.resolve(baseDir, relPath);
    if (!resolved.startsWith(baseDir + path.sep)) {
      return null;
    }
    if (!fs.existsSync(resolved)) {
      return null;
    }
    return {
      path: `medusa-v2/${relPath}`,
      content: fs.readFileSync(resolved, 'utf8'),
    };
  }).filter(Boolean);

  res.json({ files });
});

// ==========================================
// SAFE INTERNAL MEDIA SERVING & WEBP CONVERTER
// ==========================================

app.get('/media/:filename', (req, res) => {
  const rawName = String(req.params.filename || '');
  if (!/^[a-zA-Z0-9._-]+$/.test(rawName)) {
    return res.status(400).send('Invalid filename');
  }
  const resolved = path.resolve(UPLOADS_DIR, rawName);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
    return res.status(404).send('Not found');
  }
  const ext = path.extname(rawName).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
  };
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.type(mimeMap[ext] || 'application/octet-stream');
  res.sendFile(resolved);
});

async function seedStudioMediaIfEmpty() {
  const existing = await listMediaAssets();
  if (existing.length > 0) return;
  const presets = [
    {
      title: 'Lampă Arhitecturală Travertin',
      slug: 'lampa-travertin-studio',
      filename: 'product_ceramic_lamp_1795418708491.jpg',
      altText: 'Lampă de masă din travertin natural și alamă',
    },
    {
      title: 'Espressor Dual-Boiler Nocturne',
      slug: 'espressor-nocturne-studio',
      filename: 'product_espresso_machine_1795418708508.jpg',
      altText: 'Espressor profesional din inox și negru mat',
    },
    {
      title: 'Fotoliu Stejar Afumat & Bouclé',
      slug: 'fotoliu-stejar-afumat-studio',
      filename: 'product_oak_chair_1795418708504.jpg',
      altText: 'Fotoliu scandinav din stejar afumat',
    },
    {
      title: 'Boxă Acustică Monolith Nuc',
      slug: 'boxa-monolith-nuc-studio',
      filename: 'product_audio_speaker_1795418708462.jpg',
      altText: 'Boxă wireless din aluminiu anodizat și nuc',
    },
  ];
  for (const preset of presets) {
    const absPath = path.resolve(ASSETS_IMAGES_DIR, preset.filename);
    if (!absPath.startsWith(ASSETS_IMAGES_DIR + path.sep) || !fs.existsSync(absPath)) {
      continue;
    }
    try {
      const stat = fs.statSync(absPath);
      const meta = await sharp(absPath).metadata();
      await createMediaAsset({
        title: preset.title,
        slug: preset.slug,
        originalFilename: preset.filename,
        url: `/src/assets/images/${preset.filename}`,
        mimeType: 'image/jpeg',
        width: meta.width || 0,
        height: meta.height || 0,
        sizeBytes: stat.size,
        altText: preset.altText,
        sourceType: 'studio',
      });
    } catch {
      // ignore seed errors
    }
  }
}

function resolveLocalImagePath(urlPath: string): string | null {
  if (urlPath.startsWith('/media/')) {
    const file = urlPath.slice('/media/'.length);
    if (!/^[a-zA-Z0-9._-]+$/.test(file)) return null;
    const resolved = path.resolve(UPLOADS_DIR, file);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep)) return null;
    return fs.existsSync(resolved) ? resolved : null;
  }
  if (urlPath.startsWith('/src/assets/images/')) {
    const file = urlPath.slice('/src/assets/images/'.length);
    if (!/^[a-zA-Z0-9._-]+$/.test(file)) return null;
    const resolved = path.resolve(ASSETS_IMAGES_DIR, file);
    if (!resolved.startsWith(ASSETS_IMAGES_DIR + path.sep)) return null;
    return fs.existsSync(resolved) ? resolved : null;
  }
  return null;
}

app.get('/api/admin/media', requireAuth, async (_req: AuthRequest, res) => {
  try {
    await seedStudioMediaIfEmpty();
    const assets = await listMediaAssets();
    res.json({ assets });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Eroare Media' });
  }
});

app.post('/api/admin/media/upload', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    filename: z.string().trim().min(1).max(200),
    title: z.string().trim().max(200).optional(),
    altText: z.string().trim().max(300).optional(),
    dataBase64: z.string().min(10),
    convertToWebp: z.boolean().optional().default(false),
    quality: z.number().int().min(40).max(100).optional().default(84),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Fișier media invalid.' });
  }

  try {
    const base64Clean = parsed.data.dataBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: 'Imaginea depășește limita de 8 MB.' });
    }

    const meta = await sharp(buffer).metadata();
    const formatMap: Record<string, { ext: string; mime: string }> = {
      jpeg: { ext: '.jpg', mime: 'image/jpeg' },
      jpg: { ext: '.jpg', mime: 'image/jpeg' },
      png: { ext: '.png', mime: 'image/png' },
      webp: { ext: '.webp', mime: 'image/webp' },
      gif: { ext: '.gif', mime: 'image/gif' },
      avif: { ext: '.avif', mime: 'image/avif' },
    };
    const fmt = meta.format ? formatMap[meta.format] : undefined;
    if (!fmt) {
      return res.status(400).json({ error: 'Format imagine nesuportat (acceptat: JPG, PNG, WebP, GIF, AVIF).' });
    }

    const rawBase = path
      .basename(parsed.data.filename, path.extname(parsed.data.filename))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'imagine';
    const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const slug = `${rawBase}-${uniqueSuffix}`;
    const storedFile = `${slug}${fmt.ext}`;
    const destPath = path.resolve(UPLOADS_DIR, storedFile);
    if (!destPath.startsWith(UPLOADS_DIR + path.sep)) {
      return res.status(400).json({ error: 'Cale fișier invalidă.' });
    }
    fs.writeFileSync(destPath, buffer);

    let webpUrl = '';
    let webpSizeBytes = 0;
    if (parsed.data.convertToWebp || fmt.ext === '.webp') {
      if (fmt.ext === '.webp') {
        webpUrl = `/media/${storedFile}`;
        webpSizeBytes = buffer.length;
      } else {
        const webpFile = `${slug}.webp`;
        const webpPath = path.resolve(UPLOADS_DIR, webpFile);
        const webpBuffer = await sharp(buffer)
          .webp({ quality: parsed.data.quality })
          .toBuffer();
        fs.writeFileSync(webpPath, webpBuffer);
        webpUrl = `/media/${webpFile}`;
        webpSizeBytes = webpBuffer.length;
      }
    }

    const asset = await createMediaAsset({
      title: parsed.data.title || rawBase,
      slug,
      originalFilename: parsed.data.filename,
      url: `/media/${storedFile}`,
      mimeType: fmt.mime,
      width: meta.width || 0,
      height: meta.height || 0,
      sizeBytes: buffer.length,
      webpUrl,
      webpSizeBytes,
      altText: parsed.data.altText || parsed.data.title || rawBase,
      sourceType: 'upload',
    });

    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(asset.id),
      action: `Imagine încărcată în Media · ${asset.title}`,
      newValue: webpUrl ? 'WebP generat' : fmt.mime,
    });

    res.status(201).json({ asset });
  } catch (error: unknown) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Nu s-a putut procesa imaginea.',
    });
  }
});

app.post('/api/admin/media/:id/convert-webp', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID imagine invalid.' });
  }
  const quality = Math.max(40, Math.min(100, Number(req.body?.quality || 84)));
  try {
    const asset = await getMediaAssetById(id);
    if (!asset) {
      return res.status(404).json({ error: 'Imaginea nu există.' });
    }
    const localSrc = resolveLocalImagePath(asset.url);
    if (!localSrc) {
      return res.status(400).json({ error: 'Fișierul sursă local nu a fost găsit pe disc.' });
    }
    const webpFile = `${asset.slug}.webp`;
    const destPath = path.resolve(UPLOADS_DIR, webpFile);
    if (!destPath.startsWith(UPLOADS_DIR + path.sep)) {
      return res.status(400).json({ error: 'Cale destinație invalidă.' });
    }
    const webpBuffer = await sharp(localSrc).webp({ quality }).toBuffer();
    fs.writeFileSync(destPath, webpBuffer);
    const updated = await updateMediaAssetWebp(
      id,
      `/media/${webpFile}`,
      webpBuffer.length
    );

    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(id),
      action: `Conversie WebP realizată · ${asset.title}`,
      oldValue: `${Math.round(asset.sizeBytes / 1024)} KB`,
      newValue: `${Math.round(webpBuffer.length / 1024)} KB`,
    });

    res.json({ asset: updated });
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Eroare la conversia WebP.',
    });
  }
});

app.delete('/api/admin/media/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID imagine invalid.' });
  }
  const deleted = await deleteMediaAsset(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Imaginea nu există.' });
  }
  for (const u of [deleted.url, deleted.webpUrl]) {
    if (u.startsWith('/media/')) {
      const f = resolveLocalImagePath(u);
      if (f && fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {
          // ignore
        }
      }
    }
  }
  res.json({ deleted: true });
});

// ==========================================
// PRODUCT TAGS, ATTRIBUTES & EXPORT
// ==========================================

app.get('/api/admin/tags', requireAuth, async (_req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  res.json({ tags: await listProductTags() });
});

app.post('/api/admin/tags', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().trim().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Date etichetă invalide.' });
  try {
    const created = await createProductTag(parsed.data);
    res.status(201).json({ tag: created });
  } catch {
    res.status(400).json({ error: 'Slug-ul etichetei există deja.' });
  }
});

app.delete('/api/admin/tags/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid.' });
  await deleteProductTag(id);
  res.json({ deleted: true });
});

app.get('/api/admin/attributes', requireAuth, async (_req: AuthRequest, res) => {
  await seedWorkspaceDataIfEmpty();
  res.json({ attributes: await listProductAttributes() });
});

app.post('/api/admin/attributes', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    valuesText: z.string().trim().default(''),
    isFilterable: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Date atribut invalide.' });
  try {
    const created = await createProductAttribute(parsed.data);
    res.status(201).json({ attribute: created });
  } catch {
    res.status(400).json({ error: 'Slug-ul atributului există deja.' });
  }
});

app.delete('/api/admin/attributes/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid.' });
  await deleteProductAttribute(id);
  res.json({ deleted: true });
});

app.get('/api/admin/export/products', requireAuth, async (req: AuthRequest, res) => {
  const format = req.query.format === 'csv' ? 'csv' : 'json';
  const items = await listProducts();
  if (format === 'json') {
    res.setHeader('Content-Disposition', 'attachment; filename="produse-verda.json"');
    return res.json({ exportedAt: new Date().toISOString(), count: items.length, products: items });
  }
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = [
    'ID',
    'Titlu',
    'Handle',
    'SKU',
    'Status',
    'Categorie',
    'Brand',
    'Pret_Baza',
    'Moneda',
    'Pret_La_Cerere',
    'Stoc',
    'MinQty',
    'MaxQty',
    'StepQty',
  ].join(',');
  const rows = items.map((p) =>
    [
      p.id,
      esc(p.title),
      esc(p.handle),
      esc(p.sku),
      p.status,
      esc(p.category),
      esc(p.brand),
      (p.basePriceCents / 100).toFixed(2),
      p.currency,
      p.priceOnRequest ? 'DA' : 'NU',
      p.stockQuantity,
      p.minOrderQty,
      p.maxOrderQty ?? '',
      p.stepQty,
    ].join(',')
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="produse-verda.csv"');
  res.send([header, ...rows].join('\n'));
});

// ==========================================
// FAN COURIER, SAMEDAY & SMARTBILL INTEGRATIONS
// ==========================================

function parseProviderParam(raw: string): IntegrationProvider | null {
  if (raw === 'fancourier' || raw === 'sameday' || raw === 'smartbill') return raw;
  return null;
}

app.get('/api/admin/integrations/:provider', requireAuth, async (req: AuthRequest, res) => {
  const provider = parseProviderParam(String(req.params.provider || ''));
  if (!provider) return res.status(400).json({ error: 'Furnizor invalid.' });
  const result = await getMaskedIntegrationConfig(provider);
  res.json(result);
});

app.put('/api/admin/integrations/:provider', requireAuth, async (req: AuthRequest, res) => {
  const provider = parseProviderParam(String(req.params.provider || ''));
  if (!provider || typeof req.body !== 'object' || req.body === null) {
    return res.status(400).json({ error: 'Date configurare invalide.' });
  }
  try {
    const result = await saveIntegrationConfig(
      provider,
      req.body as Record<string, unknown>,
      req.user?.email || 'admin'
    );
    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: provider,
      action: `Integrare API salvată · ${provider.toUpperCase()}`,
    });
    res.json({ saved: true, ...result });
  } catch (error: unknown) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Eroare la salvarea configurației.',
    });
  }
});

app.post('/api/admin/integrations/:provider/test', requireAuth, async (req: AuthRequest, res) => {
  const provider = parseProviderParam(String(req.params.provider || ''));
  if (!provider) return res.status(400).json({ error: 'Furnizor invalid.' });
  try {
    if (provider === 'fancourier') {
      const data = await testFanCourierConnection();
      return res.json(data);
    }
    if (provider === 'sameday') {
      const data = await testSamedayConnection();
      return res.json(data);
    }
    const data = await testSmartBillConnection();
    return res.json(data);
  } catch (error: unknown) {
    res.status(400).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Test conexiune eșuat.',
    });
  }
});

app.post('/api/admin/orders/:id/create-awb', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const provider = req.body?.provider === 'sameday' ? 'sameday' : 'fancourier';
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID comandă invalid.' });
  }
  const order = await getOrderById(id);
  if (!order) return res.status(404).json({ error: 'Comanda nu există.' });

  try {
    const result =
      provider === 'sameday'
        ? await createSamedayAwb(order)
        : await createFanCourierAwb(order);

    const updated = await updateOrderStatus(id, {
      awbNumber: result.awbNumber,
      courierProvider: provider,
      shippingMethod: provider === 'sameday' ? 'Sameday Curier' : 'FAN Courier Express',
      status: order.status === 'pending' ? 'processing' : order.status,
    });

    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(id),
      action: `AWB ${provider.toUpperCase()} generat · ${order.orderNumber}`,
      newValue: result.awbNumber,
    });

    res.json({ order: updated, awbNumber: result.awbNumber, provider });
  } catch (error: unknown) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Eroare la generarea AWB.',
    });
  }
});

app.get('/api/admin/orders/:id/awb-label', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID comandă invalid.' });
  }
  const order = await getOrderById(id);
  if (!order || !order.awbNumber) {
    return res.status(404).json({ error: 'Comanda nu are un AWB generat.' });
  }
  try {
    const pdf = await fetchFanCourierAwbPdf(order.awbNumber);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="awb-${order.awbNumber}.pdf"`);
    res.send(pdf);
  } catch (error: unknown) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Eroare descărcare etichetă AWB.',
    });
  }
});

app.post('/api/admin/orders/:id/emit-invoice', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const docType = req.body?.docType === 'proforma' ? 'proforma' : 'invoice';
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID comandă invalid.' });
  }
  const order = await getOrderById(id);
  if (!order) return res.status(404).json({ error: 'Comanda nu există.' });

  try {
    const emitted = await emitSmartBillDocument(order, docType);
    const updated = await updateOrderStatus(id, {
      invoiceSeries: emitted.series,
      invoiceNumber: emitted.number,
      invoiceUrl: emitted.url,
    });

    await logAudit({
      actorEmail: req.user?.email || 'admin',
      entityType: 'activity',
      entityId: String(id),
      action: `${docType === 'proforma' ? 'Proformă' : 'Factură'} SmartBill emisă · ${order.orderNumber}`,
      newValue: `${emitted.series} ${emitted.number}`,
    });

    res.json({ order: updated, document: emitted });
  } catch (error: unknown) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Eroare la emiterea documentului SmartBill.',
    });
  }
});

app.get('/api/admin/orders/:id/invoice-pdf', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID comandă invalid.' });
  }
  const order = await getOrderById(id);
  if (!order || !order.invoiceSeries || !order.invoiceNumber) {
    return res.status(404).json({ error: 'Comanda nu are factură SmartBill emisă.' });
  }
  try {
    const pdf = await fetchSmartBillInvoicePdf(order.invoiceSeries, order.invoiceNumber);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="factura-${order.invoiceSeries}-${order.invoiceNumber}.pdf"`
    );
    res.send(pdf);
  } catch (error: unknown) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Eroare descărcare PDF SmartBill.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
