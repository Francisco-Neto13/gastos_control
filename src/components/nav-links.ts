// Fonte unica dos itens de navegacao, agrupados por area para a sidebar.
// Os rotulos e destinos sao exatamente os mesmos da navegacao anterior.
export interface NavLink {
  href: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  group: string;
  links: NavLink[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    group: "Visão geral",
    links: [
      { href: "/", label: "Dashboard", icon: "grid" },
      { href: "/compare", label: "Comparação", icon: "chart" },
      { href: "/monitoring", label: "Monitoramento", icon: "pulse" },
    ],
  },
  {
    group: "Cadastros",
    links: [
      { href: "/rooms", label: "Salas", icon: "door" },
      { href: "/sectors", label: "Setores e Equipes", icon: "users" },
    ],
  },
  {
    group: "Operação",
    links: [
      { href: "/allocate", label: "Gerar Alocação", icon: "spark" },
      { href: "/exceptions", label: "Exceções", icon: "alert" },
      { href: "/governance", label: "Governança", icon: "shield" },
    ],
  },
];

export const ALL_LINKS: NavLink[] = NAV_GROUPS.flatMap((g) => g.links);
