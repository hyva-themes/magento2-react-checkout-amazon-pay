import { useContext } from 'react';
import { get as _get } from 'lodash-es';

import CartContext from '../../../../context/Cart/CartContext';

export default function useAmazonPayCartContext() {
  const [cartData, cartActions] = useContext(CartContext);
  const cart = _get(cartData, 'cart');
  const cartId = _get(cartData, 'cart.id');
  const cartBillingAddress = _get(cart, `billing_address`, {});
  const cartShippingAddress = _get(cart, `shipping_address`, {});
  const selectedPaymentMethod = _get(cart, 'selected_payment_method', {});
  const selectedShippingMethod = _get(cart, 'selected_shipping_method', {});
  const { firstname, lastname, zipcode } = cartBillingAddress;
  const hasCartBillingAddress = firstname && lastname && zipcode;
  const { setPaymentMethod, addCartShippingAddress, setCartBillingAddress } =
    cartActions;

  return {
    cartId,
    setPaymentMethod,
    cartBillingAddress,
    cartShippingAddress,
    selectedPaymentMethod,
    hasCartBillingAddress,
    setCartBillingAddress,
    selectedShippingMethod,
    addCartShippingAddress,
  };
}
