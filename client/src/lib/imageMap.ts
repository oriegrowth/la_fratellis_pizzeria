const pizzaImageFiles: Record<string, string> = {
  alho: "pizza_alho_2a622e0e.webp",
  atum: "pizza_atum_431fb760.webp",
  bacon: "pizza_bacon_bb66d14d.webp",
  baiana: "pizza_baiana_2667d91c.webp",
  bauru: "pizza_bauru_09ee9b41.webp",
  brocolis: "pizza_brocolis_f47812bc.webp",
  caipira: "pizza_caipira_5653ff8a.webp",
  calabresa: "pizza_calabresa_6459bbcb.webp",
  "calabresa especial": "pizza_calabresa_especial_03b39d74.webp",
  calamussa: "pizza_calamussa_6c8ce601.webp",
  chocolate: "pizza_chocolate_b422f27c.webp",
  "dois queijos": "pizza_dois_queijos_6c17506e.webp",
  "frango com batata palha": "pizza_frango_batata_palha_00e2295f.webp",
  "frango com catupiry": "pizza_frango_catupiry_4097c9b1.webp",
  "frango com cheddar": "pizza_frango_cheddar_93c9b62a.webp",
  "la fratellis": "pizza_la_fratellis_9f4b0ead.webp",
  marguerita: "pizza_marguerita_2cd5c73d.webp",
  milho: "pizza_milho_df344383.webp",
  mussarela: "pizza_mussarela_3bfbf082.webp",
  nevada: "pizza_nevada_8daff78e.webp",
  "nutella com morango": "pizza_nutella_morango_284296bd.webp",
  palmito: "pizza_palmito_f7d1e04c.webp",
  "peito de peru": "pizza_peito_peru_0cab38cb.webp",
  pepperoni: "pizza_pepperoni_812e273f.webp",
  portuguesa: "pizza_portuguesa_bfedc480.webp",
  prestigio: "pizza_prestigio_c53fe5b4.webp",
  "quatro queijos": "pizza_quatro_queijos_43d0afd1.webp",
  rucula: "pizza_rucula_7044cb1b.webp",
  sensacao: "pizza_sensacao_51855498.webp",
  siciliana: "pizza_siciliana_c936cda7.webp",
  toscana: "pizza_toscana_4913b1ba.webp",
  vegetariana: "pizza_vegetariana_b0efffac.webp",
};

function normalizePizzaName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");
}

export function getImageUrl(pizzaName: string): string {
  const fileName = pizzaImageFiles[normalizePizzaName(pizzaName)];
  return fileName ? `/images/pizzas/${fileName}` : "/images/pizzaria_perdizes_sp.png";
}

export function placeholderDataUrl(): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'><rect width='100%' height='100%' fill='%23f3f4f6'/><g fill='%23d1d5db' font-family='Poppins, sans-serif' font-weight='600' font-size='20'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>Imagem indisponivel</text></g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
