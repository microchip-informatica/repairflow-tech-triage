import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getCurrentTecnico,
  loginTecnico,
  logoutTecnico,
  registerTecnico,
  type TecnicoSession,
} from "@/lib/auth.functions";

type Tecnico = NonNullable<TecnicoSession>;

type Ctx = {
  tecnico: Tecnico | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, nombre: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const TecnicoCtx = createContext<Ctx | null>(null);

export function TecnicoProvider({ children }: { children: ReactNode }) {
  const meFn = useServerFn(getCurrentTecnico);
  const loginFn = useServerFn(loginTecnico);
  const registerFn = useServerFn(registerTecnico);
  const logoutFn = useServerFn(logoutTecnico);

  const [tecnico, setTecnico] = useState<Tecnico | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    meFn()
      .then((t) => setTecnico(t))
      .finally(() => setLoading(false));
  }, [meFn]);

  const login = async (username: string, password: string) => {
    const t = await loginFn({ data: { username, password } });
    setTecnico(t);
  };
  const register = async (username: string, nombre: string, password: string) => {
    const t = await registerFn({ data: { username, nombre, password } });
    setTecnico(t);
  };
  const logout = async () => {
    await logoutFn();
    setTecnico(null);
  };

  return (
    <TecnicoCtx.Provider value={{ tecnico, loading, login, register, logout }}>
      {children}
    </TecnicoCtx.Provider>
  );
}

export function useTecnico() {
  const ctx = useContext(TecnicoCtx);
  if (!ctx) throw new Error("useTecnico must be used inside TecnicoProvider");
  return ctx;
}
