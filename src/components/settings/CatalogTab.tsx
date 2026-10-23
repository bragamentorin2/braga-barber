import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCatalogStore } from '@/store/useCatalogStore';
import type { ServiceItem, ProductItem } from '@/types/catalog';
import { toast } from 'sonner';
import { Scissors, Package, Plus, Pencil, Trash2, Clock, Tag, DollarSign, Layers, Search, Sparkles } from 'lucide-react';
import { useBusinessProfile } from '@/contexts/BusinessProfileContext';

export function CatalogTab() {
  const { segment, terms } = useBusinessProfile();
  const {
    services,
    products,
    addService,
    updateService,
    deleteService,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useCatalogStore();

  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');

  // Modal de Serviço
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');

  // Modal de Produto
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productName, setProductName] = useState('');
  const [productSalePrice, setProductSalePrice] = useState('');
  const [productCostPrice, setProductCostPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productDescription, setProductDescription] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Abrir modal de serviço
  const openServiceModal = (item?: ServiceItem) => {
    if (item) {
      setEditingService(item);
      setServiceName(item.name);
      setServicePrice(String(item.price));
      setServiceDuration(item.durationMinutes ? String(item.durationMinutes) : '');
      setServiceCategory(item.category || '');
      setServiceDescription(item.description || '');
    } else {
      setEditingService(null);
      setServiceName('');
      setServicePrice('');
      setServiceDuration('45');
      setServiceCategory('Geral');
      setServiceDescription('');
    }
    setServiceModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      toast.error('Informe o nome do serviço.');
      return;
    }
    const price = parseFloat(servicePrice.replace(',', '.')) || 0;
    if (price <= 0) {
      toast.error('Informe um preço válido para o serviço.');
      return;
    }

    const duration = parseInt(serviceDuration, 10) || undefined;

    if (editingService) {
      updateService(editingService.id, {
        name: serviceName.trim(),
        price,
        durationMinutes: duration,
        category: serviceCategory.trim() || undefined,
        description: serviceDescription.trim() || undefined,
      });
      toast.success('Serviço atualizado com sucesso!');
    } else {
      addService({
        name: serviceName.trim(),
        price,
        durationMinutes: duration,
        category: serviceCategory.trim() || 'Geral',
        description: serviceDescription.trim() || undefined,
      });
      toast.success('Serviço adicionado com sucesso!');
    }
    setServiceModalOpen(false);
  };

  const handleDeleteService = (id: string, name: string) => {
    if (window.confirm(`Excluir o serviço "${name}"?`)) {
      deleteService(id);
      toast.success('Serviço removido.');
    }
  };

  // Abrir modal de produto
  const openProductModal = (item?: ProductItem) => {
    if (item) {
      setEditingProduct(item);
      setProductName(item.name);
      setProductSalePrice(String(item.salePrice));
      setProductCostPrice(item.costPrice ? String(item.costPrice) : '');
      setProductStock(item.stockQuantity !== undefined ? String(item.stockQuantity) : '');
      setProductCategory(item.category || '');
      setProductDescription(item.description || '');
    } else {
      setEditingProduct(null);
      setProductName('');
      setProductSalePrice('');
      setProductCostPrice('');
      setProductStock('10');
      setProductCategory('Revenda');
      setProductDescription('');
    }
    setProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      toast.error('Informe o nome do produto.');
      return;
    }
    const salePrice = parseFloat(productSalePrice.replace(',', '.')) || 0;
    if (salePrice <= 0) {
      toast.error('Informe o preço de venda do produto.');
      return;
    }

    const costPrice = productCostPrice ? parseFloat(productCostPrice.replace(',', '.')) : undefined;
    const stockQuantity = productStock ? parseInt(productStock, 10) : undefined;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: productName.trim(),
        salePrice,
        costPrice,
        stockQuantity,
        category: productCategory.trim() || undefined,
        description: productDescription.trim() || undefined,
      });
      toast.success('Produto atualizado com sucesso!');
    } else {
      addProduct({
        name: productName.trim(),
        salePrice,
        costPrice,
        stockQuantity,
        category: productCategory.trim() || 'Revenda',
        description: productDescription.trim() || undefined,
      });
      toast.success('Produto adicionado com sucesso!');
    }
    setProductModalOpen(false);
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (window.confirm(`Excluir o produto "${name}"?`)) {
      deleteProduct(id);
      toast.success('Produto removido.');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services;
    const term = searchTerm.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.category && s.category.toLowerCase().includes(term)) ||
        (s.description && s.description.toLowerCase().includes(term))
    );
  }, [services, searchTerm]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col gap-3">
      {/* Barra de Controles: Abas + Busca + Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border w-fit">
          <button
            onClick={() => { setActiveTab('services'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'services'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {segment === 'barbershop' ? <Scissors className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {segment === 'barbershop' ? 'Cortes & Serviços' : 'Procedimentos'} ({services.length})
          </button>
          <button
            onClick={() => { setActiveTab('products'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'products'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-4 h-4" />
            {segment === 'barbershop' ? 'Pomadas & Linha' : 'Cosméticos'} ({products.length})
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Busca rápida */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'services' ? `Buscar em ${terms.servicesTitle.toLowerCase()}...` : `Buscar em ${terms.productsTitle.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/20 border-border"
            />
          </div>

          {activeTab === 'services' ? (
            <Button onClick={() => openServiceModal()} className="gap-1.5 bg-primary text-primary-foreground h-9 shrink-0">
              <Plus className="w-4 h-4" />
              {terms.newServiceButton}
            </Button>
          ) : (
            <Button onClick={() => openProductModal()} className="gap-1.5 bg-primary text-primary-foreground h-9 shrink-0">
              <Plus className="w-4 h-4" />
              {terms.newProductButton}
            </Button>
          )}
        </div>
      </div>

      {/* QUADRO PRINCIPAL FIXO */}
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border-border bg-card">
        {/* Header fixo do Card */}
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {activeTab === 'services' ? (
              <Scissors className="w-5 h-5 text-primary" />
            ) : (
              <Package className="w-5 h-5 text-primary" />
            )}
            <CardTitle className="text-base sm:text-lg font-bold">
              {activeTab === 'services' ? 'Catálogo de Serviços Oferecidos' : 'Produtos para Revenda'}
            </CardTitle>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {activeTab === 'services'
                ? `${filteredServices.length} ${filteredServices.length === 1 ? 'serviço' : 'serviços'}`
                : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'produto' : 'produtos'}`}
            </span>
          </div>
          <CardDescription className="hidden sm:block text-xs">
            {activeTab === 'services'
              ? 'Procedimentos realizados na cadeira ou bancada com preço e duração sugeridos.'
              : 'Pomadas, óleos, cosméticos e itens de conveniência vendidos aos clientes.'}
          </CardDescription>
        </CardHeader>

        {/* CABEÇALHO DA LISTA FIXO */}
        {activeTab === 'services' ? (
          <div className="grid bg-muted/60 border-b border-border px-4 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground items-center grid-cols-[1.5fr_1fr_120px_130px_90px] shrink-0">
            <span>Serviço</span>
            <span>Categoria</span>
            <span className="text-center">Duração Média</span>
            <span className="text-right">Preço Sugerido</span>
            <span className="text-right">Ações</span>
          </div>
        ) : (
          <div className="grid bg-muted/60 border-b border-border px-4 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground items-center grid-cols-[1.5fr_1fr_90px_100px_110px_100px_90px] shrink-0">
            <span>Produto</span>
            <span>Categoria</span>
            <span className="text-center">Estoque</span>
            <span className="text-right hidden sm:block">Custo Unit.</span>
            <span className="text-right">Preço Venda</span>
            <span className="text-right hidden sm:block">Margem Est.</span>
            <span className="text-right">Ações</span>
          </div>
        )}

        {/* CORPO COM SCROLLBAR AZUL FINA PADRÃO DO PROJETO */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
          {activeTab === 'services' ? (
            filteredServices.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <Scissors className="w-8 h-8 opacity-40" />
                <p>
                  {searchTerm
                    ? 'Nenhum serviço encontrado com este termo de busca.'
                    : 'Nenhum serviço cadastrado ainda. Clique em "Novo Serviço" acima.'}
                </p>
              </div>
            ) : (
              filteredServices.map((item) => (
                <div
                  key={item.id}
                  className="grid px-4 py-3 border-b border-border/50 items-center hover:bg-muted/30 transition-colors grid-cols-[1.5fr_1fr_120px_130px_90px]"
                >
                  {/* Nome e Descrição */}
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-sm text-foreground truncate" title={item.name}>
                      {item.name}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate" title={item.description}>
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Categoria */}
                  <div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                      {item.category || 'Geral'}
                    </span>
                  </div>

                  {/* Duração */}
                  <div className="text-center text-sm text-muted-foreground">
                    {item.durationMinutes ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {item.durationMinutes} min
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </div>

                  {/* Preço */}
                  <div className="text-right text-sm font-bold text-emerald-400">
                    {formatCurrency(item.price)}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={() => openServiceModal(item)}
                      title="Editar Serviço"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteService(item.id, item.name)}
                      title="Excluir Serviço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )
          ) : (
            filteredProducts.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <Package className="w-8 h-8 opacity-40" />
                <p>
                  {searchTerm
                    ? 'Nenhum produto encontrado com este termo de busca.'
                    : 'Nenhum produto cadastrado ainda. Clique em "Novo Produto" acima.'}
                </p>
              </div>
            ) : (
              filteredProducts.map((item) => {
                const cost = item.costPrice || 0;
                const profit = item.salePrice - cost;
                const marginPct = item.salePrice > 0 ? (profit / item.salePrice) * 100 : 0;

                return (
                  <div
                    key={item.id}
                    className="grid px-4 py-3 border-b border-border/50 items-center hover:bg-muted/30 transition-colors grid-cols-[1.5fr_1fr_90px_100px_110px_100px_90px]"
                  >
                    {/* Produto + Descrição */}
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-sm text-foreground truncate" title={item.name}>
                        {item.name}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate" title={item.description}>
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Categoria */}
                    <div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                        {item.category || 'Geral'}
                      </span>
                    </div>

                    {/* Estoque */}
                    <div className="text-center text-sm font-medium">
                      {item.stockQuantity !== undefined ? (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          item.stockQuantity <= 3 ? 'bg-destructive/20 text-destructive' : 'bg-primary/10 text-primary'
                        }`}>
                          {item.stockQuantity} un
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </div>

                    {/* Custo Unitário */}
                    <div className="text-right text-sm text-muted-foreground hidden sm:block">
                      {item.costPrice ? formatCurrency(item.costPrice) : '-'}
                    </div>

                    {/* Preço de Venda */}
                    <div className="text-right text-sm font-bold text-emerald-400">
                      {formatCurrency(item.salePrice)}
                    </div>

                    {/* Margem Estimada */}
                    <div className="text-right text-xs hidden sm:block">
                      {item.costPrice ? (
                        <span className="font-semibold text-primary">
                          {marginPct.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={() => openProductModal(item)}
                        title="Editar Produto"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteProduct(item.id, item.name)}
                        title="Excluir Produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </Card>

      {/* MODAL SERVIÇO */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="sm:max-w-[460px] p-6">
          <DialogHeader className="pb-2 border-b border-border">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" />
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveService} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="srv-name" className="text-sm font-medium">Nome do Serviço *</Label>
              <Input
                id="srv-name"
                placeholder="Ex: Corte Degradê, Barboterapia, Manicure..."
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="srv-price" className="text-sm font-medium">Preço (R$) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                  <Input
                    id="srv-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="pl-9"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="srv-duration" className="text-sm font-medium">Duração Estimada</Label>
                <div className="relative">
                  <Input
                    id="srv-duration"
                    type="number"
                    placeholder="45"
                    className="pr-12"
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">min</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="srv-category" className="text-sm font-medium">Categoria</Label>
              <Input
                id="srv-category"
                placeholder="Ex: Cabelo, Barba, Unhas, Química, Combos..."
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="srv-desc" className="text-sm font-medium">Descrição ou Observação (Opcional)</Label>
              <Input
                id="srv-desc"
                placeholder="Ex: Inclui lavagem e finalização com pomada"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setServiceModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                Salvar Serviço
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL PRODUTO */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="sm:max-w-[460px] p-6">
          <DialogHeader className="pb-2 border-b border-border">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {editingProduct ? 'Editar Produto' : 'Novo Produto para Revenda'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="prd-name" className="text-sm font-medium">Nome do Produto *</Label>
              <Input
                id="prd-name"
                placeholder="Ex: Pomada Matte, Óleo de Barba, Cerveja Long Neck..."
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prd-sale" className="text-sm font-medium">Preço de Venda (R$) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                  <Input
                    id="prd-sale"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="pl-9"
                    value={productSalePrice}
                    onChange={(e) => setProductSalePrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prd-cost" className="text-sm font-medium">Preço de Custo (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                  <Input
                    id="prd-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="pl-9"
                    value={productCostPrice}
                    onChange={(e) => setProductCostPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prd-stock" className="text-sm font-medium">Qtd em Estoque</Label>
                <Input
                  id="prd-stock"
                  type="number"
                  min="0"
                  placeholder="Ex: 10"
                  value={productStock}
                  onChange={(e) => setProductStock(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prd-category" className="text-sm font-medium">Categoria</Label>
                <Input
                  id="prd-category"
                  placeholder="Ex: Finalizadores, Barba, Lounge..."
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prd-desc" className="text-sm font-medium">Descrição (Opcional)</Label>
              <Input
                id="prd-desc"
                placeholder="Ex: Frasco de 80g com efeito seco"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setProductModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                Salvar Produto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
