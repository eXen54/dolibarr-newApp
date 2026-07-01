import { useState, useEffect } from "react";
import {
  Activity,
  Users,
  FileText,
  Wallet,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import {
  getSalaries,
  getEmployees,
  getPayments,
} from "../../services/backoffice/dolibarr.js";
import {
  fmtMoney,
  fmtMoneyShort,
  fmtDate,
  genderLabel,
  monthKey,
  monthLabel,
  monthShort,
  paidForSalary,
} from "../../services/format.js";
import Modal from "../../components/Modal.jsx";

// Petite carte "métrique" secondaire.
const MetricCard = ({ title, value, sub, icon: Icon, color }) => (
  <div className="card-modern p-6">
    <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-4`}>
      <Icon size={22} />
    </div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
      {title}
    </p>
    <h3 className="text-2xl font-black text-slate-900">{value}</h3>
    {sub && <p className="text-xs font-semibold text-slate-400 mt-1">{sub}</p>}
  </div>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [detail, setDetail] = useState(null); // null | {type:'genre'} | {type:'mois', key}

  useEffect(() => {
    (async () => {
      try {
        const [sal, emp, pay] = await Promise.all([
          getSalaries(),
          getEmployees(),
          getPayments(),
        ]);
        setSalaries(sal);
        setEmployees(emp);
        setPayments(pay);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  // --- Maps ---
  const empById = {};
  employees.forEach((e) => (empById[e.id] = e));
  const salaryById = {};
  salaries.forEach((s) => (salaryById[s.id] = s));

  const employeeName = (userId) => {
    const e = empById[userId];
    if (!e) return `Employé ${userId}`;
    return `${e.firstname ?? ""} ${e.lastname ?? e.login ?? ""}`.trim();
  };

  const pct = (part, total) => (total > 0 ? (part / total) * 100 : 0);

  // --- Par genre : salaire DÛ (montant des fiches) et salaire PAYÉ (règlements) ---
  const genres = {
    man: { label: "Hommes", color: "bg-blue-600", light: "bg-blue-200", du: 0, paye: 0, nbFiches: 0, nbEmp: 0 },
    woman: { label: "Femmes", color: "bg-pink-500", light: "bg-pink-200", du: 0, paye: 0, nbFiches: 0, nbEmp: 0 },
  };
  employees.forEach((e) => {
    if (genres[e.gender]) genres[e.gender].nbEmp++;
  });
  salaries.forEach((s) => {
    const g = empById[s.fk_user]?.gender;
    if (genres[g]) {
      genres[g].du += Number(s.amount || 0);
      genres[g].paye += paidForSalary(payments, s.id);
      genres[g].nbFiches++;
    }
  });
  const totalDuG = genres.man.du + genres.woman.du;
  const totalPayeG = genres.man.paye + genres.woman.paye;
  const maxGenre = Math.max(genres.man.du, genres.man.paye, genres.woman.du, genres.woman.paye, 1);

  // --- Par mois : DÛ (par mois de début de période) et PAYÉ (par date de règlement) ---
  const parMois = {}; // key -> { du, paye }
  const ensureMonth = (k) => (parMois[k] ||= { du: 0, paye: 0 });
  salaries.forEach((s) => {
    const k = monthKey(s.datesp);
    if (k !== "?") ensureMonth(k).du += Number(s.amount || 0);
  });
  payments.forEach((p) => {
    const k = monthKey(p.datep);
    if (k !== "?") ensureMonth(k).paye += Number(p.amount || 0);
  });
  const moisKeys = Object.keys(parMois).sort();
  const maxMois = Math.max(
    ...moisKeys.map((k) => Math.max(parMois[k].du, parMois[k].paye)),
    1,
  );

  // --- Métriques ---
  const masse = salaries.reduce((a, s) => a + Number(s.amount || 0), 0);
  const totalPaye = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
  const reste = masse - totalPaye;

  // --- Tableaux ---
  const derniersSalaires = [...salaries].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 6);
  const derniersReglements = [...payments].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 6);

  return (
    <div className="space-y-10 animate-slide-up">
      <header>
        <div className="flex items-center gap-2 text-blue-600 mb-2">
          <Activity size={16} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">
            Tableau de bord
          </span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
          Gestion des salaires
        </h1>
      </header>

      {/* 2 cartes mises en valeur (cliquables) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Par genre : barre empilée comparant chaque genre au total */}
        <button
          onClick={() => setDetail({ type: "genre" })}
          className="text-left bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-black text-slate-900">
              Montant des salaires par genre
            </h3>
            <ChevronRight size={20} className="text-slate-300" />
          </div>
          <p className="text-sm text-slate-400">Cliquez pour le détail par employé</p>

          {/* Totaux dû / payé */}
          <div className="flex gap-6 mt-4 mb-2">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dû</p>
              <p className="text-2xl font-black text-slate-900">{fmtMoney(totalDuG)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Payé</p>
              <p className="text-2xl font-black text-slate-900">{fmtMoney(totalPayeG)}</p>
            </div>
          </div>

          {/* Barres groupées Dû / Payé par genre (échelle commune) */}
          <div className="space-y-4 mt-5">
            {["man", "woman"].map((g) => (
              <div key={g}>
                <p className="text-sm font-bold text-slate-700 mb-1.5">
                  {genres[g].label}
                  <span className="text-slate-400 font-medium">
                    {" "}· {genres[g].nbEmp} empl. · {genres[g].nbFiches} fiches
                  </span>
                </p>
                {/* Dû */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-9 text-[10px] font-bold text-slate-400">Dû</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden">
                    <div className={`h-full rounded-full ${genres[g].light}`} style={{ width: `${pct(genres[g].du, maxGenre)}%` }} />
                  </div>
                  <span className="w-24 text-right text-xs font-semibold text-slate-600">
                    {fmtMoney(genres[g].du)}
                  </span>
                </div>
                {/* Payé */}
                <div className="flex items-center gap-2">
                  <span className="w-9 text-[10px] font-bold text-slate-400">Payé</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden">
                    <div className={`h-full rounded-full ${genres[g].color}`} style={{ width: `${pct(genres[g].paye, maxGenre)}%` }} />
                  </div>
                  <span className="w-24 text-right text-xs font-semibold text-slate-600">
                    {fmtMoney(genres[g].paye)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </button>

        {/* Par mois : colonnes groupées Dû / Payé (mois en abscisse, montant en ordonnée) */}
        <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-sm">
          <h3 className="text-lg font-black mb-1">Salaires dû / payé par mois</h3>
          <p className="text-sm text-slate-400">
            Payé = date de règlement · Dû = mois de la fiche — cliquez un mois
          </p>

          {/* Totaux + légende */}
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mt-4 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dû</p>
              <p className="text-2xl font-black">{fmtMoney(masse)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-green-400 uppercase tracking-wider">Payé</p>
              <p className="text-2xl font-black">{fmtMoney(totalPaye)}</p>
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white/25" /> Dû
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-400" /> Payé
              </span>
            </div>
          </div>

          {moisKeys.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucune donnée.</p>
          ) : (
            <>
              {/* Colonnes groupées (hauteur = montant) */}
              <div className="flex items-end justify-around gap-4 border-b border-white/10 h-[160px]">
                {moisKeys.map((k) => {
                  const duPx = parMois[k].du > 0 ? Math.max(Math.round((parMois[k].du / maxMois) * 150), 4) : 0;
                  const payePx = parMois[k].paye > 0 ? Math.max(Math.round((parMois[k].paye / maxMois) * 150), 4) : 0;
                  return (
                    <button
                      key={k}
                      onClick={() => setDetail({ type: "mois", key: k })}
                      title={`Dû ${fmtMoney(parMois[k].du)} · Payé ${fmtMoney(parMois[k].paye)}`}
                      className="group flex-1 h-full flex items-end justify-center gap-1.5"
                    >
                      <div className="w-4 rounded-t bg-white/25 group-hover:bg-white/40 transition-all" style={{ height: `${duPx}px` }} />
                      <div className="w-4 rounded-t bg-green-400 group-hover:bg-green-300 transition-all" style={{ height: `${payePx}px` }} />
                    </button>
                  );
                })}
              </div>
              {/* Abscisse : mois + montant payé */}
              <div className="flex justify-around gap-4 mt-3">
                {moisKeys.map((k) => (
                  <div key={k} className="flex-1 text-center">
                    <p className="text-xs font-semibold capitalize">{monthShort(k)}</p>
                    <p className="text-[10px] text-slate-400">{fmtMoneyShort(parMois[k].paye)} payé</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4 métriques secondaires */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Employés"
          value={employees.length}
          sub={`${genres.man.nbEmp} H · ${genres.woman.nbEmp} F`}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />
        <MetricCard
          title="Fiches de salaire"
          value={salaries.length}
          icon={FileText}
          color="bg-purple-50 text-purple-600"
        />
        <MetricCard
          title="Masse salariale"
          value={fmtMoney(masse)}
          icon={Wallet}
          color="bg-orange-50 text-orange-600"
        />
        <MetricCard
          title="Total payé"
          value={fmtMoney(totalPaye)}
          sub={`Reste à payer : ${fmtMoney(reste)}`}
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
        />
      </div>

      {/* 2 tableaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <h3 className="text-lg font-black text-slate-900 p-6 pb-4">Derniers salaires</h3>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-bold px-6 py-3">Employé</th>
                <th className="text-right font-bold px-6 py-3">Montant</th>
                <th className="text-right font-bold px-6 py-3">Reste</th>
              </tr>
            </thead>
            <tbody>
              {derniersSalaires.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-6 text-center text-slate-400">
                    Aucun salaire
                  </td>
                </tr>
              )}
              {derniersSalaires.map((s) => {
                const r = Number(s.amount || 0) - paidForSalary(payments, s.id);
                return (
                  <tr key={s.id} className="border-t border-slate-50">
                    <td className="px-6 py-3 font-semibold text-slate-700">
                      {employeeName(s.fk_user)}
                    </td>
                    <td className="px-6 py-3 text-right">{fmtMoney(s.amount)}</td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {r <= 0 ? (
                        <span className="text-green-600">Payé</span>
                      ) : (
                        <span className="text-orange-600">{fmtMoney(r)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <h3 className="text-lg font-black text-slate-900 p-6 pb-4">Derniers règlements</h3>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-bold px-6 py-3">Date</th>
                <th className="text-left font-bold px-6 py-3">Employé</th>
                <th className="text-right font-bold px-6 py-3">Montant</th>
              </tr>
            </thead>
            <tbody>
              {derniersReglements.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-6 text-center text-slate-400">
                    Aucun règlement
                  </td>
                </tr>
              )}
              {derniersReglements.map((p) => (
                <tr key={p.id} className="border-t border-slate-50">
                  <td className="px-6 py-3 text-slate-500">{fmtDate(p.datep)}</td>
                  <td className="px-6 py-3 font-semibold text-slate-700">
                    {employeeName(salaryById[p.fk_salary]?.fk_user)}
                  </td>
                  <td className="px-6 py-3 text-right">{fmtMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modales de détail (drill-down) --- */}
      {detail?.type === "genre" && (
        <Modal title="Détail des salaires par genre" onClose={() => setDetail(null)} maxWidth="max-w-3xl">
          {["man", "woman"].map((g) => {
            const list = employees.filter((e) => e.gender === g);
            return (
              <div key={g} className="mb-8 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-slate-900">{genderLabel(g)}</h4>
                  <span className="text-sm font-bold text-slate-500">
                    Dû <span className="text-slate-900">{fmtMoney(genres[g].du)}</span>
                    {" · "}Payé <span className="text-green-600">{fmtMoney(genres[g].paye)}</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MiniStat label="Employés" value={genres[g].nbEmp} />
                  <MiniStat label="Fiches" value={genres[g].nbFiches} />
                  <MiniStat
                    label="Reste à payer"
                    value={fmtMoney(Math.max(genres[g].du - genres[g].paye, 0))}
                  />
                </div>
                <table className="w-full text-sm rounded-2xl border border-slate-100 overflow-hidden">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left font-bold px-4 py-2.5">Employé</th>
                      <th className="text-right font-bold px-4 py-2.5">Fiches</th>
                      <th className="text-right font-bold px-4 py-2.5">Salaire dû</th>
                      <th className="text-right font-bold px-4 py-2.5">Payé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((e) => {
                      const mySal = salaries.filter((s) => String(s.fk_user) === String(e.id));
                      const total = mySal.reduce((a, s) => a + Number(s.amount || 0), 0);
                      const paye = mySal.reduce((a, s) => a + paidForSalary(payments, s.id), 0);
                      return (
                        <tr key={e.id} className="border-t border-slate-50">
                          <td className="px-4 py-2.5 font-semibold text-slate-700">
                            {e.lastname ?? e.login}
                          </td>
                          <td className="px-4 py-2.5 text-right">{mySal.length}</td>
                          <td className="px-4 py-2.5 text-right">{fmtMoney(total)}</td>
                          <td className="px-4 py-2.5 text-right text-green-600">{fmtMoney(paye)}</td>
                        </tr>
                      );
                    })}
                    {list.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                          Aucun employé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </Modal>
      )}

      {detail?.type === "mois" && (
        <Modal
          title={`Règlements — ${monthLabel(detail.key)}`}
          onClose={() => setDetail(null)}
        >
          <div className="grid grid-cols-2 gap-3 mb-5">
            <MiniStat label="Salaire dû (fiches du mois)" value={fmtMoney(parMois[detail.key]?.du)} />
            <MiniStat label="Payé (règlements du mois)" value={fmtMoney(parMois[detail.key]?.paye)} />
          </div>
          <p className="text-sm font-bold text-slate-500 mb-3">Règlements du mois</p>
          <table className="w-full text-sm rounded-2xl border border-slate-100 overflow-hidden">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-bold px-4 py-2.5">Date</th>
                <th className="text-left font-bold px-4 py-2.5">Employé</th>
                <th className="text-left font-bold px-4 py-2.5">Mode</th>
                <th className="text-right font-bold px-4 py-2.5">Montant</th>
              </tr>
            </thead>
            <tbody>
              {payments
                .filter((p) => monthKey(p.datep) === detail.key)
                .map((p) => (
                  <tr key={p.id} className="border-t border-slate-50">
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(p.datep)}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-700">
                      {employeeName(salaryById[p.fk_salary]?.fk_user)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {p.type_label || p.type_code || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmtMoney(p.amount)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}

const MiniStat = ({ label, value }) => (
  <div className="bg-slate-50 rounded-2xl p-3 text-center">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <p className="font-black text-sm text-slate-900">{value}</p>
  </div>
);
