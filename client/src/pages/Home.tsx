import { ShoppingCart, Menu } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { getImageUrl } from '@/lib/imageMap';
import { useState, useEffect, useMemo } from 'react';

export default function Home() {
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cartCount, setCartCount] = useState(0);

  // Fetch pizzas and promotions
  const { data: pizzas = [] } = trpc.pizzas.getAll.useQuery();
  const { data: promotions = [] } = trpc.promotions.getActive.useQuery();
  const { data: cartItems = [] } = trpc.cart.getItems.useQuery({ sessionId: 'default' });

  // Update cart count
  useEffect(() => {
    setCartCount(cartItems.length);
  }, [cartItems]);

  // Filter pizzas by category and search
  const filteredPizzas = useMemo(() => {
    return pizzas.filter((pizza: any) => {
      const matchesCategory = selectedCategory === 'all' || pizza.category === selectedCategory;
      const matchesSearch = pizza.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pizza.ingredients.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [pizzas, selectedCategory, searchTerm]);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'classica', label: 'Clássicas' },
    { id: 'especial', label: 'Especiais' },
    { id: 'doce', label: 'Doces' },
  ];

  const handleAddToCart = (pizzaId: number) => {
    navigate(`/menu?pizza=${pizzaId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white">
        {/* Top bar with time and status icons */}
        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-600">
          <span>17:23</span>
          <div className="flex gap-1">
            <span>📍</span>
            <span>📳</span>
            <span>📶</span>
            <span>📡</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Search bar and icons */}
        <div className="px-4 py-3 flex items-center gap-3">
          <button className="text-gray-600">
            <Menu size={24} />
          </button>
          
          <h1 className="flex-1 text-center font-bold text-lg">La Fratellis</h1>

          <button className="text-gray-600" onClick={() => navigate('/cart')}>
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-gray-100">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      <main className="pb-24">
        {/* Promotions Hero */}
        {promotions.length > 0 && (
          <div className="px-4 py-4">
            {promotions.map((promo: any) => (
              <div
                key={promo.id}
                className="mb-4 rounded-2xl overflow-hidden relative h-48 flex items-end justify-start"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/20"></div>
                
                {/* Content */}
                <div className="relative z-10 p-6 w-full">
                  <h3 className="font-bold text-2xl text-white mb-2">{promo.title}</h3>
                  <p className="text-sm text-white/90 mb-3">{promo.description}</p>
                  <p className="font-bold text-3xl text-yellow-300">R${(parseFloat(promo.price) || 0).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products list */}
        <div className="px-4 py-4">
          {filteredPizzas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma pizza encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPizzas.map((pizza: any) => (
                <div
                  key={pizza.id}
                  className="flex gap-4 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
                >
                  {/* Left side - Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-1">{pizza.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pizza.ingredients}</p>
                    
                    <div className="flex items-baseline gap-2">
                      <p className="font-bold text-lg">R${(parseFloat(pizza.priceSmall) || 0).toFixed(2)}</p>
                      {pizza.discount && pizza.originalPrice && (
                        <>
                          <p className="text-sm text-gray-500 line-through">R${(pizza.originalPrice || 0).toFixed(2)}</p>
                          <span className="text-green-600 text-sm font-semibold">{pizza.discount}%</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side - Image and button */}
                  <div className="relative">
                    <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                      <img
                        src={getImageUrl(pizza.name)}
                        alt={pizza.name}
                        loading="lazy"
                        className="w-24 h-24 rounded-2xl object-cover"
                      />
                    </div>
                    <button
                      onClick={() => handleAddToCart(pizza.id)}
                      className="absolute bottom-0 right-0 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold hover:bg-yellow-500 transition-colors shadow-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
