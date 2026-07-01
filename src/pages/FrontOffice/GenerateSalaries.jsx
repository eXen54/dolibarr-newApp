import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Zap,
  CheckCircle2,
  Loader2,
  User,
  SlidersHorizontal,
  CheckSquare,
  Square,
} from "lucide-react";
import { getEmployees, createSalary } from "../../services/backoffice/dolibarr.js";
import { genderLabel, photoUrl, monthStart, monthEnd } from "../../services/format.js";
import Modal from "../../components/Modal.jsx";

const toTs = (d) => (d ? Math.floor(new Date(d).getTime() / 1000) : undefined);

export default function GenerateSalaries() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [poste, setPoste] = useState("");
  const [genre, setGenre] = useState("");
  const [hMin, setHMin] = useState("");
  const [hMax, setHMax] = useState("");

  // Sélection + personnalisations par salarié
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [overrides, setOverrides] = useState({}); // { [empId]: { montant, date_debut, date_fin } }
  const [modalEmp, setModalEmp] = useState(null);
  const [modalForm, setModalForm] = useState({ montant: "", date_debut: "", date_fin: "" });

  // Valeurs communes — dates pré-remplies avec la période du mois courant (modifiables).
  const [form, setForm] = useState({
    date_debut: monthStart(),
    date_fin: monthEnd(),
    montant: "",
  });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, []);

  const postes = useMemo(
    () => [...new Set(employees.map((e) => e.job).filter(Boolean))].sort(),
    [employees],
  );

  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        if (poste && e.job !== poste) return false;
        if (genre && e.gender !== genre) return false;
        const h = Number(e.weeklyhours);
        if (hMin && h < Number(hMin)) return false;
        if (hMax && h > Number(hMax)) return false;
        return true;
      }),
    [employees, poste, genre, hMin, hMax],
  );

  // À chaque changement de filtre, tous les salariés filtrés sont pré-sélectionnés.
  useEffect(() => {
    setSelectedIds(new Set(filtered.map((e) => e.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, poste, genre, hMin, hMax]);

  const selectedEmployees = filtered.filter((e) => selectedIds.has(e.id));

  const toggle = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map((e) => e.id)));

  // Valeurs effectives = override du salarié sinon valeur commune.
  const effMontant = (id) => overrides[id]?.montant || form.montant;
  const effDebut = (id) => overrides[id]?.date_debut || form.date_debut;
  const effFin = (id) => overrides[id]?.date_fin || form.date_fin;

  const openModal = (emp) => {
    setModalEmp(emp);
    // Pré-remplit avec la perso existante, sinon avec les valeurs communes (modifiables).
    setModalForm(
      overrides[emp.id] || {
        montant: form.montant,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
      },
    );
  };
  const saveOverride = (e) => {
    e.preventDefault();
    setOverrides((prev) => ({ ...prev, [modalEmp.id]: { ...modalForm } }));
    setModalEmp(null);
  };
  const clearOverride = () => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[modalEmp.id];
      return next;
    });
    setModalEmp(null);
  };

  const canGenerate =
    selectedEmployees.length > 0 && selectedEmployees.every((e) => effMontant(e.id));

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!canGenerate) return;
    if (!window.confirm(`Générer un salaire pour ${selectedEmployees.length} salarié(s) ?`))
      return;

    setRunning(true);
    setResult(null);
    setProgress({ current: 0, total: selectedEmployees.length });

    let created = 0;
    const errors = [];
    for (let i = 0; i < selectedEmployees.length; i++) {
      const emp = selectedEmployees[i];
      try {
        await createSalary({
          fk_user: Number(emp.id),
          label: `Salaire ${emp.lastname ?? emp.login}`,
          amount: Number(effMontant(emp.id)),
          datesp: toTs(effDebut(emp.id)),
          dateep: toTs(effFin(emp.id)),
        });
        created++;
      } catch (err) {
        errors.push(`${emp.lastname ?? emp.login} : ${err.message}`);
      }
      setProgress({ current: i + 1, total: selectedEmployees.length });
    }
    setResult({ created, failed: errors.length });
    setRunning(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-blue-600 mb-2">
          <Zap size={16} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">
            Génération en masse
          </span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Générer des salaires
        </h1>
        <p className="text-slate-500 mt-1">
          Filtrez, cochez les salariés, personnalisez au besoin, puis générez.
        </p>
      </div>

      {/* Filtres */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm mb-6">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4">
          1. Filtrer les salariés
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            value={poste}
            onChange={(e) => setPoste(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
          >
            <option value="">Tous les postes</option>
            {postes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
          >
            <option value="">Tous les genres</option>
            <option value="man">Homme</option>
            <option value="woman">Femme</option>
          </select>
          <input
            type="number"
            value={hMin}
            onChange={(e) => setHMin(e.target.value)}
            placeholder="Heures min"
            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
          />
          <input
            type="number"
            value={hMax}
            onChange={(e) => setHMax(e.target.value)}
            placeholder="Heures max"
            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
          />
        </div>

        {/* Sélection cochable */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-500 flex items-center gap-2">
              <Users size={16} /> {selectedEmployees.length} / {filtered.length} sélectionné(s)
            </p>
            {filtered.length > 0 && (
              <button
                onClick={toggleAll}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            )}
          </div>

          {loading ? (
            <Loader2 size={24} className="text-blue-600 animate-spin" />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun salarié pour ces filtres.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-100 divide-y divide-slate-50">
              {filtered.map((e) => {
                const checked = selectedIds.has(e.id);
                const url = photoUrl(e);
                const hasOverride = !!overrides[e.id];
                return (
                  <div
                    key={e.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${checked ? "bg-blue-50/40" : ""}`}
                  >
                    <button onClick={() => toggle(e.id)} className="text-blue-600 shrink-0">
                      {checked ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-300" />}
                    </button>
                    {url ? (
                      <img src={url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                        <User size={14} />
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {e.lastname ?? e.login}
                      </p>
                      <p className="text-xs text-slate-400">
                        {genderLabel(e.gender)} · {e.job || "—"} · {e.weeklyhours || "?"} h
                      </p>
                    </div>
                    {hasOverride && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        perso
                      </span>
                    )}
                    {/* Icône de personnalisation : uniquement quand sélectionné */}
                    {checked && (
                      <button
                        onClick={() => openModal(e)}
                        title="Personnaliser ce salaire"
                        className="text-slate-400 hover:text-blue-600 shrink-0"
                      >
                        <SlidersHorizontal size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Valeurs communes + génération */}
      <form
        onSubmit={handleGenerate}
        className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm"
      >
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-1">
          2. Salaire commun
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Appliqué à chaque salarié, sauf ceux personnalisés (badge « perso »).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Date début</label>
            <input
              type="date"
              value={form.date_debut}
              onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Date fin</label>
            <input
              type="date"
              value={form.date_fin}
              onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Montant commun</label>
            <input
              type="number"
              step="0.01"
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
            />
          </div>
        </div>

        {running && (
          <div className="mb-4">
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-200"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {progress.current} / {progress.total}
            </p>
          </div>
        )}

        {result && (
          <div className="mb-4 p-4 rounded-2xl bg-green-50 text-green-800 flex items-center gap-3 font-bold">
            <CheckCircle2 size={20} />
            {result.created} salaire(s) généré(s)
            {result.failed ? ` — ${result.failed} échec(s)` : ""}
          </div>
        )}

        {!canGenerate && selectedEmployees.length > 0 && (
          <p className="text-xs font-semibold text-orange-600 mb-3">
            Renseignez un montant commun ou personnalisez chaque salarié sélectionné.
          </p>
        )}

        <button
          type="submit"
          disabled={running || !canGenerate}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:bg-slate-300"
        >
          <Zap size={18} />
          {running
            ? "Génération..."
            : `Générer le salaire pour ${selectedEmployees.length} salarié(s)`}
        </button>
      </form>

      {/* Modal de personnalisation d'un salarié */}
      {modalEmp && (
        <Modal
          title={`Personnaliser — ${modalEmp.lastname ?? modalEmp.login}`}
          onClose={() => setModalEmp(null)}
          maxWidth="max-w-md"
        >
          <p className="text-sm text-slate-400 mb-4">
            Laissez un champ vide pour utiliser la valeur commune.
          </p>
          <form onSubmit={saveOverride} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Montant</label>
              <input
                type="number"
                step="0.01"
                value={modalForm.montant}
                onChange={(e) => setModalForm({ ...modalForm, montant: e.target.value })}
                placeholder={form.montant ? `commun : ${form.montant}` : "0.00"}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Date début</label>
                <input
                  type="date"
                  value={modalForm.date_debut}
                  onChange={(e) => setModalForm({ ...modalForm, date_debut: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Date fin</label>
                <input
                  type="date"
                  value={modalForm.date_fin}
                  onChange={(e) => setModalForm({ ...modalForm, date_fin: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-900"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              {overrides[modalEmp.id] && (
                <button
                  type="button"
                  onClick={clearOverride}
                  className="px-4 py-3 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200"
                >
                  Réinitialiser
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-bold hover:bg-black transition-all"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
