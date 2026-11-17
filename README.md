# tappo — Plataforma SaaS B2B2C de Cardápio Digital & Autoatendimento NFC (MVP V1)

Plataforma multi-tenant para restaurantes com foco em **leitura instantânea via NFC**, fluxo contínuo de sessão ativa de mesa (`table_session`), monitoramento em tempo real via **WebSockets (Socket.io)** e design system padronizado **padrão iFood / Food App Moderno** com cores sólidas e de alto contraste.

---

## 🎨 Identidade Visual Padronizada (`tappo` — Padrão iFood)
- **Marca:** Tipografia geométrica limpa com monograma minimalista e ponto indicador NFC sólido. Grafada sempre em minúsculas (`tappo`).
- **Paleta de Cores Sólidas & Padronizadas (Zero gradientes artificiais de IA):**
  - **Vermelho Vibrante da Marca & Ações:** `#EA1D2C` (Vermelho característico de apps de gastronomia como iFood, botões primários `Pedir a conta`, cabeçalho do restaurante, mesa ocupada no salão).
  - **Amarelo de Destaque & Alerta:** `#FFC700` (Selo `Mais pedido`, mesa em `Pede a conta`, barras ativas de stories).
  - **Fundo Preto Fosco Quente:** `#141212` (Fundo sólido, moderno e de alto contraste gastronômico).
  - **Branco Puro:** `#FFFFFF` (Barra inferior sólida do cliente, pílulas ativas de categoria e sidebar do painel administrativo).
  - **Superfícies Elevadas:** `#1C1818` e `#242020` com bordas sutis em `#2E2929`.

---

## 📱 Experiência do Cliente na Mesa (`/:tenantSlug/cardapio`)

Conforme a referência visual de design fornecida:
1. **Header Bloco Vermelho Sólido:**
   - Card vermelho `#EA1D2C` com bordas inferiores arredondadas (`rounded-b-[32px]`).
   - Topo: `Mesa 12` na esquerda e `tappo` em branco na direita.
   - Título grande: `Trattoria Ribeiro` (ou restaurante selecionado) com subtítulo `Cozinha de fogo lento · 25 a 40 min`.
2. **Destaques da Casa (Stories Circulares):**
   - Carrossel horizontal de avatares circulares com anéis coloridos de destaque (`#FFC700`, `#D97706`, `#EA1D2C`) e rótulos (`Carpaccio`, `Risoto`, `Burrata`).
   - Ao tocar, abre o **StoriesViewer** em tela cheia com barra de progresso amarela, foto grande, descrição, preço e botões `Ver no cardápio` e `Adicionar ao pedido`.
3. **Filtro de Categorias:**
   - Pílula ativa em Branco Sólido com texto preto (`Entradas`).
   - Pílulas inativas em cinza escuro fosco com texto branco (`Principais`, `Massas`, etc.).
4. **Cards de Prato:**
   - Foto quadrada com cantos arredondados na esquerda.
   - Nome em negrito branco, descrição dos ingredientes em cinza claro.
   - Preço destacado em **Vermelho Vibrante** (`R$ 68`) e selo **Amarelo** `Mais pedido`.
5. **Barra Inferior Branca Sólida:**
   - Fundo branco puro no rodapé com botão `Chamar Garçom` e botão largo vermelho `Pedir a conta`.

---

## 🖥️ Painéis de Gestão (Salão Agora & Backoffice)

Conforme a referência de design fornecida:
1. **Sidebar Branca Sólida:**
   - Logotipo `tappo` em vermelho.
   - Botão ativo em formato de pílula vermelha com texto branco.
2. **Monitor "Salão Agora" (Chefe):**
   - Contadores no topo: `Livres 3`, `Ocupadas 8` (vermelho), `Chamados 3`.
   - Grid de Mesas:
     - **Cartão Vermelho Sólido:** Mesa ocupada com tempo de permanência (ex: `Mesa 1`, `Ocupada · 42 min`).
     - **Cartão Amarelo Sólido:** Mesa com chamado de conta (ex: `Mesa 3`, `Pede a conta`).
     - **Cartão Escuro com Borda Tracejada:** Mesa livre (ex: `Mesa 4`, `Livre`).
   - Coluna de **Pedidos e Chamados**:
     - Notificações com tempo decorrido e botões brancos em pílula: `Marcar atendido`, `Levar a conta`, `Enviar à cozinha`.
3. **Backoffice "Restaurantes" (Admin):**
   - Tabela de restaurantes com status (`Ativo`, `Implantação`, `Suspenso`).
   - Painel lateral de **Tags NFC** com status de leitura recente, botões `Regravar` e `Gravar tag`.

---

## 🚀 Como Rodar o Projeto

### 1. Iniciar o Banco PostgreSQL
```bash
docker compose up -d
```

### 2. Instalar Dependências e Executar Seed
```bash
npm install
npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api
```

### 3. Iniciar em Desenvolvimento
```bash
npm run dev
```
- **Backend API & WebSocket:** `http://localhost:3001`
- **Frontend Web:** `http://localhost:5173`

---

## 🔑 Acessos Rápidos de Teste

- **Cliente na Mesa 12 (NFC direto):**
  `http://localhost:3001/m/k9x4m2`
  (ou diretamente no frontend: `http://localhost:5173/trattoria-ribeiro/cardapio`)
- **Painel do Chefe (`/painel`):**
  `chefe@smashco.com` | `chefe123`
- **Backoffice Coordenação (`/admin`):**
  `admin@tappo.app` | `admin123`
