import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  Pencil,
  Trash2,
  Check,
  RefreshCw,
  Stethoscope,
  Building2,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  BookUser,
} from "lucide-react";
import {
  addContacto,
  updateContacto,
  deleteContacto,
  syncGoogleContactsToLocal,
} from "../lib/db";
import {
  getCachedContactsAccessToken,
  clearCachedContactsAccessToken,
  getOrRequestContactsAccessToken,
} from "../firebase";
import {
  fetchGoogleContacts,
  createGoogleContact,
  updateGoogleContact,
  deleteGoogleContact,
} from "../lib/googleContacts";
import { confirm } from "../lib/confirm";
import Pagination from "./Pagination.jsx";
import { WhatsAppIcon } from "./WhatsAppIcon.jsx";
import CrudTable, { CrudViewToggle, useIsMobile } from "./CrudTable.jsx";

const PAGE_SIZE = 12;

const CATEGORIAS_CONTACTO = [
  "Médico / Consultorio",
  "Personal",
  "Servicio / Proveedor",
  "Banco / Finanzas",
  "Trabajo",
  "Emergencia",
  "Otro",
];

const EMPTY_FORM = {
  nombre: "",
  categoria: "Médico / Consultorio",
  especialidad: "",
  organizacion: "",
  telefono: "",
  email: "",
  direccion: "",
  horario: "",
  notas: "",
  favorito: false,
  guardarEnGoogle: false,
};

function GoogleSvgIcon() {
  return (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: 18, height: 18 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

function formatWhatsappHref(telefono) {
  const digits = String(telefono || "").replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.length === 10 ? `1${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

export default function Contactos({ contactos = [] }) {
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const [vistaModo, setVistaModo] = useState(() => {
    try {
      const saved = localStorage.getItem("smart-finance-contactos-vista");
      if (saved === "tabla" || saved === "tarjetas") return saved;
    } catch {}
    return "tabla";
  });

  // Estado de conexión y sincronización con Google Contacts
  const [googleConnected, setGoogleConnected] = useState(() => Boolean(getCachedContactsAccessToken()));
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [pushingAll, setPushingAll] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null); // { tipo: "ok" | "error", texto: string }

  // Modal de previsualización e importación selectiva desde Google Contacts
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [googleLista, setGoogleLista] = useState([]);
  const [googleSearch, setGoogleSearch] = useState("");
  const [selectedResources, setSelectedResources] = useState(() => new Set());
  const [importingSelected, setImportingSelected] = useState(false);

  const cambiarVistaModo = (modo) => {
    setVistaModo(modo);
    try {
      localStorage.setItem("smart-finance-contactos-vista", modo);
    } catch {}
  };

  useEffect(() => {
    setPage(1);
  }, [search, filtroCategoria, soloFavoritos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (contactos || []).filter((c) => {
      if (filtroCategoria !== "Todas" && (c.categoria || "Personal") !== filtroCategoria) return false;
      if (soloFavoritos && !c.favorito) return false;
      if (!q) return true;
      return (
        (c.nombre || "").toLowerCase().includes(q) ||
        (c.especialidad || "").toLowerCase().includes(q) ||
        (c.organizacion || "").toLowerCase().includes(q) ||
        (c.telefono || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.direccion || "").toLowerCase().includes(q) ||
        (c.notas || "").toLowerCase().includes(q)
      );
    });
  }, [contactos, search, filtroCategoria, soloFavoritos]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const linkedGoogleResources = useMemo(
    () => new Set((contactos || []).map((c) => c.googleResourceName).filter(Boolean)),
    [contactos]
  );

  const ensureGoogleToken = async (forcePrompt = false) => {
    const token = await getOrRequestContactsAccessToken(forcePrompt);
    setGoogleConnected(Boolean(token));
    return token;
  };

  const handleConnectAndSync = async () => {
    setConnectingGoogle(true);
    setSyncMessage(null);
    try {
      const token = await ensureGoogleToken(!googleConnected);
      await openGoogleImportModal(token);
    } catch (err) {
      const msg = err?.message || String(err);
      if (!msg.includes("popup_closed") && !msg.includes("popup-closed")) {
        setSyncMessage({ tipo: "error", texto: msg });
      }
      setGoogleConnected(Boolean(getCachedContactsAccessToken()));
    } finally {
      setConnectingGoogle(false);
    }
  };

  const openGoogleImportModal = async (existingToken = null) => {
    setSyncingGoogle(true);
    setSyncMessage(null);
    try {
      const token = existingToken || (await ensureGoogleToken(false));
      const fetched = await fetchGoogleContacts(token);
      setGoogleLista(fetched);
      setGoogleSearch("");
      // Preseleccionar contactos que aún no están importados o todos si no hay ninguno local
      const nuevos = fetched.filter((g) => !linkedGoogleResources.has(g.googleResourceName));
      const preselect = nuevos.length > 0 ? nuevos : fetched;
      setSelectedResources(new Set(preselect.map((g) => g.googleResourceName)));
      setImportModalOpen(true);
    } catch (err) {
      setGoogleConnected(Boolean(getCachedContactsAccessToken()));
      setSyncMessage({
        tipo: "error",
        texto: err?.message || "No se pudieron obtener tus contactos de Google.",
      });
    } finally {
      setSyncingGoogle(false);
    }
  };

  const handleConfirmImport = async () => {
    const chosen = googleLista.filter((g) => selectedResources.has(g.googleResourceName));
    if (chosen.length === 0) return;
    setImportingSelected(true);
    setSyncMessage(null);
    try {
      const { creados, actualizados } = await syncGoogleContactsToLocal(chosen, contactos);
      setImportModalOpen(false);
      setSyncMessage({
        tipo: "ok",
        texto: `Sincronización completada: ${creados} nuevo${creados !== 1 ? "s" : ""}, ${actualizados} actualizado${actualizados !== 1 ? "s" : ""}.`,
      });
    } catch (err) {
      setSyncMessage({ tipo: "error", texto: err?.message || "Error al guardar los contactos importados." });
    } finally {
      setImportingSelected(false);
    }
  };

  const handleDisconnectGoogle = () => {
    clearCachedContactsAccessToken();
    setGoogleConnected(false);
    setSyncMessage(null);
  };

  const handlePushSingleToGoogle = async (c) => {
    const esUpdate = Boolean(c.googleResourceName);
    const ok = await confirm(
      esUpdate
        ? `¿Deseas actualizar la información de "${c.nombre}" en tu cuenta de Google Contacts?`
        : `¿Deseas crear el contacto "${c.nombre}" en tu cuenta de Google Contacts?`,
      { confirmLabel: esUpdate ? "Actualizar en Google" : "Crear en Google", cancelLabel: "Cancelar", danger: false }
    );
    if (!ok) return;

    setSyncingGoogle(true);
    setSyncMessage(null);
    try {
      const token = await ensureGoogleToken(false);
      const res = esUpdate
        ? await updateGoogleContact(token, c.googleResourceName, c)
        : await createGoogleContact(token, c);
      await updateContacto(c.id, {
        googleResourceName: res.googleResourceName,
        googleEtag: res.googleEtag,
        sincronizadoGoogleEn: new Date().toISOString(),
      });
      setSyncMessage({
        tipo: "ok",
        texto: esUpdate
          ? `"${c.nombre}" actualizado en Google Contacts.`
          : `"${c.nombre}" guardado en Google Contacts.`,
      });
    } catch (err) {
      setGoogleConnected(Boolean(getCachedContactsAccessToken()));
      setSyncMessage({ tipo: "error", texto: err?.message || "No se pudo sincronizar con Google Contacts." });
    } finally {
      setSyncingGoogle(false);
    }
  };

  const handlePushLocalPendingToGoogle = async () => {
    const pendientes = (contactos || []).filter((c) => !c.googleResourceName);
    if (pendientes.length === 0) {
      setSyncMessage({ tipo: "ok", texto: "Todos tus contactos locales ya están vinculados con Google Contacts." });
      return;
    }

    const ok = await confirm(
      `¿Deseas subir ${pendientes.length} contacto${pendientes.length !== 1 ? "s" : ""} local${pendientes.length !== 1 ? "es" : ""} aún no sincronizado${pendientes.length !== 1 ? "s" : ""} a tu cuenta de Google Contacts?`,
      { confirmLabel: "Subir a Google", cancelLabel: "Cancelar", danger: false }
    );
    if (!ok) return;

    setPushingAll(true);
    setSyncMessage(null);
    let subidos = 0;
    try {
      const token = await ensureGoogleToken(false);
      for (const c of pendientes) {
        const res = await createGoogleContact(token, c);
        await updateContacto(c.id, {
          googleResourceName: res.googleResourceName,
          googleEtag: res.googleEtag,
          sincronizadoGoogleEn: new Date().toISOString(),
        });
        subidos += 1;
      }
      setSyncMessage({
        tipo: "ok",
        texto: `Se subieron ${subidos} contacto${subidos !== 1 ? "s" : ""} a Google Contacts.`,
      });
    } catch (err) {
      setGoogleConnected(Boolean(getCachedContactsAccessToken()));
      setSyncMessage({
        tipo: "error",
        texto: err?.message || `Error al subir contactos (${subidos} completados).`,
      });
    } finally {
      setPushingAll(false);
    }
  };

  const handleAdd = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) {
      setFormError("Ingresa el nombre del contacto o consultorio");
      return;
    }

    let googleMeta = { googleResourceName: null, googleEtag: null };
    if (form.guardarEnGoogle) {
      const okGoogle = await confirm(
        `¿Deseas crear también a "${nombre}" en tu cuenta de Google Contacts?`,
        { confirmLabel: "Guardar en ambos", cancelLabel: "Solo guardar aquí", danger: false }
      );
      if (okGoogle) {
        setSaving(true);
        setFormError(null);
        try {
          const token = await ensureGoogleToken(false);
          googleMeta = await createGoogleContact(token, { ...form, nombre });
        } catch (err) {
          setSaving(false);
          setFormError(`No se pudo crear en Google Contacts: ${err?.message || err}`);
          return;
        }
      }
    }

    setSaving(true);
    setFormError(null);
    try {
      await addContacto({
        ...form,
        nombre,
        ...googleMeta,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      if (googleMeta.googleResourceName) {
        setSyncMessage({ tipo: "ok", texto: `"${nombre}" guardado localmente y en Google Contacts.` });
      }
    } catch (err) {
      setFormError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({
      nombre: c.nombre || "",
      categoria: c.categoria || "Personal",
      especialidad: c.especialidad || "",
      organizacion: c.organizacion || "",
      telefono: c.telefono || "",
      email: c.email || "",
      direccion: c.direccion || "",
      horario: c.horario || "",
      notas: c.notas || "",
      favorito: Boolean(c.favorito),
      googleResourceName: c.googleResourceName || null,
      googleEtag: c.googleEtag || null,
      sincronizarConGoogle: Boolean(c.googleResourceName),
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    const nombre = (editForm?.nombre || "").trim();
    if (!nombre) {
      setEditError("El nombre no puede estar vacío");
      return;
    }

    let googleUpdates = {};
    if (editForm.googleResourceName && editForm.sincronizarConGoogle) {
      const okGoogle = await confirm(
        `¿Deseas actualizar también los cambios de "${nombre}" en tu cuenta de Google Contacts?`,
        { confirmLabel: "Actualizar en Google", cancelLabel: "Solo actualizar aquí", danger: false }
      );
      if (okGoogle) {
        setEditSaving(true);
        setEditError(null);
        try {
          const token = await ensureGoogleToken(false);
          const res = await updateGoogleContact(token, editForm.googleResourceName, { ...editForm, nombre });
          googleUpdates = {
            googleResourceName: res.googleResourceName,
            googleEtag: res.googleEtag,
            sincronizadoGoogleEn: new Date().toISOString(),
          };
        } catch (err) {
          setEditSaving(false);
          setEditError(`No se pudo actualizar en Google Contacts: ${err?.message || err}`);
          return;
        }
      }
    }

    setEditSaving(true);
    setEditError(null);
    try {
      await updateContacto(editingId, {
        nombre,
        categoria: editForm.categoria || "Personal",
        especialidad: (editForm.especialidad || "").trim(),
        organizacion: (editForm.organizacion || "").trim(),
        telefono: (editForm.telefono || "").trim(),
        email: (editForm.email || "").trim(),
        direccion: (editForm.direccion || "").trim(),
        horario: (editForm.horario || "").trim(),
        notas: (editForm.notas || "").trim(),
        favorito: Boolean(editForm.favorito),
        ...googleUpdates,
      });
      cancelEdit();
    } catch (err) {
      setEditError(err?.message || String(err));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (c) => {
    const okLocal = await confirm(`¿Eliminar a "${c.nombre}" de tu directorio de Contactos?`, {
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      danger: true,
    });
    if (!okLocal) return;

    if (c.googleResourceName && googleConnected) {
      const okGoogle = await confirm(
        `Este contacto está vinculado con Google Contacts. ¿Deseas eliminarlo también de tu cuenta de Google Contacts? Esta acción no se puede deshacer en Google.`,
        { confirmLabel: "Eliminar de Google también", cancelLabel: "Mantener en Google", danger: true }
      );
      if (okGoogle) {
        try {
          const token = await ensureGoogleToken(false);
          await deleteGoogleContact(token, c.googleResourceName);
        } catch (err) {
          setSyncMessage({
            tipo: "error",
            texto: `Se eliminó localmente, pero no de Google Contacts: ${err?.message || err}`,
          });
        }
      }
    }

    await deleteContacto(c.id);
  };

  const filteredGoogleList = useMemo(() => {
    const q = googleSearch.trim().toLowerCase();
    if (!q) return googleLista;
    return googleLista.filter(
      (g) =>
        (g.nombre || "").toLowerCase().includes(q) ||
        (g.organizacion || "").toLowerCase().includes(q) ||
        (g.especialidad || "").toLowerCase().includes(q) ||
        (g.telefono || "").toLowerCase().includes(q) ||
        (g.email || "").toLowerCase().includes(q)
    );
  }, [googleLista, googleSearch]);

  const renderEditForm = () => (
    <div>
      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          autoFocus
          placeholder="Nombre o consultorio"
          value={editForm.nombre}
          onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <select
          value={editForm.categoria}
          onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          {CATEGORIAS_CONTACTO.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Especialidad o cargo (ej. Urólogo)"
          value={editForm.especialidad}
          onChange={(e) => setEditForm({ ...editForm, especialidad: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <input
          placeholder="Clínica / Empresa (opcional)"
          value={editForm.organizacion}
          onChange={(e) => setEditForm({ ...editForm, organizacion: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>
      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Teléfono / WhatsApp"
          value={editForm.telefono}
          onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <input
          placeholder="Correo electrónico (opcional)"
          type="email"
          value={editForm.email}
          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>
      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Dirección (ej. Edif. Profesional, Suite 304)"
          value={editForm.direccion}
          onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <input
          placeholder="Horario (ej. Lun–Vie 8am–4pm)"
          value={editForm.horario}
          onChange={(e) => setEditForm({ ...editForm, horario: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>
      <input
        placeholder="Notas (ej. Acepta ARS Humano, llamar antes)"
        value={editForm.notas}
        onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer", color: "var(--ink)" }}>
          <input
            type="checkbox"
            checked={editForm.favorito}
            onChange={(e) => setEditForm({ ...editForm, favorito: e.target.checked })}
          />
          <Star size={14} style={{ color: "var(--amber)" }} />
          <span>Marcar como favorito</span>
        </label>
        {editForm.googleResourceName && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer", color: "var(--ink)" }}>
            <input
              type="checkbox"
              checked={editForm.sincronizarConGoogle}
              onChange={(e) => setEditForm({ ...editForm, sincronizarConGoogle: e.target.checked })}
            />
            <span>Actualizar también en Google Contacts (pedirá confirmación)</span>
          </label>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={saveEdit}
          disabled={editSaving}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: editSaving ? "not-allowed" : "pointer" }}
        >
          <Check size={14} /> {editSaving ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          onClick={cancelEdit}
          style={{ padding: "7px 14px", fontSize: 13, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
        >
          Cancelar
        </button>
      </div>
      {editError && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{editError}</div>}
    </div>
  );

  const localPendientesCount = useMemo(
    () => (contactos || []).filter((c) => !c.googleResourceName).length,
    [contactos]
  );

  return (
    <div>
      {/* Tarjeta de sincronización con Google Contacts */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 260px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: googleConnected ? "var(--sage-bg)" : "var(--paper)",
              border: "1px solid var(--line)",
              color: googleConnected ? "var(--sage)" : "var(--ink-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {googleConnected ? <CheckCircle2 size={18} /> : <BookUser size={18} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span>Google Contacts</span>
              {googleConnected && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: "1px 7px",
                    borderRadius: 6,
                    background: "var(--sage-bg)",
                    color: "var(--sage)",
                  }}
                >
                  Conectado
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
              {googleConnected
                ? "Importa contactos desde Google o sube tus consultorios y proveedores con confirmación previa."
                : "Inicia sesión con Google para sincronizar tus contactos y consultorios médicos."}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {!googleConnected ? (
            <button
              type="button"
              className="gsi-material-button"
              onClick={handleConnectAndSync}
              disabled={connectingGoogle || syncingGoogle}
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <GoogleSvgIcon />
                </div>
                <span className="gsi-material-button-contents">
                  {connectingGoogle ? "Conectando…" : "Sign in with Google"}
                </span>
              </div>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openGoogleImportModal()}
                disabled={syncingGoogle || pushingAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: "var(--sage)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: syncingGoogle ? "wait" : "pointer",
                }}
              >
                <DownloadCloud size={14} />
                {syncingGoogle ? "Cargando…" : "Importar de Google"}
              </button>
              {localPendientesCount > 0 && (
                <button
                  type="button"
                  onClick={handlePushLocalPendingToGoogle}
                  disabled={pushingAll || syncingGoogle}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    fontSize: 12.5,
                    fontWeight: 500,
                    background: "var(--paper)",
                    color: "var(--ink)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    cursor: pushingAll ? "wait" : "pointer",
                  }}
                >
                  <UploadCloud size={14} />
                  {pushingAll ? "Subiendo…" : `Subir ${localPendientesCount} a Google`}
                </button>
              )}
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                title="Desconectar sesión temporal de Google Contacts"
                style={{
                  padding: "7px 10px",
                  fontSize: 12,
                  background: "transparent",
                  color: "var(--ink-soft)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Desconectar
              </button>
            </>
          )}
        </div>
      </div>

      {syncMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "9px 12px",
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 12.5,
            background: syncMessage.tipo === "ok" ? "var(--sage-bg)" : "var(--stamp-bg)",
            color: syncMessage.tipo === "ok" ? "var(--sage)" : "var(--stamp)",
            border: `1px solid ${syncMessage.tipo === "ok" ? "var(--sage)" : "var(--stamp)"}`,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {syncMessage.tipo === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {syncMessage.texto}
          </span>
          <button
            type="button"
            onClick={() => setSyncMessage(null)}
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Barra de búsqueda, filtros y botón agregar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--ink-soft)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contacto, urólogo, clínica, teléfono…"
            style={{
              width: "100%",
              padding: "8px 10px 8px 30px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--card)",
              fontSize: 13,
            }}
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          style={{
            padding: "8px 10px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--card)",
            fontSize: 12.5,
          }}
        >
          <option value="Todas">Todas las categorías</option>
          {CATEGORIAS_CONTACTO.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setSoloFavoritos((f) => !f)}
          title="Filtrar solo contactos favoritos"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "8px 11px",
            fontSize: 12.5,
            fontWeight: 500,
            borderRadius: 8,
            border: `1px solid ${soloFavoritos ? "var(--amber)" : "var(--line)"}`,
            background: soloFavoritos ? "var(--amber-bg)" : "var(--card)",
            color: soloFavoritos ? "var(--amber)" : "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          <Star size={14} fill={soloFavoritos ? "currentColor" : "none"} />
          <span>Favoritos</span>
        </button>

        <button
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--ink)",
            color: "var(--paper)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar contacto"}
        </button>

        <CrudViewToggle mode={vistaModo} onChange={cambiarVistaModo} />
      </div>

      {/* Formulario de nuevo contacto */}
      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
            Registrar contacto o consultorio
          </div>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              autoFocus
              placeholder="Nombre, ej. Consultorio Dr. Pérez (Urólogo)"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {CATEGORIAS_CONTACTO.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Especialidad / Área (ej. Urología, Odontología)"
              value={form.especialidad}
              onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              placeholder="Clínica / Centro / Empresa (ej. Centro Médico UCE)"
              value={form.organizacion}
              onChange={(e) => setForm({ ...form, organizacion: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Teléfono / WhatsApp (ej. 809-555-1234)"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              placeholder="Correo electrónico (opcional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Dirección (ej. Av. Independencia #45, Suite 202)"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              placeholder="Horario (ej. Lun–Vie 8am–4pm)"
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <input
            placeholder="Notas (ej. Acepta ARS Humano, secretaria Ana, extensión 205)"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer", color: "var(--ink)" }}>
              <input
                type="checkbox"
                checked={form.favorito}
                onChange={(e) => setForm({ ...form, favorito: e.target.checked })}
              />
              <Star size={14} style={{ color: "var(--amber)" }} />
              <span>Marcar como favorito</span>
            </label>
            {googleConnected && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer", color: "var(--ink)" }}>
                <input
                  type="checkbox"
                  checked={form.guardarEnGoogle}
                  onChange={(e) => setForm({ ...form, guardarEnGoogle: e.target.checked })}
                />
                <span>Guardar también en Google Contacts</span>
              </label>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={!form.nombre.trim() || saving}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: form.nombre.trim() ? "var(--sage)" : "var(--line)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: form.nombre.trim() && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Guardando…" : "Guardar contacto"}
          </button>
          {formError && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>}
        </div>
      )}

      {/* Listado */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          {contactos.length === 0
            ? "Todavía no tienes contactos registrados. Agrega uno manual (ej. el consultorio de tu urólogo) o sincroniza tus contactos con Google."
            : "No hay contactos que coincidan con el filtro actual."}
        </div>
      ) : !isMobile && vistaModo === "tabla" ? (
        <CrudTable
          rows={paginated}
          getRowId={(c) => c.id}
          columns={[
            {
              key: "favorito",
              label: "",
              render: (c) => (
                <button
                  type="button"
                  onClick={() => updateContacto(c.id, { favorito: !c.favorito })}
                  title={c.favorito ? "Quitar de favoritos" : "Marcar como favorito"}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: c.favorito ? "var(--amber)" : "var(--ink-soft)",
                    display: "flex",
                    padding: 2,
                  }}
                >
                  <Star size={14} fill={c.favorito ? "currentColor" : "none"} />
                </button>
              ),
            },
            {
              key: "nombre",
              label: "Contacto / Consultorio",
              wrap: true,
              render: (c) => (
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>{c.nombre}</span>
                  </div>
                  {(c.organizacion || c.notas) && (
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1 }}>
                      {[c.organizacion, c.notas].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "categoria",
              label: "Categoría / Especialidad",
              wrap: true,
              render: (c) => (
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>
                    {c.categoria || "Personal"}
                  </div>
                  {c.especialidad && (
                    <div style={{ fontSize: 11, color: "var(--sage)", fontWeight: 500 }}>
                      {c.especialidad}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "telefono",
              label: "Teléfono / Contacto",
              wrap: true,
              render: (c) => {
                const wa = formatWhatsappHref(c.telefono);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {c.telefono ? (
                        <>
                          <a
                            href={`tel:${c.telefono}`}
                            className="despensa-mono"
                            style={{ fontSize: 12.5, color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}
                          >
                            {c.telefono}
                          </a>
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir en WhatsApp"
                              style={{ display: "inline-flex", alignItems: "center" }}
                            >
                              <WhatsAppIcon size={13} color="#25D366" />
                            </a>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "var(--ink-soft)" }}>—</span>
                      )}
                    </div>
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        style={{ fontSize: 11, color: "var(--ink-soft)", textDecoration: "none" }}
                      >
                        {c.email}
                      </a>
                    )}
                  </div>
                );
              },
            },
            {
              key: "direccion",
              label: "Dirección / Horario",
              wrap: true,
              render: (c) => (
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  <div>{c.direccion || "—"}</div>
                  {c.horario && (
                    <div style={{ fontSize: 11, marginTop: 2, color: "var(--ink-soft)" }}>
                      🕒 {c.horario}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "google",
              label: "Google",
              align: "center",
              render: (c) =>
                c.googleResourceName ? (
                  <button
                    type="button"
                    onClick={() => handlePushSingleToGoogle(c)}
                    disabled={syncingGoogle}
                    title="Sincronizado con Google Contacts (clic para actualizar en Google)"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      background: "var(--sage-bg)",
                      color: "var(--sage)",
                      border: "1px solid var(--sage)",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={11} /> Sincronizado
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePushSingleToGoogle(c)}
                    disabled={syncingGoogle}
                    title="Subir este contacto a tu cuenta de Google Contacts"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      fontSize: 11,
                      fontWeight: 500,
                      background: "var(--paper)",
                      color: "var(--ink-soft)",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <UploadCloud size={11} /> Subir
                  </button>
                ),
            },
          ]}
          onEdit={(c) => startEdit(c)}
          onDelete={(c) => handleDelete(c)}
          isRowExpanded={(c) => editingId === c.id}
          renderExpandedRow={() => renderEditForm()}
        />
      ) : (
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
          {paginated.map((c, i) => {
            const wa = formatWhatsappHref(c.telefono);
            return (
              <div
                key={c.id}
                data-record-id={c.id}
                className="despensa-row"
                style={{
                  padding: "11px 12px",
                  borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
                }}
              >
                {editingId === c.id ? (
                  renderEditForm()
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => updateContacto(c.id, { favorito: !c.favorito })}
                      title={c.favorito ? "Quitar de favoritos" : "Marcar como favorito"}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: c.favorito ? "var(--amber)" : "var(--ink-soft)",
                        padding: "2px 0",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Star size={16} fill={c.favorito ? "currentColor" : "none"} />
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.nombre}</span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: "1px 7px",
                            borderRadius: 6,
                            background: c.categoria === "Médico / Consultorio" ? "var(--blue-bg)" : "var(--paper)",
                            color: c.categoria === "Médico / Consultorio" ? "var(--blue)" : "var(--ink-soft)",
                            border: "1px solid var(--line)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {c.categoria === "Médico / Consultorio" && <Stethoscope size={10} />}
                          {c.categoria || "Personal"}
                        </span>
                        {c.especialidad && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--sage)" }}>
                            · {c.especialidad}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        {c.organizacion && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Building2 size={11} /> {c.organizacion}
                          </span>
                        )}
                        {c.telefono && (
                          <a
                            href={`tel:${c.telefono}`}
                            className="despensa-mono"
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--ink)", textDecoration: "none" }}
                          >
                            <Phone size={11} /> {c.telefono}
                          </a>
                        )}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#10b981", textDecoration: "none", fontWeight: 600 }}
                          >
                            <WhatsAppIcon size={11} color="#25D366" /> WhatsApp
                          </a>
                        )}
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--ink-soft)", textDecoration: "none" }}
                          >
                            <Mail size={11} /> {c.email}
                          </a>
                        )}
                        {c.direccion && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <MapPin size={11} /> {c.direccion}
                          </span>
                        )}
                        {c.horario && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Clock size={11} /> {c.horario}
                          </span>
                        )}
                      </div>

                      {c.notas && (
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
                          {c.notas}
                        </div>
                      )}

                      <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handlePushSingleToGoogle(c)}
                          disabled={syncingGoogle}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 500,
                            background: c.googleResourceName ? "var(--sage-bg)" : "var(--paper)",
                            color: c.googleResourceName ? "var(--sage)" : "var(--ink-soft)",
                            border: `1px solid ${c.googleResourceName ? "var(--sage)" : "var(--line)"}`,
                            borderRadius: 6,
                            cursor: "pointer",
                          }}
                        >
                          {c.googleResourceName ? <RefreshCw size={11} /> : <UploadCloud size={11} />}
                          <span>{c.googleResourceName ? "Actualizar en Google" : "Subir a Google"}</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => startEdit(c)}
                        title="Editar contacto"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 30,
                          height: 30,
                          background: "transparent",
                          color: "var(--ink-soft)",
                          border: "none",
                          borderRadius: 7,
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        title="Eliminar contacto"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 30,
                          height: 30,
                          background: "transparent",
                          color: "var(--stamp)",
                          border: "none",
                          borderRadius: 7,
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {/* Modal de importación selectiva desde Google Contacts */}
      {importModalOpen && (
        <div
          onClick={() => !importingSelected && setImportModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "16px 18px",
              width: "100%",
              maxWidth: 560,
              maxHeight: "86vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: "var(--ink)" }}>
                  Sincronizar desde Google Contacts
                </h3>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
                  Se encontraron {googleLista.length} contacto{googleLista.length !== 1 ? "s" : ""} en tu cuenta de Google. Selecciona los que deseas importar o actualizar.
                </div>
              </div>
              <button
                type="button"
                onClick={() => !importingSelected && setImportModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 200px" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: 10, color: "var(--ink-soft)" }} />
                <input
                  value={googleSearch}
                  onChange={(e) => setGoogleSearch(e.target.value)}
                  placeholder="Filtrar contactos de Google…"
                  style={{
                    width: "100%",
                    padding: "7px 10px 7px 30px",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    background: "var(--paper)",
                    fontSize: 12.5,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const visibleIds = filteredGoogleList.map((g) => g.googleResourceName);
                  const allSelected = visibleIds.every((id) => selectedResources.has(id));
                  const next = new Set(selectedResources);
                  if (allSelected) visibleIds.forEach((id) => next.delete(id));
                  else visibleIds.forEach((id) => next.add(id));
                  setSelectedResources(next);
                }}
                style={{
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 500,
                  background: "var(--paper)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {filteredGoogleList.length > 0 && filteredGoogleList.every((g) => selectedResources.has(g.googleResourceName))
                  ? "Deseleccionar visibles"
                  : "Seleccionar visibles"}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, background: "var(--paper)", marginBottom: 12 }}>
              {filteredGoogleList.length === 0 ? (
                <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 12.5, color: "var(--ink-soft)" }}>
                  No hay contactos que coincidan con "{googleSearch}".
                </div>
              ) : (
                filteredGoogleList.map((g, idx) => {
                  const checked = selectedResources.has(g.googleResourceName);
                  const yaVinculado = linkedGoogleResources.has(g.googleResourceName);
                  return (
                    <label
                      key={g.googleResourceName || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 11px",
                        borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                        cursor: "pointer",
                        background: checked ? "var(--card)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(selectedResources);
                          if (next.has(g.googleResourceName)) next.delete(g.googleResourceName);
                          else next.add(g.googleResourceName);
                          setSelectedResources(next);
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span>{g.nombre}</span>
                          {yaVinculado && (
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: "var(--sage-bg)", color: "var(--sage)" }}>
                              Ya sincronizado
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 1 }}>
                          {[g.organizacion, g.especialidad, g.telefono, g.email].filter(Boolean).join(" · ") || "Sin teléfono ni correo"}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                {selectedResources.size} seleccionado{selectedResources.size !== 1 ? "s" : ""}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  disabled={importingSelected}
                  style={{ padding: "8px 14px", fontSize: 12.5, background: "var(--paper)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={selectedResources.size === 0 || importingSelected}
                  style={{
                    padding: "8px 16px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    background: selectedResources.size > 0 ? "var(--sage)" : "var(--line)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: selectedResources.size > 0 && !importingSelected ? "pointer" : "not-allowed",
                  }}
                >
                  {importingSelected ? "Sincronizando…" : `Importar (${selectedResources.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
