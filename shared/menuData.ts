export type PizzaCategory = "classica" | "especial" | "doce";

export type MenuPizza = {
  id: number;
  name: string;
  description: string | null;
  ingredients: string;
  category: PizzaCategory;
  priceSmall: number;
  priceLarge: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MenuPromotion = {
  id: number;
  title: string;
  description: string;
  details: string | null;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const now = new Date("2026-06-16T12:00:00.000Z");

const image = (key: string) => {
  return `/images/pizzas/${key}.webp`;
};

export const fallbackPizzas: MenuPizza[] = [
  { id: 1, name: "Alho", description: null, ingredients: "Molho de tomate, alho frito, mussarela, cebola, oregano, azeitonas", category: "classica", priceSmall: 47.99, priceLarge: 70.99, imageUrl: image("pizza_alho_2a622e0e"), createdAt: now, updatedAt: now },
  { id: 2, name: "Atum", description: null, ingredients: "Molho de tomate, atum, cebola, mussarela, oregano, azeitonas", category: "classica", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_atum_431fb760"), createdAt: now, updatedAt: now },
  { id: 3, name: "Bacon", description: null, ingredients: "Molho de tomate, bacon, mussarela, cebola, oregano, azeitonas", category: "classica", priceSmall: 50.99, priceLarge: 73.99, imageUrl: image("pizza_bacon_bb66d14d"), createdAt: now, updatedAt: now },
  { id: 4, name: "Baiana", description: null, ingredients: "Molho de tomate, calabresa, ovos, cebola, mussarela, oregano, azeitonas", category: "classica", priceSmall: 51.99, priceLarge: 74.99, imageUrl: image("pizza_baiana_2667d91c"), createdAt: now, updatedAt: now },
  { id: 5, name: "Bauru", description: null, ingredients: "Molho de tomate, mussarela, presunto, tomate, cebola, oregano, azeitonas", category: "classica", priceSmall: 50.99, priceLarge: 73.99, imageUrl: image("pizza_bauru_09ee9b41"), createdAt: now, updatedAt: now },
  { id: 6, name: "Caipira", description: null, ingredients: "Molho de tomate, frango, milho, mussarela, tomate, oregano, azeitonas", category: "classica", priceSmall: 51.99, priceLarge: 74.99, imageUrl: image("pizza_caipira_5653ff8a"), createdAt: now, updatedAt: now },
  { id: 7, name: "Calabresa", description: null, ingredients: "Molho de tomate, calabresa, cebola, mussarela, oregano, azeitonas", category: "classica", priceSmall: 45.99, priceLarge: 69.99, imageUrl: image("pizza_calabresa_6459bbcb"), createdAt: now, updatedAt: now },
  { id: 8, name: "Portuguesa", description: null, ingredients: "Molho de tomate, mussarela, presunto, ovos, cebola, azeitona, ervilha e oregano", category: "classica", priceSmall: 52.99, priceLarge: 75.99, imageUrl: image("pizza_portuguesa_bfedc480"), createdAt: now, updatedAt: now },
  { id: 9, name: "La Fratellis", description: null, ingredients: "Molho de tomate, presunto, ovos, bacon, mussarela, cheddar, oregano, azeitonas", category: "classica", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_la_fratellis_9f4b0ead"), createdAt: now, updatedAt: now },
  { id: 10, name: "Calabresa Especial", description: null, ingredients: "Molho de tomate, calabresa, catupiry, mussarela, cebola, oregano, azeitonas", category: "classica", priceSmall: 51.99, priceLarge: 74.99, imageUrl: image("pizza_calabresa_especial_03b39d74"), createdAt: now, updatedAt: now },
  { id: 11, name: "Calamussa", description: null, ingredients: "Molho de tomate, calabresa, mussarela, cebola, oregano, azeitonas", category: "classica", priceSmall: 45.99, priceLarge: 68.99, imageUrl: image("pizza_calamussa_6c8ce601"), createdAt: now, updatedAt: now },
  { id: 12, name: "Brocolis", description: null, ingredients: "Molho de tomate, brocolis, bacon, mussarela, oregano, azeitonas", category: "classica", priceSmall: 51.99, priceLarge: 74.99, imageUrl: image("pizza_brocolis_f47812bc"), createdAt: now, updatedAt: now },
  { id: 13, name: "Frango com Batata Palha", description: null, ingredients: "Molho de tomate, frango desfiado, catupiry, batata palha, azeitonas", category: "classica", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_frango_batata_palha_00e2295f"), createdAt: now, updatedAt: now },
  { id: 14, name: "Frango com Catupiry", description: null, ingredients: "Molho de tomate, frango desfiado, catupiry, mussarela, oregano, azeitonas", category: "classica", priceSmall: 52.99, priceLarge: 75.99, imageUrl: image("pizza_frango_catupiry_4097c9b1"), createdAt: now, updatedAt: now },
  { id: 15, name: "Frango com Cheddar", description: null, ingredients: "Molho de tomate, frango desfiado, cheddar, mussarela, oregano, azeitonas", category: "classica", priceSmall: 52.99, priceLarge: 75.99, imageUrl: image("pizza_frango_cheddar_93c9b62a"), createdAt: now, updatedAt: now },
  { id: 16, name: "Milho", description: null, ingredients: "Molho de tomate, milho, mussarela, tomate, oregano, azeitonas", category: "classica", priceSmall: 45.99, priceLarge: 68.99, imageUrl: image("pizza_milho_df344383"), createdAt: now, updatedAt: now },
  { id: 17, name: "Mussarela", description: null, ingredients: "Molho de tomate, mussarela, tomate, oregano, azeitonas", category: "classica", priceSmall: 45.99, priceLarge: 68.99, imageUrl: image("pizza_mussarela_3bfbf082"), createdAt: now, updatedAt: now },
  { id: 18, name: "Palmito", description: null, ingredients: "Molho de tomate, palmito, mussarela, oregano, azeitonas", category: "classica", priceSmall: 50.99, priceLarge: 73.99, imageUrl: image("pizza_palmito_f7d1e04c"), createdAt: now, updatedAt: now },
  { id: 19, name: "Peito de Peru", description: null, ingredients: "Molho de tomate, peito de peru, mussarela, tomate, oregano, azeitonas", category: "especial", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_peito_peru_0cab38cb"), createdAt: now, updatedAt: now },
  { id: 20, name: "Pepperoni", description: null, ingredients: "Molho de tomate, pepperoni, mussarela, oregano, azeitonas", category: "especial", priceSmall: 51.99, priceLarge: 74.99, imageUrl: image("pizza_pepperoni_812e273f"), createdAt: now, updatedAt: now },
  { id: 21, name: "Rucula", description: null, ingredients: "Molho de tomate, rucula, mussarela, cogumelo, oregano, azeitonas", category: "especial", priceSmall: 55.99, priceLarge: 78.99, imageUrl: image("pizza_rucula_7044cb1b"), createdAt: now, updatedAt: now },
  { id: 22, name: "Dois Queijos", description: null, ingredients: "Molho de tomate, mussarela, catupiry, oregano, azeitonas", category: "especial", priceSmall: 52.99, priceLarge: 75.99, imageUrl: image("pizza_dois_queijos_6c17506e"), createdAt: now, updatedAt: now },
  { id: 23, name: "Marguerita", description: null, ingredients: "Molho de tomate, mussarela, parmesao, manjericao, tomate, oregano, azeitonas", category: "especial", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_marguerita_2cd5c73d"), createdAt: now, updatedAt: now },
  { id: 24, name: "Quatro Queijos", description: null, ingredients: "Molho de tomate, catupiry, mussarela, provolone, parmesao, oregano, azeitonas", category: "especial", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_quatro_queijos_43d0afd1"), createdAt: now, updatedAt: now },
  { id: 25, name: "Siciliana", description: null, ingredients: "Molho de tomate, bacon, mussarela, cogumelo, parmesao, tomate, oregano, azeitonas", category: "especial", priceSmall: 54.99, priceLarge: 77.99, imageUrl: image("pizza_siciliana_c936cda7"), createdAt: now, updatedAt: now },
  { id: 26, name: "Toscana", description: null, ingredients: "Molho de tomate, calabresa, mussarela, tomate, oregano, azeitonas", category: "especial", priceSmall: 52.99, priceLarge: 75.99, imageUrl: image("pizza_toscana_4913b1ba"), createdAt: now, updatedAt: now },
  { id: 27, name: "Vegetariana", description: null, ingredients: "Molho de tomate, palmito, cogumelo, brocolis, mussarela, oregano, azeitonas", category: "especial", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_vegetariana_b0efffac"), createdAt: now, updatedAt: now },
  { id: 28, name: "Chocolate", description: null, ingredients: "Chocolate granulado", category: "doce", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_chocolate_b422f27c"), createdAt: now, updatedAt: now },
  { id: 29, name: "Nutella com Morango", description: null, ingredients: "Nutella, morango", category: "doce", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_nutella_morango_284296bd"), createdAt: now, updatedAt: now },
  { id: 30, name: "Nevada", description: null, ingredients: "Banana, acucar, canela, chocolate branco", category: "doce", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_nevada_8daff78e"), createdAt: now, updatedAt: now },
  { id: 31, name: "Prestigio", description: null, ingredients: "Chocolate, coco ralado", category: "doce", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_prestigio_c53fe5b4"), createdAt: now, updatedAt: now },
  { id: 32, name: "Sensacao", description: null, ingredients: "Chocolate, morango", category: "doce", priceSmall: 53.99, priceLarge: 76.99, imageUrl: image("pizza_sensacao_51855498"), createdAt: now, updatedAt: now },
];

export const fallbackPromotions: MenuPromotion[] = [
  {
    id: 1,
    title: "2 Pizzas por R$89",
    description: "Promocao especial para pedir em dobro com entrega gratis em Perdizes e regiao.",
    details: "Consulte sabores participantes pelo WhatsApp ao finalizar.",
    isActive: true,
    startDate: now,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  },
];
