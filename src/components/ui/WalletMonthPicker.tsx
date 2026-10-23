// ============================================================
// WalletMonthPicker — Seletor de Mes/Ano premium
// Usa DropdownMenu do Radix-UI (ja instalado) que se registra
// no sistema de layers do Radix, sendo 100% compativel com
// Dialog, Sheet, Popover etc. Abre lateral (right > left > bottom).
// ============================================================
import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_LONG  = ["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface WalletMonthPickerProps {
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;    // callback customizado para o botao X (limpar)
  label?: string;
  helperText?: string;
  minMonth?: string;
  maxMonth?: string;
  clearable?: boolean;   // exibe botao X para limpar o campo
}

export function WalletMonthPicker({
  value, onChange, onClear, label, helperText, minMonth, maxMonth, clearable = false,
}: WalletMonthPickerProps) {
  const [open, setOpen]       = useState(false);
  const now                   = new Date();
  const initYear              = value ? parseInt(value.split("-")[0]) : now.getFullYear();
  const [viewYear, setViewYear] = useState(initYear);

  const selectedYear  = value ? parseInt(value.split("-")[0]) : null;
  const selectedMonth = value ? parseInt(value.split("-")[1]) - 1 : null;

  const handleSelect = (i: number) => {
    const mm     = String(i + 1).padStart(2, "0");
    const newVal = `${viewYear}-${mm}`;
    if (minMonth && newVal < minMonth) return;
    if (maxMonth && newVal > maxMonth) return;
    onChange(newVal);
    setOpen(false);
  };

  const isDisabled = (i: number) => {
    const mm = String(i + 1).padStart(2, "0");
    const v  = `${viewYear}-${mm}`;
    return (!!minMonth && v < minMonth) || (!!maxMonth && v > maxMonth);
  };

  const isSelected     = (i: number) => selectedYear === viewYear && selectedMonth === i;
  const isCurrentMonth = (i: number) => now.getFullYear() === viewYear && now.getMonth() === i;

  const displayLabel = value
    ? `${MONTHS_LONG[parseInt(value.split("-")[1]) - 1]} de ${value.split("-")[0]}`
    : "Selecionar mes";

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      <DropdownMenu open={open} onOpenChange={setOpen}>
        {/* Trigger + botao de limpar (fora do trigger para nao abrir o picker) */}
        <div className="flex items-center gap-1">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`
                flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border text-sm
                transition-all duration-200 text-left focus:outline-none
                ${open
                  ? "border-primary ring-2 ring-primary/20 bg-background text-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/30"
                }
              `}
            >
              <span className={value ? "text-foreground" : "text-muted-foreground"}>
                {displayLabel}
              </span>
              <CalendarDays className={`w-4 h-4 flex-shrink-0 transition-colors ${open ? "text-primary" : "text-primary/60"}`} />
            </button>
          </DropdownMenuTrigger>

          {/* Botao limpar — aparece apenas quando ha valor e clearable=true */}
          {clearable && value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onClear) onClear();
                else onChange("");
              }}
              title="Limpar"
              className="h-[42px] w-8 flex-shrink-0 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-all duration-150"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Painel do picker — abre lateral */}
        <DropdownMenuContent
          side="right"
          sideOffset={8}
          align="start"
          className="p-4 rounded-xl border border-primary/20 bg-[#0c1a2e] shadow-2xl shadow-black/70 w-[268px]"
          onCloseAutoFocus={e => e.preventDefault()}
          onPointerDown={e => e.stopPropagation()}
        >
          {/* Navegacao de ano */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setViewYear(y => y - 1); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-foreground tracking-wide select-none">{viewYear}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setViewYear(y => y + 1); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grade de meses */}
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS_SHORT.map((m, i) => {
              const selected = isSelected(i);
              const disabled = isDisabled(i);
              const current  = isCurrentMonth(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleSelect(i); }}
                  className={`
                    relative py-2 rounded-lg text-xs font-semibold transition-all duration-150
                    ${selected
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-105"
                      : disabled
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : current
                          ? "text-primary border border-primary/30 bg-primary/5 hover:bg-primary/15"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }
                  `}
                >
                  {m}
                  {current && !selected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Rodape */}
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
            {value ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange(""); setOpen(false); }}
                className="text-xs text-muted-foreground hover:text-destructive font-medium transition-colors"
              >
                Limpar
              </button>
            ) : <span />}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const y  = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, "0");
                setViewYear(y);
                onChange(`${y}-${mm}`);
                setOpen(false);
              }}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Mes atual
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
