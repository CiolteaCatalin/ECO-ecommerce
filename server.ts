import express from 'express';
import fs from 'fs';
import path from 'path';
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
  createModuleItem,
  createOrder,
  deleteBlogPost,
  deleteBrand,
  deleteCategory,
  deleteCoupon,
  deleteModuleItem,
  getDashboardSummary,
  getStoreSetting,
  listAuditLogs,
  listBlogPosts,
  listBrands,
  listCategories,
  listCoupons,
  listCustomers,
  listModuleItems,
  listOrders,
  logAudit,
  seedWorkspaceDataIfEmpty,
  toggleCouponStatus,
  toggleCustomerFlag,
  toggleModuleItemStatus,
  updateOrderStatus,
  upsertStoreSetting,
} from './src/db/workspace.ts';

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '5mb' }));

function isSafeImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/src/assets/')) return true;
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
    collectionName: z.string().trim().max(120).default(''),
    sku: z.string().trim().max(100).default(''),
    barcode: z.string().trim().max(100).default(''),
    basePriceCents: z.number().int().min(0),
    compareAtPriceCents: z.number().int().min(0).nullable().default(null),
    currency: z.enum(['EUR', 'RON', 'USD', 'GBP']).default('RON'),
    taxRatePercent: z.number().int().min(0).max(100).default(19),
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
    thumbnail: p.thumbnailUrl,
    category: p.category,
    collection: p.collectionName,
    sku: p.sku,
    weight: p.weightGrams,
    metadata: parsedMetadata,
    extended: {
      short_description: p.shortDescription,
      long_description: p.longDescription,
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
        currency_code: p.currency.toLowerCase(),
        base_unit_amount: p.basePriceCents,
        compare_at_unit_amount: p.compareAtPriceCents,
        tax_rate_percent: p.taxRatePercent,
        price_tiers: p.priceTiers.map((t) => ({
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

app.delete('/api/admin/blog/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalid' });
  await deleteBlogPost(id);
  res.json({ deleted: true });
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
