export type NavSectionId =
  | 'dashboard'
  | 'produse'
  | 'comenzi'
  | 'clienti'
  | 'marketing'
  | 'media'
  | 'pagini'
  | 'blog'
  | 'setari';

export interface NavSubpageDef {
  id: string;
  label: string;
}

export interface NavItemDef {
  id: NavSectionId;
  label: string;
  subtitle: string;
  subpages?: NavSubpageDef[];
}

export const NAV_ITEMS: NavItemDef[] = [
  {
    id: 'dashboard',
    label: 'Panou de control',
    subtitle: 'Rezumat rapid comenzi, produse, cereri ofertă și pagini',
  },
  {
    id: 'produse',
    label: 'Produse',
    subtitle: 'Catalog complet, branduri, categorii, etichete, atribute și import/export',
    subpages: [
      { id: 'toate', label: 'Toate produsele' },
      { id: 'adauga', label: 'Adaugă produs nou' },
      { id: 'pret-cerere', label: 'Preț la cerere' },
      { id: 'branduri', label: 'Branduri' },
      { id: 'categorii', label: 'Categorii' },
      { id: 'etichete', label: 'Etichete' },
      { id: 'atribute', label: 'Atribute' },
      { id: 'import-export', label: 'Import / Export' },
    ],
  },
  {
    id: 'comenzi',
    label: 'Comenzi',
    subtitle: 'Comenzi, generare AWB FAN/Sameday, facturare SmartBill și cereri ofertă',
    subpages: [
      { id: 'all', label: 'Toate comenzile' },
      { id: 'pending', label: 'În așteptare' },
      { id: 'processing', label: 'În procesare' },
      { id: 'processed', label: 'Procesate' },
      { id: 'returned', label: 'Retururi' },
      { id: 'quotes', label: 'Cereri ofertă' },
    ],
  },
  {
    id: 'clienti',
    label: 'Clienți',
    subtitle: 'Clienți înregistrați, newsletter și coșuri abandonate',
    subpages: [
      { id: 'toti', label: 'Toți clienții' },
      { id: 'recurenti', label: 'Clienți recurenți' },
      { id: 'newsletter', label: 'Abonați newsletter' },
      { id: 'cosuri-abandonate', label: 'Coșuri abandonate' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing & Reduceri',
    subtitle: 'Coduri de reducere, pachete combo și reguli automate de coș',
    subpages: [
      { id: 'cupoane', label: 'Coduri de reducere' },
      { id: 'reguli-cos', label: 'Reguli coș & pachete' },
    ],
  },
  {
    id: 'media',
    label: 'Media & WebP',
    subtitle: 'Încărcare imagini, linkuri interne directe și conversie la WebP la cerere',
  },
  {
    id: 'pagini',
    label: 'Pagini & SEO',
    subtitle: 'Pagini create din cod HTML/CSS, SEO per pagină, meniuri și redirecturi 301',
    subpages: [
      { id: 'pagini-cod', label: 'Pagini cod & SEO' },
      { id: 'meniuri', label: 'Meniuri navigare' },
      { id: 'bannere', label: 'Bannere' },
      { id: 'redirecturi', label: 'Redirecturi 301' },
    ],
  },
  {
    id: 'blog',
    label: 'Blog',
    subtitle: 'Articole editoriale și optimizare SEO pentru blog',
  },
  {
    id: 'setari',
    label: 'Setări & Integrări',
    subtitle: 'FAN Courier API, Sameday API, SmartBill API, setări generale și Medusa v2',
    subpages: [
      { id: 'setari-hub', label: 'Panou setări' },
      { id: 'setari-fancourier', label: 'FAN Courier API' },
      { id: 'setari-sameday', label: 'Sameday Courier API' },
      { id: 'setari-smartbill', label: 'SmartBill API' },
      { id: 'setari-generale', label: 'Setări generale' },
      { id: 'setari-seo', label: 'Setări SEO globale' },
      { id: 'setari-api-webhook', label: 'Store API & Medusa v2' },
    ],
  },
];

export interface SimpleSettingCardDef {
  id: string;
  title: string;
  description: string;
  mode: 'form' | 'module' | 'api-blueprint' | 'integration';
  key: string;
}

export const SIMPLE_SETTINGS_CARDS: SimpleSettingCardDef[] = [
  {
    id: 'setari-fancourier',
    title: 'FAN Courier API v2.0',
    description: 'Client ID selfAWB, username, parolă, serviciu implicit, testare live și generare AWB PDF.',
    mode: 'integration',
    key: 'fancourier',
  },
  {
    id: 'setari-sameday',
    title: 'Sameday Courier API',
    description: 'Mediu Sandbox/Producție, autentificare X-AUTH, preluare Pickup Points / servicii și AWB.',
    mode: 'integration',
    key: 'sameday',
  },
  {
    id: 'setari-smartbill',
    title: 'SmartBill Cloud API (V1 & V3)',
    description: 'Email, Token API V1/V3, CIF firmă, serii facturi/proforme, cote TVA și emitere automată.',
    mode: 'integration',
    key: 'smartbill',
  },
  {
    id: 'setari-generale',
    title: 'Setări generale magazin',
    description: 'Nume magazin, date firmă (CUI), email suport, telefon și social media.',
    mode: 'form',
    key: 'general',
  },
  {
    id: 'setari-seo',
    title: 'Setări SEO globale',
    description: 'Sufix titlu SEO, robots.txt și reguli automate sitemap.xml.',
    mode: 'form',
    key: 'seo_global',
  },
  {
    id: 'setari-domenii-ssl',
    title: 'Domeniu & Brand',
    description: 'Domeniu principal, SSL și culori / logo pentru storefront.',
    mode: 'form',
    key: 'domains_ssl',
  },
  {
    id: 'setari-checkout',
    title: 'Checkout & Comenzi',
    description: 'Prefix comenzi, câmpuri firmă B2B și opțiuni de rezervare coș.',
    mode: 'form',
    key: 'checkout',
  },
  {
    id: 'setari-livrare',
    title: 'Metode de livrare',
    description: 'Curieri activi (FAN Courier, Sameday) și praguri transport gratuit.',
    mode: 'module',
    key: 'shipping_methods',
  },
  {
    id: 'setari-taxe',
    title: 'Taxe & TVA',
    description: 'Cote de TVA și reguli de aplicare pentru România / UE.',
    mode: 'module',
    key: 'tax_rules',
  },
  {
    id: 'setari-api-webhook',
    title: 'Store API & Medusa v2',
    description: 'Inspector răspuns API storefront (inclusiv Preț la cerere) și fișiere Medusa v2.',
    mode: 'api-blueprint',
    key: 'api_keys',
  },
];
