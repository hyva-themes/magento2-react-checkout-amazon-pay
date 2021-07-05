import { useCallback, useEffect, useState } from 'react';
import _get from 'lodash.get';
import { useFormikContext } from 'formik';
import usePerformPlaceOrder from './usePerformPlaceOrder';
import restGetCheckoutSessionConfig from '../api/restGetCheckoutSessionConfig';
import useAmazonPayCartContext from './useAmazonPayCartContext';
import useCheckoutAgreements from '../../../../components/checkoutAgreements/hooks/useCheckoutAgreements';
import { __ } from '../../../../i18n';
import useAmazonPayAppContext from './useAmazonPayAppContext';
import restGetShippingAddress from '../api/restGetShippingAddress';
import restGetBillingAddress from '../api/restGetBillingAddress';
import { parseAddress } from '../utils';
import { _cleanObjByKeys, _makePromise } from '../../../../utils';
import { BILLING_ADDR_FORM, SHIPPING_ADDR_FORM } from '../../../../config';

/*
 Utility to get the token and the payer id from the URL
 */
const getCheckoutSessionId = query => {
  const params = new URLSearchParams(query);
  return params.get('amazonCheckoutSessionId');
};

export default function useAmazonPay(paymentMethodCode) {
  const [processPaymentEnable, setProcessPaymentEnable] = useState(false);
  const [amazonAddressesSet, setAmazonAddressesSet] = useState(false);
  const performPlaceOrder = usePerformPlaceOrder();
  const {
    selectedShippingMethod,
    selectedPaymentMethod,
    hasCartBillingAddress,
    cartId,
    addCartShippingAddress,
    setCartBillingAddress,
    setPaymentMethod,
  } = useAmazonPayCartContext();
  const { setErrorMessage, setPageLoader } = useAmazonPayAppContext();
  const { allAgreementsChecked, hasAgreements } = useCheckoutAgreements();
  const { setFieldValue, isValid, errors } = useFormikContext();

  const query = window.location.search;
  const selectedPaymentMethodCode = _get(selectedPaymentMethod, 'code');

  /*
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

  /*
  Get amazon session config from the BE when the payment is selected
  */
  const getCheckoutSessionConfig = useCallback(async () => {
    if (paymentMethodCode === 'amazon_payment_v2') {
      setPageLoader(true);
      const config = await restGetCheckoutSessionConfig();
      setPageLoader(false);

      if (!config) {
        throw new Error(__('Amazon pay not available'));
      }

      if (!window.amazon) {
        throw new Error(__('Amazon pay not available'));
      }

      window.amazon.Pay.renderButton('#AmazonPayButton', {
        // set checkout environment
        merchantId: config.merchantId,
        publicKeyId: config.publicKeyId,
        ledgerCurrency: config.ledgerCurrency,
        // customize the buyer experience
        checkoutLanguage: config.checkoutLanguage,
        productType: 'PayAndShip',
        placement: 'Checkout',
        buttonColor: config.buttonColor,
        // configure Create Checkout Session request
        createCheckoutSessionConfig: {
          payloadJSON: config.checkoutReviewPayload,
          signature: config.checkoutReviewSignature,
        },
        sandbox: config.sandbox,
      });
    }

    return false;
  }, [paymentMethodCode, setPageLoader]);

  /*
   Check if is possible to proceed on placing the order.
   */
  useEffect(() => {
    if (query && ['', paymentMethodCode].includes(selectedPaymentMethodCode)) {
      setProcessPaymentEnable(true);
    }
  }, [
    paymentMethodCode,
    query,
    setProcessPaymentEnable,
    selectedPaymentMethodCode,
  ]);

  /*
   Get addresses from amazon pay and set in the checkout
   */
  const setAddresses = useCallback(async () => {
    if (amazonAddressesSet) {
      return false;
    }

    const checkoutSessionId = getCheckoutSessionId(query);
    setPageLoader(true);

    try {
      const [shippingAddress] = await restGetShippingAddress(checkoutSessionId);
      const [billingAddress] = await restGetBillingAddress(checkoutSessionId);

      if (!shippingAddress || !billingAddress) {
        setErrorMessage(__('Amazon pay not available'));

        return false;
      }

      const isSameAsShipping = billingAddress === shippingAddress;

      const updateShippingAddress = _makePromise(
        addCartShippingAddress,
        parseAddress(shippingAddress, cartId),
        isSameAsShipping
      );

      const updateBillingAddress = _makePromise(
        setCartBillingAddress,
        parseAddress({ ...billingAddress, isSameAsShipping }, cartId),
        isSameAsShipping
      );

      const shippingAddressResponse = await updateShippingAddress();
      const billingAddressResponse = await updateBillingAddress();

      const shippingAddressToSet = _cleanObjByKeys(
        _get(shippingAddressResponse, 'shipping_addresses'),
        ['fullName']
      );

      setFieldValue(SHIPPING_ADDR_FORM, shippingAddressToSet);

      const billingAddressToSet = _cleanObjByKeys(
        _get(billingAddressResponse, 'billing_address'),
        ['fullName']
      );

      setFieldValue(BILLING_ADDR_FORM, billingAddressToSet);

      await setPaymentMethod({ code: paymentMethodCode });

      setAmazonAddressesSet(true);
      setPageLoader(false);

      return true;
    } catch (error) {
      console.log({ error });
      setErrorMessage(__('Amazon pay not available'));
      setPageLoader(false);
      return false;
    }
  }, [
    amazonAddressesSet,
    query,
    addCartShippingAddress,
    cartId,
    setErrorMessage,
    setPageLoader,
    setCartBillingAddress,
    setFieldValue,
    setPaymentMethod,
    paymentMethodCode,
  ]);

  /* Checking if amazon addresses are right */
  useEffect(() => {
    if (!isValid && amazonAddressesSet) {
      setErrorMessage(__('Please check the addresses'));
      console.log(errors);
    }
  }, [isValid, errors, amazonAddressesSet, setErrorMessage]);

  /*
   Final step: placing the order
   */
  const placeAmazonPayOrder = useCallback(async () => {
    const checkoutSessionId = getCheckoutSessionId(query);

    if (
      !checkoutSessionId ||
      !selectedShippingMethod ||
      !hasCartBillingAddress
    ) {
      return;
    }

    if (hasAgreements) {
      if (!allAgreementsChecked) {
        setErrorMessage(
          __(
            'Please agree to the terms and conditions first before placing the order again.'
          )
        );
        return;
      }
    }

    await performPlaceOrder(checkoutSessionId);

    // eslint-disable-next-line
  }, [query]);

  return {
    placeAmazonPayOrder,
    getCheckoutSessionConfig,
    processPaymentEnable,
    setAddresses,
  };
}
