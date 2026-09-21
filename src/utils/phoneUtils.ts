export interface CountryCodeItem {
  code: string;
  nameZh: string;
  nameEn: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  { code: '+60', nameZh: '马来西亚', nameEn: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', nameZh: '新加坡', nameEn: 'Singapore', flag: '🇸🇬' },
  { code: '+86', nameZh: '中国大陆', nameEn: 'China', flag: '🇨🇳' },
  { code: '+886', nameZh: '中国台湾', nameEn: 'Taiwan', flag: '🇹🇼' },
  { code: '+852', nameZh: '中国香港', nameEn: 'Hong Kong', flag: '🇭🇰' },
  { code: '+853', nameZh: '中国澳门', nameEn: 'Macau', flag: '🇲🇴' },
  { code: '+62', nameZh: '印度尼西亚', nameEn: 'Indonesia', flag: '🇮🇩' },
  { code: '+66', nameZh: '泰国', nameEn: 'Thailand', flag: '🇹🇭' },
  { code: '+84', nameZh: '越南', nameEn: 'Vietnam', flag: '🇻🇳' },
  { code: '+63', nameZh: '菲律宾', nameEn: 'Philippines', flag: '🇵🇭' },
  { code: '+61', nameZh: '澳大利亚', nameEn: 'Australia', flag: '🇦🇺' },
  { code: '+64', nameZh: '新西兰', nameEn: 'New Zealand', flag: '🇳🇿' },
  { code: '+1', nameZh: '美国/加拿大', nameEn: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', nameZh: '英国', nameEn: 'United Kingdom', flag: '🇬🇧' },
  { code: '+81', nameZh: '日本', nameEn: 'Japan', flag: '🇯🇵' },
  { code: '+82', nameZh: '韩国', nameEn: 'South Korea', flag: '🇰🇷' },
  { code: '+91', nameZh: '印度', nameEn: 'India', flag: '🇮🇳' },
  { code: '+971', nameZh: '阿联酋', nameEn: 'UAE', flag: '🇦🇪' },
  { code: '+49', nameZh: '德国', nameEn: 'Germany', flag: '🇩🇪' },
  { code: '+33', nameZh: '法国', nameEn: 'France', flag: '🇫🇷' },
];

/**
 * Parse phone number into countryCode and local national number
 */
export function parsePhoneNumber(rawPhone?: string, defaultCode = '+60'): { countryCode: string; nationalNumber: string } {
  if (!rawPhone) return { countryCode: defaultCode, nationalNumber: '' };
  const trimmed = rawPhone.trim();

  // If starts with +, match against known country codes
  if (trimmed.startsWith('+')) {
    for (const item of COUNTRY_CODES) {
      if (trimmed.startsWith(item.code)) {
        const rest = trimmed.substring(item.code.length).trim();
        return { countryCode: item.code, nationalNumber: rest };
      }
    }
    const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) {
      return { countryCode: match[1], nationalNumber: match[2] };
    }
  }

  // If no +, check if starts with country digits (e.g. 60123456789)
  for (const item of COUNTRY_CODES) {
    const codeDigits = item.code.replace('+', '');
    if (trimmed.startsWith(codeDigits) && trimmed.length > codeDigits.length + 6) {
      return { countryCode: item.code, nationalNumber: trimmed.substring(codeDigits.length).trim() };
    }
  }

  return { countryCode: defaultCode, nationalNumber: trimmed };
}

/**
 * Format phone for WhatsApp wa.me link (strictly numerical without '+' or spaces, e.g. 60123456789)
 */
export function getWhatsAppNumber(phone?: string, defaultCode = '+60'): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned.substring(1).replace(/[^0-9]/g, '');
  }

  const defDigits = defaultCode.replace('+', '');
  if (cleaned.startsWith('0')) {
    // e.g. 0123456789 with +60 -> 60123456789
    return (defDigits + cleaned.substring(1)).replace(/[^0-9]/g, '');
  }

  if (cleaned.startsWith(defDigits)) {
    return cleaned.replace(/[^0-9]/g, '');
  }

  return (defDigits + cleaned).replace(/[^0-9]/g, '');
}

/**
 * Build WhatsApp click-to-chat URL
 */
export function buildWhatsAppUrl(phone?: string, text?: string, defaultCode = '+60'): string {
  const number = getWhatsAppNumber(phone, defaultCode);
  const baseUrl = number ? `https://wa.me/${number}` : `https://wa.me/`;
  if (text) {
    return `${baseUrl}?text=${encodeURIComponent(text)}`;
  }
  return baseUrl;
}

/**
 * Combine Country Code and National Number into standard storage format
 */
export function combinePhoneNumber(countryCode: string, nationalNumber: string): string {
  const cleanNum = nationalNumber.trim();
  if (!cleanNum) return '';
  // If user entered + in nationalNumber already, return as is
  if (cleanNum.startsWith('+')) return cleanNum;
  // If nationalNumber starts with 0 and code is provided, keep it or normalize
  return `${countryCode} ${cleanNum}`;
}
