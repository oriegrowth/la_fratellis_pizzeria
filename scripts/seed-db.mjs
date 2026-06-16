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
  { name: 'Alho', ingredients: 'Molho de tomate, alho frito, mussarela, cebola, orégano, azeitonas', category: 'classica', priceSmall: 47.99, priceLarge: 70.99, image: 'pizza_alho' },
  { name: 'Atum', ingredients: 'Molho de tomate, atum, cebola, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_atum' },
  { name: 'Bacon', ingredients: 'Molho de tomate, bacon, mussarela, cebola, orégano, azeitonas', category: 'classica', priceSmall: 50.99, priceLarge: 73.99, image: 'pizza_bacon' },
  { name: 'Baiana', ingredients: 'Molho de tomate, calabresa, ovos, cebola, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 51.99, priceLarge: 74.99, image: 'pizza_baiana' },
  { name: 'Bauru', ingredients: 'Molho de Tomate, mussarela, presunto, tomate, cebola, orégano, azeitonas', category: 'classica', priceSmall: 50.99, priceLarge: 73.99, image: 'pizza_bauru' },
  { name: 'Caipira', ingredients: 'Molho de tomate, frango, milho, mussarela, tomate, orégano, azeitonas', category: 'classica', priceSmall: 51.99, priceLarge: 74.99, image: 'pizza_caipira' },
  { name: 'Calabresa', ingredients: 'Molho de tomate, calabresa, cebola, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 45.99, priceLarge: 69.99, image: 'pizza_calabresa' },
  { name: 'Portuguesa', ingredients: 'Molho de Tomate, mussarela, presunto, ovos, cebola, azeitona, ervilha e orégano', category: 'classica', priceSmall: 52.99, priceLarge: 75.99, image: 'pizza_portuguesa' },
  { name: 'La Fratellis', ingredients: 'Molho de tomate, presunto, ovos, bacon, mussarela, cheddar, orégano, azeitonas', category: 'classica', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_la_fratellis' },
  { name: 'Calabresa Especial', ingredients: 'Molho de tomate, calabresa, catupiry, mussarela, cebola, orégano, azeitonas', category: 'classica', priceSmall: 51.99, priceLarge: 74.99, image: 'pizza_calabresa_especial' },
  { name: 'Calamussa', ingredients: 'Molho de tomate, calabresa, mussarela, cebola, orégano, azeitonas', category: 'classica', priceSmall: 45.99, priceLarge: 68.99, image: 'pizza_calamussa' },
  { name: 'Brócolis', ingredients: 'Molho de tomate, brócolis, bacon, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 51.99, priceLarge: 74.99, image: 'pizza_brocolis' },
  { name: 'Frango com Batata Palha', ingredients: 'Molho de tomate, frango desfiado, catupiry, batata palha, azeitonas', category: 'classica', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_frango_batata_palha' },
  { name: 'Frango com Catupiry', ingredients: 'Molho de tomate, frango desfiado, catupiry, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 52.99, priceLarge: 75.99, image: 'pizza_frango_catupiry' },
  { name: 'Frango com Cheddar', ingredients: 'Molho de tomate, frango desfiado, cheddar, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 52.99, priceLarge: 75.99, image: 'pizza_frango_cheddar' },
  { name: 'Milho', ingredients: 'Molho de tomate, milho, mussarela, tomate, orégano, azeitonas', category: 'classica', priceSmall: 45.99, priceLarge: 68.99, image: 'pizza_milho' },
  { name: 'Mussarela', ingredients: 'Molho de tomate, mussarela, tomate, orégano, azeitonas', category: 'classica', priceSmall: 45.99, priceLarge: 68.99, image: 'pizza_mussarela' },
  { name: 'Palmito', ingredients: 'Molho de tomate, palmito, mussarela, orégano, azeitonas', category: 'classica', priceSmall: 50.99, priceLarge: 73.99, image: 'pizza_palmito' },

  // Especiais
  { name: 'Peito de Peru', ingredients: 'Molho de tomate, peito de peru, mussarela, tomate, orégano, azeitonas', category: 'especial', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_peito_peru' },
  { name: 'Pepperoni', ingredients: 'Molho de tomate, pepperoni, mussarela, orégano, azeitonas', category: 'especial', priceSmall: 51.99, priceLarge: 74.99, image: 'pizza_pepperoni' },
  { name: 'Rúcula', ingredients: 'Molho de tomate, rúcula, mussarela, cogumelo, orégano, azeitonas', category: 'especial', priceSmall: 55.99, priceLarge: 78.99, image: 'pizza_rucula' },
  { name: 'Dois Queijos', ingredients: 'Molho de tomate, mussarela, catupiry, orégano, azeitonas', category: 'especial', priceSmall: 52.99, priceLarge: 75.99, image: 'pizza_dois_queijos' },
  { name: 'Marguerita', ingredients: 'Molho de tomate, mussarela, parmesão, manjericão, tomate, orégano, azeitonas', category: 'especial', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_marguerita' },
  { name: 'Quatro Queijos', ingredients: 'Molho de tomate, catupiry, mussarela, provolone, parmesão, orégano, azeitonas', category: 'especial', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_quatro_queijos' },
  { name: 'Siciliana', ingredients: 'Molho de tomate, bacon, mussarela, cogumelo, parmesão, tomate, orégano, azeitonas', category: 'especial', priceSmall: 54.99, priceLarge: 77.99, image: 'pizza_siciliana' },
  { name: 'Toscana', ingredients: 'Molho de tomate, calabresa, mussarela, tomate, orégano, azeitonas', category: 'especial', priceSmall: 52.99, priceLarge: 75.99, image: 'pizza_toscana' },
  { name: 'Vegetariana', ingredients: 'Molho de tomate, palmito, cogumelo, brócolis, mussarela, orégano, azeitonas', category: 'especial', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_vegetariana' },

  // Doces
  { name: 'Chocolate', ingredients: 'Chocolate granulado', category: 'doce', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_chocolate' },
  { name: 'Nutella com Morango', ingredients: 'Nutella, morango', category: 'doce', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_nutella_morango' },
  { name: 'Nevada', ingredients: 'Banana, açúcar, canela, chocolate branco', category: 'doce', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_nevada' },
  { name: 'Prestígio', ingredients: 'Chocolate, coco ralado', category: 'doce', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_prestigio' },
  { name: 'Sensação', ingredients: 'Chocolate, morango', category: 'doce', priceSmall: 53.99, priceLarge: 76.99, image: 'pizza_sensacao' },
];

const imageBaseUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663720809420/FU6gKGYYRQTn2wanmvuX3c';

try {
  // Insert pizzas
  for (const pizza of pizzas) {
    const imageUrl = `${imageBaseUrl}/${pizza.image}-Z7uAhZSNPZRncYc4vzBV8k.png`;
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
