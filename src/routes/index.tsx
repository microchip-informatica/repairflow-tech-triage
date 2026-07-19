import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createTicket } from "@/lib/tickets-data.functions";
import type { Diagnostico } from "@/lib/tickets.functions";
import { useTecnico } from "@/hooks/use-tecnico";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Cpu,
  Wrench,
  Upload,
  Sparkles,
  ClipboardList,
  AlertTriangle,
  Lightbulb,
  Euro,
  LayoutDashboard,
  Loader2,
  CheckCircle2,
  LogOut,
  UserCircle2,
} from "lucide-react";


export const Route = createFileRoute("/")({
  component: NewTicketPage,
});


type Result = { diagnostico: Diagnostico; ticketId: string };

const urgencyBadge = (u: string) => {
  if (u === "Alta")
    return "bg-[color:var(--color-urgency-high)] text-[color:var(--color-urgency-high-foreground)] hover:bg-[color:var(--color-urgency-high)]";
  if (u === "Media")
    return "bg-[color:var(--color-urgency-med)] text-[color:var(--color-urgency-med-foreground)] hover:bg-[color:var(--color-urgency-med)]";
  return "bg-[color:var(--color-urgency-low)] text-[color:var(--color-urgency-low-foreground)] hover:bg-[color:var(--color-urgency-low)]";
};

function NewTicketPage() {
  const createFn = useServerFn(createTicket);
  const { tecnico, logout } = useTecnico();
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [detalleTecnico, setDetalleTecnico] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingKind, setLoadingKind] = useState<"save" | "ai" | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [savedTicketId, setSavedTicketId] = useState<string | null>(null);

  const resetForm = () => {
    setCliente("");
    setTelefono("");
    setDescripcion("");
    setDetalleTecnico("");
    setFoto(null);
    setResult(null);
    setSavedTicketId(null);
  };

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const onSubmit = async (e: React.SyntheticEvent, withAi: boolean) => {
    e.preventDefault();
    if (!cliente.trim() || !descripcion.trim()) {
      toast.error("Rellena el nombre y la descripción.");
      return;
    }
    setLoading(true);
    setLoadingKind(withAi ? "ai" : "save");

    try {
      let fotoBase64: string | null = null;
      let fotoExt: string | null = null;
      let fotoMime: string | null = null;
      if (foto) {
        fotoBase64 = await readFileAsBase64(foto);
        fotoExt = foto.name.split(".").pop() ?? "jpg";
        fotoMime = foto.type || null;
      }

      const { ticket } = await createFn({
        data: {
          cliente: cliente.trim(),
          telefono: telefono.trim() || null,
          descripcion: descripcion.trim(),
          detalleTecnico: detalleTecnico.trim() || null,
          fotoBase64,
          fotoExt,
          fotoMime,
          withAi,
        },
      });

      const diag: Diagnostico | null = ticket.titulo && withAi
        ? {
            categoria: ticket.categoria ?? "",
            urgencia: (ticket.urgencia as Diagnostico["urgencia"]) ?? "Media",
            titulo: ticket.titulo,
            causas: ticket.causas ?? [],
            recomendacion: ticket.recomendacion ?? "",
            coste_estimado: ticket.coste_estimado ?? "",
          }
        : null;

      setResult(diag ? { diagnostico: diag, ticketId: ticket.id } : null);
      setSavedTicketId(ticket.id);
      toast.success(diag ? "OR creada y diagnóstico generado." : "Orden de reparación guardada.");

      // No limpiamos el formulario aquí para que el técnico vea claramente
      // que la OR se ha guardado con sus datos. Puede pulsar "Nueva OR" para reiniciar.
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error al procesar la orden de reparación.");
    } finally {
      setLoading(false);
      setLoadingKind(null);
    }
  };



  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-lg tracking-tight">
              Repair<span className="text-primary">Flow</span>
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
                <LayoutDashboard className="w-4 h-4 mr-1.5" />
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

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-accent text-accent-foreground px-3 py-1 rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Diagnóstico con IA
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Nueva orden de reparación</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Gestión de reparaciones apoyadas por IA.
          </p>
        </div>

        <div className={`grid gap-6 ${result ? "md:grid-cols-5" : "justify-items-center"}`}>
          <Card className={result ? "w-full md:col-span-3" : "w-full max-w-2xl"}>

            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Datos de la OR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cliente">Nombre del cliente *</Label>
                    <Input
                      id="cliente"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      placeholder="Ej. Ana García"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telefono">Teléfono / Referencía</Label>
                    <Input
                      id="telefono"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Opcional"
                      inputMode="tel"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="descripcion">Describe el problema *</Label>
                  <Textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej. El portátil no arranca, se enciende el LED pero la pantalla queda negra..."
                    rows={5}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="detalleTecnico">Detalle reparación técnico</Label>
                  <Textarea
                    id="detalleTecnico"
                    value={detalleTecnico}
                    onChange={(e) => setDetalleTecnico(e.target.value)}
                    placeholder="Observaciones técnicas: pruebas realizadas, componentes revisados, hallazgos…"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    La IA usará la descripción del problema y este detalle para generar el diagnóstico.
                  </p>
                </div>


                <div className="space-y-1.5">
                  <Label htmlFor="foto">Foto del dispositivo (opcional)</Label>
                  <label
                    htmlFor="foto"
                    className="flex items-center gap-3 border border-dashed rounded-md px-4 py-3 cursor-pointer hover:bg-accent/40 transition"
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate">
                      {foto ? foto.name : "Adjuntar imagen (JPG, PNG)"}
                    </span>
                    <input
                      id="foto"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={loading}
                    onClick={(e) => onSubmit(e, false)}
                  >
                    {loadingKind === "save" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando…
                      </>
                    ) : (
                      <>
                        <ClipboardList className="w-4 h-4 mr-2" />
                        Guardar OR
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={loading}
                    onClick={(e) => onSubmit(e, true)}
                  >
                    {loadingKind === "ai" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analizando…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generar diagnóstico
                      </>
                    )}
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>

          {result && (
          <div className="md:col-span-2">

            {result ? (
              <Card className="border-primary/30 shadow-lg shadow-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-xs text-primary font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Diagnóstico generado
                  </div>
                  <CardTitle className="text-xl leading-snug">{result.diagnostico.titulo}</CardTitle>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="secondary" className="gap-1">
                      <Cpu className="w-3 h-3" />
                      {result.diagnostico.categoria}
                    </Badge>
                    <Badge className={urgencyBadge(result.diagnostico.urgencia)}>
                      Urgencia {result.diagnostico.urgencia}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1.5 font-medium mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-primary" />
                      Causas probables
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                      {result.diagnostico.causas.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-medium mb-1">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      Recomendación
                    </div>
                    <p className="text-muted-foreground">{result.diagnostico.recomendacion}</p>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Euro className="w-4 h-4 text-primary" />
                      Coste estimado
                    </span>
                    <span className="font-semibold">{result.diagnostico.coste_estimado}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    OR #{result.ticketId.slice(0, 8)} guardada como <b>pendiente</b>.
                  </p>
                </CardContent>
              </Card>
            ) : null}

          </div>
          )}

        </div>
      </main>
    </div>
  );
}
