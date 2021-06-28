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

/*
 Utility to get the token and the payer id from the URL
 */
const getCheckoutSessionId = query => {
  const params = new URLSearchParams(query);
  return params.get('amazonCheckoutSessionId');
};

export default function useAmazonPay(paymentMethodCode) {
  const [processPaymentEnable, setProcessPaymentEnable] = useState(false);
  const performPlaceOrder = usePerformPlaceOrder(paymentMethodCode);
  const {
    selectedShippingMethod,
    selectedPaymentMethod,
    hasCartBillingAddress,
  } = useAmazonPayCartContext();
  const { setErrorMessage, setPageLoader } = useAmazonPayAppContext();
  const { allAgreementsChecked, hasAgreements } = useCheckoutAgreements();
  const { values } = useFormikContext();

  const query = window.location.search;
  const selectedPaymentMethodCode = _get(selectedPaymentMethod, 'code');

  useEffect(() => {
    if (!window.amazon) {
      const scriptTag = document.createElement('script');

      scriptTag.src = 'https://static-eu.payments-amazon.com/checkout.js';
      scriptTag.async = true;

      document.body.appendChild(scriptTag);
    }
  }, []);

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

  const setAddresses = useCallback(async () => {
    const checkoutSessionId = getCheckoutSessionId(query);
    const shippingAddress = await restGetShippingAddress(checkoutSessionId);

    const newShippingAddress = {
      city: shippingAddress.city,
      company: shippingAddress.company,
      country: shippingAddress.country_id,
      firstname: shippingAddress.firstname,
      lastname: shippingAddress.lastname,
      fullName: `${shippingAddress.firstname} ${shippingAddress.lastname}`,
      phone: shippingAddress.telephone,
      region: shippingAddress.region,
      street: shippingAddress.street,
      zipcode: shippingAddress.postcode,
    };
    // eslint-disable-next-line
  }, [query, values])

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
  }, [paymentMethodCode]);

  return {
    placeAmazonPayOrder,
    getCheckoutSessionConfig,
    processPaymentEnable,
    setAddresses,
  };
}
