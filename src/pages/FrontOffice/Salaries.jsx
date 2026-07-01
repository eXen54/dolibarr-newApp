import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, User, Loader2, CreditCard } from "lucide-react";
import {
  getSalaries,
  getEmployees,
  getPayments,
} from "../../services/backoffice/dolibarr.js";
import {
  fmtMoney,
  fmtDate,
  genderLabel,
  monthKey,
  monthLabel,
  paidForSalary,
  photoUrl,
} from "../../services/format.js";
import PaymentModal from "../../components/PaymentModal.jsx";

export default function Salaries() {
  const [loading, setLoading] = useState(true);
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payments, setPayments] = useState([]);

  // Critères de recherche
  const [nom, setNom] = useState("");
  const [genre, setGenre] = useState("");
  const [mois, setMois] = useState("");
  const [statut, setStatut] = useState("");
  const [montantMin, setMontantMin] = useState("");
  const [montantMax, setMontantMax] = useState("");
  const [payTarget, setPayTarget] = useState(null); // salaire à payer (modal)

  const load = useCallback(async () => {
    const [sal, emp, pay] = await Promise.all([
      getSalaries(),
      getEmployees(),
      getPayments(),
    ]);
    setSalaries(sal);
    setEmployees(emp);
    setPayments(pay);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const empById = useMemo(() => {
    const m = {};
    employees.forEach((e) => (m[e.id] = e));
    return m;
  }, [employees]);

  // Mois disponibles (d'après les dates de règlement)
  const moisDispo = useMemo(() => {
    const set = new Set(payments.map((p) => monthKey(p.datep)));
    return [...set].filter((k) => k !== "?").sort();
  }, [payments]);

  // Mois de règlement par salaire (pour le filtre "mois")
  const moisParSalaire = useMemo(() => {
    const m = {};
    payments.forEach((p) => {
      const k = monthKey(p.datep);
      (m[p.fk_salary] ||= new Set()).add(k);
    });
    return m;
  }, [payments]);

  // Liste filtrée
  const lignes = useMemo(() => {
    return salaries
      .map((s) => {
        const emp = empById[s.fk_user] || {};
        const paye = paidForSalary(payments, s.id);
        const reste = Number(s.amount || 0) - paye;
        return {
          ...s,
          emp,
          nomEmp: `${emp.firstname ?? ""} ${emp.lastname ?? emp.login ?? ""}`.trim(),
          paye,
          reste,
          isPaid: reste <= 0,
        };
      })
      .filter((l) => {
        if (nom && !l.nomEmp.toLowerCase().includes(nom.toLowerCase())) return false;
        if (genre && l.emp.gender !== genre) return false;
        if (statut === "paye" && !l.isPaid) return false;
        if (statut === "impaye" && l.isPaid) return false;
        if (mois && !(moisParSalaire[l.id]?.has(mois))) return false;
        if (montantMin && Number(l.amount) < Number(montantMin)) return false;
        if (montantMax && Number(l.amount) > Number(montantMax)) return false;
        return true;
      });
  }, [salaries, empById, payments, nom, genre, statut, mois, montantMin, montantMax, moisParSalaire]);

  const resetFilters = () => {
    setNom("");
    setGenre("");
    setMois("");
    setStatut("");
    setMontantMin("");
    setMontantMax("");
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            Salaires
          </h1>
          <p className="text-slate-500">Liste des salaires et règlements</p>
        </div>
        <Link
          to="/fo/salaires/nouveau"
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold hover:bg-black transition-all"
        >
          <Plus size={18} /> Nouveau salaire
        </Link>
      </div>

      {/* Recherche multi-critères */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom de l'employé"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
            />
          </div>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
          >
            <option value="">Tous les genres</option>
            <option value="man">Homme</option>
            <option value="woman">Femme</option>
          </select>
          <select
            value={mois}
            onChange={(e) => setMois(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
          >
            <option value="">Tous les mois (règlement)</option>
            {moisDispo.map((k) => (
              <option key={k} value={k} className="capitalize">
                {monthLabel(k)}
              </option>
            ))}
          </select>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
          >
            <option value="">Tous les statuts</option>
            <option value="paye">Payé</option>
            <option value="impaye">Non payé</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={montantMin}
              onChange={(e) => setMontantMin(e.target.value)}
              placeholder="Montant min"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
            />
            <input
              type="number"
              value={montantMax}
              onChange={(e) => setMontantMax(e.target.value)}
              placeholder="Montant max"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm font-semibold text-slate-500">
            {lignes.length} résultat(s)
          </p>
          <button
            onClick={resetFilters}
            className="text-sm font-bold text-slate-400 hover:text-slate-900"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-bold px-6 py-4">Employé</th>
                <th className="text-left font-bold px-6 py-4 hidden md:table-cell">Période</th>
                <th className="text-right font-bold px-6 py-4">Montant</th>
                <th className="text-right font-bold px-6 py-4 hidden sm:table-cell">Reste</th>
                <th className="text-center font-bold px-6 py-4">Statut</th>
                <th className="text-right font-bold px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {lignes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    Aucun salaire trouvé
                  </td>
                </tr>
              )}
              {lignes.map((l) => {
                const url = photoUrl(l.emp);
                return (
                  <tr key={l.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <Link to={`/fo/salaires/${l.id}`} className="flex items-center gap-3 group">
                        {url ? (
                          <img src={url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User size={18} />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-blue-600">
                            {l.nomEmp || `Employé ${l.fk_user}`}
                          </p>
                          <p className="text-xs text-slate-400">{genderLabel(l.emp.gender)}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-500 hidden md:table-cell">
                      {fmtDate(l.datesp)} → {fmtDate(l.dateep)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">{fmtMoney(l.amount)}</td>
                    <td className="px-6 py-3 text-right hidden sm:table-cell">
                      {l.reste <= 0 ? "—" : fmtMoney(l.reste)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          l.isPaid
                            ? "bg-green-50 text-green-600"
                            : "bg-orange-50 text-orange-600"
                        }`}
                      >
                        {l.isPaid ? "Payé" : "À payer"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setPayTarget(l)}
                        disabled={l.isPaid}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-slate-900 text-white hover:bg-black disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <CreditCard size={14} />
                        {l.isPaid ? "Payé" : "Payer"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {payTarget && (
        <PaymentModal
          salary={payTarget}
          employee={payTarget.emp}
          payments={payments}
          onClose={() => setPayTarget(null)}
          onReload={load}
        />
      )}
    </div>
  );
}
