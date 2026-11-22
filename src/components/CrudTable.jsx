import React from "react";
import { LayoutList, LayoutGrid, Pencil, Trash2 } from "lucide-react";

/**
 * Selector compacto para alternar entre vista Listado CRUD (tabla) y vista Tarjetas.
 */
export function CrudViewToggle({ mode, onChange, cardsLabel = "Tarjetas" }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: 3,
        borderRadius: 8,
        border: "1px solid var(--line)",
        background: "var(--card)",
        gap: 2,
      }}
    >
      <button
        type="button"
        onClick={() => onChange("tabla")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 10px",
          borderRadius: 6,
          border: "none",
          background: mode === "tabla" ? "var(--sage)" : "transparent",
          color: mode === "tabla" ? "#fff" : "var(--ink-soft)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <LayoutList size={13} /> Listado
      </button>
      <button
        type="button"
        onClick={() => onChange("tarjetas")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 10px",
          borderRadius: 6,
          border: "none",
          background: mode === "tarjetas" ? "var(--sage)" : "transparent",
          color: mode === "tarjetas" ? "#fff" : "var(--ink-soft)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <LayoutGrid size={13} /> {cardsLabel}
      </button>
    </div>
  );
}

/**
 * Tabla CRUD limpia y uniforme (estilo listado administrativo con columnas claras y Acciones).
 *
 * Props:
 * - rows: Array de registros
 * - columns: Array<{ key, label, align?, mono?, width?, render: (row, idx) => ReactNode }>
 * - getRowId?: (row) => string
 * - onEdit?: (row) => void
 * - onDelete?: (row) => void
 * - extraActions?: (row) => ReactNode (botones extra antes de Editar/Eliminar, ej. Pagar, Detalles)
 * - isRowExpanded?: (row) => boolean
 * - renderExpandedRow?: (row) => ReactNode
 * - emptyMessage?: string
 */
export default function CrudTable({
  rows = [],
  columns = [],
  getRowId = (row) => row.id,
  onEdit,
  onDelete,
  extraActions,
  isRowExpanded,
  renderExpandedRow,
  emptyMessage = "No hay registros para mostrar.",
}) {
  if (!rows || rows.length === 0) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "2rem 1rem",
          textAlign: "center",
          fontSize: 13,
          color: "var(--ink-soft)",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  const hasActions = !!(onEdit || onDelete || extraActions);
  const colSpan = columns.length + (hasActions ? 1 : 0);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div className="despensa-scroll-x" style={{ width: "100%", overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            color: "var(--ink)",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid var(--line)",
                background: "var(--card)",
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "11px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ink-soft)",
                    textAlign: col.align || "left",
                    whiteSpace: "nowrap",
                    width: col.width,
                  }}
                >
                  {col.label}
                </th>
              ))}
              {hasActions && (
                <th
                  style={{
                    padding: "11px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ink-soft)",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const rowId = getRowId(row);
              const expanded = isRowExpanded ? isRowExpanded(row) : false;
              const zebraBg = idx % 2 === 1 ? "var(--line-soft)" : "transparent";

              return (
                <React.Fragment key={rowId}>
                  <tr
                    data-record-id={rowId}
                    className="despensa-row"
                    style={{
                      background: zebraBg,
                      borderBottom: expanded ? "none" : "1px solid var(--line-soft)",
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={col.mono ? "despensa-mono" : undefined}
                        style={{
                          padding: "11px 14px",
                          textAlign: col.align || "left",
                          fontVariantNumeric: col.mono ? "tabular-nums" : undefined,
                          verticalAlign: "middle",
                          whiteSpace: col.wrap ? "normal" : "nowrap",
                        }}
                      >
                        {col.render(row, idx)}
                      </td>
                    ))}

                    {hasActions && (
                      <td
                        style={{
                          padding: "9px 14px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {extraActions && extraActions(row)}
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "5px 11px",
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: 6,
                                border: "1px solid var(--line)",
                                background: "var(--card)",
                                color: "var(--ink)",
                                cursor: "pointer",
                              }}
                            >
                              <Pencil size={12} /> Editar
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "5px 11px",
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: 6,
                                border: "1px solid var(--line)",
                                background: "var(--card)",
                                color: "var(--stamp)",
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={12} /> Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {expanded && renderExpandedRow && (
                    <tr
                      style={{
                        background: "var(--paper)",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <td colSpan={colSpan} style={{ padding: "14px 16px" }}>
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
