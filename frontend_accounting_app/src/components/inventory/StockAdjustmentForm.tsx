import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product, NewInventoryMovement, MovementType, MOVEMENT_TYPES } from '@/types/inventory';

interface StockAdjustmentFormProps {
  userId: string | undefined;
  product: Product | null; // Product to adjust stock for
  onAdjustmentSubmit: () => void; // Callback after successful submit
  onCancel: () => void;
}

// Filter movement types suitable for manual adjustment
const ADJUSTMENT_MOVEMENT_TYPES: MovementType[] = ['adjustment_in', 'adjustment_out', 'initial'];

export default function StockAdjustmentForm({ userId, product, onAdjustmentSubmit, onCancel }: StockAdjustmentFormProps) {
  const [movementType, setMovementType] = useState<MovementType>('adjustment_in');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Reset form when product changes or form is opened
    setMovementType('adjustment_in');
    setQuantity('');
    setNotes('');
    setMessage('');
    setErrorMessage('');
  }, [product]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !product) {
      setErrorMessage('User or Product not identified.');
      return;
    }
    if (quantity === '' || Number(quantity) <= 0) {
      setErrorMessage('Quantity must be a positive number.');
      return;
    }

    setLoading(true);
    setMessage('');
    setErrorMessage('');

    // quantity_changed is positive for 'adjustment_in'/'initial', negative for 'adjustment_out'
    const quantityChanged = (movementType === 'adjustment_out') ? -Math.abs(Number(quantity)) : Math.abs(Number(quantity));

    const newMovement: NewInventoryMovement = {
      product_id: product.id,
      movement_type: movementType,
      quantity_changed: quantityChanged,
      notes: notes || `${movementType} adjustment`,
      // movement_date will default to now() in DB
    };

    try {
      const { error } = await supabase
        .from('inventory_movements')
        .insert({ ...newMovement, user_id: userId });

      if (error) throw error;

      setMessage(`Stock adjusted successfully for ${product.name}.`);
      // The DB trigger should update product.current_stock_level.
      // Parent component (ProductPage) will need to refresh ProductList.
      onAdjustmentSubmit();

    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null; // Don't render if no product is selected

  const commonInputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";

  return (
    // This form could be in a Modal or a dedicated section
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-xl w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Adjust Stock for: <span className="text-indigo-600">{product.name}</span></h3>
        <p className="text-sm text-gray-600">Current Stock: {product.current_stock_level} {product.unit_of_measure}</p>

        <div>
          <label htmlFor="movementType" className="block text-sm font-medium text-gray-700">Adjustment Type</label>
          <select
            id="movementType" value={movementType}
            onChange={(e) => setMovementType(e.target.value as MovementType)}
            className={commonInputClass}
          >
            {ADJUSTMENT_MOVEMENT_TYPES.map(type => (
              <option key={type} value={type}>
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity to Adjust</label>
          <input
            id="quantity" type="number" value={quantity}
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
            min="0.01" step="any" // Allow fractional for units like kg, but DB is integer for quantity_changed
            placeholder="Enter positive quantity"
            required className={commonInputClass}
          />
           <p className="text-xs text-gray-500 mt-1">
            Enter a positive value. '{movementType === 'adjustment_out' ? 'Decrease' : 'Increase'}' will be applied.
          </p>
        </div>

        <div>
          <label htmlFor="adjNotes" className="block text-sm font-medium text-gray-700">Notes/Reason (Optional)</label>
          <textarea
            id="adjNotes" value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3} placeholder="e.g., Stock take correction, Damaged goods"
            className={commonInputClass}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
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
            {loading ? 'Adjusting...' : 'Adjust Stock'}
          </button>
        </div>

        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
        {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
      </form>
    </div>
  );
}
