---
name: "release_notes_automation"
description: "Regra para gerar notas de release automaticamente após alterações de rotinas"
priority: 100
---

# Regra: Notas de Release (Novidades)

Sempre que adicionarmos uma nova rotina, funcionalidade ou editarmos significativamente uma já existente no sistema, você DEVE obrigatoriamente realizar as seguintes ações ao concluir:

1. **Criar Checkpoint/Release Note:** Geração automática do conteúdo para uma "Nota de Release" ou "Novidade" detalhando o que foi feito. 
2. **Formato:** O conteúdo deverá estar estruturado em markdown, com título (`title`), módulo afetado (`module_name`) e uma breve lista explicativa das melhorias em tópicos ou um parágrafo que valorize a entrega.
3. **Persistência:** A nota gerada deve ser salva através de um script `.sql` de insert na tabela `release_notes` (ou outra tabela definida no contexto) para que o usuário execute em produção, garantindo assim que a novidade fique registrada e crie um alerta de "Não Lida" para os sócios.
