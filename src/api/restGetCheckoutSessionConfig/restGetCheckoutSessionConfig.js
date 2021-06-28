import RootElement from '../../../../../utils/rootElement';
import modifier from './modifier';
import sendRequest, { RESPONSE_JSON } from '../sendRequest';

export default async function restGetCheckoutSessionConfig() {
  const { restUrlPrefix } = RootElement.getPaymentConfig();
  const url = `/rest/de_storeview/V1/amazon-checkout-session/config`;

  return modifier(await sendRequest({}, url, RESPONSE_JSON, {}, true));
}
