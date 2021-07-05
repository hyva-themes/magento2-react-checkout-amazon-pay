export const parseAddress = (amazonAddress, cartId) => ({
  cartId,
  city: amazonAddress.city,
  company: amazonAddress.company,
  country: amazonAddress.country_id,
  firstname: amazonAddress.firstname,
  lastname: amazonAddress.lastname,
  phone: amazonAddress.telephone,
  region: amazonAddress.region,
  street: amazonAddress.street,
  zipcode: amazonAddress.postcode,
});
