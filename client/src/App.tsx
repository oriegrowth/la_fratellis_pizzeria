import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronLeft, Home, Lock, LogOut, Minus, Plus, Search, ShoppingCart, Trash2, UserRound } from "lucide-react";
import { fallbackPizzas, fallbackProducts, type MenuPizza, type MenuProduct, type PizzaCategory } from "@shared/menuData";

type Size = "small" | "large";
type Screen = "menu" | "customize" | "cart" | "checkout";
type Category = "all" | PizzaCategory | "bebida";

type PizzaCartItem = {
  id: string;
  itemType?: "pizza";
  size: Size;
  firstPizzaId: number;
  secondPizzaId?: number;
  quantity: number;
  unitPrice: number;
};

type ProductCartItem = {
  id: string;
  itemType: "product";
  productId: number;
  quantity: number;
  unitPrice: number;
};

type CartItem = PizzaCartItem | ProductCartItem;

type Customer = {
  name: string;
  phone: string;
  address: string;
  reference: string;
};

type SaleLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  details?: string;
};

type SaleRecord = {
  id: string;
  createdAt: string;
  customer: Customer;
  savedContact: boolean;
  items: SaleLine[];
  total: number;
  attribution: Attribution;
};

type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  landingPage?: string;
  referrer?: string;
};

const CART_KEY = "laFratellis.whatsappCart";
const ADMIN_SESSION_KEY = "laFratellis.adminSession";
const ATTRIBUTION_KEY = "laFratellis.attribution";
const FIRST_PURCHASE_COUPON = "#PRIMEIRACOMPRA";
const FIRST_PURCHASE_DISCOUNT = 0.1;
const COUPON_DURATION_SECONDS = 180;
const WHATSAPP_NUMBER = "5511940720211";
const HERO_IMAGE = "/images/pizzaria_perdizes_sp.png";

declare global {
  interface Window {
    gtag_report_conversion?: (url?: string) => false;
  }
}

const categories: Array<{ id: Category; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "classica", label: "Tradicionais" },
  { id: "especial", label: "Especiais" },
  { id: "doce", label: "Doces" },
  { id: "bebida", label: "Bebidas" },
];

const emptyCustomer: Customer = {
  name: "",
  phone: "",
  address: "",
  reference: "",
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function customerKey(phone: string) {
  return `laFratellis.customer.${onlyDigits(phone)}`;
}

function getPizza(id: number) {
  return fallbackPizzas.find((pizza) => pizza.id === id);
}

function getProduct(id: number) {
  return fallbackProducts.find((product) => product.id === id);
}

function pizzaPrice(pizza: MenuPizza, size: Size) {
  return size === "small" ? Number(pizza.priceSmall) : Number(pizza.priceLarge);
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]") as CartItem[];
  } catch {
    return [];
  }
}

function loadAttribution() {
  try {
    return JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || "{}") as Attribution;
  } catch {
    return {};
  }
}

function captureAttribution() {
  const params = new URLSearchParams(window.location.search);
  const hasUrlCampaign =
    params.has("utm_source") ||
    params.has("utm_medium") ||
    params.has("utm_campaign") ||
    params.has("utm_term") ||
    params.has("utm_content") ||
    params.has("gclid") ||
    params.has("fbclid");
  const hasAttribution = hasUrlCampaign || Boolean(document.referrer);

  if (!hasAttribution) return;

  const attribution: Attribution = {
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
    utmTerm: params.get("utm_term") || undefined,
    utmContent: params.get("utm_content") || undefined,
    gclid: params.get("gclid") || undefined,
    fbclid: params.get("fbclid") || undefined,
    landingPage: window.location.href,
    referrer: document.referrer || undefined,
  };

  if (hasUrlCampaign || !localStorage.getItem(ATTRIBUTION_KEY)) {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  }
}

async function createOrderOnServer(data: {
  customer: Customer;
  savedContact: boolean;
  items: SaleLine[];
  total: number;
  attribution: Attribution;
}) {
  const response = await fetch("/api/public/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to save order");
  }

  return response.json();
}

async function fetchAdminSales() {
  const params = new URLSearchParams({ user: "admin", password: "admin" });
  const response = await fetch(`/api/admin/orders?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load orders");
  }

  const data = await response.json();
  return (data.orders || []).map(normalizeOrder) as SaleRecord[];
}

function normalizeOrder(order: any): SaleRecord {
  let items: SaleLine[] = [];

  try {
    items = JSON.parse(order.items || "[]");
  } catch {
    items = [];
  }

  return {
    id: String(order.id),
    createdAt: order.createdAt,
    customer: {
      name: order.name,
      phone: order.phone,
      address: order.addressNumber ? `${order.address}, ${order.addressNumber}` : order.address,
      reference: order.addressReference || "",
    },
    savedContact: Boolean(order.savedContact),
    items,
    total: Number(order.totalPrice ?? 0),
    attribution: {
      utmSource: order.campaignSource || undefined,
      utmMedium: order.campaignMedium || undefined,
      utmCampaign: order.campaignName || undefined,
      utmTerm: order.campaignTerm || undefined,
      utmContent: order.campaignContent || undefined,
      gclid: order.gclid || undefined,
      fbclid: order.fbclid || undefined,
      landingPage: order.landingPage || undefined,
      referrer: order.referrer || undefined,
    },
  };
}

function describeAttribution(attribution: Attribution) {
  if (attribution.utmSource || attribution.utmCampaign) {
    return [
      attribution.utmSource && `Origem: ${attribution.utmSource}`,
      attribution.utmMedium && `Midia: ${attribution.utmMedium}`,
      attribution.utmCampaign && `Campanha: ${attribution.utmCampaign}`,
    ].filter(Boolean).join(" | ");
  }

  if (attribution.gclid) return "Origem: Google Ads";
  if (attribution.fbclid) return "Origem: Meta/Facebook";
  if (attribution.referrer) return `Referencia: ${attribution.referrer}`;

  return "Origem nao identificada";
}

function imageCandidates(imageUrl: string) {
  const candidates = [imageUrl];

  if (imageUrl.endsWith(".webp")) {
    candidates.push(imageUrl.replace(/\.webp$/i, ".png"));
    candidates.push(imageUrl.replace(/\.webp$/i, ".jpg"));
    candidates.push(imageUrl.replace(/\.webp$/i, ".jpeg"));
  }

  return candidates;
}

function App() {
  const isAdminRoute = window.location.pathname === "/admin";

  if (isAdminRoute) {
    return <AdminPanel />;
  }

  const [screen, setScreen] = useState<Screen>("menu");
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [selectedPizza, setSelectedPizza] = useState<MenuPizza | null>(null);
  const [selectedSize, setSelectedSize] = useState<Size>("small");
  const [secondPizzaId, setSecondPizzaId] = useState<number | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [couponCode, setCouponCode] = useState("");
  const [couponExpiresAt, setCouponExpiresAt] = useState<number | null>(null);
  const [couponSecondsLeft, setCouponSecondsLeft] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    if (!couponExpiresAt) {
      setCouponSecondsLeft(0);
      return;
    }

    const updateCountdown = () => {
      const secondsLeft = Math.max(0, Math.ceil((couponExpiresAt - Date.now()) / 1000));
      setCouponSecondsLeft(secondsLeft);

      if (secondsLeft === 0) {
        setCouponExpiresAt(null);
        showNotice("Cupom expirado");
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [couponExpiresAt]);

  const filteredPizzas = useMemo(() => {
    const term = query.trim().toLowerCase();

    return fallbackPizzas.filter((pizza) => {
      const categoryMatches = category === "all" || pizza.category === category;
      const queryMatches =
        !term || pizza.name.toLowerCase().includes(term) || pizza.ingredients.toLowerCase().includes(term);

      return categoryMatches && queryMatches;
    });
  }, [category, query]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();

    return fallbackProducts.filter((product) => {
      const categoryMatches = category === "all" || product.category === category;
      const queryMatches =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.description || "").toLowerCase().includes(term);

      return categoryMatches && queryMatches;
    });
  }, [category, query]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const isCouponActive = Boolean(couponExpiresAt && couponSecondsLeft > 0);
  const couponDiscount = isCouponActive ? cartTotal * FIRST_PURCHASE_DISCOUNT : 0;
  const checkoutTotal = Math.max(0, cartTotal - couponDiscount);
  const secondPizza = secondPizzaId ? getPizza(secondPizzaId) : undefined;
  const customizerPrice = selectedPizza
    ? selectedSize === "small"
      ? pizzaPrice(selectedPizza, "small")
      : Math.max(pizzaPrice(selectedPizza, "large"), secondPizza ? pizzaPrice(secondPizza, "large") : 0)
    : 0;

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const openCustomizer = (pizza: MenuPizza) => {
    setSelectedPizza(pizza);
    setSelectedSize("small");
    setSecondPizzaId(undefined);
    setQuantity(1);
    setScreen("customize");
  };

  const addToCart = () => {
    if (!selectedPizza) return;

    setCart((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        size: selectedSize,
        firstPizzaId: selectedPizza.id,
        secondPizzaId: selectedSize === "large" ? secondPizzaId : undefined,
        quantity,
        unitPrice: customizerPrice,
      },
    ]);

    showNotice(`${selectedPizza.name} adicionada ao carrinho`);
    setScreen("cart");
  };

  const addProductToCart = (product: MenuProduct) => {
    setCart((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        itemType: "product",
        productId: product.id,
        quantity: 1,
        unitPrice: Number(product.price),
      },
    ]);

    showNotice(`${product.name} adicionado ao carrinho`);
    setScreen("cart");
  };

  const changeCartQuantity = (id: string, delta: number) => {
    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)),
    );
  };

  const removeCartItem = (id: string) => {
    setCart((current) => current.filter((item) => item.id !== id));
  };

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() !== FIRST_PURCHASE_COUPON) {
      showNotice("Cupom invalido");
      return;
    }

    setCouponCode(FIRST_PURCHASE_COUPON);
    setCouponExpiresAt(Date.now() + COUPON_DURATION_SECONDS * 1000);
    showNotice("Cupom aplicado: 10% de desconto");
  };

  const updateCustomer = (field: keyof Customer, value: string) => {
    const nextCustomer = { ...customer, [field]: value };
    setCustomer(nextCustomer);

    if (field === "phone") {
      const digits = onlyDigits(value);
      if (digits.length >= 10) {
        try {
          const saved = localStorage.getItem(customerKey(value));
          if (saved) {
            setCustomer({ ...JSON.parse(saved), phone: value });
          }
        } catch {
          return;
        }
      }
    }
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      showNotice("Adicione pelo menos um item ao pedido");
      setScreen("menu");
      return;
    }

    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      showNotice("Preencha nome, WhatsApp e endereco");
      return;
    }

    if (saveCustomer) {
      localStorage.setItem(customerKey(customer.phone), JSON.stringify(customer));
    }

    const saleItems: SaleLine[] = cart.map((item) => {
      if (item.itemType === "product") {
        const product = getProduct(item.productId);
        return {
          name: product?.name || "Bebida",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
          details: "Bebida",
        };
      }

      const firstPizza = getPizza(item.firstPizzaId);
      const second = item.secondPizzaId ? getPizza(item.secondPizzaId) : undefined;
      const sizeLabel = item.size === "small" ? "Brotinho" : "Grande";
      const flavor = second ? `${firstPizza?.name} / ${second.name}` : firstPizza?.name;

      return {
        name: `${sizeLabel} ${flavor || "Pizza"}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.quantity,
        details: second ? "Meio a meio - preco do sabor mais caro" : undefined,
      };
    });
    const orderItems: SaleLine[] = isCouponActive
      ? [
          ...saleItems,
          {
            name: `Cupom ${FIRST_PURCHASE_COUPON}`,
            quantity: 1,
            unitPrice: -couponDiscount,
            total: -couponDiscount,
            details: "Desconto de primeira compra",
          },
        ]
      : saleItems;

    try {
      await createOrderOnServer({
        customer: { ...customer },
        savedContact: saveCustomer,
        items: orderItems,
        total: checkoutTotal,
        attribution: loadAttribution(),
      });
    } catch {
      showNotice("Nao foi possivel registrar o pedido. Tente novamente.");
      return;
    }

    const items = saleItems.map(
      (item) =>
        `- ${item.quantity}x ${item.name}${item.details ? ` (${item.details})` : ""}: ${money(item.total)}`,
    );

    const message = `*Novo pedido - La Fratellis Pizzeria*

*Cliente:* ${customer.name}
*WhatsApp:* ${customer.phone}
*Endereco:* ${customer.address}
${customer.reference.trim() ? `*Referencia:* ${customer.reference}\n` : ""}
*Pedido:*
${items.join("\n")}

${isCouponActive ? `*Cupom:* ${FIRST_PURCHASE_COUPON} (-${money(couponDiscount)})\n` : ""}*Total:* ${money(checkoutTotal)}`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    if (window.gtag_report_conversion) {
      window.gtag_report_conversion(whatsappUrl);
      return;
    }

    window.location.href = whatsappUrl;
  };

  return (
    <div className="phone-app">
      {screen === "menu" && (
        <MenuScreen
          category={category}
          query={query}
          pizzas={filteredPizzas}
          products={filteredProducts}
          cartCount={cartCount}
          onCategoryChange={setCategory}
          onQueryChange={setQuery}
          onOpenCart={() => setScreen("cart")}
          onOpenPizza={openCustomizer}
          onAddProduct={addProductToCart}
        />
      )}

      {screen === "customize" && selectedPizza && (
        <CustomizeScreen
          pizza={selectedPizza}
          size={selectedSize}
          secondPizzaId={secondPizzaId}
          quantity={quantity}
          total={customizerPrice * quantity}
          onBack={() => setScreen("menu")}
          onSizeChange={(size) => {
            setSelectedSize(size);
            if (size === "small") setSecondPizzaId(undefined);
          }}
          onSecondPizzaChange={setSecondPizzaId}
          onQuantityChange={setQuantity}
          onAdd={addToCart}
        />
      )}

      {screen === "cart" && (
        <CartScreen
          cart={cart}
          total={cartTotal}
          onBack={() => setScreen("menu")}
          onCheckout={() => setScreen("checkout")}
          onMinus={(id) => changeCartQuantity(id, -1)}
          onPlus={(id) => changeCartQuantity(id, 1)}
          onRemove={removeCartItem}
        />
      )}

      {screen === "checkout" && (
        <CheckoutScreen
          cartTotal={cartTotal}
          discount={couponDiscount}
          finalTotal={checkoutTotal}
          couponCode={couponCode}
          isCouponActive={isCouponActive}
          couponSecondsLeft={couponSecondsLeft}
          customer={customer}
          saveCustomer={saveCustomer}
          onBack={() => setScreen("cart")}
          onCustomerChange={updateCustomer}
          onCouponChange={setCouponCode}
          onApplyCoupon={applyCoupon}
          onSaveCustomerChange={setSaveCustomer}
          onSubmit={submitOrder}
        />
      )}

      <BottomNav screen={screen} cartCount={cartCount} onNavigate={setScreen} />
      {notice && <div className="notice">{notice}</div>}
    </div>
  );
}

function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem(ADMIN_SESSION_KEY) === "true");
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [login, setLogin] = useState({ user: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const savedContacts = sales.filter((sale) => sale.savedContact).length;

  const loadAdminSales = async () => {
    setIsLoading(true);
    setError("");

    try {
      setSales(await fetchAdminSales());
    } catch {
      setError("Nao foi possivel carregar as vendas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void loadAdminSales();
    }
  }, [isAuthenticated]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (login.user === "admin" && login.password === "admin") {
      localStorage.setItem(ADMIN_SESSION_KEY, "true");
      setIsAuthenticated(true);
      setError("");
      return;
    }

    setError("Usuario ou senha invalidos");
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAuthenticated(false);
    setLogin({ user: "", password: "" });
  };

  if (!isAuthenticated) {
    return (
      <main className="admin-shell admin-shell--login">
        <form className="admin-login" onSubmit={handleSubmit}>
          <div className="admin-login__icon">
            <Lock size={24} />
          </div>
          <h1>Painel administrativo</h1>
          <p>Acesse com o usuario admin e senha admin.</p>
          <label>
            Usuario
            <input value={login.user} onChange={(event) => setLogin({ ...login, user: event.target.value })} />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={login.password}
              onChange={(event) => setLogin({ ...login, password: event.target.value })}
            />
          </label>
          {error && <strong className="admin-error">{error}</strong>}
          <button type="submit">Entrar</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>La Fratellis</p>
          <h1>Painel administrativo</h1>
        </div>
        <button onClick={handleLogout}>
          <LogOut size={18} />
          Sair
        </button>
      </header>

      <section className="admin-stats">
        <article>
          <span>Vendas</span>
          <strong>{sales.length}</strong>
        </article>
        <article>
          <span>Faturamento</span>
          <strong>{money(totalRevenue)}</strong>
        </article>
        <article>
          <span>Contatos salvos</span>
          <strong>{savedContacts}</strong>
        </article>
      </section>

      <section className="admin-sales">
        <div className="admin-section-title">
          <h2>Vendas registradas</h2>
          <button onClick={loadAdminSales}>{isLoading ? "Atualizando..." : "Atualizar"}</button>
        </div>

        {error && <div className="admin-empty">{error}</div>}

        {!error && isLoading ? (
          <div className="admin-empty">Carregando vendas...</div>
        ) : !error && sales.length === 0 ? (
          <div className="admin-empty">Nenhuma venda registrada ainda.</div>
        ) : !error ? (
          sales.map((sale) => (
            <article className="admin-sale" key={sale.id}>
              <div className="admin-sale__top">
                <div>
                  <h3>{sale.customer.name}</h3>
                  <p>{new Date(sale.createdAt).toLocaleString("pt-BR")}</p>
                </div>
                <strong>{money(sale.total)}</strong>
              </div>

              <div className="admin-customer">
                <span>WhatsApp: {sale.customer.phone}</span>
                <span>Endereco: {sale.customer.address}</span>
                {sale.customer.reference && <span>Referencia: {sale.customer.reference}</span>}
                <span>Optou por salvar contato: {sale.savedContact ? "Sim" : "Nao"}</span>
                <span>{describeAttribution(sale.attribution)}</span>
              </div>

              <ul className="admin-items">
                {sale.items.map((item, index) => (
                  <li key={`${sale.id}-${index}`}>
                    <span>
                      {item.quantity}x {item.name}
                      {item.details ? ` - ${item.details}` : ""}
                    </span>
                    <strong>{money(item.total)}</strong>
                  </li>
                ))}
              </ul>
            </article>
          ))
        ) : null}
      </section>
    </main>
  );
}

function MenuScreen({
  category,
  query,
  pizzas,
  products,
  cartCount,
  onCategoryChange,
  onQueryChange,
  onOpenCart,
  onOpenPizza,
  onAddProduct,
}: {
  category: Category;
  query: string;
  pizzas: MenuPizza[];
  products: MenuProduct[];
  cartCount: number;
  onCategoryChange: (category: Category) => void;
  onQueryChange: (query: string) => void;
  onOpenCart: () => void;
  onOpenPizza: (pizza: MenuPizza) => void;
  onAddProduct: (product: MenuProduct) => void;
}) {
  const itemCount = pizzas.length + products.length;
  const itemLabel = category === "bebida" ? "bebidas" : category === "all" ? "itens" : "sabores";

  return (
    <main className="screen screen--menu">
      <section className="hero-card">
        <img src={HERO_IMAGE} alt="La Fratellis Pizzeria" />
        <div className="hero-card__overlay" />
        <div className="hero-card__top">
          <button className="hamburger" aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
          <button className="cart-button" onClick={onOpenCart}>
            <ShoppingCart size={18} />
            {cartCount > 0 && <strong>{cartCount}</strong>}
          </button>
        </div>
        <div className="hero-card__copy">
          <p>La Fratellis Pizzeria</p>
          <h1>Escolha sua pizza favorita</h1>
        </div>
      </section>

      <section className="search-panel">
        <Search size={18} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar sabor..." />
      </section>

      <section className="tabs">
        {categories.map((item) => (
          <button
            key={item.id}
            className={category === item.id ? "is-active" : ""}
            onClick={() => onCategoryChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </section>

      <section className="section-heading">
        <div>
          <p>Cardapio</p>
          <h2>{category === "bebida" ? "Bebidas" : "Populares"}</h2>
        </div>
        <span>
          {itemCount} {itemLabel}
        </span>
      </section>

      <section className="pizza-grid">
        {pizzas.map((pizza) => (
          <PizzaCard key={pizza.id} pizza={pizza} onAdd={() => onOpenPizza(pizza)} />
        ))}
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={() => onAddProduct(product)} />
        ))}
      </section>
    </main>
  );
}

function CustomizeScreen({
  pizza,
  size,
  secondPizzaId,
  quantity,
  total,
  onBack,
  onSizeChange,
  onSecondPizzaChange,
  onQuantityChange,
  onAdd,
}: {
  pizza: MenuPizza;
  size: Size;
  secondPizzaId?: number;
  quantity: number;
  total: number;
  onBack: () => void;
  onSizeChange: (size: Size) => void;
  onSecondPizzaChange: (id: number | undefined) => void;
  onQuantityChange: (quantity: number) => void;
  onAdd: () => void;
}) {
  const secondPizza = secondPizzaId ? getPizza(secondPizzaId) : undefined;

  return (
    <main className="screen screen--detail">
      <AppTopbar title="Montar pizza" onBack={onBack} />
      <PizzaVisual pizza={pizza} large />

      <section className="detail-card">
        <div className="detail-title">
          <div>
            <h1>{pizza.name}</h1>
            <p>{pizza.ingredients}</p>
          </div>
          <strong>{money(total)}</strong>
        </div>

        <div className="choice-grid">
          <button className={size === "small" ? "is-active" : ""} onClick={() => onSizeChange("small")}>
            Brotinho
            <span>1 sabor - {money(pizzaPrice(pizza, "small"))}</span>
          </button>
          <button className={size === "large" ? "is-active" : ""} onClick={() => onSizeChange("large")}>
            Grande
            <span>Ate 2 sabores - {money(pizzaPrice(pizza, "large"))}</span>
          </button>
        </div>

        {size === "large" && (
          <section className="second-flavor">
            <div className="mini-heading">
              <h2>Segundo sabor</h2>
              <p>{secondPizza ? `Selecionado: ${secondPizza.name}` : "Opcional. Cobra o sabor mais caro."}</p>
            </div>
            <div className="flavor-scroll">
              <button className={!secondPizzaId ? "is-active" : ""} onClick={() => onSecondPizzaChange(undefined)}>
                Apenas {pizza.name}
              </button>
              {fallbackPizzas
                .filter((item) => item.id !== pizza.id)
                .map((item) => (
                  <button
                    key={item.id}
                    className={secondPizzaId === item.id ? "is-active" : ""}
                    onClick={() => onSecondPizzaChange(item.id)}
                  >
                    {item.name}
                    <span>{money(item.priceLarge)}</span>
                  </button>
                ))}
            </div>
          </section>
        )}

        <div className="detail-actions">
          <QuantityControl value={quantity} onChange={onQuantityChange} />
          <button className="primary-action" onClick={onAdd}>
            Adicionar
          </button>
        </div>
      </section>
    </main>
  );
}

function CartScreen({
  cart,
  total,
  onBack,
  onCheckout,
  onMinus,
  onPlus,
  onRemove,
}: {
  cart: CartItem[];
  total: number;
  onBack: () => void;
  onCheckout: () => void;
  onMinus: (id: string) => void;
  onPlus: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <main className="screen">
      <AppTopbar title="Meu pedido" onBack={onBack} />
      {cart.length === 0 ? (
        <section className="empty-state">
          <ShoppingCart size={34} />
          <h1>Seu carrinho esta vazio</h1>
          <p>Volte ao cardapio e escolha seus itens.</p>
        </section>
      ) : (
        <>
          <section className="cart-list">
            {cart.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                onMinus={() => onMinus(item.id)}
                onPlus={() => onPlus(item.id)}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </section>
          <section className="checkout-bar">
            <div>
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            <button className="primary-action" onClick={onCheckout}>
              FAZER PEDIDO
            </button>
          </section>
        </>
      )}
    </main>
  );
}

function CheckoutScreen({
  cartTotal,
  discount,
  finalTotal,
  couponCode,
  isCouponActive,
  couponSecondsLeft,
  customer,
  saveCustomer,
  onBack,
  onCustomerChange,
  onCouponChange,
  onApplyCoupon,
  onSaveCustomerChange,
  onSubmit,
}: {
  cartTotal: number;
  discount: number;
  finalTotal: number;
  couponCode: string;
  isCouponActive: boolean;
  couponSecondsLeft: number;
  customer: Customer;
  saveCustomer: boolean;
  onBack: () => void;
  onCustomerChange: (field: keyof Customer, value: string) => void;
  onCouponChange: (value: string) => void;
  onApplyCoupon: () => void;
  onSaveCustomerChange: (save: boolean) => void;
  onSubmit: () => void | Promise<void>;
}) {
  return (
    <main className="screen">
      <AppTopbar title="Checkout" onBack={onBack} />
      <section className="checkout-card">
        <div className="mini-heading">
          <h1>Dados para entrega</h1>
          <p>Usamos seu WhatsApp como identificador para recuperar dados salvos.</p>
        </div>

        <TextField label="WhatsApp" value={customer.phone} onChange={(value) => onCustomerChange("phone", value)} />

        <label className="save-data">
          <input type="checkbox" checked={saveCustomer} onChange={(event) => onSaveCustomerChange(event.target.checked)} />
          <span>Salvar contato neste celular para preencher automaticamente na proxima visita</span>
        </label>

        <TextField label="Nome" value={customer.name} onChange={(value) => onCustomerChange("name", value)} />
        <TextField label="Endereco" value={customer.address} onChange={(value) => onCustomerChange("address", value)} />
        <TextField
          label="Referencia (opcional)"
          value={customer.reference}
          onChange={(value) => onCustomerChange("reference", value)}
        />

        <section className={isCouponActive ? "coupon-box coupon-box--active" : "coupon-box"}>
          <div>
            <span>Cupom de primeira compra</span>
            <strong>{isCouponActive ? "10% aplicado" : "#PRIMEIRACOMPRA"}</strong>
          </div>
          <div className="coupon-form">
            <input
              value={couponCode}
              onChange={(event) => onCouponChange(event.target.value)}
              disabled={isCouponActive}
              placeholder="#PRIMEIRACOMPRA"
            />
            <button type="button" onClick={onApplyCoupon} disabled={isCouponActive}>
              Aplicar
            </button>
          </div>
          {isCouponActive && (
            <p>
              Promocao valida por <strong>{formatCountdown(couponSecondsLeft)}</strong>
            </p>
          )}
        </section>

        <div className="checkout-summary">
          <div>
            <span>Subtotal</span>
            <strong>{money(cartTotal)}</strong>
          </div>
          {discount > 0 && (
            <div className="checkout-summary__discount">
              <span>Desconto</span>
              <strong>-{money(discount)}</strong>
            </div>
          )}
          <div className="checkout-total">
            <span>Total do pedido</span>
            <strong>{money(finalTotal)}</strong>
          </div>
        </div>

        <button className="whatsapp-action" onClick={onSubmit}>
          Enviar pedido no WhatsApp
        </button>
      </section>
    </main>
  );
}

function AppTopbar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="app-topbar">
      <button onClick={onBack} aria-label="Voltar">
        <ChevronLeft size={25} />
      </button>
      <h1>{title}</h1>
      <span />
    </header>
  );
}

function BottomNav({
  screen,
  cartCount,
  onNavigate,
}: {
  screen: Screen;
  cartCount: number;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Navegacao">
      <button className={screen === "menu" ? "is-active" : ""} onClick={() => onNavigate("menu")}>
        <Home size={21} />
        <span>Cardapio</span>
      </button>
      <button className={screen === "cart" ? "is-active" : ""} onClick={() => onNavigate("cart")}>
        <ShoppingCart size={21} />
        <span>Carrinho</span>
        {cartCount > 0 && <strong>{cartCount}</strong>}
      </button>
      <button className={screen === "checkout" ? "is-active" : ""} onClick={() => onNavigate("checkout")}>
        <UserRound size={21} />
        <span>Checkout</span>
      </button>
    </nav>
  );
}

function PizzaCard({ pizza, onAdd }: { pizza: MenuPizza; onAdd: () => void }) {
  return (
    <article className="pizza-card">
      <button className="pizza-card__visual" onClick={onAdd} aria-label={`Escolher ${pizza.name}`}>
        <PizzaVisual pizza={pizza} />
      </button>
      <div className="pizza-card__body">
        <h3>{pizza.name}</h3>
        <p>{pizza.ingredients}</p>
        <div>
          <span>A partir de</span>
          <strong>{money(pizza.priceSmall)}</strong>
        </div>
      </div>
      <button className="pizza-card__add" onClick={onAdd} aria-label={`Adicionar ${pizza.name}`}>
        <Plus size={24} />
      </button>
    </article>
  );
}

function ProductCard({ product, onAdd }: { product: MenuProduct; onAdd: () => void }) {
  return (
    <article className="pizza-card product-card">
      <button className="pizza-card__visual product-card__visual" onClick={onAdd} aria-label={`Adicionar ${product.name}`}>
        <ProductVisual product={product} />
      </button>
      <div className="pizza-card__body">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div>
          <span>Unidade</span>
          <strong>{money(product.price)}</strong>
        </div>
      </div>
      <button className="pizza-card__add" onClick={onAdd} aria-label={`Adicionar ${product.name}`}>
        <Plus size={24} />
      </button>
    </article>
  );
}

function PizzaVisual({ pizza, large = false }: { pizza: MenuPizza; large?: boolean }) {
  const candidates = imageCandidates(pizza.imageUrl);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const imageSrc = candidates[candidateIndex];

  useEffect(() => {
    setCandidateIndex(0);
  }, [pizza.imageUrl]);

  return (
    <div className={large ? "pizza-visual pizza-visual--large" : "pizza-visual"}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={pizza.name}
          onError={() => setCandidateIndex((index) => (index + 1 < candidates.length ? index + 1 : candidates.length))}
        />
      ) : (
        <div className="pizza-visual__fallback">
          <span />
          <strong>{pizza.name.slice(0, 2)}</strong>
        </div>
      )}
    </div>
  );
}

function ProductVisual({ product }: { product: MenuProduct }) {
  return (
    <div className="product-visual">
      <img src={product.imageUrl} alt={product.name} />
    </div>
  );
}

function QuantityControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="quantity-control">
      <button onClick={() => onChange(Math.max(1, value - 1))} aria-label="Diminuir quantidade">
        <Minus size={16} />
      </button>
      <span>{value}</span>
      <button onClick={() => onChange(value + 1)} aria-label="Aumentar quantidade">
        <Plus size={16} />
      </button>
    </div>
  );
}

function CartRow({
  item,
  onMinus,
  onPlus,
  onRemove,
}: {
  item: CartItem;
  onMinus: () => void;
  onPlus: () => void;
  onRemove: () => void;
}) {
  if (item.itemType === "product") {
    const product = getProduct(item.productId);

    return (
      <article className="cart-row">
        {product ? <ProductVisual product={product} /> : <ShoppingCart size={42} />}
        <div className="cart-row__body">
          <h2>{product?.name || "Bebida"}</h2>
          <p>Bebida</p>
          <strong>{money(item.unitPrice * item.quantity)}</strong>
        </div>
        <div className="cart-row__side">
          <QuantityControl value={item.quantity} onChange={(nextValue) => (nextValue > item.quantity ? onPlus() : onMinus())} />
          <button className="remove-button" onClick={onRemove} aria-label="Remover item">
            <Trash2 size={17} />
          </button>
        </div>
      </article>
    );
  }

  const firstPizza = getPizza(item.firstPizzaId);
  const secondPizza = item.secondPizzaId ? getPizza(item.secondPizzaId) : undefined;
  const title = secondPizza ? `${firstPizza?.name} / ${secondPizza.name}` : firstPizza?.name || "Pizza";
  const sizeLabel = item.size === "small" ? "Brotinho" : "Grande";

  return (
    <article className="cart-row">
      <PizzaVisual pizza={firstPizza || fallbackPizzas[0]} />
      <div className="cart-row__body">
        <h2>{title}</h2>
        <p>
          {sizeLabel}
          {secondPizza ? " - preco do sabor mais caro" : ""}
        </p>
        <strong>{money(item.unitPrice * item.quantity)}</strong>
      </div>
      <div className="cart-row__side">
        <QuantityControl value={item.quantity} onChange={(nextValue) => (nextValue > item.quantity ? onPlus() : onMinus())} />
        <button className="remove-button" onClick={onRemove} aria-label="Remover item">
          <Trash2 size={17} />
        </button>
      </div>
    </article>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default App;
