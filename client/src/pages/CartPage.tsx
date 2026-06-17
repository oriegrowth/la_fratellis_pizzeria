import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface CartPageProps {
  sessionId: string;
}

interface CheckoutData {
  name: string;
  phone: string;
  address: string;
  addressNumber: string;
  addressReference: string;
  saveData: boolean;
}

function formatCurrency(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CartPage({ sessionId }: CartPageProps) {
  const [, navigate] = useLocation();
  const [showCheckout, setShowCheckout] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [loadedPhoneFromDb, setLoadedPhoneFromDb] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    name: "",
    phone: "",
    address: "",
    addressNumber: "",
    addressReference: "",
    saveData: true,
  });

  const utils = trpc.useUtils();
  const { data: cartItems = [] } = trpc.cart.getItems.useQuery({ sessionId });
  const { data: allPizzas = [] } = trpc.pizzas.getAll.useQuery();
  const { data: savedCustomer } = trpc.customers.getByPhone.useQuery(checkoutData.phone, {
    enabled: checkoutData.phone.length >= 10,
  });

  const removeFromCartMutation = trpc.cart.removeItem.useMutation({
    onSuccess: async () => {
      await utils.cart.getItems.invalidate({ sessionId });
    },
  });
  const createOrderMutation = trpc.orders.create.useMutation();
  const clearCartMutation = trpc.cart.clear.useMutation({
    onSuccess: async () => {
      await utils.cart.getItems.invalidate({ sessionId });
    },
  });
  const createOrUpdateCustomerMutation = trpc.customers.createOrUpdate.useMutation();

  useEffect(() => {
    const savedPhone = localStorage.getItem("customerPhone");
    const savedData = localStorage.getItem("customerData");

    if (!savedPhone || !savedData) return;

    try {
      const data = JSON.parse(savedData);
      setCheckoutData((current) => ({
        ...current,
        name: data.name || "",
        phone: savedPhone,
        address: data.address || "",
        addressNumber: data.addressNumber || "",
        addressReference: data.addressReference || "",
      }));
    } catch {
      localStorage.removeItem("customerData");
    }
  }, []);

  useEffect(() => {
    if (!savedCustomer || loadedPhoneFromDb === checkoutData.phone) return;

    setLoadedPhoneFromDb(checkoutData.phone);
    setCheckoutData((current) => ({
      ...current,
      name: current.name || savedCustomer.name || "",
      address: current.address || savedCustomer.address || "",
      addressNumber: current.addressNumber || savedCustomer.addressNumber || "",
      addressReference: current.addressReference || savedCustomer.addressReference || "",
    }));
  }, [checkoutData.phone, loadedPhoneFromDb, savedCustomer]);

  const total = useMemo(
    () => cartItems.reduce((sum: number, item: any) => sum + Number(item.price) * item.quantity, 0),
    [cartItems],
  );

  const handleRemoveItem = async (id: number) => {
    await removeFromCartMutation.mutateAsync(id);
    toast.success("Item removido do carrinho");
  };

  const validateCheckoutData = () => {
    if (!checkoutData.name.trim()) {
      toast.error("Nome e obrigatorio");
      return false;
    }
    if (!checkoutData.phone || checkoutData.phone.length < 10) {
      toast.error("Telefone invalido");
      return false;
    }
    if (!checkoutData.address.trim()) {
      toast.error("Endereco e obrigatorio");
      return false;
    }
    if (!checkoutData.addressNumber.trim()) {
      toast.error("Numero e obrigatorio");
      return false;
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!validateCheckoutData()) return;
    if (cartItems.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }

    setIsCheckingOut(true);

    try {
      let customerId: number | undefined;

      if (checkoutData.saveData) {
        const customer = await createOrUpdateCustomerMutation.mutateAsync({
          phone: checkoutData.phone,
          name: checkoutData.name,
          address: checkoutData.address,
          addressNumber: checkoutData.addressNumber,
          addressReference: checkoutData.addressReference,
        });

        customerId = customer?.id;

        localStorage.setItem("customerPhone", checkoutData.phone);
        localStorage.setItem(
          "customerData",
          JSON.stringify({
            name: checkoutData.name,
            address: checkoutData.address,
            addressNumber: checkoutData.addressNumber,
            addressReference: checkoutData.addressReference,
          }),
        );
      }

      const orderItems = cartItems.map((item: any) => {
        const pizza1 = allPizzas.find((pizza: any) => pizza.id === item.pizzaId1);
        const pizza2 = item.pizzaId2 ? allPizzas.find((pizza: any) => pizza.id === item.pizzaId2) : null;
        const itemTotal = Number(item.price) * item.quantity;

        return {
          pizza1: pizza1?.name ?? "Pizza",
          pizza2: pizza2?.name,
          size: item.size === "small" ? "Brotinho" : "Grande",
          quantity: item.quantity,
          unitPrice: Number(item.price),
          itemTotal,
        };
      });

      await createOrderMutation.mutateAsync({
        customerId,
        phone: checkoutData.phone,
        name: checkoutData.name,
        address: checkoutData.address,
        addressNumber: checkoutData.addressNumber,
        addressReference: checkoutData.addressReference,
        items: JSON.stringify(orderItems),
        totalPrice: total,
      });

      const messageText = [
        "🍕 *NOVO PEDIDO - LA FRATELLIS*",
        "━━━━━━━━━━━━━━━━━━━━━━━",
        `👤 *Cliente:* ${checkoutData.name.trim()}`,
        `📞 *Telefone:* ${checkoutData.phone}`,
        `📍 *Endereço:* ${checkoutData.address}, ${checkoutData.addressNumber}`,
        checkoutData.addressReference ? `🗺️ *Referência:* ${checkoutData.addressReference}` : "",
        "━━━━━━━━━━━━━━━━━━━━━━━",
        "📦 *ITENS:*",
        ...orderItems.map((item: any) => (
          `• ${item.quantity}x ${item.pizza1}${item.pizza2 ? ` / ${item.pizza2}` : ""} (${item.size})\n  _Subtotal: ${formatCurrency(item.itemTotal)}_`
        )),
        "━━━━━━━━━━━━━━━━━━━━━━━",
        "🛵 *Entrega:* GRÁTIS",
        `💰 *TOTAL: ${formatCurrency(total)}*`,
        "━━━━━━━━━━━━━━━━━━━━━━━",
        "⏰ *Tempo Estimado:* 35-50 min",
        "\n_Pedido realizado via App La Fratellis_"
      ].filter(Boolean).join("\n");

      window.open(`https://wa.me/5511940720211?text=${encodeURIComponent(messageText)}`, "_blank");

      await clearCartMutation.mutateAsync(sessionId);
      setShowCheckout(false);
      toast.success("Pedido enviado para o WhatsApp");
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      toast.error("Erro ao finalizar pedido");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#fffaf3] px-4 py-6 text-stone-950">
        <div className="mx-auto max-w-3xl">
          <button onClick={() => navigate("/menu")} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-red-700">
            <ArrowLeft size={18} /> Voltar ao cardapio
          </button>
          <Card className="border border-stone-200 bg-white p-8 text-center shadow-sm">
            <ShoppingBag className="mx-auto mb-4 text-stone-400" size={44} />
            <h1 className="text-2xl font-bold">Seu carrinho esta vazio</h1>
            <p className="mt-2 text-stone-600">Escolha uma pizza inteira ou monte uma meio a meio para continuar.</p>
            <Button onClick={() => navigate("/menu")} className="mt-6 bg-red-600 text-white hover:bg-red-700">
              Ver cardapio
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffaf3] px-4 py-6 text-stone-950">
      <div className="mx-auto max-w-4xl">
        <button onClick={() => navigate("/menu")} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-red-700">
          <ArrowLeft size={18} /> Voltar ao cardapio
        </button>

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-red-700">Pedido</p>
            <h1 className="text-3xl font-bold">Seu carrinho</h1>
          </div>
          <p className="text-right text-sm text-stone-600">{cartItems.length} item(ns)</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="space-y-3">
            {cartItems.map((item: any) => {
              const pizza1 = allPizzas.find((pizza: any) => pizza.id === item.pizzaId1);
              const pizza2 = item.pizzaId2 ? allPizzas.find((pizza: any) => pizza.id === item.pizzaId2) : null;
              const itemTotal = Number(item.price) * item.quantity;

              return (
                <Card key={item.id} className="flex items-start justify-between gap-4 border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold">
                      {pizza1?.name ?? "Pizza"}
                      {pizza2 && ` + ${pizza2.name}`}
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {item.size === "small" ? "Brotinho" : "Grande"} - Quantidade: {item.quantity}
                    </p>
                    {pizza2 && <p className="mt-1 text-xs font-medium text-green-700">Meio a meio: preco do sabor mais caro aplicado.</p>}
                    <p className="mt-2 font-bold text-red-700">{formatCurrency(itemTotal)}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="rounded-full p-2 text-red-600 hover:bg-red-50"
                    aria-label="Remover item"
                  >
                    <Trash2 size={20} />
                  </button>
                </Card>
              );
            })}
          </section>

          <aside className="space-y-4">
            <Card className="border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex justify-between gap-3 text-sm text-stone-600">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-3 text-sm font-semibold text-green-700">
                <span>Entrega</span>
                <span>Gratis</span>
              </div>
              <div className="mt-4 border-t border-stone-200 pt-4">
                <div className="flex justify-between gap-3 text-lg font-bold">
                  <span>Total</span>
                  <span className="text-red-700">{formatCurrency(total)}</span>
                </div>
              </div>
            </Card>

            <Card className="border border-stone-200 bg-white p-5 shadow-sm">
              <button
                onClick={() => setShowCheckout(!showCheckout)}
                className="flex w-full items-center justify-between gap-3 text-left font-bold"
              >
                Dados de entrega
                {showCheckout ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showCheckout && (
                <div className="mt-5 space-y-4">
                  <label className="block text-sm font-semibold">
                    Nome *
                    <Input
                      value={checkoutData.name}
                      onChange={(event) => setCheckoutData({ ...checkoutData, name: event.target.value })}
                      className="mt-2 h-11 bg-white"
                      placeholder="Seu nome"
                    />
                  </label>

                  <label className="block text-sm font-semibold">
                    Telefone *
                    <Input
                      type="tel"
                      value={checkoutData.phone}
                      onChange={(e) => setCheckoutData({ ...checkoutData, phone: e.target.value.replace(/\D/g, "") })}
                      className="mt-2 h-11 bg-white"
                      placeholder="(11) 99999-9999"
                    />
                  </label>

                  <div className="grid grid-cols-[1fr_80px] gap-3">
                    <label className="block text-sm font-semibold">
                      Endereço *
                      <Input
                        value={checkoutData.address}
                        onChange={(e) => setCheckoutData({ ...checkoutData, address: e.target.value })}
                        className="mt-2 h-11 bg-white"
                        placeholder="Rua, Avenida..."
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Nº *
                      <Input
                        value={checkoutData.addressNumber}
                        onChange={(e) => setCheckoutData({ ...checkoutData, addressNumber: e.target.value })}
                        className="mt-2 h-11 bg-white"
                        placeholder="123"
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-semibold">
                    Ponto de referência / Complemento
                    <Input
                      value={checkoutData.addressReference}
                      onChange={(e) => setCheckoutData({ ...checkoutData, addressReference: e.target.value })}
                      className="mt-2 h-11 bg-white"
                      placeholder="Ex: Próximo ao mercado"
                    />
                  </label>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="saveData"
                      checked={checkoutData.saveData}
                      onChange={(e) => setCheckoutData({ ...checkoutData, saveData: e.target.checked })}
                      className="h-4 w-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="saveData" className="text-sm font-medium text-stone-700">
                      Lembrar meus dados para o próximo pedido
                    </label>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="h-14 w-full bg-green-600 text-lg font-bold text-white shadow-lg shadow-green-100 hover:bg-green-700 active:scale-[0.98]"
                  >
                    {isCheckingOut ? "Processando..." : "Confirmar e enviar WhatsApp"}
                  </Button>
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}