/* =========================================================================
   Arena — field validators
   Single source of truth for checkout/account input rules so the same
   logic runs in the browser and in tests (node --test boots this file).
   ========================================================================= */
(function () {
  'use strict';

  /* Luhn checksum — catches fat-fingered numbers and most fabricated ones */
  function luhn(num) {
    const s = String(num || '').replace(/\D/g, '');
    if (s.length < 12) return false;
    let sum = 0;
    let alt = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let d = s.charCodeAt(i) - 48;
      if (alt) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  /* Card brand from the IIN ranges we display in the footer */
  function cardBrand(num) {
    const s = String(num || '').replace(/\D/g, '');
    if (/^4/.test(s)) return 'Visa';
    if (/^(3[47])/.test(s)) return 'Amex';
    if (/^(5[1-5]|2[2-7])/.test(s)) return 'Mastercard';
    if (/^6(011|5)/.test(s)) return 'Discover';
    return '';
  }

  function card(num) {
    const s = String(num || '').replace(/\D/g, '');
    /* 16 digits (Visa/MC/Discover) or 15 (Amex) */
    if (s.length !== 15 && s.length !== 16) return false;
    return luhn(s);
  }

  /* MM / YY — valid month, and not already expired */
  function exp(value, now) {
    const m = String(value || '').match(/^(0[1-9]|1[0-2])\s*\/?\s*(\d{2})$/);
    if (!m) return false;
    const ref = now || new Date();
    const year = 2000 + Number(m[2]);
    const month = Number(m[1]);
    if (year < ref.getFullYear()) return false;
    if (year === ref.getFullYear() && month < ref.getMonth() + 1) return false;
    return true;
  }

  const Validators = {
    luhn,
    cardBrand,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()),
    name: (v) => String(v || '').trim().length >= 2,
    zip: (v) => {
      const s = String(v || '').trim();
      return s.length >= 3 && s.length <= 10;
    },
    /* optional field: empty passes, otherwise a plausible phone */
    phone: (v) => {
      const s = String(v || '').trim();
      if (!s) return true;
      return /^[+()\d][\d\s().-]{5,19}$/.test(s);
    },
    card,
    exp,
    cvc: (v) => /^\d{3,4}$/.test(String(v || '').trim()),
  };

  window.Validators = Validators;
})();
