import { useCallback, useEffect, useMemo, useState } from 'react';
import { Code2, Eye, Globe, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { SitePageRecord } from '../types/commerce';
import { ProductImage } from './ProductImage';
import { GenericModulePanel } from './GenericModulePanel';

export type PagesSubpageKey = 'pagini-cod' | 'meniuri' | 'bannere' | 'redirecturi';

function slugifyPath(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned ? `/${cleaned}` : '/pagina-noua';
}

const DEFAULT_HTML_TEMPLATE = `<section class="page-hero">
  <span class="tag">PAGINĂ PERSONALIZATĂ</span>
  <h1>Titlul paginii tale</h1>
  <p>Scrie conținutul paginii folosind HTML și CSS curat. Această pagină poate fi publicată instant în storefront.</p>
  <a href="/catalog" class="btn-primary">Vezi produsele</a>
</section>`;

const DEFAULT_CSS_TEMPLATE = `body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 32px;
  background: #f4f8fd;
  color: #0f172a;
}
.page-hero {
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 16px;
  padding: 32px;
}
.tag {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #2563eb;
}
h1 {
  margin: 8px 0 12px;
  font-size: 26px;
  color: #0f172a;
}
p {
  font-size: 15px;
  line-height: 1.6;
  color: #475569;
  max-width: 600px;
}
.btn-primary {
  display: inline-block;
  margin-top: 14px;
  padding: 10px 18px;
  background: #2563eb;
  color: #ffffff;
  text-decoration: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
}`;

function createEmptyCustomPage(): SitePageRecord {
  return {
    title: '',
    slug: '/pagina-noua',
    pageType: 'custom_code',
    codeContent: DEFAULT_HTML_TEMPLATE,
    cssContent: DEFAULT_CSS_TEMPLATE,
    isPublished: true,
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    canonicalUrl: '',
    ogImageUrl: '',
    noIndex: false,
  };
}

interface PagesSeoWorkspaceProps {
  initialSubpage?: PagesSubpageKey;
}

export function PagesSeoWorkspace({
  initialSubpage = 'pagini-cod',
}: PagesSeoWorkspaceProps) {
  const { authFetch } = useAuth();
  const [subpage, setSubpage] = useState<PagesSubpageKey>(initialSubpage);
  const [pages, setPages] = useState<SitePageRecord[]>([]);
  const [selected, setSelected] = useState<SitePageRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'seo'>('seo');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSubpage(initialSubpage);
  }, [initialSubpage]);

  const loadPages = useCallback(
    async (selectId?: number) => {
      setLoading(true);
      try {
        const res = await authFetch('/api/admin/site-pages');
        const data = await res.json();
        if (res.ok) {
          const list: SitePageRecord[] = data.pages ?? [];
          setPages(list);
          if (selectId) {
            const match = list.find((p) => p.id === selectId);
            if (match) {
              setSelected(match);
              return;
            }
          }
          setSelected((prev) => {
            if (prev?.id) {
              const updated = list.find((p) => p.id === prev.id);
              if (updated) return updated;
            }
            return list[0] ?? null;
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const filteredPages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.seoTitle.toLowerCase().includes(q)
    );
  }, [pages, search]);

  const corePages = filteredPages.filter((p) => p.pageType === 'core');
  const customPages = filteredPages.filter((p) => p.pageType === 'custom_code');

  const handleSelectPage = (page: SitePageRecord) => {
    setSelected(page);
    setMessage(null);
    setActiveTab(page.pageType === 'custom_code' ? 'code' : 'seo');
  };

  const handleNewCustomPage = () => {
    setSelected(createEmptyCustomPage());
    setMessage(null);
    setActiveTab('code');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const isNew = !selected.id;
      const endpoint = isNew
        ? '/api/admin/site-pages'
        : `/api/admin/site-pages/${selected.id}`;
      const res = await authFetch(endpoint, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(selected),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nu s-a putut salva pagina.');
      }
      setMessage({
        type: 'ok',
        text: isNew
          ? 'Pagina din cod și setările SEO au fost create în PostgreSQL.'
          : 'Modificările paginii și setările SEO au fost salvate.',
      });
      await loadPages(data.page?.id);
    } catch (err: unknown) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Eroare la salvare.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await authFetch(`/api/admin/site-pages/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: 'err', text: data.error || 'Nu s-a putut șterge pagina.' });
      return;
    }
    setMessage({ type: 'ok', text: 'Pagina personalizată a fost ștearsă.' });
    setSelected(null);
    await loadPages();
  };

  const srcDoc = useMemo(() => {
    if (!selected) return '';
    return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<style>${selected.cssContent || ''}</style>
</head>
<body>${selected.codeContent || ''}</body>
</html>`;
  }, [selected]);

  const serpTitle =
    selected?.seoTitle.trim() || selected?.title || 'Titlu Pagină Site';
  const serpDesc =
    selected?.seoDescription.trim() ||
    'Adaugă o meta descriere clară pentru a îmbunătăți rata de click din Google.';
  const serpUrl =
    selected?.canonicalUrl.trim() ||
    `https://magazin.verda-commerce.ro${selected?.slug === '/' ? '' : selected?.slug || ''}`;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Pagini Site, Navigare, Bannere &amp; SEO
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Creează pagini HTML/CSS cu SEO per pagină, administrează meniurile de navigare, bannerele și redirecturile 301.
            </p>
          </div>
          {subpage === 'pagini-cod' && (
            <button
              type="button"
              onClick={handleNewCustomPage}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pagină nouă din cod</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#EAF2FC] rounded-lg w-fit overflow-x-auto max-w-full">
          {(
            [
              { key: 'pagini-cod', label: 'Pagini cod & SEO' },
              { key: 'meniuri', label: 'Meniuri navigare' },
              { key: 'bannere', label: 'Bannere' },
              { key: 'redirecturi', label: 'Redirecturi 301' },
            ] as Array<{ key: PagesSubpageKey; label: string }>
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSubpage(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                subpage === t.key
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subpage === 'meniuri' ? (
        <GenericModulePanel
          moduleKey="nav_menus"
          title="Meniuri navigare Storefront"
          description="Definește linkurile din meniul principal (Header) și subsol (Footer) ale storefront-ului Node.js."
          codeLabel="Rută / URL țintă"
          codePlaceholder="/categorii/iluminat"
          extraPlaceholder='{"locatie": "header", "ordine": 1}'
        />
      ) : subpage === 'bannere' ? (
        <GenericModulePanel
          moduleKey="banners"
          title="Bannere & Promoții vizuale"
          description="Asociază imagini din Media & WebP către zonele Hero și promoționale ale magazinului."
          codeLabel="Link destinație / Imagine WebP"
          codePlaceholder="/media/banner.webp"
          extraPlaceholder='{"pozitie": "home_hero", "cta": "Vezi oferta"}'
        />
      ) : subpage === 'redirecturi' ? (
        <GenericModulePanel
          moduleKey="redirects_301"
          title="Redirecturi SEO 301"
          description="Redirecționează URL-urile vechi către paginile sau produsele noi fără pierderi de indexare."
          codeLabel="URL Sursă -> Destinație"
          codePlaceholder="/produs-vechi -> /produs-nou"
          extraPlaceholder='{"codHttp": 301}'
        />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lista pagini stânga */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-3.5 border-b border-slate-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Caută pagină sau URL..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-xs text-slate-500">Se încarcă paginile...</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
              <div className="px-4 py-2 bg-[#F4F8FD] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pagini principale site (SEO)
              </div>
              {corePages.map((p) => {
                const isSelected = selected?.id === p.id;
                return (
                  <button
                    key={p.id ?? p.slug}
                    type="button"
                    onClick={() => handleSelectPage(p)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between gap-2 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-2 border-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                        {p.title}
                      </div>
                      <div className="text-xs font-mono text-slate-500 truncate">
                        {p.slug}
                      </div>
                    </div>
                    <Globe className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  </button>
                );
              })}

              <div className="px-4 py-2 bg-[#F4F8FD] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pagini create din cod ({customPages.length})
              </div>
              {customPages.length === 0 ? (
                <div className="px-4 py-5 text-xs text-slate-400">
                  Nicio pagină din cod găsită.
                </div>
              ) : (
                customPages.map((p) => {
                  const isSelected = selected?.id === p.id;
                  return (
                    <button
                      key={p.id ?? p.slug}
                      type="button"
                      onClick={() => handleSelectPage(p)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between gap-2 transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-2 border-blue-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                          {p.title}
                        </div>
                        <div className="text-xs font-mono text-slate-500 truncate">
                          {p.slug} · {p.isPublished ? 'Publicată' : 'Ciornă'}
                        </div>
                      </div>
                      <Code2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </aside>

        {/* Editor Pagina + SEO dreapta */}
        <div className="lg:col-span-8">
          {!selected ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              Selectează o pagină din stânga pentru a-i edita codul sau setările SEO, ori creează o pagină nouă din cod.
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-blue-600">
                      {selected.pageType === 'core'
                        ? 'Pagină principală site · Editare SEO'
                        : selected.id
                        ? 'Pagină din cod HTML/CSS'
                        : 'Pagină nouă din cod'}
                    </div>
                    <h2 className="text-base font-semibold text-slate-900 truncate mt-0.5">
                      {selected.title || 'Pagină nouă fără titlu'}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selected.id && selected.pageType === 'custom_code' && (
                      <button
                        type="button"
                        onClick={() => selected.id && handleDelete(selected.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Șterge</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Se salvează...' : 'Salvează pagina & SEO'}</span>
                    </button>
                  </div>
                </div>

                {message && (
                  <div
                    className={`px-4 py-2.5 rounded-lg text-xs border ${
                      message.type === 'ok'
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nume pagină *
                    </label>
                    <input
                      type="text"
                      required
                      value={selected.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setSelected((prev) =>
                          prev
                            ? {
                                ...prev,
                                title,
                                slug:
                                  !prev.id && prev.pageType === 'custom_code'
                                    ? slugifyPath(title)
                                    : prev.slug,
                              }
                            : prev
                        );
                      }}
                      placeholder="ex: Condiții Garanție"
                      className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={selected.pageType === 'core'}
                      value={selected.slug}
                      onChange={(e) =>
                        setSelected((prev) =>
                          prev ? { ...prev, slug: e.target.value } : prev
                        )
                      }
                      className="w-full px-3 py-2 text-sm font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg disabled:opacity-60 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end pb-2">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.isPublished}
                        onChange={(e) =>
                          setSelected((prev) =>
                            prev ? { ...prev, isPublished: e.target.checked } : prev
                          )
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Publicată</span>
                    </label>
                  </div>
                </div>

                {/* Tab switch */}
                <div className="flex items-center gap-1 p-1 bg-[#EAF2FC] rounded-lg w-fit">
                  {selected.pageType === 'custom_code' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('code')}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        activeTab === 'code'
                          ? 'bg-white text-blue-900 shadow-xs'
                          : 'text-slate-600 hover:text-blue-900'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Cod Pagină (HTML / CSS) &amp; Preview</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('seo')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'seo'
                        ? 'bg-white text-blue-900 shadow-xs'
                        : 'text-slate-600 hover:text-blue-900'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Setări SEO Pagină</span>
                  </button>
                </div>
              </div>

              {activeTab === 'code' && selected.pageType === 'custom_code' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800">
                          Cod HTML Pagină
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setSelected((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    codeContent: DEFAULT_HTML_TEMPLATE,
                                    cssContent: DEFAULT_CSS_TEMPLATE,
                                  }
                                : prev
                            )
                          }
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          Încarcă șablon starter
                        </button>
                      </div>
                      <textarea
                        rows={12}
                        value={selected.codeContent}
                        onChange={(e) =>
                          setSelected((prev) =>
                            prev ? { ...prev, codeContent: e.target.value } : prev
                          )
                        }
                        placeholder="<section>...</section>"
                        className="w-full p-3 text-xs font-mono leading-relaxed bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                      <label className="block text-xs font-semibold text-slate-800">
                        Stiluri CSS Pagină
                      </label>
                      <textarea
                        rows={12}
                        value={selected.cssContent}
                        onChange={(e) =>
                          setSelected((prev) =>
                            prev ? { ...prev, cssContent: e.target.value } : prev
                          )
                        }
                        placeholder="body { ... }"
                        className="w-full p-3 text-xs font-mono leading-relaxed bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 bg-[#F4F8FD] flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Previzualizare Live Pagină ({selected.slug})</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Izolat în sandbox sigur
                      </span>
                    </div>
                    <iframe
                      title={`Previzualizare ${selected.title}`}
                      sandbox=""
                      srcDoc={srcDoc}
                      className="w-full h-80 bg-white border-0"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'seo' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">
                          Titlu SEO (Title Tag)
                        </label>
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            selected.seoTitle.length > 60 ? 'text-amber-600' : 'text-slate-400'
                          }`}
                        >
                          {selected.seoTitle.length} / 60
                        </span>
                      </div>
                      <input
                        type="text"
                        value={selected.seoTitle}
                        onChange={(e) =>
                          setSelected((prev) =>
                            prev ? { ...prev, seoTitle: e.target.value } : prev
                          )
                        }
                        placeholder="Titlu optimizat pentru Google"
                        className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">
                          Meta Descriere
                        </label>
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            selected.seoDescription.length > 160
                              ? 'text-amber-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {selected.seoDescription.length} / 160
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={selected.seoDescription}
                        onChange={(e) =>
                          setSelected((prev) =>
                            prev ? { ...prev, seoDescription: e.target.value } : prev
                          )
                        }
                        placeholder="Descrierea scurtă afișată în rezultatele de căutare..."
                        className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Cuvinte cheie (separate prin virgulă)
                      </label>
                      <input
                        type="text"
                        value={selected.seoKeywords}
                        onChange={(e) =>
                          setSelected((prev) =>
                            prev ? { ...prev, seoKeywords: e.target.value } : prev
                          )
                        }
                        placeholder="ex: iluminat, oferte b2b, mobilier"
                        className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          URL Canonic
                        </label>
                        <input
                          type="text"
                          value={selected.canonicalUrl}
                          onChange={(e) =>
                            setSelected((prev) =>
                              prev ? { ...prev, canonicalUrl: e.target.value } : prev
                            )
                          }
                          placeholder="https://..."
                          className="w-full px-3 py-2 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Imagine OpenGraph (Social Share)
                        </label>
                        <input
                          type="text"
                          value={selected.ogImageUrl}
                          onChange={(e) =>
                            setSelected((prev) =>
                              prev ? { ...prev, ogImageUrl: e.target.value } : prev
                            )
                          }
                          placeholder="https://... sau /src/assets/..."
                          className="w-full px-3 py-2 text-xs font-mono bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.noIndex}
                        onChange={(e) =>
                          setSelected((prev) =>
                            prev ? { ...prev, noIndex: e.target.checked } : prev
                          )
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Exclude din motoarele de căutare (noindex, nofollow)</span>
                    </label>
                  </div>

                  <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Previzualizare Google SERP
                    </h3>
                    <div className="p-4 border border-blue-100 rounded-lg bg-[#F4F8FD] space-y-1">
                      <div className="text-xs text-slate-500 truncate font-mono">
                        {serpUrl}
                      </div>
                      <div className="text-base font-medium text-blue-700 leading-snug">
                        {serpTitle}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {serpDesc}
                      </p>
                    </div>
                    {selected.ogImageUrl && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-slate-600">
                          Card Social Media (OG Image)
                        </div>
                        <ProductImage
                          src={selected.ogImageUrl}
                          alt={serpTitle}
                          className="w-full h-36 rounded-lg border border-slate-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
