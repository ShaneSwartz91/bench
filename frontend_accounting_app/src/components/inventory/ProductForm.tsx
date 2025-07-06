import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product, NewProduct, ProductUpdate, NewInventoryMovement } from '@/types/inventory';

interface ProductFormProps {
  userId: string | undefined;
  productToEdit?: Product | null;
  onFormSubmit: (product: Product) => void; // Callback after successful submit
  onCancel: () => void;
}

export default function ProductForm({ userId, productToEdit, onFormSubmit, onCancel }: ProductFormProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('pcs');
  const [initialStock, setInitialStock] = useState<number | ''>(0); // Only for new products
  const [reorderPoint, setReorderPoint] = useState<number | ''>('');
  const [category, setCategory] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isEditMode = !!productToEdit;

  useEffect(() => {
    if (isEditMode && productToEdit) {
      setSku(productToEdit.sku || '');
      setName(productToEdit.name);
      setDescription(productToEdit.description || '');
      setPurchasePrice(productToEdit.purchase_price ?? '');
      setSalePrice(productToEdit.sale_price ?? '');
      setUnitOfMeasure(productToEdit.unit_of_measure || 'pcs');
      setReorderPoint(productToEdit.reorder_point ?? '');
      setCategory(productToEdit.category || '');
      // Initial stock is not editable directly for existing products; use stock adjustments.
      setInitialStock(''); // Clear it for edit mode
    } else {
      // Reset for new product form
      setSku(''); setName(''); setDescription(''); setPurchasePrice('');
      setSalePrice(''); setUnitOfMeasure('pcs'); setInitialStock(0);
      setReorderPoint(''); setCategory('');
    }
  }, [productToEdit, isEditMode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      setErrorMessage('User not identified. Please sign in.');
      return;
    }
    if (salePrice === '' || Number(salePrice) < 0) {
      setErrorMessage('Sale Price is required and cannot be negative.');
      return;
    }
     if (purchasePrice !== '' && Number(purchasePrice) < 0) {
      setErrorMessage('Purchase Price cannot be negative.');
      return;
    }
    if (!name.trim()) {
        setErrorMessage('Product Name is required.');
        return;
    }

    setLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      let savedProduct: Product;

      if (isEditMode && productToEdit) {
        const productUpdateData: ProductUpdate = {
          sku: sku || null, // Allow unsetting SKU by making it empty
          name,
          description: description || null,
          purchase_price: purchasePrice === '' ? null : Number(purchasePrice),
          sale_price: Number(salePrice),
          unit_of_measure: unitOfMeasure || null,
          reorder_point: reorderPoint === '' ? null : Number(reorderPoint),
          category: category || null,
          updated_at: new Date().toISOString(), // Manually set updated_at for client-side consistency
        };
        const { data, error } = await supabase
          .from('products')
          .update(productUpdateData)
          .eq('id', productToEdit.id)
          .eq('user_id', userId) // Ensure user owns the product
          .select()
          .single();
        if (error) throw error;
        savedProduct = data as Product;
        setMessage('Product updated successfully!');
      } else {
        // Create new product
        const newProductData: NewProduct = {
          sku: sku || undefined, // SKU is optional, DB might auto-generate or handle uniqueness
          name,
          description: description || undefined,
          purchase_price: purchasePrice === '' ? undefined : Number(purchasePrice),
          sale_price: Number(salePrice),
          unit_of_measure: unitOfMeasure || undefined,
          reorder_point: reorderPoint === '' ? undefined : Number(reorderPoint),
          category: category || undefined,
          // current_stock_level will be handled by trigger from initial_stock_level movement
        };

        const { data: createdProd, error: createError } = await supabase
          .from('products')
          .insert({ ...newProductData, user_id: userId })
          .select()
          .single();

        if (createError) throw createError;
        savedProduct = createdProd as Product;

        // If initial stock is provided, create an 'initial' inventory movement
        if (initialStock !== '' && Number(initialStock) > 0) {
          const initialMovement: NewInventoryMovement = {
            product_id: savedProduct.id,
            movement_type: 'initial',
            quantity_changed: Number(initialStock),
            notes: 'Initial stock when product created',
          };
          const { error: movementError } = await supabase
            .from('inventory_movements')
            .insert({ ...initialMovement, user_id: userId }); // user_id also for movement
          if (movementError) {
            // Log error, but product creation might still be considered successful.
            // Or, implement rollback/compensation if critical. For now, just log.
            console.error('Error creating initial stock movement:', movementError);
            setErrorMessage(`Product created, but failed to set initial stock: ${movementError.message}`);
          }
          // The trigger on inventory_movements should update product.current_stock_level
        }
        setMessage('Product created successfully!');
      }
      onFormSubmit(savedProduct); // Callback to parent
    } catch (error: any) {
      console.error('Error saving product:', error);
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const commonInputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border border-gray-200 rounded-lg shadow space-y-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-800">{isEditMode ? 'Edit Product' : 'Add New Product'}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700">Product Name <span className="text-red-500">*</span></label>
          <input id="productName" type="text" value={name} onChange={(e) => setName(e.target.value)} required className={commonInputClass}/>
        </div>
        <div>
          <label htmlFor="productSku" className="block text-sm font-medium text-gray-700">SKU (Optional)</label>
          <input id="productSku" type="text" value={sku} onChange={(e) => setSku(e.target.value)} className={commonInputClass}/>
        </div>
        <div>
          <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700">Sale Price <span className="text-red-500">*</span></label>
          <input id="salePrice" type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))} required min="0" step="0.01" className={commonInputClass}/>
        </div>
         <div>
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">Purchase Price (Optional)</label>
          <input id="purchasePrice" type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))} min="0" step="0.01" className={commonInputClass}/>
        </div>
        {!isEditMode && (
          <div>
            <label htmlFor="initialStock" className="block text-sm font-medium text-gray-700">Initial Stock Level</label>
            <input id="initialStock" type="number" value={initialStock} onChange={(e) => setInitialStock(e.target.value === '' ? '' : Number(e.target.value))} min="0" step="1" placeholder="0" className={commonInputClass}/>
            <p className="text-xs text-gray-500 mt-1">Set to 0 if no initial stock. Stock will be updated by an 'initial' movement.</p>
          </div>
        )}
         <div>
          <label htmlFor="reorderPoint" className="block text-sm font-medium text-gray-700">Reorder Point (Optional)</label>
          <input id="reorderPoint" type="number" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value === '' ? '' : Number(e.target.value))} min="0" step="1" className={commonInputClass}/>
        </div>
        <div>
          <label htmlFor="unitOfMeasure" className="block text-sm font-medium text-gray-700">Unit of Measure (Optional)</label>
          <input id="unitOfMeasure" type="text" value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)} placeholder="e.g., pcs, kg, box" className={commonInputClass}/>
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category (Optional)</label>
          <input id="category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Electronics, Books" className={commonInputClass}/>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={commonInputClass}/>
      </div>

      <div className="flex items-center justify-end space-x-3">
        <button
          type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit" disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Product')}
        </button>
      </div>

      {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
    </form>
  );
}
