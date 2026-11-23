import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  auditLogs,
  blogPosts,
  brands,
  categories,
  coupons,
  customers,
  moduleItems,
  orders,
  products,
  storeSettings,
} from './schema.ts';

export async function logAudit(entry: {
  actorEmail: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      actorEmail: entry.actorEmail,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      oldValue: entry.oldValue ?? '',
      newValue: entry.newValue ?? '',
      details: entry.details ?? '',
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function seedWorkspaceDataIfEmpty() {
  try {
    const existingOrder = await db.select({ id: orders.id }).from(orders).limit(1);
    if (existingOrder.length === 0) {
      await db.insert(orders).values([
        {
          orderNumber: 'CMD-2026-1082',
          customerName: 'Andrei Popescu',
          customerEmail: 'andrei.popescu@arhitectura.ro',
          customerPhone: '0722 418 902',
          status: 'pending',
          returnStatus: 'none',
          paymentStatus: 'paid',
          paymentMethod: 'Card Online (Netopia)',
          shippingMethod: 'FAN Courier Express',
          awbNumber: '',
          shippingCity: 'București',
          totalCents: 145000,
          currency: 'RON',
          itemsCount: 3,
          notes: 'Livrare cu verificare colet la recepție.',
        },
        {
          orderNumber: 'CMD-2026-1081',
          customerName: 'Elena Dumitrescu',
          customerEmail: 'elena@studio-nord.ro',
          customerPhone: '0744 310 112',
          status: 'pending',
          returnStatus: 'none',
          paymentStatus: 'pending',
          paymentMethod: 'Ramburs la curier',
          shippingMethod: 'Sameday Easybox',
          awbNumber: '',
          shippingCity: 'Cluj-Napoca',
          totalCents: 89000,
          currency: 'RON',
          itemsCount: 2,
          notes: 'Factură pe firmă SC Studio Nord SRL.',
        },
        {
          orderNumber: 'CMD-2026-1079',
          customerName: 'Mihai Ionescu',
          customerEmail: 'mihai.ionescu@hotelcarpati.ro',
          customerPhone: '0731 890 441',
          status: 'processing',
          returnStatus: 'none',
          paymentStatus: 'paid',
          paymentMethod: 'Transfer Bancar B2B',
          shippingMethod: 'FAN Courier Palet',
          awbNumber: 'FAN992018442',
          shippingCity: 'Brașov',
          totalCents: 589000,
          currency: 'RON',
          itemsCount: 12,
          notes: 'Comandă B2B cu preț pe prag cantitativ.',
        },
        {
          orderNumber: 'CMD-2026-1074',
          customerName: 'Ioana Marinescu',
          customerEmail: 'ioana.marinescu@gmail.com',
          customerPhone: '0755 219 003',
          status: 'processed',
          returnStatus: 'none',
          paymentStatus: 'paid',
          paymentMethod: 'Card Online (Stripe)',
          shippingMethod: 'Sameday Curier',
          awbNumber: 'SMD441029381',
          shippingCity: 'Timișoara',
          totalCents: 34200,
          currency: 'RON',
          itemsCount: 1,
          notes: '',
        },
        {
          orderNumber: 'CMD-2026-1068',
          customerName: 'Radu Georgescu',
          customerEmail: 'radu.georgescu@atelier.ro',
          customerPhone: '0766 102 889',
          status: 'returned',
          returnStatus: 'requested',
          paymentStatus: 'refund_pending',
          paymentMethod: 'Card Online (Netopia)',
          shippingMethod: 'FAN Courier Retur',
          awbNumber: 'FAN991844120',
          shippingCity: 'Iași',
          totalCents: 74000,
          currency: 'RON',
          itemsCount: 1,
          notes: 'Solicită retur: dorește schimb pentru altă nuanță.',
        },
      ]);
    }

    const existingCustomer = await db
      .select({ id: customers.id })
      .from(customers)
      .limit(1);
    if (existingCustomer.length === 0) {
      await db.insert(customers).values([
        {
          fullName: 'Andrei Popescu',
          email: 'andrei.popescu@arhitectura.ro',
          phone: '0722 418 902',
          groupName: 'B2B Arhitecți',
          ordersCount: 6,
          totalSpentCents: 842000,
          newsletterSubscribed: true,
          isBlacklisted: false,
          city: 'București',
        },
        {
          fullName: 'Elena Dumitrescu',
          email: 'elena@studio-nord.ro',
          phone: '0744 310 112',
          groupName: 'VIP Retail',
          ordersCount: 4,
          totalSpentCents: 419000,
          newsletterSubscribed: true,
          isBlacklisted: false,
          city: 'Cluj-Napoca',
        },
        {
          fullName: 'Mihai Ionescu',
          email: 'mihai.ionescu@hotelcarpati.ro',
          phone: '0731 890 441',
          groupName: 'B2B HoReCa',
          ordersCount: 11,
          totalSpentCents: 2490000,
          newsletterSubscribed: false,
          isBlacklisted: false,
          city: 'Brașov',
        },
        {
          fullName: 'Ioana Marinescu',
          email: 'ioana.marinescu@gmail.com',
          phone: '0755 219 003',
          groupName: 'Clienți Standard',
          ordersCount: 2,
          totalSpentCents: 98000,
          newsletterSubscribed: true,
          isBlacklisted: false,
          city: 'Timișoara',
        },
      ]);
    }

    const existingCat = await db
      .select({ id: categories.id })
      .from(categories)
      .limit(1);
    if (existingCat.length === 0) {
      await db.insert(categories).values([
        {
          name: 'Iluminat Arhitectural',
          slug: 'iluminat-arhitectural',
          parentName: '',
          description: 'Lămpi din piatră naturală, alamă și corpuri LED.',
          isActive: true,
          sortOrder: 1,
        },
        {
          name: 'Mobilier Nordic',
          slug: 'mobilier-nordic',
          parentName: '',
          description: 'Fotolii, mese și piese din stejar masiv.',
          isActive: true,
          sortOrder: 2,
        },
        {
          name: 'Electrocasnice Espresso',
          slug: 'electrocasnice-espresso',
          parentName: '',
          description: 'Espresoare dual-boiler și accesorii barista.',
          isActive: true,
          sortOrder: 3,
        },
        {
          name: 'Audio & Acustică',
          slug: 'audio-acustica',
          parentName: '',
          description: 'Boxe wireless din aluminiu anodizat și nuc.',
          isActive: true,
          sortOrder: 4,
        },
      ]);
    }

    const existingBrand = await db.select({ id: brands.id }).from(brands).limit(1);
    if (existingBrand.length === 0) {
      await db.insert(brands).values([
        { name: 'Atelier Travertin', slug: 'atelier-travertin', website: 'https://atelier-travertin.ro', isActive: true },
        { name: 'Nocturne Espresso', slug: 'nocturne-espresso', website: 'https://nocturne.ro', isActive: true },
        { name: 'Nordic Oak', slug: 'nordic-oak', website: 'https://nordicoak.ro', isActive: true },
        { name: 'Monolith Audio', slug: 'monolith-audio', website: 'https://monolith-audio.ro', isActive: true },
      ]);
    }

    const existingCoupon = await db.select({ id: coupons.id }).from(coupons).limit(1);
    if (existingCoupon.length === 0) {
      await db.insert(coupons).values([
        {
          code: 'TURCOAZ15',
          title: 'Discount lansare colecție nouă',
          discountType: 'percent',
          discountValue: 15,
          minOrderCents: 30000,
          usageCount: 24,
          maxUses: 200,
          isActive: true,
        },
        {
          code: 'B2B500',
          title: 'Voucher fix comenzi HoReCa',
          discountType: 'fixed_cents',
          discountValue: 50000,
          minOrderCents: 250000,
          usageCount: 7,
          maxUses: 50,
          isActive: true,
        },
      ]);
    }

    const existingBlog = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .limit(1);
    if (existingBlog.length === 0) {
      await db.insert(blogPosts).values([
        {
          title: 'Cum alegi iluminatul din travertin pentru spații comerciale',
          slug: 'cum-alegi-iluminatul-din-travertin',
          category: 'Design Interior',
          tags: 'travertin, iluminat, horeca',
          status: 'published',
          excerpt: 'Ghid practic pentru arhitecți și manageri de locații privind temperatura de culoare și mentenanța pietrei naturale.',
          content: 'Piatra naturală de travertin oferă o textură caldă și unică fiecărui corp de iluminat...',
          authorName: 'Redacția Verda',
        },
        {
          title: 'Reguli de comandă B2B: praguri de preț și livrare paletizată',
          slug: 'reguli-comanda-b2b-praguri-pret',
          category: 'B2B & Logistică',
          tags: 'b2b, tiered-pricing, stocuri',
          status: 'published',
          excerpt: 'Explicăm sistemul de cantități minime, pași de comandă și reduceri automate pe volum.',
          content: 'Pentru partenerii HoReCa și studiourile de design, reducerile pe praguri se aplică automat în coș...',
          authorName: 'Echipa Comercială',
        },
      ]);
    }

    const existingModules = await db
      .select({ id: moduleItems.id })
      .from(moduleItems)
      .limit(1);
    if (existingModules.length === 0) {
      await db.insert(moduleItems).values([
        {
          moduleKey: 'banners',
          title: 'Slider Principal Colecția Turcoaz 2026',
          code: 'Homepage Top',
          status: 'active',
          dataJson: JSON.stringify({ dimensiune: '1920x650', link: '/colectii/nou', tip: 'Carusel' }),
        },
        {
          moduleKey: 'site_pages',
          title: 'Politica de Cookies',
          code: '/info/cookies',
          status: 'active',
          dataJson: JSON.stringify({ template: 'legal', vizibilMeniu: true }),
        },
        {
          moduleKey: 'site_pages',
          title: 'Cum cumpăr & Livrare',
          code: '/info/cum-cumpar',
          status: 'active',
          dataJson: JSON.stringify({ template: 'editorial', vizibilMeniu: true }),
        },
        {
          moduleKey: 'custom_scripts',
          title: 'Google Analytics 4 (GA4)',
          code: 'Header (Toate paginile)',
          status: 'active',
          dataJson: JSON.stringify({ grup: 'meta_verify', id: 'G-VERDA2026' }),
        },
        {
          moduleKey: 'custom_scripts',
          title: 'Google Tag Manager Body',
          code: 'Body (Toate paginile)',
          status: 'active',
          dataJson: JSON.stringify({ grup: 'other_scripts', id: 'GTM-VERDA1' }),
        },
        {
          moduleKey: 'nav_menus',
          title: 'Meniu Principal · Promoții',
          code: '/catalog/oferte-speciale',
          status: 'active',
          dataJson: JSON.stringify({ zona: 'Main', tip: 'Pagină predefinită' }),
        },
        {
          moduleKey: 'redirects_301',
          title: '/vechi-lampi -> /iluminat-arhitectural',
          code: '301',
          status: 'active',
          dataJson: JSON.stringify({ sursa: '/vechi-lampi', destinatie: '/iluminat-arhitectural' }),
        },
        {
          moduleKey: 'feeds',
          title: 'Feed Produse Google Merchant & Compari',
          code: 'XML-FEED-RO',
          status: 'active',
          dataJson: JSON.stringify({ tip: 'Produse', format: 'XML', frecventa: 'La fiecare 2 ore' }),
        },
        {
          moduleKey: 'shipping_methods',
          title: 'FAN Courier Express 24h',
          code: 'FAN-EXP',
          status: 'active',
          dataJson: JSON.stringify({ tarifRON: 22, gratuitPesteRON: 450 }),
        },
        {
          moduleKey: 'shipping_methods',
          title: 'Sameday Easybox Lockers',
          code: 'SMD-BOX',
          status: 'active',
          dataJson: JSON.stringify({ tarifRON: 15, gratuitPesteRON: 300 }),
        },
        {
          moduleKey: 'tax_rules',
          title: 'TVA Standard România (19%)',
          code: 'TVA-19',
          status: 'active',
          dataJson: JSON.stringify({ procent: 19, tara: 'RO', inclusInPret: true }),
        },
        {
          moduleKey: 'sellers',
          title: 'Atelier Transilvania Design SRL',
          code: 'VND-001',
          status: 'active',
          dataJson: JSON.stringify({ comisionProcent: 12, oras: 'Brașov' }),
        },
        {
          moduleKey: 'abandoned_carts',
          title: 'Coș #AC-904 · 2x Lampă Travertin',
          code: 'client@exemplu.ro',
          status: 'pending',
          dataJson: JSON.stringify({ valoareRON: 578, abandonatAcum: '2 ore' }),
        },
        {
          moduleKey: 'blacklist_rules',
          title: 'Blocare email risc neridicare',
          code: 'test.anulare@exemplu.ro',
          status: 'active',
          dataJson: JSON.stringify({ tip: 'Email client', actiune: 'Restricționează accesul' }),
        },
        {
          moduleKey: 'sent_emails',
          title: 'Confirmare comandă CMD-2026-1082',
          code: 'andrei.popescu@arhitectura.ro',
          status: 'active',
          dataJson: JSON.stringify({ statusEmail: 'Deschis', tip: 'Comandă în așteptare' }),
        },
        {
          moduleKey: 'dynamic_pricing_rules',
          title: 'Discount automat volum B2B >= 10 buc.',
          code: 'DYN-B2B-10',
          status: 'active',
          dataJson: JSON.stringify({ conditie: 'cantitate >= 10', reducere: '15%' }),
        },
        {
          moduleKey: 'combo_rules',
          title: 'Pachet Espresso + 2x Cești Ceramică',
          code: 'CMB-BARISTA',
          status: 'active',
          dataJson: JSON.stringify({ reducerePachetRON: 150 }),
        },
        {
          moduleKey: 'cart_discount_rules',
          title: 'Transport gratuit & -5% peste 1.500 RON',
          code: 'CART-1500',
          status: 'active',
          dataJson: JSON.stringify({ pragRON: 1500, discount: '5%' }),
        },
        {
          moduleKey: 'api_keys',
          title: 'Cheie Storefront Node.js Production',
          code: 'pk_live_verda_storefront',
          status: 'active',
          dataJson: JSON.stringify({ permisiuni: 'store:read, cart:write' }),
        },
      ]);
    }
  } catch (error) {
    console.error('Failed to seed workspace data:', error);
  }
}

export async function listOrders(statusFilter?: string) {
  try {
    const all = await db.select().from(orders).orderBy(desc(orders.id));
    if (!statusFilter || statusFilter === 'all') return all;
    if (statusFilter === 'return_requests') {
      return all.filter((o) => o.returnStatus === 'requested');
    }
    return all.filter((o) => o.status === statusFilter);
  } catch (error) {
    console.error('Failed to list orders:', error);
    throw new Error('Eroare la încărcarea comenzilor.', { cause: error });
  }
}

export async function createOrder(input: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingMethod: string;
  shippingCity: string;
  totalCents: number;
  itemsCount: number;
  notes: string;
  deductStock?: boolean;
  items?: Array<{ productId: number; quantity: number }>;
  actorEmail?: string;
}) {
  try {
    const orderNumber = `CMD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [created] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        status: 'pending',
        returnStatus: 'none',
        paymentStatus: input.paymentStatus || 'paid',
        paymentMethod: input.paymentMethod,
        shippingMethod: input.shippingMethod,
        shippingCity: input.shippingCity,
        totalCents: input.totalCents,
        currency: 'RON',
        itemsCount: input.itemsCount,
        notes: input.notes,
      })
      .returning();

    if (input.deductStock && input.items && input.items.length > 0) {
      for (const line of input.items) {
        const [prod] = await db
          .select()
          .from(products)
          .where(eq(products.id, line.productId))
          .limit(1);
        if (prod) {
          const nextStock = Math.max(0, prod.stockQuantity - line.quantity);
          await db
            .update(products)
            .set({ stockQuantity: nextStock, updatedAt: new Date() })
            .where(eq(products.id, prod.id));
          await logAudit({
            actorEmail: input.actorEmail || 'system',
            entityType: 'stock',
            entityId: String(prod.id),
            action: `Comandă ${orderNumber} · ${prod.title}`,
            oldValue: `${prod.stockQuantity} buc.`,
            newValue: `${nextStock} buc.`,
            details: prod.sku,
          });
        }
      }
    }

    return created;
  } catch (error) {
    console.error('Failed to create order:', error);
    throw new Error('Eroare la crearea comenzii.', { cause: error });
  }
}

export async function updateOrderStatus(
  id: number,
  updates: { status?: string; returnStatus?: string; awbNumber?: string }
) {
  try {
    const [updated] = await db
      .update(orders)
      .set({
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.returnStatus ? { returnStatus: updates.returnStatus } : {}),
        ...(updates.awbNumber !== undefined ? { awbNumber: updates.awbNumber } : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Failed to update order:', error);
    throw new Error('Eroare la actualizarea comenzii.', { cause: error });
  }
}

export async function listCustomers() {
  try {
    return await db.select().from(customers).orderBy(desc(customers.id));
  } catch (error) {
    console.error('Failed to list customers:', error);
    throw new Error('Eroare la încărcarea clienților.', { cause: error });
  }
}

export async function createCustomer(input: {
  fullName: string;
  email: string;
  phone: string;
  groupName: string;
  city: string;
  newsletterSubscribed: boolean;
}) {
  try {
    const [created] = await db
      .insert(customers)
      .values(input)
      .returning();
    return created;
  } catch (error) {
    console.error('Failed to create customer:', error);
    throw new Error('Eroare la salvarea clientului (verificați adresa de email).', {
      cause: error,
    });
  }
}

export async function toggleCustomerFlag(
  id: number,
  field: 'isBlacklisted' | 'newsletterSubscribed',
  value: boolean
) {
  try {
    const [updated] = await db
      .update(customers)
      .set(
        field === 'isBlacklisted'
          ? { isBlacklisted: value }
          : { newsletterSubscribed: value }
      )
      .where(eq(customers.id, id))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Failed to update customer flag:', error);
    throw new Error('Eroare la actualizarea clientului.', { cause: error });
  }
}

export async function listCategories() {
  return db.select().from(categories).orderBy(categories.sortOrder, categories.id);
}

export async function createCategory(input: {
  name: string;
  slug: string;
  parentName: string;
  description: string;
}) {
  const [created] = await db.insert(categories).values(input).returning();
  return created;
}

export async function deleteCategory(id: number) {
  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning();
  return deleted ?? null;
}

export async function listBrands() {
  return db.select().from(brands).orderBy(brands.id);
}

export async function createBrand(input: {
  name: string;
  slug: string;
  website: string;
}) {
  const [created] = await db.insert(brands).values(input).returning();
  return created;
}

export async function deleteBrand(id: number) {
  const [deleted] = await db
    .delete(brands)
    .where(eq(brands.id, id))
    .returning();
  return deleted ?? null;
}

export async function adjustProductInventoryOrPrice(input: {
  productId: number;
  actorEmail: string;
  stockQuantity?: number;
  basePriceCents?: number;
  compareAtPriceCents?: number | null;
  sku?: string;
  barcode?: string;
}) {
  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);
  const current = existing[0];
  if (!current) return null;

  const updates: Partial<typeof products.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (
    input.stockQuantity !== undefined &&
    input.stockQuantity !== current.stockQuantity
  ) {
    updates.stockQuantity = input.stockQuantity;
    await logAudit({
      actorEmail: input.actorEmail,
      entityType: 'stock',
      entityId: String(current.id),
      action: `Modificare stoc · ${current.title}`,
      oldValue: `${current.stockQuantity} buc.`,
      newValue: `${input.stockQuantity} buc.`,
      details: current.sku,
    });
  }

  if (
    input.basePriceCents !== undefined &&
    input.basePriceCents !== current.basePriceCents
  ) {
    updates.basePriceCents = input.basePriceCents;
    await logAudit({
      actorEmail: input.actorEmail,
      entityType: 'price',
      entityId: String(current.id),
      action: `Modificare preț · ${current.title}`,
      oldValue: `${(current.basePriceCents / 100).toFixed(2)} ${current.currency}`,
      newValue: `${(input.basePriceCents / 100).toFixed(2)} ${current.currency}`,
      details: current.sku,
    });
  }

  if (input.compareAtPriceCents !== undefined) {
    updates.compareAtPriceCents = input.compareAtPriceCents;
  }
  if (input.sku !== undefined && input.sku !== current.sku) {
    updates.sku = input.sku;
  }
  if (input.barcode !== undefined && input.barcode !== current.barcode) {
    updates.barcode = input.barcode;
  }

  const [updated] = await db
    .update(products)
    .set(updates)
    .where(eq(products.id, input.productId))
    .returning();
  return updated ?? null;
}

export async function listAuditLogs(entityType?: string) {
  if (entityType) {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, entityType))
      .orderBy(desc(auditLogs.id))
      .limit(100);
  }
  return db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(100);
}

export async function listCoupons() {
  return db.select().from(coupons).orderBy(desc(coupons.id));
}

export async function createCoupon(input: {
  code: string;
  title: string;
  discountType: string;
  discountValue: number;
  minOrderCents: number;
  maxUses: number | null;
}) {
  const [created] = await db.insert(coupons).values(input).returning();
  return created;
}

export async function toggleCouponStatus(id: number, isActive: boolean) {
  const [updated] = await db
    .update(coupons)
    .set({ isActive })
    .where(eq(coupons.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteCoupon(id: number) {
  const [deleted] = await db
    .delete(coupons)
    .where(eq(coupons.id, id))
    .returning();
  return deleted ?? null;
}

export async function listBlogPosts() {
  return db.select().from(blogPosts).orderBy(desc(blogPosts.id));
}

export async function createBlogPost(input: {
  title: string;
  slug: string;
  category: string;
  tags: string;
  status: string;
  excerpt: string;
  content: string;
  authorName: string;
}) {
  const [created] = await db.insert(blogPosts).values(input).returning();
  return created;
}

export async function deleteBlogPost(id: number) {
  const [deleted] = await db
    .delete(blogPosts)
    .where(eq(blogPosts.id, id))
    .returning();
  return deleted ?? null;
}

export async function listModuleItems(moduleKey: string) {
  return db
    .select()
    .from(moduleItems)
    .where(eq(moduleItems.moduleKey, moduleKey))
    .orderBy(desc(moduleItems.id));
}

export async function createModuleItem(input: {
  moduleKey: string;
  title: string;
  code: string;
  status: string;
  dataJson: string;
}) {
  const [created] = await db.insert(moduleItems).values(input).returning();
  return created;
}

export async function toggleModuleItemStatus(
  moduleKey: string,
  id: number,
  status: string
) {
  const [updated] = await db
    .update(moduleItems)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(moduleItems.id, id), eq(moduleItems.moduleKey, moduleKey)))
    .returning();
  return updated ?? null;
}

export async function deleteModuleItem(moduleKey: string, id: number) {
  const [deleted] = await db
    .delete(moduleItems)
    .where(and(eq(moduleItems.id, id), eq(moduleItems.moduleKey, moduleKey)))
    .returning();
  return deleted ?? null;
}

export async function getStoreSetting(settingKey: string) {
  const rows = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.settingKey, settingKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertStoreSetting(
  settingKey: string,
  dataJson: string,
  updatedBy: string
) {
  const [saved] = await db
    .insert(storeSettings)
    .values({
      settingKey,
      dataJson,
      updatedBy,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: storeSettings.settingKey,
      set: {
        dataJson,
        updatedBy,
        updatedAt: new Date(),
      },
    })
    .returning();
  return saved;
}

export async function getDashboardSummary() {
  const [allOrders, allCustomers, allProducts, allCategories, allBrands, allLogs] =
    await Promise.all([
      db.select().from(orders).orderBy(desc(orders.id)),
      db.select().from(customers).orderBy(desc(customers.id)),
      db.select().from(products),
      db.select().from(categories),
      db.select().from(brands),
      db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(50),
    ]);

  const totalRevenueCents = allOrders
    .filter((o) => o.status !== 'returned')
    .reduce((s, o) => s + o.totalCents, 0);

  const avgOrderCents =
    allOrders.length > 0 ? Math.round(totalRevenueCents / allOrders.length) : 0;

  return {
    kpis: {
      pendingOrders: allOrders.filter((o) => o.status === 'pending').length,
      processingOrders: allOrders.filter((o) => o.status === 'processing').length,
      processedOrders: allOrders.filter((o) => o.status === 'processed').length,
      returnRequests: allOrders.filter((o) => o.returnStatus === 'requested').length,
      totalOrders: allOrders.length,
      totalRevenueCents,
      avgOrderCents,
      totalProducts: allProducts.length,
      outOfStockProducts: allProducts.filter((p) => p.stockQuantity <= 0).length,
      publishedProducts: allProducts.filter((p) => p.status === 'published').length,
      totalCategories: allCategories.length,
      totalBrands: allBrands.length,
      totalCustomers: allCustomers.length,
      newsletterSubscribers: allCustomers.filter((c) => c.newsletterSubscribed).length,
    },
    recentOrders: allOrders.slice(0, 10),
    recentLogs: allLogs.slice(0, 10),
  };
}
