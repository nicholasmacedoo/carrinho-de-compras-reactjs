import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      var newCart;
      const productExists = cart.find(product => product.id === productId);
      
      const stock = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;
  
      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } 
     
      if(productExists) {

        newCart = cart.map(product => (product.id === productId ? { ...product, amount} : product ));
      
      } else {
        
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        };

        newCart = [...cart, newProduct];        
      }
      
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let updatedCart = cart;
      const checkProductExistsCart = updatedCart.findIndex(product => product.id === productId);

      if(checkProductExistsCart >= 0) {
        const products = updatedCart.filter(item => item.id !== productId);
        setCart(products);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
      } else {
        throw new Error();
      }
    
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) return;

      const stock = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      
      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } 
      const updatedCart = cart;
      const checkProductExists = updatedCart.find(product => product.id === productId);

      if(!checkProductExists) throw new Error();

      const newCart = updatedCart.map(product =>  {
        if(product.id === productId) product.amount = amount;
        return product;
      });

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
