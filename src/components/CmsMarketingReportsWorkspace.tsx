import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  formatMoney,
  type AuditLogRecord,
  type BlogPostRecord,
  type CouponRecord,
  type ModuleItemRecord,
  type OrderRecord,
  type ProductRecord,
} from '../types/commerce';
import { GenericModulePanel } from './GenericModulePanel';

interface CmsMarketingReportsWorkspaceProps {
  categoryId: 'website' | 'blog' | 'marketing' | 'rapoarte';
  subPageId: string;
  products: ProductRecord[];
}

const WEBSITE_META: Record<
  string,
  { title: string; desc: string; codeLabel: string }
> = {
  bannere: {
    title: 'Bannere',
    desc: 'Gestionează bannerele promoționale pentru homepage, categorii și pagini de campanie.',
    codeLabel: 'Poziție / Slot',
  },
  'pagini-site': {
    title: 'Pagini site',
    desc: 'Creează și administrează paginile statice (Despre noi, Termeni, Politică retur).',
    codeLabel: 'URL Slug',
  },
  'scripturi-custom': {
    title: 'Scripturi custom',
    desc: 'Injectează scripturi de tracking, pixeli sau integrări personalizate în cele 4 zone ale site-ului.',
    codeLabel: 'Locație / ID',
  },
  'meniuri-navigare': {
    title: 'Meniuri navigare',
    desc: 'Configurează meniurile principale din header, mega-meniu și footer.',
    codeLabel: 'Zonă Meniu',
  },
  'manager-fisiere': {
    title: 'Manager fișiere',
    desc: 'Bibliotecă centralizată de fișiere PDF, broșuri tehnice și active media cu link direct.',
    codeLabel: 'URL Fișier',
  },
  'formulare-custom': {
    title: 'Formulare custom',
    desc: 'Construiește formulare de ofertare B2B, contact și solicitări mostre.',
    codeLabel: 'Cod Formular',
  },
  'mesaje-formulare': {
    title: 'Mesaje formulare',
    desc: 'Mesajele recepționate din formularele custom ale site-ului.',
    codeLabel: 'Expeditor',
  },
  'design-tema': {
    title: 'Design & Temă',
    desc: 'Presetări de culori, fonturi, header și layout pentru tema storefront-ului Node.js.',
    codeLabel: 'Token Temă',
  },
  'elemente-editabile': {
    title: 'Elemente editabile',
    desc: 'Blocuri modulare reutilizabile (benzi anunț, secțiuni FAQ, avantaje).',
    codeLabel: 'Cheie Bloc',
  },
  'localizare-website': {
    title: 'Localizare conținut',
    desc: 'Traduceri și texte personalizate pentru interfața storefront-ului.',
    codeLabel: 'Limbă',
  },
  recenzii: {
    title: 'Recenzii produse',
    desc: 'Moderează și aprobă recenziile lăsate de cumpărători pe paginile de produs.',
    codeLabel: 'Rating (1-5)',
  },
};

const SCRIPT_ZONES: Array<{ key: string; label: string; desc: string }> = [
  {
    key: 'meta_verify',
    label: 'Coduri verificare meta',
    desc: 'Google Search Console, Meta Domain Verification, taguri <head>.',
  },
  {
    key: 'conversions',
    label: 'Contorizare conversii',
    desc: 'Meta Pixel, Google Ads Conversion, TikTok Pixel pe pagina de mulțumire.',
  },
  {
    key: 'footer_scripts',
    label: 'Conținut footer',
    desc: 'Widget-uri chat live, badge-uri de încredere ANPC / SOL.',
  },
  {
    key: 'other_scripts',
    label: 'Alte scripturi',
    desc: 'Google Tag Manager Body, scripturi personalizate de analiză.',
  },
];

export function CmsMarketingReportsWorkspace({
  categoryId,
  subPageId,
  products,
}: CmsMarketingReportsWorkspaceProps) {
  const { authFetch } = useAuth();
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [reportOrders, setReportOrders] = useState<OrderRecord[]>([]);
  const [scripts, setScripts] = useState<ModuleItemRecord[]>([]);

  // Scripturi custom form
  const [scriptTitle, setScriptTitle] = useState('');
  const [scriptCode, setScriptCode] = useState('');
  const [scriptZone, setScriptZone] = useState('meta_verify');

  // Coupon form
  const [couponCode, setCouponCode] = useState('');
  const [couponTitle, setCouponTitle] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'fixed_cents'>('percent');
  const [couponValue, setCouponValue] = useState('10');

  // Blog form
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState('Design Interior');
  const [postExcerpt, setPostExcerpt] = useState('');

  const loadCoupons = useCallback(async () => {
    const res = await authFetch('/api/admin/coupons');
    if (res.ok) {
      const data = await res.json();
      setCoupons(data.coupons ?? []);
    }
  }, [authFetch]);

  const loadBlog = useCallback(async () => {
    const res = await authFetch('/api/admin/blog');
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts ?? []);
    }
  }, [authFetch]);

  const loadActivityLogs = useCallback(async () => {
    const res = await authFetch('/api/admin/audit-logs');
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs ?? []);
    }
  }, [authFetch]);

  const loadScripts = useCallback(async () => {
    const res = await authFetch('/api/admin/modules/custom_scripts');
    if (res.ok) {
      const data = await res.json();
      setScripts(data.items ?? []);
    }
  }, [authFetch]);

  const loadReportOrders = useCallback(async () => {
    const res = await authFetch('/api/admin/orders?status=all');
    if (res.ok) {
      const data = await res.json();
      setReportOrders(data.orders ?? []);
    }
  }, [authFetch]);

  useEffect(() => {
    if (subPageId === 'cupoane-reducere') loadCoupons();
    if (subPageId === 'articole') loadBlog();
    if (subPageId === 'scripturi-custom') loadScripts();
    if (subPageId === 'analiza-trafic') loadReportOrders();
    if (subPageId === 'loguri-activitate' || subPageId === 'activitate-utilizatori') {
      loadActivityLogs();
    }
  }, [
    subPageId,
    loadCoupons,
    loadBlog,
    loadScripts,
    loadReportOrders,
    loadActivityLogs,
  ]);

  const operatorSummary = useMemo(() => {
    const map = new Map<
      string,
      { email: string; count: number; lastAction: string; lastAt: string }
    >();
    for (const l of logs) {
      const key = l.actorEmail || 'system';
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          email: key,
          count: 1,
          lastAction: l.action,
          lastAt: l.createdAt,
        });
      } else {
        existing.count += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [logs]);

  const trafficAnalytics = useMemo(() => {
    const totalRevenue = reportOrders
      .filter((o) => o.status !== 'returned')
      .reduce((s, o) => s + o.totalCents, 0);

    const byPayment = new Map<string, number>();
    const byCourier = new Map<string, number>();
    for (const o of reportOrders) {
      const pm = o.paymentMethod || 'Card Online';
      byPayment.set(pm, (byPayment.get(pm) || 0) + 1);
      const sm = o.shippingMethod || 'Curier';
      byCourier.set(sm, (byCourier.get(sm) || 0) + 1);
    }

    return {
      totalRevenue,
      ordersCount: reportOrders.length,
      avgOrderCents:
        reportOrders.length > 0 ? Math.round(totalRevenue / reportOrders.length) : 0,
      paymentBreakdown: Array.from(byPayment.entries()),
      courierBreakdown: Array.from(byCourier.entries()),
    };
  }, [reportOrders]);

  // WEBSITE
  if (categoryId === 'website') {
    if (subPageId === 'scripturi-custom') {
      const handleAddScript = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scriptTitle.trim()) return;
        const zoneLabel =
          SCRIPT_ZONES.find((z) => z.key === scriptZone)?.label ?? 'Header';
        const res = await authFetch('/api/admin/modules/custom_scripts', {
          method: 'POST',
          body: JSON.stringify({
            title: scriptTitle.trim(),
            code: scriptCode.trim() || zoneLabel,
            status: 'active',
            dataJson: JSON.stringify({ grup: scriptZone }),
          }),
        });
        if (res.ok) {
          setScriptTitle('');
          setScriptCode('');
          await loadScripts();
        }
      };

      const toggleScript = async (item: ModuleItemRecord) => {
        const nextStatus = item.status === 'active' ? 'inactive' : 'active';
        await authFetch(`/api/admin/modules/custom_scripts/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        });
        await loadScripts();
      };

      const deleteScript = async (id: number) => {
        await authFetch(`/api/admin/modules/custom_scripts/${id}`, {
          method: 'DELETE',
        });
        await loadScripts();
      };

      const getZone = (item: ModuleItemRecord): string => {
        try {
          const parsed = JSON.parse(item.dataJson || '{}');
          if (typeof parsed.grup === 'string') return parsed.grup;
        } catch {
          // ignore
        }
        return 'other_scripts';
      };

      return (
        <div className="space-y-6">
          <div className="bg-white border border-teal-900/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#0F2928]">
              Scripturi custom &amp; Coduri verificare
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Organizează scripturile de analiză, pixelii de conversie și codurile de verificare pe cele 4 zone ale storefront-ului.
            </p>
          </div>

          <form
            onSubmit={handleAddScript}
            className="bg-white border border-teal-900/10 rounded-xl p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Denumire script *
              </label>
              <input
                type="text"
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
                placeholder="ex: Meta Pixel Principal"
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Zonă injecție
              </label>
              <select
                value={scriptZone}
                onChange={(e) => setScriptZone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              >
                {SCRIPT_ZONES.map((z) => (
                  <option key={z.key} value={z.key}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ID / Referință / Snippet
              </label>
              <input
                type="text"
                value={scriptCode}
                onChange={(e) => setScriptCode(e.target.value)}
                placeholder="ex: GTM-XXXX sau ID Pixel"
                className="w-full px-3 py-2 text-sm font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adaugă</span>
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SCRIPT_ZONES.map((zone) => {
              const zoneItems = scripts.filter((s) => getZone(s) === zone.key);
              return (
                <div
                  key={zone.key}
                  className="bg-white border border-teal-900/10 rounded-xl overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-teal-900/10 bg-[#F7FBFA]">
                    <h3 className="text-sm font-semibold text-[#0F2928]">{zone.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{zone.desc}</p>
                  </div>
                  {zoneItems.length === 0 ? (
                    <div className="p-5 text-xs text-slate-400">
                      Niciun script configurat în această zonă.
                    </div>
                  ) : (
                    <div className="divide-y divide-teal-900/5">
                      {zoneItems.map((item) => (
                        <div
                          key={item.id}
                          className="px-5 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#0F2928] truncate">
                              {item.title}
                            </div>
                            <div className="text-xs font-mono text-slate-500 truncate">
                              {item.code}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleScript(item)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md border ${
                                item.status === 'active'
                                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}
                            >
                              {item.status === 'active' ? 'Activ' : 'Inactiv'}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteScript(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const meta = WEBSITE_META[subPageId] ?? WEBSITE_META.bannere;
    return (
      <GenericModulePanel
        moduleKey={subPageId.replace(/-/g, '_')}
        title={meta.title}
        description={meta.desc}
        codeLabel={meta.codeLabel}
      />
    );
  }

  // BLOG
  if (categoryId === 'blog') {
    if (subPageId === 'articole') {
      const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!postTitle.trim()) return;
        const slug = postTitle
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const res = await authFetch('/api/admin/blog', {
          method: 'POST',
          body: JSON.stringify({
            title: postTitle.trim(),
            slug,
            category: postCategory,
            status: 'published',
            excerpt: postExcerpt.trim(),
          }),
        });
        if (res.ok) {
          setPostTitle('');
          setPostExcerpt('');
          await loadBlog();
        }
      };

      return (
        <div className="space-y-6">
          <form
            onSubmit={handleCreatePost}
            className="bg-white border border-teal-900/10 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          >
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Titlu articol *
              </label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="ex: Ghid complet corpuri de iluminat B2B"
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Categorie
              </label>
              <input
                type="text"
                value={postCategory}
                onChange={(e) => setPostCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publică articol</span>
            </button>
            <div className="md:col-span-4">
              <input
                type="text"
                value={postExcerpt}
                onChange={(e) => setPostExcerpt(e.target.value)}
                placeholder="Rezumat scurt articol..."
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>
          </form>

          <div className="bg-white border border-teal-900/10 rounded-xl divide-y divide-teal-900/10">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-5 flex items-start justify-between gap-4 hover:bg-teal-50/30"
              >
                <div>
                  <div className="text-sm font-semibold text-[#0F2928]">
                    {post.title}
                  </div>
                  <div className="text-xs text-teal-700 font-mono mt-0.5">
                    /blog/{post.slug} · {post.category} · {post.authorName}
                  </div>
                  {post.excerpt && (
                    <p className="text-xs text-slate-600 mt-1.5">{post.excerpt}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await authFetch(`/api/admin/blog/${post.id}`, {
                      method: 'DELETE',
                    });
                    await loadBlog();
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const blogLabels: Record<string, { title: string; desc: string }> = {
      'categorii-blog': {
        title: 'Categorii blog',
        desc: 'Organizează articolele editoriale pe categorii tematice.',
      },
      'comentarii-blog': {
        title: 'Comentarii blog',
        desc: 'Aprobă și moderează comentariile cititorilor la articole.',
      },
      'linkuri-blog': {
        title: 'Linkuri blog',
        desc: 'Gestionează legăturile interne între articole și produsele din catalog.',
      },
      'taguri-blog': {
        title: 'Taguri blog',
        desc: 'Etichete editoriale pentru indexare și articole conexe.',
      },
    };
    const bMeta = blogLabels[subPageId] ?? blogLabels['categorii-blog'];
    return (
      <GenericModulePanel
        moduleKey={subPageId.replace(/-/g, '_')}
        title={bMeta.title}
        description={bMeta.desc}
      />
    );
  }

  // MARKETING
  if (categoryId === 'marketing') {
    if (subPageId === 'cupoane-reducere') {
      const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!couponCode.trim() || !couponTitle.trim()) return;
        const val =
          couponType === 'percent'
            ? Math.max(1, Number(couponValue) || 10)
            : Math.max(100, Math.round(Number(couponValue || 0) * 100));
        const res = await authFetch('/api/admin/coupons', {
          method: 'POST',
          body: JSON.stringify({
            code: couponCode.trim().toUpperCase(),
            title: couponTitle.trim(),
            discountType: couponType,
            discountValue: val,
            minOrderCents: 0,
            maxUses: null,
          }),
        });
        if (res.ok) {
          setCouponCode('');
          setCouponTitle('');
          await loadCoupons();
        }
      };

      const handleToggleCoupon = async (coupon: CouponRecord) => {
        await authFetch(`/api/admin/coupons/${coupon.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !coupon.isActive }),
        });
        await loadCoupons();
      };

      return (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateCoupon}
            className="bg-white border border-teal-900/10 rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cod Cupon *
              </label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="VERDA20"
                className="w-full px-3 py-2 text-sm font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Denumire campanie *
              </label>
              <input
                type="text"
                value={couponTitle}
                onChange={(e) => setCouponTitle(e.target.value)}
                placeholder="Campanie Primăvară -20%"
                className="w-full px-3 py-2 text-sm bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={couponType}
                onChange={(e) =>
                  setCouponType(e.target.value as 'percent' | 'fixed_cents')
                }
                className="px-2 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              >
                <option value="percent">%</option>
                <option value="fixed_cents">RON</option>
              </select>
              <input
                type="number"
                min={1}
                value={couponValue}
                onChange={(e) => setCouponValue(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-[#F7FBFA] border border-teal-900/15 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Creează cupon</span>
            </button>
          </form>

          <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Cod Cupon</th>
                  <th className="py-2.5 px-4">Campanie</th>
                  <th className="py-2.5 px-4">Discount</th>
                  <th className="py-2.5 px-4 text-right">Utilizări</th>
                  <th className="py-2.5 px-4">Stare</th>
                  <th className="py-2.5 px-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-900/5">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-teal-50/40">
                    <td className="py-3 px-4 font-mono font-semibold text-teal-800">
                      {c.code}
                    </td>
                    <td className="py-3 px-4 text-[#0F2928]">{c.title}</td>
                    <td className="py-3 px-4 font-mono text-xs tabular-nums">
                      {c.discountType === 'percent'
                        ? `-${c.discountValue}%`
                        : `-${formatMoney(c.discountValue, 'RON')}`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      {c.usageCount} / {c.maxUses ?? '∞'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleCoupon(c)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                          c.isActive
                            ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {c.isActive ? 'Activ' : 'Inactiv'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          await authFetch(`/api/admin/coupons/${c.id}`, {
                            method: 'DELETE',
                          });
                          await loadCoupons();
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const mktMeta: Record<string, { title: string; desc: string }> = {
      'reguli-pret-dinamic': {
        title: 'Reguli preț dinamic',
        desc: 'Ajustare automată a prețurilor în funcție de grup client, volum sau interval orar.',
      },
      'reguli-produse-combo': {
        title: 'Reguli produse combo',
        desc: 'Oferte de tip pachet (bundle) cu reducere la achiziția simultană.',
      },
      'reguli-discount-cart': {
        title: 'Reguli discount cart',
        desc: 'Reduceri progresive la nivelul coșului de cumpărături peste anumite praguri valorice.',
      },
    };
    const meta = mktMeta[subPageId] ?? mktMeta['reguli-pret-dinamic'];
    return (
      <GenericModulePanel
        moduleKey={subPageId.replace(/-/g, '_')}
        title={meta.title}
        description={meta.desc}
        codeLabel="Cod Regulă"
      />
    );
  }

  // RAPOARTE
  if (subPageId === 'analiza-trafic') {
    const maxPay = Math.max(...trafficAnalytics.paymentBreakdown.map((x) => x[1]), 1);
    const maxCour = Math.max(...trafficAnalytics.courierBreakdown.map((x) => x[1]), 1);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-teal-900/10 rounded-xl divide-y md:divide-y-0 md:divide-x divide-teal-900/10">
          <div className="p-5">
            <div className="text-xs text-slate-500">Vânzări totale confirmate</div>
            <div className="mt-1 text-2xl font-semibold text-teal-700 font-mono tabular-nums">
              {formatMoney(trafficAnalytics.totalRevenue, 'RON')}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Comenzi înregistrate</div>
            <div className="mt-1 text-2xl font-semibold text-[#0F2928] font-mono tabular-nums">
              {trafficAnalytics.ordersCount}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Coș mediu per comandă</div>
            <div className="mt-1 text-2xl font-semibold text-[#0F2928] font-mono tabular-nums">
              {formatMoney(trafficAnalytics.avgOrderCents, 'RON')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-teal-900/10 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#0F2928]">
              Distribuție metode de plată
            </h3>
            <div className="space-y-3">
              {trafficAnalytics.paymentBreakdown.map(([name, count]) => (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{name}</span>
                    <span className="font-mono tabular-nums text-teal-800">{count} comenzi</span>
                  </div>
                  <div className="h-2 bg-[#E7F3F1] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full"
                      style={{ width: `${Math.round((count / maxPay) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-teal-900/10 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#0F2928]">
              Preferințe curieri și livrare
            </h3>
            <div className="space-y-3">
              {trafficAnalytics.courierBreakdown.map(([name, count]) => (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{name}</span>
                    <span className="font-mono tabular-nums text-teal-800">{count} expedieri</span>
                  </div>
                  <div className="h-2 bg-[#E7F3F1] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full"
                      style={{ width: `${Math.round((count / maxCour) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subPageId === 'situatie-inventar') {
    const totalValueCents = products.reduce(
      (sum, p) => sum + p.basePriceCents * p.stockQuantity,
      0
    );
    const totalUnits = products.reduce((sum, p) => sum + p.stockQuantity, 0);
    const lowStockProducts = products.filter(
      (p) => p.stockQuantity - p.reservedQuantity <= p.lowStockThreshold
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-teal-900/10 rounded-xl divide-y md:divide-y-0 md:divide-x divide-teal-900/10">
          <div className="p-5">
            <div className="text-xs text-slate-500">Valoare totală stoc</div>
            <div className="mt-1 text-2xl font-semibold text-teal-700 font-mono tabular-nums">
              {formatMoney(totalValueCents, 'RON')}
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Total unități în depozit</div>
            <div className="mt-1 text-2xl font-semibold text-[#0F2928] font-mono tabular-nums">
              {totalUnits} buc.
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs text-slate-500">Produse sub prag minim</div>
            <div className="mt-1 text-2xl font-semibold text-amber-700 font-mono tabular-nums">
              {lowStockProducts.length}
            </div>
          </div>
        </div>

        <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-teal-900/10">
            <h3 className="text-base font-semibold text-[#0F2928]">
              Situație detaliată stocuri per produs
            </h3>
          </div>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Produs</th>
                <th className="py-2.5 px-4 text-right">Stoc Fizic</th>
                <th className="py-2.5 px-4 text-right">Rezervat</th>
                <th className="py-2.5 px-4 text-right">Disponibil</th>
                <th className="py-2.5 px-4 text-right">Valoare Stoc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-900/5">
              {products.map((p) => (
                <tr key={p.id ?? p.handle}>
                  <td className="py-3 px-4 font-medium text-[#0F2928]">{p.title}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {p.stockQuantity}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                    {p.reservedQuantity}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-teal-700">
                    {Math.max(0, p.stockQuantity - p.reservedQuantity)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatMoney(p.basePriceCents * p.stockQuantity, p.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (subPageId === 'loguri-activitate' || subPageId === 'activitate-utilizatori') {
    return (
      <div className="space-y-6">
        {subPageId === 'activitate-utilizatori' && operatorSummary.length > 0 && (
          <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-teal-900/10">
              <h3 className="text-base font-semibold text-[#0F2928]">
                Sumar activitate per operator
              </h3>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4 text-right">Acțiuni totale</th>
                  <th className="py-2.5 px-4">Ultima operațiune</th>
                  <th className="py-2.5 px-4 text-right">Dată</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-900/5">
                {operatorSummary.map((op) => (
                  <tr key={op.email}>
                    <td className="py-3 px-4 font-medium text-[#0F2928]">{op.email}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-700 font-semibold">
                      {op.count}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{op.lastAction}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 tabular-nums">
                      {new Date(op.lastAt).toLocaleString('ro-RO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-teal-900/10">
            <h2 className="text-lg font-semibold text-[#0F2928]">
              {subPageId === 'activitate-utilizatori'
                ? 'Jurnal operațiuni operatori'
                : 'Loguri activitate sistem'}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Evenimente reale persistate în PostgreSQL la modificări de produse, stocuri, comenzi și setări.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Acțiune</th>
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4">Detalii</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-900/5">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Nu există încă acțiuni înregistrate în această sesiune.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id}>
                      <td className="py-3 px-4 font-medium text-[#0F2928]">{l.action}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{l.actorEmail}</td>
                      <td className="py-3 px-4 font-mono text-xs text-teal-700">
                        {l.newValue || l.details || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 tabular-nums">
                        {new Date(l.createdAt).toLocaleString('ro-RO')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const reportModules: Record<string, { title: string; desc: string; codeLabel: string }> = {
    'sms-uri-trimise': {
      title: 'SMS-uri trimise',
      desc: 'Jurnalul notificărilor SMS livrate pentru confirmare comandă și AWB.',
      codeLabel: 'Telefon / Status',
    },
    'callback-uri-plata': {
      title: 'Callback-uri plată',
      desc: 'Confirmările IPN/webhook primite de la procesatorii de plăți (Netopia, Stripe, EuPlatesc).',
      codeLabel: 'ID Tranzacție',
    },
  };
  const rMeta = reportModules[subPageId] ?? reportModules['sms-uri-trimise'];
  return (
    <GenericModulePanel
      moduleKey={subPageId.replace(/-/g, '_')}
      title={rMeta.title}
      description={rMeta.desc}
      codeLabel={rMeta.codeLabel}
    />
  );
}
