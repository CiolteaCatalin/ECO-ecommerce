import { model } from '@medusajs/framework/utils';
import GalleryImage from './gallery-image';
import PriceTier from './price-tier';

const ProductExtension = model.define('product_extension', {
  id: model.id().primaryKey(),
  short_description: model.text().default(''),
  long_description: model.text().default(''),
  price_on_request: model.boolean().default(false),
  min_order_qty: model.number().default(1),
  max_order_qty: model.number().nullable(),
  step_qty: model.number().default(1),
  low_stock_threshold: model.number().default(5),
  seo_title: model.text().default(''),
  seo_description: model.text().default(''),
  seo_keywords: model.text().default(''),
  canonical_url: model.text().default(''),
  og_image_url: model.text().default(''),
  no_index: model.boolean().default(false),
  gallery_images: model.hasMany(() => GalleryImage, {
    mappedBy: 'product_extension',
  }),
  price_tiers: model.hasMany(() => PriceTier, {
    mappedBy: 'product_extension',
  }),
});

export default ProductExtension;
