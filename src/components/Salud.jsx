import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Edit3,
  HeartPulse,
  Hospital,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  addMovimiento,
  addSaludControl,
  addSaludIndicador,
  addSaludMedico,
  deleteSaludControl,
  deleteSaludIndicador,
  deleteSaludMedico,
  updateSaludControl,
  updateSaludMedico,
} from "../lib/db";
import {
  AREAS_SALUD,
  CATEGORIAS_INDICADORES,
  ESPECIALIDADES_MEDICAS,
  INDICADORES_PLANTILLAS,
  PLANTILLAS_CONTROLES_SALUD,
  calcularAguaRecomendada,
  calcularIMC,
  clasificarIMC,
  diasHastaFecha,
  evaluarEstadoIndicador,
  sumarMesesFecha,
} from "../lib/saludCalculos";
import { calcularSaldosCuentas, evaluarCuentasParaPago } from "../lib/cuentasSaldo";
import { confirm } from "../lib/confirm";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function formatMoney(n) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function estadoControlMeta(control) {
  if (control.estado === "Realizado") {
    return { label: "Realizado", color: "var(--sage)", bg: "var(--sage-bg)" };
  }
  if (control.estado === "Cancelado") {
    return { label: "Cancelado", color: "var(--ink-soft)", bg: "var(--paper)" };
  }
  const fechaRef = control.fechaProgramada || control.proximaFecha;
  const dias = diasHastaFecha(fechaRef);
  if (dias != null && dias < 0) {
    return { label: `Atrasado (${Math.abs(dias)}d)`, color: "var(--stamp)", bg: "var(--stamp-bg)" };
  }
  if (dias === 0) {
    return { label: "Hoy", color: "var(--amber)", bg: "var(--amber-bg)" };
  }
  if (dias != null && dias <= 7) {
    return { label: `En ${dias}d`, color: "var(--amber)", bg: "var(--amber-bg)" };
  }
  if (control.estado === "Agendado" || control.fechaProgramada) {
    return { label: "Agendado", color: "var(--blue)", bg: "var(--blue-bg)" };
  }
  return { label: "Pendiente", color: "var(--ink-soft)", bg: "var(--paper)" };
}

function TrendSparkline({ puntos }) {
  if (!puntos || puntos.length < 2) return null;
  const ordenados = [...puntos].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")).slice(-10);
  const valores = ordenados.map((p) => Number(p.valor)).filter(Number.isFinite);
  if (valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = max - min || 1;
  const w = 140;
  const h = 32;
  const pad = 4;
  const coords = valores.map((v, i) => {
    const x = pad + (i / (valores.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = coords[coords.length - 1].split(",");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <polyline
        fill="none"
        stroke="var(--sage)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(" ")}
      />
      <circle cx={last[0]} cy={last[1]} r="2.8" fill="var(--sage)" />
    </svg>
  );
}

function RangeBar({ valor, rangoMin, rangoMax }) {
  if (rangoMin == null || rangoMax == null || !Number.isFinite(Number(rangoMin)) || !Number.isFinite(Number(rangoMax))) {
    return null;
  }
  const min = Number(rangoMin);
  const max = Number(rangoMax);
  const span = max - min;
  if (span <= 0) return null;
  const extMin = min - span * 0.25;
  const extMax = max + span * 0.25;
  const totalSpan = extMax - extMin;
  const okLeft = ((min - extMin) / totalSpan) * 100;
  const okWidth = ((max - min) / totalSpan) * 100;
  const pct = Math.max(2, Math.min(98, ((Number(valor) - extMin) / totalSpan) * 100));
  const enRango = Number(valor) >= min && Number(valor) <= max;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ position: "relative", height: 6, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: `${okLeft}%`,
            width: `${okWidth}%`,
            top: 0,
            bottom: 0,
            background: "var(--sage-bg)",
            borderLeft: "1px solid var(--sage)",
            borderRight: "1px solid var(--sage)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `calc(${pct}% - 4px)`,
            top: -1,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: enRango ? "var(--sage)" : "var(--stamp)",
            border: "1.5px solid var(--card)",
          }}
        />
      </div>
      <div className="despensa-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-soft)", marginTop: 3 }}>
        <span>Ref. mín {min}</span>
        <span>máx {max}</span>
      </div>
    </div>
  );
}

const emptyControlForm = (overrides = {}) => ({
  titulo: "",
  area: AREAS_SALUD[0],
  especialidad: ESPECIALIDADES_MEDICAS[0],
  medicoId: "",
  medicoNombre: "",
  centro: "",
  estado: "Pendiente",
  prioridad: "Preventivo",
  fechaProgramada: "",
  hora: "",
  frecuenciaMeses: "0",
  preparacion: "",
  costoEstimado: "",
  categoriaGasto: "",
  syncCalendario: true,
  notas: "",
  ...overrides,
});

const emptyMedicoForm = (overrides = {}) => ({
  nombre: "",
  especialidad: ESPECIALIDADES_MEDICAS[0],
  especialidadCustom: "",
  centro: "",
  telefono: "",
  direccion: "",
  seguroAceptado: "",
  notas: "",
  ...overrides,
});

const emptyIndicadorForm = (overrides = {}) => ({
  plantilla: INDICADORES_PLANTILLAS[0].nombre,
  nombre: INDICADORES_PLANTILLAS[0].nombre,
  categoria: INDICADORES_PLANTILLAS[0].categoria,
  unidad: INDICADORES_PLANTILLAS[0].unidad,
  esDual: Boolean(INDICADORES_PLANTILLAS[0].esDual),
  valor: "",
  valorSecundario: "",
  rangoMin: String(INDICADORES_PLANTILLAS[0].rangoMin ?? ""),
  rangoMax: String(INDICADORES_PLANTILLAS[0].rangoMax ?? ""),
  rangoSecMin: String(INDICADORES_PLANTILLAS[0].rangoSecMin ?? ""),
  rangoSecMax: String(INDICADORES_PLANTILLAS[0].rangoSecMax ?? ""),
  fecha: todayStr(),
  medicoId: "",
  controlId: "",
  notas: "",
  ...overrides,
});

export default function Salud({
  saludMedicos = [],
  saludControles = [],
  saludIndicadores = [],
  datosCorporales = null,
  seguros = [],
  categoriasGasto = [],
  cuentas = [],
  movimientos = [],
  prestamos = [],
  onNavigate,
}) {
  const [subtab, setSubtab] = useState("resumen"); // resumen | controles | indicadores | medicos
  const [busqueda, setBusqueda] = useState("");
  const [filtroArea, setFiltroArea] = useState("Todas");
  const [filtroEstado, setFiltroEstado] = useState("Activos"); // Activos | Todos | Pendiente | Agendado | Realizado
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("Todas");
  const [showPlantillasControles, setShowPlantillasControles] = useState(false);

  // Modales
  const [modalControl, setModalControl] = useState(null); // { mode: 'new'|'edit', id?: string, previo?: obj, form: obj, saving, error }
  const [modalMedico, setModalMedico] = useState(null); // { mode: 'new'|'edit', id?: string, fromControl?: boolean, form: obj, saving, error }
  const [modalIndicador, setModalIndicador] = useState(null); // { form: obj, saving, error }
  const [modalCompletar, setModalCompletar] = useState(null); // { control, fechaRealizado, resultadoResumen, programarSiguiente, proximaFecha, registrarGasto, metodoPago, cuentaOrigenId, saving, error }
  const [indicadorExpandido, setIndicadorExpandido] = useState(null);

  const categoriaSaludSugerida = useMemo(() => {
    const match = (categoriasGasto || []).find((c) => /salud|m[eé]dic|farmac|dent|odont/i.test(c.nombre));
    return match ? match.nombre : (categoriasGasto[0]?.nombre || "Salud");
  }, [categoriasGasto]);

  const segurosSalud = useMemo(() => {
    return (seguros || []).filter((s) => /salud|m[eé]dic|vida/i.test(s.tipo || "") || /salud|ars|humano|senasa|universal|mapfre/i.test(s.nombre || ""));
  }, [seguros]);

  const saldosCuentas = useMemo(() => {
    return calcularSaldosCuentas(cuentas, movimientos, prestamos);
  }, [cuentas, movimientos, prestamos]);

  const especialidadOpciones = useMemo(() => {
    const extras = new Set();
    for (const m of saludMedicos) if (m.especialidad && !ESPECIALIDADES_MEDICAS.includes(m.especialidad)) extras.add(m.especialidad);
    for (const c of saludControles) if (c.especialidad && !ESPECIALIDADES_MEDICAS.includes(c.especialidad)) extras.add(c.especialidad);
    return [...ESPECIALIDADES_MEDICAS.filter((e) => e !== "Otra"), ...Array.from(extras), "Otra"];
  }, [saludMedicos, saludControles]);

  // Indicadores agrupados por nombre (para mostrar último valor + historial + tendencia)
  const indicadoresAgrupados = useMemo(() => {
    const map = new Map();
    for (const item of saludIndicadores || []) {
      const key = (item.nombre || "").trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    const grupos = [];
    for (const [nombre, registros] of map.entries()) {
      const ordenados = [...registros].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
      const ultimo = ordenados[0];
      const evalStatus = evaluarEstadoIndicador(
        ultimo.valor,
        ultimo.valorSecundario,
        ultimo.rangoMin,
        ultimo.rangoMax,
        ultimo.rangoSecMin,
        ultimo.rangoSecMax
      );
      grupos.push({
        nombre,
        categoria: ultimo.categoria || "Analítica sanguínea",
        unidad: ultimo.unidad || "",
        ultimo,
        historial: ordenados,
        evaluacion: evalStatus,
      });
    }
    grupos.sort((a, b) => (b.ultimo.fecha || "").localeCompare(a.ultimo.fecha || ""));
    return grupos;
  }, [saludIndicadores]);

  const resumenKpis = useMemo(() => {
    const activos = (saludControles || []).filter((c) => c.estado !== "Realizado" && c.estado !== "Cancelado");
    const agendados = activos.filter((c) => Boolean(c.fechaProgramada));
    const urgentes = activos.filter((c) => {
      const d = diasHastaFecha(c.fechaProgramada || c.proximaFecha);
      return d != null && d <= 7;
    });
    const conRango = indicadoresAgrupados.filter((g) => g.evaluacion.estado !== "Registrado");
    const enRango = conRango.filter((g) => g.evaluacion.estado === "Normal");
    const fuera = conRango.filter((g) => g.evaluacion.estado !== "Normal");
    return {
      totalActivos: activos.length,
      agendados: agendados.length,
      urgentes: urgentes.length,
      totalIndicadores: indicadoresAgrupados.length,
      enRango: enRango.length,
      fueraRango: fuera.length,
      medicosCount: (saludMedicos || []).length,
    };
  }, [saludControles, indicadoresAgrupados, saludMedicos]);

  const controlesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (saludControles || []).filter((c) => {
      if (filtroArea !== "Todas" && c.area !== filtroArea) return false;
      if (filtroEspecialidad !== "Todas" && c.especialidad !== filtroEspecialidad) return false;
      if (filtroEstado === "Activos") {
        if (c.estado === "Realizado" || c.estado === "Cancelado") return false;
      } else if (filtroEstado !== "Todos" && c.estado !== filtroEstado) {
        return false;
      }
      if (q) {
        const hay = [c.titulo, c.area, c.especialidad, c.medicoNombre, c.centro, c.preparacion, c.resultadoResumen, c.notas]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [saludControles, busqueda, filtroArea, filtroEspecialidad, filtroEstado]);

  const indicadoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return indicadoresAgrupados.filter((g) => {
      if (!q) return true;
      return (
        g.nombre.toLowerCase().includes(q) ||
        g.categoria.toLowerCase().includes(q) ||
        (g.ultimo.medicoNombre || "").toLowerCase().includes(q)
      );
    });
  }, [indicadoresAgrupados, busqueda]);

  const medicosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (saludMedicos || []).filter((m) => {
      if (filtroEspecialidad !== "Todas" && m.especialidad !== filtroEspecialidad) return false;
      if (!q) return true;
      const hay = [m.nombre, m.especialidad, m.centro, m.seguroAceptado, m.direccion, m.notas].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [saludMedicos, busqueda, filtroEspecialidad]);

  // Datos corporales integrados
  const imc = calcularIMC(Number(datosCorporales?.peso), Number(datosCorporales?.estatura));
  const imcInfo = clasificarIMC(imc);
  const aguaMl = calcularAguaRecomendada(Number(datosCorporales?.peso), datosCorporales?.nivelActividad);

  // Handlers
  const abrirNuevoControl = (overrides = {}) => {
    setModalControl({
      mode: "new",
      form: emptyControlForm({ categoriaGasto: categoriaSaludSugerida, ...overrides }),
      saving: false,
      error: null,
    });
  };

  const abrirEditarControl = (c) => {
    setModalControl({
      mode: "edit",
      id: c.id,
      previo: c,
      form: emptyControlForm({
        titulo: c.titulo || "",
        area: c.area || AREAS_SALUD[0],
        especialidad: c.especialidad || ESPECIALIDADES_MEDICAS[0],
        medicoId: c.medicoId || "",
        medicoNombre: c.medicoNombre || "",
        centro: c.centro || "",
        estado: c.estado || "Pendiente",
        prioridad: c.prioridad || "Preventivo",
        fechaProgramada: c.fechaProgramada || "",
        hora: c.hora || "",
        frecuenciaMeses: c.frecuenciaMeses != null ? String(c.frecuenciaMeses) : "0",
        preparacion: c.preparacion || "",
        costoEstimado: c.costoEstimado != null ? String(c.costoEstimado) : "",
        categoriaGasto: c.categoriaGasto || categoriaSaludSugerida,
        syncCalendario: c.syncCalendario !== false,
        notas: c.notas || "",
      }),
      saving: false,
      error: null,
    });
  };

  const guardarControl = async () => {
    if (!modalControl) return;
    const f = modalControl.form;
    if (!f.titulo.trim()) {
      setModalControl((prev) => ({ ...prev, error: "Escribe el nombre del estudio, procedimiento o cita." }));
      return;
    }
    setModalControl((prev) => ({ ...prev, saving: true, error: null }));
    try {
      const medico = saludMedicos.find((m) => m.id === f.medicoId);
      const payload = {
        titulo: f.titulo.trim(),
        area: f.area,
        especialidad: f.especialidad || (medico?.especialidad ?? "Medicina General"),
        medicoId: f.medicoId || null,
        medicoNombre: medico ? medico.nombre : (f.medicoNombre || "").trim(),
        centro: (f.centro || medico?.centro || "").trim(),
        estado: f.estado === "Pendiente" && f.fechaProgramada ? "Agendado" : f.estado,
        prioridad: f.prioridad,
        fechaProgramada: f.fechaProgramada || null,
        hora: f.hora || "",
        frecuenciaMeses: parseInt(f.frecuenciaMeses, 10) || 0,
        preparacion: f.preparacion.trim(),
        costoEstimado: f.costoEstimado !== "" ? parseFloat(f.costoEstimado) : null,
        categoriaGasto: f.categoriaGasto || categoriaSaludSugerida,
        syncCalendario: Boolean(f.syncCalendario && f.fechaProgramada),
        notas: f.notas.trim(),
      };
      if (modalControl.mode === "new") {
        await addSaludControl(payload);
      } else {
        await updateSaludControl(modalControl.id, payload, modalControl.previo);
      }
      setModalControl(null);
    } catch (err) {
      setModalControl((prev) => ({ ...prev, saving: false, error: err.message || String(err) }));
    }
  };

  const abrirCompletarControl = (c) => {
    const hoy = todayStr();
    const meses = Number(c.frecuenciaMeses) || 0;
    const siguiente = meses > 0 ? sumarMesesFecha(hoy, meses) : "";
    setModalCompletar({
      control: c,
      fechaRealizado: hoy,
      resultadoResumen: c.resultadoResumen || "",
      programarSiguiente: meses > 0,
      proximaFecha: siguiente,
      registrarGasto: Boolean(c.costoEstimado && Number(c.costoEstimado) > 0),
      montoGasto: c.costoEstimado ? String(c.costoEstimado) : "",
      metodoPago: "Transferencia / Débito",
      cuentaOrigenId: "",
      saving: false,
      error: null,
    });
  };

  const confirmarCompletarControl = async () => {
    if (!modalCompletar) return;
    const {
      control,
      fechaRealizado,
      resultadoResumen,
      programarSiguiente,
      proximaFecha,
      registrarGasto,
      montoGasto,
      metodoPago,
      cuentaOrigenId,
    } = modalCompletar;

    const monto = parseFloat(montoGasto) || 0;
    if (registrarGasto && monto > 0 && metodoPago !== "Tarjeta de crédito" && cuentas.length > 0) {
      if (!cuentaOrigenId) {
        setModalCompletar((prev) => ({ ...prev, error: "Selecciona la cuenta desde donde salen los fondos o elige Efectivo / Sin descontar." }));
        return;
      }
      if (cuentaOrigenId !== "__SIN_CUENTA__") {
        const evalCuenta = evaluarCuentasParaPago(saldosCuentas, monto).find((c) => c.id === cuentaOrigenId);
        if (evalCuenta && evalCuenta.disponible + 0.001 < monto) {
          setModalCompletar((prev) => ({ ...prev, error: `Saldo insuficiente en ${evalCuenta.nombre}.` }));
          return;
        }
      }
    }

    setModalCompletar((prev) => ({ ...prev, saving: true, error: null }));
    try {
      await updateSaludControl(
        control.id,
        {
          estado: "Realizado",
          fechaRealizado: fechaRealizado || todayStr(),
          resultadoResumen: resultadoResumen.trim(),
          proximaFecha: programarSiguiente && proximaFecha ? proximaFecha : null,
        },
        control
      );

      if (programarSiguiente && proximaFecha) {
        await addSaludControl({
          titulo: control.titulo,
          area: control.area,
          especialidad: control.especialidad,
          medicoId: control.medicoId || null,
          medicoNombre: control.medicoNombre || "",
          centro: control.centro || "",
          estado: "Agendado",
          prioridad: control.prioridad || "Preventivo",
          fechaProgramada: proximaFecha,
          hora: control.hora || "",
          frecuenciaMeses: control.frecuenciaMeses || 0,
          preparacion: control.preparacion || "",
          costoEstimado: control.costoEstimado ?? null,
          categoriaGasto: control.categoriaGasto || categoriaSaludSugerida,
          syncCalendario: true,
          notas: control.notas || "",
        });
      }

      if (registrarGasto && monto > 0) {
        const esSinCuenta = cuentaOrigenId === "__SIN_CUENTA__" || metodoPago === "Tarjeta de crédito" || cuentas.length === 0;
        const cuentaObj = !esSinCuenta ? cuentas.find((c) => c.id === cuentaOrigenId) : null;
        await addMovimiento({
          type: "Gasto",
          category: control.categoriaGasto || categoriaSaludSugerida,
          amount: monto,
          description: `${control.titulo}${control.medicoNombre ? ` (${control.medicoNombre})` : ""}`,
          date: fechaRealizado || todayStr(),
          clasificacion: "Variable",
          metodoPago,
          cuentaOrigenId: cuentaObj ? cuentaObj.id : null,
          cuentaOrigenNombre: cuentaObj ? cuentaObj.nombre : "",
        });
      }

      setModalCompletar(null);
    } catch (err) {
      setModalCompletar((prev) => ({ ...prev, saving: false, error: err.message || String(err) }));
    }
  };

  const abrirNuevoMedico = (fromControl = false, especialidadInicial = ESPECIALIDADES_MEDICAS[0]) => {
    setModalMedico({
      mode: "new",
      fromControl,
      form: emptyMedicoForm({ especialidad: especialidadInicial }),
      saving: false,
      error: null,
    });
  };

  const abrirEditarMedico = (m) => {
    const esBase = ESPECIALIDADES_MEDICAS.includes(m.especialidad);
    setModalMedico({
      mode: "edit",
      id: m.id,
      fromControl: false,
      form: emptyMedicoForm({
        nombre: m.nombre || "",
        especialidad: esBase ? m.especialidad : "Otra",
        especialidadCustom: esBase ? "" : (m.especialidad || ""),
        centro: m.centro || "",
        telefono: m.telefono || "",
        direccion: m.direccion || "",
        seguroAceptado: m.seguroAceptado || "",
        notas: m.notas || "",
      }),
      saving: false,
      error: null,
    });
  };

  const guardarMedico = async () => {
    if (!modalMedico) return;
    const f = modalMedico.form;
    if (!f.nombre.trim()) {
      setModalMedico((prev) => ({ ...prev, error: "Ingresa el nombre del médico o especialista." }));
      return;
    }
    const especialidadFinal = f.especialidad === "Otra" && f.especialidadCustom.trim() ? f.especialidadCustom.trim() : f.especialidad;
    setModalMedico((prev) => ({ ...prev, saving: true, error: null }));
    try {
      const payload = {
        nombre: f.nombre.trim(),
        especialidad: especialidadFinal,
        centro: f.centro.trim(),
        telefono: f.telefono.trim(),
        direccion: f.direccion.trim(),
        seguroAceptado: f.seguroAceptado.trim(),
        notas: f.notas.trim(),
      };
      if (modalMedico.mode === "new") {
        const nuevoId = await addSaludMedico(payload);
        if (modalMedico.fromControl && modalControl) {
          setModalControl((prev) =>
            prev
              ? {
                  ...prev,
                  form: {
                    ...prev.form,
                    medicoId: nuevoId,
                    medicoNombre: payload.nombre,
                    especialidad: payload.especialidad,
                    centro: prev.form.centro || payload.centro,
                  },
                }
              : null
          );
        }
      } else {
        await updateSaludMedico(modalMedico.id, payload);
      }
      setModalMedico(null);
    } catch (err) {
      setModalMedico((prev) => ({ ...prev, saving: false, error: err.message || String(err) }));
    }
  };

  const abrirNuevoIndicador = (overrides = {}) => {
    setModalIndicador({
      form: emptyIndicadorForm(overrides),
      saving: false,
      error: null,
    });
  };

  const seleccionarPlantillaIndicador = (nombrePlantilla) => {
    if (nombrePlantilla === "__PERSONALIZADO__") {
      setModalIndicador((prev) => ({
        ...prev,
        form: {
          ...prev.form,
          plantilla: "__PERSONALIZADO__",
          nombre: "",
          esDual: false,
          unidad: "",
          rangoMin: "",
          rangoMax: "",
          rangoSecMin: "",
          rangoSecMax: "",
        },
      }));
      return;
    }
    const tpl = INDICADORES_PLANTILLAS.find((p) => p.nombre === nombrePlantilla);
    if (!tpl) return;
    setModalIndicador((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        plantilla: tpl.nombre,
        nombre: tpl.nombre,
        categoria: tpl.categoria,
        unidad: tpl.unidad,
        esDual: Boolean(tpl.esDual),
        rangoMin: tpl.rangoMin != null ? String(tpl.rangoMin) : "",
        rangoMax: tpl.rangoMax != null ? String(tpl.rangoMax) : "",
        rangoSecMin: tpl.rangoSecMin != null ? String(tpl.rangoSecMin) : "",
        rangoSecMax: tpl.rangoSecMax != null ? String(tpl.rangoSecMax) : "",
      },
    }));
  };

  const guardarIndicador = async () => {
    if (!modalIndicador) return;
    const f = modalIndicador.form;
    if (!f.nombre.trim()) {
      setModalIndicador((prev) => ({ ...prev, error: "Ingresa el nombre del indicador." }));
      return;
    }
    if (f.valor === "" || !Number.isFinite(Number(f.valor))) {
      setModalIndicador((prev) => ({ ...prev, error: "Ingresa un valor numérico válido." }));
      return;
    }
    setModalIndicador((prev) => ({ ...prev, saving: true, error: null }));
    try {
      const medico = saludMedicos.find((m) => m.id === f.medicoId);
      await addSaludIndicador({
        nombre: f.nombre.trim(),
        categoria: f.categoria,
        valor: Number(f.valor),
        valorSecundario: f.esDual && f.valorSecundario !== "" ? Number(f.valorSecundario) : null,
        unidad: f.unidad.trim(),
        rangoMin: f.rangoMin !== "" ? Number(f.rangoMin) : null,
        rangoMax: f.rangoMax !== "" ? Number(f.rangoMax) : null,
        rangoSecMin: f.esDual && f.rangoSecMin !== "" ? Number(f.rangoSecMin) : null,
        rangoSecMax: f.esDual && f.rangoSecMax !== "" ? Number(f.rangoSecMax) : null,
        fecha: f.fecha || todayStr(),
        medicoId: f.medicoId || null,
        medicoNombre: medico ? medico.nombre : "",
        controlId: f.controlId || null,
        notas: f.notas.trim(),
      });
      setModalIndicador(null);
    } catch (err) {
      setModalIndicador((prev) => ({ ...prev, saving: false, error: err.message || String(err) }));
    }
  };

  const controlesPorArea = useMemo(() => {
    const map = {};
    for (const area of AREAS_SALUD) {
      map[area] = { pendientes: 0, agendados: 0, realizados: 0 };
    }
    for (const c of saludControles || []) {
      const area = AREAS_SALUD.includes(c.area) ? c.area : "Salud general";
      if (c.estado === "Realizado") map[area].realizados += 1;
      else if (c.fechaProgramada || c.estado === "Agendado") map[area].agendados += 1;
      else if (c.estado !== "Cancelado") map[area].pendientes += 1;
    }
    return map;
  }, [saludControles]);

  const proximosControles = useMemo(() => {
    return (saludControles || [])
      .filter((c) => c.estado !== "Realizado" && c.estado !== "Cancelado")
      .sort((a, b) => {
        const fa = a.fechaProgramada || a.proximaFecha || "9999-12-31";
        const fb = b.fechaProgramada || b.proximaFecha || "9999-12-31";
        return fa.localeCompare(fb);
      });
  }, [saludControles]);

  const fieldStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "var(--paper)",
    color: "var(--ink)",
    fontSize: 13,
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Cabecera limpia de módulo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 className="despensa-tab-font" style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>
            Centro de Salud y Chequeos
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>
            Agenda de estudios, analíticas, procedimientos, salud bucal, indicadores clínicos y médicos asociados.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("habitos")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--card)",
                color: "var(--ink-soft)",
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <HeartPulse size={14} /> Hábitos y cuerpo
            </button>
          )}
          <button
            type="button"
            onClick={() => abrirNuevoControl()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--sage)",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={14} /> Agendar estudio o cita
          </button>
        </div>
      </div>

      {/* Sub-navegación segmentada */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >
          {[
            { id: "resumen", label: "Resumen", icon: Activity },
            { id: "controles", label: `Estudios y Citas (${saludControles.length})`, icon: ClipboardCheck },
            { id: "indicadores", label: `Indicadores (${indicadoresAgrupados.length})`, icon: Stethoscope },
            { id: "medicos", label: `Médicos (${saludMedicos.length})`, icon: UserPlus },
          ].map(({ id, label, icon: Icon }) => {
            const active = subtab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSubtab(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 7,
                  border: "none",
                  background: active ? "var(--sage)" : "transparent",
                  color: active ? "#fff" : "var(--ink-soft)",
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </div>

        {subtab !== "resumen" && (
          <div style={{ position: "relative", minWidth: 220, flex: "1 1 220px", maxWidth: 340 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--ink-soft)" }} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                subtab === "medicos"
                  ? "Buscar médico, especialidad o clínica…"
                  : subtab === "indicadores"
                  ? "Buscar glucosa, PSA, colesterol…"
                  : "Buscar estudio, analítica, médico…"
              }
              style={{ ...fieldStyle, paddingLeft: 30, background: "var(--card)" }}
            />
          </div>
        )}
      </div>

      {/* KPI Strip de 4 métricas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>Agenda y pendientes</div>
          <div className="despensa-mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {resumenKpis.totalActivos}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
            {resumenKpis.agendados} con fecha · {resumenKpis.totalActivos - resumenKpis.agendados} por agendar
          </div>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>Próximos 7 días / atrasados</div>
          <div
            className="despensa-mono"
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: resumenKpis.urgentes > 0 ? "var(--amber)" : "var(--sage)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {resumenKpis.urgentes}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
            {resumenKpis.urgentes > 0 ? "Requieren atención pronta" : "Todo al día esta semana"}
          </div>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>Indicadores clínicos</div>
          <div className="despensa-mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {resumenKpis.totalIndicadores}
          </div>
          <div style={{ fontSize: 11.5, color: resumenKpis.fueraRango > 0 ? "var(--stamp)" : "var(--sage)", marginTop: 4 }}>
            {resumenKpis.totalIndicadores === 0
              ? "Sin mediciones aún"
              : `${resumenKpis.enRango} en rango${resumenKpis.fueraRango > 0 ? ` · ${resumenKpis.fueraRango} por vigilar` : ""}`}
          </div>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>Médicos asociados</div>
          <div className="despensa-mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {resumenKpis.medicosCount}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
            {segurosSalud.length > 0 ? `${segurosSalud.length} póliza${segurosSalud.length > 1 ? "s" : ""} de salud activa` : "Directorio de especialistas"}
          </div>
        </div>
      </div>

      {/* TAB 1: RESUMEN */}
      {subtab === "resumen" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Próximos controles y chequeos */}
          <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <h3 className="despensa-tab-font" style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: "var(--ink)" }}>
                  Próximos estudios, procedimientos y consultas
                </h3>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
                  Agenda preventiva por áreas: analíticas, salud bucal, urología y medicina general.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowPlantillasControles((s) => !s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 11px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: showPlantillasControles ? "var(--sage-bg)" : "var(--paper)",
                    color: showPlantillasControles ? "var(--sage)" : "var(--ink)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <Sparkles size={13} /> Chequeos sugeridos
                </button>
                <button
                  type="button"
                  onClick={() => setSubtab("controles")}
                  style={{
                    padding: "7px 11px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink-soft)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Ver todos ({saludControles.length})
                </button>
              </div>
            </div>

            {showPlantillasControles && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
                  Plantillas rápidas — elige una para agendarla y asociarle médico:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
                  {PLANTILLAS_CONTROLES_SALUD.map((tpl) => (
                    <button
                      key={tpl.titulo}
                      type="button"
                      onClick={() => {
                        setShowPlantillasControles(false);
                        abrirNuevoControl({
                          titulo: tpl.titulo,
                          area: tpl.area,
                          especialidad: tpl.especialidad,
                          frecuenciaMeses: String(tpl.frecuenciaMeses || 0),
                          prioridad: tpl.prioridad,
                          preparacion: tpl.preparacion,
                        });
                      }}
                      style={{
                        textAlign: "left",
                        padding: "9px 11px",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        background: "var(--card)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{tpl.titulo}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                        {tpl.area} · {tpl.especialidad}
                        {tpl.frecuenciaMeses ? ` · Cada ${tpl.frecuenciaMeses}m` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {proximosControles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 12px" }}>
                <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12 }}>
                  No tienes estudios, analíticas ni citas médicas pendientes agendadas.
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => abrirNuevoControl()}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--sage)",
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Agendar primer control
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPlantillasControles(true)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "var(--paper)",
                      color: "var(--ink)",
                      fontSize: 12.5,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Explorar chequeos sugeridos
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {proximosControles.slice(0, 6).map((c, idx) => {
                  const meta = estadoControlMeta(c);
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "11px 0",
                        borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{c.titulo}</span>
                          <span className="despensa-mono" style={{ fontSize: 11.5, fontWeight: 600, color: meta.color }}>
                            {meta.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 3 }}>
                          {[
                            c.area,
                            c.especialidad,
                            c.medicoNombre,
                            c.fechaProgramada ? `${formatDateDisplay(c.fechaProgramada)}${c.hora ? ` ${c.hora}` : ""}` : "Sin fecha definida",
                            c.costoEstimado ? formatMoney(c.costoEstimado) : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                        {c.preparacion && (
                          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                            Preparación: {c.preparacion}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => abrirCompletarControl(c)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 10px",
                            borderRadius: 7,
                            border: "none",
                            background: "var(--sage-bg)",
                            color: "var(--sage)",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <Check size={13} /> Completar
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirEditarControl(c)}
                          title="Editar control"
                          style={{
                            padding: "6px 8px",
                            borderRadius: 7,
                            border: "1px solid var(--line)",
                            background: "transparent",
                            color: "var(--ink-soft)",
                            cursor: "pointer",
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Resumen por áreas + Indicadores recientes (2 columnas desktop) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16, alignItems: "start" }}>
            {/* Áreas de salud */}
            <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 18 }}>
              <h3 className="despensa-tab-font" style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                Cobertura por área de salud
              </h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {AREAS_SALUD.map((area, idx) => {
                  const st = controlesPorArea[area];
                  const totalArea = st.agendados + st.pendientes + st.realizados;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => {
                        setFiltroArea(area);
                        setFiltroEstado("Todos");
                        setSubtab("controles");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "9px 4px",
                        border: "none",
                        borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                        background: "transparent",
                        color: "var(--ink)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{area}</span>
                      <span className="despensa-mono" style={{ fontSize: 11.5, color: totalArea > 0 ? "var(--ink-soft)" : "var(--muted-line)" }}>
                        {totalArea === 0
                          ? "Sin registros"
                          : [
                              st.agendados > 0 ? `${st.agendados} agend.` : null,
                              st.pendientes > 0 ? `${st.pendientes} pend.` : null,
                              st.realizados > 0 ? `${st.realizados} realiz.` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Indicadores clínicos + Datos corporales */}
            <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                <h3 className="despensa-tab-font" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                  Indicadores de salud
                </h3>
                <button
                  type="button"
                  onClick={() => abrirNuevoIndicador()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    borderRadius: 7,
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={12} /> Medición
                </button>
              </div>

              {(datosCorporales?.peso || imc || aguaMl) && (
                <div
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "var(--paper)",
                    marginBottom: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    Biometría base:{" "}
                    <strong className="despensa-mono" style={{ color: "var(--ink)" }}>
                      {datosCorporales?.peso ? `${datosCorporales.peso} kg` : ""}
                      {imc ? ` · IMC ${imc} (${imcInfo?.label})` : ""}
                      {aguaMl ? ` · ${(aguaMl / 1000).toFixed(1)}L agua/día` : ""}
                    </strong>
                  </div>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate("habitos")}
                      style={{ background: "none", border: "none", padding: 0, fontSize: 11.5, fontWeight: 600, color: "var(--sage)", cursor: "pointer" }}
                    >
                      Actualizar →
                    </button>
                  )}
                </div>
              )}

              {indicadoresAgrupados.length === 0 ? (
                <div style={{ textAlign: "center", padding: "18px 8px" }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>
                    Registra presión arterial, glucosa, colesterol, PSA, vitamina D o índice bucal para seguir su evolución.
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirNuevoIndicador()}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--sage)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Registrar primer indicador
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {indicadoresAgrupados.slice(0, 6).map((g, idx) => (
                    <div
                      key={g.nombre}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "9px 0",
                        borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{g.nombre}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                          {g.categoria} · {formatDateDisplay(g.ultimo.fecha)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div className="despensa-mono" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                          {g.ultimo.valorSecundario != null ? `${g.ultimo.valor}/${g.ultimo.valorSecundario}` : g.ultimo.valor}{" "}
                          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-soft)" }}>{g.unidad}</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: g.evaluacion.color }}>{g.evaluacion.label}</div>
                      </div>
                    </div>
                  ))}
                  {indicadoresAgrupados.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setSubtab("indicadores")}
                      style={{
                        marginTop: 8,
                        background: "none",
                        border: "none",
                        padding: "6px 0",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--sage)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      Ver todos los indicadores ({indicadoresAgrupados.length}) →
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: ESTUDIOS, ANALÍTICAS Y CITAS */}
      {subtab === "controles" && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} style={{ ...fieldStyle, width: "auto", minWidth: 165, background: "var(--card)" }}>
              <option value="Todas">Todas las áreas</option>
              {AREAS_SALUD.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select value={filtroEspecialidad} onChange={(e) => setFiltroEspecialidad(e.target.value)} style={{ ...fieldStyle, width: "auto", minWidth: 165, background: "var(--card)" }}>
              <option value="Todas">Todas las especialidades</option>
              {especialidadOpciones.map((esp) => (
                <option key={esp} value={esp}>{esp}</option>
              ))}
            </select>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ ...fieldStyle, width: "auto", minWidth: 145, background: "var(--card)" }}>
              <option value="Activos">Activos (Pendientes / Agendados)</option>
              <option value="Todos">Todos los estados</option>
              <option value="Pendiente">Solo pendientes</option>
              <option value="Agendado">Solo agendados</option>
              <option value="Realizado">Solo realizados</option>
            </select>
          </div>

          {controlesFiltrados.length === 0 ? (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "28px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12 }}>
                No hay estudios, procedimientos ni citas que coincidan con este filtro.
              </div>
              <button
                type="button"
                onClick={() => abrirNuevoControl({ area: filtroArea !== "Todas" ? filtroArea : AREAS_SALUD[0] })}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--sage)",
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Agendar estudio o cita
              </button>
            </div>
          ) : (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "4px 16px" }}>
              {controlesFiltrados.map((c, idx) => {
                const meta = estadoControlMeta(c);
                return (
                  <div
                    key={c.id}
                    data-record-id={c.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "13px 0",
                      borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.titulo}</span>
                        <span className="despensa-mono" style={{ fontSize: 11.5, fontWeight: 600, color: meta.color }}>
                          {meta.label}
                        </span>
                        {c.prioridad === "Prioritario" && (
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--stamp)" }}>Prioritario</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
                        {[
                          c.area,
                          c.especialidad,
                          c.medicoNombre,
                          c.centro,
                          c.fechaProgramada ? `Agenda: ${formatDateDisplay(c.fechaProgramada)}${c.hora ? ` ${c.hora}` : ""}` : null,
                          c.fechaRealizado ? `Realizado: ${formatDateDisplay(c.fechaRealizado)}` : null,
                          c.frecuenciaMeses > 0 ? `Cada ${c.frecuenciaMeses} meses` : null,
                          c.costoEstimado ? formatMoney(c.costoEstimado) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      {c.preparacion && (
                        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
                          Preparación: {c.preparacion}
                        </div>
                      )}
                      {c.resultadoResumen && (
                        <div style={{ fontSize: 12, color: "var(--ink)", marginTop: 4 }}>
                          Resultado: {c.resultadoResumen}
                        </div>
                      )}
                      {c.notas && (
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3 }}>
                          {c.notas}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {c.estado !== "Realizado" && (
                        <button
                          type="button"
                          onClick={() => abrirCompletarControl(c)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 10px",
                            borderRadius: 7,
                            border: "none",
                            background: "var(--sage-bg)",
                            color: "var(--sage)",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <Check size={13} /> Completar
                        </button>
                      )}
                      {c.estado === "Realizado" && (
                        <button
                          type="button"
                          onClick={() =>
                            abrirNuevoIndicador({
                              medicoId: c.medicoId || "",
                              controlId: c.id,
                              fecha: c.fechaRealizado || todayStr(),
                            })
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "6px 10px",
                            borderRadius: 7,
                            border: "1px solid var(--line)",
                            background: "var(--paper)",
                            color: "var(--ink)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          + Indicador
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => abrirEditarControl(c)}
                        title="Editar"
                        style={{
                          padding: "6px 8px",
                          borderRadius: 7,
                          border: "1px solid var(--line)",
                          background: "transparent",
                          color: "var(--ink-soft)",
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (await confirm(`¿Eliminar "${c.titulo}"?`)) {
                            await deleteSaludControl(c);
                          }
                        }}
                        title="Eliminar"
                        style={{
                          padding: "6px 8px",
                          borderRadius: 7,
                          border: "1px solid var(--line)",
                          background: "transparent",
                          color: "var(--ink-soft)",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INDICADORES DE SALUD */}
      {subtab === "indicadores" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
              Seguimiento longitudinal de signos vitales, analíticas sanguíneas, perfil hormonal/urológico y salud bucal.
            </div>
            <button
              type="button"
              onClick={() => abrirNuevoIndicador()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 13px",
                borderRadius: 8,
                border: "none",
                background: "var(--sage)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Registrar medición
            </button>
          </div>

          {indicadoresFiltrados.length === 0 ? (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "28px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 14 }}>
                Aún no has registrado mediciones clínicas. Elige una plantilla rápida para comenzar:
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                {["Presión arterial", "Glucosa en ayunas", "Colesterol total", "PSA (Antígeno prostático)", "Vitamina D (25-OH)", "Índice de salud bucal"].map((nombreTpl) => {
                  const tpl = INDICADORES_PLANTILLAS.find((p) => p.nombre === nombreTpl);
                  if (!tpl) return null;
                  return (
                    <button
                      key={tpl.nombre}
                      type="button"
                      onClick={() =>
                        abrirNuevoIndicador({
                          plantilla: tpl.nombre,
                          nombre: tpl.nombre,
                          categoria: tpl.categoria,
                          unidad: tpl.unidad,
                          esDual: Boolean(tpl.esDual),
                          rangoMin: tpl.rangoMin != null ? String(tpl.rangoMin) : "",
                          rangoMax: tpl.rangoMax != null ? String(tpl.rangoMax) : "",
                          rangoSecMin: tpl.rangoSecMin != null ? String(tpl.rangoSecMin) : "",
                          rangoSecMax: tpl.rangoSecMax != null ? String(tpl.rangoSecMax) : "",
                        })
                      }
                      style={{
                        padding: "7px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        background: "var(--paper)",
                        color: "var(--ink)",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      + {tpl.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14 }}>
              {indicadoresFiltrados.map((g) => {
                const u = g.ultimo;
                const abierto = indicadorExpandido === g.nombre;
                return (
                  <div
                    key={g.nombre}
                    data-record-id={u.id}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{g.nombre}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                          {g.categoria} · {formatDateDisplay(u.fecha)}
                          {u.medicoNombre ? ` · ${u.medicoNombre}` : ""}
                        </div>
                      </div>
                      <span className="despensa-mono" style={{ fontSize: 11.5, fontWeight: 600, color: g.evaluacion.color, whiteSpace: "nowrap" }}>
                        {g.evaluacion.label}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
                      <div>
                        <span className="despensa-mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                          {u.valorSecundario != null ? `${u.valor}/${u.valorSecundario}` : u.valor}
                        </span>
                        {g.unidad && (
                          <span style={{ fontSize: 12.5, color: "var(--ink-soft)", marginLeft: 5 }}>{g.unidad}</span>
                        )}
                      </div>
                      <TrendSparkline puntos={g.historial} />
                    </div>

                    <RangeBar valor={u.valor} rangoMin={u.rangoMin} rangoMax={u.rangoMax} />

                    {u.notas && (
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 8 }}>{u.notas}</div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: "1px solid var(--line-soft)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setIndicadorExpandido(abierto ? null : g.nombre)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          background: "none",
                          border: "none",
                          padding: 0,
                          fontSize: 12,
                          color: "var(--ink-soft)",
                          cursor: "pointer",
                        }}
                      >
                        {abierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Historial ({g.historial.length})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          abrirNuevoIndicador({
                            plantilla: INDICADORES_PLANTILLAS.some((p) => p.nombre === g.nombre) ? g.nombre : "__PERSONALIZADO__",
                            nombre: g.nombre,
                            categoria: g.categoria,
                            unidad: g.unidad,
                            esDual: u.valorSecundario != null,
                            rangoMin: u.rangoMin != null ? String(u.rangoMin) : "",
                            rangoMax: u.rangoMax != null ? String(u.rangoMax) : "",
                            rangoSecMin: u.rangoSecMin != null ? String(u.rangoSecMin) : "",
                            rangoSecMax: u.rangoSecMax != null ? String(u.rangoSecMax) : "",
                            medicoId: u.medicoId || "",
                          })
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 9px",
                          borderRadius: 6,
                          border: "1px solid var(--line)",
                          background: "var(--paper)",
                          color: "var(--ink)",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={12} /> Nueva toma
                      </button>
                    </div>

                    {abierto && (
                      <div style={{ marginTop: 10, borderTop: "1px solid var(--line-soft)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                        {g.historial.map((reg) => {
                          const ev = evaluarEstadoIndicador(reg.valor, reg.valorSecundario, reg.rangoMin, reg.rangoMax, reg.rangoSecMin, reg.rangoSecMax);
                          return (
                            <div
                              key={reg.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                fontSize: 12,
                              }}
                            >
                              <span className="despensa-mono" style={{ color: "var(--ink-soft)" }}>
                                {formatDateDisplay(reg.fecha)}
                              </span>
                              <span className="despensa-mono" style={{ fontWeight: 600, color: ev.color }}>
                                {reg.valorSecundario != null ? `${reg.valor}/${reg.valorSecundario}` : reg.valor} {reg.unidad}
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (await confirm(`¿Eliminar medición de ${g.nombre} del ${formatDateDisplay(reg.fecha)}?`)) {
                                    await deleteSaludIndicador(reg.id);
                                  }
                                }}
                                title="Eliminar medición"
                                style={{ background: "none", border: "none", padding: 2, color: "var(--ink-soft)", cursor: "pointer" }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MÉDICOS Y ESPECIALISTAS */}
      {subtab === "medicos" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <select value={filtroEspecialidad} onChange={(e) => setFiltroEspecialidad(e.target.value)} style={{ ...fieldStyle, width: "auto", minWidth: 180, background: "var(--card)" }}>
                <option value="Todas">Todas las especialidades</option>
                {especialidadOpciones.map((esp) => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
              {segurosSalud.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                  <ShieldCheck size={13} style={{ color: "var(--sage)" }} />
                  Seguro registrado: {segurosSalud.map((s) => s.nombre).join(", ")}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => abrirNuevoMedico(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 13px",
                borderRadius: 8,
                border: "none",
                background: "var(--sage)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <UserPlus size={14} /> Asociar médico / centro
            </button>
          </div>

          {medicosFiltrados.length === 0 ? (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "28px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12 }}>
                Agrega tus médicos de cabecera, especialistas (Urología, Odontología, Cardiología…) y laboratorios de confianza.
              </div>
              <button
                type="button"
                onClick={() => abrirNuevoMedico(false, "Urología")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--sage)",
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Asociar primer médico
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {medicosFiltrados.map((m) => {
                const controlesDelMedico = (saludControles || []).filter((c) => c.medicoId === m.id);
                const pendientesMedico = controlesDelMedico.filter((c) => c.estado !== "Realizado" && c.estado !== "Cancelado").length;
                return (
                  <div
                    key={m.id}
                    data-record-id={m.id}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{m.nombre}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--sage)", marginTop: 2 }}>
                          {m.especialidad}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => abrirEditarMedico(m)}
                          title="Editar médico"
                          style={{ padding: 6, borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-soft)", cursor: "pointer" }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (await confirm(`¿Eliminar a "${m.nombre}" del directorio médico?`)) {
                              await deleteSaludMedico(m.id);
                            }
                          }}
                          title="Eliminar médico"
                          style={{ padding: 6, borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-soft)", cursor: "pointer" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ink-soft)" }}>
                      {m.centro && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Hospital size={13} /> <span>{m.centro}</span>
                        </div>
                      )}
                      {m.telefono && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Phone size={13} />{" "}
                          <a href={`tel:${m.telefono}`} style={{ color: "var(--ink)", textDecoration: "none" }}>
                            {m.telefono}
                          </a>
                        </div>
                      )}
                      {m.direccion && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <MapPin size={13} /> <span>{m.direccion}</span>
                        </div>
                      )}
                      {m.seguroAceptado && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <ShieldCheck size={13} /> <span>ARS / Seguro: {m.seguroAceptado}</span>
                        </div>
                      )}
                      {m.notas && <div style={{ marginTop: 2 }}>{m.notas}</div>}
                    </div>

                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: 10,
                        borderTop: "1px solid var(--line-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span className="despensa-mono" style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                        {controlesDelMedico.length} control{controlesDelMedico.length === 1 ? "" : "es"}
                        {pendientesMedico > 0 ? ` · ${pendientesMedico} activo${pendientesMedico === 1 ? "" : "s"}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          abrirNuevoControl({
                            medicoId: m.id,
                            medicoNombre: m.nombre,
                            especialidad: m.especialidad,
                            centro: m.centro || "",
                            area: m.especialidad === "Odontología / Salud Bucal" ? "Salud bucal" : "Consulta especialidad",
                          })
                        }
                        style={{
                          padding: "6px 10px",
                          borderRadius: 7,
                          border: "none",
                          background: "var(--sage-bg)",
                          color: "var(--sage)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        + Agendar cita
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: NUEVO / EDITAR CONTROL O ESTUDIO */}
      {modalControl &&
        createPortal(
          <div
            onClick={() => !modalControl.saving && setModalControl(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.58)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 1050,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: 20,
                width: "100%",
                maxWidth: 540,
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h3 className="despensa-tab-font" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                  {modalControl.mode === "new" ? "Agendar estudio, procedimiento o cita" : "Editar control de salud"}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalControl(null)}
                  style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Título del estudio, procedimiento o consulta *
                  </label>
                  <input
                    value={modalControl.form.titulo}
                    onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, titulo: e.target.value } }))}
                    placeholder="Ej. Limpieza dental, PSA y chequeo urológico, Perfil lipídico…"
                    style={fieldStyle}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Área de salud
                    </label>
                    <select
                      value={modalControl.form.area}
                      onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, area: e.target.value } }))}
                      style={fieldStyle}
                    >
                      {AREAS_SALUD.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Especialidad médica
                    </label>
                    <select
                      value={modalControl.form.especialidad}
                      onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, especialidad: e.target.value } }))}
                      style={fieldStyle}
                    >
                      {especialidadOpciones.map((esp) => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>Médico o laboratorio asociado</label>
                    <button
                      type="button"
                      onClick={() => abrirNuevoMedico(true, modalControl.form.especialidad)}
                      style={{ background: "none", border: "none", padding: 0, fontSize: 11.5, fontWeight: 600, color: "var(--sage)", cursor: "pointer" }}
                    >
                      + Nuevo médico
                    </button>
                  </div>
                  <select
                    value={modalControl.form.medicoId}
                    onChange={(e) => {
                      const medId = e.target.value;
                      const med = saludMedicos.find((m) => m.id === medId);
                      setModalControl((prev) => ({
                        ...prev,
                        form: {
                          ...prev.form,
                          medicoId: medId,
                          medicoNombre: med ? med.nombre : "",
                          especialidad: med ? med.especialidad : prev.form.especialidad,
                          centro: med?.centro || prev.form.centro,
                        },
                      }));
                    }}
                    style={fieldStyle}
                  >
                    <option value="">Sin médico específico asignado</option>
                    {saludMedicos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} — {m.especialidad}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Centro / Clínica / Laboratorio
                    </label>
                    <input
                      value={modalControl.form.centro}
                      onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, centro: e.target.value } }))}
                      placeholder="Ej. HOMS, Referencia…"
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Prioridad
                    </label>
                    <select
                      value={modalControl.form.prioridad}
                      onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, prioridad: e.target.value } }))}
                      style={fieldStyle}
                    >
                      <option value="Rutina">Rutina</option>
                      <option value="Preventivo">Preventivo</option>
                      <option value="Prioritario">Prioritario</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Fecha programada
                    </label>
                    <input
                      type="date"
                      value={modalControl.form.fechaProgramada}
                      onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, fechaProgramada: e.target.value } }))}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Hora
                    </label>
                    <input
                      type="time"
                      value={modalControl.form.hora}
                      onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, hora: e.target.value } }))}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Repetir cada
                    </label>
                    <select
                      value={modalControl.form.frecuenciaMeses}
                      onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, frecuenciaMeses: e.target.value } }))}
                      style={fieldStyle}
                    >
                      <option value="0">Única vez</option>
                      <option value="3">3 meses</option>
                      <option value="6">6 meses</option>
                      <option value="12">1 año</option>
                      <option value="24">2 años</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Indicaciones / Preparación previa
                  </label>
                  <input
                    value={modalControl.form.preparacion}
                    onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, preparacion: e.target.value } }))}
                    placeholder="Ej. Ayuno de 8–12 h, llevar resultados previos…"
                    style={fieldStyle}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Costo estimado (opcional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalControl.form.costoEstimado}
                      onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, costoEstimado: e.target.value } }))}
                      placeholder="0.00"
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Categoría de gasto
                    </label>
                    <select
                      value={modalControl.form.categoriaGasto}
                      onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, categoriaGasto: e.target.value } }))}
                      style={fieldStyle}
                    >
                      <option value="">{categoriaSaludSugerida}</option>
                      {(categoriasGasto || []).map((c) => (
                        <option key={c.id || c.nombre} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {modalControl.form.fechaProgramada && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink)", cursor: "pointer", paddingTop: 2 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(modalControl.form.syncCalendario)}
                      onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, syncCalendario: e.target.checked } }))}
                    />
                    Sincronizar en Calendario general como Cita médica (aparecerá en recordatorios y checklist si tiene costo)
                  </label>
                )}

                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Notas adicionales
                  </label>
                  <textarea
                    rows={2}
                    value={modalControl.form.notas}
                    onChange={(e) => setModalControl((prev) => ({ ...prev, form: { ...prev.form, notas: e.target.value } }))}
                    placeholder="Síntomas, orden médica, referencia de seguro…"
                    style={fieldStyle}
                  />
                </div>

                {modalControl.error && (
                  <div style={{ fontSize: 12, color: "var(--stamp)" }}>{modalControl.error}</div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    disabled={modalControl.saving}
                    onClick={() => setModalControl(null)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "transparent",
                      color: "var(--ink-soft)",
                      fontSize: 12.5,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={modalControl.saving}
                    onClick={guardarControl}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--sage)",
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: modalControl.saving ? "wait" : "pointer",
                    }}
                  >
                    <Check size={14} /> {modalControl.saving ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: COMPLETAR CONTROL / ESTUDIO */}
      {modalCompletar &&
        createPortal(
          <div
            onClick={() => !modalCompletar.saving && setModalCompletar(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.58)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 1050,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: 20,
                width: "100%",
                maxWidth: 460,
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 className="despensa-tab-font" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                  Completar: {modalCompletar.control.titulo}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalCompletar(null)}
                  style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Fecha en que se realizó
                  </label>
                  <input
                    type="date"
                    value={modalCompletar.fechaRealizado}
                    onChange={(e) => {
                      const fecha = e.target.value;
                      const meses = Number(modalCompletar.control.frecuenciaMeses) || 0;
                      setModalCompletar((prev) => ({
                        ...prev,
                        fechaRealizado: fecha,
                        proximaFecha: meses > 0 ? sumarMesesFecha(fecha, meses) : prev.proximaFecha,
                      }));
                    }}
                    style={fieldStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Resumen de resultados o hallazgos
                  </label>
                  <textarea
                    rows={2}
                    value={modalCompletar.resultadoResumen}
                    onChange={(e) => setModalCompletar((prev) => ({ ...prev, resultadoResumen: e.target.value }))}
                    placeholder="Ej. Valores normales, sin caries, próximo control en 6 meses…"
                    style={fieldStyle}
                  />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={modalCompletar.programarSiguiente}
                    onChange={(e) => setModalCompletar((prev) => ({ ...prev, programarSiguiente: e.target.checked }))}
                  />
                  Agendar próximo seguimiento
                </label>

                {modalCompletar.programarSiguiente && (
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Fecha del próximo control
                    </label>
                    <input
                      type="date"
                      value={modalCompletar.proximaFecha}
                      onChange={(e) => setModalCompletar((prev) => ({ ...prev, proximaFecha: e.target.value }))}
                      style={fieldStyle}
                    />
                  </div>
                )}

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink)", cursor: "pointer", paddingTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={modalCompletar.registrarGasto}
                    onChange={(e) => setModalCompletar((prev) => ({ ...prev, registrarGasto: e.target.checked }))}
                  />
                  Registrar gasto médico en Movimientos
                </label>

                {modalCompletar.registrarGasto && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 8, background: "var(--paper)", border: "1px solid var(--line)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--ink-soft)", marginBottom: 3 }}>Monto pagado</label>
                        <input
                          type="number"
                          step="0.01"
                          value={modalCompletar.montoGasto}
                          onChange={(e) => setModalCompletar((prev) => ({ ...prev, montoGasto: e.target.value }))}
                          placeholder="0.00"
                          style={fieldStyle}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--ink-soft)", marginBottom: 3 }}>Método de pago</label>
                        <select
                          value={modalCompletar.metodoPago}
                          onChange={(e) => setModalCompletar((prev) => ({ ...prev, metodoPago: e.target.value }))}
                          style={fieldStyle}
                        >
                          <option value="Transferencia / Débito">Transferencia / Débito</option>
                          <option value="Efectivo">Efectivo</option>
                          <option value="Tarjeta de crédito">Tarjeta de crédito</option>
                        </select>
                      </div>
                    </div>

                    {modalCompletar.metodoPago !== "Tarjeta de crédito" && cuentas.length > 0 && (
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--ink-soft)", marginBottom: 3 }}>
                          Cuenta desde donde vienen los fondos *
                        </label>
                        <select
                          value={modalCompletar.cuentaOrigenId}
                          onChange={(e) => setModalCompletar((prev) => ({ ...prev, cuentaOrigenId: e.target.value, error: null }))}
                          style={fieldStyle}
                        >
                          <option value="">Selecciona cuenta…</option>
                          {evaluarCuentasParaPago(saldosCuentas, parseFloat(modalCompletar.montoGasto) || 0).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} ({formatMoney(c.disponible)} disp.)
                            </option>
                          ))}
                          <option value="__SIN_CUENTA__">Efectivo / Sin descontar de mis cuentas</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {modalCompletar.error && (
                  <div style={{ fontSize: 12, color: "var(--stamp)" }}>{modalCompletar.error}</div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    disabled={modalCompletar.saving}
                    onClick={() => setModalCompletar(null)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "transparent",
                      color: "var(--ink-soft)",
                      fontSize: 12.5,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={modalCompletar.saving}
                    onClick={confirmarCompletarControl}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--sage)",
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: modalCompletar.saving ? "wait" : "pointer",
                    }}
                  >
                    <Check size={14} /> {modalCompletar.saving ? "Guardando…" : "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: REGISTRAR INDICADOR DE SALUD */}
      {modalIndicador &&
        createPortal(
          <div
            onClick={() => !modalIndicador.saving && setModalIndicador(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.58)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 1050,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: 20,
                width: "100%",
                maxWidth: 500,
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h3 className="despensa-tab-font" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                  Registrar indicador de salud
                </h3>
                <button
                  type="button"
                  onClick={() => setModalIndicador(null)}
                  style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Plantilla clínica o indicador personalizado
                  </label>
                  <select
                    value={modalIndicador.form.plantilla}
                    onChange={(e) => seleccionarPlantillaIndicador(e.target.value)}
                    style={fieldStyle}
                  >
                    {INDICADORES_PLANTILLAS.map((tpl) => (
                      <option key={tpl.nombre} value={tpl.nombre}>
                        {tpl.nombre} ({tpl.unidad})
                      </option>
                    ))}
                    <option value="__PERSONALIZADO__">Indicador personalizado…</option>
                  </select>
                </div>

                {modalIndicador.form.plantilla === "__PERSONALIZADO__" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>Nombre *</label>
                      <input
                        value={modalIndicador.form.nombre}
                        onChange={(e) => setModalIndicador((prev) => ({ ...prev, form: { ...prev.form, nombre: e.target.value } }))}
                        placeholder="Ej. Ferritina, Insulina…"
                        style={fieldStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>Categoría</label>
                      <select
                        value={modalIndicador.form.categoria}
                        onChange={(e) => setModalIndicador((prev) => ({ ...prev, form: { ...prev.form, categoria: e.target.value } }))}
                        style={fieldStyle}
                      >
                        {CATEGORIAS_INDICADORES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: modalIndicador.form.esDual ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      {modalIndicador.form.esDual ? "Sistólica *" : "Valor medido *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalIndicador.form.valor}
                      onChange={(e) => setModalIndicador((prev) => ({ ...prev, form: { ...prev.form, valor: e.target.value } }))}
                      placeholder="Ej. 118"
                      style={fieldStyle}
                    />
                  </div>
                  {modalIndicador.form.esDual && (
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                        Diastólica
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={modalIndicador.form.valorSecundario}
                        onChange={(e) => setModalIndicador((prev) => ({ ...prev, form: { ...prev.form, valorSecundario: e.target.value } }))}
                        placeholder="Ej. 76"
                        style={fieldStyle}
                      />
                    </div>
                  )}
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Unidad
                    </label>
                    <input
                      value={modalIndicador.form.unidad}
                      onChange={(e) => setModalIndicador((prev) => ({ ...prev, form: { ...prev.form, unidad: e.target.value } }))}
                      placeholder="mg/dL, mmHg, %…"
                      style={fieldStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>Ref. mínima</label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalIndicador.form.rangoMin}
                      onChange={(e) => setModalIndicador((prev) => ({ ...prev, form: { ...prev.form, rangoMin: e.target.value } }))}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>Ref. máxima</label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalIndicador.form.rangoMax}
                      onChange={(e) => setModalIndicador((prev) => ({ ...prev, form: { ...prev.form, rangoMax: e.target.value } }))}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>Fecha</label>
                    <input
                      type="date"
                      value={modalIndicador.form.fecha}
                      onChange={(e) => setModalIndicador((prev) => ({ ...prev, form: { ...prev.form, fecha: e.target.value } }))}
                      style={fieldStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Médico / Laboratorio asociado (opcional)
                  </label>
                  <select
                    value={modalIndicador.form.medicoId}
                    onChange={(e) => setModalIndicador((prev) => ({ ...prev, form: { ...prev.form, medicoId: e.target.value } }))}
                    style={fieldStyle}
                  >
                    <option value="">Ninguno</option>
                    {saludMedicos.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre} — {m.especialidad}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>Notas</label>
                  <input
                    value={modalIndicador.form.notas}
                    onChange={(e) => setModalIndicador((prev) => ({ ...prev, form: { ...prev.form, notas: e.target.value } }))}
                    placeholder="En ayunas, laboratorio Referencia…"
                    style={fieldStyle}
                  />
                </div>

                {modalIndicador.error && <div style={{ fontSize: 12, color: "var(--stamp)" }}>{modalIndicador.error}</div>}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    disabled={modalIndicador.saving}
                    onClick={() => setModalIndicador(null)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "transparent",
                      color: "var(--ink-soft)",
                      fontSize: 12.5,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={modalIndicador.saving}
                    onClick={guardarIndicador}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--sage)",
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: modalIndicador.saving ? "wait" : "pointer",
                    }}
                  >
                    <Check size={14} /> {modalIndicador.saving ? "Guardando…" : "Guardar medición"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: ASOCIAR / EDITAR MÉDICO */}
      {modalMedico &&
        createPortal(
          <div
            onClick={() => !modalMedico.saving && setModalMedico(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.58)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 1060,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: 20,
                width: "100%",
                maxWidth: 480,
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h3 className="despensa-tab-font" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                  {modalMedico.mode === "new" ? "Asociar médico o especialista" : "Editar médico"}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalMedico(null)}
                  style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Nombre del médico o centro *
                  </label>
                  <input
                    value={modalMedico.form.nombre}
                    onChange={(e) => setModalMedico((prev) => ({ ...prev, form: { ...prev.form, nombre: e.target.value } }))}
                    placeholder="Ej. Dr. Juan Pérez, Dra. María Gómez, Laboratorio Referencia…"
                    style={fieldStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Especialidad
                  </label>
                  <select
                    value={modalMedico.form.especialidad}
                    onChange={(e) => setModalMedico((prev) => ({ ...prev, form: { ...prev.form, especialidad: e.target.value } }))}
                    style={fieldStyle}
                  >
                    {ESPECIALIDADES_MEDICAS.map((esp) => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                  </select>
                </div>

                {modalMedico.form.especialidad === "Otra" && (
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Especificar especialidad
                    </label>
                    <input
                      value={modalMedico.form.especialidadCustom}
                      onChange={(e) => setModalMedico((prev) => ({ ...prev, form: { ...prev.form, especialidadCustom: e.target.value } }))}
                      placeholder="Ej. Nefrología, Hematología…"
                      style={fieldStyle}
                    />
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Clínica / Hospital
                    </label>
                    <input
                      value={modalMedico.form.centro}
                      onChange={(e) => setModalMedico((prev) => ({ ...prev, form: { ...prev.form, centro: e.target.value } }))}
                      placeholder="Ej. HOMS, Corominas…"
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Teléfono / WhatsApp
                    </label>
                    <input
                      value={modalMedico.form.telefono}
                      onChange={(e) => setModalMedico((prev) => ({ ...prev, form: { ...prev.form, telefono: e.target.value } }))}
                      placeholder="809-000-0000"
                      style={fieldStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      Dirección / Consultorio
                    </label>
                    <input
                      value={modalMedico.form.direccion}
                      onChange={(e) => setModalMedico((prev) => ({ ...prev, form: { ...prev.form, direccion: e.target.value } }))}
                      placeholder="Suite, piso…"
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                      ARS / Seguro aceptado
                    </label>
                    <input
                      value={modalMedico.form.seguroAceptado}
                      onChange={(e) => setModalMedico((prev) => ({ ...prev, form: { ...prev.form, seguroAceptado: e.target.value } }))}
                      placeholder={segurosSalud[0]?.nombre || "Humano, Universal, Senasa…"}
                      style={fieldStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Notas / Horario de consulta
                  </label>
                  <textarea
                    rows={2}
                    value={modalMedico.form.notas}
                    onChange={(e) => setModalMedico((prev) => ({ ...prev, form: { ...prev.form, notas: e.target.value } }))}
                    placeholder="Horario, extensión, recomendaciones…"
                    style={fieldStyle}
                  />
                </div>

                {modalMedico.error && <div style={{ fontSize: 12, color: "var(--stamp)" }}>{modalMedico.error}</div>}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    disabled={modalMedico.saving}
                    onClick={() => setModalMedico(null)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "transparent",
                      color: "var(--ink-soft)",
                      fontSize: 12.5,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={modalMedico.saving}
                    onClick={guardarMedico}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--sage)",
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: modalMedico.saving ? "wait" : "pointer",
                    }}
                  >
                    <Check size={14} /> {modalMedico.saving ? "Guardando…" : "Guardar médico"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
