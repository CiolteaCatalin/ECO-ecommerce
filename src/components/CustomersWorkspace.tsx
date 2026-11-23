import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney, type CustomerRecord } from '../types/commerce';
import { GenericModulePanel } from './GenericModulePanel';

export type CustomerSubpageKey =
  | 'toti'
  | 'recurenti'
  | 'newsletter'
  | 'cosuri-abandonate';

type SegmentTab = 'all' | 'recurring' | 'newsletter' | 'blacklisted' | 'abandoned';

interface CustomersWorkspaceProps {
  initialSubpage?: CustomerSubpageKey;
}

function mapSubpageToSegment(sub: CustomerSubpageKey): SegmentTab {
  if (sub === 'recurenti') return 'recurring';
  if (sub === 'newsletter') return 'newsletter';
  if (sub === 'cosuri-abandonate') return 'abandoned';
  return 'all';
}

export function CustomersWorkspace({
  initialSubpage = 'toti',
}: CustomersWorkspaceProps) {
  const { authFetch } = useAuth();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<SegmentTab>(
    mapSubpageToSegment(initialSubpage)
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setSegment(mapSubpageToSegment(initialSubpage));
  }, [initialSubpage]);

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
    loadCustomers();
  }, [loadCustomers]);

  const visible = useMemo(() => {
    return customers.filter((c) => {
      if (segment === 'newsletter' && !c.newsletterSubscribed) return false;
      if (segment === 'recurring' && c.ordersCount < 2) return false;
      if (segment === 'blacklisted' && !c.isBlacklisted) return false;

      if (
        filterNameEmail.trim() &&
        !c.fullName
          .toLowerCase()
          .includes(filterNameEmail.trim().toLowerCase()) &&
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
    {
      key: 'abandoned',
      label: 'Coșuri abandonate',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Clienți</h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Baza de clienți, grupurile B2B/VIP, abonările la newsletter și istoricul valoric al comenzilor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adaugă client</span>
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#EAF2FC] rounded-lg w-fit overflow-x-auto max-w-full">
            {segmentTabs.map((tab) => {
              const active = segment === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSegment(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-blue-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <input
              type="text"
              value={filterNameEmail}
              onChange={(e) => setFilterNameEmail(e.target.value)}
              placeholder="Nume sau Email..."
              className="px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
            />
            <input
              type="text"
              value={filterPhone}
              onChange={(e) => setFilterPhone(e.target.value)}
              placeholder="Telefon..."
              className="px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
            />
            <input
              type="text"
              value={filterCityGroup}
              onChange={(e) => setFilterCityGroup(e.target.value)}
              placeholder="Oraș sau Grup (B2B / VIP)..."
              className="px-3 py-2 text-xs bg-[#F4F8FD] border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                setFilterNameEmail('');
                setFilterPhone('');
                setFilterCityGroup('');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-[#F4F8FD] hover:bg-blue-50 border border-slate-200 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetează</span>
            </button>
          </div>
        </div>

        {segment === 'abandoned' ? (
          <div className="p-5 bg-[#F4F8FD]">
            <GenericModulePanel
              moduleKey="abandoned_carts"
              title="Coșuri abandonate"
              description="Monitorizează coșurile nefinalizate și codurile de recuperare trimise clienților."
              codeLabel="Email client / Token coș"
              codePlaceholder="client@exemplu.ro"
              extraPlaceholder='{"totalRon": 450, "produse": 2}'
            />
          </div>
        ) : (
          <>
        {showAdd && (
          <form
            onSubmit={handleAddCustomer}
            className="p-5 bg-[#F4F8FD] border-b border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 items-center"
          >
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nume complet *"
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email *"
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefon"
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Grup"
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Oraș"
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
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
                className="flex-1 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
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
                <tr className="border-b border-slate-200 bg-[#F4F8FD] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Client</th>
                  <th className="py-2.5 px-4">Grup / Oraș</th>
                  <th className="py-2.5 px-4 text-right">Comenzi</th>
                  <th className="py-2.5 px-4 text-right">Total Cheltuit</th>
                  <th className="py-2.5 px-4">Newsletter</th>
                  <th className="py-2.5 px-4">Blacklist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((c) => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : c.id)
                            }
                            className="inline-flex items-center gap-1.5 text-left font-medium text-slate-900 hover:text-blue-700"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-700 shrink-0" />
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
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
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
                                ? 'text-blue-700'
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
                              handleToggle(
                                c.id,
                                'isBlacklisted',
                                !c.isBlacklisted
                              )
                            }
                            className={`text-xs font-medium ${
                              c.isBlacklisted
                                ? 'text-red-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {c.isBlacklisted ? 'Blocat' : 'Activ'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#F4F8FD]">
                          <td
                            colSpan={6}
                            className="px-6 py-3.5 text-xs text-slate-700"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <span className="font-semibold text-slate-900">
                                  Contact:
                                </span>{' '}
                                {c.email} · {c.phone || 'Fără telefon'}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">
                                  Localitate &amp; Grup:
                                </span>{' '}
                                {c.city} · {c.groupName}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">
                                  Ultima autentificare:
                                </span>{' '}
                                <span className="font-mono">
                                  {c.lastLoginAt
                                    ? new Date(c.lastLoginAt).toLocaleString(
                                        'ro-RO'
                                      )
                                    : new Date(c.createdAt).toLocaleString(
                                        'ro-RO'
                                      )}
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
          </>
        )}
      </div>
    </div>
  );
}
