import sendRequest from '../sendRequest';
import RootElement from '../../../../../utils/rootElement';

export default async function restUpdateCheckoutSessionConfig(
  checkoutSessionId
) {
  const { restUrlPrefix } = RootElement.getPaymentConfig();
  const url = `/rest/de_storeview/V1/amazon-checkout-session/${checkoutSessionId}/update`;

  return sendRequest({}, url);
}
