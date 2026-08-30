export interface TemplateVariables {
  productTitle?: string;
  shopName?: string;
  price?: string;
  vendor?: string;
  collectionTitle?: string;
}

export function renderMetaTemplate(template: string, vars: TemplateVariables): string {
  let rendered = template;
  rendered = rendered.replace(/\{product_title\}/g, vars.productTitle || "Product");
  rendered = rendered.replace(/\{shop_name\}/g, vars.shopName || "Store");
  rendered = rendered.replace(/\{price\}/g, vars.price || "");
  rendered = rendered.replace(/\{vendor\}/g, vars.vendor || "");
  rendered = rendered.replace(/\{collection_title\}/g, vars.collectionTitle || "Collection");
  return rendered.trim();
}
