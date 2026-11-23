import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Globe,
  Home,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShoppingBag,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  MENU_CATEGORIES,
  type MenuCategoryId,
} from './config/navigation';
import {
  createEmptyProduct,
  formatMoney,
  type CustomerRecord,
  type OrderCounts,
  type OrderRecord,
  type ProductRecord,
} from './types/commerce';
import { DashboardOverview } from './components/DashboardOverview';
import { OrdersWorkspace } from './components/OrdersWorkspace';
import { CustomersWorkspace } from './components/CustomersWorkspace';
import { CatalogWorkspace } from './components/CatalogWorkspace';
import { InventoryWorkspace } from './components/InventoryWorkspace';
import { CmsMarketingReportsWorkspace } from './components/CmsMarketingReportsWorkspace';
import { SettingsWorkspace } from './components/SettingsWorkspace';
import { ProductEditor } from './components/ProductEditor';

const CATEGORY_ICONS: Record<MenuCategoryId, typeof ShoppingBag> = {
  comenzi: ShoppingBag,
  clienti: Users,
  catalog: Package,
  inventar: Layers,
  website: Globe,
  blog: BookOpen,
  marketing: Megaphone,
  rapoarte: BarChart3,
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

  const [activeCategory, setActiveCategory] = useState<'dashboard' | MenuCategoryId>('dashboard');
  const [activeSubPage, setActiveSubPage] = useState<string>('dashboard');
  const [expandedCategories, setExpandedCategories] = useState<
    Record<MenuCategoryId, boolean>
  >({
    comenzi: true,
    clienti: false,
    catalog: true,
    inventar: false,
    website: false,
    blog: false,
    marketing: false,
    rapoarte: false,
    setari: false,
  });

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [orderCounts, setOrderCounts] = useState<OrderCounts | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
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
      const [prodRes, ordRes, custRes] = await Promise.all([
        authFetch('/api/admin/products'),
        authFetch('/api/admin/orders?status=all'),
        authFetch('/api/admin/customers'),
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
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const searchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return { products: [], orders: [], customers: [] };
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
            o.customerEmail.toLowerCase().includes(q) ||
            o.awbNumber.toLowerCase().includes(q)
        )
        .slice(0, 4),
      customers: allCustomers
        .filter(
          (c) =>
            c.fullName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q)
        )
        .slice(0, 4),
    };
  }, [globalQuery, products, allOrders, allCustomers]);

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

  const navigateTo = (categoryId: 'dashboard' | MenuCategoryId, subPageId: string) => {
    setActiveCategory(categoryId);
    setActiveSubPage(subPageId);
    setEditingProduct(null);
    if (categoryId !== 'dashboard') {
      setExpandedCategories((prev) => ({ ...prev, [categoryId]: true }));
    }
    setMobileMenuOpen(false);
    setSearchFocused(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F2F8F7] flex items-center justify-center">
        <div className="text-sm text-teal-800">Se încarcă panoul de administrare...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F2F8F7] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-teal-900/15 rounded-xl p-8 space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-teal-700">
              Verda Commerce
            </div>
            <h1 className="text-2xl font-semibold text-[#0F2928] tracking-tight">
              Autentificare Panou Administrare
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Conectează-te cu contul Google pentru a administra comenzile, clienții, catalogul extins de produse, stocurile, pragurile de preț și setările magazinului.
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
            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
          >
            Continuă cu Google
          </button>
        </div>
      </div>
    );
  }

  const currentCategoryDef =
    activeCategory === 'dashboard'
      ? null
      : MENU_CATEGORIES.find((c) => c.id === activeCategory);
  const currentSubDef = currentCategoryDef?.items.find(
    (i) => i.id === activeSubPage
  );
  const breadcrumb = editingProduct
    ? `Catalog / Produse / ${editingProduct.title || 'Produs nou'}`
    : activeCategory === 'dashboard'
    ? 'Panou de control'
    : `${currentCategoryDef?.label ?? ''} / ${currentSubDef?.label ?? ''}`;

  const hasDropdownResults =
    searchFocused &&
    globalQuery.trim().length > 0 &&
    (searchResults.products.length > 0 ||
      searchResults.orders.length > 0 ||
      searchResults.customers.length > 0);

  return (
    <div className="min-h-screen bg-[#F2F8F7] flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[#0F2928]/30 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigare Completă Turcoaz Light (268px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[268px] bg-white border-r border-teal-900/10 flex flex-col transition-transform duration-150 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 px-5 border-b border-teal-900/10 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('dashboard', 'dashboard')}
            className="text-base font-bold text-teal-800 tracking-tight whitespace-nowrap hover:text-teal-700"
          >
            Verda Commerce
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-slate-500 hover:text-teal-800"
            aria-label="Închide meniul"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            type="button"
            onClick={() => navigateTo('dashboard', 'dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors mb-1 ${
              activeCategory === 'dashboard' && !editingProduct
                ? 'bg-teal-600 text-white'
                : 'text-slate-700 hover:bg-[#F2F8F7] hover:text-teal-900'
            }`}
          >
            <Home
              className={`w-4 h-4 shrink-0 ${
                activeCategory === 'dashboard' && !editingProduct
                  ? 'text-white'
                  : 'text-slate-400'
              }`}
            />
            <span>Panou de control</span>
          </button>

          {MENU_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.id];
            const isExpanded = expandedCategories[category.id];
            const isCatActive = activeCategory === category.id;

            return (
              <div key={category.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (category.id === 'setari') {
                      navigateTo('setari', 'setari-hub');
                      return;
                    }
                    setExpandedCategories((prev) => ({
                      ...prev,
                      [category.id]: !prev[category.id],
                    }));
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isCatActive
                      ? 'bg-[#E6F4F2] text-teal-900'
                      : 'text-slate-700 hover:bg-[#F2F8F7] hover:text-teal-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isCatActive ? 'text-teal-700' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{category.label}</span>
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="pl-7 pr-1 py-0.5 space-y-0.5">
                    {category.items.map((item) => {
                      const isSubActive =
                        activeCategory === category.id &&
                        activeSubPage === item.id &&
                        !editingProduct;

                      const badgeCount =
                        item.badgeKey === 'pendingOrders' && orderCounts
                          ? orderCounts.pending
                          : null;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigateTo(category.id, item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors text-left ${
                            isSubActive
                              ? 'bg-teal-600 text-white font-medium'
                              : 'text-slate-600 hover:text-teal-900 hover:bg-[#F2F8F7]'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {badgeCount !== null && (
                            <span
                              className={`ml-2 font-mono tabular-nums text-[11px] shrink-0 ${
                                isSubActive ? 'text-teal-100' : 'text-teal-700 font-semibold'
                              }`}
                            >
                              {badgeCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-teal-900/10 space-y-3 shrink-0 bg-[#F7FBFA]">
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#0F2928] truncate">
              {user.displayName || 'Administrator'}
            </div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-900 bg-white border border-teal-900/15 hover:bg-teal-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Deconectare</span>
          </button>
        </div>
      </aside>

      {/* Zona Principală */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 px-6 bg-white border-b border-teal-900/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-teal-900 border border-teal-900/15 rounded-md"
              aria-label="Deschide meniul"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs font-medium text-slate-600 truncate hidden md:block">
              {breadcrumb}
            </div>
          </div>

          {/* Căutare globală live */}
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
              placeholder="Caută produse, comenzi, clienți..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
            />
            {hasDropdownResults && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-teal-900/15 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto divide-y divide-teal-900/10">
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
                          setActiveCategory('catalog');
                          setActiveSubPage('produse');
                          setEditingProduct(p);
                          setSearchFocused(false);
                        }}
                        className="w-full px-2 py-1.5 rounded-md hover:bg-teal-50/60 flex items-center justify-between text-xs text-left"
                      >
                        <span className="font-medium text-[#0F2928] truncate">
                          {p.title}
                        </span>
                        <span className="font-mono text-teal-700 ml-2 shrink-0">
                          {formatMoney(p.basePriceCents, p.currency)}
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
                          navigateTo(
                            'comenzi',
                            o.status === 'processing'
                              ? 'comenzi-procesare'
                              : o.status === 'processed'
                              ? 'comenzi-procesate'
                              : 'comenzi-asteptare'
                          )
                        }
                        className="w-full px-2 py-1.5 rounded-md hover:bg-teal-50/60 flex items-center justify-between text-xs text-left"
                      >
                        <span className="font-mono font-medium text-[#0F2928]">
                          {o.orderNumber} · {o.customerName}
                        </span>
                        <span className="font-mono text-teal-700 ml-2 shrink-0">
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
                        onClick={() => navigateTo('clienti', 'clienti-lista')}
                        className="w-full px-2 py-1.5 rounded-md hover:bg-teal-50/60 flex items-center justify-between text-xs text-left"
                      >
                        <span className="font-medium text-[#0F2928]">
                          {c.fullName}
                        </span>
                        <span className="text-slate-500 ml-2 truncate">
                          {c.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Indicatori operaționali + Acțiune primară */}
          <div className="flex items-center gap-2 shrink-0">
            {orderCounts && (
              <>
                <button
                  type="button"
                  onClick={() => navigateTo('comenzi', 'comenzi-asteptare')}
                  title="Comenzi în așteptare"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-teal-900 bg-[#F7FBFA] hover:bg-teal-50 border border-teal-900/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Truck className="w-3.5 h-3.5 text-teal-700" />
                  <span className="font-mono tabular-nums">{orderCounts.pending}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('comenzi', 'cereri-retur')}
                  title="Cereri retur în așteptare"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-[#F7FBFA] hover:bg-amber-50 border border-teal-900/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span className="font-mono tabular-nums">
                    {orderCounts.returnRequests}
                  </span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => navigateTo('setari', 'setari-api-webhook')}
              className="hidden xl:inline-flex items-center px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              API &amp; Blueprint Medusa v2
            </button>

            {!editingProduct && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('catalog');
                  setActiveSubPage('produse');
                  setEditingProduct(createEmptyProduct());
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
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
              onCancel={() => setEditingProduct(null)}
            />
          ) : activeCategory === 'dashboard' ? (
            <DashboardOverview
              products={products}
              onNavigate={(cat, sub) => navigateTo(cat, sub)}
              onCreateProduct={() => {
                setActiveCategory('catalog');
                setActiveSubPage('produse');
                setEditingProduct(createEmptyProduct());
              }}
            />
          ) : activeCategory === 'comenzi' ? (
            <OrdersWorkspace
              subPageId={activeSubPage}
              onCountsUpdated={(counts) => setOrderCounts(counts)}
              onNavigateSubpage={(subId) => navigateTo('comenzi', subId)}
            />
          ) : activeCategory === 'clienti' ? (
            <CustomersWorkspace subPageId={activeSubPage} />
          ) : activeCategory === 'catalog' ? (
            <CatalogWorkspace
              subPageId={activeSubPage}
              products={products}
              loading={catalogLoading}
              error={catalogError}
              onCreateNew={() => setEditingProduct(createEmptyProduct())}
              onEdit={(p) => setEditingProduct(p)}
              onDelete={handleDeleteProduct}
              onRefresh={loadWorkspaceData}
              onNavigateSubpage={(subId) => navigateTo('catalog', subId)}
            />
          ) : activeCategory === 'inventar' ? (
            <InventoryWorkspace
              subPageId={activeSubPage}
              products={products}
              onRefreshProducts={loadWorkspaceData}
            />
          ) : activeCategory === 'website' ||
            activeCategory === 'blog' ||
            activeCategory === 'marketing' ||
            activeCategory === 'rapoarte' ? (
            <CmsMarketingReportsWorkspace
              categoryId={activeCategory}
              subPageId={activeSubPage}
              products={products}
            />
          ) : (
            <SettingsWorkspace
              subPageId={activeSubPage}
              products={products}
              onSelectSubPage={(id) => navigateTo('setari', id)}
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
