import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/types/inventory';

interface ProductListProps {
  userId: string | undefined;
  onEditProduct: (product: Product) => void;
  onAdjustStock: (product: Product) => void; // New callback for stock adjustment
  refreshKey?: number; // To trigger re-fetch from parent
}

export default function ProductList({ userId, onEditProduct, onAdjustStock, refreshKey }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!userId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshKey]);

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This may also delete related inventory movements due to database constraints.')) return;

    // Note: Deleting a product that has inventory movements might fail if there's a FK constraint
    // on inventory_movements.product_id that doesn't have ON DELETE CASCADE (which we added).
    // Or, it might orphan movements if not cascaded. Our schema uses ON DELETE CASCADE for movements.
    // A soft delete (e.g., is_active = false) is often preferred for products.
    // For now, we proceed with hard delete as per basic plan.

    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', userId); // Ensure user owns it

      if (deleteError) throw deleteError;
      fetchProducts(); // Refresh list
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(`Failed to delete product: ${err.message}`);
    }
  };

  if (loading) return <p className="text-gray-600">Loading products...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!userId) return null;

  return (
    <div className="mt-6 bg-white p-4 shadow rounded-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Products</h3>
      {products.length === 0 ? (
        <p className="text-gray-500">No products found. Add one using the form.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Price</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder At</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => {
                const atReorderPoint = product.reorder_point !== null && product.current_stock_level <= product.reorder_point;
                return (
                  <tr key={product.id} className={`hover:bg-gray-50 ${atReorderPoint ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{product.sku || 'N/A'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${product.sale_price.toFixed(2)}</td>
                    <td className={`px-4 py-2 whitespace-nowrap text-sm font-semibold ${atReorderPoint ? 'text-red-600' : 'text-gray-700'}`}>
                      {product.current_stock_level} {product.unit_of_measure}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{product.reorder_point ?? 'N/A'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => onEditProduct(product)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                       <button
                        onClick={() => onAdjustStock(product)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Adjust Stock
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
