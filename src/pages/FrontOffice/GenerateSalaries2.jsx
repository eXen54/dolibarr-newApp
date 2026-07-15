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
import {
  getEmployees,
  createSalary,
  getSalaries,
} from "../../services/backoffice/dolibarr.js";
import {
  genderLabel,
  photoUrl,
  monthStart,
  monthEnd,
  segmentsManquants,
  montantSegment,
} from "../../services/format.js";
import Modal from "../../components/Modal.jsx";
import { getHolidays } from "../../services/holidays.js";

const toTs = (d) => {
  if (!d) return undefined;
  const [y, m, day] = d.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, day) / 1000);
};

export default function GenerateSalaries() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salaries, setSalaries] = useState([]);
  const [holidays, setHolidays] = useState([]);
  // const [loading, setLoading] = useState(true);

  // Filtres
  const [poste, setPoste] = useState("");
  const [genre, setGenre] = useState("");
  const [hMin, setHMin] = useState("");
  const [hMax, setHMax] = useState("");

  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [tarifJour, setTarifJour] = useState("");
  const [pourcentage, setPourcentage] = useState("");

  // const [running, setRunning] = useState(false);
  // const [progress, setProgress] = useState({ current: 0, total: 0 });
  // const [result, setResult] = useState(null);

  // Sélection + personnalisations par salarié
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [overrides, setOverrides] = useState({}); // { [empId]: { montant, date_debut, date_fin } }
  const [modalEmp, setModalEmp] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);

  useEffect(() => {
    Promise.all([getEmployees(), getSalaries(), getHolidays()])
      .then(([emp, sal, hol]) => {
        setEmployees(emp);
        setSalaries(sal);
        setHolidays(hol);
      })
      .finally(() => setLoading(false));
  }, []);

  const joursFeriesIso = useMemo(() => holidays.map((h) => h.date), [holidays]);

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

  const allSelected =
    filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
  const toggleAll = () =>
    setSelectedIds(
      allSelected ? new Set() : new Set(filtered.map((e) => e.id)),
    );

  const apercu = useMemo(() => {
    if (!tarifJour) return [];
    return selectedEmployees.map((e) => {
      const salairesEmploye = salaries.filter(
        (s) => Number(s.fk_user) === Number(e.id),
      );
      const segments = segmentsManquants(
        Number(annee),
        Number(mois),
        salairesEmploye,
      );
      return {
        emp: e,
        segments: segments.map((seg) => ({
          ...seg,
          montant: montantSegment(
            seg,
            Number(tarifJour),
            Number(pourcentage),
            joursFeriesIso,
          ),
        })),
      };
    });
  }, [
    selectedEmployees,
    salaries,
    annee,
    mois,
    tarifJour,
    pourcentage,
    joursFeriesIso,
  ]);

  const totalSegments = apercu.reduce((s, a) => s + a.segments.length, 0);
  const canGenerate = tarifJour && totalSegments;

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

  // const canGenerate =
  //   selectedEmployees.length > 0 &&
  //   selectedEmployees.every((e) => effMontant(e.id));

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!canGenerate) return;
    if (
      !window.confirm(
        `Générer un salaire pour ${selectedEmployees.length} salarié(s) ?`,
      )
    )
      return;

    setRunning(true);
    setResult(null);
    setProgress({ current: 0, total: selectedEmployees.length });

    let created = 0;
    const errors = [];
    let i = 0;
    for (const { emp, segments } of apercu) {
      for (const seg of segments) {
        try {
          await createSalary({
            fk_user: Number(emp.id),
            label: `Salaire ${emp.lastname ?? emp.login}`,
            amount: seg.montant,
            datesp: toTs(seg.debut),
            dateep: toTs(seg.fin),
          });
          created++;
        } catch (error) {
          console.log("erreur be");
        }
        i++;
        setProgress({ current: i, total: totalSegments });
      }
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
              <option key={p} value={p}>
                {p}
              </option>
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
              <Users size={16} /> {selectedEmployees.length} / {filtered.length}{" "}
              sélectionné(s)
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
            <p className="text-sm text-slate-400">
              Aucun salarié pour ces filtres.
            </p>
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
                    <button
                      onClick={() => toggle(e.id)}
                      className="text-blue-600 shrink-0"
                    >
                      {checked ? (
                        <CheckSquare size={20} />
                      ) : (
                        <Square size={20} className="text-slate-300" />
                      )}
                    </button>
                    {url ? (
                      <img
                        src={url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
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
                        {genderLabel(e.gender)} · {e.job || "—"} ·{" "}
                        {e.weeklyhours || "?"} h
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
      <div>
        COucou
        <h1>Parametres</h1>
        <div>
          <select
            name=""
            id=""
            value={mois}
            onChange={(e) => setMois(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (__, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleDateString("fr-FR", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={annee}
            onChange={(e) => setAnnee(Number(e.target.value))}
            placeholder="Annee"
          />
          <input
            type="number"
            step="0.01"
            value={tarifJour}
            onChange={(e) => setTarifJour(Number(e.target.value))}
            placeholder="Tarif jour"
          />
          <input
            type="number"
            step="0.01"
            value={pourcentage}
            onChange={(e) => setPourcentage(Number(e.target.value))}
            placeholder="pourcentage"
          />

          <form action="" onSubmit={handleGenerate}>
            <h1>Genreation anle izy</h1>
            {apercu
              .filter((a) => a.segments.length > 0)
              .map((a) => (
                <div>
                  <p>zay</p>
                  <p>{a.emp.lastname ?? a.emp.login}</p>
                  {a.segments.map((seg, i) => (
                    <p>
                      {seg.debut} -{seg.fin} : {seg.montant}
                    </p>
                  ))}
                </div>
              ))}
            {running && (
              <div>
                <div></div>
              </div>
            )}
            {result && (
              <div>
                <div>{result.created} saalire generes</div>
                <div>{result.failed} saalire echec</div>
              </div>
            )}
            <button type="submit">Confirmer</button>
          </form>
        </div>
      </div>
    </div>
  );
}
