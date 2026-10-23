// ============================================================
// CategoryFormFields — Campos compartilhados do form de Categoria PF
// Paleta de cores curada + galeria de ícones Lucide
// ============================================================
import {
  ShoppingCart, Utensils, Car, Home, HeartPulse, Dumbbell, Plane,
  GraduationCap, Shirt, Smartphone, Coffee, Music, BookOpen, Dog,
  Baby, Gift, Wrench, Briefcase, PiggyBank, CreditCard, Landmark,
  ShieldCheck, Zap, Wifi, Tv, Gamepad2, Camera, Scissors, Bike,
  Bus, Fuel, Wallet, TrendingDown, Tag, Star, Circle,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ── Paleta curada: 12 cores harmoniosas ─────────────────────
export const CAT_COLORS = [
  { hex: '#10b981', label: 'Verde'      },
  { hex: '#3b82f6', label: 'Azul'       },
  { hex: '#8b5cf6', label: 'Roxo'       },
  { hex: '#f59e0b', label: 'Âmbar'      },
  { hex: '#ef4444', label: 'Vermelho'   },
  { hex: '#ec4899', label: 'Rosa'       },
  { hex: '#06b6d4', label: 'Ciano'      },
  { hex: '#f97316', label: 'Laranja'    },
  { hex: '#84cc16', label: 'Lima'       },
  { hex: '#64748b', label: 'Cinza'      },
  { hex: '#a16207', label: 'Dourado'    },
  { hex: '#0ea5e9', label: 'Céu'        },
];

// ── Galeria de ícones Lucide curados por categoria ──────────
export const CAT_ICONS: { icon: React.ElementType; label: string }[] = [
  { icon: Tag,          label: 'Tag'         },
  { icon: ShoppingCart, label: 'Compras'     },
  { icon: Utensils,     label: 'Alimentação' },
  { icon: Coffee,       label: 'Café'        },
  { icon: Car,          label: 'Carro'       },
  { icon: Fuel,         label: 'Combustível' },
  { icon: Bus,          label: 'Transporte'  },
  { icon: Bike,         label: 'Bicicleta'   },
  { icon: Plane,        label: 'Viagem'      },
  { icon: Home,         label: 'Moradia'     },
  { icon: Zap,          label: 'Energia'     },
  { icon: Wifi,         label: 'Internet'    },
  { icon: Tv,           label: 'Streaming'   },
  { icon: Smartphone,   label: 'Telefone'    },
  { icon: HeartPulse,   label: 'Saúde'       },
  { icon: Dumbbell,     label: 'Academia'    },
  { icon: GraduationCap,label: 'Educação'    },
  { icon: BookOpen,     label: 'Leitura'     },
  { icon: Music,        label: 'Música'      },
  { icon: Camera,       label: 'Foto/Vídeo'  },
  { icon: Gamepad2,     label: 'Jogos'       },
  { icon: Shirt,        label: 'Roupa'       },
  { icon: Scissors,     label: 'Estética'    },
  { icon: Dog,          label: 'Pet'         },
  { icon: Baby,         label: 'Filho'       },
  { icon: Gift,         label: 'Presente'    },
  { icon: Wrench,       label: 'Manutenção'  },
  { icon: Briefcase,    label: 'Trabalho'    },
  { icon: PiggyBank,    label: 'Poupança'    },
  { icon: CreditCard,   label: 'Cartão'      },
  { icon: Landmark,     label: 'Banco'       },
  { icon: Wallet,       label: 'Carteira'    },
  { icon: ShieldCheck,  label: 'Seguro'      },
  { icon: TrendingDown, label: 'Despesa'     },
  { icon: Star,         label: 'Favorito'    },
  { icon: Circle,       label: 'Outros'      },
];

// Mapa nome→componente para persistência (salvo como string no BD)
export const ICON_NAME_MAP: Record<string, React.ElementType> = Object.fromEntries(
  CAT_ICONS.map(({ icon, label }) => [label, icon])
);

// ── Componente ───────────────────────────────────────────────
interface Props {
  name: string;
  icon: string;
  color: string;
  onName:  (v: string) => void;
  onIcon:  (v: string) => void;
  onColor: (v: string) => void;
  autoFocus?: boolean;
}

export function CategoryFormFields({ name, icon, color, onName, onIcon, onColor, autoFocus }: Props) {
  // Resolve o componente do ícone selecionado
  const SelectedIcon = ICON_NAME_MAP[icon];

  return (
    <div className="space-y-4 py-2">
      {/* Nome */}
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input
          value={name}
          onChange={e => onName(e.target.value)}
          placeholder="Ex: Alimentação, Lazer..."
          autoFocus={autoFocus}
        />
      </div>

      {/* Ícone — galeria Lucide */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">
          Ícone
          {SelectedIcon && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-normal">
              — <SelectedIcon className="w-3.5 h-3.5" style={{ color }} /> {icon}
            </span>
          )}
        </Label>
        <div className="grid grid-cols-9 gap-1 p-2 rounded-lg border border-border bg-muted/30 max-h-[140px] overflow-y-auto custom-scrollbar">
          {CAT_ICONS.map(({ icon: IconComp, label }) => (
            <button
              key={label}
              type="button"
              title={label}
              onClick={() => onIcon(label)}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md transition-all",
                icon === label
                  ? "ring-2 ring-offset-1 ring-offset-background"
                  : "hover:bg-muted"
              )}
              style={icon === label ? { outline: `2px solid ${color}`, outlineOffset: '1px', backgroundColor: `${color}22` } : {}}
            >
              <IconComp
                className="w-4 h-4"
                style={{ color: icon === label ? color : undefined }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Cor — paleta curada */}
      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {CAT_COLORS.map(({ hex, label }) => (
            <button
              key={hex}
              type="button"
              title={label}
              onClick={() => onColor(hex)}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all",
                color === hex
                  ? "border-white scale-110 shadow-lg"
                  : "border-transparent hover:scale-105 hover:border-white/40"
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
