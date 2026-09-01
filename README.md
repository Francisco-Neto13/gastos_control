# Gestão e Otimização de Espaços Corporativos

Aplicação full-stack que resolve um problema concreto: **distribuir equipes pelas salas de um prédio corporativo de 9 andares sem estourar capacidade, sem violar restrições e sem entregar uma recomendação que ninguém consegue explicar.**

Você cadastra salas, setores, equipes e restrições. O motor propõe a melhor distribuição que encontrar, justifica cada escolha em linguagem legível, registra a execução para auditoria e espera a decisão de um humano antes de qualquer coisa virar definitiva.

Construído para o desafio de **Qualidade e Testes de Sistemas Baseados em IA (ISTQB CT-AI)** — onde o ponto não é usar IA, e sim conseguir provar que a recomendação é confiável.

---

## Índice

- [Rodando o projeto](#rodando-o-projeto)
- [Interface](#interface)
- [Como o motor decide](#como-o-motor-decide)
- [As duas métricas de ocupação](#as-duas-métricas-de-ocupação)
- [Por que confiar na recomendação](#por-que-confiar-na-recomendação)
- [Testes](#testes)
- [Estrutura do código](#estrutura-do-código)
- [Stack](#stack)
- [Limitações](#limitações)

---

## Rodando o projeto

```bash
npm install
npm run dev          # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Suíte de testes (Vitest) |
| `npm run typecheck` | Checagem de tipos sem emitir build |
| `npm run build` | Build de produção |
| `npm start` | Sobe o build de produção |

Não precisa configurar banco nem variáveis de ambiente. Na primeira execução o cenário é semeado sozinho a partir de `src/lib/seed-data.ts`:

| | |
|---|---|
| **9** andares | **55** salas |
| **8** setores | **24** equipes |

O cenário já inclui de propósito um caso sem solução — a equipe **Operações Delta**, com 92 pessoas, sendo que a maior sala do prédio comporta 80. Serve para demonstrar o tratamento de exceção em vez de esconder o problema.

### Roteiro de demonstração

1. **`/`** — dashboard zerado, nenhuma execução ainda.
2. **`/sectors`** — escolha um setor, mude o tamanho de uma equipe ou crie outra. Se quiser, adicione uma restrição de coexistência entre dois setores.
3. **`/rooms`** — cadastre ou bloqueie uma sala.
4. **`/allocate`** — clique em **Gerar alocação otimizada**.
5. Ainda em `/allocate`, abra **"Ver justificativa"** em qualquer linha.
6. Aceite, rejeite ou troque a sala manualmente — a intervenção fica registrada.
7. Percorra o resultado: **`/`** (indicadores), **`/exceptions`** (quem ficou de fora e por quê), **`/compare`** (antes × depois), **`/governance`** (histórico auditável), **`/monitoring`** (saúde do motor ao longo do tempo).

---

## Interface

O front-end é um shell de aplicação, não uma sequência de páginas soltas:

- **Sidebar fixa escura** com a navegação agrupada por intenção — *Visão geral*, *Cadastros* e *Operação* — em vez de uma fileira única de links.
- **Topbar fixa e translúcida** que indica a seção ativa enquanto você rola a página.
- **Responsivo**: abaixo do breakpoint `lg` a sidebar vira um drawer com overlay, que fecha sozinho ao navegar.
- **Identidade visual violeta**, com tipografia em duas famílias — *Space Grotesk* nos títulos, *Inter* no corpo — carregadas via `next/font`.
- **Componentes de leitura rápida**: cartões de indicador com faixa lateral colorida (o tom da métrica não depende só da cor do número) e barras de ocupação com gradiente e transição animada.
- **Sem dependência de biblioteca de ícones ou de gráficos** — os ícones são SVG inline e as barras são CSS puro, o que mantém o bundle enxuto.

Os tokens visuais ficam centralizados: paleta e fontes em `tailwind.config.ts`, classes compartilhadas (`.card`, `.btn-*`, `.table-base`, `.page-title`) em `src/app/globals.css`. As páginas não carregam estilo solto.

---

## Como o motor decide

**Heurística gulosa por prioridade e tamanho, com pontuação multi-critério e uma passada de melhoria local por troca de salas.** Sem Machine Learning — e isso é uma decisão, não uma limitação: uma heurística explícita é testável, explicável e auditável, que é exatamente o que a disciplina cobra. Um modelo estatístico não seria nada disso aqui.

### O passo a passo

**1. Ordenar.** Equipes são enfileiradas por prioridade (1 = mais alta) e, em empate, por tamanho decrescente. Equipe grande é mais difícil de encaixar, então escolhe primeiro.

**2. Filtrar pelo que é inegociável.** Antes de qualquer pontuação, salas que violam restrição rígida são descartadas: capacidade, acessibilidade obrigatória, recursos obrigatórios, sala reservada para outro setor, conflito de horário e exclusão de coexistência entre setores no mesmo andar/horário.

**3. Pontuar de 0 a 100** o que sobrou:

| Critério | Peso | Por quê |
|---|:---:|---|
| **Ocupação** (`equipe / capacidade`) | 45 | O coração da otimização. Penaliza a ociosidade tanto quanto o estouro: 12 pessoas não vão para uma sala de 80 se existe uma de 15. |
| **Preferência de andar** | 20 | Respeita o que o Coordenador de Setor pediu, decaindo conforme a distância em andares. |
| **Recursos extras** | 15 | Premia a sala mais bem equipada para o perfil da equipe — sem ser eliminatório. |
| **Proximidade** | 20 | Equipes do mesmo `proximityGroupId` (squads de um mesmo produto, por exemplo) pontuam mais perto umas das outras. |

Os pesos vivem em `WEIGHTS`, em `src/lib/engine/scoring.ts`. Mexer neles é mudar a versão do algoritmo — por isso `ALGORITHM_VERSION` fica gravado em toda execução.

**4. Escolher** a sala de maior score, guardando quantas alternativas foram avaliadas e o detalhamento da pontuação (é o que alimenta a justificativa).

**5. Melhorar localmente.** Uma passada tenta trocar salas entre pares de equipes já alocadas sempre que a troca aumenta a soma dos dois scores. Ela nunca desaloca ninguém — logo, não pode piorar a taxa de alocação — e revalida todas as restrições rígidas antes de aplicar.

**6. Nunca forçar.** Equipe sem sala compatível vira exceção registrada, jamais uma alocação inválida disfarçada de sucesso.

---

## As duas métricas de ocupação

O dashboard mostra **dois percentuais de ocupação que não são a mesma coisa**, e confundi-los leva a conclusões erradas:

| Métrica | Fórmula | Responde |
|---|---|---|
| **Ocupação total do prédio** | alocados ÷ capacidade de **todas** as salas | "Quanto do prédio está em uso agora?" Naturalmente baixa quando só uma fração das salas opera naquele horário. |
| **Ocupação das salas usadas** | média de `equipe / capacidade` **só nas salas escolhidas** | "As equipes foram bem encaixadas nas salas que receberam?" É esta que mede a qualidade da otimização. |

Elas não deveriam bater. **32% de ocupação do prédio com 75% nas salas usadas** é o resultado saudável de 20 das 55 salas ocupadas, todas bem escolhidas.

---

## Por que confiar na recomendação

Não por usar IA. Por estas cinco garantias, cada uma verificável no código:

### Explicabilidade

Toda recomendação sai com uma justificativa em texto, gerada do mesmo detalhamento de score que decidiu a alocação — não é um texto escrito à parte:

```
Sala 502 recomendada para a equipe "Desenvolvimento B".
Capacidade da sala: 25 pessoas. Equipe: 18 pessoas. Ocupação prevista: 72%.
Recursos necessários atendidos: sim.
Acessibilidade obrigatória atendida: não se aplica.
Restrição de andar atendida: não (preferência: 7º andar, alocado no 5º).
Alternativas avaliadas: 11.
Esta sala apresentou o melhor equilíbrio entre ocupação (100/100), localização
(60/100), recursos (85/100) e proximidade com equipes relacionadas (100/100) dentre
as alternativas disponíveis — score final 89.75/100.
```

O mesmo conteúdo também sai estruturado em `constraintsSatisfied` e `scoreBreakdown`, consumido tanto pela interface quanto pelos testes.

### Exceções com causa real

Sem sala possível, o motor registra equipe afetada, restrição não atendida, causa e encaminhamento. E distingue dois diagnósticos diferentes (`explainNoCandidate`):

- **nenhuma sala do prédio atende às especificações** — o caso da Operações Delta, 92 pessoas contra uma sala máxima de 80;
- **existe sala compatível, mas está ocupada no horário ou bloqueada** por coexistência entre setores.

Sem essa distinção, o relatório poderia culpar a primeira salinha do inventário por acaso, mesmo havendo uma sala grande livre em outro andar — uma explicação tecnicamente verdadeira e completamente enganosa.

### A decisão final é humana

`POST /api/allocations/:runId/decision` registra o veredito do Coordenador Geral: `aceitar`, `rejeitar` ou `alterar_manual` com a nova sala. Enquanto isso não acontece, a alocação é só uma recomendação. O motor sugere; ele não aplica.

### Governança

Cada `POST /api/allocate` grava um `GovernanceRecord`: id da execução, data/hora, usuário, versão do algoritmo, volume de salas e equipes analisadas, alocadas e não alocadas, restrições violadas, ocupação prevista e todas as intervenções humanas posteriores. Dá para responder, a qualquer momento: quem rodou, quando, com quais dados, com qual versão, com qual resultado.

### Observabilidade

`/monitoring` agrega, sobre todas as execuções: tempo da última otimização, total de execuções, taxa média de alocação, ocupação média prevista, violações de restrição obrigatória, intervenções manuais e erros do motor com stack (`store.recordError`).

---

## Testes

**20 testes em 7 arquivos**, via `npm test`. O foco está em **testes metamórficos e de propriedade** — não existe "resposta ótima" conhecida para dezenas de equipes e salas, então não dá para comparar contra um gabarito. O que dá para verificar são relações que precisam valer independentemente dos dados:

| Arquivo | Propriedade verificada |
|---|---|
| `engine.capacity.test.ts` | **Capacidade.** Nenhuma alocação excede a sala; nenhuma sala recebe duas equipes em horários sobrepostos. |
| `engine.expansion.test.ts` | **Expansão.** Adicionar uma sala compatível nunca reduz o número de equipes alocadas — e resolve a exceção da Delta. |
| `engine.constraint-removal.test.ts` | **Remoção de restrição.** Remover uma exigência de acessibilidade ou de coexistência, ou aumentar a capacidade de uma sala, nunca piora o resultado. |
| `engine.equivalent-teams.test.ts` | **Equivalência.** Renomear uma equipe ou inverter a ordem de duas com requisitos idênticos não altera a qualidade da solução — o nome nunca entra na pontuação. |
| `engine.exceptions.test.ts` | Toda exceção tem causa e encaminhamento; toda recomendação tem justificativa e ao menos uma alternativa avaliada. |
| `engine.governance.test.ts` | Toda execução carrega versão e contagens consistentes, zero violações de restrição rígida, e roda dentro do limite de tempo. |
| `engine.scoring.test.ts` | Unitários das funções de pontuação: ocupação, andar, recursos, proximidade. |

### Critérios de aceitação e onde são provados

| # | Critério | Verificado em |
|:--:|---|---|
| 1 | Nenhuma sala recebe mais pessoas que a capacidade | `engine.capacity.test.ts` |
| 2 | Nenhuma restrição obrigatória é ignorada (`hardConstraintsViolated` sempre `0`) | `engine.governance.test.ts` |
| 3 | 100% das recomendações têm justificativa e 100% das exceções têm causa e encaminhamento | `engine.exceptions.test.ts` |
| 4 | Crescer o inventário ou remover restrição nunca reduz equipes alocáveis | `engine.expansion.test.ts`, `engine.constraint-removal.test.ts` |
| 5 | Execução dentro do limite de tempo (< 2s para o prédio completo) | `engine.governance.test.ts` |

O critério 1 é garantido antes disso, por construção: `staticEligibility` e `hardConstraintsFilter` eliminam candidatos inviáveis antes da pontuação.

### CI

`.github/workflows/ci.yml` roda a cada push e PR: `npm ci`, `npm run typecheck`, `npm test` e `npm run build`. Qualquer etapa vermelha bloqueia o merge — é assim que a resposta para *"a nova versão piorou a solução?"* fica automatizada em vez de depender de alguém lembrar de conferir.

---

## Estrutura do código

```
src/lib/
  types.ts              Modelo de domínio (Sala, Setor, Equipe, Restrição, Execução…)
  seed-data.ts          Cenário inicial determinístico (zero Math.random)
  store.ts              Persistência JSON + governança + intervenções
  engine/
    scoring.ts          Funções puras de pontuação — testáveis isoladamente
    allocate.ts         Motor guloso + swap + baseline ingênua para comparação
    run.ts              Orquestra a execução e grava o registro de governança

src/app/
  api/                  Rotas REST (Next.js Route Handlers)
  <páginas>             Dashboard, Salas, Setores, Alocação, Comparação,
                        Exceções, Governança, Monitoramento
  globals.css           Design tokens e classes compartilhadas

src/components/
  AppShell.tsx          Shell da aplicação: sidebar + topbar + drawer mobile
  nav-links.ts          Fonte única da navegação
  NavIcon.tsx           Ícones SVG inline
  StatCard.tsx          Cartão de indicador
  Bar.tsx               Barra de ocupação

tests/                  Suíte unitária + metamórfica
```

A camada de domínio (`src/lib/`) não conhece a forma de persistência — trocar o JSON por um banco de verdade não encosta no motor.

---

## Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Front + back | **Next.js 15 (App Router) + React 19 + TypeScript** | Uma linguagem, um projeto, um deploy |
| Estilo | **Tailwind CSS 3** com paleta e tipografia próprias | Tokens centralizados, sem CSS espalhado |
| Fontes | **Inter** + **Space Grotesk** via `next/font` | Auto-hospedadas, sem requisição externa em runtime |
| Persistência | **Arquivo JSON** (`data/db.json`, fora do git) | Suficiente para o protótipo, sem dependência nativa, CI simples |
| Testes | **Vitest** | Rápido e nativo em TypeScript |
| CI | **GitHub Actions** | Tipos, testes e build a cada push |

---

## Limitações

Ditas de forma direta, porque escondê-las contradiria o objetivo do projeto:

- **Persistência em JSON local.** Serve a um protótipo demonstrável, não a acesso concorrente multiusuário.
- **A melhoria por swap é busca local**, limitada a 2 passadas. Melhora a solução, mas não garante o ótimo matemático — e o projeto não afirma que garante.
- **Não há controle de acesso.** Os perfis (Coordenador Geral × Coordenador de Setor) não são aplicados: o campo `user` é informado por chamada e existe apenas para auditoria. O protótipo assume ambiente de demonstração confiável.
