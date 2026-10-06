import type { Row } from './csv'

export type RowStatus = 'missing' | 'same' | 'translated'

export function rowStatus(row: Row): RowStatus {
  if (row.translation.trim() === '') return 'missing'
  if (row.translation === row.source) return 'same'
  return 'translated'
}

export const STATUS_LABEL: Record<RowStatus, string> = {
  missing: 'Missing',
  same: 'Same as source',
  translated: 'Translated',
}

/** Human-friendly names for Shopify resource types. Unknown types fall back to a title-cased version. */
const TYPE_LABEL: Record<string, string> = {
  ONLINE_STORE_THEME: 'Theme',
  ONLINE_STORE_THEME_LOCALE_CONTENT: 'Theme locale content',
  ONLINE_STORE_THEME_SECTION_GROUP: 'Theme section groups',
  ONLINE_STORE_THEME_JSON_TEMPLATE: 'Theme templates',
  ONLINE_STORE_THEME_SETTINGS_CATEGORY: 'Theme settings',
  ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS: 'Theme settings sections',
  ONLINE_STORE_THEME_APP_EMBED: 'Theme app embeds',
  ONLINE_STORE_ARTICLE: 'Blog posts',
  ONLINE_STORE_BLOG: 'Blogs',
  ONLINE_STORE_PAGE: 'Pages',
  PRODUCT: 'Products',
  PRODUCT_OPTION: 'Product options',
  PRODUCT_OPTION_VALUE: 'Product option values',
  COLLECTION: 'Collections',
  METAFIELD: 'Metafields',
  METAOBJECT: 'Metaobjects',
  MENU: 'Menus',
  LINK: 'Menu links',
  SHOP: 'Shop',
  SHOP_POLICY: 'Policies',
  EMAIL_TEMPLATE: 'Email templates',
  PACKING_SLIP_TEMPLATE: 'Packing slips',
  DELIVERY_METHOD_DEFINITION: 'Delivery methods',
  PAYMENT_GATEWAY: 'Payment gateways',
  SELLING_PLAN: 'Selling plans',
  SELLING_PLAN_GROUP: 'Selling plan groups',
  FILTER: 'Filters',
}

export function typeLabel(type: string): string {
  if (TYPE_LABEL[type]) return TYPE_LABEL[type]
  const words = type.toLowerCase().split('_').join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
