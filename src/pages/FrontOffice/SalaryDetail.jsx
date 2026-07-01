import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import {
  getSalary,
  getEmployees,
  getPayments,
  addPayment,
  deletePayment,
} from "../../services/backoffice/dolibarr.js";
import { fmtMoney, fmtDate, genderLabel, photoUrl } from "../../services/format.js";

// Modes de règlement Dolibarr (id -> libellé).
const TYPES = [
  { id: 4, label: "Espèces" },
  { id: 2, label: "Virement" },
  { id: 7, label: "Chèque" },
  { id: 6, label: "Carte bancaire" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function SalaryDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [payments, setPayments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ montant: "", date: today(), type: 4 });

  const load = useCallback(async () => {
    const [sal, emps, allPays] = await Promise.all([
      getSalary(id),
      getEmployees(),
      getPayments(),
    ]);
    setSalary(sal);
    setEmployee(emps.find((e) => String(e.id) === String(sal.fk_user)) || null);
    setPayments(allPays.filter((p) => String(p.fk_salary) === String(id)));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const paye = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const reste = Number(salary?.amount || 0) - paye;
  const isPaid = reste <= 0;

  // Pré-remplit le montant avec le reste à payer (valeur par défaut modifiable).
  useEffect(() => {
    setForm((f) => ({ ...f, montant: reste > 0 ? reste.toFixed(2) : "" }));
  }, [reste]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    const montant = Number(form.montant);
    if (!montant || montant <= 0) {
      setError("Saisissez un montant valide.");
      return;
    }
    setSaving(true);
    try {
      await addPayment(id, { montant, date: form.date, type: Number(form.type) });
      setForm({ montant: "", date: today(), type: form.type });
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message ?? err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm("Supprimer ce règlement ?")) return;
    try {
      await deletePayment(paymentId);
      await load();
    } catch (err) {
      alert("Erreur : " + (err.message || "inconnue"));
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={40} className="text-blue-600 animate-spin" />
      </div>
    );

  if (!salary)
    return (
      <div className="text-center py-20 text-slate-400">Salaire introuvable.</div>
    );

  const url = photoUrl(employee);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Link
        to="/fo/salaires"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 mb-6"
      >
        <ArrowLeft size={16} /> Retour à la liste
      </Link>

      {/* En-tête salaire */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-6">
          {url ? (
            <img src={url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <User size={28} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {employee ? employee.lastname ?? employee.login : `Employé ${salary.fk_user}`}
            </h1>
            <p className="text-slate-400 text-sm">
              {genderLabel(employee?.gender)} · {salary.label}
            </p>
          </div>
          {isPaid && (
            <span className="ml-auto inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold bg-green-50 text-green-600">
              <CheckCircle2 size={16} /> Payé
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Info label="Période" value={`${fmtDate(salary.datesp)} → ${fmtDate(salary.dateep)}`} />
          <Info label="Montant" value={fmtMoney(salary.amount)} />
          <Info label="Payé" value={fmtMoney(paye)} />
          <Info
            label="Reste à payer"
            value={fmtMoney(Math.max(reste, 0))}
            highlight={!isPaid}
          />
        </div>
      </div>

      {/* Ajouter un règlement (paiement en plusieurs fois) */}
      {!isPaid && (
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mb-6">
          <h2 className="text-lg font-black text-slate-900 mb-5">Ajouter un règlement</h2>
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-2xl mb-4 font-semibold text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Montant</label>
              <input
                type="number"
                step="0.01"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                placeholder={reste.toFixed(2)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Mode</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-slate-900"
              >
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:bg-slate-300"
            >
              <Plus size={16} /> {saving ? "..." : "Payer"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setForm({ ...form, montant: reste.toFixed(2) })}
            className="mt-3 text-xs font-bold text-blue-600 hover:underline"
          >
            Payer le reste ({fmtMoney(Math.max(reste, 0))})
          </button>
        </div>
      )}

      {/* Historique des règlements */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <h2 className="text-lg font-black text-slate-900 p-6 pb-4">
          Règlements ({payments.length})
        </h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left font-bold px-6 py-3">Date</th>
              <th className="text-left font-bold px-6 py-3">Mode</th>
              <th className="text-right font-bold px-6 py-3">Montant</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                  Aucun règlement pour l'instant
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-50">
                <td className="px-6 py-3 text-slate-600">{fmtDate(p.datep)}</td>
                <td className="px-6 py-3 text-slate-500">
                  {p.type_label || p.type_code || "—"}
                </td>
                <td className="px-6 py-3 text-right font-semibold">{fmtMoney(p.amount)}</td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-slate-300 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
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

const Info = ({ label, value, highlight }) => (
  <div>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
      {label}
    </p>
    <p className={`font-black ${highlight ? "text-orange-600" : "text-slate-900"}`}>
      {value}
    </p>
  </div>
);
