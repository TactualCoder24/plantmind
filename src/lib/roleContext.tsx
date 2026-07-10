"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Role } from "@/lib/types";

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
}

const RoleContext = createContext<RoleCtx>({ role: "engineer", setRole: () => {} });

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("engineer");

  useEffect(() => {
    const stored = window.localStorage.getItem("plantmind-role") as Role | null;
    if (stored) setRoleState(stored);
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    window.localStorage.setItem("plantmind-role", r);
  };

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

export const ROLE_LABELS: Record<Role, string> = {
  technician: "Field Technician",
  engineer: "Maintenance Engineer",
  compliance: "Compliance Officer",
};
