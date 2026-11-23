import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  medusaProductId: text('medusa_product_id').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  handle: text('handle').notNull().unique(),
  status: text('status').notNull().default('draft'),
  shortDescription: text('short_description').notNull().default(''),
  longDescription: text('long_description').notNull().default(''),
  thumbnailUrl: text('thumbnail_url').notNull().default(''),
  category: text('category').notNull().default('General'),
  brand: text('brand').notNull().default(''),
  collectionName: text('collection_name').notNull().default(''),
  tags: text('tags').notNull().default(''),
  attributesJson: text('attributes_json').notNull().default('[]'),
  sku: text('sku').notNull().default(''),
  barcode: text('barcode').notNull().default(''),
  basePriceCents: integer('base_price_cents').notNull().default(0),
  compareAtPriceCents: integer('compare_at_price_cents'),
  currency: text('currency').notNull().default('RON'),
  taxRatePercent: integer('tax_rate_percent').notNull().default(19),
  priceOnRequest: boolean('price_on_request').notNull().default(false),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  manageInventory: boolean('manage_inventory').notNull().default(true),
  allowBackorder: boolean('allow_backorder').notNull().default(false),
  minOrderQty: integer('min_order_qty').notNull().default(1),
  maxOrderQty: integer('max_order_qty'),
  stepQty: integer('step_qty').notNull().default(1),
  weightGrams: integer('weight_grams').notNull().default(0),
  seoTitle: text('seo_title').notNull().default(''),
  seoDescription: text('seo_description').notNull().default(''),
  seoKeywords: text('seo_keywords').notNull().default(''),
  canonicalUrl: text('canonical_url').notNull().default(''),
  ogImageUrl: text('og_image_url').notNull().default(''),
  noIndex: boolean('no_index').notNull().default(false),
  metadataJson: text('metadata_json').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const productGalleryImages = pgTable('product_gallery_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  url: text('url').notNull(),
  altText: text('alt_text').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isPrimary: boolean('is_primary').notNull().default(false),
});

export const productPriceTiers = pgTable('product_price_tiers', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  minQty: integer('min_qty').notNull(),
  maxQty: integer('max_qty'),
  unitPriceCents: integer('unit_price_cents').notNull(),
  discountLabel: text('discount_label').notNull().default(''),
});

export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  sku: text('sku').notNull().default(''),
  priceCents: integer('price_cents').notNull().default(0),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  optionsJson: text('options_json').notNull().default('{}'),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull().default(''),
  status: text('status').notNull().default('pending'),
  returnStatus: text('return_status').notNull().default('none'),
  paymentStatus: text('payment_status').notNull().default('paid'),
  paymentMethod: text('payment_method').notNull().default('Card Online'),
  shippingMethod: text('shipping_method').notNull().default('FAN Courier'),
  courierProvider: text('courier_provider').notNull().default(''),
  awbNumber: text('awb_number').notNull().default(''),
  invoiceSeries: text('invoice_series').notNull().default(''),
  invoiceNumber: text('invoice_number').notNull().default(''),
  invoiceUrl: text('invoice_url').notNull().default(''),
  shippingCity: text('shipping_city').notNull().default('București'),
  totalCents: integer('total_cents').notNull().default(0),
  currency: text('currency').notNull().default('RON'),
  itemsCount: integer('items_count').notNull().default(1),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const quoteRequests = pgTable('quote_requests', {
  id: serial('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(),
  productId: integer('product_id'),
  productTitle: text('product_title').notNull(),
  productHandle: text('product_handle').notNull().default(''),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull().default(''),
  companyName: text('company_name').notNull().default(''),
  requestedQty: integer('requested_qty').notNull().default(1),
  message: text('message').notNull().default(''),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sitePages = pgTable('site_pages', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  pageType: text('page_type').notNull().default('custom_code'),
  codeContent: text('code_content').notNull().default(''),
  cssContent: text('css_content').notNull().default(''),
  isPublished: boolean('is_published').notNull().default(true),
  seoTitle: text('seo_title').notNull().default(''),
  seoDescription: text('seo_description').notNull().default(''),
  seoKeywords: text('seo_keywords').notNull().default(''),
  canonicalUrl: text('canonical_url').notNull().default(''),
  ogImageUrl: text('og_image_url').notNull().default(''),
  noIndex: boolean('no_index').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull().default(''),
  groupName: text('group_name').notNull().default('Clienți Standard'),
  ordersCount: integer('orders_count').notNull().default(0),
  totalSpentCents: integer('total_spent_cents').notNull().default(0),
  newsletterSubscribed: boolean('newsletter_subscribed').notNull().default(false),
  isBlacklisted: boolean('is_blacklisted').notNull().default(false),
  city: text('city').notNull().default('București'),
  lastLoginAt: timestamp('last_login_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  parentName: text('parent_name').notNull().default(''),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  website: text('website').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
});

export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  discountType: text('discount_type').notNull().default('percent'),
  discountValue: integer('discount_value').notNull().default(10),
  minOrderCents: integer('min_order_cents').notNull().default(0),
  usageCount: integer('usage_count').notNull().default(0),
  maxUses: integer('max_uses'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category').notNull().default('Ghiduri'),
  tags: text('tags').notNull().default(''),
  status: text('status').notNull().default('published'),
  excerpt: text('excerpt').notNull().default(''),
  content: text('content').notNull().default(''),
  authorName: text('author_name').notNull().default('Echipa Editorială'),
  seoTitle: text('seo_title').notNull().default(''),
  seoDescription: text('seo_description').notNull().default(''),
  seoKeywords: text('seo_keywords').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorEmail: text('actor_email').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  oldValue: text('old_value').notNull().default(''),
  newValue: text('new_value').notNull().default(''),
  details: text('details').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const moduleItems = pgTable('module_items', {
  id: serial('id').primaryKey(),
  moduleKey: text('module_key').notNull(),
  title: text('title').notNull(),
  code: text('code').notNull().default(''),
  status: text('status').notNull().default('active'),
  dataJson: text('data_json').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  dataJson: text('data_json').notNull().default('{}'),
  updatedBy: text('updated_by').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const mediaAssets = pgTable('media_assets', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  originalFilename: text('original_filename').notNull(),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull().default('image/jpeg'),
  width: integer('width').notNull().default(0),
  height: integer('height').notNull().default(0),
  sizeBytes: integer('size_bytes').notNull().default(0),
  webpUrl: text('webp_url').notNull().default(''),
  webpSizeBytes: integer('webp_size_bytes').notNull().default(0),
  altText: text('alt_text').notNull().default(''),
  sourceType: text('source_type').notNull().default('upload'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const productTags = pgTable('product_tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const productAttributes = pgTable('product_attributes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  valuesText: text('values_text').notNull().default(''),
  isFilterable: boolean('is_filterable').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const productsRelations = relations(products, ({ many }) => ({
  galleryImages: many(productGalleryImages),
  priceTiers: many(productPriceTiers),
  variants: many(productVariants),
}));

export const productGalleryImagesRelations = relations(
  productGalleryImages,
  ({ one }) => ({
    product: one(products, {
      fields: [productGalleryImages.productId],
      references: [products.id],
    }),
  })
);

export const productPriceTiersRelations = relations(
  productPriceTiers,
  ({ one }) => ({
    product: one(products, {
      fields: [productPriceTiers.productId],
      references: [products.id],
    }),
  })
);

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
  })
);
