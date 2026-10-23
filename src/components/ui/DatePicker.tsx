import { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  label?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
}

export function DatePicker({ value, onChange, label, minDate, maxDate, required }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const now = new Date();
  const initDate = value ? new Date(value + 'T12:00:00') : now;

  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const selectedYear = value ? parseInt(value.split('-')[0]) : null;
  const selectedMonth = value ? parseInt(value.split('-')[1]) - 1 : null;
  const selectedDay = value ? parseInt(value.split('-')[2]) : null;

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleSelect = (day: number) => {
    const yyyy = viewYear;
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const newVal = `${yyyy}-${mm}-${dd}`;
    
    if (minDate && newVal < minDate) return;
    if (maxDate && newVal > maxDate) return;
    
    onChange(newVal);
    setOpen(false);
  };

  const navPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const navNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const displayLabel = value 
    ? `${value.split('-')[2]}/${value.split('-')[1]}/${value.split('-')[0]}`
    : 'Selecionar data';

  return (
    <div className="space-y-1.5 relative" ref={ref}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border text-sm
          transition-all duration-200 text-left
          ${open
            ? 'border-primary ring-2 ring-primary/20 bg-background text-foreground'
            : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/30'
          }
        `}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {displayLabel}
        </span>
        <CalendarDays className={`w-4 h-4 flex-shrink-0 transition-colors ${open ? 'text-primary' : 'text-primary/60'}`} />
      </button>

      {/* Dropdown picker */}
      {open && (
        <div className="
          absolute z-50 mt-1 p-4 rounded-xl border border-primary/20
          bg-card shadow-2xl shadow-black/40
          animate-in fade-in-0 zoom-in-95 duration-150
        " style={{ minWidth: 280 }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={navPrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-sm font-bold text-foreground tracking-wide capitalize">
              {MONTHS[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={navNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-muted-foreground uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {blanks.map(b => (
              <div key={`blank-${b}`} />
            ))}
            {days.map(d => {
              const strDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isSelected = selectedYear === viewYear && selectedMonth === viewMonth && selectedDay === d;
              const isToday = now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === d;
              
              let isDisabled = false;
              if (minDate && strDate < minDate) isDisabled = true;
              if (maxDate && strDate > maxDate) isDisabled = true;

              return (
                <button
                  key={d}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(d)}
                  className={`
                    relative h-8 rounded-md text-xs font-medium transition-all duration-150 flex items-center justify-center
                    ${isSelected
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-105 z-10'
                      : isDisabled
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : isToday
                          ? 'text-primary border border-primary/30 bg-primary/5 hover:bg-primary/15'
                          : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    }
                  `}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Botão "Hoje" */}
          <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const y = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                setViewYear(y);
                setViewMonth(now.getMonth());
                onChange(`${y}-${mm}-${dd}`);
                setOpen(false);
              }}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
