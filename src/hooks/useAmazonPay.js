import { useCallback, useEffect, useState } from 'react';
import _get from 'lodash.get';
import useAmazonPayFormikContext from './useAmazonPayFormikContext';
import usePerformPlaceOrder from './usePerformPlaceOrder';
import useSaveAddresses from './useSaveAddresses';
import restGetCheckoutSessionConfig from '../api/restGetCheckoutSessionConfig';
import useAmazonPayCartContext from './useAmazonPayCartContext';
import { __ } from '../../../../i18n';
import useAmazonPayAppContext from './useAmazonPayAppContext';
import restGetShippingAddress from '../api/restGetShippingAddress';
import restGetBillingAddress from '../api/restGetBillingAddress';
import { AMAZON_NOT_AVL, getCheckoutSessionId } from '../utils';
import { PAYMENT_METHOD_FORM } from '../../../../config';

export default function useAmazonPay(paymentMethodCode) {
  const [processPaymentEnable, setProcessPaymentEnable] = useState(false);
  const { selectedPaymentMethod } = useAmazonPayCartContext();
  const { appDispatch, setErrorMessage, setPageLoader } =
    useAmazonPayAppContext();
  const performPlaceOrder = usePerformPlaceOrder();
  const saveAddresses = useSaveAddresses();
  const { setFieldValue } = useAmazonPayFormikContext();
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
  }, [paymentMethodCode, setPageLoader, searchQuery]);

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
    placeAmazonPayOrder,
    getCheckoutSessionConfig,
    processPaymentEnable,
    setAddresses,
  };
}
