export type MenuCategoryId =
  | 'comenzi'
  | 'clienti'
  | 'catalog'
  | 'inventar'
  | 'website'
  | 'blog'
  | 'marketing'
  | 'rapoarte'
  | 'setari';

export interface SubPageDef {
  id: string;
  label: string;
  description?: string;
  badgeKey?: 'pendingOrders';
}

export interface MenuCategoryDef {
  id: MenuCategoryId;
  label: string;
  items: SubPageDef[];
}

export const MENU_CATEGORIES: MenuCategoryDef[] = [
  {
    id: 'comenzi',
    label: 'Comenzi',
    items: [
      { id: 'comenzi-asteptare', label: 'Comenzi în așteptare', badgeKey: 'pendingOrders' },
      { id: 'comenzi-procesare', label: 'Comenzi în procesare' },
      { id: 'comenzi-procesate', label: 'Comenzi procesate' },
      { id: 'borderou-expedieri', label: 'Borderou expedieri' },
      { id: 'feeduri-comenzi', label: 'Feed-uri de comenzi' },
      { id: 'comenzi-retur', label: 'Comenzi de retur' },
      { id: 'cereri-retur', label: 'Cereri retur' },
    ],
  },
  {
    id: 'clienti',
    label: 'Clienți',
    items: [
      { id: 'clienti-lista', label: 'Clienți' },
      { id: 'istoric-autentificari', label: 'Istoric autentificări' },
      { id: 'grupuri-clienti', label: 'Grupuri de clienți' },
      { id: 'cosuri-abandonate', label: 'Coșuri abandonate' },
      { id: 'abonati-newsletter', label: 'Abonați newsletter' },
      { id: 'reguli-blacklist', label: 'Reguli Blacklist' },
      { id: 'marturii-clienti', label: 'Mărturii clienți' },
      { id: 'feeduri-clienti', label: 'Feed-uri de clienți' },
      { id: 'solicitari-feedback', label: 'Solicitări feedback' },
      { id: 'feedback-clienti', label: 'Feedback clienți' },
      { id: 'mesaje-contact', label: 'Mesaje contact' },
      { id: 'emailuri-trimise', label: 'Emailuri trimise' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    items: [
      { id: 'catalog-general', label: 'Catalog' },
      { id: 'produse', label: 'Produse' },
      { id: 'continut-asteptare', label: 'Conținut în așteptare' },
      { id: 'imagini-produse', label: 'Imagini produse' },
      { id: 'importa-produse', label: 'Importă produse' },
      { id: 'importa-inventar', label: 'Importă Inventar' },
      { id: 'exporta-produse', label: 'Exportă produse' },
      { id: 'categorii', label: 'Categorii' },
      { id: 'taguri-catalog', label: 'Taguri' },
      { id: 'atribute', label: 'Atribute' },
      { id: 'branduri', label: 'Branduri' },
      { id: 'produse-favorite', label: 'Produse favorite' },
      { id: 'sellers', label: 'Sellers' },
    ],
  },
  {
    id: 'inventar',
    label: 'Inventar',
    items: [
      { id: 'administrare-stocuri', label: 'Administrare stocuri' },
      { id: 'administrare-preturi', label: 'Administrare prețuri' },
      { id: 'coduri-produse', label: 'Coduri produse' },
      { id: 'istoric-stoc', label: 'Istoric modificări stoc' },
      { id: 'istoric-pret', label: 'Istoric modificări preț' },
    ],
  },
  {
    id: 'website',
    label: 'Website',
    items: [
      { id: 'bannere', label: 'Bannere' },
      { id: 'pagini-site', label: 'Pagini site' },
      { id: 'scripturi-custom', label: 'Scripturi custom' },
      { id: 'meniuri-navigare', label: 'Meniuri navigare' },
      { id: 'manager-fisiere', label: 'Manager fișiere' },
      { id: 'formulare-custom', label: 'Formulare custom' },
      { id: 'mesaje-formulare', label: 'Mesaje formulare' },
      { id: 'design-tema', label: 'Design & Temă' },
      { id: 'elemente-editabile', label: 'Elemente editabile' },
      { id: 'localizare-website', label: 'Localizare conținut' },
      { id: 'recenzii', label: 'Recenzii' },
    ],
  },
  {
    id: 'blog',
    label: 'Blog',
    items: [
      { id: 'categorii-blog', label: 'Categorii blog' },
      { id: 'articole', label: 'Articole' },
      { id: 'comentarii-blog', label: 'Comentarii blog' },
      { id: 'linkuri-blog', label: 'Linkuri blog' },
      { id: 'taguri-blog', label: 'Taguri' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      { id: 'reguli-pret-dinamic', label: 'Reguli preț dinamic' },
      { id: 'reguli-produse-combo', label: 'Reguli produse combo' },
      { id: 'reguli-discount-cart', label: 'Reguli discount cart' },
      { id: 'cupoane-reducere', label: 'Cupoane de reducere' },
    ],
  },
  {
    id: 'rapoarte',
    label: 'Rapoarte',
    items: [
      { id: 'analiza-trafic', label: 'Analiză trafic' },
      { id: 'situatie-inventar', label: 'Situație inventar' },
      { id: 'activitate-utilizatori', label: 'Activitate utilizatori' },
      { id: 'loguri-activitate', label: 'Loguri activitate' },
      { id: 'sms-uri-trimise', label: 'SMS-uri trimise' },
      { id: 'callback-uri-plata', label: 'Callback-uri plată' },
    ],
  },
  {
    id: 'setari',
    label: 'Setări',
    items: [
      { id: 'setari-hub', label: 'Toate setările' },
      { id: 'setari-domenii-ssl', label: 'Domenii & SSL' },
      { id: 'setari-generale', label: 'Setări generale' },
      { id: 'setari-brand', label: 'Setări brand magazin' },
      { id: 'setari-afisare', label: 'Setări afișare' },
      { id: 'setari-localizare', label: 'Localizare conținut' },
      { id: 'setari-acces-securitate', label: 'Control acces și securitate' },
      { id: 'setari-cos', label: 'Coș de cumpărături' },
      { id: 'setari-checkout', label: 'Checkout' },
      { id: 'setari-comenzi', label: 'Setări comenzi' },
      { id: 'setari-statusuri-comenzi', label: 'Statusuri comenzi' },
      { id: 'setari-taxe', label: 'Taxe' },
      { id: 'setari-livrare', label: 'Livrare' },
      { id: 'setari-catalog', label: 'Setări catalog' },
      { id: 'setari-unitati-masura', label: 'Unități de măsură' },
      { id: 'setari-inventar', label: 'Setări inventar' },
      { id: 'setari-campuri-aditionale', label: 'Câmpuri adiționale' },
      { id: 'setari-cautare', label: 'Setări căutare' },
      { id: 'setari-cookies', label: 'Confidențialitate & Cookies' },
      { id: 'setari-seo', label: 'Setări SEO' },
      { id: 'setari-notificari', label: 'Setări notificări' },
      { id: 'setari-sluguri', label: 'Slug-uri' },
      { id: 'setari-redirecturi', label: 'Redirecturi pagini' },
      { id: 'setari-template-mesaje', label: 'Template mesaje' },
      { id: 'setari-smtp', label: 'Setări server email' },
      { id: 'setari-aplicatii', label: 'Aplicații' },
      { id: 'setari-utilizatori', label: 'Utilizatori & Permisiuni' },
      { id: 'setari-api-webhook', label: 'API și webhook-uri' },
      { id: 'setari-import-migrare', label: 'Import și migrare' },
      { id: 'setari-feeduri-comenzi', label: 'Feed-uri de comenzi' },
      { id: 'setari-feeduri-clienti', label: 'Feed-uri de clienți' },
      { id: 'setari-feeduri-produse', label: 'Feed-uri de produse' },
    ],
  },
];

export interface SettingGroupDef {
  title: string;
  subtitle: string;
  items: Array<{
    id: string;
    title: string;
    description: string;
    mode: 'form' | 'module' | 'api-blueprint';
    key: string;
  }>;
}

export const SETTINGS_GROUPS: SettingGroupDef[] = [
  {
    title: 'Configurare magazin și securitate',
    subtitle: 'Identitatea magazinului, domeniile, experiența de cumpărare, disponibilitatea și securitatea site-ului.',
    items: [
      {
        id: 'setari-domenii-ssl',
        title: 'Domenii & SSL',
        description: 'Setează domeniul pe care vrei să funcționeze magazinul și certificatul SSL.',
        mode: 'form',
        key: 'domains_ssl',
      },
      {
        id: 'setari-generale',
        title: 'Setări generale',
        description: 'Controlează informațiile generale ale magazinului tău: date contact, social media și alte informații esențiale.',
        mode: 'form',
        key: 'general',
      },
      {
        id: 'setari-brand',
        title: 'Setări brand magazin',
        description: 'Adaugă numele magazinului, încarcă logo-ul și faviconul și setează preferințele de afișare.',
        mode: 'form',
        key: 'brand',
      },
      {
        id: 'setari-afisare',
        title: 'Setări afișare',
        description: 'Definește preferințele de afișare pentru principalele pagini din magazin.',
        mode: 'form',
        key: 'display',
      },
      {
        id: 'setari-localizare',
        title: 'Localizare conținut',
        description: 'Setează limbile suplimentare în care vrei să fie disponibil magazinul.',
        mode: 'form',
        key: 'localization',
      },
      {
        id: 'setari-acces-securitate',
        title: 'Control acces și securitate',
        description: 'Configurează disponibilitatea magazinului, restricțiile de acces și protecția traficului.',
        mode: 'form',
        key: 'access_security',
      },
    ],
  },
  {
    title: 'Comenzi și checkout',
    subtitle: 'Tot ce se întâmplă între coș, plată, livrare și procesarea comenzilor.',
    items: [
      {
        id: 'setari-cos',
        title: 'Coș de cumpărături',
        description: 'Personalizează modul de funcționare și setările coșului de cumpărături din magazin.',
        mode: 'form',
        key: 'cart',
      },
      {
        id: 'setari-checkout',
        title: 'Checkout',
        description: 'Alege tipul de checkout utilizat în magazin și setările pentru pagina de comandă.',
        mode: 'form',
        key: 'checkout',
      },
      {
        id: 'setari-comenzi',
        title: 'Setări comenzi',
        description: 'Configurează setările pentru înregistrarea și procesarea comenzilor.',
        mode: 'form',
        key: 'orders_config',
      },
      {
        id: 'setari-statusuri-comenzi',
        title: 'Statusuri comenzi',
        description: 'Configurează statusurile pentru înregistrarea și procesarea comenzilor.',
        mode: 'module',
        key: 'order_statuses',
      },
      {
        id: 'setari-taxe',
        title: 'Taxe',
        description: 'Configurează taxele utilizate în magazin și modul în care sunt aplicate.',
        mode: 'module',
        key: 'tax_rules',
      },
      {
        id: 'setari-livrare',
        title: 'Livrare',
        description: 'Activează și administrează metodele de livrare folosite de magazinul tău.',
        mode: 'module',
        key: 'shipping_methods',
      },
    ],
  },
  {
    title: 'Catalog și inventar',
    subtitle: 'Preferințe globale pentru produse, stoc, unități de măsură și căutare.',
    items: [
      {
        id: 'setari-catalog',
        title: 'Setări catalog',
        description: 'Administrează setările globale aplicabile catalogului tău de produse.',
        mode: 'form',
        key: 'catalog_config',
      },
      {
        id: 'setari-unitati-masura',
        title: 'Unități de măsură',
        description: 'Administrează unitățile de măsură.',
        mode: 'module',
        key: 'measurement_units',
      },
      {
        id: 'setari-inventar',
        title: 'Setări inventar',
        description: 'Definește preferințele cu privire la gestiunea stocurilor și a inventarului.',
        mode: 'form',
        key: 'inventory_config',
      },
      {
        id: 'setari-campuri-aditionale',
        title: 'Câmpuri adiționale',
        description: 'Gestionează câmpurile adiționale pentru produse, categorii, clienți, comenzi și alte entități.',
        mode: 'module',
        key: 'custom_fields',
      },
      {
        id: 'setari-cautare',
        title: 'Setări căutare',
        description: 'Configurează modul în care funcționează căutarea în magazin.',
        mode: 'form',
        key: 'search_config',
      },
    ],
  },
  {
    title: 'Comunicare și conformitate',
    subtitle: 'Notificări, mesaje, vizibilitate în căutare și protecția datelor.',
    items: [
      {
        id: 'setari-cookies',
        title: 'Confidențialitate & Cookies',
        description: 'Configurează setările pentru utilizarea de cookies și protecția datelor personale.',
        mode: 'form',
        key: 'privacy_cookies',
      },
      {
        id: 'setari-seo',
        title: 'Setări SEO',
        description: 'Administrează setările SEO asociate magazinului tău.',
        mode: 'form',
        key: 'seo_global',
      },
      {
        id: 'setari-notificari',
        title: 'Setări notificări',
        description: 'Administrează notificările email și SMS trimise către clienți și către staff-ul magazinului.',
        mode: 'form',
        key: 'notifications',
      },
      {
        id: 'setari-sluguri',
        title: 'Slug-uri',
        description: 'Configurează structura slug-urilor pentru produse, categorii și pagini.',
        mode: 'form',
        key: 'slug_rules',
      },
      {
        id: 'setari-redirecturi',
        title: 'Redirecturi pagini',
        description: 'Adaugă sau importă redirecturi 301 pentru paginile mutate sau șterse.',
        mode: 'module',
        key: 'redirects_301',
      },
      {
        id: 'setari-template-mesaje',
        title: 'Template mesaje',
        description: 'Administrează template-urile de email/SMS trimise clienților din magazin în diferite situații.',
        mode: 'module',
        key: 'message_templates',
      },
      {
        id: 'setari-smtp',
        title: 'Setări server email',
        description: 'Configurează serverul de email SMTP pentru a activa transmiterea de pe propriul server de mail.',
        mode: 'form',
        key: 'smtp_server',
      },
    ],
  },
  {
    title: 'Administrare și integrări',
    subtitle: 'Gestionează echipa, aplicațiile, accesul API și instrumentele pentru importul sau mutarea datelor magazinului.',
    items: [
      {
        id: 'setari-aplicatii',
        title: 'Aplicații',
        description: 'Instalează aplicațiile potrivite magazinului tău și administrează-le.',
        mode: 'module',
        key: 'installed_apps',
      },
      {
        id: 'setari-utilizatori',
        title: 'Utilizatori & Permisiuni',
        description: 'Creează și gestionează utilizatori cu diferite roluri și permisiuni de acces la panoul de control.',
        mode: 'module',
        key: 'staff_roles',
      },
      {
        id: 'setari-api-webhook',
        title: 'API și webhook-uri',
        description: 'Generează chei API, administrează webhook-uri, testează Store API și exportă modulele Medusa v2.',
        mode: 'api-blueprint',
        key: 'api_keys',
      },
      {
        id: 'setari-import-migrare',
        title: 'Import și migrare',
        description: 'Mută date dintr-o altă platformă sau importă din fișiere anumite date ale magazinului.',
        mode: 'form',
        key: 'import_migration',
      },
    ],
  },
  {
    title: 'Feed-uri',
    subtitle: 'Trimite comenzile, clienții, facturile, review-urile și produsele către alte sisteme prin feed-uri.',
    items: [
      {
        id: 'setari-feeduri-comenzi',
        title: 'Feed-uri de comenzi',
        description: 'Creează și administrează feed-uri de comenzi pentru sisteme externe.',
        mode: 'module',
        key: 'order_feeds',
      },
      {
        id: 'setari-feeduri-clienti',
        title: 'Feed-uri de clienți',
        description: 'Creează și administrează feed-uri de clienți pentru sisteme externe.',
        mode: 'module',
        key: 'customer_feeds',
      },
      {
        id: 'setari-feeduri-produse',
        title: 'Feed-uri de produse',
        description: 'Creează și administrează feed-uri de produse pentru site-uri de comparare a prețurilor, marketplace-uri și alte sisteme externe.',
        mode: 'module',
        key: 'feeds',
      },
    ],
  },
];
