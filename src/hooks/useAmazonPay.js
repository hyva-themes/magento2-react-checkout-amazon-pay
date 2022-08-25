import { useCallback, useEffect, useState } from 'react';
import { get as _get } from 'lodash-es';

import { __ } from '../../../../i18n';
import useSaveAddresses from './useSaveAddresses';
import { PAYMENT_METHOD_FORM } from '../../../../config';
import usePerformPlaceOrder from './usePerformPlaceOrder';
import useAmazonPayAppContext from './useAmazonPayAppContext';
import useAmazonPayCartContext from './useAmazonPayCartContext';
import { AMAZON_NOT_AVL, getCheckoutSessionId } from '../utils';
import restGetBillingAddress from '../api/restGetBillingAddress';
import restGetShippingAddress from '../api/restGetShippingAddress';
import useAmazonPayFormikContext from './useAmazonPayFormikContext';
import restGetCheckoutSessionConfig from '../api/restGetCheckoutSessionConfig';

export default function useAmazonPay(paymentMethodCode) {
  const [processPaymentEnable, setProcessPaymentEnable] = useState(false);
  const saveAddresses = useSaveAddresses();
  const performPlaceOrder = usePerformPlaceOrder();
  const { setFieldValue } = useAmazonPayFormikContext();
  const { selectedPaymentMethod } = useAmazonPayCartContext();
  const { appDispatch, setErrorMessage, setPageLoader } =
    useAmazonPayAppContext();
  const searchQuery = window.location.search;
  const selectedPaymentMethodCode = _get(selectedPaymentMethod, 'code');

  /**
   Set amazon script.
   */
  useEffect(() => {
    if (!window.amazon) {
      const scriptTag = document.createElement('script');

      scriptTag.src = 'https://static-eu.payments-amazon.com/checkout.js';
      scriptTag.async = true;

      document.body.appendChild(scriptTag);
    }
  }, []);

  /**
   Get amazon session config from the BE when the payment is selected
   */
  const getCheckoutSessionConfig = useCallback(async () => {
    if (
      paymentMethodCode === 'amazon_payment_v2' &&
      !getCheckoutSessionId(searchQuery ?? '')
    ) {
      setPageLoader(true);
      const config = await restGetCheckoutSessionConfig(appDispatch);
      setPageLoader(false);

      if (!config) {
        throw new Error(__(AMAZON_NOT_AVL));
      }

      if (!window.amazon) {
        throw new Error(__(AMAZON_NOT_AVL));
      }

      window.amazon.Pay.renderButton('#AmazonPayButton', {
        merchantId: config.merchantId,
        publicKeyId: config.publicKeyId,
        ledgerCurrency: config.ledgerCurrency,
        checkoutLanguage: config.checkoutLanguage,
        productType: 'PayAndShip',
        placement: 'Checkout',
        buttonColor: config.buttonColor,
        createCheckoutSessionConfig: {
          payloadJSON: config.checkoutReviewPayload,
          signature: config.checkoutReviewSignature,
        },
        sandbox: config.sandbox,
      });
    }

    return false;
  }, [paymentMethodCode, setPageLoader, searchQuery, appDispatch]);

  /**
   Check if is possible to proceed on placing the order.
   */
  useEffect(() => {
    if (
      searchQuery &&
      getCheckoutSessionId(searchQuery) &&
      !processPaymentEnable
    ) {
      setProcessPaymentEnable(true);
    }
  }, [
    paymentMethodCode,
    searchQuery,
    setProcessPaymentEnable,
    selectedPaymentMethodCode,
    processPaymentEnable,
  ]);

  /**
   Get addresses from amazon pay and set in the checkout
   */
  const setAddresses = useCallback(async () => {
    const checkoutSessionId = getCheckoutSessionId(searchQuery);
    setPageLoader(true);

    try {
      /** Get Amazon addresses via rest */
      const [sessionShippingAddress, sessionBillingAddress] = await Promise.all(
        [
          restGetShippingAddress(appDispatch, checkoutSessionId),
          restGetBillingAddress(appDispatch, checkoutSessionId),
        ]
      );
      const [shippingAddress] = sessionShippingAddress;
      const [billingAddress] = sessionBillingAddress;

      if (!shippingAddress || !billingAddress) {
        setErrorMessage(__(AMAZON_NOT_AVL));
        setPageLoader(false);
        return;
      }
      const shippingAddressIsValid = await saveAddresses(
        billingAddress,
        shippingAddress
      );

      if (shippingAddressIsValid) {
        /** Select the payment method */
        setFieldValue(`${PAYMENT_METHOD_FORM}.code`, 'amazon_payment_v2');
      }

      setPageLoader(false);
    } catch (error) {
      console.error({ error });
      setPageLoader(false);
    }
    // eslint-disable-next-line
  }, [
    searchQuery,
    setErrorMessage,
    setPageLoader,
    setFieldValue,
  ]);

  /**
   Final step: placing the order
   */
  const placeAmazonPayOrder = useCallback(async () => {
    const checkoutSessionId = getCheckoutSessionId(searchQuery);

    if (!checkoutSessionId) {
      return;
    }

    await performPlaceOrder(checkoutSessionId);
  }, [searchQuery, performPlaceOrder]);

  return {
    setAddresses,
    placeAmazonPayOrder,
    processPaymentEnable,
    getCheckoutSessionConfig,
  };
}
