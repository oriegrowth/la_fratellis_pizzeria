# PROCESS.md — La Fratellis Pizzeria

> Documento-guia para tocar o projeto daqui em diante.
> Última atualização: 2026-06-24

---

## 1. O que é o projeto

**La Fratellis Pizzeria** — web app de delivery de pizza, *mobile-first*, com checkout
que finaliza o pedido no **WhatsApp** da pizzaria (`5511940720211`).

O cliente navega no cardápio, monta a pizza (inteira ou meio a meio), adiciona ao
carrinho e, no checkout, o pedido é:
1. registrado no banco (via `/api/public/orders`), e
2. enviado como mensagem formatada para o WhatsApp da loja.

Há também um **painel administrativo** simples em `/admin` que lista as vendas
registradas.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 7 + TypeScript |
| Estilo | Tailwind CSS 4 + Radix UI (shadcn) |
| Servidor (dev) | Express + tRPC 11 |
| API (produção) | Funções serverless da Vercel (`api/`) |
| Banco | PostgreSQL via Drizzle ORM |
| Deploy | Vercel |

Gerenciador de pacotes: **pnpm** (há `package-lock.json` também — preferir `pnpm`).

---

## 3. Arquitetura — ⚠️ leia isto antes de mexer

Existem **dois caminhos de dados paralelos** no repo. Isso é a maior fonte de
confusão. Saber qual está ativo evita trabalho perdido.

### Caminho A — o que roda em PRODUÇÃO (Vercel)
- `vercel.json` builda **só o client** (`npm run build:client`) e serve `dist/public`.
- A API de produção são as **funções serverless** em [api/](api/):
  - [api/public/orders.ts](api/public/orders.ts) — cria pedido (POST).
  - [api/admin/orders.ts](api/admin/orders.ts) — lista pedidos (GET, auth `admin/admin`).
- O cardápio na tela vem de dados **hardcoded** em
  [shared/menuData.ts](shared/menuData.ts) (`fallbackPizzas`, `fallbackProducts`).
  A UI principal ([client/src/App.tsx](client/src/App.tsx)) **não** consome o tRPC.
- **O servidor Express/tRPC NÃO sobe na Vercel.**

### Caminho B — o servidor tRPC (dev / legado)
- [server/](server/) tem um servidor Express + tRPC completo, com rotas de
  pizzas/cart/customers/orders ([server/routers.ts](server/routers.ts)) e acesso
  ao banco em [server/db.ts](server/db.ts).
- Sobe com `pnpm dev`. **Mas a UI da loja não usa essas rotas** — elas estão
  parcialmente órfãs (sobraram do template Manus/Opensquad original).

> **Regra prática:** mudança que precisa aparecer em produção vai no **client**
> (`App.tsx`, `menuData.ts`) e/ou nas **funções `api/`**. Mexer no `server/tRPC`
> só afeta o ambiente de dev até a gente decidir unificar (ver §8).

### Resíduos do template
`AGENTS.md`, `GEMINI.md`, `README.md`, `_opensquad/`, `squads/`, `.agents/`,
`skills/`, `client/src/components/Manus*` e a maior parte de `server/_core/` vêm
do gerador de projeto (Manus/Opensquad). **Não são o produto** — tratar como
scaffolding até limparmos.

---

## 4. Estrutura de pastas (o que importa)

```
client/src/App.tsx        ← TODA a loja (menu, customizar, carrinho, checkout, admin)
client/src/main.tsx       ← entrypoint
shared/menuData.ts        ← cardápio (fonte de verdade da UI hoje)
api/public/orders.ts      ← cria pedido em produção
api/admin/orders.ts       ← lista pedidos no /admin
server/                   ← Express + tRPC (dev/legado)
drizzle/schema.ts         ← schema do banco (pizzas, products, customers, cart, orders, promotions)
drizzle/*.sql             ← migrations
todo.md                   ← histórico de features (quase tudo concluído)
```

---

## 5. Rodando localmente

```bash
pnpm install
pnpm dev          # sobe Express+tRPC+Vite em dev (server/_core/index.ts)
```

Para validar exatamente o que vai pra Vercel (client + funções `api/`), use a
Vercel CLI:

```bash
npx vercel dev
```

Variáveis de ambiente (banco): `DATABASE_URL` (ou `POSTGRES_URL` /
`POSTGRES_URL_NON_POOLING`). **Sem banco o app ainda funciona** — `server/db.ts`
cai em armazenamento em memória e o cardápio vem do fallback. As funções `api/`,
porém, exigem banco configurado na Vercel.

Comandos úteis:

```bash
pnpm check        # type-check (tsc --noEmit)
pnpm test         # vitest (server/pizza-pricing.test.ts, server/auth.logout.test.ts)
pnpm format       # prettier
pnpm db:push      # drizzle generate + migrate
pnpm build        # build client + server
```

---

## 6. Regras de negócio principais

- **Tamanhos:** `small` = Brotinho (1 sabor), `large` = Grande (até 2 sabores).
- **Meio a meio:** só no tamanho Grande; cobra-se sempre o **sabor mais caro**
  (`Math.max` dos `priceLarge`) — ver `customizerPrice` em `App.tsx`.
- **Cupom `#PRIMEIRACOMPRA`:** 10% de desconto, válido por **180s** após aplicar
  (countdown no checkout).
- **Atribuição de marketing:** UTMs + `gclid`/`fbclid` são capturados da URL,
  salvos em localStorage e gravados no pedido (úteis pro painel admin).
- **Conversão Google Ads:** se `window.gtag_report_conversion` existir, o checkout
  reporta a conversão antes de redirecionar pro WhatsApp.

---

## 7. Deploy

- Push na branch `main` → Vercel builda e publica automaticamente.
- Build: `npm run build:client` → saída em `dist/public`.
- Garantir na Vercel: variável de banco configurada (senão `/api/*` retorna 500)
  e que as funções em `api/` estão sendo publicadas (o checkout detecta e avisa
  se a rota da API devolver o HTML do site em vez de JSON).

---

## 8. Dívida técnica / pontos de atenção

Em ordem aproximada de prioridade:

1. **🔴 Segurança do admin.** Login é `admin/admin` em texto puro, passado na
   **query string** (`/api/admin/orders?user=admin&password=admin`) e a sessão é
   um `localStorage` booleano. Qualquer um com a URL vê todas as vendas e dados de
   clientes. **Trocar por auth real antes de divulgar o `/admin`.**
2. **🟡 Dois caminhos de dados (§3).** Decidir: ou a loja passa a consumir o tRPC,
   ou removemos `server/`+tRPC e ficamos só com `client` + `api/`. Hoje há código
   morto e risco de editar o lado errado.
3. **🟡 Cardápio hardcoded.** O cardápio real vive em `shared/menuData.ts`, não no
   banco. Mudar preço/sabor = editar código e fazer deploy. Avaliar mover pro
   banco + tela de gestão.
4. **🟢 Limpeza do scaffolding.** Remover resíduos do template (Opensquad/Manus,
   GEMINI.md, squads/, etc.) quando confirmarmos que nada depende deles.
5. **🟢 Acentuação.** Parte da UI usa texto sem acento ("Endereco", "Referencia").
   Padronizar.

---

## 9. Como trabalhamos daqui pra frente

**Fluxo por tarefa:**
1. Confirmar em qual caminho a mudança entra (§3) — produção = client + `api/`.
2. Implementar a menor mudança que resolve.
3. `pnpm check` + `pnpm test` antes de commitar.
4. Commit pequeno e descritivo; push em `main` (deploy automático).
5. Validar no preview/produção da Vercel quando tocar em `api/` ou checkout.

**Convenções:**
- Código e nomes de arquivo em inglês; texto de UI em português (pt-BR).
- Preços sempre via helper `money()` (formato BRL).
- Não introduzir um terceiro caminho de dados — escolher A ou B.

---

## 10. Próximos passos sugeridos

- [ ] Substituir auth do `/admin` por algo seguro (§8.1).
- [ ] Decidir e unificar a arquitetura de dados (§8.2).
- [ ] Avaliar mover cardápio para o banco com tela de edição (§8.3).
- [ ] Limpar resíduos do template (§8.4).

> Quando concluir um item, marque aqui e atualize a data no topo.
