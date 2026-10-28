// Contact details — confirmed by the owner.
export const SITE = {
  name: "Arena Elsinho",
  whatsapp: "556992707000", // arena number, DDD 69 (Porto Velho)
  phoneDisplay: "(69) 9270-7000",
  address: "R. Machado de Assis – Cuniã, Porto Velho – RO, 76824-476",
  addressQuery: "R.+Machado+de+Assis,+Cuni%C3%A3,+Porto+Velho+-+RO,+76824-476",
  instagram: "https://www.instagram.com/reel/DP1Ws61EbB2/",
  reel: "https://www.instagram.com/reel/DP1Ws61EbB2/",
};
export const waLink = (text: string) =>
  SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
