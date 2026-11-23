import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { PRODUCT_EXTENDED_MODULE } from '../../../../../modules/product-extended';
import type ProductExtendedModuleService from '../../../../../modules/product-extended/service';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const service = req.scope.resolve<ProductExtendedModuleService>(
    PRODUCT_EXTENDED_MODULE
  );
  const { id } = req.params;
  const requestedQty = Number(req.query.qty ?? 1);

  const { data } = await query.graph({
    entity: 'product',
    fields: [
      'id',
      'title',
      'handle',
      'product_extension.*',
      'product_extension.gallery_images.*',
      'product_extension.price_tiers.*',
    ],
    filters: { id },
  });

  const product = data[0];
  if (!product?.product_extension) {
    return res.status(404).json({ message: 'Extended product not found' });
  }

  const quantityCheck = await service.validateOrderQuantity(
    product.product_extension.id,
    requestedQty
  );

  res.json({
    product,
    quantity_check: quantityCheck,
  });
}
