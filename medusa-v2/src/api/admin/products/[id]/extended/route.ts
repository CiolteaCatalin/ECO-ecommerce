import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { upsertProductExtendedWorkflow } from '../../../../../workflows/upsert-product-extended';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  const { data } = await query.graph({
    entity: 'product',
    fields: ['id', 'title', 'handle', 'product_extension.*'],
    filters: { id },
  });

  res.json({ product: data[0] ?? null });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const body = req.body as Record<string, any>;

  const { result } = await upsertProductExtendedWorkflow(req.scope).run({
    input: {
      product_id: id,
      short_description: body.short_description ?? '',
      long_description: body.long_description ?? '',
      min_order_qty: Number(body.min_order_qty ?? 1),
      max_order_qty:
        body.max_order_qty === null || body.max_order_qty === undefined
          ? null
          : Number(body.max_order_qty),
      step_qty: Number(body.step_qty ?? 1),
      low_stock_threshold: Number(body.low_stock_threshold ?? 5),
      seo_title: body.seo_title ?? '',
      seo_description: body.seo_description ?? '',
      seo_keywords: body.seo_keywords ?? '',
      canonical_url: body.canonical_url ?? '',
      og_image_url: body.og_image_url ?? '',
      no_index: Boolean(body.no_index),
      gallery_images: Array.isArray(body.gallery_images)
        ? body.gallery_images
        : [],
      price_tiers: Array.isArray(body.price_tiers) ? body.price_tiers : [],
    },
  });

  res.status(200).json({ product_extension: result });
}
