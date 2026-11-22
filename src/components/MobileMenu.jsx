import React from "react";
import { X, Home, ArrowLeftRight, Wallet, Banknote, Car, Landmark, Settings, LogOut, Coins, WalletCards, HeartPulse, Stethoscope, Bot, Map as MapIcon, UtensilsCrossed, CheckSquare, Target, Route, BookUser } from "lucide-react";
import { confirm } from "../lib/confirm";
import SmartFinanceLogo from "./SmartFinanceLogo.jsx";

const OPCIONES = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { id: "dinero-cuentas", label: "Finanzas", icon: Coins },
  { id: "presupuesto-mensual", label: "Presupuesto", icon: Wallet },
  { id: "presupuesto-flujo", label: "Ruta de flujo", icon: Route },
  { id: "checklist-pagos", label: "Checklist de pagos", icon: CheckSquare },
  { id: "prestamos", label: "Préstamos", icon: Landmark },
  { id: "estrategia-deudas", label: "Estrategia de pagos", icon: Target },
  { id: "recetas", label: "Sugeridor de platos", icon: UtensilsCrossed },
  { id: "deudas-pagos", label: "Pagos fijos", icon: Banknote },
  { id: "activos", label: "Activos", icon: Car },
  { id: "entidades", label: "Entidades", icon: Landmark },
  { id: "contactos", label: "Contactos", icon: BookUser },
  { id: "wallet", label: "Wallet", icon: WalletCards },
  { id: "salud", label: "Salud y Chequeos", icon: Stethoscope },
  { id: "habitos", label: "Salud y Hábitos", icon: HeartPulse },
  { id: "asistente", label: "Consultor Financiero", icon: Bot },
  { id: "mapa-progreso", label: "Mapa de progreso", icon: MapIcon },
  { id: "configuracion", label: "Configuración", icon: Settings },
];

function activoEnGrupo(tab, grupoId) {
  if (tab === grupoId) return true;
  const prefijosPorGrupo = {
    "dinero-cuentas": ["cuentas", "ahorro", "inversion", "ingresos"],
    "deudas-pagos": ["tarjetas", "membresias", "contratos"],
    activos: ["activos", "seguros"],
    "presupuesto-mensual": ["presupuesto", "presupuesto-categoria-gasto", "presupuesto-metodologia", "vacaciones", "vuelos"],
  };
  return (prefijosPorGrupo[grupoId] || []).includes(tab);
}

export default function MobileMenu({ tab, setTab, onClose, onSignOut, isOwner = false }) {
  const irA = (id) => {
    setTab(id);
    onClose();
  };

  const opciones = OPCIONES.filter((item) => {
    if (!isOwner) {
      if (item.id === "recetas" || item.id === "catalogo" || item.id === "compras") return false;
    }
    return true;
  });

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(280px, 82vw)",
          height: "100%",
          background: "var(--card)",
          borderRight: "1px solid var(--line)",
          padding: "calc(1.25rem + env(safe-area-inset-top, 0px)) 1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <SmartFinanceLogo size={24} />
          <button
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: "var(--paper)", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {opciones.map((item) => {
            const Icon = item.icon;
            const activo = activoEnGrupo(tab, item.id);
            return (
              <button
                key={item.id}
                onClick={() => irA(item.id)}
                className={`despensa-tab-font despensa-navitem${activo ? " is-active" : ""}`}
                style={{
                  gap: 12,
                  padding: "11px 10px",
                  background: "transparent",
                  color: activo ? "var(--sage)" : "var(--ink)",
                  fontSize: 14,
                  fontWeight: activo ? 700 : 500,
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={activo ? 2.25 : 1.9}
                  style={{ flexShrink: 0, fill: "none" }}
                />
                <span className="despensa-navlabel" style={{ fontWeight: activo ? 700 : 500 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={async () => {
            onClose();
            if (await confirm("¿Cerrar sesión?", { confirmLabel: "Cerrar sesión", danger: false })) onSignOut();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 10px",
            borderRadius: 9,
            border: "none",
            background: "transparent",
            color: "var(--stamp)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            textAlign: "left",
            marginTop: "auto",
          }}
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
