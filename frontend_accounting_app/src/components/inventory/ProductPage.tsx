import { useState } from 'react';
import { Product } from '@/types/inventory';
import ProductForm from './ProductForm';
import ProductList from './ProductList';
import StockAdjustmentForm from './StockAdjustmentForm'; // Import StockAdjustmentForm

interface ProductPageProps {
  userId: string | undefined;
}

export default function ProductPage({ userId }: ProductPageProps) {
  const [showProductForm, setShowProductForm] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [showStockAdjustmentForm, setShowStockAdjustmentForm] = useState(false);
  const [productToAdjustStock, setProductToAdjustStock] = useState<Product | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0); // To trigger list refresh

  const handleAddNewProduct = () => {
    setProductToEdit(null);
    setShowStockAdjustmentForm(false); // Ensure other modals are closed
    setShowProductForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setShowStockAdjustmentForm(false); // Ensure other modals are closed
    setShowProductForm(true);
  };

  const handleOpenStockAdjustment = (product: Product) => {
    setProductToAdjustStock(product);
    setShowProductForm(false); // Ensure other modals are closed
    setShowStockAdjustmentForm(true);
  };

  const handleProductFormSubmit = (product: Product) => {
    console.log('Product form submitted:', product);
    setShowProductForm(false);
    setProductToEdit(null);
    setListRefreshKey(prevKey => prevKey + 1);
  };

  const handleProductFormCancel = () => {
    setShowProductForm(false);
    setProductToEdit(null);
  };

  const handleStockAdjustmentSubmit = () => {
    setShowStockAdjustmentForm(false);
    setProductToAdjustStock(null);
    setListRefreshKey(prevKey => prevKey + 1); // Refresh product list to show updated stock
  };

  const handleStockAdjustmentCancel = () => {
    setShowStockAdjustmentForm(false);
    setProductToAdjustStock(null);
  };

  if (!userId) {
    return <p className="p-4 text-gray-600">Please sign in to manage your inventory.</p>;
  }

  return (
    <div className="mt-6">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
            <p className="text-sm text-gray-600">Manage your products and their stock levels.</p>
        </div>
        {!showProductForm && (
          <button
            onClick={handleAddNewProduct}
            className="mt-3 sm:mt-0 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add New Product
          </button>
        )}
      </header>

      {showProductForm ? (
        <ProductForm
          userId={userId}
          productToEdit={productToEdit}
          onFormSubmit={handleProductFormSubmit}
          onCancel={handleProductFormCancel}
        />
      ) : showStockAdjustmentForm && productToAdjustStock ? (
        <StockAdjustmentForm
          userId={userId}
          product={productToAdjustStock}
          onAdjustmentSubmit={handleStockAdjustmentSubmit}
          onCancel={handleStockAdjustmentCancel}
        />
      ) : (
        <ProductList
          userId={userId}
          onEditProduct={handleEditProduct}
          onAdjustStock={handleOpenStockAdjustment} // Pass the new handler
          refreshKey={listRefreshKey}
        />
      )}
    </div>
  );
}
