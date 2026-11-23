import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { BlogPostRecord } from '../types/commerce';

function slugify(val: string): string {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function BlogWorkspace() {
  const { authFetch } = useAuth();
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPostRecord | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Design Interior');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/blog');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/admin/blog', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          slug: slugify(title) || `articol-${Date.now()}`,
          category: category.trim() || 'Ghiduri',
          status: 'published',
          excerpt: excerpt.trim(),
          content: content.trim(),
          seoTitle: seoTitle.trim(),
          seoDescription: seoDescription.trim(),
          seoKeywords: seoKeywords.trim(),
        }),
      });
      if (res.ok) {
        setShowNew(false);
        setTitle('');
        setExcerpt('');
        setContent('');
        setSeoTitle('');
        setSeoDescription('');
        setSeoKeywords('');
        await loadPosts();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/blog/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editing.title,
          category: editing.category,
          status: editing.status,
          excerpt: editing.excerpt,
          content: editing.content,
          seoTitle: editing.seoTitle || '',
          seoDescription: editing.seoDescription || '',
          seoKeywords: editing.seoKeywords || '',
        }),
      });
      if (res.ok) {
        setEditing(null);
        await loadPosts();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Blog &amp; Articole
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Publică articole editoriale și configurează titlul și meta descrierea SEO pentru fiecare articol.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowNew((v) => !v);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Articol nou</span>
        </button>
      </div>

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Articol nou</h2>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Titlu articol *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Cum alegi mobilierul și iluminatul pentru birouri"
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Categorie
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Rezumat scurt
            </label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Scurt rezumat afișat în lista de articole..."
              className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Conținut articol
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Textul complet al articolului..."
              className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Titlu SEO
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Opțional (implicit titlul)"
                className="w-full px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Meta Descriere SEO
              </label>
              <input
                type="text"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Descriere Google..."
                className="w-full px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cuvinte cheie SEO
              </label>
              <input
                type="text"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                placeholder="design, birou, ghid"
                className="w-full px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Se publică...' : 'Publică articol'}</span>
            </button>
          </div>
        </form>
      )}

      {editing && (
        <form
          onSubmit={handleSaveEdit}
          className="bg-white border border-blue-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Editează articol &amp; SEO: {editing.title}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Titlu articol *
              </label>
              <input
                type="text"
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Categorie &amp; Status
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
                />
                <select
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value as 'published' | 'draft',
                    })
                  }
                  className="px-2.5 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg"
                >
                  <option value="published">Publicat</option>
                  <option value="draft">Ciornă</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Rezumat
            </label>
            <input
              type="text"
              value={editing.excerpt}
              onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Conținut
            </label>
            <textarea
              rows={5}
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#F4F8FD] border border-slate-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Titlu SEO
              </label>
              <input
                type="text"
                value={editing.seoTitle ?? ''}
                onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Meta Descriere SEO
              </label>
              <input
                type="text"
                value={editing.seoDescription ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, seoDescription: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cuvinte cheie SEO
              </label>
              <input
                type="text"
                value={editing.seoKeywords ?? ''}
                onChange={(e) => setEditing({ ...editing, seoKeywords: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Se salvează...' : 'Salvează articolul'}</span>
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Se încarcă articolele...</div>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nu există articole publicate încă.
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="p-5 flex items-start justify-between gap-4 hover:bg-blue-50/30 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {post.title}
                </div>
                <div className="text-xs text-blue-600 font-mono mt-0.5">
                  /blog/{post.slug} · {post.category} ·{' '}
                  {post.status === 'published' ? 'Publicat' : 'Ciornă'}
                </div>
                {post.excerpt && (
                  <p className="text-xs text-slate-600 mt-1.5">{post.excerpt}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowNew(false);
                    setEditing(post);
                  }}
                  aria-label={`Editează ${post.title}`}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await authFetch(`/api/admin/blog/${post.id}`, {
                      method: 'DELETE',
                    });
                    await loadPosts();
                  }}
                  aria-label={`Șterge ${post.title}`}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
