"use client";

import { useState } from "react";
import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "CD", name: "RD Congo", flag: "🇨🇩" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "HT", name: "Haïti", flag: "🇭🇹" },
];

export function PhoneInput({
  value,
  onChange,
  defaultCountry = "FR",
}: {
  value: string;
  onChange: (e164: string) => void;
  defaultCountry?: CountryCode;
}) {
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [local, setLocal] = useState("");

  function update(c: CountryCode, num: string) {
    const parsed = parsePhoneNumberFromString(num, c);
    if (parsed?.isValid()) onChange(parsed.format("E.164"));
    else onChange("");
  }

  return (
    <div className="flex gap-2">
      <select
        className="input w-32"
        value={country}
        onChange={(e) => {
          const c = e.target.value as CountryCode;
          setCountry(c);
          update(c, local);
        }}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} +{getCountryCallingCode(c.code)}
          </option>
        ))}
      </select>
      <input
        className="input flex-1"
        type="tel"
        inputMode="tel"
        placeholder="6 12 34 56 78"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          update(country, e.target.value);
        }}
      />
      {value && <span className="self-center text-xs text-green-600">✓</span>}
      {!value && local && <span className="self-center text-xs text-red-500">!</span>}
    </div>
  );
}

export function isValidPhone(input: string, country: CountryCode = "FR"): boolean {
  const parsed = parsePhoneNumberFromString(input, country);
  return parsed?.isValid() ?? false;
}
