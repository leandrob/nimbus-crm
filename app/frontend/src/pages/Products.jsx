import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Package, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useRealtime } from '@/hooks/useWebSocket';
import { formatPrice } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { PageLoader } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ProductFormDialog } from '@/components/forms/ProductFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';

const ALL = '__all__';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    const query = api.qs({ search, active: active === ALL ? '' : active });
    return api.get(`/products${query}`).then(setProducts).catch((e) => toast.error(e.message));
  }, [search, active]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useRealtime(['product.created', 'product.updated', 'product.deleted'], load);

  async function confirmDelete() {
    try {
      await api.del(`/products/${deleting.id}`);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="The catalog of products and services you sell.">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> New product
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, SKU, or category…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={active} onValueChange={setActive}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="All products" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All products</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageLoader />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description={search || active !== ALL ? 'Try adjusting your search or filters.' : 'Add your first product to get started.'}
          action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> New product</Button>}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="max-w-md truncate text-xs text-muted-foreground">{p.description}</div>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{p.sku || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{p.category || '—'}</TableCell>
                  <TableCell>
                    {p.active ? (
                      <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">Active</Badge>
                    ) : (
                      <Badge className="border-transparent bg-secondary text-secondary-foreground">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(p.price)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} onSaved={load} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Delete product?"
        description={deleting ? `This will permanently remove ${deleting.name}.` : ''}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
