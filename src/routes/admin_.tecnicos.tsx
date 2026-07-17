import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listTecnicos,
  approveTecnico,
  revokeTecnico,
  setAdminTecnico,
  deleteTecnico,
  resetTecnicoPassword,
  type TecnicoRow,
} from "@/lib/auth.functions";
import { useTecnico } from "@/hooks/use-tecnico";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Wrench,
  ArrowLeft,
  Loader2,
  UserCheck,
  UserX,
  ShieldCheck,
  Shield,
  Trash2,
  UserCircle2,
  LogOut,
  KeyRound,
} from "lucide-react";

export const Route = createFileRoute("/admin_/tecnicos")({
  component: AdminTecnicosPage,
});

function AdminTecnicosPage() {
  const { tecnico, logout } = useTecnico();
  const navigate = useNavigate();
  const listFn = useServerFn(listTecnicos);
  const approveFn = useServerFn(approveTecnico);
  const revokeFn = useServerFn(revokeTecnico);
  const setAdminFn = useServerFn(setAdminTecnico);
  const deleteFn = useServerFn(deleteTecnico);
  const resetPwdFn = useServerFn(resetTecnicoPassword);

  const [rows, setRows] = useState<TecnicoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pwdTarget, setPwdTarget] = useState<TecnicoRow | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listFn());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error cargando técnicos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tecnico && !tecnico.is_admin) {
      toast.error("Solo administradores");
      navigate({ to: "/admin" });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tecnico]);

  const run = async (id: string, fn: () => Promise<unknown>, msg: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(msg);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyId(null);
    }
  };

  const pending = rows.filter((r) => !r.approved);
  const active = rows.filter((r) => r.approved);

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-lg tracking-tight">
              Repair<span className="text-primary">Flow</span>
              <span className="text-muted-foreground font-normal ml-1.5 text-sm">/ Técnicos</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {tecnico && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-muted-foreground px-2.5 py-1 rounded-md bg-accent/60">
                <UserCircle2 className="w-4 h-4" />
                {tecnico.nombre}
              </span>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Panel
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestión de técnicos</h1>
          <p className="text-sm text-muted-foreground">
            Aprueba nuevas cuentas, asigna administradores y elimina técnicos.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                Pendientes de aprobación
                <Badge variant="secondary">{pending.length}</Badge>
              </h2>
              {pending.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground text-center">
                    No hay solicitudes pendientes.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-2">
                  {pending.map((r) => (
                    <TecnicoRowCard
                      key={r.id}
                      row={r}
                      busy={busyId === r.id}
                      onApprove={() => run(r.id, () => approveFn({ data: { id: r.id } }), "Aprobado")}
                      onDelete={() => run(r.id, () => deleteFn({ data: { id: r.id } }), "Eliminado")}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                Técnicos activos
                <Badge variant="secondary">{active.length}</Badge>
              </h2>
              <div className="grid gap-2">
                {active.map((r) => (
                  <TecnicoRowCard
                    key={r.id}
                    row={r}
                    busy={busyId === r.id}
                    isSelf={tecnico?.id === r.id}
                    onRevoke={() => run(r.id, () => revokeFn({ data: { id: r.id } }), "Acceso revocado")}
                    onToggleAdmin={() =>
                      run(
                        r.id,
                        () => setAdminFn({ data: { id: r.id, is_admin: !r.is_admin } }),
                        r.is_admin ? "Ya no es administrador" : "Ahora es administrador",
                      )
                    }
                    onDelete={() => run(r.id, () => deleteFn({ data: { id: r.id } }), "Eliminado")}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function TecnicoRowCard({
  row,
  busy,
  isSelf,
  onApprove,
  onRevoke,
  onToggleAdmin,
  onDelete,
  onChangePassword,
}: {
  row: TecnicoRow;
  busy: boolean;
  isSelf?: boolean;
  onApprove?: () => void;
  onRevoke?: () => void;
  onToggleAdmin?: () => void;
  onDelete: () => void;
  onChangePassword: () => void;
}) {
  const isMainAdmin = row.username === "admin";
  return (
    <Card>
      <CardContent className="py-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-medium flex items-center gap-2">
            {row.nombre}
            {row.is_admin && (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 gap-1">
                <ShieldCheck className="w-3 h-3" /> Admin
              </Badge>
            )}
            {isSelf && <Badge variant="outline">Tú</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">@{row.username}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {onApprove && (
            <Button size="sm" onClick={onApprove} disabled={busy}>
              <UserCheck className="w-4 h-4 mr-1.5" /> Aprobar
            </Button>
          )}
          {onRevoke && !isMainAdmin && !isSelf && (
            <Button size="sm" variant="outline" onClick={onRevoke} disabled={busy}>
              <UserX className="w-4 h-4 mr-1.5" /> Revocar
            </Button>
          )}
          {onToggleAdmin && !isMainAdmin && !isSelf && (
            <Button size="sm" variant="outline" onClick={onToggleAdmin} disabled={busy}>
              {row.is_admin ? (
                <><Shield className="w-4 h-4 mr-1.5" /> Quitar admin</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-1.5" /> Hacer admin</>
              )}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onChangePassword} disabled={busy}>
            <KeyRound className="w-4 h-4 mr-1.5" /> Contraseña
          </Button>
          {!isMainAdmin && !isSelf && (
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={busy}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
