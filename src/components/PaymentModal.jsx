import { useEffect, useState } from "react";
import { Plus, Trash2, CheckCircle2, User } from "lucide-react";
import Modal from "./Modal.jsx";
import { addPayment, deletePayment } from "../services/backoffice/dolibarr.js";
import { fmtMoney, fmtDate, photoUrl } from "../services/format.js";

// Modes de règlement Dolibarr (id -> libellé).
const TYPES = [
  { id: 4, label: "Espèces" },
  { id: 2, label: "Virement" },
  { id: 7, label: "Chèque" },
  { id: 6, label: "Carte bancaire" },
];

const today = () => new Date().toISOString().slice(0, 10);

// Modal de paiement d'un salaire (paiement en plusieurs fois).
// Props : salary, employee, payments (toutes les lignes), onClose, onReload (async).
export default function PaymentModal({ salary, employee, payments, onClose, onReload }) {
  const [form, setForm] = useState({ montant: "", date: today(), type: 4 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const mine = payments.filter((p) => String(p.fk_salary) === String(salary.id));
  const paye = mine.reduce((s, p) => s + Number(p.amount || 0), 0);
  const reste = Number(salary.amount || 0) - paye;
  const isPaid = reste <= 0;
  const url = photoUrl(employee);

  // Pré-remplit le montant avec le reste à payer (à l'ouverture et après chaque
  // règlement). C'est une valeur par défaut modifiable, pas un simple placeholder.
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
      await addPayment(salary.id, { montant, date: form.date, type: Number(form.type) });
      setForm({ montant: "", date: today(), type: form.type });
      await onReload();
    } catch (err) {
      setError(err.response?.data?.error?.message ?? err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce règlement ?")) return;
    try {
      await deletePayment(id);
      await onReload();
    } catch (err) {
      alert("Erreur : " + (err.message || "inconnue"));
    }
  };

  return (
    <Modal title="Payer le salaire" onClose={onClose}>
      {/* En-tête employé + montants */}
      <div className="flex items-center gap-4 mb-6">
        {url ? (
          <img src={url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <User size={24} />
          </div>
        )}
        <div>
          <p className="font-black text-slate-900 text-lg">
            {employee ? employee.lastname ?? employee.login : `Employé ${salary.fk_user}`}
          </p>
          <p className="text-sm text-slate-400">{salary.label}</p>
        </div>
        {isPaid && (
          <span className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-600">
            <CheckCircle2 size={14} /> Payé
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Montant" value={fmtMoney(salary.amount)} />
        <Stat label="Payé" value={fmtMoney(paye)} />
        <Stat label="Reste" value={fmtMoney(Math.max(reste, 0))} highlight={!isPaid} />
      </div>

      {/* Formulaire d'ajout de règlement */}
      {!isPaid && (
        <form onSubmit={handleAdd} className="bg-slate-50 rounded-2xl p-4 mb-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-3 font-semibold text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Montant</label>
              <input
                type="number"
                step="0.01"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                placeholder={Math.max(reste, 0).toFixed(2)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Mode</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-900"
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
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, montant: Math.max(reste, 0).toFixed(2) })}
            className="mt-3 text-xs font-bold text-blue-600 hover:underline"
          >
            Payer le reste ({fmtMoney(Math.max(reste, 0))})
          </button>
        </form>
      )}

      {/* Historique des règlements */}
      <h4 className="font-black text-slate-900 mb-3">Règlements ({mine.length})</h4>
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left font-bold px-4 py-2.5">Date</th>
              <th className="text-left font-bold px-4 py-2.5">Mode</th>
              <th className="text-right font-bold px-4 py-2.5">Montant</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {mine.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Aucun règlement
                </td>
              </tr>
            )}
            {mine.map((p) => (
              <tr key={p.id} className="border-t border-slate-50">
                <td className="px-4 py-2.5 text-slate-600">{fmtDate(p.datep)}</td>
                <td className="px-4 py-2.5 text-slate-500">
                  {p.type_label || p.type_code || "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold">{fmtMoney(p.amount)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-slate-300 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

const Stat = ({ label, value, highlight }) => (
  <div className="bg-slate-50 rounded-2xl p-3 text-center">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <p className={`font-black text-sm ${highlight ? "text-orange-600" : "text-slate-900"}`}>
      {value}
    </p>
  </div>
);
