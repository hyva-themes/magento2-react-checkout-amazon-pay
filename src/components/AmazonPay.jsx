import React, { useCallback, useEffect } from 'react';
import { func, shape, string } from 'prop-types';

import { RadioInput } from '../../../../app/code/common/Form';
import useAmazonPay from '../hooks/useAmazonPay';
import useAmazonPayAppContext from '../hooks/useAmazonPayAppContext';
import useAmazonPayCartContext from '../hooks/useAmazonPayCartContext';
import useAmazonPayCheckoutFormContext from '../hooks/useAmazonPayCheckoutFormContext';

function AmazonPay({ method, selected, actions }) {
  const methodCode = method.code;
  const {
    setAddresses,
    placeAmazonPayOrder,
    processPaymentEnable,
    getCheckoutSessionConfig,
  } = useAmazonPay(methodCode);
  const { setPageLoader } = useAmazonPayAppContext();
  const { registerPaymentAction } = useAmazonPayCheckoutFormContext();
  const { setPaymentMethod, selectedPaymentMethod } = useAmazonPayCartContext();
  const isSelected = methodCode === selected.code;

  const initalizeAmazonPaymentOnSelection = useCallback(async () => {
    setPageLoader(true);
    await getCheckoutSessionConfig();
    if (selectedPaymentMethod.code !== methodCode) {
      await setPaymentMethod(methodCode);
    }
    setPageLoader(false);
  }, [
    methodCode,
    setPageLoader,
    setPaymentMethod,
    selectedPaymentMethod,
    getCheckoutSessionConfig,
  ]);

  useEffect(() => {
    if (isSelected) {
      initalizeAmazonPaymentOnSelection();
    }
  }, [isSelected, initalizeAmazonPaymentOnSelection]);

  useEffect(() => {
    if (processPaymentEnable) {
      setAddresses();
      registerPaymentAction(methodCode, placeAmazonPayOrder);
    }
  }, [
    methodCode,
    setAddresses,
    placeAmazonPayOrder,
    processPaymentEnable,
    registerPaymentAction,
  ]);

  if (isSelected) {
    return (
      <>
        <RadioInput
          value={method.code}
          label={method.title}
          name="paymentMethod"
          checked={isSelected}
          onChange={actions.change}
        />
        <div id="AmazonPayButton" />
      </>
    );
  }

  return (
    <div className="w-full">
      <div>
        <RadioInput
          value={methodCode}
          name="paymentMethod"
          checked={isSelected}
          label={method.title}
          onChange={actions.change}
        />
      </div>
    </div>
  );
}

const methodShape = shape({
  title: string,
  code: string.isRequired,
});

AmazonPay.propTypes = {
  method: methodShape.isRequired,
  selected: methodShape.isRequired,
  actions: shape({ change: func }),
};

AmazonPay.defaultProps = {
  actions: {},
};

export default AmazonPay;
