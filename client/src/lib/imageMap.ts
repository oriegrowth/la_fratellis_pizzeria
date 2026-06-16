// Mapa de URLs de imagens otimizadas (WebP)
export const imageMap: Record<string, string> = {
  'Alho': '/manus-storage/pizza_alho_2a622e0e.webp',
  'Atum': '/manus-storage/pizza_atum_431fb760.webp',
  'Bacon': '/manus-storage/pizza_bacon_bb66d14d.webp',
  'Baiana': '/manus-storage/pizza_baiana_2667d91c.webp',
  'Bauru': '/manus-storage/pizza_bauru_09ee9b41.webp',
  'Brócolis': '/manus-storage/pizza_brocolis_f47812bc.webp',
  'Caipira': '/manus-storage/pizza_caipira_5653ff8a.webp',
  'Calabresa': '/manus-storage/pizza_calabresa_6459bbcb.webp',
  'Calabresa Especial': '/manus-storage/pizza_calabresa_especial_03b39d74.webp',
  'Calamussa': '/manus-storage/pizza_calamussa_6c8ce601.webp',
  'Chocolate': '/manus-storage/pizza_chocolate_b422f27c.webp',
  'Dois Queijos': '/manus-storage/pizza_dois_queijos_6c17506e.webp',
  'Frango com Batata Palha': '/manus-storage/pizza_frango_batata_palha_00e2295f.webp',
  'Frango com Catupiry': '/manus-storage/pizza_frango_catupiry_4097c9b1.webp',
  'Frango com Cheddar': '/manus-storage/pizza_frango_cheddar_93c9b62a.webp',
  'La Fratellis': '/manus-storage/pizza_la_fratellis_9f4b0ead.webp',
  'Marguerita': '/manus-storage/pizza_marguerita_2cd5c73d.webp',
  'Milho': '/manus-storage/pizza_milho_df344383.webp',
  'Mussarela': '/manus-storage/pizza_mussarela_3bfbf082.webp',
  'Nevada': '/manus-storage/pizza_nevada_8daff78e.webp',
  'Nutela com Morango': '/manus-storage/pizza_nutella_morango_284296bd.webp',
  'Palmito': '/manus-storage/pizza_palmito_f7d1e04c.webp',
  'Peito de Peru': '/manus-storage/pizza_peito_peru_0cab38cb.webp',
  'Pepperoni': '/manus-storage/pizza_pepperoni_812e273f.webp',
  'Portuguesa': '/manus-storage/pizza_portuguesa_bfedc480.webp',
  'Prestígio': '/manus-storage/pizza_prestigio_c53fe5b4.webp',
  'Quatro Queijos': '/manus-storage/pizza_quatro_queijos_43d0afd1.webp',
  'Rúcula': '/manus-storage/pizza_rucula_7044cb1b.webp',
  'Sensação': '/manus-storage/pizza_sensacao_51855498.webp',
  'Siciliana': '/manus-storage/pizza_siciliana_c936cda7.webp',
  'Toscana': '/manus-storage/pizza_toscana_4913b1ba.webp',
  'Vegetariana': '/manus-storage/pizza_vegetariana_b0efffac.webp',
};

export function getImageUrl(pizzaName: string): string {
  return imageMap[pizzaName] || '/manus-storage/pizza_placeholder.webp';
}
