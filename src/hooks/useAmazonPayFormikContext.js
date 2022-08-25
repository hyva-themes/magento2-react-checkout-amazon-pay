import { useContext } from 'react';

import { PaymentMethodFormContext } from '../../../../app/code/paymentMethod/context';

export default function useAmazonPayFormikContext() {
  return useContext(PaymentMethodFormContext);
}
