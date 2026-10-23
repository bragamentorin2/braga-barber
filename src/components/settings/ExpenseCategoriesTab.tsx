import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tag, Plus, Trash2, Pencil } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Aluguel & Ponto Comercial',
  'Energia Elétrica (Luz)',
  'Água & Saneamento',
  'Insumos & Descartáveis',
  'Produtos & Cosméticos (Uso Interno)',
  'Manutenção de Equipamentos',
  'Taxas de Cartão & Maquininha',
  'DAS / MEI / Impostos',
  'Marketing & Divulgação',
  'Pró-Labore / Retirada',
];

interface ExpenseCategory {
  id: string;
  name: string;
  observation?: string;
  isSystem?: boolean;
}

const getStorageKey = (userId?: string) => `braga_mentoring_expense_categories_${userId || 'demo'}`;

export function ExpenseCategoriesTab() {
  const { user } = useAuth();
  const { reload } = useFinance();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryObs, setNewCategoryObs] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<ExpenseCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editObs, setEditObs] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Prevent double-seeding in React StrictMode
  const seedingRef = useRef(false);

  const loadCategories = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      const storageKey = getStorageKey(user.id);
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          setCategories(JSON.parse(raw));
          setLoading(false);
          return;
        } catch (e) {
          console.error('Erro ao ler categorias locais:', e);
        }
      }

      // Seed padrão local
      const initial: ExpenseCategory[] = DEFAULT_CATEGORIES.map((name, idx) => ({
        id: `cat-default-${idx}`,
        name,
      }));
      setCategories(initial);
      localStorage.setItem(storageKey, JSON.stringify(initial));
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    const rows = data || [];

    if (rows.length === 0 && !seedingRef.current) {
      seedingRef.current = true;
      const inserts = DEFAULT_CATEGORIES.map(name => ({ user_id: user.id, name }));
      const { data: inserted } = await supabase
        .from('expense_categories')
        .upsert(inserts, { onConflict: 'user_id,name', ignoreDuplicates: true })
        .select();
      setCategories((inserted || []).map(c => ({ id: c.id, name: c.name, observation: c.observation || undefined })));
    } else {
      const seen = new Set<string>();
      const unique = rows.filter(c => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      });
      setCategories(unique.map(c => ({ id: c.id, name: c.name, observation: c.observation || undefined, isSystem: c.is_system || false })));
    }
    setLoading(false);
  };

  useEffect(() => { loadCategories(); }, [user]);

  const saveLocalCategories = (updated: ExpenseCategory[]) => {
    if (!user) return;
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(updated));
  };

  const handleAdd = async () => {
    if (!newCategoryName.trim() || !user) { toast.error('Informe o nome da categoria.'); return; }
    setSaving(true);

    if (!isSupabaseConfigured) {
      const newCat: ExpenseCategory = {
        id: `cat-${Date.now()}`,
        name: newCategoryName.trim(),
        observation: newCategoryObs.trim() || undefined,
      };
      const updated = [...categories, newCat].sort((a, b) => a.name.localeCompare(b.name));
      setCategories(updated);
      saveLocalCategories(updated);
      toast.success('Categoria criada com sucesso!');
      setNewCategoryName('');
      setNewCategoryObs('');
      setCreateOpen(false);
      setSaving(false);
      reload();
      return;
    }

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ user_id: user.id, name: newCategoryName.trim(), observation: newCategoryObs.trim() || null })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar categoria.');
    } else {
      setCategories(prev => [...prev, { id: data.id, name: data.name, observation: data.observation || undefined }].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Categoria criada com sucesso!');
      setNewCategoryName('');
      setNewCategoryObs('');
      setCreateOpen(false);
      reload();
    }
    setSaving(false);
  };

  const openEdit = (cat: ExpenseCategory) => {
    setEditTarget(cat);
    setEditName(cat.name);
    setEditObs(cat.observation || '');
  };

  const handleEdit = async () => {
    if (!editName.trim() || !editTarget || !user) { toast.error('Informe o nome.'); return; }
    setEditSaving(true);

    if (!isSupabaseConfigured) {
      const updated = categories.map(c => 
        c.id === editTarget.id 
          ? { ...c, name: editName.trim(), observation: editObs.trim() || undefined } 
          : c
      ).sort((a, b) => a.name.localeCompare(b.name));
      setCategories(updated);
      saveLocalCategories(updated);
      toast.success('Categoria atualizada!');
      setEditTarget(null);
      setEditSaving(false);
      reload();
      return;
    }

    const { error } = await supabase
      .from('expense_categories')
      .update({ name: editName.trim(), observation: editObs.trim() || null })
      .eq('id', editTarget.id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Erro ao editar categoria.');
    } else {
      setCategories(prev =>
        prev.map(c => c.id === editTarget.id ? { ...c, name: editName.trim(), observation: editObs.trim() || undefined } : c)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success('Categoria atualizada!');
      setEditTarget(null);
      reload();
    }
    setEditSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Excluir a categoria "${name}"? Despesas existentes não serão afetadas.`)) return;

    if (!isSupabaseConfigured) {
      const updated = categories.filter(c => c.id !== id);
      setCategories(updated);
      saveLocalCategories(updated);
      toast.success('Categoria excluída.');
      reload();
      return;
    }

    const { error } = await supabase.from('expense_categories').delete().eq('id', id).eq('user_id', user!.id);
    if (error) {
      toast.error('Erro ao excluir categoria.');
    } else {
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Categoria excluída.');
      reload();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">{categories.length} categoria{categories.length !== 1 ? 's' : ''} cadastrada{categories.length !== 1 ? 's' : ''}</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Categoria
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma categoria cadastrada.</p>
          ) : (
            <div className="divide-y divide-border">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between py-3 px-1 hover:bg-muted/20 rounded-sm transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-primary/5 flex items-center justify-center">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{cat.name}</span>
                        {cat.isSystem && (
                          <span className="hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Sistema</span>
                        )}
                      </div>
                      {cat.observation && <span className="hidden sm:block text-xs text-muted-foreground">{cat.observation}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!cat.isSystem && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => openEdit(cat)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(cat.id, cat.name)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {cat.isSystem && (
                      <span className="text-xs text-muted-foreground px-2 py-1">Protegida</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog — Nova Categoria */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Categoria de Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="cat-name">Nome da Categoria</Label>
              <Input
                id="cat-name"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Ex: Almoço, Software..."
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="cat-obs">Observação Padrão (Opcional)</Label>
              <Input
                id="cat-obs"
                value={newCategoryObs}
                onChange={e => setNewCategoryObs(e.target.value)}
                placeholder="Ex: Retenção Faturamento"
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? 'Salvando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Editar Categoria */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="edit-cat-name">Nome da Categoria</Label>
              <Input
                id="edit-cat-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEdit(); }}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="edit-cat-obs">Observação Padrão (Opcional)</Label>
              <Input
                id="edit-cat-obs"
                value={editObs}
                onChange={e => setEditObs(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEdit(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
