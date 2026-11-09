export const SITE = {
  name: "Arena Leste Multi Sports",
  shortName: "Arena Leste",
  url: "https://arena-leste.onrender.com",
  logoUrl: "https://arena-leste.onrender.com/arena-leste-logo.png",
  whatsapp: "5569993566796",
  phoneDisplay: "(69) 99356-6796",
  instagram: "https://www.instagram.com/arenalesteoficial/",
  reelTour: "https://www.instagram.com/reel/DVd5VWMALKs/",
  beacons: "https://beacons.ai/arenaleste",
  socialImage: "https://arena-leste.onrender.com/images/torneio-novembro-azul-social.jpg",
  units: [
    {
      id: "unidade-1",
      name: "Arena Leste 1 — Matriz",
      address: "Rua Jequié, 6820 — Cuniã, Porto Velho/RO",
      mapQuery: "Arena Leste 1, Rua Jequié 6820, Cuniã, Porto Velho, RO",
      note: "Atrás da Academia de Sena, conforme a publicação oficial.",
    },
    {
      id: "unidade-2",
      name: "Arena Leste 2",
      address: "Avenida Pinheiro Machado, 6706 — Porto Velho/RO",
      mapQuery: "Arena Leste 2, Avenida Pinheiro Machado 6706, Porto Velho, RO",
      note: "Número indicado na bio atual enviada pelo proprietário; publicações antigas mostram números diferentes. Confirme o ponto pelo WhatsApp antes de sair.",
    },
  ],
} as const;

export type ArenaUnit = (typeof SITE.units)[number];

export const TOURNAMENT = {
  name: "Torneio Novembro Azul",
  category: "Quarteto masculino",
  date: "28 de novembro de 2026",
  dateShort: "28/11/2026",
  time: "15h",
  countdownAt: "2026-11-28T15:00:00-04:00",
  location: "Local a confirmar com a organização",
  entryFee: "R$ 150 por equipe",
  prizes: [
    { place: "1º lugar", amount: "R$ 800", extra: "troféu e medalhas" },
    { place: "2º lugar", amount: "R$ 400", extra: "troféu e medalhas" },
    { place: "3º lugar", amount: "R$ 200", extra: "troféu e medalhas" },
  ],
} as const;

export const waLink = (text: string) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

export const bookingLink = (unit: ArenaUnit) =>
  waLink(
    `Olá! Vim pelo site da ${SITE.shortName} e gostaria de agendar um horário na ${unit.name}. Podem me informar a disponibilidade?`,
  );

export const mapSearchLink = (unit: ArenaUnit) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(unit.mapQuery)}`;

export const mapEmbedLink = (unit: ArenaUnit) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(unit.mapQuery)}&output=embed`;
