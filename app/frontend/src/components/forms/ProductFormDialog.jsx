import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';

const empty = { name: '', sku: '', category: '', price: '', description: '', active: true };

export function ProductFormDialog({ open, onOpenChange, product, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(product);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category || '',
        price: product.price != null ? String(product.price) : '',
        description: product.description || '',
        active: Boolean(product.active),
      });
    } else {
      setForm(empty);
    }
  }, [open, product]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    const price = Number(form.price || 0);
    if (Number.isNaN(price) || price < 0) {
      toast.error('Price must be a non-negative number');
      return;
    }
    setSaving(true);
    const payload = { ...form, price };
    try {
      const saved = isEdit ? await api.put(`/products/${product.id}`, payload) : await api.post('/products', payload);
      toast.success(isEdit ? 'Product updated' : 'Product created');
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit product' : 'New product'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update the product details.' : 'Add a product to your catalog.'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={set('name')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={set('sku')} placeholder="e.g. LIC-STARTER" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={set('category')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Price (USD) *</Label>
            <Input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={set('description')} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="product-active" checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: Boolean(v) }))} />
            <Label htmlFor="product-active" className="font-normal">Active (available for sale)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
