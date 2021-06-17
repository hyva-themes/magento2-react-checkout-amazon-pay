import { func, shape, string } from 'prop-types';
import React, { useEffect } from 'react';
import _get from 'lodash.get';
import RadioInput from '../../../../components/common/Form/RadioInput';
import useAmazonPay from '../hooks/useAmazonPay';

function AmazonPay({ method, selected, actions }) {
  const methodCode = _get(method, 'code');
  const {
    getCheckoutSessionConfig,
    placeAmazonPayOrder,
    processPaymentEnable,
  } = useAmazonPay(methodCode);
  const isSelected = methodCode === selected.code;

  useEffect(() => {
    if (isSelected) getCheckoutSessionConfig();
  }, [isSelected, getCheckoutSessionConfig]);

  useEffect(() => {
    if (processPaymentEnable) {
      placeAmazonPayOrder();
    }
  }, [placeAmazonPayOrder, processPaymentEnable]);

  if (isSelected) {
    return (
      <>
        <RadioInput
          label={method.title}
          name="paymentMethod"
          value={method.code}
          onChange={actions.change}
          checked={isSelected}
        />
        <div id="AmazonPayButton"></div>
      </>
    );
  }

  return (
    <div className="w-full">
      <div>
        <RadioInput
          label={_get(method, 'title')}
          name="paymentMethod"
          value={_get(method, 'code')}
          onChange={actions.change}
          checked={isSelected}
        />
      </div>
    </div>
  );
}

const methodShape = shape({
  title: string.isRequired,
  code: string.isRequired,
});

AmazonPay.propTypes = {
  method: methodShape.isRequired,
  selected: methodShape.isRequired,
  actions: shape({ change: func }),
};

export default AmazonPay;
