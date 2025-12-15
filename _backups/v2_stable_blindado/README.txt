
Versão: Blindagem V2 (Stable Security Patch)
Data: Atual
Status: Estável & Seguro

--- MUDANÇAS CRÍTICAS NESTA VERSÃO ---

1. SEGURANÇA (Backend & Frontend):
   - Remoção completa da lista `HARDCODED_ADMINS`.
   - Admin agora é definido estritamente pela propriedade `role` ('admin_l1' ou 'admin_l2') no documento do usuário no Firestore.
   - Lógica de cálculo de média de Reviews movida para Backend (o frontend apenas cria o documento de review, não edita mais o produto diretamente).
   - Tratamento de erros de permissão (`permission-denied`) adicionado aos listeners para evitar travamento se o usuário perder acesso.

2. FUNCIONALIDADES NOVAS:
   - Sistema de Convite para Equipe (Admin Invite Modal).
   - Relatórios de Atividade da Equipe (Logs de criação/edição/remoção).
   - Novo Modal de Conversor de Unidades.
   - Refinamento visual no tema Escuro e Natalino.

3. ARQUIVOS DE BACKUP:
   - `firestore.rules`: Cópia local das regras de segurança que devem estar ativas no Firebase Console para esta versão funcionar corretamente.

--- COMO RESTAURAR ---
1. O código desta pasta representa o estado funcional.
2. Se houver erros de "Permissão Negada", verifique se o arquivo `firestore.rules` deste backup corresponde ao que está no Firebase Console.
