import { type ChangeEventHandler } from "react";

import { type StudentAttendance } from "../data";

type StudentAttendanceItemProps = {
  student: StudentAttendance;
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

function getAttendanceTone(value: number) {
  if (value >= 85) {
    return "text-emerald-600";
  }

  if (value >= 60) {
    return "text-amber-600";
  }

  return "text-rose-600";
}

export function StudentAttendanceItem({
  student,
  checked,
  onChange,
}: StudentAttendanceItemProps) {
  return (
    <li className={`rounded-md border p-3 transition-colors ${checked ? 'border-[#23415B] bg-[#23415B]/5' : 'border-slate-200 bg-white hover:border-[#23415B]/30'}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#23415B] focus:ring-[#23415B]"
        />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-slate-900 leading-none mt-1">
            <span className="font-semibold text-slate-700">{student.id}</span> · {student.fullName}
          </p>
          <div className="flex flex-wrap text-xs text-slate-500 gap-x-2">
            <span>{student.email}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{student.phone}</span>
            <span>•</span>
            <span>{student.program}</span>
          </div>
          <p className={`mt-1 text-xs font-semibold ${getAttendanceTone(student.historicalAttendance)}`}>
            Asistencia: {student.historicalAttendance}% ({student.attendedClasses}/{student.totalClasses})
          </p>
        </div>
      </label>
    </li>
  );
}
