import React, { useState } from "react";
import {
  FileUp,
  Upload,
  Users,
  Wallet,
  Image,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { importAll } from "../../services/backoffice/dolibarr.js";

export default function Import() {
  const [files, setFiles] = useState({
    employees: null,
    salaries: null,
    photos: null,
  });
  const [status, setStatus] = useState("idle"); // idle, uploading, success, error
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0, step: "" });

  const fileTypes = [
    {
      id: "employees",
      label: "Employés (CSV)",
      icon: Users,
      color: "text-blue-600 bg-blue-50",
      description: "Feuille 1 — créés comme utilisateurs Dolibarr",
      accept: ".csv",
    },
    {
      id: "salaries",
      label: "Salaires (CSV)",
      icon: Wallet,
      color: "text-orange-600 bg-orange-50",
      description: "Feuille 2 — fiches de salaire + leurs règlements",
      accept: ".csv",
    },
    {
      id: "photos",
      label: "Photos (ZIP)",
      icon: Image,
      color: "text-purple-600 bg-purple-50",
      description: "Images nommées par réf. employé (1.png, 2.png…)",
      accept: ".zip",
    },
  ];

  const handleFileChange = (type, file) =>
    setFiles((prev) => ({ ...prev, [type]: file }));

  const handleUpload = async (e) => {
    e.preventDefault();
    setStatus("uploading");
    setMessage("");
    try {
      const res = await importAll(
        {
          employeesFile: files.employees,
          salariesFile: files.salaries,
          photosZip: files.photos,
        },
        (p) => setProgress(p),
      );
      setStatus("success");
      const parts = [`${res.created} créé(s)`];
      if (res.skipped) parts.push(`${res.skipped} ignoré(s)`);
      if (res.photos) parts.push(`${res.photos} photo(s)`);
      if (res.failed) parts.push(`${res.failed} échec(s)`);
      setMessage("Importation terminée : " + parts.join(", "));
      if (res.errors?.length) console.warn("Erreurs d'import:", res.errors);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Erreur lors de l'importation : " + (err.message || "inconnue"));
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
          Importation
        </h1>
        <p className="text-slate-500">
          Importez les employés, les salaires et les photos dans Dolibarr
        </p>
      </div>

      {status === "uploading" && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-blue-900">{progress.step || "…"}</p>
            {progress.total > 0 && (
              <p className="font-bold text-blue-700">
                {progress.current} / {progress.total}
              </p>
            )}
          </div>
          {progress.total > 0 && (
            <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-8">
        {fileTypes.map((type) => {
          const Icon = type.icon;
          const selectedFile = files[type.id];
          return (
            <div
              key={type.id}
              className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm"
            >
              <div className="flex items-center gap-6">
                <div className={`p-4 rounded-2xl ${type.color}`}>
                  <Icon size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900 mb-1">
                    {type.label}
                  </h3>
                  <p className="text-sm text-slate-500">{type.description}</p>
                </div>
              </div>

              <div className="mt-6">
                {selectedFile ? (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-green-600" size={24} />
                      <div>
                        <p className="font-bold text-slate-900">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileChange(type.id, null)}
                      className="text-sm font-bold text-red-600 hover:text-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all">
                    <Upload className="text-slate-400 mb-4" size={32} />
                    <p className="font-bold text-slate-700 mb-1">
                      Choisir un fichier
                    </p>
                    <p className="text-xs text-slate-400">{type.accept}</p>
                    <input
                      type="file"
                      accept={type.accept}
                      className="hidden"
                      onChange={(e) =>
                        handleFileChange(type.id, e.target.files[0])
                      }
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}

        {message && (
          <div
            className={`p-6 rounded-2xl flex items-center gap-4 ${
              status === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {status === "success" ? (
              <CheckCircle2 size={24} />
            ) : (
              <AlertCircle size={24} />
            )}
            <p className="font-bold">{message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={status === "uploading"}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <FileUp size={20} className={status === "uploading" ? "animate-spin" : ""} />
          {status === "uploading" ? "Importation en cours..." : "Importer les données"}
        </button>
      </form>
    </div>
  );
}
