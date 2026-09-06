import { useState } from "react";
import { CheckCircle2, Save, Trash2 } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useHistory } from "@/hooks/useHistory";
import { useToast } from "@/components/Toast";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { NumberField, SelectField, Switch, TextField } from "@/components/ui/Field";
import { AUDIO_FORMATS } from "@/lib/constants";
import type { AudioFormat } from "@/types/api";

export function SettingsPage() {
  const { settings, update, reset } = useSettings();
  const { clear } = useHistory();
  const { status, health, error, refresh } = useBackendStatus(30_000);
  const toast = useToast();

  const [local, setLocal] = useState(settings);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const patch = (p: Partial<typeof local>) => setLocal((prev) => ({ ...prev, ...p }));

  const save = () => {
    update(local);
    toast.success("Settings saved");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 lg:py-8">
      <div className="text-xs uppercase tracking-[0.2em] text-brand-400 font-semibold">
        Raj Studio · Settings
      </div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-ink-100">Settings</h1>
      <p className="text-sm text-ink-400 mt-1">
        Stored locally in this browser. Nothing is sent anywhere except the backend URL you configure below.
      </p>

      <div className="mt-6 card p-6 space-y-5">
        <div className="text-sm font-semibold text-ink-100">Backend connection</div>
        <TextField
          label="ACE-Step API URL"
          value={local.baseUrl}
          onChange={(e) => patch({ baseUrl: e.target.value })}
          placeholder="http://127.0.0.1:8001"
          hint="Base URL of your FastAPI server (no trailing slash)."
        />
        <TextField
          label="API key (optional)"
          value={local.apiKey}
          onChange={(e) => patch({ apiKey: e.target.value })}
          type="password"
          placeholder="Only if the backend was launched with ACESTEP_API_KEY"
          hint="Sent as an Authorization: Bearer header. Never leaves your browser except to that backend."
        />
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-ink-400">
            <div>
              Status:{" "}
              <span
                className={
                  status === "online"
                    ? "text-emerald-300"
                    : status === "offline"
                    ? "text-rose-300"
                    : "text-brand-300"
                }
              >
                {status}
              </span>
            </div>
            {health?.loaded_model && (
              <div>
                Loaded DiT model:{" "}
                <span className="text-ink-200 font-mono">{health.loaded_model}</span>
              </div>
            )}
            {health?.loaded_lm_model && (
              <div>
                Loaded LM:{" "}
                <span className="text-ink-200 font-mono">{health.loaded_lm_model}</span>
              </div>
            )}
            {status === "offline" && error && (
              <div className="text-rose-300 mt-1">{error}</div>
            )}
          </div>
          <button className="btn-secondary h-9" onClick={refresh}>
            <CheckCircle2 className="h-4 w-4" />
            <span>Test</span>
          </button>
        </div>
      </div>

      <div className="mt-6 card p-6 space-y-5">
        <div className="text-sm font-semibold text-ink-100">Generation defaults</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField
            label="Default audio format"
            value={local.defaultFormat}
            onChange={(e) => patch({ defaultFormat: e.target.value as AudioFormat })}
            options={AUDIO_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))}
          />
          <NumberField
            label="Default duration (s)"
            min={5}
            max={600}
            step={1}
            value={String(local.defaultDuration)}
            onChange={(e) => patch({ defaultDuration: Number(e.target.value) || 60 })}
          />
          <NumberField
            label="Default inference steps"
            min={1}
            max={200}
            step={1}
            value={String(local.defaultInferenceSteps)}
            onChange={(e) => patch({ defaultInferenceSteps: Number(e.target.value) || 27 })}
          />
          <NumberField
            label="Default guidance scale"
            min={0}
            max={30}
            step={0.1}
            value={String(local.defaultGuidanceScale)}
            onChange={(e) => patch({ defaultGuidanceScale: Number(e.target.value) || 7 })}
          />
        </div>
        <Switch
          checked={local.keepHistory}
          onChange={(v) => patch({ keepHistory: v })}
          label="Save generations to local history"
          hint="Turn off to keep this browser session ephemeral."
        />
      </div>

      <div className="mt-6 card p-6 space-y-4">
        <div className="text-sm font-semibold text-ink-100">Local data</div>
        <p className="text-xs text-ink-400">
          Clearing local data removes your generation history and project index from this browser only.
          Audio files themselves are stored on the ACE-Step backend and are not affected.
        </p>
        {confirmClearHistory ? (
          <div className="flex gap-2">
            <button className="btn-secondary h-9" onClick={() => setConfirmClearHistory(false)}>
              Cancel
            </button>
            <button
              className="btn h-9 bg-rose-500 text-white hover:brightness-110"
              onClick={() => {
                clear();
                setConfirmClearHistory(false);
                toast.info("Local history cleared");
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span>Confirm clear</span>
            </button>
          </div>
        ) : (
          <button className="btn-secondary h-9" onClick={() => setConfirmClearHistory(true)}>
            <Trash2 className="h-4 w-4" />
            <span>Clear local history</span>
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <button
          className="btn-ghost h-10"
          onClick={() => {
            reset();
            setLocal({
              baseUrl: "http://127.0.0.1:8001",
              apiKey: "",
              defaultFormat: "mp3",
              defaultInferenceSteps: 27,
              defaultGuidanceScale: 7.0,
              defaultDuration: 60,
              keepHistory: true,
            });
            toast.info("Settings restored to defaults");
          }}
        >
          Restore defaults
        </button>
        <button className="btn-primary h-10 px-5" onClick={save}>
          <Save className="h-4 w-4" />
          <span>Save settings</span>
        </button>
      </div>
    </div>
  );
}
