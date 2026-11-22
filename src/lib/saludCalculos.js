// Cálculos e indicadores de salud basados en datos corporales, controles médicos e indicadores clínicos.
// Son herramientas de seguimiento personal y referencia general; no sustituyen consejo médico profesional.

const FACTOR_AGUA_POR_NIVEL = {
  Sedentario: 30, // ml por kg de peso
  Moderado: 35,
  Activo: 40,
  "Muy activo": 45,
};

export function calcularAguaRecomendada(peso, nivelActividad) {
  if (!peso || peso <= 0) return null;
  const factor = FACTOR_AGUA_POR_NIVEL[nivelActividad] || FACTOR_AGUA_POR_NIVEL.Moderado;
  return Math.round(peso * factor);
}

export function calcularIMC(peso, estaturaCm) {
  if (!peso || peso <= 0 || !estaturaCm || estaturaCm <= 0) return null;
  const estaturaM = estaturaCm / 100;
  return Math.round((peso / (estaturaM * estaturaM)) * 10) / 10;
}

export function clasificarIMC(imc) {
  if (imc == null) return null;
  if (imc < 18.5) return { label: "Bajo peso", color: "var(--amber)" };
  if (imc < 25) return { label: "Normal", color: "var(--sage)" };
  if (imc < 30) return { label: "Sobrepeso", color: "var(--amber)" };
  return { label: "Obesidad", color: "var(--stamp)" };
}

export const AREAS_SALUD = [
  "Salud general",
  "Analíticas y laboratorio",
  "Estudios e imágenes",
  "Procedimientos",
  "Salud bucal",
  "Consulta especialidad",
  "Vacunas",
];

export const ESPECIALIDADES_MEDICAS = [
  "Medicina General",
  "Urología",
  "Odontología / Salud Bucal",
  "Cardiología",
  "Oftalmología",
  "Dermatología",
  "Gastroenterología",
  "Endocrinología",
  "Laboratorio / Bioanálisis",
  "Neurología",
  "Ortopedia",
  "Otorrinolaringología",
  "Ginecología",
  "Pediatría",
  "Nutrición",
  "Psicología / Psiquiatría",
  "Fisioterapia",
  "Otra",
];

export const CATEGORIAS_INDICADORES = [
  "Signos vitales",
  "Analítica sanguínea",
  "Perfil metabólico",
  "Urología / Hormonal",
  "Salud bucal",
  "Composición corporal",
  "Otro",
];

export const PLANTILLAS_CONTROLES_SALUD = [
  {
    titulo: "Chequeo médico general anual",
    area: "Salud general",
    especialidad: "Medicina General",
    frecuenciaMeses: 12,
    prioridad: "Preventivo",
    preparacion: "Llevar analíticas recientes y listado de medicamentos.",
  },
  {
    titulo: "Perfil lipídico, glucosa y hemograma completo",
    area: "Analíticas y laboratorio",
    especialidad: "Laboratorio / Bioanálisis",
    frecuenciaMeses: 6,
    prioridad: "Preventivo",
    preparacion: "Ayuno de 8 a 12 horas; solo agua.",
  },
  {
    titulo: "Limpieza dental y revisión bucal",
    area: "Salud bucal",
    especialidad: "Odontología / Salud Bucal",
    frecuenciaMeses: 6,
    prioridad: "Rutina",
    preparacion: "Cepillado previo a la consulta.",
  },
  {
    titulo: "Evaluación urológica y Antígeno Prostático (PSA)",
    area: "Consulta especialidad",
    especialidad: "Urología",
    frecuenciaMeses: 12,
    prioridad: "Preventivo",
    preparacion: "Evitar actividad física intensa o eyaculación 48 h antes del PSA.",
  },
  {
    titulo: "Sonografía abdominal / renal",
    area: "Estudios e imágenes",
    especialidad: "Urología",
    frecuenciaMeses: 12,
    prioridad: "Preventivo",
    preparacion: "Ayuno de 6 h y tomar 3–4 vasos de agua 1 h antes.",
  },
  {
    titulo: "Electrocardiograma y evaluación cardiovascular",
    area: "Estudios e imágenes",
    especialidad: "Cardiología",
    frecuenciaMeses: 12,
    prioridad: "Preventivo",
    preparacion: "Ropa cómoda y evitar cafeína 2 h antes.",
  },
  {
    titulo: "Evaluación oftalmológica y fondo de ojo",
    area: "Salud general",
    especialidad: "Oftalmología",
    frecuenciaMeses: 12,
    prioridad: "Rutina",
    preparacion: "Si dilatan pupila, evitar conducir inmediatamente después.",
  },
  {
    titulo: "Endoscopia / Procedimiento ambulatorio",
    area: "Procedimientos",
    especialidad: "Gastroenterología",
    frecuenciaMeses: 0,
    prioridad: "Prioritario",
    preparacion: "Seguir indicaciones médicas de ayuno y acompañante.",
  },
];

export const INDICADORES_PLANTILLAS = [
  {
    nombre: "Presión arterial",
    categoria: "Signos vitales",
    unidad: "mmHg",
    esDual: true,
    labelPrincipal: "Sistólica",
    labelSecundaria: "Diastólica",
    rangoMin: 90,
    rangoMax: 120,
    rangoSecMin: 60,
    rangoSecMax: 80,
  },
  {
    nombre: "Frecuencia cardíaca en reposo",
    categoria: "Signos vitales",
    unidad: "lpm",
    esDual: false,
    rangoMin: 60,
    rangoMax: 100,
  },
  {
    nombre: "Saturación de oxígeno (SpO2)",
    categoria: "Signos vitales",
    unidad: "%",
    esDual: false,
    rangoMin: 95,
    rangoMax: 100,
  },
  {
    nombre: "Glucosa en ayunas",
    categoria: "Perfil metabólico",
    unidad: "mg/dL",
    esDual: false,
    rangoMin: 70,
    rangoMax: 99,
  },
  {
    nombre: "Hemoglobina A1c",
    categoria: "Perfil metabólico",
    unidad: "%",
    esDual: false,
    rangoMin: 4.0,
    rangoMax: 5.6,
  },
  {
    nombre: "Colesterol total",
    categoria: "Analítica sanguínea",
    unidad: "mg/dL",
    esDual: false,
    rangoMin: 100,
    rangoMax: 199,
  },
  {
    nombre: "Colesterol LDL",
    categoria: "Analítica sanguínea",
    unidad: "mg/dL",
    esDual: false,
    rangoMin: 0,
    rangoMax: 99,
  },
  {
    nombre: "Colesterol HDL",
    categoria: "Analítica sanguínea",
    unidad: "mg/dL",
    esDual: false,
    rangoMin: 40,
    rangoMax: 100,
  },
  {
    nombre: "Triglicéridos",
    categoria: "Analítica sanguínea",
    unidad: "mg/dL",
    esDual: false,
    rangoMin: 0,
    rangoMax: 149,
  },
  {
    nombre: "PSA (Antígeno prostático)",
    categoria: "Urología / Hormonal",
    unidad: "ng/mL",
    esDual: false,
    rangoMin: 0,
    rangoMax: 4.0,
  },
  {
    nombre: "Creatinina sérica",
    categoria: "Analítica sanguínea",
    unidad: "mg/dL",
    esDual: false,
    rangoMin: 0.7,
    rangoMax: 1.3,
  },
  {
    nombre: "TSH (Tiroides)",
    categoria: "Urología / Hormonal",
    unidad: "mUI/L",
    esDual: false,
    rangoMin: 0.4,
    rangoMax: 4.0,
  },
  {
    nombre: "Vitamina D (25-OH)",
    categoria: "Analítica sanguínea",
    unidad: "ng/mL",
    esDual: false,
    rangoMin: 30,
    rangoMax: 100,
  },
  {
    nombre: "Ácido úrico",
    categoria: "Analítica sanguínea",
    unidad: "mg/dL",
    esDual: false,
    rangoMin: 3.5,
    rangoMax: 7.2,
  },
  {
    nombre: "Hemoglobina",
    categoria: "Analítica sanguínea",
    unidad: "g/dL",
    esDual: false,
    rangoMin: 13.5,
    rangoMax: 17.5,
  },
  {
    nombre: "Índice de salud bucal",
    categoria: "Salud bucal",
    unidad: "pts",
    esDual: false,
    rangoMin: 80,
    rangoMax: 100,
  },
];

export function evaluarEstadoIndicador(
  valor,
  valorSecundario = null,
  rangoMin = null,
  rangoMax = null,
  rangoSecMin = null,
  rangoSecMax = null
) {
  const v = Number(valor);
  if (!Number.isFinite(v)) {
    return { estado: "Registrado", label: "Sin rango", color: "var(--ink-soft)", bg: "var(--paper)" };
  }

  const tieneMin = rangoMin != null && rangoMin !== "" && Number.isFinite(Number(rangoMin));
  const tieneMax = rangoMax != null && rangoMax !== "" && Number.isFinite(Number(rangoMax));
  const tieneSec = valorSecundario != null && valorSecundario !== "" && Number.isFinite(Number(valorSecundario));
  const tieneSecMin = rangoSecMin != null && rangoSecMin !== "" && Number.isFinite(Number(rangoSecMin));
  const tieneSecMax = rangoSecMax != null && rangoSecMax !== "" && Number.isFinite(Number(rangoSecMax));

  if (!tieneMin && !tieneMax) {
    return { estado: "Registrado", label: "Registrado", color: "var(--blue)", bg: "var(--blue-bg)" };
  }

  const min = tieneMin ? Number(rangoMin) : -Infinity;
  const max = tieneMax ? Number(rangoMax) : Infinity;
  const secVal = tieneSec ? Number(valorSecundario) : null;
  const secMin = tieneSecMin ? Number(rangoSecMin) : -Infinity;
  const secMax = tieneSecMax ? Number(rangoSecMax) : Infinity;

  const fueraPrincipal = v < min || v > max;
  const fueraSec = secVal != null && (tieneSecMin || tieneSecMax) ? (secVal < secMin || secVal > secMax) : false;

  if (!fueraPrincipal && !fueraSec) {
    return { estado: "Normal", label: "En rango", color: "var(--sage)", bg: "var(--sage-bg)" };
  }

  // Tolerancia de alerta leve (hasta 12% sobre el límite) vs fuera de rango claro
  const tolPrincipal = (Number.isFinite(max) && Number.isFinite(min) ? Math.max(max - min, 1) : Math.max(Math.abs(v), 1)) * 0.15;
  const limiteLeve =
    (fueraPrincipal ? (v < min ? min - v <= tolPrincipal : v - max <= tolPrincipal) : true) &&
    (fueraSec ? (secVal < secMin ? secMin - secVal <= 8 : secVal - secMax <= 8) : true);

  if (limiteLeve) {
    return { estado: "Límite", label: "Límite / Vigilar", color: "var(--amber)", bg: "var(--amber-bg)" };
  }
  return { estado: "Fuera de rango", label: "Fuera de rango", color: "var(--stamp)", bg: "var(--stamp-bg)" };
}

export function sumarMesesFecha(fechaStr, meses) {
  if (!fechaStr || !meses || meses <= 0) return "";
  const [y, m, d] = fechaStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1 + Number(meses), d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function diasHastaFecha(fechaStr) {
  if (!fechaStr) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fechaStr + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - hoy) / 86400000);
}
