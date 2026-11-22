import React, { useState } from "react";
import { ShieldPlus, HeartPulse, RotateCw, Copy, Check, Phone } from "lucide-react";

export const ARS_ESTILOS = {
  "primera-humano": {
    label: "Primera ARS (Azul Humano)",
    bg: "linear-gradient(135deg, #003566 0%, #0066b2 55%, #00a6e6 100%)",
    text: "#ffffff",
    accent: "rgba(255, 255, 255, 0.2)",
    badgeBg: "rgba(255, 255, 255, 0.18)",
    badgeBorder: "rgba(255, 255, 255, 0.36)",
    stripe: "#00c2ff",
  },
  "humano-royal": {
    label: "Humano Royal / Platino",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0284c7 100%)",
    text: "#f8fafc",
    accent: "rgba(56, 189, 248, 0.22)",
    badgeBg: "rgba(56, 189, 248, 0.2)",
    badgeBorder: "rgba(125, 211, 252, 0.45)",
    stripe: "#38bdf8",
  },
  senasa: {
    label: "ARS SeNaSa (Verde)",
    bg: "linear-gradient(135deg, #064e3b 0%, #15803d 58%, #22c55e 100%)",
    text: "#f0fdf4",
    accent: "rgba(255, 255, 255, 0.18)",
    badgeBg: "rgba(255, 255, 255, 0.18)",
    badgeBorder: "rgba(255, 255, 255, 0.35)",
    stripe: "#4ade80",
  },
  universal: {
    label: "ARS Universal (Azul y Oro)",
    bg: "linear-gradient(135deg, #0f2544 0%, #1d3b66 62%, #b5892e 100%)",
    text: "#f8fafc",
    accent: "rgba(251, 191, 36, 0.22)",
    badgeBg: "rgba(251, 191, 36, 0.2)",
    badgeBorder: "rgba(253, 224, 71, 0.42)",
    stripe: "#fbbf24",
  },
  mapfre: {
    label: "Mapfre Salud (Rojo)",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 58%, #ef4444 100%)",
    text: "#fef2f2",
    accent: "rgba(255, 255, 255, 0.18)",
    badgeBg: "rgba(255, 255, 255, 0.18)",
    badgeBorder: "rgba(255, 255, 255, 0.35)",
    stripe: "#fca5a5",
  },
  reservas: {
    label: "ARS Reservas (Azul y Ámbar)",
    bg: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 62%, #d97706 100%)",
    text: "#f8fafc",
    accent: "rgba(255, 255, 255, 0.18)",
    badgeBg: "rgba(255, 255, 255, 0.18)",
    badgeBorder: "rgba(255, 255, 255, 0.35)",
    stripe: "#fbbf24",
  },
  plata: {
    label: "Plástico Blanco / Plata",
    bg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 58%, #cbd5e1 100%)",
    text: "#0f172a",
    accent: "rgba(15, 23, 42, 0.08)",
    badgeBg: "rgba(2, 132, 199, 0.12)",
    badgeBorder: "rgba(2, 132, 199, 0.35)",
    stripe: "#0284c7",
  },
  negro: {
    label: "Plan Élite (Negro)",
    bg: "linear-gradient(135deg, #27272a 0%, #09090b 100%)",
    text: "#f4f4f5",
    accent: "rgba(255, 255, 255, 0.14)",
    badgeBg: "rgba(255, 255, 255, 0.14)",
    badgeBorder: "rgba(255, 255, 255, 0.3)",
    stripe: "#a1a1aa",
  },
};

export const ARS_PRESETS = [
  {
    id: "primera-humano",
    arsNombre: "Primera ARS de Humano",
    colorPlastico: "primera-humano",
    telefonoAutorizaciones: "809-476-3535",
    planesComunes: ["Plan Básico (PDSS)", "Complementario", "Plus", "Máximo", "Royal"],
  },
  {
    id: "humano-seguros",
    arsNombre: "Humano Seguros",
    colorPlastico: "humano-royal",
    telefonoAutorizaciones: "809-476-3535",
    planesComunes: ["Mi Salud", "Royal", "Global", "Local"],
  },
  {
    id: "senasa",
    arsNombre: "ARS SeNaSa",
    colorPlastico: "senasa",
    telefonoAutorizaciones: "809-333-3824",
    planesComunes: ["Contributivo (PDSS)", "SeNaSa Larimar", "Máximo"],
  },
  {
    id: "universal",
    arsNombre: "ARS Universal",
    colorPlastico: "universal",
    telefonoAutorizaciones: "809-544-7111",
    planesComunes: ["Plan Básico (PDSS)", "Salud Óptima", "Universal Salud"],
  },
  {
    id: "mapfre",
    arsNombre: "Mapfre Salud ARS",
    colorPlastico: "mapfre",
    telefonoAutorizaciones: "809-565-0555",
    planesComunes: ["Plan Básico (PDSS)", "Complementario", "Salud Elite"],
  },
  {
    id: "reservas",
    arsNombre: "ARS Reservas",
    colorPlastico: "reservas",
    telefonoAutorizaciones: "809-960-8585",
    planesComunes: ["Plan Básico (PDSS)", "Complementario", "Reservas Plus"],
  },
  {
    id: "yunen",
    arsNombre: "ARS Yunen",
    colorPlastico: "plata",
    telefonoAutorizaciones: "809-688-1744",
    planesComunes: ["Plan Básico (PDSS)", "Complementario"],
  },
  {
    id: "monumental",
    arsNombre: "ARS Monumental",
    colorPlastico: "plata",
    telefonoAutorizaciones: "809-581-1163",
    planesComunes: ["Plan Básico (PDSS)", "Complementario"],
  },
];

function formatDateCard(dateStr) {
  if (!dateStr) return "—";
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

export default function SeguroSaludCard({
  seguro = {},
  interactive = false,
  compact = false,
}) {
  const [flipped, setFlipped] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const estilo = ARS_ESTILOS[seguro.colorPlastico] || ARS_ESTILOS["primera-humano"];
  const arsNombre = (seguro.arsNombre || "").trim() || (seguro.entidadName || "").trim() || "ARS / Seguro de Salud";
  const planNombre = (seguro.planNombre || "").trim() || "Plan de Salud";
  const numeroCarnet = (seguro.numeroAfiliado || "").trim() || (seguro.numeroPoliza || "").trim() || "SIN NÚMERO";
  const titular = (seguro.titularNombre || "").trim() || (seguro.nombre || "").trim() || "AFILIADO TITULAR";
  const nss = (seguro.nss || "").trim();
  const vigencia = seguro.fechaVencimiento ? formatDateCard(seguro.fechaVencimiento) : "VIGENTE";

  const handleCopy = (e, label, value) => {
    e.stopPropagation();
    if (!value || !navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 1500);
    }).catch(() => {});
  };

  const maxWidth = compact ? 300 : 340;

  return (
    <div style={{ width: "100%", maxWidth, flexShrink: 0 }}>
      <div
        onClick={interactive ? () => setFlipped((f) => !f) : undefined}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1.586 / 1",
          borderRadius: 14,
          background: estilo.bg,
          color: estilo.text,
          padding: flipped ? "12px 16px 14px" : "15px 18px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 8px 22px rgba(0, 0, 0, 0.22)",
          overflow: "hidden",
          cursor: interactive ? "pointer" : "default",
          userSelect: "none",
          boxSizing: "border-box",
          border: "1px solid rgba(255, 255, 255, 0.14)",
        }}
      >
        {/* Decoración sutil geométrica de carnet plástico */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -36,
            top: -36,
            width: 148,
            height: 148,
            borderRadius: "50%",
            background: estilo.accent,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 3,
            background: estilo.stripe,
            opacity: 0.9,
            pointerEvents: "none",
          }}
        />

        {!flipped ? (
          <>
            {/* Encabezado: ARS + Plan */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: estilo.badgeBg,
                    border: `1px solid ${estilo.badgeBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ShieldPlus size={15} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: compact ? 13 : 14,
                      fontWeight: 700,
                      lineHeight: 1.15,
                      letterSpacing: "-0.01em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {arsNombre}
                  </div>
                  <div style={{ fontSize: 9, opacity: 0.82, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 1 }}>
                    Carnet Seguro de Salud
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: estilo.badgeBg,
                  border: `1px solid ${estilo.badgeBorder}`,
                  whiteSpace: "nowrap",
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flexShrink: 0,
                }}
              >
                {planNombre}
              </span>
            </div>

            {/* Centro: Número de Afiliado / Plástico y Titular */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 8.5, opacity: 0.78, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
                No. Afiliado / Carnet
              </div>
              <div
                className="despensa-mono"
                style={{
                  fontSize: compact ? 14.5 : 16,
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  fontVariantNumeric: "tabular-nums",
                  marginBottom: 6,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {numeroCarnet}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {titular}
              </div>
            </div>

            {/* Pie: NSS / Póliza y Vigencia */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
                {nss && (
                  <div>
                    <div style={{ fontSize: 8, opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>NSS</div>
                    <div className="despensa-mono" style={{ fontSize: 10.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {nss}
                    </div>
                  </div>
                )}
                {seguro.numeroPoliza && seguro.numeroPoliza !== numeroCarnet && (
                  <div>
                    <div style={{ fontSize: 8, opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>Póliza</div>
                    <div className="despensa-mono" style={{ fontSize: 10.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {seguro.numeroPoliza}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 8, opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {seguro.fechaVencimiento ? "Vence" : "Estado"}
                  </div>
                  <div className="despensa-mono" style={{ fontSize: 10.5, fontWeight: 600 }}>
                    {vigencia}
                  </div>
                </div>
                <HeartPulse size={16} style={{ opacity: 0.85 }} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Reverso del plástico */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  height: 22,
                  margin: "0 -16px 10px",
                  background: "rgba(0, 0, 0, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 16px",
                  fontSize: 9.5,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#fff",
                }}
              >
                <span>{arsNombre}</span>
                <span>{planNombre}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", fontSize: 10.5 }}>
                <div>
                  <div style={{ fontSize: 8.5, opacity: 0.75, textTransform: "uppercase" }}>No. Carnet</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="despensa-mono" style={{ fontWeight: 600 }}>{numeroCarnet}</span>
                    {seguro.numeroAfiliado && (
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, "afiliado", seguro.numeroAfiliado)}
                        title="Copiar número de afiliado"
                        style={{ background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer", opacity: 0.85 }}
                      >
                        {copiedKey === "afiliado" ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 8.5, opacity: 0.75, textTransform: "uppercase" }}>NSS</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="despensa-mono" style={{ fontWeight: 600 }}>{nss || "—"}</span>
                    {nss && (
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, "nss", nss)}
                        title="Copiar NSS"
                        style={{ background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer", opacity: 0.85 }}
                      >
                        {copiedKey === "nss" ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 8.5, opacity: 0.75, textTransform: "uppercase" }}>Beneficiarios / Dependientes</div>
                  <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {(seguro.dependientes || "").trim() || "Solo titular"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, position: "relative", zIndex: 1, fontSize: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, opacity: 0.9 }}>
                <Phone size={11} />
                {seguro.telefonoAutorizaciones ? `Autoriz.: ${seguro.telefonoAutorizaciones}` : "Póliza " + (seguro.numeroPoliza || "activa")}
              </span>
              <span style={{ opacity: 0.8, fontSize: 9.5 }}>Toca para ver frente</span>
            </div>
          </>
        )}
      </div>

      {interactive && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, padding: "0 2px" }}>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
              border: "none",
              padding: "2px 0",
              color: "var(--ink-soft)",
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RotateCw size={12} /> {flipped ? "Ver frente del plástico" : "Voltear plástico (reverso)"}
          </button>

          {seguro.numeroAfiliado && (
            <button
              type="button"
              onClick={(e) => handleCopy(e, "btn", seguro.numeroAfiliado)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "transparent",
                border: "none",
                padding: "2px 0",
                color: copiedKey === "btn" ? "var(--sage)" : "var(--ink-soft)",
                fontSize: 11.5,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {copiedKey === "btn" ? <Check size={12} /> : <Copy size={12} />}
              {copiedKey === "btn" ? "Copiado" : "Copiar carnet"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
