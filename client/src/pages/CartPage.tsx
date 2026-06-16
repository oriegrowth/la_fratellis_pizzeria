import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Trash2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CartPageProps {
  sessionId: string;
  onCheckout: () => void;
}

interface CheckoutData {
  name: string;
  phone: string;
  address: string;
  addressNumber: string;
  addressReference: string;
  saveData: boolean;
}

export default function CartPage({ sessionId, onCheckout }: CartPageProps) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    name: '',
    phone: '',
    address: '',
    addressNumber: '',
    addressReference: '',
    saveData: true,
  });

  // Fetch cart items and pizzas
  const { data: cartItems = [], refetch: refetchCart } = trpc.cart.getItems.useQuery({ sessionId });
  const { data: allPizzas = [] } = trpc.pizzas.getAll.useQuery();
  const removeFromCartMutation = trpc.cart.removeItem.useMutation();
  const createOrderMutation = trpc.orders.create.useMutation();
  const clearCartMutation = trpc.cart.clear.useMutation();
  const createOrUpdateCustomerMutation = trpc.customers.createOrUpdate.useMutation();

  // Load saved customer data on mount
  useEffect(() => {
    const savedPhone = localStorage.getItem('customerPhone');
    const savedData = localStorage.getItem('customerData');
    
    if (savedPhone && savedData) {
      const data = JSON.parse(savedData);
      setCheckoutData({
        name: data.name || '',
        phone: savedPhone,
        address: data.address || '',
        addressNumber: data.addressNumber || '',
        addressReference: data.addressReference || '',
        saveData: true,
      });
    }
  }, []);

  // Calculate total
  const total = cartItems.reduce((sum, item) => sum + (parseFloat(item.price.toString()) * item.quantity), 0);

  const handleRemoveItem = async (id: number) => {
    try {
      await removeFromCartMutation.mutateAsync(id);
      await refetchCart();
      toast.success('Item removido do carrinho');
    } catch (error) {
      toast.error('Erro ao remover item');
    }
  };

  const validateCheckoutData = (): boolean => {
    if (!checkoutData.name.trim()) {
      toast.error('Nome é obrigatório');
      return false;
    }
    if (!checkoutData.phone || checkoutData.phone.length < 11) {
      toast.error('Telefone inválido');
      return false;
    }
    if (!checkoutData.address.trim()) {
      toast.error('Endereço é obrigatório');
      return false;
    }
    if (!checkoutData.addressNumber.trim()) {
      toast.error('Número é obrigatório');
      return false;
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!validateCheckoutData()) {
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }

    setIsCheckingOut(true);
    try {
      // Save customer data if requested
      if (checkoutData.saveData) {
        await createOrUpdateCustomerMutation.mutateAsync({
          phone: checkoutData.phone,
          name: checkoutData.name,
          address: checkoutData.address,
          addressNumber: checkoutData.addressNumber,
          addressReference: checkoutData.addressReference,
        });
        
        localStorage.setItem('customerPhone', checkoutData.phone);
        localStorage.setItem('customerData', JSON.stringify({
          name: checkoutData.name,
          address: checkoutData.address,
          addressNumber: checkoutData.addressNumber,
          addressReference: checkoutData.addressReference,
        }));
      }

      // Prepare order items
      const orderItems = cartItems.map(item => {
        const pizza1 = allPizzas.find(p => p.id === item.pizzaId1);
        const pizza2 = item.pizzaId2 ? allPizzas.find(p => p.id === item.pizzaId2) : null;
        
        return {
          pizza1: pizza1?.name,
          pizza2: pizza2?.name,
          size: item.size === 'small' ? 'Brotinho' : 'Grande',
          quantity: item.quantity,
          price: item.price,
        };
      });

      // Create order in database
      await createOrderMutation.mutateAsync({
        phone: checkoutData.phone,
        name: checkoutData.name,
        address: checkoutData.address,
        addressNumber: checkoutData.addressNumber,
        addressReference: checkoutData.addressReference,
        items: JSON.stringify(orderItems),
        totalPrice: total,
      });
      
      // Generate WhatsApp message
      const message = `*Novo Pedido La Fratellis*\n\n*Cliente:* ${checkoutData.name}\n*Telefone:* ${checkoutData.phone}\n*Endereço:* ${checkoutData.address}, ${checkoutData.addressNumber}${checkoutData.addressReference ? ` (${checkoutData.addressReference})` : ''}\n\n*Itens:*\n${orderItems.map(item => 
        `• ${item.quantity}x ${item.pizza1}${item.pizza2 ? ` + ${item.pizza2}` : ''} (${item.size}) - R$ ${parseFloat(item.price.toString()).toFixed(2)}`
      ).join('\n')}\n\n*Subtotal:* R$ ${total.toFixed(2)}\n*Entrega:* GRÁTIS (Perdizes)\n*Total:* R$ ${total.toFixed(2)}`;

      // Send to WhatsApp
      const whatsappUrl = `https://wa.me/5511940720211?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast.success('Pedido enviado para o WhatsApp!');
      
      // Clear cart
      await clearCartMutation.mutateAsync(sessionId);
      await refetchCart();
      setShowCheckout(false);
      setCheckoutData({
        name: '',
        phone: '',
        address: '',
        addressNumber: '',
        addressReference: '',
        saveData: true,
      });
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      toast.error('Erro ao finalizar pedido');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg mb-6">Seu carrinho está vazio</p>
        <Button className="btn-primary">
          <ArrowLeft className="mr-2" size={20} />
          Voltar ao Cardápio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-900">Seu Carrinho</h2>

      {/* Cart Items */}
      <div className="space-y-4">
        {cartItems.map(item => {
          const pizza1 = allPizzas.find(p => p.id === item.pizzaId1);
          const pizza2 = item.pizzaId2 ? allPizzas.find(p => p.id === item.pizzaId2) : null;

          return (
            <Card key={item.id} className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-lg">
                  {pizza1?.name}
                  {pizza2 && ` + ${pizza2.name}`}
                </h3>
                <p className="text-sm text-gray-600">
                  {item.size === 'small' ? 'Brotinho' : 'Grande'} - Qtd: {item.quantity}
                </p>
                <p className="text-red-600 font-semibold mt-1">
                  R$ {(parseFloat(item.price.toString()) * item.quantity).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="text-red-600 hover:text-red-700 transition-colors p-2"
              >
                <Trash2 size={20} />
              </button>
            </Card>
          );
        })}
      </div>

      {/* Total */}
      <Card className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold text-gray-700">Subtotal:</span>
          <span className="text-2xl font-bold text-red-600">R$ {total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-green-700 font-semibold">
          <span>Entrega:</span>
          <span>GRÁTIS (Perdizes e Região)</span>
        </div>
      </Card>

      {/* Checkout Section */}
      <Card className={`p-6 border-2 transition-all ${showCheckout ? 'border-red-600 bg-red-50' : 'border-gray-200'}`}>
        <button
          onClick={() => setShowCheckout(!showCheckout)}
          className="w-full flex items-center justify-between font-bold text-lg text-gray-900 hover:text-red-600 transition-colors"
        >
          <span>Dados de Entrega</span>
          {showCheckout ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </button>

        {showCheckout && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome *
              </label>
              <Input
                type="text"
                placeholder="Seu nome"
                value={checkoutData.name}
                onChange={(e) => setCheckoutData({ ...checkoutData, name: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Telefone *
              </label>
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={checkoutData.phone}
                onChange={(e) => setCheckoutData({ ...checkoutData, phone: e.target.value.replace(/\D/g, '') })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Endereço *
              </label>
              <Input
                type="text"
                placeholder="Rua/Avenida"
                value={checkoutData.address}
                onChange={(e) => setCheckoutData({ ...checkoutData, address: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Número *
              </label>
              <Input
                type="text"
                placeholder="123"
                value={checkoutData.addressNumber}
                onChange={(e) => setCheckoutData({ ...checkoutData, addressNumber: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Referência (Opcional)
              </label>
              <Input
                type="text"
                placeholder="Próximo a..."
                value={checkoutData.addressReference}
                onChange={(e) => setCheckoutData({ ...checkoutData, addressReference: e.target.value })}
                className="w-full"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checkoutData.saveData}
                onChange={(e) => setCheckoutData({ ...checkoutData, saveData: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Salvar meus dados para próximas compras</span>
            </label>
          </div>
        )}
      </Card>

      {/* Checkout Button */}
      <Button
        onClick={handleCheckout}
        disabled={isCheckingOut || !showCheckout}
        className="btn-primary w-full py-4 text-lg"
      >
        {isCheckingOut ? 'Processando...' : 'Finalizar Pedido no WhatsApp'}
      </Button>
    </div>
  );
}
