import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useTecnico } from "@/hooks/use-tecnico";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, register } = useTecnico();
  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);

  // Login state
  const [lu, setLu] = useState("");
  const [lp, setLp] = useState("");

  // Register state
  const [ru, setRu] = useState("");
  const [rn, setRn] = useState("");
  const [rp, setRp] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(lu, lp);
      toast.success(`Bienvenido, ${lu}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (rp.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setBusy(true);
    try {
      await register(ru, rn, rp);
      toast.success(`Cuenta creada. Bienvenido, ${rn}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-background to-accent/30">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-11 h-11 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Wrench className="w-6 h-6" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">
            Repair<span className="text-primary">Flow</span>
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceso técnico</CardTitle>
            <CardDescription>Inicia sesión o crea tu cuenta de técnico.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarme</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lu">Usuario</Label>
                    <Input id="lu" value={lu} onChange={(e) => setLu(e.target.value)} autoComplete="username" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lp">Contraseña</Label>
                    <Input id="lp" type="password" value={lp} onChange={(e) => setLp(e.target.value)} autoComplete="current-password" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rn">Nombre completo</Label>
                    <Input id="rn" value={rn} onChange={(e) => setRn(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ru">Usuario</Label>
                    <Input id="ru" value={ru} onChange={(e) => setRu(e.target.value)} autoComplete="username" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rp">Contraseña</Label>
                    <Input id="rp" type="password" value={rp} onChange={(e) => setRp(e.target.value)} autoComplete="new-password" required minLength={6} />
                    <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Crear cuenta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
