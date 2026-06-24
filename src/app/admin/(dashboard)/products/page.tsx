"use client";

import { FormEvent, useEffect, useState } from "react";
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
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Inline editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editAdvertised, setEditAdvertised] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function loadProducts() {
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
        setMessage({ text: data?.error || "Failed to load products.", tone: "danger" });
      }
    } catch {
      setProducts([]);
      setMessage({ text: "Failed to load products.", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        price: Number(formData.get("price")),
        description: formData.get("description") || null,
        imageUrl: formData.get("imageUrl") || null,
        advertised: formData.get("advertised") === "true",
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      setMessage({ text: "Product created successfully.", tone: "success" });
      (event.target as HTMLFormElement).reset();
      await loadProducts();
    } else {
      const data = await res.json();
      setMessage({ text: data.error ?? "Failed to create product.", tone: "danger" });
    }
  }

  async function handleEditSave(id: string) {
    setEditSubmitting(true);
    setMessage(null);

    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        price: editPrice,
        description: editDescription || null,
        imageUrl: editImageUrl || null,
        advertised: editAdvertised,
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

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditName(product.name);
    setEditPrice(product.price);
    setEditDescription(product.description || "");
    setEditImageUrl(product.imageUrl || "");
    setEditAdvertised(product.advertised);
  }

  const activeProducts = products.filter((p) => p.active);
  const archivedProducts = products.filter((p) => !p.active);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Products & Gear"
        description="Manage equipment, sportswear, and accessories. Toggle 'Advertise' to display them on the client storefront."
      />

      {message && (
        <div className="mb-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

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
                name="description"
                placeholder="e.g. Anti-fog, UV protection"
              />
              <Input
                label="Image URL (Optional)"
                name="imageUrl"
                placeholder="e.g. /image/goggles.png"
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
                {activeProducts.map((product) => (
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
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                            />
                            <Input
                              label="Image URL"
                              value={editImageUrl}
                              onChange={(e) => setEditImageUrl(e.target.value)}
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
                            <label htmlFor="editAdvertised" className="text-xs font-semibold text-slate-700">
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
                        loading={togglingId === product.id || togglingId === product.id + "-adv"}
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
    </div>
  );
}

function ProductRow({
  product,
  onToggle,
  onToggleAdv,
  onEdit,
  loading,
}: {
  product: Product;
  onToggle: (p: Product) => void;
  onToggleAdv?: (p: Product) => void;
  onEdit?: (p: Product) => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-4">
        {/* Product icon display */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold leading-none">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-800">{product.name}</p>
            {product.advertised && product.active && (
              <Badge tone="success" size="sm">Advertised</Badge>
            )}
            {!product.active && <Badge tone="default" size="sm">Archived</Badge>}
          </div>
          <p className="text-xs text-[var(--muted)]">
            {product.description || "No description"}
            {" · "}
            <span className="font-bold text-[var(--foreground)]">{product.price.toLocaleString()} DA</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
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
