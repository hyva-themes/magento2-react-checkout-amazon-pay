import { useContext } from 'react';
import _get from 'lodash.get';
import CartContext from '../../../../context/Cart/CartContext';

export default function useAmazonPayCartContext() {
  const [cartData, cartActions] = useContext(CartContext);
  const { setPaymentMethod } = cartActions;

  const cartId = _get(cartData, 'cart.id');
  const cart = _get(cartData, 'cart');
  const cartBillingAddress = _get(cart, `billing_address`, {});
  const selectedShippingMethod = _get(cart, 'selected_shipping_method', {});
  const selectedPaymentMethod = _get(cart, 'selected_payment_method', {});
  const { firstname, lastname, zipcode } = cartBillingAddress;
  const hasCartBillingAddress = firstname && lastname && zipcode;
  return {
    cartId,
    cartBillingAddress,
    selectedPaymentMethod,
    selectedShippingMethod,
    hasCartBillingAddress,
    setPaymentMethod,
  };
}
