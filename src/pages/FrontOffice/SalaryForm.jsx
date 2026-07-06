import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, CreditCard, User } from "lucide-react";
import {
  getEmployees,
  getSalaries,
  getPayments,
  createSalary,
} from "../../services/backoffice/dolibarr.js";
import {
  fmtMoney,
  genderLabel,
  paidForSalary,
  photoUrl,
  monthStart,
  monthEnd,
} from "../../services/format.js";
import PaymentModal from "../../components/PaymentModal.jsx";

export default function SalaryForm() {
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [payTarget, setPayTarget] = useState(null); // salaire à payer (modal)
  // Dates pré-remplies avec la période du mois courant (modifiables).
  const [form, setForm] = useState({
    fk_user: "",
    label: "",
    amount: "",
    date_debut: monthStart(),
    date_fin: monthEnd(),
  });

  // Sélection d'un employé : pré-remplit le montant avec son dernier salaire.
  const onSelectEmployee = (fk_user) => {
    const last = [...salaries]
      .filter((s) => String(s.fk_user) === String(fk_user))
      .sort((a, b) => Number(b.id) - Number(a.id))[0];
    setForm((prev) => ({
      ...prev,
      fk_user,
      amount: last ? String(last.amount) : prev.amount,
    }));
  };

  const load = useCallback(async () => {
    const [emp, sal, pay] = await Promise.all([
      getEmployees(),
      getSalaries(),
      getPayments(),
    ]);
    setEmployees(emp);
    setSalaries(sal);
    setPayments(pay);
    return { emp, sal, pay };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const empById = useMemo(() => {
    const m = {};
    employees.forEach((e) => (m[e.id] = e));
    return m;
  }, [employees]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.fk_user || !form.amount) {
      setError("L'employé et le montant sont obligatoires.");
      return;
    }
    setSaving(true);
    try {
      const emp = employees.find((x) => String(x.id) === String(form.fk_user));
      const id = await createSalary({
        fk_user: Number(form.fk_user),
        label: form.label || `Salaire ${emp?.lastname ?? ""}`.trim(),
        amount: Number(form.amount),
        datesp: form.date_debut
          ? Math.floor(new Date(form.date_debut).getTime() / 1000)
          : undefined,
        dateep: form.date_fin
          ? Math.floor(new Date(form.date_fin).getTime() / 1000)
          : undefined,
      });
      setForm({
        fk_user: "",
        label: "",
        amount: "",
        date_debut: monthStart(),
        date_fin: monthEnd(),
      });
      // Recharge la liste et ouvre directement le modal de paiement du nouveau salaire.
      const data = await load();
      const newSal = data.sal.find((s) => String(s.id) === String(id));
      if (newSal) setPayTarget(newSal);
    } catch (err) {
      setError(err.response?.data?.error?.message ?? err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Link
        to="/fo/salaires"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 mb-6"
      >
        <ArrowLeft size={16} /> Retour à la liste
      </Link>

      {/* Formulaire de création */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mb-8">
        <h1 className="text-3xl font-black text-slate-900 mb-8">
          Nouveau salaire
        </h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6 font-semibold text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Employé *
              </label>
              <select
                value={form.fk_user}
                onChange={(e) => onSelectEmployee(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
                required
              >
                <option value="">— Choisir un employé —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {(e.lastname ?? e.login) +
                      " (" +
                      genderLabel(e.gender) +
                      ")"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Montant *
              </label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">
              Libellé
            </label>
            <input
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Ex : Salaire mars 2026"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Début de période
              </label>
              <input
                type="date"
                value={form.date_debut}
                onChange={(e) => set("date_debut", e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Fin de période
              </label>
              <input
                type="date"
                value={form.date_fin}
                onChange={(e) => set("date_fin", e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:bg-slate-300"
          >
            <Save size={18} />
            {saving ? "Création..." : "Créer"}
          </button>
        </form>
      </div>

      {/* Liste des salaires avec bouton Payer */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <h2 className="text-lg font-black text-slate-900 p-6 pb-4">
          Salaires existants ({salaries.length})
        </h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left font-bold px-6 py-3">Employé</th>
              <th className="text-right font-bold px-6 py-3">Montant</th>
              <th className="text-right font-bold px-6 py-3 hidden sm:table-cell">
                Reste
              </th>
              <th className="text-right font-bold px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {salaries.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-slate-400"
                >
                  Aucun salaire pour l'instant
                </td>
              </tr>
            )}
            {[...salaries]
              .sort((a, b) => Number(b.id) - Number(a.id))
              .map((s) => {
                const emp = empById[s.fk_user];
                const r = Number(s.amount || 0) - paidForSalary(payments, s.id);
                const isPaid = r <= 0;
                const url = photoUrl(emp);
                return (
                  <tr key={s.id} className="border-t border-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {url ? (
                          <img
                            src={url}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User size={16} />
                          </div>
                        )}
                        <span className="font-bold text-slate-700">
                          {emp
                            ? (emp.lastname ?? emp.login)
                            : `Employé ${s.fk_user}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {fmtMoney(s.amount)}
                    </td>
                    <td className="px-6 py-3 text-right hidden sm:table-cell">
                      {isPaid ? (
                        <span className="text-green-600 font-semibold">
                          Payé
                        </span>
                      ) : (
                        <span className="text-orange-600 font-semibold">
                          {fmtMoney(r)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setPayTarget(s)}
                        disabled={isPaid}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-slate-900 text-white hover:bg-black disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <CreditCard size={14} />
                        {isPaid ? "Payé" : "Payer"}
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {payTarget && (
        <PaymentModal
          salary={payTarget}
          employee={empById[payTarget.fk_user]}
          payments={payments}
          onClose={() => setPayTarget(null)}
          onReload={load}
        />
      )}
    </div>
  );
}
