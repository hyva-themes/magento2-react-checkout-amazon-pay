import RootElement from '../../../../../utils/rootElement';
import sendRequest, { RESPONSE_JSON } from '../sendRequest';

export default async function restGetShippingAddress(checkoutSessionId) {
  const { restUrlPrefix } = RootElement.getPaymentConfig();
  const url = `/rest/de_storeview/V1/amazon-checkout-session/${checkoutSessionId}/shipping-address`;

  return sendRequest({}, url, RESPONSE_JSON, {}, true);
}
