import { useEffect, useState, type FormEvent } from "react";
import { Lock, LogOut } from "lucide-react";

type PartnerAccount = {
  id: number;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  pix: string | null;
  commissionPercent: number;
  status: "pending" | "active" | "disabled";
  createdAt: string;
};

type PartnerCoupon = {
  id: number;
  code: string;
  discountPercent: number;
  referralPercent: number;
  isActive: boolean;
  uses: number;
  revenue: number;
};

type SalesReport = {
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  ordersCount: number;
  commissionPercent: number;
  commissionAmount: number;
  orders: Array<{
    id: number;
    name: string;
    totalPrice: number;
    couponCode: string | null;
    partnerRef: string | null;
    status: string;
    createdAt: string;
  }>;
};

type Payout = {
  id: number;
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  commissionAmount: number;
  status: "pending" | "paid" | "rejected";
  paymentNote: string | null;
  requestedAt: string;
  paidAt: string | null;
};

type PartnerTab = "cupons" | "relatorio" | "pagamentos";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function readError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
  } catch {
    // ignore
  }
  return fallback;
}

export function PartnerPanel() {
  const [account, setAccount] = useState<PartnerAccount | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [activeTab, setActiveTab] = useState<PartnerTab>("cupons");

  const [form, setForm] = useState({ username: "", password: "", name: "", email: "", phone: "", instagram: "", pix: "" });
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [coupons, setCoupons] = useState<PartnerCoupon[]>([]);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const [newCoupon, setNewCoupon] = useState({ code: "", discountPercent: "10" });
  const [couponError, setCouponError] = useState("");
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [pixValue, setPixValue] = useState("");
  const [pixSaving, setPixSaving] = useState(false);
  const [pixMessage, setPixMessage] = useState("");

  const referralLink = account
    ? `${window.location.origin}/?ref=${encodeURIComponent(account.username)}`
    : "";

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const loadAccount = async () => {
    const response = await fetch("/api/partners/auth");
    if (response.ok) {
      const data = await response.json();
      setAccount(data.account);
      return true;
    }
    setAccount(null);
    return false;
  };

  const loadCoupons = async () => {
    try {
      const response = await fetch("/api/partners/coupons");
      if (response.ok) {
        const data = await response.json();
        setCoupons(
          (data.coupons || []).map((c: any) => ({
            id: Number(c.id),
            code: String(c.code),
            discountPercent: Number(c.discountPercent),
            referralPercent: Number(c.referralPercent),
            isActive: Boolean(c.isActive),
            uses: Number(c.uses ?? 0),
            revenue: Number(c.revenue ?? 0),
          })),
        );
      }
    } catch {
      // ignore
    }
  };

  const loadReport = async () => {
    try {
      const response = await fetch("/api/partners/finances?view=sales");
      if (response.ok) setReport(await response.json());
    } catch {
      // ignore
    }
  };

  const loadPayouts = async () => {
    try {
      const response = await fetch("/api/partners/finances?view=payouts");
      if (response.ok) {
        const data = await response.json();
        setPayouts(data.payouts || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    (async () => {
      await loadAccount();
      setIsCheckingAuth(false);
    })();
  }, []);

  useEffect(() => {
    if (account) {
      setPixValue(account.pix ?? "");
      void loadCoupons();
      void loadReport();
      void loadPayouts();
    }
  }, [account]);

  const savePix = async () => {
    setPixMessage("");
    setPixSaving(true);
    try {
      const response = await fetch("/api/partners/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pix: pixValue.trim() }),
      });
      if (!response.ok) {
        setPixMessage(await readError(response, "Nao foi possivel salvar a chave PIX."));
        return;
      }
      const data = await response.json();
      setAccount(data.account);
      setPixMessage("Chave PIX atualizada!");
    } catch {
      setPixMessage("Erro ao salvar a chave PIX.");
    } finally {
      setPixSaving(false);
    }
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);

    try {
      const endpoint =
        mode === "login" ? "/api/partners/auth?action=login" : "/api/partners/auth?action=signup";
      const body =
        mode === "login"
          ? { username: form.username, password: form.password }
          : form;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await loadAccount();
        return;
      }

      setAuthError(await readError(response, "Nao foi possivel continuar."));
    } catch {
      setAuthError("Erro de conexao. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/partners/auth?action=logout", { method: "POST" });
    } catch {
      // ignore
    }
    setAccount(null);
  };

  const createCoupon = async () => {
    setCouponError("");
    const code = newCoupon.code.trim().toUpperCase();
    if (!code) {
      setCouponError("Codigo do cupom e obrigatorio");
      return;
    }

    setIsSavingCoupon(true);
    try {
      const response = await fetch("/api/partners/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, discountPercent: Number(newCoupon.discountPercent) }),
      });

      if (!response.ok) {
        setCouponError(await readError(response, "Erro ao criar cupom"));
        return;
      }

      setNewCoupon({ code: "", discountPercent: "10" });
      await loadCoupons();
    } catch {
      setCouponError("Erro ao criar cupom");
    } finally {
      setIsSavingCoupon(false);
    }
  };

  const toggleCoupon = async (coupon: PartnerCoupon) => {
    try {
      const response = await fetch(`/api/partners/coupons?id=${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      if (response.ok) {
        setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !coupon.isActive } : c)));
      }
    } catch {
      // ignore
    }
  };

  const requestPayout = async () => {
    setPayoutMessage("");
    try {
      const response = await fetch("/api/partners/finances", { method: "POST" });
      if (!response.ok) {
        setPayoutMessage(await readError(response, "Nao foi possivel solicitar o saque."));
        return;
      }
      setPayoutMessage("Saque solicitado! O administrador vai processar o pagamento.");
      await loadPayouts();
      await loadReport();
    } catch {
      setPayoutMessage("Erro ao solicitar saque.");
    }
  };

  if (isCheckingAuth) {
    return (
      <main className="admin-shell admin-shell--login">
        <div className="admin-empty">Carregando...</div>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="admin-shell admin-shell--login">
        <form className="admin-login" onSubmit={handleAuth}>
          <div className="admin-login__icon">
            <Lock size={24} />
          </div>
          <h1>Area do parceiro</h1>
          <p>{mode === "login" ? "Acesse sua conta de parceiro." : "Crie sua conta de parceiro."}</p>

          {mode === "signup" && (
            <>
              <label>
                Nome
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label>
                Email
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label>
                Celular
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label>
                Instagram
                <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
              </label>
              <label>
                Chave PIX
                <input value={form.pix} onChange={(e) => setForm({ ...form, pix: e.target.value })} />
              </label>
            </>
          )}

          <label>
            Usuario
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <label>
            Senha
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>

          {authError && <strong className="admin-error">{authError}</strong>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            className="admin-link-button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setAuthError("");
            }}
          >
            {mode === "login" ? "Nao tem conta? Cadastre-se" : "Ja tem conta? Entrar"}
          </button>
        </form>
      </main>
    );
  }

  const isActive = account.status === "active";

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>La Fratellis</p>
          <h1>Area do parceiro</h1>
        </div>
        <button onClick={handleLogout}>
          <LogOut size={18} />
          Sair
        </button>
      </header>

      <section className="admin-stats">
        <article>
          <span>Parceiro</span>
          <strong>{account.name}</strong>
        </article>
        <article>
          <span>Comissao</span>
          <strong>{account.commissionPercent}%</strong>
        </article>
        <article>
          <span>Status</span>
          <strong>{isActive ? "Ativo" : account.status === "pending" ? "Pendente" : "Desativado"}</strong>
        </article>
      </section>

      {!isActive && (
        <div className="admin-empty">
          Sua conta esta {account.status === "pending" ? "aguardando aprovacao do administrador" : "desativada"}. Voce
          podera criar cupons assim que ela for ativada.
        </div>
      )}

      <div className="admin-tabs">
        <button className={activeTab === "cupons" ? "admin-tab admin-tab--active" : "admin-tab"} onClick={() => setActiveTab("cupons")}>
          Meus cupons
        </button>
        <button className={activeTab === "relatorio" ? "admin-tab admin-tab--active" : "admin-tab"} onClick={() => setActiveTab("relatorio")}>
          Relatorio
        </button>
        <button className={activeTab === "pagamentos" ? "admin-tab admin-tab--active" : "admin-tab"} onClick={() => setActiveTab("pagamentos")}>
          Pagamentos
        </button>
      </div>

      {activeTab === "cupons" && (
        <section className="admin-sales">
          <div className="admin-section-title">
            <h2>Meus cupons</h2>
            <button onClick={loadCoupons}>Atualizar</button>
          </div>

          <div className="admin-coupon-form">
            <h3>Seu link de divulgacao</h3>
            <p style={{ fontSize: "0.85rem", color: "#444" }}>
              Compartilhe este link. Toda compra que chegar por ele fica registrada como sua origem,
              mesmo que o cliente nao use um cupom.
            </p>
            <div className="admin-coupon-fields">
              <label>
                Link
                <input value={referralLink} readOnly onFocus={(e) => e.target.select()} />
              </label>
            </div>
            <button className="admin-coupon-save" onClick={copyReferralLink}>
              {linkCopied ? "Link copiado!" : "Copiar link"}
            </button>
          </div>

          {isActive && (
            <div className="admin-coupon-form">
              <h3>Criar novo cupom</h3>
              <div className="admin-coupon-fields">
                <label>
                  Codigo *
                  <input
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    placeholder="MEUCUPOM10"
                  />
                </label>
                <label>
                  Desconto para o cliente (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newCoupon.discountPercent}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: e.target.value })}
                  />
                </label>
              </div>
              <p style={{ fontSize: "0.8rem", color: "#666" }}>
                Sua comissao e de {account.commissionPercent}% (definida pelo administrador).
              </p>
              {couponError && <p className="admin-error">{couponError}</p>}
              <button className="admin-coupon-save" onClick={createCoupon} disabled={isSavingCoupon}>
                {isSavingCoupon ? "Salvando..." : "Criar cupom"}
              </button>
            </div>
          )}

          {coupons.length === 0 ? (
            <div className="admin-empty">Voce ainda nao criou cupons.</div>
          ) : (
            coupons.map((coupon) => (
              <article className={`admin-sale${coupon.isActive ? "" : " admin-sale--done"}`} key={coupon.id}>
                <div className="admin-sale__top">
                  <div>
                    <h3>{coupon.code}</h3>
                    <p>Desconto: {coupon.discountPercent}% &nbsp;|&nbsp; Comissao: {coupon.referralPercent}%</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>{money(coupon.revenue)}</strong>
                    <p style={{ fontSize: "0.75rem", color: "#666" }}>{coupon.uses} uso{coupon.uses !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="admin-sale__footer">
                  <label className="admin-done-toggle">
                    <input type="checkbox" checked={coupon.isActive} onChange={() => toggleCoupon(coupon)} />
                    <span>Cupom ativo</span>
                  </label>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {activeTab === "relatorio" && (
        <section className="admin-sales">
          <div className="admin-section-title">
            <h2>Relatorio do periodo atual</h2>
            <button onClick={loadReport}>Atualizar</button>
          </div>

          {report && (
            <section className="admin-stats">
              <article>
                <span>Vendas no periodo</span>
                <strong>{money(report.totalSales)}</strong>
              </article>
              <article>
                <span>Pedidos</span>
                <strong>{report.ordersCount}</strong>
              </article>
              <article>
                <span>Comissao acumulada</span>
                <strong>{money(report.commissionAmount)}</strong>
              </article>
            </section>
          )}

          {report && report.orders.length > 0 && (
            <p style={{ fontSize: "0.8rem", color: "#666" }}>
              Periodo iniciado em {new Date(report.periodStart).toLocaleDateString("pt-BR")}.
            </p>
          )}

          {!report || report.orders.length === 0 ? (
            <div className="admin-empty">Nenhuma venda atribuida no periodo atual.</div>
          ) : (
            report.orders.map((order) => (
              <article className="admin-sale" key={order.id}>
                <div className="admin-sale__top">
                  <div>
                    <h3>{order.name}</h3>
                    <p>
                      {new Date(order.createdAt).toLocaleString("pt-BR")} &nbsp;|&nbsp;{" "}
                      {order.couponCode ? `Cupom: ${order.couponCode}` : "Origem: link (sem cupom)"}
                    </p>
                  </div>
                  <strong>{money(Number(order.totalPrice))}</strong>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {activeTab === "pagamentos" && (
        <section className="admin-sales">
          <div className="admin-section-title">
            <h2>Pagamentos</h2>
            <button onClick={loadPayouts}>Atualizar</button>
          </div>

          <div className="admin-coupon-form">
            <h3>Sua chave PIX</h3>
            <p style={{ fontSize: "0.85rem", color: "#444" }}>
              O saque e pago nesta chave. Atualize se voce mudou de conta.
            </p>
            <div className="admin-coupon-fields">
              <label>
                Chave PIX
                <input
                  value={pixValue}
                  onChange={(e) => setPixValue(e.target.value)}
                  placeholder="CPF, celular, email ou chave aleatoria"
                />
              </label>
            </div>
            {pixMessage && <p className="admin-error">{pixMessage}</p>}
            <button className="admin-coupon-save" onClick={savePix} disabled={pixSaving}>
              {pixSaving ? "Salvando..." : "Salvar chave PIX"}
            </button>
          </div>

          <div className="admin-coupon-form">
            <h3>Solicitar saque</h3>
            <p style={{ fontSize: "0.85rem", color: "#444" }}>
              Comissao disponivel para saque: <strong>{money(report?.commissionAmount ?? 0)}</strong>
            </p>
            <p style={{ fontSize: "0.8rem", color: "#666" }}>
              Ao solicitar, o ciclo atual e encerrado e um novo periodo de acumulo comeca.
            </p>
            {payoutMessage && <p className="admin-error">{payoutMessage}</p>}
            <button
              className="admin-coupon-save"
              onClick={requestPayout}
              disabled={!report || report.commissionAmount <= 0 || payouts.some((p) => p.status === "pending")}
            >
              Solicitar saque
            </button>
            {payouts.some((p) => p.status === "pending") && (
              <p style={{ fontSize: "0.8rem", color: "#666" }}>Voce ja tem uma solicitacao pendente.</p>
            )}
          </div>

          {payouts.length === 0 ? (
            <div className="admin-empty">Nenhum saque solicitado ainda.</div>
          ) : (
            payouts.map((payout) => {
              const statusLabel =
                payout.status === "paid" ? "Pago" : payout.status === "pending" ? "Pendente" : "Rejeitado";
              return (
                <article className={`admin-sale${payout.status === "pending" ? "" : " admin-sale--done"}`} key={payout.id}>
                  <div className="admin-sale__top">
                    <div>
                      <h3>
                        {new Date(payout.periodStart).toLocaleDateString("pt-BR")} -{" "}
                        {new Date(payout.periodEnd).toLocaleDateString("pt-BR")}
                      </h3>
                      <p>
                        <span className={`admin-badge admin-badge--${payout.status}`}>{statusLabel}</span>
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong>{money(Number(payout.commissionAmount))}</strong>
                      <p style={{ fontSize: "0.75rem", color: "#666" }}>Vendas: {money(Number(payout.totalSales))}</p>
                    </div>
                  </div>
                  {payout.paymentNote && (
                    <div className="admin-customer">
                      <span>Observacao: {payout.paymentNote}</span>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      )}
    </main>
  );
}
