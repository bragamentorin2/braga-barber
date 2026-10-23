import { createContext, useContext, useState, type ReactNode } from 'react';

const MIN_MONTH = '2026-09';

interface MonthContextType {
  selectedMonthId: string;
  setSelectedMonthId: (id: string) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  monthLabel: string;
  isAtMinMonth: boolean;
}

function getMonthLabel(monthId: string): string {
  const [year, month] = monthId.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function navigateMonth(monthId: string, delta: number): string {
  const [year, month] = monthId.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const MonthContext = createContext<MonthContextType | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const currentId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // Start at current month, but never before MIN_MONTH
  const initial = currentId >= MIN_MONTH ? currentId : MIN_MONTH;
  const [selectedMonthId, setSelectedMonthId] = useState(initial);

  const goToPrevMonth = () =>
    setSelectedMonthId(prev => {
      const next = navigateMonth(prev, -1);
      return next >= MIN_MONTH ? next : prev; // block going before MIN_MONTH
    });

  const goToNextMonth = () =>
    setSelectedMonthId(prev => navigateMonth(prev, 1));

  const safeSet = (id: string) => {
    if (id >= MIN_MONTH) setSelectedMonthId(id);
  };

  return (
    <MonthContext.Provider value={{
      selectedMonthId,
      setSelectedMonthId: safeSet,
      goToPrevMonth,
      goToNextMonth,
      monthLabel: getMonthLabel(selectedMonthId),
      isAtMinMonth: selectedMonthId === MIN_MONTH,
    }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth(): MonthContextType {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonth must be used within MonthProvider');
  return ctx;
}

export { MIN_MONTH, navigateMonth, getMonthLabel as getMonthLabelFromId };

