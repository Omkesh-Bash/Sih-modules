import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  UploadCloud,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

const emptyRecord = {
  document_type: "",
  diagnoses: [],
  medications: [],
  lab_investigations: [],
  unclear_or_illegible_segments: [],
  overall_confidence: 0,
};

const emptyMedication = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

const emptyLab = {
  test_name: "",
  observed_value: "",
  reference_range: "",
  abnormal_flag: false,
};

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function normalizeRecord(raw) {
  return {
    ...emptyRecord,
    ...raw,
    diagnoses: Array.isArray(raw?.diagnoses) ? raw.diagnoses : [],
    medications: Array.isArray(raw?.medications) ? raw.medications : [],
    lab_investigations: Array.isArray(raw?.lab_investigations) ? raw.lab_investigations : [],
    unclear_or_illegible_segments: Array.isArray(raw?.unclear_or_illegible_segments)
      ? raw.unclear_or_illegible_segments
      : [],
    overall_confidence: Number(raw?.overall_confidence ?? 0),
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isAcceptedFile(file) {
  const lowerName = file.name.toLowerCase();
  return ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

function IconButton({ label, children, className, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={classNames(
        "grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function TextField({ label, value, onChange, highlight, type = "text", ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-normal text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={classNames(
          "h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100",
          highlight ? "border-amber-400 ring-1 ring-amber-200" : "border-slate-200",
        )}
        {...props}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, highlight, rows = 2 }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-normal text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className={classNames(
          "w-full resize-y rounded-md border bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100",
          highlight ? "border-amber-400 ring-1 ring-amber-200" : "border-slate-200",
        )}
      />
    </label>
  );
}

function DocumentViewer({ previewUrl, file }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPoint = useRef(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
  }, [previewUrl]);

  const fileType = file?.type ?? "";
  const isPdf = fileType === "application/pdf" || file?.name?.toLowerCase().endsWith(".pdf");

  function changeZoom(delta) {
    setZoom((current) => clamp(Number((current + delta).toFixed(2)), 0.5, 3));
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handlePointerDown(event) {
    if (!previewUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPoint.current = { x: event.clientX, y: event.clientY };
    setIsPanning(true);
  }

  function handlePointerMove(event) {
    if (!isPanning || !lastPoint.current) return;
    const next = { x: event.clientX, y: event.clientY };
    setPan((current) => ({
      x: current.x + next.x - lastPoint.current.x,
      y: current.y + next.y - lastPoint.current.y,
    }));
    lastPoint.current = next;
  }

  function endPan(event) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
    lastPoint.current = null;
  }

  function handleWheel(event) {
    if (!previewUrl) return;
    event.preventDefault();
    changeZoom(event.deltaY > 0 ? -0.08 : 0.08);
  }

  return (
    <section className="flex min-h-[420px] flex-col border-r border-slate-200 bg-slate-100 lg:min-h-0">
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900">Original Document</h2>
          <p className="truncate text-xs text-slate-500">{file?.name ?? "No file selected"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <IconButton label="Zoom out" onClick={() => changeZoom(-0.15)} disabled={!previewUrl}>
            <ZoomOut className="h-4 w-4" />
          </IconButton>
          <div className="grid h-9 min-w-16 place-items-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600">
            {Math.round(zoom * 100)}%
          </div>
          <IconButton label="Zoom in" onClick={() => changeZoom(0.15)} disabled={!previewUrl}>
            <ZoomIn className="h-4 w-4" />
          </IconButton>
          <IconButton label="Reset view" onClick={resetView} disabled={!previewUrl}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div
        className={classNames(
          "relative flex-1 overflow-hidden bg-[linear-gradient(45deg,#d8dee8_25%,transparent_25%),linear-gradient(-45deg,#d8dee8_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d8dee8_75%),linear-gradient(-45deg,transparent_75%,#d8dee8_75%)] bg-[length:26px_26px] bg-[position:0_0,0_13px,13px_-13px,-13px_0]",
          previewUrl ? "cursor-grab active:cursor-grabbing" : "",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onWheel={handleWheel}
      >
        {!previewUrl ? (
          <div className="absolute inset-0 grid place-items-center px-8 text-center">
            <div>
              <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">No document loaded</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div
              className="transition-transform duration-75"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center",
              }}
            >
              {isPdf ? (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="h-[860px] w-[660px] max-w-none rounded-md bg-white shadow-panel pointer-events-none"
                >
                  <div className="grid h-72 w-80 place-items-center rounded-md bg-white p-6 text-center text-sm text-slate-600 shadow-panel">
                    PDF preview unavailable
                  </div>
                </object>
              ) : (
                <img
                  src={previewUrl}
                  alt="Uploaded medical document"
                  draggable="false"
                  className="max-h-[78vh] max-w-[86vw] select-none rounded-md bg-white object-contain shadow-panel pointer-events-none"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function UploadBar({ file, isProcessing, onFileChange, onExtract, error }) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50">
            <UploadCloud className="h-4 w-4" />
            Choose Document
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="sr-only"
              onChange={onFileChange}
              disabled={isProcessing}
            />
          </label>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{file?.name ?? "JPG, PNG, PDF"}</p>
            {error ? <p className="truncate text-xs font-medium text-red-600">{error}</p> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onExtract}
          disabled={!file || isProcessing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Extract
        </button>
      </div>
    </div>
  );
}

function ConfidenceBanner({ record }) {
  if (!record) return null;

  const needsReview =
    Number(record.overall_confidence) < 0.85 || record.unclear_or_illegible_segments.length > 0;

  if (!needsReview) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />
        Auto-verified
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-amber-950">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div>
        <p className="text-sm font-bold text-red-700">Low Confidence: Manual Doctor Review Required</p>
        <p className="text-xs font-medium text-amber-800">
          Confidence {Math.round(Number(record.overall_confidence) * 100)}%
          {record.unclear_or_illegible_segments.length
            ? `, ${record.unclear_or_illegible_segments.length} unclear segment(s)`
            : ""}
        </p>
      </div>
    </div>
  );
}

function ReviewForm({ record, setRecord, onExport }) {
  const needsReview = useMemo(() => {
    if (!record) return false;
    return Number(record.overall_confidence) < 0.85 || record.unclear_or_illegible_segments.length > 0;
  }, [record]);

  if (!record) {
    return (
      <section className="flex min-h-[420px] flex-col bg-white lg:min-h-0">
        <div className="flex min-h-16 items-center border-b border-slate-200 px-4">
          <h2 className="text-sm font-semibold text-slate-900">Structured Data</h2>
        </div>
        <div className="grid flex-1 place-items-center px-8 text-center">
          <div>
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No extraction yet</p>
          </div>
        </div>
      </section>
    );
  }

  function updateField(key, value) {
    setRecord((current) => ({ ...current, [key]: value }));
  }

  function updateListItem(key, index, value) {
    setRecord((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  }

  function addListItem(key, value) {
    setRecord((current) => ({ ...current, [key]: [...current[key], value] }));
  }

  function removeListItem(key, index) {
    setRecord((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateMedication(index, key, value) {
    setRecord((current) => ({
      ...current,
      medications: current.medications.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function updateLab(index, key, value) {
    setRecord((current) => ({
      ...current,
      lab_investigations: current.lab_investigations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  return (
    <section className="flex min-h-[520px] flex-col bg-white lg:min-h-0">
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 px-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Structured Data</h2>
          <p className="text-xs text-slate-500">Doctor review draft</p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50"
        >
          <Download className="h-4 w-4" />
          Export JSON
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4">
          <ConfidenceBanner record={record} />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <TextField
            label="Document Type"
            value={record.document_type}
            onChange={(value) => updateField("document_type", value)}
            highlight={needsReview}
          />
          <TextField
            label="Confidence"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={record.overall_confidence}
            onChange={(value) => updateField("overall_confidence", clamp(Number(value), 0, 1))}
            highlight={needsReview}
          />
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Diagnoses</h3>
              <IconButton label="Add diagnosis" onClick={() => addListItem("diagnoses", "")}>
                <Plus className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="space-y-2">
              {record.diagnoses.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                  None listed
                </p>
              ) : (
                record.diagnoses.map((diagnosis, index) => (
                  <div key={`diagnosis-${index}`} className="flex items-center gap-2">
                    <TextField
                      label={`Diagnosis ${index + 1}`}
                      value={diagnosis}
                      onChange={(value) => updateListItem("diagnoses", index, value)}
                      highlight={needsReview}
                    />
                    <IconButton label="Remove diagnosis" onClick={() => removeListItem("diagnoses", index)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Medications</h3>
              <IconButton label="Add medication" onClick={() => addListItem("medications", emptyMedication)}>
                <Plus className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="space-y-3">
              {record.medications.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                  None listed
                </p>
              ) : (
                record.medications.map((medication, index) => (
                  <div key={`medication-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-normal text-slate-500">
                        Medication {index + 1}
                      </p>
                      <IconButton label="Remove medication" onClick={() => removeListItem("medications", index)}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <TextField
                        label="Name"
                        value={medication.name}
                        onChange={(value) => updateMedication(index, "name", value)}
                        highlight={needsReview}
                      />
                      <TextField
                        label="Dosage"
                        value={medication.dosage}
                        onChange={(value) => updateMedication(index, "dosage", value)}
                        highlight={needsReview}
                      />
                      <TextField
                        label="Frequency"
                        value={medication.frequency}
                        onChange={(value) => updateMedication(index, "frequency", value)}
                        highlight={needsReview}
                      />
                      <TextField
                        label="Duration"
                        value={medication.duration}
                        onChange={(value) => updateMedication(index, "duration", value)}
                        highlight={needsReview}
                      />
                    </div>
                    <div className="mt-3">
                      <TextAreaField
                        label="Instructions"
                        value={medication.instructions}
                        onChange={(value) => updateMedication(index, "instructions", value)}
                        highlight={needsReview}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Lab Investigations</h3>
              <IconButton label="Add lab investigation" onClick={() => addListItem("lab_investigations", emptyLab)}>
                <Plus className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="space-y-3">
              {record.lab_investigations.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                  None listed
                </p>
              ) : (
                record.lab_investigations.map((lab, index) => (
                  <div key={`lab-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-normal text-slate-500">
                        Investigation {index + 1}
                      </p>
                      <IconButton
                        label="Remove lab investigation"
                        onClick={() => removeListItem("lab_investigations", index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <TextField
                        label="Test Name"
                        value={lab.test_name}
                        onChange={(value) => updateLab(index, "test_name", value)}
                        highlight={needsReview}
                      />
                      <TextField
                        label="Observed Value"
                        value={lab.observed_value}
                        onChange={(value) => updateLab(index, "observed_value", value)}
                        highlight={needsReview}
                      />
                      <TextField
                        label="Reference Range"
                        value={lab.reference_range}
                        onChange={(value) => updateLab(index, "reference_range", value)}
                        highlight={needsReview}
                      />
                      <label className="flex h-10 items-center gap-3 self-end rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(lab.abnormal_flag)}
                          onChange={(event) => updateLab(index, "abnormal_flag", event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-200"
                        />
                        Abnormal
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Unclear Segments</h3>
              <IconButton
                label="Add unclear segment"
                onClick={() => addListItem("unclear_or_illegible_segments", "")}
              >
                <Plus className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="space-y-2">
              {record.unclear_or_illegible_segments.length === 0 ? (
                <p className="rounded-md border border-dashed border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                  No unclear handwriting recorded
                </p>
              ) : (
                record.unclear_or_illegible_segments.map((segment, index) => (
                  <div key={`unclear-${index}`} className="flex items-start gap-2">
                    <TextAreaField
                      label={`Segment ${index + 1}`}
                      value={segment}
                      onChange={(value) => updateListItem("unclear_or_illegible_segments", index, value)}
                      highlight={needsReview}
                    />
                    <IconButton
                      label="Remove unclear segment"
                      onClick={() => removeListItem("unclear_or_illegible_segments", index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setRecord(null);

    if (!nextFile) return;

    if (!isAcceptedFile(nextFile)) {
      setFile(null);
      setPreviewUrl("");
      setError("Unsupported file type.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function handleExtract() {
    if (!file) return;

    setIsProcessing(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/extract-document`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Extraction failed.";
        try {
          const payload = await response.json();
          message = typeof payload.detail === "string" ? payload.detail : message;
        } catch {
          message = response.statusText || message;
        }
        throw new Error(message);
      }

      const data = await response.json();
      setRecord(normalizeRecord(data));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Extraction failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleExport() {
    const finalized = normalizeRecord(record ?? emptyRecord);
    const json = JSON.stringify(finalized, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const fileBaseName = finalized.document_type || "medical-document";

    link.href = url;
    link.download = `${fileBaseName.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-record.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-cyan-700">Clinical Digitization</p>
            <h1 className="text-xl font-bold text-slate-950 md:text-2xl">Medical OCR Review</h1>
          </div>
          <p className="text-xs font-medium text-slate-500">Gemini structured extraction</p>
        </div>
      </header>

      <UploadBar
        file={file}
        isProcessing={isProcessing}
        onFileChange={handleFileChange}
        onExtract={handleExtract}
        error={error}
      />

      <div className="grid min-h-[calc(100vh-137px)] grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">
        <DocumentViewer previewUrl={previewUrl} file={file} />
        <ReviewForm record={record} setRecord={setRecord} onExport={handleExport} />
      </div>
    </main>
  );
}
