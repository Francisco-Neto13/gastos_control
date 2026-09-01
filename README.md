# Sistema Inteligente de Gestão e Otimização de Espaços Corporativos

Protótipo full-stack construído em uma semana para o desafio de **Qualidade e Testes
de Sistemas Baseados em IA (ISTQB CT-AI)**. O sistema recebe salas, setores, equipes
e restrições e propõe automaticamente a melhor distribuição possível dos espaços de
um prédio corporativo de 9 andares — com explicabilidade, governança, observabilidade
e possibilidade de intervenção humana em todas as recomendações.

> **Por que confiar em uma recomendação deste sistema?** Não porque "usamos IA", mas
> porque toda execução é testada (testes de propriedade/metamórficos, seção
> [Testes](#testes-automatizados)), obedece critérios de aceitação objetivos e
> auditáveis (seção [Critérios de aceitação](#critérios-de-aceitação)), explica sua
> decisão (seção [Explicabilidade](#explicabilidade)), fica registrada para auditoria
> (seção [Governança](#governança-e-auditoria)), é monitorada ao longo do tempo
> (seção [Observabilidade](#observabilidade)) e nunca é definitiva — o Coordenador
> Geral sempre pode aceitar, rejeitar ou alterar manualmente (seção
> [Intervenção humana](#intervenção-humana)).

## Stack técnica

- **Next.js 15 (App Router) + React 19 + TypeScript** — front-end e back-end (API
  Routes) em um único projeto/deploy, escolhido pela velocidade de entrega em uma
  semana com uma única linguagem.
- **Tailwind CSS** para a interface.
- **Persistência em arquivo JSON** (`data/db.json`, gerado em tempo de execução e
  ignorado pelo git) — suficiente para um protótipo, evita dependências nativas de
  banco de dados e mantém o CI simples. A camada de domínio (`src/lib/`) é
  independente da forma de persistência.
- **Vitest** para os testes automatizados.
- **GitHub Actions** para CI/CD.

## Como rodar

```bash
npm install
npm run dev       # http://localhost:3000
```

Outros comandos:

```bash
npm run typecheck # checagem de tipos
npm test          # testes automatizados (Vitest)
npm run build     # build de produção
npm start         # roda o build de produção
```

Os dados iniciais (9 andares, ~55 salas, 8 setores, 24 equipes — incluindo o caso de
exceção "Equipe Delta" citado no enunciado) são semeados automaticamente na primeira
execução, em `src/lib/seed-data.ts`.

## Roteiro de demonstração

1. Abra `/` (Dashboard Executivo) — ocupação do prédio ainda zerada, nenhuma execução.
2. Abra `/sectors`, selecione um setor e altere o tamanho de uma equipe (ou cadastre
   uma nova). Adicione uma restrição de coexistência entre dois setores, se quiser.
3. Em `/rooms`, cadastre ou bloqueie uma sala.
4. Vá a `/allocate` e clique em **GERAR ALOCAÇÃO OTIMIZADA**.
5. Clique em "Ver justificativa" em qualquer linha da tabela — a explicação completa
   aparece (seção [Explicabilidade](#explicabilidade)).
6. Aceite, rejeite, ou altere manualmente uma linha (seleciona outra sala e aplica) —
   a intervenção é registrada.
7. Volte a `/` e veja os indicadores atualizados; veja `/exceptions` para as equipes
   sem sala compatível; veja `/compare` para o antes/depois; veja `/governance` para o
   histórico de execuções; veja `/monitoring` para os indicadores agregados do motor.

## Arquitetura do domínio

```
src/lib/types.ts          Modelo de domínio (Sala, Setor, Equipe, Restrições, Execução…)
src/lib/seed-data.ts      Dados de exemplo determinísticos (sem Math.random)
src/lib/store.ts          Persistência simples (JSON) + governança + intervenções
src/lib/engine/
  scoring.ts              Funções puras de pontuação (testáveis isoladamente)
  allocate.ts             Motor de alocação (heurística) + baseline ingênua
  run.ts                  Orquestra uma execução e grava o registro de governança
src/app/api/…             Rotas REST (Next.js API Routes)
src/app/…                 Páginas (Dashboard, Salas, Setores, Alocação, Comparação,
                           Exceções, Governança, Monitoramento)
tests/                    Testes automatizados (unitários + metamórficos)
```

## Motor de alocação

**Abordagem escolhida: heurística gulosa (greedy) por prioridade/tamanho + melhoria
local por troca de salas (swap), com pontuação multi-critério.** Não foi necessário
Machine Learning — o enunciado permite explicitamente heurísticas, e uma heurística
bem definida é mais fácil de testar, explicar e auditar do que um modelo estatístico,
o que é o próprio tema da disciplina (CT-AI).

### Passo a passo

1. As equipes são ordenadas por **prioridade** (1 = alta primeiro) e, em empate, por
   **tamanho decrescente** — equipes maiores são mais difíceis de encaixar e recebem
   a primeira escolha.
2. Para cada equipe, o motor filtra as salas por **restrições rígidas** (nunca podem
   ser violadas): capacidade, acessibilidade obrigatória, recursos obrigatórios, sala
   reservada para outro setor, conflito de horário e restrição de coexistência entre
   setores no mesmo andar/horário.
3. Entre as salas que sobrarem, cada uma recebe uma **pontuação (0–100)** combinando:

   | Critério | Peso | Racional |
   |---|---|---|
   | Ocupação (`team.size / room.capacity`) | 45% | Núcleo da otimização: penaliza tanto o estouro (impossível) quanto a ociosidade — uma equipe de 12 pessoas não deve ir para uma sala de 80 se existe uma de 15. |
   | Preferência de andar | 20% | Atende a preferência declarada pelo Coordenador de Setor; decai com a distância em andares. |
   | Recursos extras compatíveis | 15% | Prioriza salas mais bem equipadas para o perfil da equipe, sem ser um critério eliminatório. |
   | Proximidade com equipes relacionadas | 20% | Equipes do mesmo `proximityGroupId` (ex.: squads de um mesmo produto) pontuam mais alto perto de onde outras do grupo já foram alocadas. |

4. A sala de maior pontuação é escolhida; o motor registra quantas alternativas foram
   avaliadas e o detalhamento do score (usado na explicação).
5. Uma **passada de melhoria local** tenta trocar salas entre pares de equipes já
   alocadas sempre que a troca aumenta a soma dos scores das duas — nunca desaloca
   ninguém (por isso não pode piorar a taxa de alocação) e revalida todas as
   restrições rígidas antes de aplicar a troca.
6. Equipes sem nenhuma sala compatível viram **exceções** (nunca uma alocação
   inválida) com causa e encaminhamento — ver [Tratamento de exceções](#tratamento-de-exceções).

O código completo e comentado está em `src/lib/engine/allocate.ts` e
`src/lib/engine/scoring.ts`. A versão do algoritmo (`allocation-engine-v1`) é
registrada em toda execução — ver [Governança](#governança-e-auditoria).

## Dashboard executivo

O dashboard (`/`) e o monitoramento (`/monitoring`) mostram **duas métricas de
ocupação propositalmente diferentes** — o enunciado (seção 7) pede tanto "ocupação
total do prédio" quanto "percentual de utilização" como indicadores distintos, e é
fácil confundi-los se os rótulos não deixarem clara a diferença:

| Métrica | Onde aparece | Fórmula | O que responde |
|---|---|---|---|
| **Ocupação total do prédio** | Dashboard | funcionários alocados ÷ capacidade de **todas** as salas do prédio (ocupadas ou não) | "Quanto do prédio inteiro está em uso agora?" — naturalmente baixo quando só uma fração das salas está ocupada em um dado horário. |
| **Ocupação das salas usadas** | Dashboard e Monitoramento | média de `equipe/capacidade` **só das salas que o motor escolheu** | "Quão bem as equipes foram encaixadas nas salas que receberam?" — é a métrica que mede a qualidade da otimização em si. |

Os dois números não deveriam ser iguais nem parecidos — 32% de ocupação do prédio com
75% de ocupação média das salas usadas é o resultado esperado quando só 20 de 55 salas
estão ocupadas em um dado horário, mas as que estão ocupadas foram bem escolhidas.

## Explicabilidade

Toda recomendação do motor vem com uma explicação legível, gerada a partir do mesmo
detalhamento de score usado para decidir. Exemplo real gerado pelo protótipo
(`POST /api/allocate`, depois exibido em `/allocate` ao clicar "Ver justificativa"):

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

Cada alocação também expõe, de forma estruturada (`AllocationEntry.constraintsSatisfied`
e `scoreBreakdown`), se cada restrição foi atendida e o detalhamento do score — usado
tanto pela UI quanto pelos testes automatizados.

## Tratamento de exceções

Quando nenhuma sala atende a uma equipe, o motor **nunca** força uma alocação
inválida. Ele registra uma exceção com equipe afetada, restrição não atendida, causa
e encaminhamento sugerido — visível em `/exceptions` e na resposta de `/api/allocate`.

O motor também diferencia dois tipos de causa (ver `explainNoCandidate` em
`allocate.ts`): (a) nenhuma sala do prédio atende às especificações da equipe (ex.: a
"Equipe Operações Delta", 92 pessoas, citada literalmente no enunciado — a maior sala
do cenário de exemplo comporta 80); (b) existem salas compatíveis por especificação,
mas todas já estão ocupadas no horário pedido ou bloqueadas por uma restrição de
coexistência entre setores. Sem essa distinção, a causa relatada poderia apontar para
a primeira sala pequena do inventário por acaso, mesmo havendo uma sala grande livre
em outro lugar — o que seria uma explicação enganosa.

## Intervenção humana

`POST /api/allocations/:runId/decision` registra a decisão do Coordenador Geral sobre
uma execução: `aceitar`, `rejeitar` ou `alterar_manual` (com a nova sala escolhida).
Cada intervenção fica associada à execução de origem e aparece em `/governance`. A
alocação nunca é aplicada "de verdade" sem essa decisão explícita — o motor apenas
recomenda.

## Governança e auditoria

Cada chamada a `POST /api/allocate` grava um `GovernanceRecord` (visível em
`/governance` e via `GET /api/governance`) com: id da execução, data/hora, usuário,
versão do algoritmo, quantidade de salas/equipes analisadas, equipes
alocadas/não alocadas, restrições violadas, ocupação prevista e todas as intervenções
humanas feitas sobre aquela execução depois. Isso permite responder a qualquer momento
"quem executou, quando, com quais dados, com qual versão e com qual resultado".

## Observabilidade

`/monitoring` (`GET /api/observability`) agrega, sobre todas as execuções já
realizadas: tempo da última otimização, número de execuções, taxa média de alocação,
ocupação média prevista, violações de restrição obrigatória, intervenções manuais e
erros do motor (com stack registrado via `store.recordError`).

## Critérios de aceitação

1. **Nenhuma sala pode receber mais pessoas que sua capacidade.** Garantido por
   construção (`staticEligibility`/`hardConstraintsFilter` filtram candidatos antes de
   pontuar) e verificado pelo teste `tests/engine.capacity.test.ts`.
2. **Nenhuma restrição obrigatória pode ser ignorada** (capacidade, acessibilidade,
   recursos, sala reservada, conflito de horário, exclusão entre setores) — por isso
   `hardConstraintsViolated` é sempre `0` em toda execução (`tests/engine.governance.test.ts`).
3. **100% das recomendações possuem justificativa** e **100% das equipes não
   alocadas possuem causa + encaminhamento registrados** — verificado em
   `tests/engine.exceptions.test.ts`.
4. **Uma nova execução nunca deve reduzir a quantidade de equipes alocáveis quando o
   inventário de salas cresce ou uma restrição é removida** (propriedade metamórfica)
   — `tests/engine.expansion.test.ts` e `tests/engine.constraint-removal.test.ts`.
5. **Recomendações são produzidas dentro de um limite de tempo definido** — o
   protótipo exige menos de 2 segundos para o cenário completo do prédio
   (`tests/engine.governance.test.ts`); em execução real, o motor processa o cenário
   de exemplo em poucos milissegundos.

## Testes automatizados

18 testes em `tests/`, rodados com `npm test` (Vitest). Cobrem tanto unidades da
função de pontuação quanto — o ponto central pedido pela seção 15 do desafio — **testes
baseados em propriedades/metamórficos**, já que não existe uma "resposta ótima"
conhecida a priori para dezenas de equipes e salas:

| Arquivo | O que verifica |
|---|---|
| `engine.capacity.test.ts` | **Teste 1 (Capacidade).** Nenhuma alocação excede a capacidade da sala; nenhuma sala acumula duas equipes em horários que se sobrepõem. |
| `engine.expansion.test.ts` | **Teste 2 (Expansão).** Adicionar uma sala compatível nunca reduz o número de equipes alocadas (e resolve a exceção da Equipe Delta do enunciado). |
| `engine.constraint-removal.test.ts` | **Teste 3 (Remoção de restrição).** Remover uma exigência de acessibilidade, uma restrição de coexistência entre setores, ou aumentar a capacidade de uma sala nunca piora o número de equipes alocadas. |
| `engine.equivalent-teams.test.ts` | **Teste 4 (Equipes equivalentes).** Renomear uma equipe, ou trocar a ordem de entrada de duas equipes com requisitos idênticos, não muda a qualidade global da solução (para este algoritmo, a igualdade é exata, já que o nome nunca participa da pontuação). |
| `engine.exceptions.test.ts` | Toda exceção tem causa e encaminhamento; toda recomendação tem explicação e ao menos uma alternativa avaliada. |
| `engine.governance.test.ts` | Toda execução carrega versão do algoritmo e contagens consistentes; nenhuma execução viola restrição obrigatória; tempo de execução dentro do limite. |
| `engine.scoring.test.ts` | Testes unitários das funções de pontuação (ocupação, andar, recursos, proximidade). |

Esses quatro primeiros arquivos correspondem diretamente aos quatro exemplos de teste
metamórfico do enunciado (seção 15) — a lógica por trás de cada um está comentada no
topo do respectivo arquivo.

## CI/CD

`.github/workflows/ci.yml` roda em todo push/PR: instala dependências (`npm ci`),
checa tipos (`npm run typecheck`), roda os testes (`npm test`) e valida o build de
produção (`npm run build`). Qualquer uma dessas etapas falhando bloqueia o merge.

## Perguntas da demonstração final

**1. Como o sistema distribuiu os funcionários pelos espaços?** Por uma heurística
gulosa (prioridade → tamanho) com pontuação multi-critério (ocupação, andar, recursos,
proximidade), seguida de uma melhoria local por troca de salas — ver
[Motor de alocação](#motor-de-alocação).

**2. Por que determinada sala foi recomendada para determinada equipe?** Cada
alocação carrega uma explicação com capacidade, ocupação prevista, atendimento de
cada restrição e o número de alternativas avaliadas — ver [Explicabilidade](#explicabilidade).

**3. O que acontece quando não existe solução possível?** A equipe vira uma exceção
registrada com causa real (diagnóstico diferenciado entre "sem sala compatível no
prédio" e "sala compatível existe, mas está ocupada/bloqueada") e um encaminhamento —
nunca uma alocação inválida disfarçada de sucesso. Ver
[Tratamento de exceções](#tratamento-de-exceções).

**4. Como vocês sabem que uma nova versão do sistema não piorou a solução?** Os testes
metamórficos (`engine.expansion.test.ts`, `engine.constraint-removal.test.ts`)
verificam relações que devem valer independentemente dos dados exatos — "adicionar uma
sala não reduz equipes alocadas", "remover uma restrição não reduz equipes alocadas" —
e rodam automaticamente no CI a cada mudança.

**5. Por que o Coordenador Geral deveria confiar nesta recomendação?** Não "porque usamos
IA": porque (a) critérios de aceitação objetivos são verificados por teste automatizado
a cada mudança; (b) toda recomendação é explicável; (c) toda execução é auditável
(governança); (d) o sistema é observável ao longo do tempo; e (e) a decisão final é
sempre humana — o Coordenador Geral pode aceitar, rejeitar ou alterar qualquer
recomendação, e essa intervenção fica registrada.

## Limitações conhecidas (escopo de uma semana)

- Persistência em arquivo JSON local — adequada a um protótipo demonstrável, não a
  produção multiusuário concorrente.
- A melhoria por troca de salas (swap) é uma busca local limitada (2 passadas), não
  uma otimização global exata — suficiente para o padrão de qualidade pedido, mas não
  garante o ótimo matemático.
- Autenticação/perfis de usuário (Coordenador Geral vs. Coordenador de Setor) não são
  aplicados por controle de acesso — o protótipo assume um ambiente de demonstração
  confiável, com o `user` informado por chamada apenas para fins de auditoria.
