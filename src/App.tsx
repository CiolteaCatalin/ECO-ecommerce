import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileQuestion,
  Home,
  Image as ImageIcon,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NAV_ITEMS, type NavSectionId } from './config/navigation';
import {
  createEmptyProduct,
  formatMoney,
  type CustomerRecord,
  type OrderCounts,
  type OrderRecord,
  type ProductRecord,
  type QuoteRequestRecord,
  type SitePageRecord,
} from './types/commerce';
import { DashboardOverview } from './components/DashboardOverview';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductEditor } from './components/ProductEditor';
import { OrdersWorkspace, type OrdersTabKey } from './components/OrdersWorkspace';
import {
  CustomersWorkspace,
  type CustomerSubpageKey,
} from './components/CustomersWorkspace';
import {
  PagesSeoWorkspace,
  type PagesSubpageKey,
} from './components/PagesSeoWorkspace';
import { BlogWorkspace } from './components/BlogWorkspace';
import { SettingsWorkspace } from './components/SettingsWorkspace';
import {
  ProductsTaxonomyWorkspace,
  type TaxonomySubpageKey,
} from './components/ProductsTaxonomyWorkspace';
import { MarketingWorkspace } from './components/MarketingWorkspace';
import { MediaLibraryWorkspace } from './components/MediaLibraryWorkspace';

const SECTION_ICONS: Record<NavSectionId, typeof Home> = {
  dashboard: Home,
  produse: Package,
  comenzi: ShoppingBag,
  clienti: Users,
  marketing: Megaphone,
  media: ImageIcon,
  pagini: FileCode2,
  blog: BookOpen,
  setari: Settings,
};

function AdminWorkspace() {
  const {
    user,
    loading: authLoading,
    authError,
    signInWithGoogle,
    signOut,
    authFetch,
  } = useAuth();

  const [activeSection, setActiveSection] = useState<NavSectionId>('dashboard');
  const [activeSubpage, setActiveSubpage] = useState<string>('');
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    produse: true,
    setari: false,
  });
  const [ordersTab, setOrdersTab] = useState<OrdersTabKey>('all');
  const [settingsCardId, setSettingsCardId] = useState<string>('setari-hub');

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [sitePages, setSitePages] = useState<SitePageRecord[]>([]);
  const [newQuotesCount, setNewQuotesCount] = useState<number>(0);

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [orderCounts, setOrderCounts] = useState<OrderCounts | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(
    null
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global search state
  const [globalQuery, setGlobalQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const loadWorkspaceData = useCallback(async () => {
    if (!user) return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const [prodRes, ordRes, custRes, pagesRes, quotesRes] = await Promise.all([
        authFetch('/api/admin/products'),
        authFetch('/api/admin/orders?status=all'),
        authFetch('/api/admin/customers'),
        authFetch('/api/admin/site-pages'),
        authFetch('/api/admin/quotes'),
      ]);

      const prodData = await prodRes.json();
      if (!prodRes.ok) {
        throw new Error(prodData.error || 'Nu s-au putut încărca produsele.');
      }
      setProducts(prodData.products ?? []);

      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setAllOrders(ordData.orders ?? []);
        if (ordData.counts) setOrderCounts(ordData.counts);
      }

      if (custRes.ok) {
        const custData = await custRes.json();
        setAllCustomers(custData.customers ?? []);
      }

      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        setSitePages(pagesData.pages ?? []);
      }

      if (quotesRes.ok) {
        const qData = await quotesRes.json();
        const qList: QuoteRequestRecord[] = qData.quotes ?? [];
        setNewQuotesCount(qList.filter((q) => q.status === 'new').length);
      }
    } catch (err: unknown) {
      setCatalogError(
        err instanceof Error ? err.message : 'Eroare de conexiune la server.'
      );
    } finally {
      setCatalogLoading(false);
    }
  }, [user, authFetch]);

  useEffect(() => {
    if (user) {
      loadWorkspaceData();
    }
  }, [user, loadWorkspaceData]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const searchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return { products: [], orders: [], customers: [], pages: [] };
    return {
      products: products
        .filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.handle.toLowerCase().includes(q)
        )
        .slice(0, 4),
      orders: allOrders
        .filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerEmail.toLowerCase().includes(q)
        )
        .slice(0, 3),
      customers: allCustomers
        .filter(
          (c) =>
            c.fullName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q)
        )
        .slice(0, 3),
      pages: sitePages
        .filter(
          (pg) =>
            pg.title.toLowerCase().includes(q) ||
            pg.slug.toLowerCase().includes(q)
        )
        .slice(0, 3),
    };
  }, [globalQuery, products, allOrders, allCustomers, sitePages]);

  const handleSaveProduct = async (product: ProductRecord) => {
    const isUpdate = Boolean(product.id);
    const endpoint = isUpdate
      ? `/api/admin/products/${product.id}`
      : '/api/admin/products';
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await authFetch(endpoint, {
      method,
      body: JSON.stringify(product),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Nu s-a putut salva produsul.');
    }

    await loadWorkspaceData();
    if (data.product) {
      setEditingProduct(data.product);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const res = await authFetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Nu s-a putut șterge produsul.');
    }
    await loadWorkspaceData();
  };

  const navigateTo = (
    section: NavSectionId,
    opts?: { ordersTab?: OrdersTabKey; settingsCard?: string; subpage?: string }
  ) => {
    const navDef = NAV_ITEMS.find((n) => n.id === section);
    const resolvedSubpage =
      opts?.subpage ?? navDef?.subpages?.[0]?.id ?? '';

    if (section === 'produse' && resolvedSubpage === 'adauga') {
      setActiveSection('produse');
      setActiveSubpage('adauga');
      setEditingProduct(createEmptyProduct());
      setExpandedMenus((prev) => ({ ...prev, produse: true }));
      setMobileMenuOpen(false);
      setSearchFocused(false);
      return;
    }

    setActiveSection(section);
    setActiveSubpage(resolvedSubpage);
    setEditingProduct(null);
    if (navDef?.subpages) {
      setExpandedMenus((prev) => ({ ...prev, [section]: true }));
    }

    if (opts?.ordersTab) {
      setOrdersTab(opts.ordersTab);
      setActiveSubpage(opts.ordersTab);
    } else if (section === 'comenzi') {
      setOrdersTab((resolvedSubpage as OrdersTabKey) || 'all');
    }

    if (opts?.settingsCard) {
      setSettingsCardId(opts.settingsCard);
      setActiveSubpage(opts.settingsCard);
    } else if (section === 'setari') {
      setSettingsCardId(resolvedSubpage || 'setari-hub');
    }

    setMobileMenuOpen(false);
    setSearchFocused(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F8FD] flex items-center justify-center">
        <div className="text-sm text-blue-700">
          Se încarcă panoul de administrare...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F4F8FD] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-xs">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Verda Commerce
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Autentificare Panou Administrare
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Conectează-te cu contul Google pentru a administra produsele, prețurile la cerere, comenzile, blogul, paginile din cod și setările SEO.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Continuă cu Google
          </button>
        </div>
      </div>
    );
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection);
  const currentSubNav = currentNav?.subpages?.find((s) => s.id === activeSubpage);
  const breadcrumb = editingProduct
    ? `Produse / ${editingProduct.title || 'Produs nou'}`
    : currentSubNav
    ? `${currentNav?.label} / ${currentSubNav.label}`
    : currentNav?.label ?? 'Panou de control';

  const hasDropdownResults =
    searchFocused &&
    globalQuery.trim().length > 0 &&
    (searchResults.products.length > 0 ||
      searchResults.orders.length > 0 ||
      searchResults.customers.length > 0 ||
      searchResults.pages.length > 0);

  return (
    <div className="min-h-screen bg-[#F4F8FD] flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Curat Alb & Albastru Pal (248px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[248px] bg-white border-r border-slate-200 flex flex-col transition-transform duration-150 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="text-base font-bold text-blue-700 tracking-tight whitespace-nowrap hover:text-blue-600"
          >
            Verda Commerce
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-slate-500 hover:text-blue-700"
            aria-label="Închide meniul"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = SECTION_ICONS[item.id];
            const isActive =
              activeSection === item.id &&
              (!editingProduct || item.id === 'produse');
            const hasSubpages = Boolean(item.subpages && item.subpages.length > 0);
            const isExpanded = Boolean(expandedMenus[item.id]);

            const badge =
              item.id === 'comenzi' && orderCounts
                ? orderCounts.pending + newQuotesCount
                : null;

            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (hasSubpages && activeSection === item.id && !editingProduct) {
                      setExpandedMenus((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }));
                    } else {
                      navigateTo(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-[#EAF2FC] hover:text-blue-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-blue-600'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {badge !== null && badge > 0 && (
                      <span
                        className={`font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-blue-500 text-white'
                            : 'bg-[#EAF2FC] text-blue-700 font-semibold'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                    {hasSubpages &&
                      (isExpanded ? (
                        <ChevronDown
                          className={`w-3.5 h-3.5 ${
                            isActive ? 'text-white/90' : 'text-slate-400'
                          }`}
                        />
                      ) : (
                        <ChevronRight
                          className={`w-3.5 h-3.5 ${
                            isActive ? 'text-white/90' : 'text-slate-400'
                          }`}
                        />
                      ))}
                  </span>
                </button>

                {hasSubpages && isExpanded && (
                  <div className="pl-5 pr-1 py-1 space-y-0.5 border-l border-blue-100 ml-4">
                    {item.subpages!.map((sub) => {
                      const subActive =
                        isActive &&
                        (activeSubpage === sub.id ||
                          (editingProduct &&
                            item.id === 'produse' &&
                            sub.id === 'adauga' &&
                            !editingProduct.id));
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() =>
                            navigateTo(item.id, { subpage: sub.id })
                          }
                          className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors truncate ${
                            subActive
                              ? 'bg-[#EAF2FC] text-blue-800 font-semibold'
                              : 'text-slate-600 hover:bg-blue-50/60 hover:text-blue-900'
                          }`}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3 shrink-0 bg-[#F4F8FD]">
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-900 truncate">
              {user.displayName || 'Administrator'}
            </div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Deconectare</span>
          </button>
        </div>
      </aside>

      {/* Zona Principală */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-blue-700 border border-slate-200 rounded-md"
              aria-label="Deschide meniul"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs font-medium text-slate-600 truncate hidden md:block">
              {breadcrumb}
            </div>
          </div>

          <div ref={searchBoxRef} className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={globalQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setGlobalQuery(e.target.value);
                setSearchFocused(true);
              }}
              placeholder="Caută produse, comenzi, clienți, pagini..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
            />
            {hasDropdownResults && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {searchResults.products.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-semibold text-slate-500">
                      Produse
                    </div>
                    {searchResults.products.map((p) => (
                      <button
                        key={p.id ?? p.handle}
                        type="button"
                        onClick={() => {
                          setActiveSection('produse');
                          setEditingProduct(p);
                          setSearchFocused(false);
                        }}
                        className="w-full px-2 py-1.5 rounded-md hover:bg-blue-50/70 flex items-center justify-between text-xs text-left"
                      >
                        <span className="font-medium text-slate-900 truncate">
                          {p.title}
                        </span>
                        <span className="font-mono text-blue-700 ml-2 shrink-0">
                          {p.priceOnRequest
                            ? 'Preț la cerere'
                            : formatMoney(p.basePriceCents, p.currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.orders.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-semibold text-slate-500">
                      Comenzi
                    </div>
                    {searchResults.orders.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() =>
                          navigateTo('comenzi', { ordersTab: o.status })
                        }
                        className="w-full px-2 py-1.5 rounded-md hover:bg-blue-50/70 flex items-center justify-between text-xs text-left"
                      >
                        <span className="font-mono font-medium text-slate-900">
                          {o.orderNumber} · {o.customerName}
                        </span>
                        <span className="font-mono text-blue-700 ml-2 shrink-0">
                          {formatMoney(o.totalCents, o.currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.customers.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-semibold text-slate-500">
                      Clienți
                    </div>
                    {searchResults.customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => navigateTo('clienti')}
                        className="w-full px-2 py-1.5 rounded-md hover:bg-blue-50/70 flex items-center justify-between text-xs text-left"
                      >
                        <span className="font-medium text-slate-900">
                          {c.fullName}
                        </span>
                        <span className="text-slate-500 ml-2 truncate">
                          {c.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.pages.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[11px] font-semibold text-slate-500">
                      Pagini &amp; SEO
                    </div>
                    {searchResults.pages.map((pg) => (
                      <button
                        key={pg.id ?? pg.slug}
                        type="button"
                        onClick={() => navigateTo('pagini')}
                        className="w-full px-2 py-1.5 rounded-md hover:bg-blue-50/70 flex items-center justify-between text-xs text-left"
                      >
                        <span className="font-medium text-slate-900">
                          {pg.title}
                        </span>
                        <span className="font-mono text-blue-700 ml-2">
                          {pg.slug}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {orderCounts && (
              <button
                type="button"
                onClick={() =>
                  navigateTo('comenzi', { ordersTab: 'pending' })
                }
                title="Comenzi în așteptare"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-[#F4F8FD] hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-mono tabular-nums">
                  {orderCounts.pending}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateTo('comenzi', { ordersTab: 'quotes' })}
              title="Cereri ofertă noi (Preț la cerere)"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-800 bg-[#F4F8FD] hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileQuestion className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-mono tabular-nums">{newQuotesCount}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigateTo('setari', { settingsCard: 'setari-api-webhook' })
              }
              className="hidden xl:inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              API &amp; Medusa v2
            </button>

            {!editingProduct && (
              <button
                type="button"
                onClick={() => {
                  setActiveSection('produse');
                  setEditingProduct(createEmptyProduct());
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Produs nou</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          {editingProduct ? (
            <ProductEditor
              initialProduct={editingProduct}
              onSave={handleSaveProduct}
              onCancel={() => {
                setEditingProduct(null);
                setActiveSubpage('toate');
              }}
            />
          ) : activeSection === 'dashboard' ? (
            <DashboardOverview
              products={products}
              onNavigate={(sec, opts) => navigateTo(sec, opts)}
              onCreateProduct={() => {
                setActiveSection('produse');
                setActiveSubpage('adauga');
                setEditingProduct(createEmptyProduct());
              }}
            />
          ) : activeSection === 'produse' ? (
            activeSubpage === 'branduri' ||
            activeSubpage === 'categorii' ||
            activeSubpage === 'etichete' ||
            activeSubpage === 'atribute' ||
            activeSubpage === 'import-export' ? (
              <ProductsTaxonomyWorkspace
                subpage={activeSubpage as TaxonomySubpageKey}
                onProductsImported={loadWorkspaceData}
              />
            ) : (
              <ProductCatalog
                products={products}
                loading={catalogLoading}
                error={catalogError}
                initialFilter={
                  activeSubpage === 'pret-cerere' ? 'price_on_request' : 'all'
                }
                onCreateNew={() => {
                  setActiveSubpage('adauga');
                  setEditingProduct(createEmptyProduct());
                }}
                onEdit={(p) => setEditingProduct(p)}
                onDelete={handleDeleteProduct}
                onRefresh={loadWorkspaceData}
                onQuoteSubmitted={loadWorkspaceData}
              />
            )
          ) : activeSection === 'comenzi' ? (
            <OrdersWorkspace
              initialTab={ordersTab}
              onCountsUpdated={(counts) => setOrderCounts(counts)}
              onQuotesUpdated={(qCount) => setNewQuotesCount(qCount)}
            />
          ) : activeSection === 'clienti' ? (
            <CustomersWorkspace
              initialSubpage={
                (activeSubpage as CustomerSubpageKey) || 'toti'
              }
            />
          ) : activeSection === 'marketing' ? (
            <MarketingWorkspace
              subpage={
                activeSubpage === 'reguli-cos' ? 'reguli-cos' : 'cupoane'
              }
            />
          ) : activeSection === 'media' ? (
            <MediaLibraryWorkspace />
          ) : activeSection === 'pagini' ? (
            <PagesSeoWorkspace
              initialSubpage={
                (activeSubpage as PagesSubpageKey) || 'pagini-cod'
              }
            />
          ) : activeSection === 'blog' ? (
            <BlogWorkspace />
          ) : (
            <SettingsWorkspace
              products={products}
              initialCardId={settingsCardId}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdminWorkspace />
    </AuthProvider>
  );
}
