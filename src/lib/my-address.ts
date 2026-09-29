export const MY_STATES = [
  { id: "PLS", name: "Perlis" },
  { id: "KDH", name: "Kedah" },
  { id: "PNG", name: "Pulau Pinang" },
  { id: "KTN", name: "Kelantan" },
  { id: "TRG", name: "Terengganu" },
  { id: "PHG", name: "Pahang" },
  { id: "PRK", name: "Perak" },
  { id: "SGR", name: "Selangor" },
  { id: "KUL", name: "Kuala Lumpur" },
  { id: "PJY", name: "Putrajaya" },
  { id: "NSN", name: "Negeri Sembilan" },
  { id: "MLK", name: "Melaka" },
  { id: "JHR", name: "Johor" },
  { id: "LBN", name: "Labuan" },
  { id: "SBH", name: "Sabah" },
  { id: "SWK", name: "Sarawak" },
] as const;

export type MyStateId = (typeof MY_STATES)[number]["id"];

export type AddressErrorCode =
  | "unit"
  | "street"
  | "postcode"
  | "state"
  | "postcode_state";

const POSTCODE_RANGES: Record<MyStateId, Array<[number, number]>> = {
  PLS: [[1000, 2800]],
  KDH: [[5000, 9810]],
  PNG: [[10000, 14400]],
  KTN: [[15000, 18500]],
  TRG: [[20000, 24300]],
  PHG: [
    [25000, 28800],
    [39000, 39200],
    [49000, 49000],
    [69000, 69000],
  ],
  PRK: [[30000, 36810]],
  SGR: [
    [40000, 48300],
    [63000, 68100],
  ],
  KUL: [[50000, 60000]],
  PJY: [[62000, 62988]],
  NSN: [[70000, 73509]],
  MLK: [[75000, 78309]],
  JHR: [[79000, 86900]],
  LBN: [[87000, 87033]],
  SBH: [[88000, 91309]],
  SWK: [[93000, 98859]],
};

export function malaysianAddressError(code: AddressErrorCode): string {
  switch (code) {
    case "unit":
      return "Enter your house or apartment number.";
    case "street":
      return "Enter your street.";
    case "postcode":
      return "Enter a 5-digit Malaysian postcode.";
    case "state":
      return "Select your state.";
    case "postcode_state":
      return "That postcode does not match the selected state.";
  }
}

function cleanLine(value: string, max: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

export function validateMalaysianAddress(input: {
  unit: string;
  street: string;
  postcode: string;
  stateId: string;
}):
  | { ok: true; formatted: string }
  | { ok: false; code: AddressErrorCode } {
  const unit = cleanLine(input.unit, 40);
  const street = cleanLine(input.street, 120);
  const postcode = input.postcode.replace(/\D/g, "");
  const state = MY_STATES.find((item) => item.id === input.stateId);

  if (!unit) return { ok: false, code: "unit" };
  if (!street) return { ok: false, code: "street" };
  if (!/^\d{5}$/.test(postcode)) return { ok: false, code: "postcode" };
  if (!state) return { ok: false, code: "state" };

  const code = Number(postcode);
  const ranges = POSTCODE_RANGES[state.id];
  const matches = ranges.some(([min, max]) => code >= min && code <= max);
  if (!matches) return { ok: false, code: "postcode_state" };

  return {
    ok: true,
    formatted: `${unit}, ${street}, ${postcode} ${state.name}`,
  };
}
