"use client";

import { useEffect, useState } from "react";

export type SimpleField = {
  key: string;
  label: string;
  type: "text" | "email" | "number";
  placeholder?: string;
  autoFocus?: boolean;
  min?: number;
  max?: number;
};

export type CareerField = {
  key: "career";
  label: string;
  type: "career";
};

export type FieldDef = SimpleField | CareerField;

export interface FormConfig {
  rows: FieldDef[][];
}

interface UseFormConfigResult {
  config: FormConfig | null;
  loading: boolean;
  error: string | null;
}

export function useFormConfig(formId: string): UseFormConfigResult {
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/forms/${formId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Config '${formId}' no encontrada`);
        return res.json() as Promise<FormConfig>;
      })
      .then(setConfig)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [formId]);

  return { config, loading, error };
}
