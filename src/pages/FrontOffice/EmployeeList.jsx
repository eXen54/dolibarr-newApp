import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users, User, ChevronRight, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  getEmployees,
  getSalaries,
  getPayments,
} from "../../services/backoffice/dolibarr.js";
import { genderLabel, photoUrl, fmtMoney, paidForSalary } from "../../services/format.js";

// En-tête de colonne cliquable pour trier.
const SortTh = ({ label, col, sort, onSort, align = "left" }) => {
  const active = sort.key === col;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`font-bold px-6 py-4 text-${align}`}>
      <button
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1.5 uppercase tracking-wider ${
          active ? "text-slate-900" : "hover:text-slate-700"
        }`}
      >
        {label}
        <Icon size={13} className={active ? "text-blue-600" : "text-slate-300"} />
      </button>
    </th>
  );
};

export default function EmployeeList() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sort, setSort] = useState({ key: "nom", dir: "asc" });

  useEffect(() => {
    (async () => {
      const [emp, sal, pay] = await Promise.all([
        getEmployees(),
        getSalaries(),
        getPayments(),
      ]);
      setEmployees(emp);
      setSalaries(sal);
      setPayments(pay);
      setLoading(false);
    })();
  }, []);

  const onSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  // Lignes enrichies (nom, poste, heures, dû/reste) puis triées selon la colonne active.
  const rows = useMemo(() => {
    const list = employees.map((e) => {
      const mySal = salaries.filter((s) => String(s.fk_user) === String(e.id));
      const du = mySal.reduce((a, s) => a + Number(s.amount || 0), 0);
      const paye = mySal.reduce((a, s) => a + paidForSalary(payments, s.id), 0);
      return {
        e,
        nom: (e.lastname ?? e.login ?? "").toLowerCase(),
        poste: (e.job ?? "").toLowerCase(),
        heures: Number(e.weeklyhours) || 0,
        nb: mySal.length,
        reste: du - paye,
      };
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return cmp * dir;
    });
  }, [employees, salaries, payments, sort]);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-blue-600 mb-2">
          <Users size={16} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">
            Ressources humaines
          </span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Salariés</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <SortTh label="Salarié" col="nom" sort={sort} onSort={onSort} />
                <SortTh label="Poste" col="poste" sort={sort} onSort={onSort} />
                <SortTh label="Heures" col="heures" sort={sort} onSort={onSort} />
                <SortTh label="Reste à payer" col="reste" sort={sort} onSort={onSort} align="right" />
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    Aucun salarié
                  </td>
                </tr>
              )}
              {rows.map(({ e, reste, nb }) => {
                const url = photoUrl(e);
                return (
                  <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <Link to={`/fo/employes/${e.id}`} className="flex items-center gap-3 group">
                        {url ? (
                          <img src={url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User size={18} />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-blue-600">
                            {e.lastname ?? e.login}
                          </p>
                          <p className="text-xs text-slate-400">
                            {genderLabel(e.gender)} · {nb} salaire(s)
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{e.job || "—"}</td>
                    <td className="px-6 py-3 text-slate-500">
                      {e.weeklyhours ? `${e.weeklyhours} h` : "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {reste <= 0 ? (
                        <span className="text-green-600">À jour</span>
                      ) : (
                        <span className="text-orange-600">{fmtMoney(reste)}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link to={`/fo/employes/${e.id}`} className="text-slate-300 hover:text-slate-900">
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
