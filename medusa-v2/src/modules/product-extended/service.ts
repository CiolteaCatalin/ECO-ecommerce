import { MedusaService } from '@medusajs/framework/utils';
import ProductExtension from './models/product-extension';
import GalleryImage from './models/gallery-image';
import PriceTier from './models/price-tier';

class ProductExtendedModuleService extends MedusaService({
  ProductExtension,
  GalleryImage,
  PriceTier,
}) {
  async validateOrderQuantity(extensionId: string, requestedQty: number) {
    const ext = await this.retrieveProductExtension(extensionId);
    const min = Math.max(1, ext.min_order_qty);
    const step = Math.max(1, ext.step_qty);
    const max = ext.max_order_qty;

    const validMin = requestedQty >= min;
    const validMax = max === null || requestedQty <= max;
    const validStep = (requestedQty - min) % step === 0;

    return {
      valid: validMin && validMax && validStep,
      min_order_qty: min,
      max_order_qty: max,
      step_qty: step,
    };
  }

  async resolveTierPrice(
    extensionId: string,
    requestedQty: number,
    basePriceCents: number
  ) {
    const tiers = await this.listPriceTiers({
      product_extension_id: extensionId,
    });

    const matched = [...tiers]
      .sort((a, b) => b.min_qty - a.min_qty)
      .find(
        (t) =>
          requestedQty >= t.min_qty &&
          (t.max_qty === null || requestedQty <= t.max_qty)
      );

    return {
      unit_price_cents: matched ? matched.unit_price_cents : basePriceCents,
      applied_tier: matched ?? null,
    };
  }
}

export default ProductExtendedModuleService;
