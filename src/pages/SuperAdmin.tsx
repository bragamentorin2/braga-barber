import React, { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured, createIsolatedClient } from '@/lib/supabase';
import type { BusinessSegment, Establishment, LicenseStatus } from '@/types/businessProfile';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Scissors,
  Sparkles,
  Plus,
  Search,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  MessageSquare,
  KeyRound,
  Copy,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Store,
  User,
  Mail,
  Phone,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  Check,
  AlertCircle,
  Settings,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  actor_email: string;
  action: string;
  establishment_name: string | null;
  details: any;
  created_at: string;
}

export function SuperAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const { user } = useAuth();
  const {
    establishments,
    addEstablishment,
    updateEstablishment,
    toggleLicenseStatus,
    deleteEstablishment,
    isSuperAdmin,
  } = useBusinessProfile();

  // Histórico de auditoria
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin || !isSupabaseConfigured) return;

    async function fetchAuditLogs() {
      setLoadingAudit(true);
      try {
        const { data, error } = await supabase.rpc('rpc_admin_get_audit_logs', { p_limit: 100 });
        if (!error && Array.isArray(data)) {
          setAuditLogs(data);
          return;
        }
        const { data: tableData } = await supabase
          .from('admin_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (tableData) setAuditLogs(tableData);
      } catch {
        // Resiliente
      } finally {
        setLoadingAudit(false);
      }
    }

    fetchAuditLogs();
  }, [isSuperAdmin]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegment, setFilterSegment] = useState<'all' | BusinessSegment>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | LicenseStatus>('all');

  // Modal Enxuto de Cliente
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEstablishment, setEditingEstablishment] = useState<Establishment | null>(null);
  const [formName, setFormName] = useState('');
  const [formSegment, setFormSegment] = useState<BusinessSegment>('barbershop');
  const [formOwner, setFormOwner] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<LicenseStatus>('active');
  const [formTempPassword, setFormTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [resettingPasswordInEdit, setResettingPasswordInEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal de Personalização de Mensagem do WhatsApp
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const DEFAULT_WA_TEMPLATE = `Olá {nome}! {icone_segmento}✨

Seu acesso à plataforma de Gestão Financeira da *Braga Mentoring* está liberado!

🔗 *Link de Acesso:* {link}
📧 *Seu E-mail de Login:* {email}{bloco_senha}

Qualquer dúvida estou à disposição para apoiar a gestão {artigo_segmento}!`;

  const [customWaTemplate, setCustomWaTemplate] = useState<string>(() => {
    return localStorage.getItem('braga_custom_wa_template') || DEFAULT_WA_TEMPLATE;
  });

  // Modal de Credenciais Prontas (Pós-Cadastro / Envio de Acesso)
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    ownerName: string;
    email: string;
    tempPassword: string;
    phone?: string;
    segment?: BusinessSegment;
  } | null>(null);

  // Gerador de senha temporária intuitiva e segura
  const generateTemporaryPassword = (segment: BusinessSegment = 'barbershop') => {
    const prefix = segment === 'barbershop' ? 'Barber' : 'Salao';
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}@${randomDigits}`;
  };

  // Formatador inteligente de mensagens do WhatsApp
  const formatWhatsappMessage = (est: Establishment, tempPassword?: string) => {
    const loginUrl = `${window.location.origin}/login`;
    const isBarber = est.segment === 'barbershop';
    const iconeSegmento = isBarber ? '💈' : '💇‍♀️✨';
    const segmentName = isBarber ? 'barbearia' : 'salão de beleza';
    const artigoSegmento = isBarber ? 'da sua barbearia' : 'do seu salão de beleza';
    const activePassword = tempPassword || est.temporaryPassword;

    let template = customWaTemplate.trim() || DEFAULT_WA_TEMPLATE;

    let passwordBlock = '';
    if (activePassword) {
      passwordBlock = `\n🔑 *Sua Senha Provisória:* ${activePassword}\n⚠️ *Primeiro Acesso:* No seu primeiro login, você será orientado a criar sua senha definitiva.\n`;
    } else if (est.passwordStatus === 'changed') {
      passwordBlock = `\n🔑 *Senha:* Utilize a sua senha pessoal definitiva já cadastrada na plataforma.\n`;
    }

    return template
      .replace(/{nome}/g, est.ownerName)
      .replace(/{estabelecimento}/g, est.name)
      .replace(/{email}/g, est.email)
      .replace(/{senha}/g, activePassword || 'Sua senha pessoal')
      .replace(/{bloco_senha}/g, passwordBlock)
      .replace(/{link}/g, loginUrl)
      .replace(/{icone_segmento}/g, iconeSegmento)
      .replace(/{segmento}/g, segmentName)
      .replace(/{artigo_segmento}/g, artigoSegmento);
  };

  // Métricas Práticas para o Consultor
  const metrics = useMemo(() => {
    const total = establishments.length;
    const barbers = establishments.filter(e => e.segment === 'barbershop').length;
    const salons = establishments.filter(e => e.segment === 'beauty_salon').length;
    const active = establishments.filter(e => e.status === 'active').length;
    const suspended = establishments.filter(e => e.status === 'suspended' || (e.status as any) === 'inactive').length;
    return { total, barbers, salons, active, suspended };
  }, [establishments]);

  // Lista Filtrada
  const filteredEstablishments = useMemo(() => {
    return establishments.filter(est => {
      const matchSearch =
        est.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (est.phone && est.phone.includes(searchTerm));
      const matchSegment = filterSegment === 'all' || est.segment === filterSegment;
      const matchStatus = filterStatus === 'all' || est.status === filterStatus;
      return matchSearch && matchSegment && matchStatus;
    });
  }, [establishments, searchTerm, filterSegment, filterStatus]);

  const openNewModal = () => {
    setEditingId(null);
    setEditingEstablishment(null);
    setResettingPasswordInEdit(false);
    setFormName('');
    setFormSegment('barbershop');
    setFormOwner('');
    setFormEmail('');
    setFormPhone('');
    setFormStatus('active');
    setFormTempPassword(generateTemporaryPassword('barbershop'));
    setShowTempPassword(false);
    setRequirePasswordChange(true);
    setModalOpen(true);
  };

  const openEditModal = (est: Establishment) => {
    setEditingId(est.id);
    setEditingEstablishment(est);
    setResettingPasswordInEdit(false);
    setFormName(est.name);
    setFormSegment(est.segment);
    setFormOwner(est.ownerName);
    setFormEmail(est.email);
    setFormPhone(est.phone || '');
    setFormStatus(est.status);
    setFormTempPassword(est.temporaryPassword || '');
    setShowTempPassword(false);
    setRequirePasswordChange(false);
    setModalOpen(true);
  };

  const handleSaveEstablishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formOwner.trim() || !formEmail.trim()) {
      toast.error('Preencha os campos obrigatórios (Nome, Responsável e E-mail de Acesso).');
      return;
    }

    if (!editingId && formTempPassword && formTempPassword.length < 6) {
      toast.error('A senha temporária deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanEmail = formEmail.trim().toLowerCase();

      if (editingId) {
        const isPasswordResetting = resettingPasswordInEdit && formTempPassword.trim().length >= 6;
        
        await updateEstablishment(editingId, {
          name: formName.trim(),
          segment: formSegment,
          ownerName: formOwner.trim(),
          email: cleanEmail,
          phone: formPhone.trim(),
          status: formStatus,
          ...(isPasswordResetting ? { temporaryPassword: formTempPassword, passwordStatus: 'temporary', mustChangePassword: true } : {}),
        });

        // Se uma nova senha provisória foi digitada na edição, atualiza via RPC
        if (isSupabaseConfigured && isPasswordResetting) {
          try {
            await supabase.rpc('rpc_admin_set_client_credentials', {
              p_establishment_id: editingId,
              p_email: cleanEmail,
              p_password: formTempPassword,
              p_owner_name: formOwner.trim(),
            });
          } catch (err) {
            console.warn('Nota ao atualizar senha via RPC na edição:', err);
          }
        }

        toast.success(`Cliente "${formName}" atualizado com sucesso!`);
        setModalOpen(false);
      } else {
        const newEst = await addEstablishment({
          name: formName.trim(),
          segment: formSegment,
          ownerName: formOwner.trim(),
          email: cleanEmail,
          phone: formPhone.trim(),
          status: formStatus,
          plan: 'mentorship_vip',
          temporaryPassword: formTempPassword,
          mustChangePassword: requirePasswordChange,
          passwordStatus: 'temporary',
        });

        // Seta credenciais no Supabase Auth e confirma e-mail via RPC segura com pgcrypto
        if (isSupabaseConfigured && formTempPassword) {
          try {
            await supabase.rpc('rpc_admin_set_client_credentials', {
              p_establishment_id: newEst.id,
              p_email: cleanEmail,
              p_password: formTempPassword,
              p_owner_name: formOwner.trim(),
            });
          } catch (err) {
            console.warn('Nota ao provisionar credenciais via RPC:', err);
          }
        }

        toast.success(`Cliente "${formName}" cadastrado com sucesso!`);
        setModalOpen(false);

        // Abre o modal com os dados de acesso prontos para o consultor
        setCreatedCredentials({
          name: formName.trim(),
          ownerName: formOwner.trim(),
          email: cleanEmail,
          tempPassword: formTempPassword,
          phone: formPhone.trim(),
          segment: formSegment,
        });
        setCredentialsModalOpen(true);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCredentials = (creds: { ownerName: string; email: string; tempPassword?: string; name: string; segment?: BusinessSegment }) => {
    const estMock: Establishment = {
      id: '',
      name: creds.name,
      ownerName: creds.ownerName,
      email: creds.email,
      segment: creds.segment || 'barbershop',
      status: 'active',
      plan: 'mentorship_vip',
      createdAt: '',
      temporaryPassword: creds.tempPassword,
    };
    const text = formatWhatsappMessage(estMock, creds.tempPassword);
    navigator.clipboard.writeText(text);
    toast.success('Dados de acesso copiados com sucesso! Cole no WhatsApp do cliente.');
  };

  const handleSendCredentialsWhatsapp = (creds: { ownerName: string; email: string; tempPassword?: string; phone?: string; name: string; segment?: BusinessSegment }) => {
    const estMock: Establishment = {
      id: '',
      name: creds.name,
      ownerName: creds.ownerName,
      email: creds.email,
      phone: creds.phone,
      segment: creds.segment || 'barbershop',
      status: 'active',
      plan: 'mentorship_vip',
      createdAt: '',
      temporaryPassword: creds.tempPassword,
    };
    const message = formatWhatsappMessage(estMock, creds.tempPassword);

    if (creds.phone) {
      const cleanPhone = creds.phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      navigator.clipboard.writeText(message);
      toast.info('Cliente sem telefone cadastrado. Mensagem copiada para a área de transferência!');
    }
  };

  // Alterna status de acesso rápido com 1 clique
  const handleToggleStatus = async (est: Establishment) => {
    const isCurrentlyActive = est.status === 'active';
    const newStatus: LicenseStatus = isCurrentlyActive ? 'suspended' : 'active';
    await toggleLicenseStatus(est.id, newStatus);

    if (newStatus === 'active') {
      toast.success(`Acesso do cliente "${est.name}" foi LIBERADO!`);
    } else {
      toast.warning(`Acesso do cliente "${est.name}" foi BLOQUEADO/SUSPENSO.`);
    }
  };

  // Gera uma nova senha temporária para o cliente existente e abre o modal para envio no WhatsApp
  const handleOpenPasswordReset = async (est: Establishment) => {
    const newTemp = generateTemporaryPassword(est.segment);

    if (isSupabaseConfigured) {
      try {
        await supabase.rpc('rpc_admin_set_client_credentials', {
          p_establishment_id: est.id,
          p_email: est.email,
          p_password: newTemp,
          p_owner_name: est.ownerName,
        });
      } catch (err) {
        console.warn('Erro ao atualizar credenciais via RPC:', err);
      }
    }

    // Atualiza o estado local
    await updateEstablishment(est.id, {
      temporaryPassword: newTemp,
      passwordStatus: 'temporary',
      mustChangePassword: true,
    });

    setCreatedCredentials({
      name: est.name,
      ownerName: est.ownerName,
      email: est.email,
      tempPassword: newTemp,
      phone: est.phone,
    });
    setCredentialsModalOpen(true);
  };

  // Enviar link de redefinição de senha para o cliente via Supabase nativo
  const handleSendPasswordReset = async (est: Establishment) => {
    if (!isSupabaseConfigured) {
      toast.info(`Modo de desenvolvimento: link de senha gerado para ${est.email}`);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(est.email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      toast.success(`E-mail de definição de senha enviado para ${est.email}!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar e-mail de redefinição.');
    }
  };

  // Copia mensagem de boas-vindas formatada para o WhatsApp
  const handleCopyWhatsappMessage = (est: Establishment) => {
    const text = formatWhatsappMessage(est);
    navigator.clipboard.writeText(text);
    toast.success('Mensagem de acesso copiada para a área de transferência! Cole no WhatsApp do cliente.');
  };

  // Gerar link direto para o WhatsApp do cliente
  const getWhatsappUrl = (phone?: string, name?: string, segment?: BusinessSegment) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const artigo = segment === 'beauty_salon' ? 'do seu salão de beleza' : 'da sua barbearia';
    const text = encodeURIComponent(`Olá ${name || ''}! Aqui é o Jefferson Braga da Braga Mentoring. Como estão os números da gestão financeira ${artigo} nesta semana?`);
    return `https://wa.me/${fullPhone}?text=${text}`;
  };

  return (
    <AppLayout
      title="Painel do Consultor"
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={openNewModal}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ABAS DO PAINEL ENXUTO */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchParams({ tab: 'dashboard' })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-primary/10 text-primary border border-primary/30 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'clients' })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                currentTab === 'clients'
                  ? 'bg-primary/10 text-primary border border-primary/30 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Clientes & Acessos
              <Badge variant="secondary" className="px-1.5 py-0.2 text-xs">
                {metrics.total}
              </Badge>
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'history' })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'history'
                  ? 'bg-primary/10 text-primary border border-primary/30 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Histórico
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/30 px-3 py-1.5 rounded-lg border border-border">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Super-Admin: {user?.email || 'braga.mentoring@gmail.com'}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: VISÃO GERAL (DASHBOARD ENXUTO DO CONSULTOR) */}
        {/* ========================================================================= */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            {/* CARDS DE MÉTRICAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-card/60 border-border">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">Total Mentorados</CardDescription>
                  <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-between">
                    {metrics.total}
                    <Users className="w-5 h-5 text-primary opacity-80" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Clientes na consultoria
                </CardContent>
              </Card>

              <Card className="bg-card/60 border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-emerald-400">Acessos Liberados</CardDescription>
                  <CardTitle className="text-2xl font-bold text-emerald-400 flex items-center justify-between">
                    {metrics.active}
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Usando a plataforma ativamente
                </CardContent>
              </Card>

              <Card className="bg-card/60 border-rose-500/20 bg-rose-500/5">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-rose-400">Acessos Bloqueados</CardDescription>
                  <CardTitle className="text-2xl font-bold text-rose-400 flex items-center justify-between">
                    {metrics.suspended}
                    <XCircle className="w-5 h-5 text-rose-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Pausados ou aguardando
                </CardContent>
              </Card>

              <Card className="bg-card/60 border-border">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">Barbearias</CardDescription>
                  <CardTitle className="text-2xl font-bold text-amber-400 flex items-center justify-between">
                    {metrics.barbers}
                    <Scissors className="w-5 h-5 text-amber-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Foco em cortes e barbas
                </CardContent>
              </Card>

              <Card className="bg-card/60 border-border">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-muted-foreground">Salões de Beleza</CardDescription>
                  <CardTitle className="text-2xl font-bold text-purple-400 flex items-center justify-between">
                    {metrics.salons}
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Foco em estética e cabelos
                </CardContent>
              </Card>
            </div>

            {/* ATALHO RÁPIDO PARA GESTÃO */}
            <Card className="border-border bg-gradient-to-br from-card/80 to-card/40">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  Acesso Rápido aos Clientes
                </CardTitle>
                <CardDescription>
                  Controle a liberação de acesso imediato dos barbeiros e salões na plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-background/60 border border-border">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Deseja cadastrar e liberar acesso a um novo cliente?</p>
                    <p className="text-xs text-muted-foreground">Informe o nome da barbearia ou salão, o e-mail do dono e defina o status como liberado.</p>
                  </div>
                  <Button onClick={openNewModal} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4" /> Cadastrar Cliente Agora
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: CLIENTES & ACESSOS (TABELA PRINCIPAL DE GESTÃO) */}
        {/* ========================================================================= */}
        {currentTab === 'clients' && (
          <div className="space-y-4">
            {/* FILTROS E BUSCA */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por barbearia, dono, e-mail ou WhatsApp..."
                  className="pl-9 bg-card border-border"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={filterSegment} onValueChange={(val: any) => setFilterSegment(val)}>
                  <SelectTrigger className="w-[140px] bg-card border-border">
                    <SelectValue placeholder="Segmento" />
                  </SelectTrigger>
                  <SelectContent className="scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                    <SelectItem value="all">Todos Segmentos</SelectItem>
                    <SelectItem value="barbershop">Barbearias</SelectItem>
                    <SelectItem value="beauty_salon">Salões de Beleza</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                  <SelectTrigger className="w-[140px] bg-card border-border">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="active">Liberados</SelectItem>
                    <SelectItem value="suspended">Bloqueados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* TABELA DE CLIENTES */}
            <Card className="border-border bg-card/60 overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="font-semibold text-foreground">Estabelecimento</TableHead>
                      <TableHead className="font-semibold text-foreground">Responsável</TableHead>
                      <TableHead className="font-semibold text-foreground">E-mail de Acesso</TableHead>
                      <TableHead className="font-semibold text-foreground text-center">Status do Acesso</TableHead>
                      <TableHead className="font-semibold text-foreground text-right pr-6">Ações Rápidas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEstablishments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          Nenhum cliente encontrado com os filtros aplicados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEstablishments.map((est) => {
                        const isActive = est.status === 'active';
                        const waUrl = getWhatsappUrl(est.phone, est.ownerName);

                        return (
                          <TableRow key={est.id} className="border-border hover:bg-muted/30 transition-colors">
                            {/* Nome + Segmento */}
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  est.segment === 'barbershop'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                }`}>
                                  {est.segment === 'barbershop' ? <Scissors className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground">{est.name}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border">
                                      {est.segment === 'barbershop' ? 'Barbearia' : 'Salão de Beleza'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Responsável + Telefone */}
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="text-sm font-semibold text-foreground">{est.ownerName}</div>
                                {est.phone && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    {waUrl ? (
                                      <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                                        title="Abrir conversa no WhatsApp"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        {est.phone}
                                      </a>
                                    ) : (
                                      <span>{est.phone}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* E-mail de Acesso */}
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                                <span className="text-foreground">{est.email}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(est.email);
                                    toast.success('E-mail copiado!');
                                  }}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Copiar e-mail"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </TableCell>

                            {/* Status de Acesso com 1 clique */}
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant={isActive ? 'default' : 'destructive'}
                                onClick={() => handleToggleStatus(est)}
                                className={`text-xs font-semibold rounded-full px-3 h-7 gap-1.5 ${
                                  isActive
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                                }`}
                                title={isActive ? 'Clique para Bloquear acesso' : 'Clique para Liberar acesso'}
                              >
                                {isActive ? (
                                  <>
                                    <Unlock className="w-3 h-3" /> Liberado
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" /> Bloqueado
                                  </>
                                )}
                              </Button>
                            </TableCell>

                            {/* Ações Rápidas */}
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Copiar mensagem formatada para WhatsApp */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopyWhatsappMessage(est)}
                                  className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  title="Copiar mensagem de liberação de acesso para o WhatsApp"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>

                                {/* Gerar nova senha temporária e enviar no WhatsApp */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenPasswordReset(est)}
                                  className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                  title="Gerar nova senha temporária e enviar no WhatsApp do cliente"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </Button>

                                {/* Editar */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditModal(est)}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Editar dados do cliente"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>

                                {/* Excluir */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    if (confirm(`Excluir permanentemente o cliente "${est.name}"?`)) {
                                      await deleteEstablishment(est.id);
                                      toast.success('Cliente removido.');
                                    }
                                  }}
                                  className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                  title="Excluir cliente"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 3: HISTÓRICO DE AUDITORIA */}
        {/* ========================================================================= */}
        {currentTab === 'history' && (
          <div className="space-y-4">
            <Card className="border-border bg-card/60">
              <CardHeader>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Registro de Ações do Super-Admin
                </CardTitle>
                <CardDescription>
                  Histórico de liberações, bloqueios e alterações realizadas na plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAudit ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Carregando histórico...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma ação registrada no histórico até o momento.</div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="font-semibold text-foreground">Data/Hora</TableHead>
                          <TableHead className="font-semibold text-foreground">Ação</TableHead>
                          <TableHead className="font-semibold text-foreground">Estabelecimento</TableHead>
                          <TableHead className="font-semibold text-foreground">Executor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id} className="border-border text-xs">
                            <TableCell className="font-mono text-muted-foreground">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[11px] font-mono border-border">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {log.establishment_name || '—'}
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">
                              {log.actor_email || 'Super-Admin'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL PREMIUM: NOVO OU EDITAR CLIENTE */}
        {/* ========================================================================= */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[88vh] flex flex-col p-0 overflow-hidden bg-[#080E16]/95 border border-white/10 text-foreground shadow-2xl shadow-black/95 rounded-2xl">
            <form onSubmit={handleSaveEstablishment} className="flex flex-col h-full max-h-[88vh] overflow-hidden">
              {/* CABEÇALHO FIXO */}
              <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20 shrink-0">
                    {editingId ? <Pencil className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground">
                      {editingId ? 'Editar Cliente da Consultoria' : 'Cadastrar Novo Cliente'}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {editingId
                        ? 'Altere os dados de identificação e status de acesso do cliente.'
                        : 'Libere o acesso da barbearia ou salão e forneça a credencial temporária.'}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {/* CORPO ROLÁVEL COM SCROLLBAR AZUL FINA */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin scrollbar-thumb-blue-500/50 hover:scrollbar-thumb-blue-500/80 scrollbar-track-transparent pr-2">
                {/* SEÇÃO 1: DADOS DO ESTABELECIMENTO */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                    <Store className="w-3.5 h-3.5" />
                    Identificação do Negócio
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="formName" className="text-xs font-semibold text-muted-foreground">
                      Nome do Estabelecimento *
                    </Label>
                    <div className="relative">
                      <Input
                        id="formName"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Ex: Barbearia Dom Pedro ou Salão Glamour"
                        required
                        className="bg-background/80 border-white/10 pl-3 focus:border-primary text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Segmento de Atuação *</Label>
                      <Select 
                        value={formSegment} 
                        onValueChange={(val: any) => {
                          setFormSegment(val);
                          if (!editingId && (!formTempPassword || formTempPassword.startsWith('Barber@') || formTempPassword.startsWith('Salao@'))) {
                            setFormTempPassword(generateTemporaryPassword(val));
                          }
                        }}
                      >
                        <SelectTrigger className="bg-background/80 border-white/10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 scrollbar-thin scrollbar-thumb-blue-500/40 scrollbar-track-transparent">
                          <SelectItem value="barbershop">💈 Barbearia</SelectItem>
                          <SelectItem value="beauty_salon">✨ Salão de Beleza / Estética</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Status do Acesso</Label>
                      <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                        <SelectTrigger className="bg-background/80 border-white/10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 scrollbar-thin scrollbar-thumb-blue-500/40 scrollbar-track-transparent">
                          <SelectItem value="active">🟢 Acesso Liberado (Ativo)</SelectItem>
                          <SelectItem value="suspended">🔴 Acesso Bloqueado (Suspenso)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 2: RESPONSÁVEL E CONTATOS */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                    <User className="w-3.5 h-3.5" />
                    Responsável & Acesso
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="formOwner" className="text-xs font-semibold text-muted-foreground">
                        Nome do Dono / Responsável *
                      </Label>
                      <Input
                        id="formOwner"
                        value={formOwner}
                        onChange={(e) => setFormOwner(e.target.value)}
                        placeholder="Ex: Carlos Silva"
                        required
                        className="bg-background/80 border-white/10 text-sm focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="formPhone" className="text-xs font-semibold text-muted-foreground">
                        WhatsApp de Contato
                      </Label>
                      <Input
                        id="formPhone"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="bg-background/80 border-white/10 text-sm focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="formEmail" className="text-xs font-semibold text-muted-foreground">
                      E-mail de Login do Cliente *
                    </Label>
                    <div className="relative">
                      <Input
                        id="formEmail"
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="cliente@barbearia.com.br"
                        required
                        className="bg-background/80 border-white/10 font-mono text-sm focus:border-primary"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Este será o e-mail de autenticação exclusivo do cliente na plataforma.
                    </p>
                  </div>
                </div>

                {/* SEÇÃO 3: CONTROLE DE SENHA DO CLIENTE (CADASTRO E EDIÇÃO) */}
                {!editingId ? (
                  // NOVO CLIENTE
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-foreground">
                          Senha de Acesso Temporária
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30">
                        1º Acesso
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="formTempPassword" className="text-xs text-muted-foreground">
                        Senha Inicial Provisória *
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="formTempPassword"
                            type={showTempPassword ? 'text' : 'password'}
                            value={formTempPassword}
                            onChange={(e) => setFormTempPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            required
                            className="bg-background/80 border-white/10 font-mono text-sm pr-10 focus:border-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTempPassword(!showTempPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            title={showTempPassword ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormTempPassword(generateTemporaryPassword(formSegment))}
                          className="border-white/10 bg-background/50 hover:bg-muted/50 text-xs shrink-0 flex items-center gap-1.5 h-9"
                          title="Gerar outra senha provisória"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                          Gerar Outra
                        </Button>
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={requirePasswordChange}
                        onChange={(e) => setRequirePasswordChange(e.target.checked)}
                        className="mt-0.5 rounded border-white/20 bg-background text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="text-xs leading-snug">
                        <span className="font-semibold text-foreground">
                          Exigir troca de senha no primeiro login
                        </span>
                        <p className="text-muted-foreground text-[11px] mt-0.5">
                          Ao entrar com a senha provisória, o cliente será orientado automaticamente a criar sua senha pessoal definitiva.
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  // EDIÇÃO DE CLIENTE EXISTENTE
                  <div className="space-y-3">
                    {editingEstablishment?.passwordStatus === 'changed' && !resettingPasswordInEdit ? (
                      // Senha Definitiva Criada
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-foreground">
                              Senha de Acesso do Cliente
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Definitiva já criada
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          O cliente já realizou o primeiro acesso e cadastrou sua própria senha definitiva pessoal. Por segurança e privacidade, senhas definitivas não são exibidas.
                        </p>

                        <div className="pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newTemp = generateTemporaryPassword(formSegment);
                              setFormTempPassword(newTemp);
                              setResettingPasswordInEdit(true);
                              setShowTempPassword(true);
                            }}
                            className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs flex items-center gap-1.5 h-8"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Redefinir com Nova Senha Provisória
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Senha Provisória Ativa (ou Modo de Redefinição)
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-bold text-foreground">
                              {resettingPasswordInEdit ? 'Nova Senha Provisória' : 'Senha Provisória Ativa'}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30">
                            {resettingPasswordInEdit ? 'Redefinindo' : 'Provisória Ativa'}
                          </Badge>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="editFormTempPassword" className="text-xs text-muted-foreground">
                            Senha Provisória Cadastrada
                          </Label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input
                                id="editFormTempPassword"
                                type={showTempPassword ? 'text' : 'password'}
                                value={formTempPassword}
                                onChange={(e) => setFormTempPassword(e.target.value)}
                                placeholder="Digite ou gere nova senha"
                                className="bg-background/80 border-white/10 font-mono text-sm pr-10 focus:border-blue-400"
                              />
                              <button
                                type="button"
                                onClick={() => setShowTempPassword(!showTempPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                title={showTempPassword ? 'Ocultar senha' : 'Ver senha'}
                              >
                                {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>

                            {formTempPassword && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(formTempPassword);
                                  toast.success('Senha provisória copiada!');
                                }}
                                className="border-white/10 bg-background/50 hover:bg-muted/50 text-xs shrink-0 flex items-center gap-1 h-9"
                                title="Copiar senha provisória"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormTempPassword(generateTemporaryPassword(formSegment));
                                setResettingPasswordInEdit(true);
                                setShowTempPassword(true);
                              }}
                              className="border-white/10 bg-background/50 hover:bg-muted/50 text-xs shrink-0 flex items-center gap-1.5 h-9"
                              title="Gerar outra senha provisória"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                              Gerar Outra
                            </Button>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {resettingPasswordInEdit 
                            ? 'Ao salvar, esta nova senha provisória será gravada no acesso do cliente e ele será solicitado a criar nova senha definitiva no próximo login.'
                            : 'O cliente ainda não realizou a troca para senha definitiva. Você pode passar esta senha provisória a ele.'}
                        </p>

                        {resettingPasswordInEdit && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setResettingPasswordInEdit(false);
                                setFormTempPassword(editingEstablishment?.temporaryPassword || '');
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                            >
                              Cancelar redefinição de senha
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RODAPÉ FIXO */}
              <div className="px-6 py-4 border-t border-white/10 bg-[#060B11] flex items-center justify-between gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={isSaving}
                  className="border-white/10 text-muted-foreground hover:text-foreground text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold px-5 text-xs shadow-lg shadow-teal-500/20 flex items-center gap-2"
                >
                  {isSaving ? (
                    'Salvando...'
                  ) : editingId ? (
                    <>
                      <Check className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Cadastrar e Liberar Acesso
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL DE CREDENCIAIS PRONTAS: PÓS-CADASTRO */}
        {/* ========================================================================= */}
        <Dialog open={credentialsModalOpen} onOpenChange={setCredentialsModalOpen}>
          <DialogContent className="sm:max-w-md bg-[#080E16]/95 border-emerald-500/30 backdrop-blur-2xl text-foreground shadow-2xl shadow-black/95 p-0 overflow-hidden rounded-2xl">
            <div className="p-6 border-b border-white/10 bg-gradient-to-b from-emerald-500/10 to-transparent">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Credenciais de Acesso Prontas!
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                As credenciais de <strong>{createdCredentials?.name}</strong> estão geradas. Compartilhe com o cliente via WhatsApp ou copie os dados.
              </DialogDescription>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-white/10 bg-background/60 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-muted-foreground font-sans">Responsável:</span>
                  <span className="font-semibold text-foreground font-sans">{createdCredentials?.ownerName}</span>
                </div>

                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-muted-foreground font-sans">E-mail:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground">{createdCredentials?.email}</span>
                    <button
                      onClick={() => {
                        if (createdCredentials?.email) {
                          navigator.clipboard.writeText(createdCredentials.email);
                          toast.success('E-mail copiado!');
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-muted-foreground font-sans">Senha Provisória:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">
                      {createdCredentials?.tempPassword}
                    </span>
                    <button
                      onClick={() => {
                        if (createdCredentials?.tempPassword) {
                          navigator.clipboard.writeText(createdCredentials.tempPassword);
                          toast.success('Senha copiada!');
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground font-sans">Link de Acesso:</span>
                  <span className="text-xs text-muted-foreground">
                    {window.location.origin}/login
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                <span>
                  O cliente será orientado a alterar esta senha temporária logo no primeiro login.
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => createdCredentials && handleSendCredentialsWhatsapp(createdCredentials)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Enviar Acesso pelo WhatsApp
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => createdCredentials && handleCopyCredentials(createdCredentials)}
                    className="border-white/10 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Mensagem
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => setCredentialsModalOpen(false)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    Concluir
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
