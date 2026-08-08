import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { useAuth } from "../lib/useAuth.js";
import {
  SCOPE_OF_WORK_OPTIONS,
  PHOTO_CATEGORY_OPTIONS,
  submitPhotoUpdate,
} from "../lib/projectPhotoLog.js";

// The home route ("/") -- app opens straight here after login + project
// resolve. Open -> capture -> minimum info -> submit -> confirmation ->
// back to camera, per the original build spec's core workflow.
export default function Camera({ project, projects, onSwitchProject }) {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const roleCode = appUser?.roles?.role_code;
  const fileInputRef = useRef(null);

  const [step, setStep] = useState("idle"); // idle | review | submitting | success
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [floorLevel, setFloorLevel] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState([]);
  const [photoCategory, setPhotoCategory] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  function openCamera() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
    setError("");
    setStep("review");
  }

  function retake() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStep("idle");
    openCamera();
  }

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function resetForNextPhoto() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFloorLevel("");
    setUnitNumber("");
    setScopeOfWork([]);
    setPhotoCategory([]);
    setRemarks("");
    setError("");
    setStep("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canSubmit = floorLevel.trim() && unitNumber.trim() && scopeOfWork.length > 0 && photoCategory.length > 0;

  async function handleSubmit() {
    if (!canSubmit || !file) return;
    setStep("submitting");
    setError("");
    try {
      await submitPhotoUpdate(project.id, { floorLevel, unitNumber, scopeOfWork, photoCategory, remarks, file });
      setStep("success");
      setTimeout(resetForNextPhoto, 1400);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
      setStep("review");
    }
  }

  const headerRight = (
    <>
      {roleCode === "field_pic" && (
        <button onClick={() => navigate("/dashboard")} className="text-xs text-brand-blue">Dashboard</button>
      )}
      {projects.length > 1 && (
        <button onClick={onSwitchProject} className="text-xs text-text-tertiary">Switch</button>
      )}
    </>
  );

  return (
    <AppShell project={project} title="Photo Log" right={headerRight}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {step === "idle" && (
        <div className="flex flex-col items-center justify-center py-16">
          <button
            onClick={openCamera}
            className="w-24 h-24 rounded-full bg-brand-blue shadow-glow-blue flex items-center justify-center text-white text-4xl active:scale-95 transition-transform"
            aria-label="Capture photo"
          >
            📷
          </button>
          <p className="mt-5 text-sm text-text-secondary text-center">
            Tap to take a project photo
          </p>
        </div>
      )}

      {(step === "review" || step === "submitting") && (
        <div className="space-y-4">
          <div className="rounded-card overflow-hidden border border-hair-soft">
            <img src={previewUrl} alt="Captured preview" className="w-full max-h-64 object-cover" />
          </div>
          <Button variant="secondary" size="sm" onClick={retake} disabled={step === "submitting"}>
            Retake
          </Button>

          <Card>
            <Input
              label="Floor Level"
              placeholder="e.g. 23F"
              value={floorLevel}
              onChange={(e) => setFloorLevel(e.target.value)}
              disabled={step === "submitting"}
            />
            <Input
              label="Unit Number"
              placeholder="e.g. 2305"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              disabled={step === "submitting"}
            />

            <div className="mb-4">
              <p className="block text-xs font-body font-medium text-text-secondary mb-2">Scope of Work</p>
              <div className="flex flex-wrap gap-2">
                {SCOPE_OF_WORK_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={step === "submitting"}
                    onClick={() => toggle(scopeOfWork, setScopeOfWork, opt)}
                    className={[
                      "px-3 py-2 rounded-control text-xs font-body font-medium border transition-colors",
                      scopeOfWork.includes(opt)
                        ? "bg-brand-blue text-white border-transparent"
                        : "bg-void text-text-secondary border-hair",
                    ].join(" ")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="block text-xs font-body font-medium text-text-secondary mb-2">Photo Category</p>
              <div className="flex flex-wrap gap-2">
                {PHOTO_CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={step === "submitting"}
                    onClick={() => toggle(photoCategory, setPhotoCategory, opt)}
                    className={[
                      "px-3 py-2 rounded-control text-xs font-body font-medium border transition-colors",
                      photoCategory.includes(opt)
                        ? "bg-brand-blue text-white border-transparent"
                        : "bg-void text-text-secondary border-hair",
                    ].join(" ")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-1">
              <label className="block text-xs font-body font-medium text-text-secondary mb-2">Remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={step === "submitting"}
                rows={2}
                className="w-full bg-void border border-hair rounded-control py-3 px-3.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-blue"
                placeholder="Optional notes"
              />
            </div>
          </Card>

          {error && <p className="text-sm text-status-red">{error}</p>}

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!canSubmit || step === "submitting"}
          >
            {step === "submitting" ? "Uploading..." : "Submit"}
          </Button>
        </div>
      )}

      {step === "success" && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-status-green/15 flex items-center justify-center text-status-green text-4xl mb-4">
            ✓
          </div>
          <p className="font-display font-bold text-lg text-text-primary">Updated Successfully</p>
          <p className="text-sm text-text-secondary mt-1">Photo Saved</p>
        </div>
      )}
    </AppShell>
  );
}
