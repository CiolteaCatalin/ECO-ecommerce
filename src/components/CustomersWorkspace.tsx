import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney, type CustomerRecord } from '../types/commerce';
import { GenericModulePanel } from './GenericModulePanel';

interface CustomersWorkspaceProps {
  subPageId: string;
}

const MODULE_MAP: Record<
  string,
  { moduleKey: string; title: string; description: string; codeLabel: string }
> = {
  'grupuri-clienti': {
    moduleKey: 'customer_groups',
    title: 'Grupuri de clienți',
    description: 'Segmentează clienții B2B, VIP și Retail pentru praguri de preț și reguli dedicate.',
    codeLabel: 'Cod Grup',
  },
  'cosuri-abandonate': {
    moduleKey: 'abandoned_carts',
    title: 'Coșuri abandonate',
    description: 'Vizualizează coșurile nefinalizate și declanșează notificări de recuperare.',
    codeLabel: 'Email Client',
  },
  'reguli-blacklist': {
    moduleKey: 'blacklist_rules',
    title: 'Reguli Blacklist',
    description: 'Restricționează adrese IP, emailuri sau numere de telefon cu risc ridicat de neridicare.',
    codeLabel: 'Criteriu Blocare',
  },
  'marturii-clienti': {
    moduleKey: 'testimonials',
    title: 'Mărturii clienți',
    description: 'Administrează testimonialele afișate pe paginile de produs și homepage.',
    codeLabel: 'Autor',
  },
  'feeduri-clienti': {
    moduleKey: 'customer_feeds',
    title: 'Feed-uri de clienți',
    description: 'Sincronizează segmentele de clienți către CRM și platforme de email marketing.',
    codeLabel: 'Destinație',
  },
  'solicitari-feedback': {
    moduleKey: 'feedback_requests',
    title: 'Solicitări feedback',
    description: 'Programează și monitorizează cererile automate de evaluare post-livrare.',
    codeLabel: 'Trigger',
  },
  'feedback-clienti': {
    moduleKey: 'customer_feedback',
    title: 'Feedback clienți',
    description: 'Răspunde la evaluările și scorurile primite de la cumpărători.',
    codeLabel: 'Notă / Scor',
  },
  'mesaje-contact': {
    moduleKey: 'contact_messages',
    title: 'Mesaje contact',
    description: 'Gestionează tichetele și mesajele trimise prin pagina de contact.',
    codeLabel: 'Email Expeditor',
  },
  'emailuri-trimise': {
    moduleKey: 'sent_emails',
    title: 'Emailuri trimise',
    description: 'Jurnalul emailurilor tranzacționale și de marketing livrate către clienți.',
    codeLabel: 'Destinatar',
  },
};

type SegmentTab = 'all' | 'recurring' | 'newsletter' | 'blacklisted';

export function CustomersWorkspace({ subPageId }: CustomersWorkspaceProps) {
  const { authFetch } = useAuth();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<SegmentTab>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Multi-field search
  const [filterNameEmail, setFilterNameEmail] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterCityGroup, setFilterCityGroup] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [groupName, setGroupName] = useState('Clienți Standard');
  const [city, setCity] = useState('București');
  const [newsletter, setNewsletter] = useState(true);

  const moduleDef = MODULE_MAP[subPageId];

  useEffect(() => {
    if (subPageId === 'abonati-newsletter') {
      setSegment('newsletter');
    } else {
      setSegment('all');
    }
  }, [subPageId]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/customers');
      const data = await res.json();
      if (res.ok) setCustomers(data.customers ?? []);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!moduleDef) {
      loadCustomers();
    }
  }, [moduleDef, loadCustomers]);

  const visible = useMemo(() => {
    return customers.filter((c) => {
      if (segment === 'newsletter' && !c.newsletterSubscribed) return false;
      if (segment === 'recurring' && c.ordersCount < 2) return false;
      if (segment === 'blacklisted' && !c.isBlacklisted) return false;

      if (
        filterNameEmail.trim() &&
        !c.fullName.toLowerCase().includes(filterNameEmail.trim().toLowerCase()) &&
        !c.email.toLowerCase().includes(filterNameEmail.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        filterPhone.trim() &&
        !c.phone.toLowerCase().includes(filterPhone.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        filterCityGroup.trim() &&
        !c.city.toLowerCase().includes(filterCityGroup.trim().toLowerCase()) &&
        !c.groupName.toLowerCase().includes(filterCityGroup.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [customers, segment, filterNameEmail, filterPhone, filterCityGroup]);

  if (moduleDef) {
    return (
      <GenericModulePanel
        moduleKey={moduleDef.moduleKey}
        title={moduleDef.title}
        description={moduleDef.description}
        codeLabel={moduleDef.codeLabel}
      />
    );
  }

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    const res = await authFetch('/api/admin/customers', {
      method: 'POST',
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        groupName,
        city,
        newsletterSubscribed: newsletter,
      }),
    });
    if (res.ok) {
      setShowAdd(false);
      setFullName('');
      setEmail('');
      setPhone('');
      await loadCustomers();
    }
  };

  const handleToggle = async (
    id: number,
    field: 'isBlacklisted' | 'newsletterSubscribed',
    value: boolean
  ) => {
    await authFetch(`/api/admin/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ field, value }),
    });
    await loadCustomers();
  };

  const isNewsletterView = subPageId === 'abonati-newsletter';
  const isAuthHistoryView = subPageId === 'istoric-autentificari';

  const heading = isNewsletterView
    ? 'Abonați newsletter'
    : isAuthHistoryView
    ? 'Istoric autentificări'
    : 'Clienți';

  const subtitle = isNewsletterView
    ? 'Lista clienților cu acord activ pentru campanii email și noutăți.'
    : isAuthHistoryView
    ? 'Ultimele sesiuni de autentificare ale conturilor de client în magazin.'
    : 'Baza de clienți, grupurile comerciale și istoricul valoric al comenzilor.';

  const segmentTabs: Array<{ key: SegmentTab; label: string }> = [
    { key: 'all', label: `Toți clienții (${customers.length})` },
    {
      key: 'recurring',
      label: `Clienți recurenți (${customers.filter((c) => c.ordersCount >= 2).length})`,
    },
    {
      key: 'newsletter',
      label: `Abonați newsletter (${customers.filter((c) => c.newsletterSubscribed).length})`,
    },
    {
      key: 'blacklisted',
      label: `Blocați (${customers.filter((c) => c.isBlacklisted).length})`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-teal-900/10 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-teal-900/10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0F2928]">{heading}</h2>
              <p className="text-sm text-slate-600 mt-0.5">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adaugă client</span>
            </button>
          </div>

          {/* Segment tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#E7F3F1] rounded-lg w-fit overflow-x-auto max-w-full">
            {segmentTabs.map((tab) => {
              const active = segment === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSegment(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-teal-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Multi-field filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <input
              type="text"
              value={filterNameEmail}
              onChange={(e) => setFilterNameEmail(e.target.value)}
              placeholder="Nume sau Email..."
              className="px-3 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
            />
            <input
              type="text"
              value={filterPhone}
              onChange={(e) => setFilterPhone(e.target.value)}
              placeholder="Telefon..."
              className="px-3 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
            />
            <input
              type="text"
              value={filterCityGroup}
              onChange={(e) => setFilterCityGroup(e.target.value)}
              placeholder="Oraș sau Grup (B2B / VIP)..."
              className="px-3 py-2 text-xs bg-[#F7FBFA] border border-teal-900/15 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
            />
            <button
              type="button"
              onClick={() => {
                setFilterNameEmail('');
                setFilterPhone('');
                setFilterCityGroup('');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-[#F7FBFA] hover:bg-teal-50 border border-teal-900/15 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetează</span>
            </button>
          </div>
        </div>

        {showAdd && (
          <form
            onSubmit={handleAddCustomer}
            className="p-5 bg-[#F7FBFA] border-b border-teal-900/10 grid grid-cols-1 md:grid-cols-6 gap-3 items-center"
          >
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nume complet *"
              className="px-3 py-2 text-sm bg-white border border-teal-900/15 rounded-lg"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email *"
              className="px-3 py-2 text-sm bg-white border border-teal-900/15 rounded-lg"
            />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefon"
              className="px-3 py-2 text-sm bg-white border border-teal-900/15 rounded-lg"
            />
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Grup"
              className="px-3 py-2 text-sm bg-white border border-teal-900/15 rounded-lg"
            />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Oraș"
              className="px-3 py-2 text-sm bg-white border border-teal-900/15 rounded-lg"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                />
                <span>NL</span>
              </label>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                Salvează
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="p-8 text-sm text-slate-500">Se încarcă clienții...</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nu există clienți care să corespundă criteriilor selectate.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-teal-900/10 bg-[#F7FBFA] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Client</th>
                  <th className="py-2.5 px-4">Grup / Oraș</th>
                  <th className="py-2.5 px-4 text-right">Comenzi</th>
                  <th className="py-2.5 px-4 text-right">Total Cheltuit</th>
                  <th className="py-2.5 px-4">Newsletter</th>
                  <th className="py-2.5 px-4">Blacklist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-900/5">
                {visible.map((c) => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="inline-flex items-center gap-1.5 text-left font-medium text-[#0F2928] hover:text-teal-700"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>{c.fullName}</span>
                          </button>
                          <div className="text-xs text-slate-500 font-mono pl-5">
                            {c.email} {c.phone ? `· ${c.phone}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="text-slate-800">{c.groupName}</div>
                          <div className="text-slate-500">{c.city}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {c.ordersCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#0F2928]">
                          {formatMoney(c.totalSpentCents, 'RON')}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggle(
                                c.id,
                                'newsletterSubscribed',
                                !c.newsletterSubscribed
                              )
                            }
                            className={`text-xs font-medium ${
                              c.newsletterSubscribed
                                ? 'text-teal-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {c.newsletterSubscribed ? 'Abonat' : 'Neabonat'}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggle(c.id, 'isBlacklisted', !c.isBlacklisted)
                            }
                            className={`text-xs font-medium ${
                              c.isBlacklisted ? 'text-red-600' : 'text-slate-500'
                            }`}
                          >
                            {c.isBlacklisted ? 'Blocat' : 'Activ'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#F7FBFA]">
                          <td colSpan={6} className="px-6 py-3.5 text-xs text-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <span className="font-semibold text-[#0F2928]">Contact:</span>{' '}
                                {c.email} · {c.phone || 'Fără telefon'}
                              </div>
                              <div>
                                <span className="font-semibold text-[#0F2928]">Localitate &amp; Grup:</span>{' '}
                                {c.city} · {c.groupName}
                              </div>
                              <div>
                                <span className="font-semibold text-[#0F2928]">Ultima autentificare:</span>{' '}
                                <span className="font-mono">
                                  {c.lastLoginAt
                                    ? new Date(c.lastLoginAt).toLocaleString('ro-RO')
                                    : new Date(c.createdAt).toLocaleString('ro-RO')}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
