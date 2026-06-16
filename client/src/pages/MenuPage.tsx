import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Plus, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface MenuPageProps {
  sessionId: string;
}

type Category = 'classica' | 'especial' | 'doce';
type Size = 'small' | 'large';

interface PizzaSelection {
  pizzaId1: number;
  pizzaId2?: number;
  size: Size;
  quantity: number;
  pizza1Name?: string;
  pizza2Name?: string;
}

export default function MenuPage({ sessionId }: MenuPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('classica');
  const [selectedPizzas, setSelectedPizzas] = useState<Map<number, PizzaSelection>>(new Map());
  const [meioAMeioMode, setMeioAMeioMode] = useState(false);
  const [meioAMeioSelection, setMeioAMeioSelection] = useState<{ pizza1Id: number; pizza2Id?: number }>({ pizza1Id: 0 });

  // Fetch pizzas
  const { data: allPizzas = [] } = trpc.pizzas.getAll.useQuery();
  const { data: promotions = [] } = trpc.promotions.getActive.useQuery();
  const addToCartMutation = trpc.cart.addItem.useMutation();

  // Filter pizzas by category
  const pizzasByCategory = useMemo(() => {
    return allPizzas.filter(p => p.category === selectedCategory);
  }, [allPizzas, selectedCategory]);

  const calculatePrice = (pizza1: any, pizza2: any | undefined, size: Size) => {
    const price1 = size === 'small' ? parseFloat(pizza1.priceSmall.toString()) : parseFloat(pizza1.priceLarge.toString());
    if (!pizza2) return price1;
    const price2 = size === 'small' ? parseFloat(pizza2.priceSmall.toString()) : parseFloat(pizza2.priceLarge.toString());
    return Math.max(price1, price2);
  };

  const handleAddToCart = async (pizza: any, selection: PizzaSelection) => {
    try {
      const price = calculatePrice(
        pizza,
        selection.pizzaId2 ? allPizzas.find(p => p.id === selection.pizzaId2) : undefined,
        selection.size
      );
      
      await addToCartMutation.mutateAsync({
        sessionId,
        pizzaId1: selection.pizzaId1,
        pizzaId2: selection.pizzaId2,
        size: selection.size,
        quantity: selection.quantity,
        price,
      });

      const itemName = selection.pizzaId2 
        ? `${pizza.name} + ${allPizzas.find(p => p.id === selection.pizzaId2)?.name}`
        : pizza.name;
      
      toast.success(`${itemName} adicionada ao carrinho!`);
      setSelectedPizzas(new Map());
    } catch (error) {
      toast.error('Erro ao adicionar ao carrinho');
    }
  };

  const handleMeioAMeioSelect = (pizzaId: number) => {
    if (meioAMeioSelection.pizza1Id === 0) {
      setMeioAMeioSelection({ pizza1Id: pizzaId });
    } else if (meioAMeioSelection.pizza1Id === pizzaId) {
      setMeioAMeioSelection({ pizza1Id: 0 });
    } else {
      setMeioAMeioSelection({ pizza1Id: meioAMeioSelection.pizza1Id, pizza2Id: pizzaId });
      setMeioAMeioMode(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Promotions Banner */}
      {promotions.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">{promotions[0].title}</h2>
          <p className="text-red-100 mb-3">{promotions[0].description}</p>
          <p className="text-sm text-red-200">{promotions[0].details}</p>
        </div>
      )}

      {/* Meio a Meio Mode */}
      {meioAMeioMode && (
        <Card className="p-4 bg-blue-50 border-2 border-blue-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-blue-900">Modo Meio a Meio</h3>
              <p className="text-sm text-blue-700">
                {meioAMeioSelection.pizza1Id === 0 
                  ? 'Selecione o primeiro sabor'
                  : meioAMeioSelection.pizza2Id === undefined
                  ? 'Selecione o segundo sabor'
                  : 'Pronto! Clique em "Adicionar" para confirmar'}
              </p>
            </div>
            <button
              onClick={() => {
                setMeioAMeioMode(false);
                setMeioAMeioSelection({ pizza1Id: 0 });
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              <X size={24} />
            </button>
          </div>
        </Card>
      )}

      {/* Category Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {(['classica', 'especial', 'doce'] as const).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-3 rounded-full font-semibold whitespace-nowrap transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category === 'classica' ? 'Clássicas' : category === 'especial' ? 'Especiais' : 'Doces'}
          </button>
        ))}
      </div>

      {/* Meio a Meio Button */}
      <div className="flex gap-3">
        <Button
          onClick={() => setMeioAMeioMode(!meioAMeioMode)}
          className={`flex-1 ${meioAMeioMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'} text-white font-semibold py-3`}
        >
          {meioAMeioMode ? '✓ Modo Meio a Meio Ativo' : 'Modo Meio a Meio'}
        </Button>
      </div>

      {/* Pizza Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pizzasByCategory.map(pizza => {
          const isSelected = meioAMeioMode && (
            meioAMeioSelection.pizza1Id === pizza.id || 
            meioAMeioSelection.pizza2Id === pizza.id
          );

          return (
            <Card 
              key={pizza.id} 
              className={`pizza-card overflow-hidden cursor-pointer transition-all ${
                isSelected ? 'ring-4 ring-blue-500' : ''
              }`}
              onClick={() => {
                if (meioAMeioMode) {
                  handleMeioAMeioSelect(pizza.id);
                }
              }}
            >
              {/* Pizza Image */}
              <div className="relative h-48 bg-gray-100 overflow-hidden">
                <img
                  src={pizza.imageUrl}
                  alt={pizza.name}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-30 flex items-center justify-center">
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold">
                      {meioAMeioSelection.pizza1Id === pizza.id ? 'Sabor 1' : 'Sabor 2'}
                    </div>
                  </div>
                )}
              </div>

              {/* Pizza Info */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{pizza.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{pizza.ingredients}</p>
                </div>

                {!meioAMeioMode && (
                  <>
                    {/* Size Selection */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Tamanho</label>
                      <div className="flex gap-2">
                        {(['small', 'large'] as const).map(size => (
                          <button
                            key={size}
                            onClick={() => {
                              const current = selectedPizzas.get(pizza.id) || { pizzaId1: pizza.id, size: 'small', quantity: 1 };
                              const updated = { ...current, size };
                              setSelectedPizzas(new Map(selectedPizzas).set(pizza.id, updated));
                            }}
                            className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all ${
                              (selectedPizzas.get(pizza.id)?.size || 'small') === size
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <div>{size === 'small' ? 'Brotinho' : 'Grande'}</div>
                            <div className="text-xs">
                              R$ {size === 'small' ? pizza.priceSmall : pizza.priceLarge}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-semibold text-gray-700">Qtd:</label>
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => {
                            const current = selectedPizzas.get(pizza.id) || { pizzaId1: pizza.id, size: 'small', quantity: 1 };
                            if (current.quantity > 1) {
                              const updated = { ...current, quantity: current.quantity - 1 };
                              setSelectedPizzas(new Map(selectedPizzas).set(pizza.id, updated));
                            }
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-semibold">
                          {selectedPizzas.get(pizza.id)?.quantity || 1}
                        </span>
                        <button
                          onClick={() => {
                            const current = selectedPizzas.get(pizza.id) || { pizzaId1: pizza.id, size: 'small', quantity: 1 };
                            const updated = { ...current, quantity: current.quantity + 1 };
                            setSelectedPizzas(new Map(selectedPizzas).set(pizza.id, updated));
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      onClick={() => handleAddToCart(pizza, selectedPizzas.get(pizza.id) || { pizzaId1: pizza.id, size: 'small', quantity: 1 })}
                      className="btn-primary w-full"
                    >
                      Adicionar ao Carrinho
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Meio a Meio Confirmation */}
      {meioAMeioMode && meioAMeioSelection.pizza2Id && (
        <Card className="p-6 bg-green-50 border-2 border-green-300 sticky bottom-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-green-900 mb-2">Sua Pizza Meio a Meio</h3>
              <p className="text-sm text-green-700">
                {allPizzas.find(p => p.id === meioAMeioSelection.pizza1Id)?.name} + {allPizzas.find(p => p.id === meioAMeioSelection.pizza2Id)?.name}
              </p>
            </div>

            {/* Size Selection for Meio a Meio */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Tamanho</label>
              <div className="flex gap-2">
                {(['small', 'large'] as const).map(size => {
                  const pizza1 = allPizzas.find(p => p.id === meioAMeioSelection.pizza1Id);
                  const pizza2 = allPizzas.find(p => p.id === meioAMeioSelection.pizza2Id);
                  const price = calculatePrice(pizza1, pizza2, size);
                  
                  return (
                    <button
                      key={size}
                      onClick={() => {
                        const current = selectedPizzas.get(meioAMeioSelection.pizza1Id) || { 
                          pizzaId1: meioAMeioSelection.pizza1Id, 
                          pizzaId2: meioAMeioSelection.pizza2Id,
                          size: 'small', 
                          quantity: 1 
                        };
                        const updated = { ...current, size };
                        setSelectedPizzas(new Map(selectedPizzas).set(meioAMeioSelection.pizza1Id, updated));
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all ${
                        (selectedPizzas.get(meioAMeioSelection.pizza1Id)?.size || 'small') === size
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <div>{size === 'small' ? 'Brotinho' : 'Grande'}</div>
                      <div className="text-xs">R$ {price.toFixed(2)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Qtd:</label>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    const current = selectedPizzas.get(meioAMeioSelection.pizza1Id) || { 
                      pizzaId1: meioAMeioSelection.pizza1Id, 
                      pizzaId2: meioAMeioSelection.pizza2Id,
                      size: 'small', 
                      quantity: 1 
                    };
                    if (current.quantity > 1) {
                      const updated = { ...current, quantity: current.quantity - 1 };
                      setSelectedPizzas(new Map(selectedPizzas).set(meioAMeioSelection.pizza1Id, updated));
                    }
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-semibold">
                  {selectedPizzas.get(meioAMeioSelection.pizza1Id)?.quantity || 1}
                </span>
                <button
                  onClick={() => {
                    const current = selectedPizzas.get(meioAMeioSelection.pizza1Id) || { 
                      pizzaId1: meioAMeioSelection.pizza1Id, 
                      pizzaId2: meioAMeioSelection.pizza2Id,
                      size: 'small', 
                      quantity: 1 
                    };
                    const updated = { ...current, quantity: current.quantity + 1 };
                    setSelectedPizzas(new Map(selectedPizzas).set(meioAMeioSelection.pizza1Id, updated));
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={() => {
                const pizza1 = allPizzas.find(p => p.id === meioAMeioSelection.pizza1Id);
                handleAddToCart(pizza1, selectedPizzas.get(meioAMeioSelection.pizza1Id) || { 
                  pizzaId1: meioAMeioSelection.pizza1Id, 
                  pizzaId2: meioAMeioSelection.pizza2Id,
                  size: 'small', 
                  quantity: 1 
                });
              }}
              className="btn-primary w-full"
            >
              Adicionar Meio a Meio ao Carrinho
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
