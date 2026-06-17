import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Minus, Plus, ShoppingCart, SplitSquareHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getImageUrl, placeholderDataUrl } from "@/lib/imageMap";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface MenuPageProps {
  sessionId: string;
}

type Category = "classica" | "especial" | "doce";
type Size = "small" | "large";

const categoryLabels: Record<Category, string> = {
  classica: "Classicas",
  especial: "Especiais",
  doce: "Doces",
};

function formatCurrency(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPrice(pizza: any, size: Size) {
  return Number(size === "small" ? pizza?.priceSmall ?? 0 : pizza?.priceLarge ?? 0);
}

function calculateHalfPrice(pizza1: any, pizza2: any, size: Size) {
  return Math.max(getPrice(pizza1, size), getPrice(pizza2, size));
}

export default function MenuPage({ sessionId }: MenuPageProps) {
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<Category>("classica");
  const [normalSize, setNormalSize] = useState<Record<number, Size>>({});
  const [normalQuantity, setNormalQuantity] = useState<Record<number, number>>({});
  const [halfMode, setHalfMode] = useState(false);
  const [halfPizza1Id, setHalfPizza1Id] = useState<number | null>(null);
  const [halfPizza2Id, setHalfPizza2Id] = useState<number | null>(null);
  const [halfSize, setHalfSize] = useState<Size>("large");
  const [halfQuantity, setHalfQuantity] = useState(1);

  const utils = trpc.useUtils();
  const { data: allPizzas = [] } = trpc.pizzas.getAll.useQuery();
  const { data: cartItems = [] } = trpc.cart.getItems.useQuery({ sessionId });
  const addToCartMutation = trpc.cart.addItem.useMutation({
    onSuccess: async () => {
      await utils.cart.getItems.invalidate({ sessionId });
    },
  });

  const cartCount = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const pizzasByCategory = useMemo(
    () => allPizzas.filter((pizza: any) => pizza.category === selectedCategory),
    [allPizzas, selectedCategory],
  );

  const halfPizza1 = allPizzas.find((pizza: any) => pizza.id === halfPizza1Id);
  const halfPizza2 = allPizzas.find((pizza: any) => pizza.id === halfPizza2Id);
  const halfPrice = halfPizza1 && halfPizza2 ? calculateHalfPrice(halfPizza1, halfPizza2, halfSize) : 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pizzaId = Number(params.get("pizza"));
    if (!pizzaId || allPizzas.length === 0) return;

    const pizza = allPizzas.find((item: any) => item.id === pizzaId);
    if (!pizza) return;

    setSelectedCategory(pizza.category);
    setHalfMode(false);
  }, [allPizzas]);

  const resetHalfSelection = () => {
    setHalfPizza1Id(null);
    setHalfPizza2Id(null);
    setHalfSize("large");
    setHalfQuantity(1);
  };

  const selectHalfPizza = (pizza: any) => {
    if (!halfPizza1Id) {
      setHalfPizza1Id(pizza.id);
      toast.info("Primeiro sabor selecionado. Escolha o segundo sabor.");
      return;
    }

    if (halfPizza1Id === pizza.id) {
      setHalfPizza1Id(null);
      setHalfPizza2Id(null);
      return;
    }

    if (halfPizza2Id === pizza.id) {
      setHalfPizza2Id(null);
      return;
    }

    setHalfPizza2Id(pizza.id);
  };

  const addWholePizza = async (pizza: any) => {
    const size = normalSize[pizza.id] ?? "large";
    const quantity = normalQuantity[pizza.id] ?? 1;

    await addToCartMutation.mutateAsync({
      sessionId,
      pizzaId1: pizza.id,
      size,
      quantity,
      price: getPrice(pizza, size),
    });

    toast.success(`${pizza.name} adicionada ao carrinho`);
  };

  const addHalfPizza = async () => {
    if (!halfPizza1 || !halfPizza2) {
      toast.error("Escolha dois sabores para montar a pizza meio a meio");
      return;
    }

    await addToCartMutation.mutateAsync({
      sessionId,
      pizzaId1: halfPizza1.id,
      pizzaId2: halfPizza2.id,
      size: halfSize,
      quantity: halfQuantity,
      price: halfPrice,
    });

    toast.success(`Meio a meio ${halfPizza1.name} + ${halfPizza2.name} adicionada`);
    resetHalfSelection();
    setHalfMode(false);
  };

  const updateQuantity = (pizzaId: number, delta: number) => {
    const current = normalQuantity[pizzaId] ?? 1;
    setNormalQuantity({ ...normalQuantity, [pizzaId]: Math.max(1, current + delta) });
  };

  return (
    <div className="min-h-screen bg-[#fffaf3] text-stone-950">
      <header className="sticky top-0 z-40 border-b border-red-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/")} className="rounded-full p-2 text-stone-700 hover:bg-stone-100" aria-label="Voltar">
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase text-red-700">Monte seu pedido</p>
            <h1 className="truncate text-xl font-bold">Cardapio La Fratellis</h1>
          </div>
          <button
            onClick={() => navigate("/cart")}
            className="relative rounded-full bg-red-600 p-3 text-white shadow-sm hover:bg-red-700"
            aria-label="Abrir carrinho"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-green-600 px-1 text-xs font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0">
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {(Object.keys(categoryLabels) as Category[]).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-red-600 text-white"
                    : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
                }`}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>

          <div className="mb-4 rounded-lg border border-red-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <SplitSquareHorizontal size={20} className="text-red-700" />
                  Pizza meio a meio
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Escolha dois sabores. O valor aplicado sera o maior preco entre eles no tamanho escolhido.
                </p>
              </div>
              <Button
                onClick={() => {
                  setHalfMode(!halfMode);
                  if (halfMode) resetHalfSelection();
                }}
                className={halfMode ? "bg-stone-800 text-white hover:bg-stone-900" : "bg-red-600 text-white hover:bg-red-700"}
              >
                {halfMode ? "Cancelar meio a meio" : "Montar meio a meio"}
              </Button>
            </div>
          </div>

          {pizzasByCategory.length === 0 ? (
            <div className="rounded-lg border border-stone-200 bg-white py-12 text-center text-stone-500">
              Nenhuma pizza encontrada.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pizzasByCategory.map((pizza: any) => {
                const selectedAsFirst = halfPizza1Id === pizza.id;
                const selectedAsSecond = halfPizza2Id === pizza.id;
                const size = normalSize[pizza.id] ?? "large";
                const quantity = normalQuantity[pizza.id] ?? 1;

                return (
                  <Card
                    key={pizza.id}
                    className={`overflow-hidden border bg-white shadow-sm transition ${
                      selectedAsFirst || selectedAsSecond ? "border-green-500 ring-2 ring-green-200" : "border-stone-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => halfMode && selectHalfPizza(pizza)}
                      className={`block w-full text-left ${halfMode ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="relative h-40 bg-stone-100">
                        <img
                          src={pizza.imageUrl || getImageUrl(pizza.name)}
                          alt={pizza.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            try {
                              event.currentTarget.src = placeholderDataUrl();
                            } catch {
                              event.currentTarget.style.display = "none";
                            }
                          }}
                        />
                        {(selectedAsFirst || selectedAsSecond) && (
                          <div className="absolute left-3 top-3 rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
                            {selectedAsFirst ? "Sabor 1" : "Sabor 2"}
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="text-lg font-bold">{pizza.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-stone-600">{pizza.ingredients}</p>
                      </div>

                      {halfMode ? (
                        <button
                          onClick={() => selectHalfPizza(pizza)}
                          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold ${
                            selectedAsFirst || selectedAsSecond
                              ? "bg-green-600 text-white"
                              : "bg-stone-100 text-stone-800 hover:bg-stone-200"
                          }`}
                        >
                          {selectedAsFirst || selectedAsSecond ? <Check size={16} /> : <Plus size={16} />}
                          {selectedAsFirst ? "Selecionado como sabor 1" : selectedAsSecond ? "Selecionado como sabor 2" : "Selecionar sabor"}
                        </button>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            {(["small", "large"] as Size[]).map((option) => (
                              <button
                                key={option}
                                onClick={() => setNormalSize({ ...normalSize, [pizza.id]: option })}
                                className={`rounded-md border px-3 py-2 text-left text-sm ${
                                  size === option
                                    ? "border-red-600 bg-red-50 text-red-800"
                                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                                }`}
                              >
                                <span className="block font-semibold">{option === "small" ? "Brotinho" : "Grande"}</span>
                                <span>{formatCurrency(getPrice(pizza, option))}</span>
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center rounded-md bg-stone-100 p-1">
                              <button onClick={() => updateQuantity(pizza.id, -1)} className="rounded p-2 hover:bg-white" aria-label="Diminuir quantidade">
                                <Minus size={16} />
                              </button>
                              <span className="w-8 text-center font-semibold">{quantity}</span>
                              <button onClick={() => updateQuantity(pizza.id, 1)} className="rounded p-2 hover:bg-white" aria-label="Aumentar quantidade">
                                <Plus size={16} />
                              </button>
                            </div>
                            <Button onClick={() => addWholePizza(pizza)} className="bg-red-600 text-white hover:bg-red-700">
                              Adicionar
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Resumo meio a meio</h2>
                <p className="text-sm text-stone-600">Selecione dois sabores para liberar o envio ao carrinho.</p>
              </div>
              {(halfPizza1Id || halfPizza2Id) && (
                <button onClick={resetHalfSelection} className="rounded-full p-1 text-stone-500 hover:bg-stone-100" aria-label="Limpar selecao">
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-md bg-stone-50 p-3">
                <span className="block text-xs font-semibold uppercase text-stone-500">Sabor 1</span>
                <span className="font-semibold">{halfPizza1?.name ?? "Ainda nao selecionado"}</span>
              </div>
              <div className="rounded-md bg-stone-50 p-3">
                <span className="block text-xs font-semibold uppercase text-stone-500">Sabor 2</span>
                <span className="font-semibold">{halfPizza2?.name ?? "Ainda nao selecionado"}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["small", "large"] as Size[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setHalfSize(size)}
                    className={`rounded-md border px-3 py-2 text-left ${
                      halfSize === size ? "border-green-600 bg-green-50 text-green-800" : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <span className="block font-semibold">{size === "small" ? "Brotinho" : "Grande"}</span>
                    <span>{halfPizza1 && halfPizza2 ? formatCurrency(calculateHalfPrice(halfPizza1, halfPizza2, size)) : "--"}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold">Quantidade</span>
                <div className="flex items-center rounded-md bg-stone-100 p-1">
                  <button onClick={() => setHalfQuantity(Math.max(1, halfQuantity - 1))} className="rounded p-2 hover:bg-white" aria-label="Diminuir quantidade">
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-semibold">{halfQuantity}</span>
                  <button onClick={() => setHalfQuantity(halfQuantity + 1)} className="rounded p-2 hover:bg-white" aria-label="Aumentar quantidade">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-green-200 bg-green-50 p-3">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">Preco aplicado</span>
                  <span className="font-bold text-green-800">{formatCurrency(halfPrice * halfQuantity)}</span>
                </div>
                <p className="mt-1 text-xs text-green-800">Calculado pelo sabor mais caro.</p>
              </div>

              <Button
                onClick={addHalfPizza}
                disabled={!halfPizza1 || !halfPizza2 || addToCartMutation.isPending}
                className="h-11 w-full bg-green-600 text-white hover:bg-green-700"
              >
                Adicionar meio a meio
              </Button>
              <Button onClick={() => navigate("/cart")} className="h-11 w-full bg-red-600 text-white hover:bg-red-700">
                Ir para o carrinho
              </Button>
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
}
