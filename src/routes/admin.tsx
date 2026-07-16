import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listTickets,
  updateTicket as updateTicketFn,
  regenerateDiagnostico,
  getTicketPhotoUrl,
  type TicketRow,
} from "@/lib/tickets-data.functions";
import { useTecnico } from "@/hooks/use-tecnico";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Wrench,
  Search,
  Filter,
  Phone,
  Cpu,
  AlertTriangle,
  Lightbulb,
  Euro,
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  UserCircle2,
  LogOut,
  Users,
} from "lucide-react";




export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Ticket = TicketRow;



const urgencyBadge = (u: string | null) => {
  if (u === "Alta")
    return "bg-[color:var(--color-urgency-high)] text-[color:var(--color-urgency-high-foreground)] hover:bg-[color:var(--color-urgency-high)]";
  if (u === "Media")
    return "bg-[color:var(--color-urgency-med)] text-[color:var(--color-urgency-med-foreground)] hover:bg-[color:var(--color-urgency-med)]";
  if (u === "Baja")
    return "bg-[color:var(--color-urgency-low)] text-[color:var(--color-urgency-low-foreground)] hover:bg-[color:var(--color-urgency-low)]";
  return "bg-muted text-muted-foreground hover:bg-muted";
};

const estadoBadge = (s: string) => {
  if (s === "terminado") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "en curso") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminPage() {
  const { tecnico, logout } = useTecnico();
  const listFn = useServerFn(listTickets);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);


  const [search, setSearch] = useState("");
  const [fUrgencia, setFUrgencia] = useState<string>("all");
  const [fEstado, setFEstado] = useState<string>("all");
  const [fCategoria, setFCategoria] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await listFn();
      setTickets(data);
    } catch {
      toast.error("Error cargando tickets");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    load();
  }, []);

  const categorias = useMemo(
    () =>
      Array.from(new Set(tickets.map((t) => t.categoria).filter(Boolean) as string[])).sort(),
    [tickets],
  );

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (search && !t.cliente.toLowerCase().includes(search.toLowerCase())) return false;
      if (fUrgencia !== "all" && t.urgencia !== fUrgencia) return false;
      if (fEstado !== "all" && t.estado !== fEstado) return false;
      if (fCategoria !== "all" && t.categoria !== fCategoria) return false;
      return true;
    });
  }, [tickets, search, fUrgencia, fEstado, fCategoria]);

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-lg tracking-tight">
              Repair<span className="text-primary">Flow</span>
              <span className="text-muted-foreground font-normal ml-1.5 text-sm">/ Panel</span>
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
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Nuevo ticket
              </Link>
            </Button>
            {tecnico?.is_admin && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/tecnicos">
                  <Users className="w-4 h-4 mr-1.5" />
                  Técnicos
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Salir
            </Button>

          </div>

        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tickets</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Cargando…" : `${filtered.length} de ${tickets.length}`}
            </p>
          </div>
        </div>

        <Card className="mb-5">
          <CardContent className="pt-5 pb-4 grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={fUrgencia} onValueChange={setFUrgencia}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-1" />
                <SelectValue placeholder="Urgencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las urgencias</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2 md:col-span-1 md:grid-cols-1 md:gap-0">
              <Select value={fEstado} onValueChange={setFEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en curso">En curso</SelectItem>
                  <SelectItem value="terminado">Terminado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={fCategoria} onValueChange={setFCategoria}>
              <SelectTrigger className="md:col-span-4 md:!w-64">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No hay tickets que coincidan.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="text-left"
              >
                <Card className="hover:border-primary/50 hover:shadow-md transition cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <Badge className={urgencyBadge(t.urgencia)}>
                            {t.urgencia ?? "—"}
                          </Badge>
                          {t.categoria && (
                            <Badge variant="secondary" className="gap-1">
                              <Cpu className="w-3 h-3" />
                              {t.categoria}
                            </Badge>
                          )}
                          <Badge variant="outline" className={estadoBadge(t.estado)}>
                            {t.estado}
                          </Badge>
                        </div>
                        <div className="font-semibold text-base leading-snug">
                          {t.titulo ?? t.descripcion.slice(0, 60)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5 truncate">
                          {t.cliente}
                          {t.telefono && ` · ${t.telefono}`}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(t.created_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </main>

      <TicketDetail
        ticket={selected}
        onClose={() => setSelected(null)}
        onUpdated={(t) => {
          setTickets((prev) => prev.map((p) => (p.id === t.id ? t : p)));
          setSelected(t);
        }}
      />
    </div>
  );
}

function TicketDetail({
  ticket,
  onClose,
  onUpdated,
}: {
  ticket: Ticket | null;
  onClose: () => void;
  onUpdated: (t: Ticket) => void;
}) {
  const updateFn = useServerFn(updateTicketFn);
  const regenFn = useServerFn(regenerateDiagnostico);
  const photoFn = useServerFn(getTicketPhotoUrl);
  useTecnico(); // ensure session context is present; identity stamped server-side

  const [notas, setNotas] = useState("");
  const [estado, setEstado] = useState<"pendiente" | "en curso" | "terminado">("pendiente");
  const [descripcion, setDescripcion] = useState("");
  const [detalleTecnico, setDetalleTecnico] = useState("");
  const [urgencia, setUrgencia] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket) return;
    setNotas(ticket.notas ?? "");
    setEstado((ticket.estado as "pendiente" | "en curso" | "terminado") ?? "pendiente");
    setDescripcion(ticket.descripcion);
    setDetalleTecnico(ticket.detalle_tecnico ?? "");
    setUrgencia(ticket.urgencia ?? "");
    setPhotoUrl(null);
    if (ticket.foto_url) {
      photoFn({ data: { path: ticket.foto_url } })
        .then((res) => setPhotoUrl(res.url))
        .catch(() => setPhotoUrl(null));
    }
  }, [ticket, photoFn]);

  if (!ticket) return null;

  const causas = Array.isArray(ticket.causas) ? ticket.causas : [];
  const hasDiagnostico = Boolean(
    ticket.titulo || ticket.categoria || ticket.urgencia || ticket.recomendacion || causas.length > 0,
  );

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateFn({
        data: {
          id: ticket.id,
          estado,
          notas: notas || null,
          descripcion: descripcion.trim() || ticket.descripcion,
          detalleTecnico: detalleTecnico.trim() || null,
          urgencia: (urgencia || null) as "Alta" | "Media" | "Baja" | null,
        },
      });
      toast.success("Ticket actualizado");
      onUpdated(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const generateDiagnostico = async () => {
    setGenerating(true);
    try {
      const currentDesc = descripcion.trim() || ticket.descripcion;
      const currentDetalle = detalleTecnico.trim() || null;
      const updated = await regenFn({
        data: { id: ticket.id, descripcion: currentDesc, detalleTecnico: currentDetalle },
      });
      toast.success("Diagnóstico IA generado");
      onUpdated(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error generando diagnóstico");
    } finally {
      setGenerating(false);
    }
  };



  return (
    <Dialog open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge className={urgencyBadge(ticket.urgencia)}>
              Urgencia {ticket.urgencia ?? "—"}
            </Badge>
            {ticket.categoria && (
              <Badge variant="secondary" className="gap-1">
                <Cpu className="w-3 h-3" />
                {ticket.categoria}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl leading-snug">
            {ticket.titulo ?? "Ticket"}
          </DialogTitle>
          <DialogDescription>
            {ticket.cliente}
            {ticket.telefono && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {ticket.telefono}
                </span>
              </>
            )}
            {" · "}
            {formatDate(ticket.created_at)}
            {ticket.tecnico_nombre && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <UserCircle2 className="w-3 h-3" />
                  {ticket.tecnico_nombre}
                </span>
              </>
            )}
          </DialogDescription>

        </DialogHeader>

        <div className="space-y-5 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripción del problema</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              placeholder="Descripción original o actualizada del problema…"
            />
            <p className="text-xs text-muted-foreground">
              El técnico puede actualizar la descripción con datos nuevos.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="detalleTecnico">Detalle reparación técnico</Label>
            <Textarea
              id="detalleTecnico"
              value={detalleTecnico}
              onChange={(e) => setDetalleTecnico(e.target.value)}
              rows={4}
              placeholder="Observaciones técnicas: pruebas realizadas, componentes revisados, hallazgos…"
            />
            <p className="text-xs text-muted-foreground">
              La IA combinará la descripción y este detalle al generar el diagnóstico.
            </p>
          </div>



          {photoUrl && (
            <div>
              <div className="font-medium mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" /> Foto adjunta
              </div>
              <a href={photoUrl} target="_blank" rel="noreferrer">
                <img
                  src={photoUrl}
                  alt="Dispositivo"
                  className="rounded-md border max-h-64 object-contain"
                />
              </a>
            </div>
          )}

          <div className="rounded-md border bg-accent/30 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 text-primary" />
                Diagnóstico IA
                {hasDiagnostico ? (
                  <Badge variant="secondary" className="ml-1">Generado</Badge>
                ) : (
                  <Badge variant="outline" className="ml-1">Sin generar</Badge>
                )}
              </div>
              <Button size="sm" onClick={generateDiagnostico} disabled={generating}>
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando…</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> {hasDiagnostico ? "Regenerar" : "Generar diagnóstico"}</>
                )}
              </Button>
            </div>

            {!hasDiagnostico ? (
              <p className="text-xs text-muted-foreground">
                Aún no se ha generado un análisis técnico automático. La IA usará la descripción, el detalle técnico{photoUrl ? " y la foto adjunta" : ""} para generarlo.
              </p>
            ) : (
              <div className="space-y-4 rounded-md border bg-background p-4">
                {ticket.titulo && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Título</div>
                    <div className="font-semibold leading-snug">{ticket.titulo}</div>
                  </div>
                )}

                {causas.length > 0 && (
                  <div>
                    <div className="font-medium mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-primary" /> Causas probables
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                      {causas.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {ticket.recomendacion && (
                  <div>
                    <div className="font-medium mb-1 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-primary" /> Recomendación
                    </div>
                    <p className="text-muted-foreground">{ticket.recomendacion}</p>
                  </div>
                )}

                {ticket.coste_estimado && (
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Euro className="w-4 h-4 text-primary" /> Coste estimado
                    </span>
                    <span className="font-semibold">{ticket.coste_estimado}</span>
                  </div>
                )}
              </div>
            )}
          </div>


          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en curso">En curso</SelectItem>
                  <SelectItem value="terminado">Terminado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Urgencia</Label>
              <Select value={urgencia || "none"} onValueChange={(v) => setUrgencia(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin definir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin definir</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas internas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones del técnico…"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
