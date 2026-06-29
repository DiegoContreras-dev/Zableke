"use client";

import { useEffect, useRef } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

const SEMESTERS = gql`
  query SemesterOptions {
    semesters { code status }
  }
`;

export function SemesterSelect({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange(value: string): void;
  className?: string;
}) {
  const initialized = useRef(false);
  const { data } = useQuery<{
    semesters: Array<{ code: string; status: string }>;
  }>(SEMESTERS, { fetchPolicy: "cache-and-network" });
  const semesters = data?.semesters ?? [];

  useEffect(() => {
    if (initialized.current || semesters.length === 0) return;
    initialized.current = true;
    const active = semesters.find((semester) => semester.status === "ACTIVE");
    if (active) onChange(active.code);
  }, [semesters, onChange]);

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
      aria-label="Semestre"
    >
      {semesters.length === 0 && <option value={value}>{value}</option>}
      {semesters.map((semester) => (
        <option key={semester.code} value={semester.code}>
          {semester.code}{semester.status === "ACTIVE" ? " · Activo" : semester.status === "PLANNING" ? " · Planificación" : " · Cerrado"}
        </option>
      ))}
    </select>
  );
}
