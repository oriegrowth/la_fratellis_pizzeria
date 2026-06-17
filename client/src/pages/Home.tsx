import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, Search, ShoppingCart, Star, Plus, Pizza } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getImageUrl, placeholderDataUrl } from "@/lib/imageMap";
import { useLocation } from "wouter";

interface HomeProps {
  sessionId: string;
}

const categories = [
  { id: "all", label: "Todos" },
  { id: "classica", label: "Classicas" },
  { id: "especial", label: "Especiais" },
  { id: "doce", label: "Doces" },
];

function formatCurrency(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Home({ sessionId }: HomeProps) {
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cartCount, setCartCount] = useState(0);

  const { data: pizzas = [] } = trpc.pizzas.getAll.useQuery();
  const { data: promotions = [] } = trpc.promotions.getActive.useQuery();
  const { data: cartItems = [] } = trpc.cart.getItems.useQuery({ sessionId });

  useEffect(() => {
    setCartCount(cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0));
  }, [cartItems]);

  const filteredPizzas = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return pizzas.filter((pizza: any) => {
      const matchesCategory = selectedCategory === "all" || pizza.category === selectedCategory;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        pizza.name.toLowerCase().includes(normalizedSearch) ||
        pizza.ingredients.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [pizzas, selectedCategory, searchTerm]);

  return (
    <div className="min-h-screen bg-white text-stone-950">
      <header className="sticky top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Entrega em Perdizes</p>
              <h1 className="truncate text-lg font-extrabold text-stone-900">La Fratellis Pizzeria</h1>
            </div>
            <button
              onClick={() => navigate("/cart")}
              className="relative rounded-full bg-stone-50 p-2.5 text-stone-900 transition-colors hover:bg-stone-100"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar sabor ou ingrediente"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-md border border-stone-200 bg-stone-50 pl-10 pr-4 text-sm outline-none transition focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold transition-all ${
                selectedCategory === category.id
                  ? "bg-red-600 text-white shadow-md shadow-red-100"
                  : "bg-stone-50 text-stone-500 hover:bg-stone-100"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5">
        <section className="mb-5 overflow-hidden rounded-lg bg-stone-950 text-white shadow-sm">
          <div className="grid gap-4 p-5 sm:grid-cols-[1.6fr_1fr] sm:items-center">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                <Star size={14} /> Aberto para pedidos
              </p>
              <h2 className="text-3xl font-bold leading-tight">Escolha sua pizza favorita</h2>
              <p className="mt-2 max-w-xl text-sm text-stone-200">
                Peca sabores inteiros ou monte meio a meio. Na pizza meio a meio, o preco cobrado e sempre o do sabor mais caro.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-stone-100">
              <span className="inline-flex items-center gap-2">
                <Clock size={16} /> Entrega rapida na regiao
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={16} /> Perdizes e arredores
              </span>
              <button
                onClick={() => navigate("/menu")}
                className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-green-600 px-4 font-semibold text-white hover:bg-green-700"
              >
                <Pizza size={18} /> Montar pedido
              </button>
            </div>
          </div>
        </section>

        {promotions.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3 text-lg font-bold">Promocoes</h2>
            {promotions.map((promo: any) => (
              <div key={promo.id} className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <h3 className="mb-1 text-lg font-bold text-stone-950">{promo.title}</h3>
                <p className="text-sm text-stone-700">{promo.description}</p>
                {promo.details && <p className="mt-2 text-xs font-medium text-red-700">{promo.details}</p>}
              </div>
            ))}
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Cardapio</h2>
            <button onClick={() => navigate("/menu")} className="text-sm font-semibold text-red-700 hover:text-red-800">
              Ver montagem
            </button>
          </div>

          {filteredPizzas.length === 0 ? (
            <div className="rounded-lg border border-stone-200 bg-white py-10 text-center">
              <p className="text-stone-500">Nenhuma pizza encontrada</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredPizzas.map((pizza: any) => (
                <div
                  key={pizza.id}
                  className="flex gap-4 rounded-lg border border-stone-200 bg-white p-3 shadow-sm transition hover:border-red-200 hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-base font-bold">{pizza.name}</h3>
                    <p className="mb-3 line-clamp-2 text-sm text-stone-600">{pizza.ingredients}</p>
                    <p className="text-xs font-medium uppercase text-stone-500">A partir de</p>
                    <p className="text-lg font-bold text-red-700">{formatCurrency(pizza.priceSmall)}</p>
                  </div>

                  <div className="relative h-24 w-24 shrink-0">
                    <div className="h-24 w-24 overflow-hidden rounded-lg bg-stone-100">
                      <img
                        src={pizza.imageUrl || getImageUrl(pizza.name)}
                        alt={pizza.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = placeholderDataUrl();
                        }}
                      />
                    </div>
                    <button
                      onClick={() => navigate("/menu")}
                      className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
                      aria-label={`Adicionar ${pizza.name}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
