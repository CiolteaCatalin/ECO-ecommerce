import { model } from '@medusajs/framework/utils';
import ProductExtension from './product-extension';

const PriceTier = model.define('product_price_tier', {
  id: model.id().primaryKey(),
  min_qty: model.number(),
  max_qty: model.number().nullable(),
  unit_price_cents: model.number(),
  discount_label: model.text().default(''),
  product_extension: model.belongsTo(() => ProductExtension, {
    mappedBy: 'price_tiers',
  }),
});

export default PriceTier;
