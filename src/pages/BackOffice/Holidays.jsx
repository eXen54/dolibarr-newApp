import { useEffect, useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../../services/holidays.js";
import Modal from "../../components/Modal.jsx";

// Affiche une date "YYYY-MM-DD" au format français.
const showDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR") : "—");

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} (nouveau) | {id,...} (modif)
  const [form, setForm] = useState({ label: "", date: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setHolidays(await getHolidays());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm({ label: "", date: "" });
    setEditing({});
  };
  const openEdit = (h) => {
    setForm({ label: h.label, date: h.date });
    setEditing(h);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.label || !form.date) return;
    setSaving(true);
    try {
      if (editing.id) await updateHoliday(editing.id, form);
      else await createHoliday(form);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (h) => {
    if (!window.confirm(`Supprimer le jour férié « ${h.label} » ?`)) return;
    await deleteHoliday(h.id);
    await load();
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <CalendarDays size={16} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">
              Paramétrage
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Jours fériés
          </h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold hover:bg-black transition-all"
        >
          <Plus size={18} /> Ajouter
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={36} className="text-blue-600 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-bold px-6 py-4">Libellé</th>
                <th className="text-left font-bold px-6 py-4">Date</th>
                <th className="text-right font-bold px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                    Aucun jour férié
                  </td>
                </tr>
              )}
              {holidays.map((h) => (
                <tr key={h.id} className="border-t border-slate-50">
                  <td className="px-6 py-3 font-semibold text-slate-800">{h.label}</td>
                  <td className="px-6 py-3 text-slate-500">{showDate(h.date)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openEdit(h)}
                        className="text-slate-400 hover:text-blue-600"
                        title="Modifier"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(h)}
                        className="text-slate-400 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal
          title={editing.id ? "Modifier le jour férié" : "Nouveau jour férié"}
          onClose={() => setEditing(null)}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Libellé</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Ex : Fête de l'indépendance"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold hover:bg-black transition-all disabled:bg-slate-300"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
