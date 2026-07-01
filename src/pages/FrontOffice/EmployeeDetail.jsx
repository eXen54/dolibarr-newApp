import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, Briefcase, Clock, Loader2 } from "lucide-react";
import {
  getEmployees,
  getSalaries,
  getPayments,
} from "../../services/backoffice/dolibarr.js";
import {
  fmtMoney,
  fmtDate,
  genderLabel,
  photoUrl,
  paidForSalary,
} from "../../services/format.js";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [salaries, setSalaries] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    (async () => {
      const [emps, sal, pay] = await Promise.all([
        getEmployees(),
        getSalaries(),
        getPayments(),
      ]);
      setEmployee(emps.find((e) => String(e.id) === String(id)) || null);
      setSalaries(sal.filter((s) => String(s.fk_user) === String(id)));
      setPayments(pay);
      setLoading(false);
    })();
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={40} className="text-blue-600 animate-spin" />
      </div>
    );

  if (!employee)
    return <div className="text-center py-20 text-slate-400">Salarié introuvable.</div>;

  const du = salaries.reduce((a, s) => a + Number(s.amount || 0), 0);
  const paye = salaries.reduce((a, s) => a + paidForSalary(payments, s.id), 0);
  const reste = du - paye;
  const url = photoUrl(employee);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Link
        to="/fo/employes"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 mb-6"
      >
        <ArrowLeft size={16} /> Retour aux salariés
      </Link>

      {/* Infos salarié */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mb-6">
        <div className="flex items-center gap-5">
          {url ? (
            <img src={url} alt="" className="w-20 h-20 rounded-3xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
              <User size={32} />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              {employee.lastname ?? employee.login}
            </h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <span>{genderLabel(employee.gender)}</span>
              <span className="flex items-center gap-1.5">
                <Briefcase size={14} /> {employee.job || "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> {employee.weeklyhours ? `${employee.weeklyhours} h/sem.` : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <Stat label="Total dû" value={fmtMoney(du)} />
          <Stat label="Payé" value={fmtMoney(paye)} green />
          <Stat label="Reste à payer" value={fmtMoney(Math.max(reste, 0))} highlight={reste > 0} />
        </div>
      </div>

      {/* Historique des salaires + paiements */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <h2 className="text-lg font-black text-slate-900 p-6 pb-4">
          Historique des salaires ({salaries.length})
        </h2>

        {salaries.length === 0 ? (
          <p className="px-6 pb-8 text-slate-400">Aucun salaire pour ce salarié.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...salaries]
              .sort((a, b) => Number(b.id) - Number(a.id))
              .map((s) => {
                const mine = payments.filter((p) => String(p.fk_salary) === String(s.id));
                const p = paidForSalary(payments, s.id);
                const r = Number(s.amount || 0) - p;
                return (
                  <div key={s.id} className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="font-bold text-slate-800">{s.label}</p>
                        <p className="text-xs text-slate-400">
                          {fmtDate(s.datesp)} → {fmtDate(s.dateep)}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <span className="font-black text-slate-900">{fmtMoney(s.amount)}</span>
                        <span className="text-slate-400">
                          {" "}· payé {fmtMoney(p)} ·{" "}
                        </span>
                        {r <= 0 ? (
                          <span className="text-green-600 font-bold">Payé</span>
                        ) : (
                          <span className="text-orange-600 font-bold">reste {fmtMoney(r)}</span>
                        )}
                      </div>
                    </div>

                    {/* Paiements de ce salaire */}
                    {mine.length > 0 && (
                      <table className="w-full text-sm rounded-xl overflow-hidden border border-slate-100">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="text-left font-bold px-4 py-2">Date</th>
                            <th className="text-left font-bold px-4 py-2">Mode</th>
                            <th className="text-right font-bold px-4 py-2">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mine.map((pay) => (
                            <tr key={pay.id} className="border-t border-slate-50">
                              <td className="px-4 py-2 text-slate-500">{fmtDate(pay.datep)}</td>
                              <td className="px-4 py-2 text-slate-500">
                                {pay.type_label || pay.type_code || "—"}
                              </td>
                              <td className="px-4 py-2 text-right font-semibold">
                                {fmtMoney(pay.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

const Stat = ({ label, value, green, highlight }) => (
  <div className="bg-slate-50 rounded-2xl p-4 text-center">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {label}
    </p>
    <p
      className={`font-black ${
        highlight ? "text-orange-600" : green ? "text-green-600" : "text-slate-900"
      }`}
    >
      {value}
    </p>
  </div>
);
