"use client";

import { FormEvent, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { fetchWithRetry } from "@/lib/fetch-utils";
import { useDataCache, invalidateCache } from "@/lib/use-data-cache";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  EmptyState,
} from "@/components/admin/ui";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  advertised: boolean;
  active: boolean;
  sortOrder: number;
  soldCount?: number;
  stockLimit?: number;
  descriptionText?: string;
};

import { useCreditRate } from "@/lib/use-credit-rate";

export default function ProductsPage() {
  const creditRate = useCreditRate();

  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newSortOrder, setNewSortOrder] = useState(1);

  // View mode tab state
  const [viewMode, setViewMode] = useState<"catalog" | "sell" | "sales">("catalog");

  // Sell POS States
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<{ id: string; fullName: string; phone: string | null; email: string | null; balance?: number }[]>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; fullName: string; phone: string | null; email: string | null; balance?: number } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Cart state
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [delivered, setDelivered] = useState(true);
  const [saleNotes, setSaleNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [sellSubmitting, setSellSubmitting] = useState(false);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  // Inline editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editAdvertised, setEditAdvertised] = useState(true);
  const [editSortOrder, setEditSortOrder] = useState(1);
  const [editStockLimit, setEditStockLimit] = useState(0);
  const [editDescriptionText, setEditDescriptionText] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    const res = await fetchWithRetry("/api/admin/products");
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(data?.error || "Failed to load products.");
    }
    return data as Product[];
  }, []);

  const { data: productsData, loading, error: productsError, refetch, mutate } = useDataCache(
    "/api/admin/products",
    fetcher
  );

  const products = productsData ?? [];

  useEffect(() => {
    if (products.length > 0) {
      setNewSortOrder(products.filter((p: Product) => p.active).length + 1);
    }
  }, [products]);

  useEffect(() => {
    if (productsError) {
      setMessage({ text: productsError, tone: "danger" });
    }
  }, [productsError]);

  const loadProducts = useCallback(async () => {
    invalidateCache("/api/admin/products");
    await refetch();
  }, [refetch]);

  async function loadSales() {
    setSalesLoading(true);
    try {
      const res = await fetchWithRetry("/api/admin/invoices");
      const data = await res.json();
      let list = [];
      if (res.ok && Array.isArray(data)) {
        list = data;
      } else if (res.ok && data && Array.isArray(data.invoices)) {
        list = data.invoices;
      }
      setSalesList(list.filter((inv: any) => inv.category === "sale"));
    } catch {
      // ignore
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    if (viewMode === "sales") {
      loadSales();
    }
  }, [viewMode]);

  // Client Autocomplete Logic
  useEffect(() => {
    if (clientSearch.length < 1) {
      setClientOptions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/admin/clients?search=${encodeURIComponent(clientSearch)}&limit=8`)
        .then((r) => r.json())
        .then((data) => setClientOptions(Array.isArray(data) ? data : data.clients ?? []));
    }, 200);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Cart Management
  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      const remainingStock = product.stockLimit && product.stockLimit > 0
        ? Math.max(0, product.stockLimit - (product.soldCount || 0))
        : null;

      if (existing) {
        if (remainingStock !== null && existing.quantity >= remainingStock) {
          return current;
        }
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (remainingStock !== null && remainingStock <= 0) {
        return current;
      }
      return [...current, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            const remainingStock = item.product.stockLimit && item.product.stockLimit > 0
              ? Math.max(0, item.product.stockLimit - (item.product.soldCount || 0))
              : null;
            if (remainingStock !== null && newQty > remainingStock) {
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  async function handleCompleteSale() {
    if (!selectedClient) {
      setMessage({ text: "Please select a client.", tone: "danger" });
      return;
    }
    if (cart.length === 0) {
      setMessage({ text: "Cart is empty.", tone: "danger" });
      return;
    }

    // Validate stock levels before proceeding
    for (const item of cart) {
      if (item.product.stockLimit && item.product.stockLimit > 0) {
        const remainingStock = Math.max(0, item.product.stockLimit - (item.product.soldCount || 0));
        if (item.quantity > remainingStock) {
          setMessage({
            text: `Insufficient stock for ${item.product.name}. Only ${remainingStock} items left in stock.`,
            tone: "danger"
          });
          return;
        }
      }
    }

    if (paymentMethod === "card") {
      const creditsNeeded = Math.floor((cartTotal / creditRate) * 100) / 100;
      const clientBalance = selectedClient.balance ?? 0;
      if (clientBalance < creditsNeeded) {
        setMessage({
          text: `Insufficient credit balance. Client has ${clientBalance.toFixed(2)} credits, but this sale requires ${creditsNeeded.toFixed(2)} credits.`,
          tone: "danger"
        });
        return;
      }
    }

    setSellSubmitting(true);
    setMessage(null);

    const itemsSummary = cart
      .map((item) => `${item.product.name} (x${item.quantity})`)
      .join(", ");

    const creditsDeducted = paymentMethod === "card" ? Math.floor((cartTotal / creditRate) * 100) / 100 : undefined;
    const saleNotesJson = JSON.stringify({
      type: "sale",
      items: cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      })),
      paymentMethod,
      delivered,
      creditsDeducted,
      originalNotes: saleNotes,
    });

    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          amount: cartTotal,
          category: "sale",
          items: itemsSummary,
          notes: saleNotesJson,
          status: paymentMethod === "card" ? "paid" : paymentStatus,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({
          text: `Sale recorded successfully. Invoice ${data.invoice.invoiceCode} created.`,
          tone: "success",
        });
        setCart([]);
        setSelectedClient(null);
        setClientSearch("");
        setSaleNotes("");
        setPaymentStatus("paid");
        setPaymentMethod("cash");
        setDelivered(true);
        setViewMode("catalog");
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to record sale.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error occurred while recording sale.", tone: "danger" });
    } finally {
      setSellSubmitting(false);
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const stockLimit = Number(formData.get("stockLimit")) || 0;
    const text = formData.get("descriptionText") as string || "";
    const description = JSON.stringify({ stockLimit, text });

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        price: Number(formData.get("price")),
        description,
        imageUrl: formData.get("imageUrl") || null,
        advertised: formData.get("advertised") === "true",
        sortOrder: Number(formData.get("sortOrder")) || 0,
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      setMessage({ text: "Product created successfully.", tone: "success" });
      (event.target as HTMLFormElement).reset();
      setNewSortOrder(activeProducts.length + 2);
      await loadProducts();
    } else {
      const data = await res.json();
      setMessage({ text: data.error ?? "Failed to create product.", tone: "danger" });
    }
  }

  async function handleEditSave(id: string) {
    setEditSubmitting(true);
    setMessage(null);

    const description = JSON.stringify({ stockLimit: editStockLimit, text: editDescriptionText });

    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        price: editPrice,
        description,
        imageUrl: editImageUrl || null,
        advertised: editAdvertised,
        sortOrder: editSortOrder,
      }),
    });

    setEditSubmitting(false);

    if (res.ok) {
      setMessage({ text: "Product updated successfully.", tone: "success" });
      setEditingId(null);
      await loadProducts();
    } else {
      const data = await res.json();
      setMessage({ text: data.error ?? "Failed to update product.", tone: "danger" });
    }
  }

  async function toggleActive(product: Product) {
    setTogglingId(product.id);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active }),
      });
      await loadProducts();
    } finally {
      setTogglingId(null);
    }
  }

  async function toggleAdvertised(product: Product) {
    setTogglingId(product.id + "-adv");
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advertised: !product.advertised }),
      });
      await loadProducts();
    } finally {
      setTogglingId(null);
    }
  }

  async function moveProduct(product: Product, direction: "up" | "down") {
    const currentIndex = activeProducts.findIndex((p) => p.id === product.id);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= activeProducts.length) return;

    const reordered = [...activeProducts];
    [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];

    const updatedActive = reordered.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
    }));
    const updatedById = new Map(updatedActive.map((item) => [item.id, item]));

    setOrderingId(product.id);
    setMessage(null);
    mutate((current) => (current || []).map((item: Product) => updatedById.get(item.id) ?? item), false);

    try {
      const responses = await Promise.all(
        updatedActive.map((item) =>
          fetch(`/api/admin/products/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: item.sortOrder }),
          })
        )
      );

      if (responses.some((res) => !res.ok)) {
        throw new Error("Failed to save product order.");
      }

      setMessage({ text: "Product order updated.", tone: "success" });
      await loadProducts();
    } catch {
      setMessage({ text: "Failed to update product order.", tone: "danger" });
      await loadProducts();
    } finally {
      setOrderingId(null);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditName(product.name);
    setEditPrice(product.price);
    setEditStockLimit(product.stockLimit || 0);
    setEditDescriptionText(product.descriptionText || product.description || "");
    setEditImageUrl(product.imageUrl || "");
    setEditAdvertised(product.advertised);
    setEditSortOrder(product.sortOrder);
  }

  const activeProducts = products
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => product.active)
    .sort((a, b) => a.product.sortOrder - b.product.sortOrder || a.index - b.index)
    .map(({ product }) => product);
  const archivedProducts = products.filter((p) => !p.active);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-500/20 bg-purple-500/5 px-3.5 py-2">
        <div className="flex items-center gap-2 text-xs">
          <Link href="/admin" className="font-bold text-slate-400 hover:text-white transition-colors">
            AQA ERP
          </Link>
          <span className="text-slate-600">/</span>
          <Link href="/admin/store" className="font-bold text-purple-400 hover:text-purple-300 transition-colors">
            3. AQA Store
          </Link>
          <span className="text-slate-600">/</span>
          <span className="font-extrabold text-[var(--foreground)]">Store Products & POS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/store?tab=swim-gear"
            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Swim Gear Boutique →
          </Link>
          <Link
            href="/admin/store"
            className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
          >
            AQA Store Hub →
          </Link>
        </div>
      </div>

      <PageHeader
        title="AQA Store · Products & POS"
        description="3. AQA Store · Manage retail products, sportswear, POS sales cart, and storefront advertising."
      />

      {/* View Mode Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6">
        <button
          onClick={() => {
            setViewMode("catalog");
            setMessage(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
            viewMode === "catalog"
              ? "border-[var(--primary)] text-[var(--primary)] font-extrabold"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Catalog Management
        </button>
        <button
          onClick={() => {
            setViewMode("sell");
            setMessage(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
            viewMode === "sell"
              ? "border-[var(--primary)] text-[var(--primary)] font-extrabold"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Record a Sale (Store POS)
        </button>
        <button
          onClick={() => {
            setViewMode("sales");
            setMessage(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
            viewMode === "sales"
              ? "border-[var(--primary)] text-[var(--primary)] font-extrabold"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Sales History Log
        </button>
      </div>

      {message && (
        <div className="mb-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      {/* Catalog Mode */}
      {viewMode === "catalog" && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Create form */}
          <div className="space-y-4">
            <Card>
              <h3 className="mb-4 text-base font-semibold">Add Product</h3>
              <form onSubmit={createProduct} className="space-y-4">
                <Input
                  label="Product Name"
                  name="name"
                  placeholder="e.g. Pro Swimming Goggles"
                  required
                />
                <Input
                  label="Price (DA)"
                  name="price"
                  type="number"
                  min={1}
                  placeholder="e.g. 3500"
                  required
                />
                <Input
                  label="Description"
                  name="descriptionText"
                  placeholder="e.g. Anti-fog, UV protection"
                />
                <Input
                  label="Stock Limit"
                  name="stockLimit"
                  type="number"
                  min={0}
                  placeholder="e.g. 50 (0 for unlimited)"
                  defaultValue={0}
                />
                <Input
                  label="Image URL (Optional)"
                  name="imageUrl"
                  placeholder="e.g. /image/goggles.png"
                />
                <Input
                  label="Sort order"
                  name="sortOrder"
                  type="number"
                  min={0}
                  value={newSortOrder}
                  onChange={(e) => setNewSortOrder(Number(e.target.value) || 0)}
                  hint="Lower numbers appear first."
                />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)]">Display on Vitrine</label>
                  <div className="flex gap-4 mt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="radio" name="advertised" value="true" defaultChecked />
                      Yes, advertise
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="radio" name="advertised" value="false" />
                      No, hide
                    </label>
                  </div>
                </div>

                <Button type="submit" className="w-full" loading={submitting}>
                  Create Product
                </Button>
              </form>
            </Card>
          </div>

          {/* Products list */}
          <div className="space-y-6">
            {loading ? (
              <Card>
                <p className="py-4 text-center text-sm text-[var(--muted)]">Loading products…</p>
              </Card>
            ) : activeProducts.length === 0 ? (
              <Card>
                <EmptyState
                  title="No active products"
                  description="Add products to start showcasing gear to your clients."
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  }
                />
              </Card>
            ) : (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Active Products ({activeProducts.length})
                </h3>
                <div className="space-y-3">
                  {activeProducts.map((product, index) => (
                    <div key={product.id}>
                      {editingId === product.id ? (
                        <Card className="border-[var(--primary)] ring-1 ring-[var(--primary)] animate-slide-in">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm">Edit Product</h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Input
                                label="Name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                              />
                              <Input
                                label="Price"
                                type="number"
                                min={1}
                                value={editPrice}
                                onChange={(e) => setEditPrice(Number(e.target.value) || 0)}
                              />
                              <Input
                                label="Description"
                                value={editDescriptionText}
                                onChange={(e) => setEditDescriptionText(e.target.value)}
                              />
                              <Input
                                label="Stock Limit"
                                type="number"
                                min={0}
                                value={editStockLimit}
                                onChange={(e) => setEditStockLimit(Number(e.target.value) || 0)}
                              />
                              <Input
                                label="Image URL"
                                value={editImageUrl}
                                onChange={(e) => setEditImageUrl(e.target.value)}
                              />
                              <Input
                                label="Sort order"
                                type="number"
                                min={0}
                                value={editSortOrder}
                                onChange={(e) => setEditSortOrder(Number(e.target.value) || 0)}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="editAdvertised"
                                checked={editAdvertised}
                                onChange={(e) => setEditAdvertised(e.target.checked)}
                                className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                              />
                              <label htmlFor="editAdvertised" className="text-xs font-semibold text-[var(--foreground)]">
                                Advertise on client vitrine
                              </label>
                            </div>

                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleEditSave(product.id)} loading={editSubmitting}>
                                Save
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ) : (
                        <ProductRow
                          product={product}
                          onToggle={toggleActive}
                          onToggleAdv={toggleAdvertised}
                          onEdit={startEdit}
                          onMoveUp={() => moveProduct(product, "up")}
                          onMoveDown={() => moveProduct(product, "down")}
                          disableMoveUp={index === 0}
                          disableMoveDown={index === activeProducts.length - 1}
                          orderPosition={index + 1}
                          loading={togglingId === product.id || togglingId === product.id + "-adv" || orderingId === product.id}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {archivedProducts.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Archived Products ({archivedProducts.length})
                </h3>
                <div className="space-y-3">
                  {archivedProducts.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onToggle={toggleActive}
                      onToggleAdv={toggleAdvertised}
                      loading={togglingId === product.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POS Sell Mode */}
      {viewMode === "sell" && (
        <div className="grid gap-6 lg:grid-cols-[450px_1fr]">
          {/* Left Panel: Checkout details */}
          <div className="space-y-4">
            <Card>
              <h3 className="mb-4 text-base font-semibold">Sale Checkout</h3>
              
              {/* Client Selection (Autocomplete) */}
              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-xs font-semibold text-[var(--muted)]">Search Client *</label>
                {selectedClient ? (
                  <div className="flex items-center justify-between rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-light)] px-4 py-3 text-sm">
                    <div>
                      <div className="font-bold text-[var(--foreground)]">{selectedClient.fullName}</div>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--muted)] mt-0.5">
                        {selectedClient.phone && <span>{selectedClient.phone}</span>}
                        {selectedClient.phone && <span>·</span>}
                        <span className="font-bold text-[var(--primary)] bg-[var(--surface)] rounded px-1.5 py-0.5">
                          Balance: {(selectedClient.balance ?? 0).toFixed(2)} credits
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setClientSearch("");
                      }}
                      className="text-xs font-bold text-red-400 hover:text-red-300 transition"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Type client name or phone..."
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    {showDropdown && clientOptions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                        {clientOptions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedClient(c);
                              setShowDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 text-start text-sm hover:bg-[var(--surface-2)] transition"
                          >
                            <div className="font-semibold text-[var(--foreground)]">{c.fullName}</div>
                            {c.phone && <div className="text-xs text-[var(--muted)] mt-0.5">{c.phone}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                    {showDropdown && clientSearch.length >= 1 && clientOptions.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)] shadow-lg text-center">
                        No clients found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart List */}
              <div className="mt-6 border-t border-[var(--border)] pt-4 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Cart Items</h4>
                {cart.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">
                    Cart is empty. Select products from the list on the right.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between gap-3 bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm text-[var(--foreground)] truncate" title={item.product.name}>
                            {item.product.name}
                          </div>
                          <div className="text-xs text-[var(--muted)] mt-0.5 font-bold">
                            {(item.product.price * item.quantity).toLocaleString()} DA
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Quantity adjustments */}
                          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="px-2.5 py-1 text-[var(--muted)] hover:bg-[var(--surface-2)] transition font-bold text-sm"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-xs font-semibold text-[var(--foreground)]">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="px-2.5 py-1 text-[var(--muted)] hover:bg-[var(--surface-2)] transition font-bold text-sm"
                            >
                              +
                            </button>
                          </div>
                          
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() => removeFromCart(item.product.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/15 hover:text-red-300 transition"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing & Submit */}
              <div className="mt-6 border-t border-[var(--border)] pt-4 space-y-4">
                <div className="flex justify-between items-center text-[var(--muted)] font-semibold text-sm">
                  <span>Subtotal</span>
                  <span>{cartTotal.toLocaleString()} DA</span>
                </div>
                <div className="flex justify-between items-center border-t border-[var(--border)] pt-3 text-[var(--foreground)] font-extrabold text-base">
                  <span>Total Amount</span>
                  <span className="text-[var(--primary)] font-black text-lg">{cartTotal.toLocaleString()} DA</span>
                </div>

                {/* Payment Method selector */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-[var(--muted)]">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`rounded-xl border px-4 py-2.5 text-xs font-bold uppercase transition ${
                        paymentMethod === "cash"
                          ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] font-extrabold"
                          : "border-[var(--border)] text-[var(--muted)] hover:border-slate-600"
                      }`}
                    >
                      Cash / Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`rounded-xl border px-4 py-2.5 text-xs font-bold uppercase transition ${
                        paymentMethod === "card"
                          ? "border-violet-500 bg-violet-500/15 text-violet-300 font-extrabold"
                          : "border-[var(--border)] text-[var(--muted)] hover:border-slate-600"
                      }`}
                    >
                      AQA Event Card
                    </button>
                  </div>
                </div>

                {/* Status selector (only for cash payments) */}
                {paymentMethod === "cash" ? (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-[var(--muted)]">Payment Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("paid")}
                        className={`rounded-xl border px-4 py-2.5 text-xs font-bold uppercase transition ${
                          paymentStatus === "paid"
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 font-extrabold"
                            : "border-[var(--border)] text-[var(--muted)] hover:border-slate-600"
                        }`}
                      >
                        Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("unpaid")}
                        className={`rounded-xl border px-4 py-2.5 text-xs font-bold uppercase transition ${
                          paymentStatus === "unpaid"
                            ? "border-amber-400 bg-amber-500/15 text-amber-400 font-extrabold"
                            : "border-[var(--border)] text-[var(--muted)] hover:border-slate-600"
                        }`}
                      >
                        On Credit (Unpaid)
                      </button>
                    </div>
                  </div>
                ) : (() => {
                  const creditsNeeded = Math.floor((cartTotal / creditRate) * 100) / 100;
                  const balance = selectedClient?.balance ?? 0;
                  return (
                    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-xs space-y-2">
                      <div className="flex justify-between items-center text-[var(--foreground)] font-medium">
                        <span>Equivalent Credits to Deduct:</span>
                        <span className="font-bold text-violet-300">{creditsNeeded.toFixed(2)} credits</span>
                      </div>
                      {selectedClient && (
                        <div className="flex justify-between items-center text-[var(--muted)]">
                          <span>Client Credit Balance:</span>
                          <span className={`font-bold ${
                            balance < creditsNeeded ? "text-red-400" : "text-[var(--foreground)]"
                          }`}>
                            {balance.toFixed(2)} credits
                          </span>
                        </div>
                      )}
                      {selectedClient && balance < creditsNeeded && (
                        <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-[11px] text-red-300 font-semibold leading-relaxed">
                          Insufficient credit balance on AQA Event Card.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Delivery Status selector */}
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 bg-[var(--surface-2)] text-xs">
                  <span className="font-semibold text-[var(--foreground)]">Delivery Status</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={delivered}
                      onChange={(e) => setDelivered(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-400 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                    <span className="ms-2.5 font-bold text-[var(--foreground)] min-w-[75px] text-end">
                      {delivered ? "Delivered" : "Pending"}
                    </span>
                  </label>
                </div>

                {/* Sale Notes */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-[var(--muted)]">Sale Notes (Optional)</label>
                  <textarea
                    placeholder="Add comments or notes..."
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-h-[80px]"
                  />
                </div>

                <Button
                  onClick={handleCompleteSale}
                  loading={sellSubmitting}
                  disabled={
                    !selectedClient ||
                    cart.length === 0 ||
                    (paymentMethod === "card" && (selectedClient.balance ?? 0) < (cartTotal / creditRate))
                  }
                  className="w-full py-3 mt-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Record Sale
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Panel: Products listing */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search products by name…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            {loading ? (
              <Card>
                <p className="py-8 text-center text-sm text-[var(--muted)]">Loading products…</p>
              </Card>
            ) : activeProducts.length === 0 ? (
              <Card>
                <EmptyState
                  title="No active products"
                  description="No products are available in the store. Add products in the Catalog tab first."
                  icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  }
                />
              </Card>
            ) : (() => {
              const filteredProducts = activeProducts.filter((p) =>
                p.name.toLowerCase().includes(productSearch.toLowerCase())
              );
              if (filteredProducts.length === 0) {
                return (
                  <Card>
                    <p className="py-8 text-center text-sm text-[var(--muted)]">No products match your search.</p>
                  </Card>
                );
              }
              return (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((p) => {
                    const remainingStock = p.stockLimit && p.stockLimit > 0 
                      ? Math.max(0, p.stockLimit - (p.soldCount || 0)) 
                      : null;
                    const inCartCount = cart.find(item => item.product.id === p.id)?.quantity || 0;
                    const available = remainingStock !== null ? Math.max(0, remainingStock - inCartCount) : 99999;
                    const isOutOfStock = remainingStock !== null && remainingStock <= 0;
                    const isCartLimitReached = remainingStock !== null && available <= 0;

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (isCartLimitReached) return;
                          addToCart(p);
                        }}
                        className={`flex flex-col justify-between rounded-2xl border bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition duration-200 ${
                          isCartLimitReached
                            ? "border-[var(--border)] opacity-60 cursor-not-allowed"
                            : "border-[var(--border)] cursor-pointer hover:border-[var(--primary)] hover:shadow-md hover:scale-[1.01]"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-light)] text-[var(--primary)] font-bold shrink-0">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                            </div>
                            {remainingStock !== null ? (
                              remainingStock === 0 ? (
                                <Badge tone="danger" size="sm">Out of Stock</Badge>
                              ) : remainingStock <= 5 ? (
                                <Badge tone="warning" size="sm">Low Stock ({remainingStock})</Badge>
                              ) : (
                                <Badge tone="default" size="sm">Stock: {remainingStock}</Badge>
                              )
                            ) : (
                              <Badge tone="default" size="sm">Unlimited</Badge>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-[var(--foreground)] text-sm line-clamp-1">{p.name}</h4>
                            <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2 h-8">{p.descriptionText || p.description || "No description"}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-3 shrink-0">
                          <span className="font-black text-[var(--foreground)] text-sm">{p.price.toLocaleString()} DA</span>
                          <span className={`text-xs font-bold transition ${
                            isCartLimitReached ? "text-[var(--muted)]" : "text-[var(--primary)] hover:opacity-80"
                          }`}>
                            {isOutOfStock ? "Out of Stock" : isCartLimitReached ? "Limit Reached" : "+ Add to Cart"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Sales History Log Mode */}
      {viewMode === "sales" && (
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-6 py-4 flex items-center justify-between">
            <h3 className="font-bold text-[var(--foreground)] text-sm">Store Sales History Log</h3>
            <Button variant="secondary" size="sm" onClick={loadSales} loading={salesLoading}>
              Refresh Sales
            </Button>
          </div>
          {salesLoading ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Loading sales history...</p>
          ) : salesList.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">No sales recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-start py-3 px-6 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="text-start py-3 px-6 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-start py-3 px-6 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      Purchased Items
                    </th>
                    <th className="text-center py-3 px-6 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      Delivery
                    </th>
                    <th className="text-start py-3 px-6 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      Method
                    </th>
                    <th className="text-end py-3 px-6 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-center py-3 px-6 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {salesList.map((inv: any) => {
                    let saleItems: { name: string; quantity: number; price: number }[] = [];
                    let delivered = true;
                    let paymentMethod = "cash";
                    if (inv.notes) {
                      try {
                        const parsed = JSON.parse(inv.notes);
                        if (parsed.type === "sale") {
                          if (Array.isArray(parsed.items)) {
                            saleItems = parsed.items;
                          }
                          if (parsed.delivered !== undefined) {
                            delivered = parsed.delivered;
                          }
                          if (parsed.paymentMethod !== undefined) {
                            paymentMethod = parsed.paymentMethod;
                          }
                        }
                      } catch {
                        // fallback
                      }
                    }

                    return (
                      <tr key={inv.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-xs text-[var(--foreground)]">
                          <div className="font-bold">{inv.invoiceCode}</div>
                          <div className="text-[10px] text-[var(--muted)] mt-0.5">
                            {new Date(inv.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-[var(--foreground)]">{inv.client.fullName}</div>
                          {inv.client.phone && <div className="text-[10px] text-[var(--muted)] mt-0.5">{inv.client.phone}</div>}
                        </td>
                        <td className="py-3.5 px-6">
                          {saleItems.length > 0 ? (
                            <div className="space-y-1">
                              {saleItems.map((item, idx) => (
                                <div key={idx} className="text-xs text-[var(--muted)] flex items-center gap-1.5">
                                  <span className="font-bold text-[var(--foreground)]">{item.name}</span>
                                  <span className="text-[var(--muted)] font-semibold">x{item.quantity}</span>
                                  <span className="text-[10px] text-[var(--muted)] font-medium">({item.price.toLocaleString()} DA)</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-[var(--muted)] italic">{inv.items}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            delivered 
                              ? "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]" 
                              : "bg-orange-500/20 text-orange-400"
                          }`}>
                            {delivered ? "Delivered" : "Pending"}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-start">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            paymentMethod === "card"
                              ? "bg-violet-500/20 text-violet-300"
                              : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]"
                          }`}>
                            {paymentMethod === "card" ? "Event Card" : "Cash"}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-end font-black text-[var(--foreground)]">
                          {inv.amount.toLocaleString()} DA
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-emerald-500/20 text-emerald-400">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function ProductRow({
  product,
  onToggle,
  onToggleAdv,
  onEdit,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
  orderPosition,
  loading,
}: {
  product: Product;
  onToggle: (p: Product) => void;
  onToggleAdv?: (p: Product) => void;
  onEdit?: (p: Product) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
  orderPosition?: number;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        {/* Product icon display */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 font-bold leading-none">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[var(--foreground)]">{product.name}</p>
            {product.active && orderPosition !== undefined && (
              <Badge tone="default" size="sm">#{orderPosition}</Badge>
            )}
            {product.advertised && product.active && (
              <Badge tone="success" size="sm">Advertised</Badge>
            )}
            {product.active && (() => {
              if (product.stockLimit && product.stockLimit > 0) {
                const sold = product.soldCount || 0;
                const remaining = Math.max(0, product.stockLimit - sold);
                if (remaining === 0) {
                  return <Badge tone="danger" size="sm">Out of Stock</Badge>;
                } else if (remaining <= 5) {
                  return <Badge tone="warning" size="sm">Low Stock: {remaining} left</Badge>;
                } else {
                  return <Badge tone="default" size="sm">Stock: {remaining} / {product.stockLimit}</Badge>;
                }
              } else {
                return <Badge tone="default" size="sm">Stock: Unlimited</Badge>;
              }
            })()}
            {!product.active && <Badge tone="default" size="sm">Archived</Badge>}
          </div>
          <p className="text-xs text-[var(--muted)]">
            {product.descriptionText || product.description || "No description"}
            {" · "}
            <span className="font-bold text-[var(--foreground)]">{product.price.toLocaleString()} DA</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {product.active && onMoveUp && onMoveDown && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              loading={loading}
              disabled={disableMoveUp}
            >
              Up
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              loading={loading}
              disabled={disableMoveDown}
            >
              Down
            </Button>
          </div>
        )}
        {onToggleAdv && product.active && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleAdv(product)}
            loading={loading}
          >
            {product.advertised ? "Hide" : "Advertise"}
          </Button>
        )}
        {onEdit && product.active && (
          <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
            Edit
          </Button>
        )}
        <Button
          variant={product.active ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onToggle(product)}
          loading={loading}
        >
          {product.active ? "Archive" : "Restore"}
        </Button>
      </div>
    </div>
  );
}
