export type SessionStatus = "pendiente" | "en-curso" | "cerrada";

export type TodaySession = {
  id: string;
  course: string;
  section: string;
  room: string;
  modality: "Presencial" | "Online";
  slot: string;
  status: SessionStatus;
};

export type StudentAttendance = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  program: string;
  historicalAttendance: number;
  attendedClasses: number;
  totalClasses: number;
};

export const tutorMeta = {
  name: "Tutor Demo",
  role: "Tutor",
  greeting: "Buen dia, Tutor",
};

export const tutorKpis = [
  {
    id: "today",
    label: "Sesiones hoy",
    value: "4",
    detail: "3 programadas, 1 recuperativa",
    trend: "+1 vs ayer",
  },
  {
    id: "pending",
    label: "Pendientes por registrar",
    value: "2",
    detail: "Asistencia no confirmada",
    trend: "Prioridad alta",
  },
  {
    id: "next",
    label: "Proxima tutoria",
    value: "14:10",
    detail: "POO ITI · Lab 207",
    trend: "En 42 min",
  },
  {
    id: "avg",
    label: "Asistencia semanal",
    value: "87%",
    detail: "Promedio del paralelo",
    trend: "+5% ultima semana",
  },
] as const;

export const todaySessions: TodaySession[] = [
  {
    id: "POO-P1-10",
    course: "Programacion Orientada a Objetos",
    section: "P1",
    room: "Lab 207",
    modality: "Presencial",
    slot: "10:20 - 11:50",
    status: "cerrada",
  },
  {
    id: "POO-P1-13",
    course: "Programacion Orientada a Objetos",
    section: "P1",
    room: "Lab 207",
    modality: "Presencial",
    slot: "13:20 - 14:00",
    status: "pendiente",
  },
  {
    id: "ALG-P2-14",
    course: "Algebra Lineal",
    section: "P2",
    room: "Sala E-103",
    modality: "Presencial",
    slot: "14:10 - 15:40",
    status: "en-curso",
  },
  {
    id: "CAL-P4-18",
    course: "Calculo Diferencial",
    section: "P4",
    room: "Teams",
    modality: "Online",
    slot: "18:10 - 19:40",
    status: "pendiente",
  },
];

export const scheduleAlerts = [
  {
    id: "AL-01",
    title: "Sala reasignada",
    description: "POO P1 pasa de Lab 205 a Lab 207",
    type: "cambio",
    time: "hace 18 min",
  },
  {
    id: "AL-02",
    title: "Tutoria cancelada",
    description: "Calculo P4 del viernes fue suspendida",
    type: "cancelacion",
    time: "hace 1 h",
  },
  {
    id: "AL-03",
    title: "Correo de aviso enviado",
    description: "24 estudiantes notificados automaticamente",
    type: "correo",
    time: "hace 1 h",
  },
] as const;

export const quickActions = [
  {
    label: "Rellenar asistencia ahora",
    href: "/tutor/asistencia",
  },
  {
    label: "Ver calendario completo",
    href: "/tutor/calendario",
  },
  {
    label: "Gestionar disponibilidad",
    href: "/tutor/disponibilidad",
  },
] as const;

export const attendanceStudents: StudentAttendance[] = [
  {
    id: "DMO000001",
    fullName: "Estudiante Demo 01",
    email: "estudiante01@demo.ucn.cl",
    phone: "+56 9 0000 0001",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 100,
    attendedClasses: 3,
    totalClasses: 3,
  },
  {
    id: "DMO000002",
    fullName: "Estudiante Demo 02",
    email: "estudiante02@demo.ucn.cl",
    phone: "+56 9 0000 0002",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 100,
    attendedClasses: 3,
    totalClasses: 3,
  },
  {
    id: "DMO000003",
    fullName: "Estudiante Demo 03",
    email: "estudiante03@demo.ucn.cl",
    phone: "+56 9 0000 0003",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 67,
    attendedClasses: 2,
    totalClasses: 3,
  },
  {
    id: "DMO000004",
    fullName: "Estudiante Demo 04",
    email: "estudiante04@demo.ucn.cl",
    phone: "+56 9 0000 0004",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 100,
    attendedClasses: 3,
    totalClasses: 3,
  },
  {
    id: "DMO000005",
    fullName: "Estudiante Demo 05",
    email: "estudiante05@demo.ucn.cl",
    phone: "+56 9 0000 0005",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 100,
    attendedClasses: 3,
    totalClasses: 3,
  },
  {
    id: "DMO000006",
    fullName: "Estudiante Demo 06",
    email: "estudiante06@demo.ucn.cl",
    phone: "+56 9 0000 0006",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 100,
    attendedClasses: 3,
    totalClasses: 3,
  },
  {
    id: "DMO000007",
    fullName: "Estudiante Demo 07",
    email: "estudiante07@demo.ucn.cl",
    phone: "+56 9 0000 0007",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 67,
    attendedClasses: 2,
    totalClasses: 3,
  },
  {
    id: "DMO000008",
    fullName: "Estudiante Demo 08",
    email: "estudiante08@demo.ucn.cl",
    phone: "+56 9 0000 0008",
    program: "Civil Comp. e Informatica",
    historicalAttendance: 67,
    attendedClasses: 2,
    totalClasses: 3,
  },
  {
    id: "DMO000009",
    fullName: "Estudiante Demo 09",
    email: "estudiante09@demo.ucn.cl",
    phone: "+56 9 0000 0009",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 0,
    attendedClasses: 0,
    totalClasses: 2,
  },
  {
    id: "DMO000010",
    fullName: "Estudiante Demo 10",
    email: "estudiante10@demo.ucn.cl",
    phone: "+56 9 0000 0010",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 100,
    attendedClasses: 1,
    totalClasses: 1,
  },
  {
    id: "DMO000011",
    fullName: "Estudiante Demo 11",
    email: "estudiante11@demo.ucn.cl",
    phone: "+56 9 0000 0011",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 0,
    attendedClasses: 0,
    totalClasses: 2,
  },
  {
    id: "DMO000012",
    fullName: "Estudiante Demo 12",
    email: "estudiante12@demo.ucn.cl",
    phone: "+56 9 0000 0012",
    program: "Ing Tecnologias de Informacion",
    historicalAttendance: 89,
    attendedClasses: 8,
    totalClasses: 9,
  },
];

export const attendanceDefaults = {
  tutorName: "DMO-TUTOR-001 | Tutor Demo",
  sessionType: "Programada",
  subject: "ECIN00361 | Programacion Orientada a Objetos ITI",
  section: "P1",
  slot: "Miercoles B",
  room: "Lab 207",
  modality: "Presencial",
};
