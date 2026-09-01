import type { Resource, Room, RoomType, Sector, SectorExclusion, Team } from "./types";

// Dados de exemplo determinísticos (sem Math.random) para que o protótipo seja
// reprodutível em qualquer ambiente e para que os testes metamórficos partam sempre
// do mesmo estado inicial.

const ROOM_TEMPLATES: {
  type: RoomType;
  capacity: number;
  resources: Resource[];
  accessibility: boolean;
}[] = [
  { type: "reuniao", capacity: 8, resources: ["videoconferencia"], accessibility: true },
  { type: "reuniao", capacity: 15, resources: ["videoconferencia", "quadro_branco"], accessibility: false },
  { type: "reuniao", capacity: 20, resources: ["videoconferencia", "quadro_branco"], accessibility: true },
  { type: "treinamento", capacity: 30, resources: ["projetor", "quadro_branco"], accessibility: true },
  { type: "treinamento", capacity: 45, resources: ["projetor", "som"], accessibility: false },
  { type: "colaborativo", capacity: 18, resources: ["quadro_branco"], accessibility: true },
  { type: "colaborativo", capacity: 25, resources: ["quadro_branco", "videoconferencia"], accessibility: false },
  { type: "projeto", capacity: 12, resources: ["quadro_branco"], accessibility: false },
  { type: "laboratorio", capacity: 20, resources: ["computadores", "bancada_lab"], accessibility: true },
  { type: "auditorio", capacity: 80, resources: ["projetor", "som", "videoconferencia"], accessibility: true },
];

function buildRooms(): Room[] {
  const rooms: Room[] = [];
  for (let floor = 1; floor <= 9; floor++) {
    // Cada andar recebe 6 salas, variando o template para gerar diversidade de
    // capacidades/tipos por andar (padrão determinístico, não aleatório).
    for (let slot = 0; slot < 6; slot++) {
      const templateIndex = (floor - 1 + slot * 2) % ROOM_TEMPLATES.length;
      const template = ROOM_TEMPLATES[templateIndex];
      const id = `S${floor}0${slot + 1}`;
      rooms.push({
        id,
        name: `Sala ${floor}0${slot + 1}`,
        floor,
        capacity: template.capacity,
        type: template.type,
        resources: template.resources,
        accessibility: template.accessibility,
        available: true,
      });
    }
  }
  // Uma sala grande extra reservada para Jurídico no 3º andar (exemplo de restrição
  // "sala reservada para determinado setor").
  rooms.push({
    id: "S399",
    name: "Sala 399",
    floor: 3,
    capacity: 22,
    type: "reuniao",
    resources: ["videoconferencia", "quadro_branco"],
    accessibility: true,
    available: true,
    reservedForSectorId: "juridico",
  });
  return rooms;
}

const SECTORS: Sector[] = [
  { id: "tecnologia", name: "Tecnologia", coordinator: "Marina Alves", totalEmployees: 210 },
  { id: "rh", name: "Recursos Humanos", coordinator: "Bruno Castro", totalEmployees: 60 },
  { id: "financeiro", name: "Financeiro", coordinator: "Elisa Nunes", totalEmployees: 130 },
  { id: "juridico", name: "Jurídico", coordinator: "Rafael Torres", totalEmployees: 40 },
  { id: "marketing", name: "Marketing", coordinator: "Camila Reis", totalEmployees: 75 },
  { id: "comercial", name: "Comercial", coordinator: "Diego Farias", totalEmployees: 150 },
  { id: "operacoes", name: "Operações", coordinator: "Patrícia Lima", totalEmployees: 180 },
  { id: "pesquisa_desenvolvimento", name: "Pesquisa e Desenvolvimento", coordinator: "Igor Salles", totalEmployees: 95 },
];

function buildTeams(): Team[] {
  return [
    // Tecnologia
    { id: "t01", sectorId: "tecnologia", name: "Desenvolvimento A", size: 42, schedule: "integral", requiredResources: ["videoconferencia"], requiresAccessibility: false, floorPreference: 7, priority: 1, proximityGroupId: "eng" },
    { id: "t02", sectorId: "tecnologia", name: "Desenvolvimento B", size: 18, schedule: "integral", requiredResources: ["videoconferencia"], requiresAccessibility: false, floorPreference: 7, priority: 2, proximityGroupId: "eng" },
    { id: "t03", sectorId: "tecnologia", name: "Infraestrutura", size: 14, schedule: "integral", requiredResources: ["computadores"], requiresAccessibility: false, floorPreference: 7, priority: 2, proximityGroupId: "eng" },
    { id: "t04", sectorId: "tecnologia", name: "QA / Testes", size: 16, schedule: "tarde", requiredResources: [], requiresAccessibility: false, floorPreference: 7, priority: 3, proximityGroupId: "eng" },
    { id: "t05", sectorId: "tecnologia", name: "Dados e IA", size: 20, schedule: "integral", requiredResources: ["computadores"], requiresAccessibility: true, floorPreference: 7, priority: 2, proximityGroupId: "eng" },

    // Recursos Humanos
    { id: "t06", sectorId: "rh", name: "RH", size: 28, schedule: "integral", requiredResources: [], requiresAccessibility: true, floorPreference: 5, priority: 2, proximityGroupId: null },
    { id: "t07", sectorId: "rh", name: "Recrutamento e Seleção", size: 12, schedule: "manha", requiredResources: ["videoconferencia"], requiresAccessibility: false, floorPreference: 5, priority: 3, proximityGroupId: null },

    // Financeiro
    { id: "t08", sectorId: "financeiro", name: "Financeiro", size: 54, schedule: "integral", requiredResources: [], requiresAccessibility: false, floorPreference: 4, priority: 1, proximityGroupId: "fin" },
    { id: "t09", sectorId: "financeiro", name: "Contabilidade", size: 22, schedule: "integral", requiredResources: [], requiresAccessibility: false, floorPreference: 4, priority: 2, proximityGroupId: "fin" },
    { id: "t10", sectorId: "financeiro", name: "Auditoria Interna", size: 9, schedule: "manha", requiredResources: [], requiresAccessibility: false, floorPreference: 4, priority: 3, proximityGroupId: "fin" },

    // Jurídico
    { id: "t11", sectorId: "juridico", name: "Contratos", size: 15, schedule: "integral", requiredResources: ["videoconferencia"], requiresAccessibility: true, floorPreference: 3, priority: 1, proximityGroupId: null },
    { id: "t12", sectorId: "juridico", name: "Compliance", size: 10, schedule: "tarde", requiredResources: [], requiresAccessibility: false, floorPreference: 3, priority: 3, proximityGroupId: null },

    // Marketing
    { id: "t13", sectorId: "marketing", name: "Marketing Digital", size: 24, schedule: "integral", requiredResources: ["quadro_branco"], requiresAccessibility: false, floorPreference: 6, priority: 2, proximityGroupId: "mkt" },
    { id: "t14", sectorId: "marketing", name: "Branding", size: 11, schedule: "tarde", requiredResources: ["quadro_branco"], requiresAccessibility: false, floorPreference: 6, priority: 3, proximityGroupId: "mkt" },
    { id: "t15", sectorId: "marketing", name: "Eventos", size: 8, schedule: "manha", requiredResources: [], requiresAccessibility: false, floorPreference: null, priority: 3, proximityGroupId: "mkt" },

    // Comercial
    { id: "t16", sectorId: "comercial", name: "Vendas Corporativas", size: 38, schedule: "integral", requiredResources: ["videoconferencia"], requiresAccessibility: false, floorPreference: 2, priority: 1, proximityGroupId: "com" },
    { id: "t17", sectorId: "comercial", name: "Sucesso do Cliente", size: 26, schedule: "integral", requiredResources: ["videoconferencia"], requiresAccessibility: false, floorPreference: 2, priority: 2, proximityGroupId: "com" },
    { id: "t18", sectorId: "comercial", name: "Parcerias", size: 14, schedule: "tarde", requiredResources: [], requiresAccessibility: false, floorPreference: 2, priority: 3, proximityGroupId: "com" },

    // Operações — inclui o caso de exceção citado no enunciado (Equipe Delta, 92 pessoas)
    { id: "t19", sectorId: "operacoes", name: "Operações Delta", size: 92, schedule: "integral", requiredResources: [], requiresAccessibility: false, floorPreference: 1, priority: 1, proximityGroupId: null },
    { id: "t20", sectorId: "operacoes", name: "Logística", size: 34, schedule: "integral", requiredResources: [], requiresAccessibility: false, floorPreference: 1, priority: 2, proximityGroupId: null },
    { id: "t21", sectorId: "operacoes", name: "Suporte ao Cliente", size: 28, schedule: "integral", requiredResources: ["videoconferencia"], requiresAccessibility: true, floorPreference: 1, priority: 2, proximityGroupId: null },

    // Pesquisa e Desenvolvimento
    { id: "t22", sectorId: "pesquisa_desenvolvimento", name: "P&D Produtos", size: 19, schedule: "integral", requiredResources: ["bancada_lab", "computadores"], requiresAccessibility: false, floorPreference: 8, priority: 2, proximityGroupId: null },
    { id: "t23", sectorId: "pesquisa_desenvolvimento", name: "Inovação", size: 13, schedule: "tarde", requiredResources: ["computadores"], requiresAccessibility: false, floorPreference: 8, priority: 3, proximityGroupId: null },
    { id: "t24", sectorId: "pesquisa_desenvolvimento", name: "Laboratório de Testes", size: 16, schedule: "manha", requiredResources: ["bancada_lab"], requiresAccessibility: true, floorPreference: 8, priority: 1, proximityGroupId: null },
  ];
}

// Restrição de exemplo: Comercial e Jurídico não podem compartilhar o mesmo andar no
// mesmo horário (evita conflito de confidencialidade de negociações em andamento).
const SECTOR_EXCLUSIONS: SectorExclusion[] = [
  {
    id: "excl01",
    sectorAId: "comercial",
    sectorBId: "juridico",
    reason: "Confidencialidade de negociações — setores não podem compartilhar o mesmo andar no mesmo horário.",
  },
];

export function seedRooms(): Room[] {
  return buildRooms();
}

export function seedSectors(): Sector[] {
  return SECTORS;
}

export function seedTeams(): Team[] {
  return buildTeams();
}

export function seedSectorExclusions(): SectorExclusion[] {
  return SECTOR_EXCLUSIONS;
}
