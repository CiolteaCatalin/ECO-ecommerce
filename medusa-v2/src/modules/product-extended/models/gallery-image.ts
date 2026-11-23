import { model } from '@medusajs/framework/utils';
import ProductExtension from './product-extension';

const GalleryImage = model.define('product_gallery_image', {
  id: model.id().primaryKey(),
  url: model.text(),
  alt_text: model.text().default(''),
  sort_order: model.number().default(0),
  is_primary: model.boolean().default(false),
  product_extension: model.belongsTo(() => ProductExtension, {
    mappedBy: 'gallery_images',
  }),
});

export default GalleryImage;
