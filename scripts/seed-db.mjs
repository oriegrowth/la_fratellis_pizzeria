import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'la_fratellis',
  port: process.env.DB_PORT || 3306,
});

const pizzas = [
  // Clássicas
  { name: 'Alho', ingredients: 'Molho de tomate, alho frito, mussarela, cebola, orégano, azeitonas', category: 'classica', priceSmall: 47.99, priceLarge: 70.99, image: 'pizza_alho_2a622e0e' },
  { name: 'Atum', ingredients: 'Molho de tomate, atum, cebola, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_atum_431fb760' },
  { name: 'Bacon', ingredients: 'Molho de tomate, bacon, mussarela, cebola, orégano, azeitonas', category: 'classica', priceSmall: 50.99, priceLarge: 73.99, image: 'pizza_bacon_bb66d14d' },
  { name: 'Baiana', ingredients: 'Molho de tomate, calabresa, ovos, cebola, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 51.99, priceLarge: 74.99, image: 'pizza_baiana_2667d91c' },
  { name: 'Bauru', ingredients: 'Molho de Tomate, mussarela, presunto, tomate, cebola, orégano, azeitonas', category: 'classica', priceSmall: 50.99, priceLarge: 73.99, image: 'pizza_bauru_09ee9b41' },
  { name: 'Caipira', ingredients: 'Molho de tomate, frango, milho, mussarela, tomate, orégano, azeitonas', category: 'classica', priceSmall: 51.99, priceLarge: 74.99, image: 'pizza_caipira_5653ff8a' },
  { name: 'Calabresa', ingredients: 'Molho de tomate, calabresa, cebola, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 45.99, priceLarge: 69.99, image: 'pizza_calabresa_6459bbcb' },
  { name: 'Portuguesa', ingredients: 'Molho de Tomate, mussarela, presunto, ovos, cebola, azeitona, ervilha e orégano', category: 'classica', priceSmall: 52.99, priceLarge: 75.99, image: 'pizza_portuguesa_bfedc480' },
  { name: 'La Fratellis', ingredients: 'Molho de tomate, presunto, ovos, bacon, mussarela, cheddar, orégano, azeitonas', category: 'classica', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_la_fratellis_9f4b0ead' },
  { name: 'Calabresa Especial', ingredients: 'Molho de tomate, calabresa, catupiry, mussarela, cebola, orégano, azeitonas', category: 'classica', priceSmall: 51.99, priceLarge: 74.99, image: 'pizza_calabresa_especial_03b39d74' },
  { name: 'Calamussa', ingredients: 'Molho de tomate, calabresa, mussarela, cebola, orégano, azeitonas', category: 'classica', priceSmall: 45.99, priceLarge: 68.99, image: 'pizza_calamussa_6c8ce601' },
  { name: 'Brócolis', ingredients: 'Molho de tomate, brócolis, bacon, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 51.99, priceLarge: 74.99, image: 'pizza_brocolis_f47812bc' },
  { name: 'Frango com Batata Palha', ingredients: 'Molho de tomate, frango desfiado, catupiry, batata palha, azeitonas', category: 'classica', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_frango_batata_palha_00e2295f' },
  { name: 'Frango com Catupiry', ingredients: 'Molho de tomate, frango desfiado, catupiry, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 52.99, priceLarge: 75.99, image: 'pizza_frango_catupiry_4097c9b1' },
  { name: 'Frango com Cheddar', ingredients: 'Molho de tomate, frango desfiado, cheddar, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 52.99, priceLarge: 75.99, image: 'pizza_frango_cheddar_93c9b62a' },
  { name: 'Milho', ingredients: 'Molho de tomate, milho, mussarela, tomate, orégano, azeitonas', category: 'classica', priceSmall: 45.99, priceLarge: 68.99, image: 'pizza_milho_df344383' },
  { name: 'Mussarela', ingredients: 'Molho de tomate, mussarela, tomate, orégano, azeitonas', category: 'classica', priceSmall: 45.99, priceLarge: 68.99, image: 'pizza_mussarela_3bfbf082' },
  { name: 'Palmito', ingredients: 'Molho de tomate, palmito, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 50.99, priceLarge: 73.99, image: 'pizza_palmito_f7d1e04c' },

  // Especiais
  { name: 'Peito de Peru', ingredients: 'Molho de tomate, peito de peru, mussarela, tomate, orégano, azeitonas', category: 'especial', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_peito_peru_0cab38cb' },
  { name: 'Pepperoni', ingredients: 'Molho de tomate, pepperoni, mussarela, orégano, azeitonas', category: 'especial', priceSmall: 51.99, priceLarge: 74.99, image: 'pizza_pepperoni_812e273f' },
  { name: 'Rúcula', ingredients: 'Molho de tomate, rúcula, mussarela, cogumelo, orégano, azeitonas', category: 'especial', priceSmall: 55.99, priceLarge: 78.99, image: 'pizza_rucula_7044cb1b' },
  { name: 'Dois Queijos', ingredients: 'Molho de tomate, mussarela, catupiry, orégano, azeitonas', category: 'especial', priceSmall: 52.99, priceLarge: 75.99, image: 'pizza_dois_queijos_6c17506e' },
  { name: 'Marguerita', ingredients: 'Molho de tomate, mussarela, parmesão, manjericão, tomate, orégano, azeitonas', category: 'especial', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_marguerita_2cd5c73d' },
  { name: 'Quatro Queijos', ingredients: 'Molho de tomate, catupiry, mussarela, provolone, parmesão, orégano, azeitonas', category: 'especial', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_quatro_queijos_43d0afd1' },
  { name: 'Siciliana', ingredients: 'Molho de tomate, bacon, mussarela, cogumelo, parmesão, tomate, orégano, azeitonas', category: 'especial', priceSmall: 54.99, priceLarge: 77.99, image: 'pizza_siciliana_c936cda7' },
  { name: 'Toscana', ingredients: 'Molho de tomate, calabresa, mussarela, tomate, orégano, azeitonas', category: 'especial', priceSmall: 52.99, priceLarge: 75.99, image: 'pizza_toscana_4913b1ba' },
  { name: 'Vegetariana', ingredients: 'Molho de tomate, palmito, cogumelo, brócolis, mussarela, orégano, azeitonas', category: 'especial', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_vegetariana_b0efffac' },

  // Doces
  { name: 'Chocolate', ingredients: 'Chocolate granulado', category: 'doce', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_chocolate_b422f27c' },
  { name: 'Nutella com Morango', ingredients: 'Nutella, morango', category: 'doce', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_nutella_morango_284296bd' },
  { name: 'Nevada', ingredients: 'Banana, açúcar, canela, chocolate branco', category: 'doce', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_nevada_8daff78e' },
  { name: 'Prestígio', ingredients: 'Chocolate, coco ralado', category: 'doce', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_prestigio_c53fe5b4' },
  { name: 'Sensação', ingredients: 'Chocolate, morango', category: 'doce', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_sensacao_51855498' },
];

try {
  // Insert pizzas
  for (const pizza of pizzas) {
    const imageUrl = `/images/pizzas/${pizza.image}.webp`;
    await connection.execute(
      'INSERT INTO pizzas (name, ingredients, category, priceSmall, priceLarge, imageUrl) VALUES (?, ?, ?, ?, ?, ?)',
      [pizza.name, pizza.ingredients, pizza.category, pizza.priceSmall, pizza.priceLarge, imageUrl]
    );
  }
  console.log('✓ Pizzas inserted successfully');

  // Insert promotion
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  
  await connection.execute(
    'INSERT INTO promotions (title, description, details, isActive, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?)',
    [
      '2 Pizzas por R$89',
      'Aproveite nossa promoção especial: 2 pizzas por apenas R$89 com entrega grátis em Perdizes e Região',
      'Válida para qualquer sabor. Entrega grátis em Perdizes e arredores.',
      true,
      startDate,
      endDate
    ]
  );
  console.log('✓ Promotion inserted successfully');

  await connection.end();
  console.log('✓ Database seeding completed!');
} catch (error) {
  console.error('Error seeding database:', error);
  process.exit(1);
}
