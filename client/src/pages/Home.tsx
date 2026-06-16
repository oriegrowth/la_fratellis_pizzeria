import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { ShoppingCart, Phone, LogOut } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import MenuPage from './MenuPage';
import CartPage from './CartPage';
import LoginPage from './LoginPage';

type Page = 'menu' | 'cart' | 'login';

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('menu');
  const [cartCount, setCartCount] = useState(0);
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('sessionId');
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', id);
    }
    return id;
  });

  // Fetch cart count
  const { data: cartItems } = trpc.cart.getItems.useQuery({ sessionId });
  useEffect(() => {
    if (cartItems) {
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(totalQuantity);
    }
  }, [cartItems]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-md border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-red-600">La Fratellis</h1>
            <span className="text-sm text-green-700 font-semibold">Pizzaria</span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
                <button
                  onClick={() => logout()}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <a
                href={getLoginUrl()}
                className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
              >
                Entrar
              </a>
            )}

            {/* Cart Button */}
            <button
              onClick={() => setCurrentPage('cart')}
              className="relative bg-red-600 hover:bg-red-700 text-white rounded-full p-3 transition-all duration-200 transform hover:scale-110 active:scale-95"
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-green-700 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* WhatsApp Contact */}
            <a
              href="https://wa.me/5511940720211?text=Olá%20La%20Fratellis%2C%20gostaria%20de%20fazer%20um%20pedido"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-700 hover:bg-green-800 text-white rounded-full p-3 transition-all duration-200 transform hover:scale-110 active:scale-95"
              title="Contato WhatsApp"
            >
              <Phone size={24} />
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-gray-200 bg-white px-4 py-2 flex gap-4">
          <button
            onClick={() => setCurrentPage('menu')}
            className={`px-4 py-2 font-semibold transition-all duration-200 ${
              currentPage === 'menu'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-red-600'
            }`}
          >
            Cardápio
          </button>
          <button
            onClick={() => setCurrentPage('cart')}
            className={`px-4 py-2 font-semibold transition-all duration-200 ${
              currentPage === 'cart'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-red-600'
            }`}
          >
            Carrinho ({cartCount})
          </button>
          {!isAuthenticated && (
            <button
              onClick={() => setCurrentPage('login')}
              className={`px-4 py-2 font-semibold transition-all duration-200 ${
                currentPage === 'login'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              Login
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentPage === 'menu' && <MenuPage sessionId={sessionId} />}
        {currentPage === 'cart' && <CartPage sessionId={sessionId} onCheckout={() => setCurrentPage('login')} />}
        {currentPage === 'login' && <LoginPage sessionId={sessionId} onLoginSuccess={() => setCurrentPage('menu')} />}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-12 py-8 border-t-4 border-red-600">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-semibold text-lg mb-2">La Fratellis - Pizzaria Delivery</p>
          <p className="text-gray-400 mb-4">Qualidade, Sabor e Tradição</p>
          <p className="text-gray-500 text-sm">
            📍 Perdizes e Região | 📞 (11) 94072-0211
          </p>
          <p className="text-gray-600 text-xs mt-4">© 2026 La Fratellis. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
