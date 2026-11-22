import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Pencil, Check, Shield, Car, HeartPulse, Home, Umbrella, Calendar, Landmark, ShieldPlus, CreditCard } from "lucide-react";
import { addSeguro, deleteSeguro, updateSeguroEstado, updateSeguro } from "../lib/db";
import { confirm } from "../lib/confirm";
import SeguroSaludCard, { ARS_ESTILOS, ARS_PRESETS } from "./SeguroSaludCard.jsx";
import CrudTable, { CrudViewToggle } from "./CrudTable.jsx";

const TIPOS = ["Vehículo", "Salud", "Vida", "Hogar/Propiedad", "Otro"];
const ESTADOS = ["Activo", "Vencido", "Cancelado"];
const FRECUENCIAS_PRIMA = ["Mensual", "Trimestral", "Semestral", "Anual", "Único pago"];

const TIPO_ICONS = {
  Vehículo: Car,
  Salud: HeartPulse,
  Vida: HeartPulse,
  "Hogar/Propiedad": Home,
  Otro: Umbrella,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha + "T00:00:00");
  return Math.round((target - hoy) / 86400000);
}

const emptyForm = (tipoInicial = TIPOS[0]) => ({
  nombre: "",
  tipo: tipoInicial,
  entidadId: "",
  activoId: "",
  numeroPoliza: "",
  fechaInicio: todayStr(),
  fechaVencimiento: "",
  primaMonto: "",
  primaFrecuencia: "Anual",
  diasAviso: "15",
  estado: "Activo",
  notas: "",
  arsNombre: "",
  planNombre: "",
  numeroAfiliado: "",
  nss: "",
  titularNombre: "",
  dependientes: "",
  telefonoAutorizaciones: "",
  colorPlastico: "primera-humano",
});

function toEditForm(s) {
  return {
    nombre: s.nombre || "",
    tipo: s.tipo || TIPOS[0],
    entidadId: s.entidadId || "",
    activoId: s.activoId || "",
    numeroPoliza: s.numeroPoliza || "",
    fechaInicio: s.fechaInicio || todayStr(),
    fechaVencimiento: s.fechaVencimiento || "",
    primaMonto: s.primaMonto != null ? String(s.primaMonto) : "",
    primaFrecuencia: s.primaFrecuencia || "Anual",
    diasAviso: s.diasAviso != null ? String(s.diasAviso) : "15",
    estado: s.estado || "Activo",
    notas: s.notas || "",
    arsNombre: s.arsNombre || "",
    planNombre: s.planNombre || "",
    numeroAfiliado: s.numeroAfiliado || "",
    nss: s.nss || "",
    titularNombre: s.titularNombre || "",
    dependientes: s.dependientes || "",
    telefonoAutorizaciones: s.telefonoAutorizaciones || "",
    colorPlastico: s.colorPlastico || "primera-humano",
  };
}

export default function Seguros({ seguros, entidades, activos }) {
  const [showForm, setShowForm] = useState(false);
  const [vistaModo, setVistaModo] = useState(() => {
    try {
      const saved = localStorage.getItem("smart-finance-seguros-vista");
      if (saved === "tabla" || saved === "tarjetas") return saved;
    } catch {}
    return "tabla";
  });
  const [carnetAbiertoId, setCarnetAbiertoId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const vehiculos = useMemo(() => (activos || []).filter((a) => a.tipo === "Vehículo"), [activos]);

  const cambiarVistaModo = (modo) => {
    setVistaModo(modo);
    try {
      localStorage.setItem("smart-finance-seguros-vista", modo);
    } catch {}
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditForm(toEditForm(s));
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const handleAdd = async () => {
    const nombre = form.nombre.trim() || (form.tipo === "Salud" && form.arsNombre.trim() ? `Seguro Médico - ${form.arsNombre.trim()}` : "");
    if (!nombre) {
      setFormError(
        form.tipo === "Salud"
          ? "Ingresa un nombre o selecciona tu ARS (ej. Primera ARS de Humano)"
          : "Ingresa un nombre, ej. Seguro de vehículo - CR-V"
      );
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      const activo = vehiculos.find((a) => a.id === form.activoId);
      await addSeguro({
        nombre,
        tipo: form.tipo,
        entidadId: form.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        activoId: form.tipo === "Vehículo" ? form.activoId || null : null,
        activoNombre: form.tipo === "Vehículo" ? activo?.nombre || "" : "",
        numeroPoliza: form.numeroPoliza.trim(),
        fechaInicio: form.fechaInicio || null,
        fechaVencimiento: form.fechaVencimiento || null,
        primaMonto: parseFloat(form.primaMonto) || null,
        primaFrecuencia: form.primaFrecuencia,
        diasAviso: parseInt(form.diasAviso, 10) || 15,
        estado: form.estado,
        notas: form.notas.trim(),
        arsNombre: form.tipo === "Salud" ? form.arsNombre.trim() : "",
        planNombre: form.tipo === "Salud" ? form.planNombre.trim() : "",
        numeroAfiliado: form.tipo === "Salud" ? form.numeroAfiliado.trim() : "",
        nss: form.tipo === "Salud" ? form.nss.trim() : "",
        titularNombre: form.tipo === "Salud" ? form.titularNombre.trim() : "",
        dependientes: form.tipo === "Salud" ? form.dependientes.trim() : "",
        telefonoAutorizaciones: form.tipo === "Salud" ? form.telefonoAutorizaciones.trim() : "",
        colorPlastico: form.tipo === "Salud" ? form.colorPlastico || "primera-humano" : "primera-humano",
      });
      setForm(emptyForm());
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    const nombre = editForm.nombre.trim() || (editForm.tipo === "Salud" && editForm.arsNombre.trim() ? `Seguro Médico - ${editForm.arsNombre.trim()}` : "");
    if (!nombre) {
      setEditError("Ingresa un nombre para el seguro");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const entidad = entidades.find((e) => e.docId === editForm.entidadId);
      const activo = vehiculos.find((a) => a.id === editForm.activoId);
      await updateSeguro(editingId, {
        nombre,
        tipo: editForm.tipo,
        entidadId: editForm.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        activoId: editForm.tipo === "Vehículo" ? editForm.activoId || null : null,
        activoNombre: editForm.tipo === "Vehículo" ? activo?.nombre || "" : "",
        numeroPoliza: editForm.numeroPoliza.trim(),
        fechaInicio: editForm.fechaInicio || null,
        fechaVencimiento: editForm.fechaVencimiento || null,
        primaMonto: parseFloat(editForm.primaMonto) || null,
        primaFrecuencia: editForm.primaFrecuencia,
        diasAviso: parseInt(editForm.diasAviso, 10) || 15,
        estado: editForm.estado,
        notas: editForm.notas.trim(),
        arsNombre: editForm.tipo === "Salud" ? editForm.arsNombre.trim() : "",
        planNombre: editForm.tipo === "Salud" ? editForm.planNombre.trim() : "",
        numeroAfiliado: editForm.tipo === "Salud" ? editForm.numeroAfiliado.trim() : "",
        nss: editForm.tipo === "Salud" ? editForm.nss.trim() : "",
        titularNombre: editForm.tipo === "Salud" ? editForm.titularNombre.trim() : "",
        dependientes: editForm.tipo === "Salud" ? editForm.dependientes.trim() : "",
        telefonoAutorizaciones: editForm.tipo === "Salud" ? editForm.telefonoAutorizaciones.trim() : "",
        colorPlastico: editForm.tipo === "Salud" ? editForm.colorPlastico || "primera-humano" : "primera-humano",
      });
      cancelEdit();
    } catch (err) {
      setEditError(err.message || String(err));
    } finally {
      setEditSaving(false);
    }
  };

  const renderForm = (f, setF, onSave, savingFlag, error, onCancel, isEdit) => (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          autoFocus
          placeholder={f.tipo === "Salud" ? "Nombre, ej. Primera ARS de Humano - Plan Complementario" : "Nombre, ej. Seguro de vehículo - CR-V"}
          value={f.nombre}
          onChange={(e) => setF({ ...f, nombre: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <select
          value={f.tipo}
          onChange={(e) => setF({ ...f, tipo: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {f.tipo === "Salud" && (() => {
        const presetActivo = ARS_PRESETS.find((p) => p.arsNombre.toLowerCase() === (f.arsNombre || "").trim().toLowerCase());
        return (
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
              background: "var(--paper)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
                <ShieldPlus size={14} style={{ color: "var(--sage)" }} />
                Simulador de Plástico / Carnet ARS
              </span>
              <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                También aparecerá en tu Wallet y en Salud
              </span>
            </div>

            {/* Presets rápidos de ARS */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {ARS_PRESETS.map((preset) => {
                const selected = (f.arsNombre || "").trim().toLowerCase() === preset.arsNombre.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setF({
                        ...f,
                        arsNombre: preset.arsNombre,
                        colorPlastico: preset.colorPlastico,
                        telefonoAutorizaciones: f.telefonoAutorizaciones || preset.telefonoAutorizaciones,
                        nombre: f.nombre.trim() ? f.nombre : `Seguro Médico - ${preset.arsNombre}`,
                      })
                    }
                    style={{
                      padding: "4px 10px",
                      fontSize: 11.5,
                      fontWeight: selected ? 600 : 500,
                      borderRadius: 6,
                      border: `1px solid ${selected ? "var(--sage)" : "var(--line)"}`,
                      background: selected ? "var(--sage-bg)" : "var(--card)",
                      color: selected ? "var(--sage)" : "var(--ink-soft)",
                      cursor: "pointer",
                    }}
                  >
                    {preset.arsNombre}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, alignItems: "start" }}>
              <div>
                <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder="ARS (ej. Primera ARS de Humano)"
                    value={f.arsNombre}
                    onChange={(e) => setF({ ...f, arsNombre: e.target.value })}
                    style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  />
                  <input
                    placeholder="Plan (ej. Complementario, Máximo, PDSS)"
                    value={f.planNombre}
                    onChange={(e) => setF({ ...f, planNombre: e.target.value })}
                    style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  />
                </div>

                {presetActivo?.planesComunes?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                    {presetActivo.planesComunes.map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setF({ ...f, planNombre: plan })}
                        style={{
                          padding: "3px 8px",
                          fontSize: 10.5,
                          borderRadius: 5,
                          border: `1px solid ${f.planNombre === plan ? "var(--sage)" : "var(--line)"}`,
                          background: f.planNombre === plan ? "var(--sage-bg)" : "var(--card)",
                          color: f.planNombre === plan ? "var(--sage)" : "var(--ink-soft)",
                          cursor: "pointer",
                        }}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                )}

                <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input
                    className="despensa-mono"
                    placeholder="No. de Carnet / Afiliado (Plástico)"
                    value={f.numeroAfiliado}
                    onChange={(e) => setF({ ...f, numeroAfiliado: e.target.value })}
                    style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  />
                  <input
                    className="despensa-mono"
                    placeholder="NSS (Seguridad Social)"
                    value={f.nss}
                    onChange={(e) => setF({ ...f, nss: e.target.value })}
                    style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  />
                </div>

                <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder="Nombre del titular en el plástico"
                    value={f.titularNombre}
                    onChange={(e) => setF({ ...f, titularNombre: e.target.value })}
                    style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  />
                  <input
                    placeholder="Tel. autorizaciones / emergencias"
                    value={f.telefonoAutorizaciones}
                    onChange={(e) => setF({ ...f, telefonoAutorizaciones: e.target.value })}
                    style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  />
                </div>

                <input
                  placeholder="Dependientes / Beneficiarios (opcional, ej. Esposa, Hijo)"
                  value={f.dependientes}
                  onChange={(e) => setF({ ...f, dependientes: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)", marginBottom: 10 }}
                />

                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>Diseño / Color del plástico</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(ARS_ESTILOS).map(([key, est]) => {
                      const active = (f.colorPlastico || "primera-humano") === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setF({ ...f, colorPlastico: key })}
                          title={est.label}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: `1px solid ${active ? "var(--sage)" : "var(--line)"}`,
                            background: active ? "var(--sage-bg)" : "var(--card)",
                            color: active ? "var(--ink)" : "var(--ink-soft)",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: est.bg, border: "1px solid rgba(255,255,255,0.25)" }} />
                          {est.label.split(" (")[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Vista previa en vivo del plástico ARS */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6, alignSelf: "flex-start" }}>
                  Vista previa del plástico (toca para voltear):
                </div>
                <SeguroSaludCard seguro={f} interactive />
              </div>
            </div>
          </div>
        );
      })()}

      {f.tipo === "Vehículo" && (
        <div style={{ marginBottom: 8 }}>
          {vehiculos.length === 0 ? (
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", padding: "4px 0" }}>
              No tienes vehículos registrados en Activos todavía (opcional).
            </div>
          ) : (
            <select
              value={f.activoId}
              onChange={(e) => setF({ ...f, activoId: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Vincular a un vehículo de Activos (opcional)…</option>
              {vehiculos.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
        <select
          value={f.entidadId}
          onChange={(e) => setF({ ...f, entidadId: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          <option value="">Aseguradora (opcional)</option>
          {entidades
            .filter((e) => e.type === "Aseguradora")
            .map((e) => (
              <option key={e.docId} value={e.docId}>{e.name}</option>
            ))}
        </select>
        {entidades.filter((e) => e.type === "Aseguradora").length === 0 && (
          <div style={{ gridColumn: "1 / -1", fontSize: 10.5, color: "var(--ink-soft)", marginTop: -4 }}>
            No tienes entidades de tipo "Aseguradora" — créala primero en el módulo de Entidades.
          </div>
        )}
        <input
          placeholder="No. de póliza"
          value={f.numeroPoliza}
          onChange={(e) => setF({ ...f, numeroPoliza: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Fecha de inicio</div>
          <input
            type="date"
            value={f.fechaInicio}
            onChange={(e) => setF({ ...f, fechaInicio: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Vigencia hasta (vencimiento)</div>
          <input
            type="date"
            value={f.fechaVencimiento}
            onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
          />
        </div>
      </div>

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          className="despensa-mono"
          type="number"
          step="0.01"
          min="0"
          placeholder="Prima (monto)"
          value={f.primaMonto}
          onChange={(e) => setF({ ...f, primaMonto: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <select
          value={f.primaFrecuencia}
          onChange={(e) => setF({ ...f, primaFrecuencia: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          {FRECUENCIAS_PRIMA.map((fr) => (
            <option key={fr} value={fr}>{fr}</option>
          ))}
        </select>
        <input
          className="despensa-mono"
          type="number"
          min="0"
          placeholder="Avisar (días antes)"
          value={f.diasAviso}
          onChange={(e) => setF({ ...f, diasAviso: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>

      {isEdit && (
        <div style={{ marginBottom: 8 }}>
          <select
            value={f.estado}
            onChange={(e) => setF({ ...f, estado: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      )}

      <input
        placeholder="Notas (opcional)"
        value={f.notas}
        onChange={(e) => setF({ ...f, notas: e.target.value })}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onSave}
          disabled={savingFlag}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: savingFlag ? "not-allowed" : "pointer" }}
        >
          {isEdit ? <Check size={14} /> : <Plus size={14} />} {savingFlag ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar seguro"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{ padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
          >
            Cancelar
          </button>
        )}
      </div>
      {error && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{error}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm("Salud"));
              setShowForm(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            <ShieldPlus size={14} /> Agregar seguro de salud (ARS)
          </button>
          <button
            onClick={() => {
              if (!showForm) setForm(emptyForm());
              setShowForm((s) => !s);
            }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Agregar otro seguro"}
          </button>
        </div>
        <CrudViewToggle mode={vistaModo} onChange={cambiarVistaModo} />
      </div>

      {showForm && renderForm(form, setForm, handleAdd, saving, formError, null, false)}

      {seguros.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no tienes seguros registrados. Agrega tu seguro de salud (ARS y plástico digital), vehículo, vida, hogar o cualquier otro.
        </div>
      ) : vistaModo === "tabla" ? (
        <CrudTable
          rows={seguros}
          columns={[
            {
              key: "no",
              label: "No.",
              mono: true,
              render: (_s, idx) => <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{idx + 1}</span>,
            },
            {
              key: "nombre",
              label: "Seguro / ARS",
              wrap: true,
              render: (s) => (
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{s.nombre}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    {s.arsNombre || s.entidadName || s.activoNombre || "Sin aseguradora"}
                  </div>
                </div>
              ),
            },
            {
              key: "tipo",
              label: "Tipo / Plan",
              render: (s) => (
                <div>
                  <span style={{ fontWeight: 500 }}>{s.tipo}</span>
                  {s.planNombre && <div style={{ fontSize: 11, color: "var(--sage)" }}>{s.planNombre}</div>}
                </div>
              ),
            },
            {
              key: "poliza",
              label: "Póliza / Carnet",
              mono: true,
              render: (s) => (
                <div>
                  <div>{s.numeroAfiliado || s.numeroPoliza || "—"}</div>
                  {s.nss && <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>NSS: {s.nss}</div>}
                </div>
              ),
            },
            {
              key: "prima",
              label: "Prima",
              align: "right",
              mono: true,
              render: (s) =>
                s.primaMonto != null ? (
                  <div>
                    <div style={{ fontWeight: 600 }}>{formatMoney(s.primaMonto)}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>{s.primaFrecuencia}</div>
                  </div>
                ) : (
                  "—"
                ),
            },
            {
              key: "vigencia",
              label: "Vigencia",
              mono: true,
              render: (s) => {
                const dias = diasHasta(s.fechaVencimiento);
                return (
                  <div>
                    <div>{s.fechaVencimiento ? formatDateDisplay(s.fechaVencimiento) : "—"}</div>
                    {s.estado === "Activo" && dias != null && (
                      <div style={{ fontSize: 10.5, color: dias <= (s.diasAviso ?? 15) ? "var(--stamp)" : "var(--ink-soft)" }}>
                        {dias < 0 ? "Vencido" : `en ${dias}d`}
                      </div>
                    )}
                  </div>
                );
              },
            },
            {
              key: "estado",
              label: "Estado",
              align: "center",
              render: (s) => <EstadoBadge estado={s.estado} onChange={(estado) => updateSeguroEstado(s.id, estado)} />,
            },
          ]}
          extraActions={(s) =>
            s.tipo === "Salud" ? (
              <button
                type="button"
                onClick={() => setCarnetAbiertoId((prev) => (prev === s.id ? null : s.id))}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 9px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: carnetAbiertoId === s.id ? "var(--sage-bg)" : "var(--card)",
                  color: carnetAbiertoId === s.id ? "var(--sage)" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                <CreditCard size={12} />
                {carnetAbiertoId === s.id ? "Ocultar" : "Plástico"}
              </button>
            ) : null
          }
          onEdit={(s) => startEdit(s)}
          onDelete={async (s) => {
            if (await confirm("¿Eliminar este seguro?")) deleteSeguro(s.id);
          }}
          isRowExpanded={(s) => editingId === s.id || carnetAbiertoId === s.id}
          renderExpandedRow={(s) =>
            editingId === s.id ? (
              renderForm(editForm, setEditForm, saveEdit, editSaving, editError, cancelEdit, true)
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, alignItems: "center" }}>
                <SeguroSaludCard seguro={s} interactive />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                  <Field label="ARS" value={s.arsNombre || s.entidadName || "—"} />
                  <Field label="Plan" value={s.planNombre || "—"} />
                  <Field label="No. Afiliado / Carnet" value={s.numeroAfiliado || "—"} />
                  <Field label="NSS" value={s.nss || "—"} />
                  <Field label="Tel. autorizaciones" value={s.telefonoAutorizaciones || "—"} />
                  {s.dependientes && <Field label="Dependientes" value={s.dependientes} />}
                </div>
              </div>
            )
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {seguros.map((s) => {
            const isEditing = editingId === s.id;
            if (isEditing) {
              return <div key={s.id}>{renderForm(editForm, setEditForm, saveEdit, editSaving, editError, cancelEdit, true)}</div>;
            }

            const Icon = TIPO_ICONS[s.tipo] || Shield;
            const dias = diasHasta(s.fechaVencimiento);
            let etiqueta = null;
            if (s.estado === "Activo" && dias != null) {
              if (dias < 0) etiqueta = { text: "Vencido", color: "var(--stamp)", bg: "var(--stamp-bg)" };
              else if (dias <= (s.diasAviso ?? 15)) etiqueta = { text: `Vence en ${dias}d`, color: "var(--stamp)", bg: "var(--stamp-bg)" };
              else etiqueta = { text: `Vence en ${dias}d`, color: "var(--ink-soft)", bg: "var(--line-soft)" };
            }

            const esSalud = s.tipo === "Salud";

            return (
              <div key={s.id} data-record-id={s.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--sage-bg)", color: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{s.nombre}</span>
                        <EstadoBadge estado={s.estado} onChange={(estado) => updateSeguroEstado(s.id, estado)} />
                        {etiqueta && (
                          <span className="despensa-mono" style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 7px", borderRadius: 12, background: etiqueta.bg, color: etiqueta.color }}>
                            {etiqueta.text}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span>{s.tipo}</span>
                        {s.arsNombre && <span>· {s.arsNombre}</span>}
                        {s.planNombre && <span>· {s.planNombre}</span>}
                        {s.entidadName && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <Landmark size={11} /> {s.entidadName}
                          </span>
                        )}
                        {s.activoNombre && <span>· {s.activoNombre}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(s)}
                      title="Editar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        if (await confirm("¿Eliminar este seguro?")) deleteSeguro(s.id);
                      }}
                      title="Eliminar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {esSalud ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, alignItems: "center" }}>
                    <SeguroSaludCard seguro={s} interactive />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                      <Field label="ARS" value={s.arsNombre || s.entidadName || "—"} />
                      <Field label="Plan" value={s.planNombre || "—"} />
                      <Field label="No. Afiliado / Carnet" value={s.numeroAfiliado || "—"} />
                      <Field label="NSS" value={s.nss || "—"} />
                      <Field label="No. de póliza" value={s.numeroPoliza || "—"} />
                      <Field label="Prima" value={s.primaMonto != null ? `${formatMoney(s.primaMonto)} / ${s.primaFrecuencia}` : "—"} />
                      <Field
                        label="Vigencia"
                        value={
                          s.fechaInicio || s.fechaVencimiento ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Calendar size={11} /> {formatDateDisplay(s.fechaInicio) || "—"} - {formatDateDisplay(s.fechaVencimiento) || "—"}
                            </span>
                          ) : (
                            "—"
                          )
                        }
                      />
                      {s.dependientes && <Field label="Dependientes" value={s.dependientes} />}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                    <Field label="No. de póliza" value={s.numeroPoliza || "—"} />
                    <Field label="Prima" value={s.primaMonto != null ? `${formatMoney(s.primaMonto)} / ${s.primaFrecuencia}` : "—"} />
                    <Field
                      label="Vigencia"
                      value={
                        s.fechaInicio || s.fechaVencimiento ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Calendar size={11} /> {formatDateDisplay(s.fechaInicio) || "—"} - {formatDateDisplay(s.fechaVencimiento) || "—"}
                          </span>
                        ) : (
                          "—"
                        )
                      }
                    />
                  </div>
                )}

                {s.notas && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 10, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>{s.notas}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div className="despensa-mono" style={{ fontSize: 12.5, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function EstadoBadge({ estado, onChange }) {
  const colors = {
    Activo: { bg: "var(--sage-bg)", color: "var(--sage)" },
    Vencido: { bg: "var(--stamp-bg)", color: "var(--stamp)" },
    Cancelado: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
  };
  const c = colors[estado] || colors.Activo;
  return (
    <select
      value={estado}
      onChange={(e) => onChange(e.target.value)}
      style={{ fontSize: 10.5, fontWeight: 500, padding: "2px 6px", borderRadius: 20, border: "none", background: c.bg, color: c.color, cursor: "pointer" }}
    >
      {ESTADOS.map((e) => (
        <option key={e} value={e}>{e}</option>
      ))}
    </select>
  );
}
