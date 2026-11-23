import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { PRODUCT_EXTENDED_MODULE } from '../modules/product-extended';
import type ProductExtendedModuleService from '../modules/product-extended/service';

export interface UpsertProductExtendedInput {
  product_id: string;
  short_description: string;
  long_description: string;
  min_order_qty: number;
  max_order_qty: number | null;
  step_qty: number;
  low_stock_threshold: number;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  canonical_url: string;
  og_image_url: string;
  no_index: boolean;
  gallery_images: Array<{
    url: string;
    alt_text: string;
    sort_order: number;
    is_primary: boolean;
  }>;
  price_tiers: Array<{
    min_qty: number;
    max_qty: number | null;
    unit_price_cents: number;
    discount_label: string;
  }>;
}

const upsertExtensionStep = createStep(
  'upsert-product-extension-step',
  async (input: UpsertProductExtendedInput, { container }) => {
    const service = container.resolve<ProductExtendedModuleService>(
      PRODUCT_EXTENDED_MODULE
    );
    const link = container.resolve(ContainerRegistrationKeys.LINK);

    const ext = await service.createProductExtensions({
      short_description: input.short_description,
      long_description: input.long_description,
      min_order_qty: input.min_order_qty,
      max_order_qty: input.max_order_qty,
      step_qty: input.step_qty,
      low_stock_threshold: input.low_stock_threshold,
      seo_title: input.seo_title,
      seo_description: input.seo_description,
      seo_keywords: input.seo_keywords,
      canonical_url: input.canonical_url,
      og_image_url: input.og_image_url,
      no_index: input.no_index,
    });

    if (input.gallery_images.length > 0) {
      await service.createGalleryImages(
        input.gallery_images.map((img) => ({
          ...img,
          product_extension_id: ext.id,
        }))
      );
    }

    if (input.price_tiers.length > 0) {
      await service.createPriceTiers(
        input.price_tiers.map((tier) => ({
          ...tier,
          product_extension_id: ext.id,
        }))
      );
    }

    await link.create({
      [Modules.PRODUCT]: { product_id: input.product_id },
      [PRODUCT_EXTENDED_MODULE]: { product_extension_id: ext.id },
    });

    return new StepResponse(ext, { extensionId: ext.id, productId: input.product_id });
  },
  async (compensation, { container }) => {
    if (!compensation) return;
    const service = container.resolve<ProductExtendedModuleService>(
      PRODUCT_EXTENDED_MODULE
    );
    await service.deleteProductExtensions(compensation.extensionId);
  }
);

export const upsertProductExtendedWorkflow = createWorkflow(
  'upsert-product-extended',
  (input: UpsertProductExtendedInput) => {
    const extension = upsertExtensionStep(input);
    return new WorkflowResponse(extension);
  }
);
