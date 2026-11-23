import { asc, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  productGalleryImages,
  productPriceTiers,
  products,
  productVariants,
} from './schema.ts';

export interface GalleryImageInput {
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface PriceTierInput {
  minQty: number;
  maxQty: number | null;
  unitPriceCents: number;
  discountLabel: string;
}

export interface ProductVariantInput {
  title: string;
  sku: string;
  priceCents: number;
  stockQuantity: number;
  optionsJson: string;
}

export interface ProductUpsertInput {
  title: string;
  subtitle: string;
  handle: string;
  status: 'draft' | 'published' | 'archived';
  shortDescription: string;
  longDescription: string;
  thumbnailUrl: string;
  category: string;
  collectionName: string;
  sku: string;
  barcode: string;
  basePriceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
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
  galleryImages: GalleryImageInput[];
  priceTiers: PriceTierInput[];
  variants: ProductVariantInput[];
}

function generateMedusaProductId(): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `prod_${ts}${rand}`;
}

export async function listProducts(filters?: {
  search?: string;
  status?: string;
}) {
  try {
    const rows = await db.query.products.findMany({
      orderBy: [desc(products.updatedAt), desc(products.id)],
      with: {
        galleryImages: {
          orderBy: [asc(productGalleryImages.sortOrder), asc(productGalleryImages.id)],
        },
        priceTiers: {
          orderBy: [asc(productPriceTiers.minQty)],
        },
        variants: {
          orderBy: [asc(productVariants.id)],
        },
      },
    });

    let filtered = rows;
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter((p) => p.status === filters.status);
    }
    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.handle.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return filtered;
  } catch (error) {
    console.error('Database query failed in listProducts:', error);
    throw new Error('Failed to load products from database.', { cause: error });
  }
}

export async function getProductById(id: number) {
  try {
    const row = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        galleryImages: {
          orderBy: [asc(productGalleryImages.sortOrder), asc(productGalleryImages.id)],
        },
        priceTiers: {
          orderBy: [asc(productPriceTiers.minQty)],
        },
        variants: {
          orderBy: [asc(productVariants.id)],
        },
      },
    });
    return row ?? null;
  } catch (error) {
    console.error('Database query failed in getProductById:', error);
    throw new Error('Failed to load product details.', { cause: error });
  }
}

export async function getProductByHandle(handle: string) {
  try {
    const row = await db.query.products.findFirst({
      where: eq(products.handle, handle),
      with: {
        galleryImages: {
          orderBy: [asc(productGalleryImages.sortOrder), asc(productGalleryImages.id)],
        },
        priceTiers: {
          orderBy: [asc(productPriceTiers.minQty)],
        },
        variants: {
          orderBy: [asc(productVariants.id)],
        },
      },
    });
    return row ?? null;
  } catch (error) {
    console.error('Database query failed in getProductByHandle:', error);
    throw new Error('Failed to load storefront product.', { cause: error });
  }
}

export async function createProduct(input: ProductUpsertInput) {
  try {
    return await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(products)
        .values({
          medusaProductId: generateMedusaProductId(),
          title: input.title,
          subtitle: input.subtitle,
          handle: input.handle,
          status: input.status,
          shortDescription: input.shortDescription,
          longDescription: input.longDescription,
          thumbnailUrl: input.thumbnailUrl,
          category: input.category,
          collectionName: input.collectionName,
          sku: input.sku,
          barcode: input.barcode,
          basePriceCents: input.basePriceCents,
          compareAtPriceCents: input.compareAtPriceCents,
          currency: input.currency,
          taxRatePercent: input.taxRatePercent,
          stockQuantity: input.stockQuantity,
          reservedQuantity: input.reservedQuantity,
          lowStockThreshold: input.lowStockThreshold,
          manageInventory: input.manageInventory,
          allowBackorder: input.allowBackorder,
          minOrderQty: input.minOrderQty,
          maxOrderQty: input.maxOrderQty,
          stepQty: input.stepQty,
          weightGrams: input.weightGrams,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          seoKeywords: input.seoKeywords,
          canonicalUrl: input.canonicalUrl,
          ogImageUrl: input.ogImageUrl,
          noIndex: input.noIndex,
          metadataJson: input.metadataJson,
        })
        .returning();

      if (input.galleryImages.length > 0) {
        await tx.insert(productGalleryImages).values(
          input.galleryImages.map((img, idx) => ({
            productId: inserted.id,
            url: img.url,
            altText: img.altText,
            sortOrder: img.sortOrder ?? idx,
            isPrimary: img.isPrimary,
          }))
        );
      }

      if (input.priceTiers.length > 0) {
        await tx.insert(productPriceTiers).values(
          input.priceTiers.map((tier) => ({
            productId: inserted.id,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            unitPriceCents: tier.unitPriceCents,
            discountLabel: tier.discountLabel,
          }))
        );
      }

      if (input.variants.length > 0) {
        await tx.insert(productVariants).values(
          input.variants.map((v) => ({
            productId: inserted.id,
            title: v.title,
            sku: v.sku,
            priceCents: v.priceCents,
            stockQuantity: v.stockQuantity,
            optionsJson: v.optionsJson,
          }))
        );
      }

      return inserted;
    });
  } catch (error) {
    console.error('Database write failed in createProduct:', error);
    throw new Error('Failed to create product. Ensure handle is unique.', {
      cause: error,
    });
  }
}

export async function updateProduct(id: number, input: ProductUpsertInput) {
  try {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(products)
        .set({
          title: input.title,
          subtitle: input.subtitle,
          handle: input.handle,
          status: input.status,
          shortDescription: input.shortDescription,
          longDescription: input.longDescription,
          thumbnailUrl: input.thumbnailUrl,
          category: input.category,
          collectionName: input.collectionName,
          sku: input.sku,
          barcode: input.barcode,
          basePriceCents: input.basePriceCents,
          compareAtPriceCents: input.compareAtPriceCents,
          currency: input.currency,
          taxRatePercent: input.taxRatePercent,
          stockQuantity: input.stockQuantity,
          reservedQuantity: input.reservedQuantity,
          lowStockThreshold: input.lowStockThreshold,
          manageInventory: input.manageInventory,
          allowBackorder: input.allowBackorder,
          minOrderQty: input.minOrderQty,
          maxOrderQty: input.maxOrderQty,
          stepQty: input.stepQty,
          weightGrams: input.weightGrams,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          seoKeywords: input.seoKeywords,
          canonicalUrl: input.canonicalUrl,
          ogImageUrl: input.ogImageUrl,
          noIndex: input.noIndex,
          metadataJson: input.metadataJson,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      if (!updated) {
        return null;
      }

      await tx
        .delete(productGalleryImages)
        .where(eq(productGalleryImages.productId, id));
      if (input.galleryImages.length > 0) {
        await tx.insert(productGalleryImages).values(
          input.galleryImages.map((img, idx) => ({
            productId: id,
            url: img.url,
            altText: img.altText,
            sortOrder: img.sortOrder ?? idx,
            isPrimary: img.isPrimary,
          }))
        );
      }

      await tx
        .delete(productPriceTiers)
        .where(eq(productPriceTiers.productId, id));
      if (input.priceTiers.length > 0) {
        await tx.insert(productPriceTiers).values(
          input.priceTiers.map((tier) => ({
            productId: id,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            unitPriceCents: tier.unitPriceCents,
            discountLabel: tier.discountLabel,
          }))
        );
      }

      await tx
        .delete(productVariants)
        .where(eq(productVariants.productId, id));
      if (input.variants.length > 0) {
        await tx.insert(productVariants).values(
          input.variants.map((v) => ({
            productId: id,
            title: v.title,
            sku: v.sku,
            priceCents: v.priceCents,
            stockQuantity: v.stockQuantity,
            optionsJson: v.optionsJson,
          }))
        );
      }

      return updated;
    });
  } catch (error) {
    console.error('Database write failed in updateProduct:', error);
    throw new Error('Failed to update product. Ensure handle is unique.', {
      cause: error,
    });
  }
}

export async function deleteProduct(id: number) {
  try {
    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error('Database delete failed in deleteProduct:', error);
    throw new Error('Failed to delete product.', { cause: error });
  }
}

export function resolveTieredPrice(
  product: {
    basePriceCents: number;
    minOrderQty: number;
    maxOrderQty: number | null;
    stepQty: number;
    stockQuantity: number;
    reservedQuantity: number;
    manageInventory: boolean;
    allowBackorder: boolean;
    priceTiers: Array<{
      minQty: number;
      maxQty: number | null;
      unitPriceCents: number;
      discountLabel: string;
    }>;
  },
  requestedQty: number
) {
  const min = Math.max(1, product.minOrderQty);
  const step = Math.max(1, product.stepQty);
  const max = product.maxOrderQty;

  const isMinValid = requestedQty >= min;
  const isMaxValid = max === null || requestedQty <= max;
  const isStepValid = (requestedQty - min) % step === 0;
  const availableStock = Math.max(
    0,
    product.stockQuantity - product.reservedQuantity
  );
  const isStockValid =
    !product.manageInventory ||
    product.allowBackorder ||
    requestedQty <= availableStock;

  const matchedTier = [...product.priceTiers]
    .sort((a, b) => b.minQty - a.minQty)
    .find(
      (t) =>
        requestedQty >= t.minQty &&
        (t.maxQty === null || requestedQty <= t.maxQty)
    );

  const unitPriceCents = matchedTier
    ? matchedTier.unitPriceCents
    : product.basePriceCents;
  const totalPriceCents = unitPriceCents * requestedQty;
  const baseTotalCents = product.basePriceCents * requestedQty;
  const savingsCents = Math.max(0, baseTotalCents - totalPriceCents);

  return {
    requestedQty,
    valid: isMinValid && isMaxValid && isStepValid && isStockValid,
    validationErrors: [
      !isMinValid ? `Minimum order quantity is ${min}.` : null,
      !isMaxValid ? `Maximum order quantity is ${max}.` : null,
      !isStepValid
        ? `Quantity must increase in steps of ${step} starting from ${min}.`
        : null,
      !isStockValid
        ? `Insufficient available stock (${availableStock} available).`
        : null,
    ].filter(Boolean) as string[],
    unitPriceCents,
    totalPriceCents,
    savingsCents,
    appliedTier: matchedTier ?? null,
    availableStock,
  };
}

export async function seedDemoProductsIfEmpty() {
  try {
    const existing = await db.select({ id: products.id }).from(products).limit(1);
    if (existing.length > 0) {
      return false;
    }

    const demoCatalog: ProductUpsertInput[] = [
      {
        title: 'Travertine Architectural Table Lamp',
        subtitle: 'Honed natural stone base with brushed brass stem',
        handle: 'travertine-architectural-table-lamp',
        status: 'published',
        shortDescription:
          'Hand-turned travertine stone lamp with warm dimmable LED diffuser and solid brass hardware.',
        longDescription:
          'Crafted from unsealed Italian Roman travertine paired with a solid brushed brass column, this architectural table lamp delivers warm 2700K ambient illumination.\n\nKey highlights:\n- Natural porous stone texture, unique per piece\n- Stepless rotary brass dimmer switch\n- Suitable for hospitality suites, architectural studios, and residential interiors',
        thumbnailUrl:
          '/src/assets/images/product_ceramic_lamp_1795418708491.jpg',
        category: 'Lighting',
        collectionName: 'Architectural Series',
        sku: 'LMP-TRV-001',
        barcode: '5941000001014',
        basePriceCents: 28900,
        compareAtPriceCents: 34000,
        currency: 'EUR',
        taxRatePercent: 19,
        stockQuantity: 64,
        reservedQuantity: 6,
        lowStockThreshold: 10,
        manageInventory: true,
        allowBackorder: false,
        minOrderQty: 2,
        maxOrderQty: 100,
        stepQty: 2,
        weightGrams: 4200,
        seoTitle:
          'Travertine Architectural Table Lamp | Handcrafted Stone Lighting',
        seoDescription:
          'Shop the Travertine Architectural Table Lamp with brushed brass hardware. Available in B2B multi-unit packs with volume tiered pricing.',
        seoKeywords:
          'travertine lamp, brass table lamp, architectural lighting, hospitality lighting',
        canonicalUrl:
          'https://store.example.com/products/travertine-architectural-table-lamp',
        ogImageUrl:
          '/src/assets/images/product_ceramic_lamp_1795418708491.jpg',
        noIndex: false,
        metadataJson: JSON.stringify({
          material: 'Roman Travertine & Brushed Brass',
          socket: 'E27 Dimmable',
          warranty_months: 36,
        }),
        galleryImages: [
          {
            url: '/src/assets/images/product_ceramic_lamp_1795418708491.jpg',
            altText: 'Travertine table lamp front studio view',
            sortOrder: 0,
            isPrimary: true,
          },
          {
            url: '/src/assets/images/product_oak_chair_1795418708504.jpg',
            altText: 'Interior pairing with smoked oak lounge seating',
            sortOrder: 1,
            isPrimary: false,
          },
        ],
        priceTiers: [
          {
            minQty: 2,
            maxQty: 9,
            unitPriceCents: 28900,
            discountLabel: 'Standard Pair',
          },
          {
            minQty: 10,
            maxQty: 29,
            unitPriceCents: 25500,
            discountLabel: 'Studio Tier (-12%)',
          },
          {
            minQty: 30,
            maxQty: null,
            unitPriceCents: 22900,
            discountLabel: 'Hospitality Bulk (-21%)',
          },
        ],
        variants: [
          {
            title: 'Natural Travertine / Brushed Brass',
            sku: 'LMP-TRV-001-BR',
            priceCents: 28900,
            stockQuantity: 42,
            optionsJson: JSON.stringify({ Finish: 'Brushed Brass' }),
          },
          {
            title: 'Natural Travertine / Gunmetal',
            sku: 'LMP-TRV-001-GM',
            priceCents: 29900,
            stockQuantity: 22,
            optionsJson: JSON.stringify({ Finish: 'Gunmetal' }),
          },
        ],
      },
      {
        title: 'Nocturne Compact Dual-Boiler Espresso Machine',
        subtitle: 'PID temperature control with commercial 58mm portafilter',
        handle: 'nocturne-compact-espresso-machine',
        status: 'published',
        shortDescription:
          'Precision stainless steel and matte black espresso system engineered for boutique offices and specialty coffee bars.',
        longDescription:
          'Designed with dual PID thermal stability and an integrated rotary pressure gauge, the Nocturne Espresso Machine delivers repeatable extraction across back-to-back pulls.\n\nTechnical specifications:\n- Commercial 58mm stainless portafilter\n- Dedicated steam wand with cool-touch articulation\n- 2.4L removable rear reservoir',
        thumbnailUrl:
          '/src/assets/images/product_espresso_machine_1795418708508.jpg',
        category: 'Appliances',
        collectionName: 'Barista Pro',
        sku: 'ESP-NOC-204',
        barcode: '5941000002042',
        basePriceCents: 119000,
        compareAtPriceCents: 135000,
        currency: 'EUR',
        taxRatePercent: 19,
        stockQuantity: 18,
        reservedQuantity: 2,
        lowStockThreshold: 5,
        manageInventory: true,
        allowBackorder: true,
        minOrderQty: 1,
        maxOrderQty: 20,
        stepQty: 1,
        weightGrams: 11800,
        seoTitle:
          'Nocturne Dual-Boiler Espresso Machine | Commercial 58mm PID',
        seoDescription:
          'Buy the Nocturne Compact Dual-Boiler Espresso Machine with 58mm portafilter and volume discounts for offices and hospitality.',
        seoKeywords:
          'espresso machine, dual boiler, 58mm portafilter, office coffee system',
        canonicalUrl:
          'https://store.example.com/products/nocturne-compact-espresso-machine',
        ogImageUrl:
          '/src/assets/images/product_espresso_machine_1795418708508.jpg',
        noIndex: false,
        metadataJson: JSON.stringify({
          power_watts: 1850,
          voltage: '220-240V',
          boiler_type: 'Dual Stainless PID',
        }),
        galleryImages: [
          {
            url: '/src/assets/images/product_espresso_machine_1795418708508.jpg',
            altText: 'Nocturne espresso machine pulling double shot',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
        priceTiers: [
          {
            minQty: 1,
            maxQty: 2,
            unitPriceCents: 119000,
            discountLabel: 'Single Unit',
          },
          {
            minQty: 3,
            maxQty: 9,
            unitPriceCents: 109000,
            discountLabel: 'Office Fleet (-8%)',
          },
          {
            minQty: 10,
            maxQty: null,
            unitPriceCents: 99500,
            discountLabel: 'Distributor (-16%)',
          },
        ],
        variants: [
          {
            title: 'Matte Black / Brushed Steel (EU 230V)',
            sku: 'ESP-NOC-204-EU',
            priceCents: 119000,
            stockQuantity: 18,
            optionsJson: JSON.stringify({ Region: 'EU 230V' }),
          },
        ],
      },
      {
        title: 'Nordic Smoked Oak & Bouclé Lounge Chair',
        subtitle: 'Solid kiln-dried European oak with removable wool cushions',
        handle: 'nordic-smoked-oak-boucle-chair',
        status: 'published',
        shortDescription:
          'Low-slung Scandinavian lounge chair combining mortise-and-tenon smoked oak joinery with heavyweight Belgian bouclé.',
        longDescription:
          'Built for longevity in high-traffic lounges and private residences, each frame is milled from FSC-certified European oak finished in matte hardwax oil.\n\nHighlights:\n- Stain-resistant heavyweight cream bouclé upholstery\n- Solid brass concealed cushion fasteners\n- 10-year structural frame warranty',
        thumbnailUrl:
          '/src/assets/images/product_oak_chair_1795418708504.jpg',
        category: 'Furniture',
        collectionName: 'Nordic Atelier',
        sku: 'CHR-OAK-310',
        barcode: '5941000003100',
        basePriceCents: 74000,
        compareAtPriceCents: null,
        currency: 'EUR',
        taxRatePercent: 19,
        stockQuantity: 12,
        reservedQuantity: 0,
        lowStockThreshold: 4,
        manageInventory: true,
        allowBackorder: false,
        minOrderQty: 1,
        maxOrderQty: 24,
        stepQty: 1,
        weightGrams: 16500,
        seoTitle:
          'Nordic Smoked Oak Lounge Chair | Belgian Bouclé Upholstery',
        seoDescription:
          'Scandinavian solid smoked oak lounge chair upholstered in cream Belgian bouclé. Tiered pricing available for trade orders.',
        seoKeywords: 'oak lounge chair, boucle armchair, scandinavian furniture',
        canonicalUrl:
          'https://store.example.com/products/nordic-smoked-oak-boucle-chair',
        ogImageUrl: '/src/assets/images/product_oak_chair_1795418708504.jpg',
        noIndex: false,
        metadataJson: JSON.stringify({
          wood_species: 'European Smoked Oak',
          fabric_martindale: 85000,
        }),
        galleryImages: [
          {
            url: '/src/assets/images/product_oak_chair_1795418708504.jpg',
            altText: 'Nordic smoked oak chair profile view',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
        priceTiers: [
          {
            minQty: 1,
            maxQty: 3,
            unitPriceCents: 74000,
            discountLabel: 'Retail',
          },
          {
            minQty: 4,
            maxQty: 11,
            unitPriceCents: 66500,
            discountLabel: 'Trade 4+ (-10%)',
          },
          {
            minQty: 12,
            maxQty: null,
            unitPriceCents: 59900,
            discountLabel: 'Contract 12+ (-19%)',
          },
        ],
        variants: [
          {
            title: 'Smoked Oak / Cream Bouclé',
            sku: 'CHR-OAK-310-CR',
            priceCents: 74000,
            stockQuantity: 12,
            optionsJson: JSON.stringify({ Upholstery: 'Cream Bouclé' }),
          },
        ],
      },
      {
        title: 'Monolith Anodized Acoustic Speaker',
        subtitle: 'CNC-milled aluminum enclosure with solid walnut top dial',
        handle: 'monolith-anodized-acoustic-speaker',
        status: 'draft',
        shortDescription:
          '360-degree omnidirectional Wi-Fi and AirPlay 2 desktop speaker crafted from bead-blasted aluminum and oiled walnut.',
        longDescription:
          'Engineered with a custom 4-inch neodymium woofer and silk-dome tweeter array inside a rigid CNC-machined acoustic cylinder.\n\nConnectivity:\n- AirPlay 2, Spotify Connect, Bluetooth 5.3, USB-C DAC\n- Capacitive touch walnut crown with tactile volume ring',
        thumbnailUrl:
          '/src/assets/images/product_audio_speaker_1795418708462.jpg',
        category: 'Audio',
        collectionName: 'Acoustic Reference',
        sku: 'AUD-MON-501',
        barcode: '5941000005012',
        basePriceCents: 42000,
        compareAtPriceCents: 48000,
        currency: 'EUR',
        taxRatePercent: 19,
        stockQuantity: 85,
        reservedQuantity: 5,
        lowStockThreshold: 15,
        manageInventory: true,
        allowBackorder: false,
        minOrderQty: 5,
        maxOrderQty: 250,
        stepQty: 5,
        weightGrams: 2450,
        seoTitle: 'Monolith Anodized Speaker | CNC Aluminum & Walnut Audio',
        seoDescription:
          'Omnidirectional Wi-Fi desktop speaker in CNC anodized aluminum and oiled walnut. B2B bulk packs in multiples of 5 units.',
        seoKeywords: 'wireless speaker, walnut speaker, aluminum audio',
        canonicalUrl:
          'https://store.example.com/products/monolith-anodized-acoustic-speaker',
        ogImageUrl:
          '/src/assets/images/product_audio_speaker_1795418708462.jpg',
        noIndex: false,
        metadataJson: JSON.stringify({
          drivers: '4" Woofer + Dual Tweeter',
          wireless: 'Wi-Fi 6 / BT 5.3 / AirPlay 2',
        }),
        galleryImages: [
          {
            url: '/src/assets/images/product_audio_speaker_1795418708462.jpg',
            altText: 'Monolith speaker walnut top view',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
        priceTiers: [
          {
            minQty: 5,
            maxQty: 20,
            unitPriceCents: 42000,
            discountLabel: 'Pack 5–20',
          },
          {
            minQty: 25,
            maxQty: 95,
            unitPriceCents: 37500,
            discountLabel: 'Dealer (-11%)',
          },
          {
            minQty: 100,
            maxQty: null,
            unitPriceCents: 33900,
            discountLabel: 'Wholesale 100+ (-19%)',
          },
        ],
        variants: [
          {
            title: 'Space Gray / American Walnut',
            sku: 'AUD-MON-501-WN',
            priceCents: 42000,
            stockQuantity: 85,
            optionsJson: JSON.stringify({ Trim: 'American Walnut' }),
          },
        ],
      },
    ];

    for (const item of demoCatalog) {
      await createProduct(item);
    }
    return true;
  } catch (error) {
    console.error('Failed to seed demo products:', error);
    throw new Error('Failed to initialize catalog seed.', { cause: error });
  }
}
