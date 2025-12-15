
# ChecklistIA - Versão 2.2 (Stable Blindada)
**Status:** Produção / Estável
**Data do Backup:** Atual
**Codename:** Simplicity & Security Update

---

## 📋 Resumo da Versão
Esta versão representa um marco de estabilidade ("Blindagem"). Ela combina a reformulação visual focada em simplicidade com as correções críticas de segurança no painel administrativo e banco de dados.

## 🚀 Mudanças Visuais (UI/UX)
- **Identidade Simplificada:**
  - Slogan atualizado para: *"Soma, quantidade e pesagem. Simples."*
  - Remoção de textos de marketing genéricos em favor de utilidade direta.
- **Tema Claro (Cream):**
  - Fundo alterado de Branco Puro (#FFFFFF) para Creme Suave (#FAF3E0) para maior conforto visual.
  - Ajuste de contraste nos textos para combinar com o novo fundo.
- **Temas Sazonais:**
  - **Natal:** Inclui animação de neve e silhueta do Papai Noel voando no modal de Login.
  - **Ano Novo:** Inclui fogos de artifício e gradientes dourados.

## 🛡️ Segurança e Backend (Blindagem)
- **Role-Based Access Control (RBAC):**
  - Removido array `HARDCODED_ADMINS`.
  - Admin definido estritamente pelo campo `role: 'admin_l1' | 'admin_l2'` no Firestore.
- **Firestore Rules:**
  - Regras atualizadas para impedir escritas não autorizadas em coleções públicas.
  - Validação de username (`users_public`) protegida.
- **Gestão de Equipe:**
  - Sistema de convites para novos administradores via modal seguro.
  - Logs de atividade (Audit Logs) para ações de criação/edição/remoção de ofertas.

## 🛠️ Funcionalidades Principais Inclusas
1.  **Core:** Lista de compras com cálculo automático, pesagem e separação por categorias.
2.  **IA:** Geração de receitas, organização automática de corredores e sugestões inteligentes.
3.  **Ferramentas:** Conversor de Unidades, Calculadora de Preços, Comparador de Produtos.
4.  **Social:** Compartilhamento de listas em tempo real e histórico de listas recebidas.
5.  **Arcade:** Mini-games (Quiz, Puzzle, Roleta) para engajamento.

---

## ⚠️ Instruções de Restauração
1. Copie todos os arquivos desta pasta para o diretório raiz do projeto.
2. Certifique-se de que o arquivo `firestore.rules` seja publicado no Firebase Console.
3. Instale as dependências: `npm install`.
4. Execute: `npm run dev`.

**Engenheiro Responsável:** World-Class Senior Frontend AI
