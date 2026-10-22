import { useRef, useState, type FormEvent } from "react";
import { Download, Upload, Trash2, Database, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJournalContext } from "@/components/journal-context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { localDate, parseBackup, type AppData } from "@/lib/domain";
import { useToast } from "@/hooks/use-toast";

type Pending = { kind: "samples" } | { kind: "clear" } | { kind: "import"; data: AppData } | null;

export default function SettingsPage() {
  const { data, error, recoveryRequired, recoveryRaw, saveProfile, replaceData, clearData, loadSamples } = useJournalContext();
  const { toast } = useToast();
  const [profile, setProfile] = useState(data.profile);
  const [pending, setPending] = useState<Pending>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasData = recoveryRequired || data.entries.length > 0 || Boolean(error) || Object.values(data.profile).some(Boolean);

  const submitProfile = async (e: FormEvent) => {
    e.preventDefault();
    const clean = { name: profile.name.trim(), role: profile.role.trim(), organization: profile.organization.trim() };
    if (await saveProfile(clean)) toast({ title: "Profile saved" });
  };

  const doSamples = async () => { if (await loadSamples()) { setProfile(data.profile); toast({ title: "Sample data loaded", description: "Explore freely. Clear it whenever you are ready." }); } };
  const doClear = async () => { if (await clearData()) { setProfile({ name: "", role: "", organization: "" }); toast({ title: "All data cleared" }); } };
  const doImport = async (d: AppData) => { if (await replaceData(d)) { setProfile(d.profile); toast({ title: "Backup restored", description: `${d.entries.length} entries imported.` }); } };

  const exportBackup = () => {
    if (recoveryRequired && recoveryRaw === null) return;
    const url = URL.createObjectURL(new Blob([recoveryRequired ? recoveryRaw! : JSON.stringify(data, null, 2)], { type: recoveryRequired ? "text/plain" : "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = recoveryRequired ? `internlog-recovery-${localDate()}.txt` : `internlog-backup-${localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast({ title: recoveryRequired ? "Recovery file downloaded" : "Backup exported", description: recoveryRequired ? "Original damaged data saved for rescue. This is not a validated backup." : a.download });
  };

  const onFile = async (file: File | undefined) => {
    setImportError(null);
    if (!file) return;
    try {
      const parsed = parseBackup(await file.text());
      setPending({ kind: "import", data: parsed });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "That file could not be read.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirm = async () => {
    if (!pending) return;
    if (pending.kind === "samples") await doSamples();
    if (pending.kind === "clear") await doClear();
    if (pending.kind === "import") await doImport(pending.data);
    setPending(null);
  };

  const card = "rounded-3xl border border-card-border bg-card p-6 shadow-sm md:p-8";
  const fields = [
    { k: "name", label: "Your name", ph: "Priya Raman" },
    { k: "role", label: "Role", ph: "Product design intern" },
    { k: "organization", label: "Organization", ph: "Harbor Lab" },
  ] as const;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-semibold md:text-4xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your details appear at the top of each weekly report.</p>
      </header>

      <form onSubmit={submitProfile} className={card}>
        <h2 className="text-xl font-semibold">Profile</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {fields.map(({ k, label, ph }) => (
            <div key={k} className={k === "name" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
              <label htmlFor={`p-${k}`} className="text-sm font-semibold">{label}</label>
              <Input id={`p-${k}`} value={profile[k]} placeholder={ph} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} data-testid={`input-profile-${k}`} />
            </div>
          ))}
        </div>
        <Button type="submit" className="mt-5" data-testid="button-save-profile">Save profile</Button>
      </form>

      <section className={card}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-primary" aria-hidden />
          <div>
            <h2 className="text-xl font-semibold">Your data lives in this browser</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              InternLog has no account and no server. Entries are kept in this browser's local storage, so clearing site data,
              switching browsers, or using private mode can lose them. Export a backup every week or so.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Journal contents are not sent to a server. Google Fonts receives standard web request information when loading the app's fonts.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {recoveryRequired
            ? <Button onClick={exportBackup} disabled={recoveryRaw === null} data-testid="button-export-recovery"><Download className="mr-1.5 h-4 w-4" aria-hidden />Download recovery file</Button>
            : <Button onClick={exportBackup} data-testid="button-export"><Download className="mr-1.5 h-4 w-4" aria-hidden />Export backup</Button>}
          <Button variant="outline" onClick={() => fileRef.current?.click()} data-testid="button-import"><Upload className="mr-1.5 h-4 w-4" aria-hidden />Import backup</Button>
          <label htmlFor="import-file" className="sr-only">Backup file</label>
          <input id="import-file" ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} data-testid="input-import-file" />
        </div>
        {recoveryRequired && <p role="status" className="mt-3 text-sm text-destructive">Saved data needs recovery. Ordinary saves are blocked, even if you dismiss the warning. Download the original damaged data before replacing it. The recovery file is not a validated JSON backup.{recoveryRaw === null && " Browser storage could not be accessed, so a recovery download is unavailable."}</p>}
        {importError && <p role="alert" className="mt-3 rounded-lg bg-destructive/5 p-3 text-sm text-destructive" data-testid="text-import-error">Import failed: {importError}</p>}
      </section>

      <section className={card}>
        <h2 className="text-xl font-semibold">Try it out or start over</h2>
        <div className="mt-4 divide-y divide-border">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-semibold flex items-center gap-2"><Database className="h-4 w-4 text-primary" aria-hidden />Load sample data</p>
              <p className="text-sm text-muted-foreground">Five example entries for the current week, including open and resolved blockers.</p>
            </div>
            <Button variant="outline" onClick={() => (hasData ? setPending({ kind: "samples" }) : doSamples())} data-testid="button-load-samples">Load samples</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-semibold flex items-center gap-2"><Trash2 className="h-4 w-4 text-destructive" aria-hidden />Clear all data</p>
              <p className="text-sm text-muted-foreground">Removes every entry and your profile from this browser.</p>
            </div>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setPending({ kind: "clear" })} data-testid="button-clear-data">Clear data</Button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.kind === "clear" ? "Clear everything?" : pending?.kind === "import" ? "Replace your journal with this backup?" : "Replace your journal with sample data?"}
        description={
          pending?.kind === "clear"
            ? "Every entry and your profile will be deleted from this browser. Export a backup first if you might want them later."
            : pending?.kind === "import"
              ? `Your current profile and ${data.entries.length} entries will be replaced by the profile and ${pending.data.entries.length} entries in the file. Export a backup first if you want to keep them.`
              : `Your current ${data.entries.length} entries will be replaced. Export a backup first if you want to keep them.`
        }
        confirmLabel={pending?.kind === "clear" ? "Clear everything" : pending?.kind === "import" ? "Replace with backup" : "Replace with samples"}
        onConfirm={confirm}
      />
    </div>
  );
}
