import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MIN_MONTH } from '@/contexts/MonthContext';

interface MonthYearPickerProps {
  value: string; // format: 'YYYY-MM'
  onChange: (value: string) => void;
  label?: string;
  minMonth?: string;
  maxMonth?: string;
}

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

function getYearOptions(minMonth: string): number[] {
  const minYear = parseInt(minMonth.split('-')[0]);
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = minYear; y <= currentYear + 3; y++) {
    years.push(y);
  }
  return years;
}

export function MonthYearPicker({ value, onChange, minMonth = MIN_MONTH, maxMonth }: MonthYearPickerProps) {
  const [yearStr, monthStr] = value ? value.split('-') : ['2026', '09'];

  const handleMonthChange = (m: string) => {
    const newValue = `${yearStr}-${m}`;
    if (newValue >= minMonth && (!maxMonth || newValue <= maxMonth)) {
      onChange(newValue);
    } else if (newValue < minMonth) {
      onChange(minMonth);
    }
  };

  const handleYearChange = (y: string) => {
    const newValue = `${y}-${monthStr}`;
    if (newValue >= minMonth && (!maxMonth || newValue <= maxMonth)) {
      onChange(newValue);
    } else if (newValue < minMonth) {
      onChange(minMonth);
    }
  };

  const years = getYearOptions(minMonth);

  return (
    <div className="flex gap-2">
      <Select value={monthStr} onValueChange={handleMonthChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map(m => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={yearStr} onValueChange={handleYearChange}>
        <SelectTrigger className="w-28">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function monthIdToLabel(monthId: string): string {
  const [year, month] = monthId.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
