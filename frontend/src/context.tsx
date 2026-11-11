import { createContext, useContext } from "react";
import { Row } from "./api";
export const AppContext = createContext<{
  user: Row;
  staff: Row[];
  patients: Row[];
  resources: Row[];
  metadata: Row;
  facilities: Row[];
  refresh: () => Promise<void>;
  notify: (text: string) => void;
}>({} as any);
export const useApp = () => useContext(AppContext);
export const clinicalRoles = ["doctor", "assistant", "therapist", "admin"];
export const billingRoles = ["admin", "reception", "billing", "doctor"];
