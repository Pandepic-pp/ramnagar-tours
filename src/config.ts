// Single source of truth for brand and contact details.
// TODO(client): the brand name is a placeholder (shared with ../frontend). Phone and email are empty on purpose:
// they are hidden everywhere until real ones are set, so the site never shows an invented number.

export const brand = {
  name: 'Ramnagar Tours & Cabs',
  short: 'Ramnagar Tours',
  tagline: 'Cab rides from Ramnagar to all of Uttarakhand',
  phone: '', // e.g. '+919876543210'
  whatsapp: '', // digits only with country code, e.g. '919876543210'
  email: '',
  base: 'Ramnagar, Uttarakhand',
} as const;

export const telHref = (phone: string): string => `tel:${phone.replace(/\s/g, '')}`;
