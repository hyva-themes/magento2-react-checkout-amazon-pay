import { useCallback } from 'react';
import { set as _set } from 'lodash-es';

import {
  LOGIN_FORM,
  BILLING_ADDR_FORM,
  SHIPPING_ADDR_FORM,
} from '../../../../config';
import {
  parseAddress,
  INVALID_BILLING_ADDR_ERR,
  INVALID_SHIPPING_ADDR_ERR,
} from '../utils';
import { __ } from '../../../../i18n';
import LocalStorage from '../../../../utils/localStorage';
import useAmazonPayAppContext from './useAmazonPayAppContext';
import useAmazonPayCartContext from './useAmazonPayCartContext';
import { _cleanObjByKeys, _makePromise } from '../../../../utils';
import useAmazonPayFormikContext from './useAmazonPayFormikContext';

const EMAIL_FIELD = `${LOGIN_FORM}.email`;

export default function useSaveAddresses() {
  const { cartId, addCartShippingAddress, setCartBillingAddress } =
    useAmazonPayCartContext();
  const { setErrorMessage } = useAmazonPayAppContext();
  const { setFieldValue } = useAmazonPayFormikContext();

  return useCallback(
    async (billingAddress, shippingAddress) => {
      const isSameAsShipping = billingAddress === shippingAddress;

      /** Parse and validate the shipping address */
      const shippingAddressParsed = parseAddress(shippingAddress, cartId);
      let shippingAddressIsValid = true;

      /** Update the amazon addresses as the customer addresses and run the mutation to save them in the backend */
      const updateShippingAddress = _makePromise(
        addCartShippingAddress,
        shippingAddressParsed,
        isSameAsShipping
      );

      try {
        await updateShippingAddress();
      } catch (error) {
        const shippingAddressToSet = _cleanObjByKeys(shippingAddressParsed, [
          'fullName',
          'cartId',
        ]);
        _set(shippingAddressToSet, 'isSameAsShipping', isSameAsShipping);
        LocalStorage.saveCustomerAddressInfo('', isSameAsShipping);
        setFieldValue(SHIPPING_ADDR_FORM, shippingAddressToSet);
        setErrorMessage(__(INVALID_SHIPPING_ADDR_ERR));
        shippingAddressIsValid = false;
      }
      const shippingAddressToSet = _cleanObjByKeys(shippingAddressParsed, [
        'fullName',
        'cartId',
      ]);

      _set(shippingAddressToSet, 'isSameAsShipping', isSameAsShipping);
      LocalStorage.saveCustomerAddressInfo('', isSameAsShipping);
      setFieldValue(SHIPPING_ADDR_FORM, shippingAddressToSet);

      /** Parse and validate the billing address */
      const billingAddressParsed = parseAddress(billingAddress, cartId);
      let billingAddressIsValid = true;

      /** Update the billing address and check if there is an error message */
      if (billingAddressIsValid && !isSameAsShipping) {
        const updateBillingAddress = _makePromise(
          setCartBillingAddress,
          parseAddress({ ...billingAddress, isSameAsShipping }, cartId),
          isSameAsShipping
        );
        try {
          await updateBillingAddress();
        } catch (error) {
          setErrorMessage(__(INVALID_BILLING_ADDR_ERR));
          billingAddressIsValid = false;
        }
      }

      const billingAddressToSet = _cleanObjByKeys(billingAddressParsed, [
        'fullName',
        'cartId',
      ]);

      _set(billingAddressToSet, 'isSameAsShipping', isSameAsShipping);
      LocalStorage.saveCustomerAddressInfo('', isSameAsShipping, false);
      LocalStorage.saveBillingSameAsShipping(isSameAsShipping);
      setFieldValue(BILLING_ADDR_FORM, billingAddressToSet);

      /** Set the email on cart */
      if (shippingAddressIsValid || billingAddressIsValid) {
        const cartEmail = shippingAddress?.email ?? billingAddress?.email;
        setFieldValue(EMAIL_FIELD, cartEmail);
      }
      return shippingAddressIsValid;
    },
    [
      cartId,
      setFieldValue,
      setErrorMessage,
      setCartBillingAddress,
      addCartShippingAddress,
    ]
  );
}
