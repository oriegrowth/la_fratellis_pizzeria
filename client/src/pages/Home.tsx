import { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Heart, Share2, Search, Menu } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { getImageUrl } from '@/lib/imageMap';

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
    { id: 'classicas', label: 'Clássicas' },
    { id: 'especiais', label: 'Especiais' },
    { id: 'doces', label: 'Doces' },
  ];

  const handleAddToCart = (pizzaId: number) => {
    navigate(`/menu?pizza=${pizzaId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
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
          
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar itens na loja"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none"
            />
          </div>

          <button className="text-gray-600">
            <Heart size={24} />
          </button>
          
          <button className="text-gray-600">
            <Share2 size={24} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto">
          <button className="text-gray-600 hover:text-gray-900">
            <Menu size={20} />
          </button>
          
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-yellow-300 text-black'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="pb-24">
        {/* Promotions section */}
        {promotions.length > 0 && (
          <div className="px-4 py-4">
            <h2 className="text-lg font-bold mb-3">Buscas recentes</h2>
            {promotions.map((promo: any) => (
              <div
                key={promo.id}
                className="mb-4 p-4 rounded-lg"
                style={{ backgroundColor: '#fff9e6' }}
              >
                <h3 className="font-bold text-lg mb-2">{promo.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{promo.description}</p>
                <p className="font-bold text-lg">a partir de</p>
                <p className="font-bold text-2xl text-red-600">R${(promo.price || 0).toFixed(2)}</p>
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
                  className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  {/* Left side - Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-1">{pizza.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pizza.ingredients}</p>
                    
                    <div className="flex items-baseline gap-2">
                      <p className="font-bold text-lg">R${(pizza.smallPrice || 0).toFixed(2)}</p>
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
                        className="w-24 h-24 rounded-lg object-cover"
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

      {/* Floating cart button */}
      {cartCount > 0 && (
        <button
          onClick={() => navigate('/cart')}
          className="fixed bottom-6 right-6 bg-red-600 text-white rounded-full p-4 shadow-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <ShoppingCart size={24} />
          <span className="font-bold">{cartCount}</span>
        </button>
      )}

      {/* Minimum order info */}
      <div className="fixed bottom-0 left-0 right-0 bg-green-50 border-t border-green-200 px-4 py-3 text-center text-sm text-green-700">
        Compre R$29,00 ou mais para ter <span className="font-semibold">entrega grátis</span>
      </div>
    </div>
  );
}
