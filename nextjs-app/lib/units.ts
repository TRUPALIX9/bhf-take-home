/**
 * Units for the weight and volume columns on a PO page (?units=imperial). Pure functions.
 *
 * What the PO prints: a KILOGRAMS column (the unit is in the header) and a CUBE column (no unit).
 * What we infer, and say so in the tooltips: both are per carton (7.72 kg for a carton of two
 * comforters is plausible; 7.72 kg for all 68 cartons is not), and CUBE is cubic metres
 * (0.0991 m³ is a carton about 46 cm on each side).
 */

export type Units = "metric" | "imperial";

const LB_PER_KG = 2.20462;
const FT3_PER_M3 = 35.3147;

/** Reads ?units; anything but "imperial" means metric, the units printed on the PO. */
export const parseUnits = (value?: string): Units => (value === "imperial" ? "imperial" : "metric");

/** Unit labels for the headers and totals. */
export const unitLabels = (units: Units) =>
  units === "imperial" ? { weight: "lb", volume: "ft³" } : { weight: "kg", volume: "m³" };

/** A weight given in kilograms, in the chosen units, 2 decimals. */
export const formatWeight = (kg: number, units: Units) => (units === "imperial" ? kg * LB_PER_KG : kg).toFixed(2);

/** A volume given in cubic metres, in the chosen units (4 decimals for m³, as printed; 2 for ft³). */
export const formatVolume = (m3: number, units: Units) =>
  units === "imperial" ? (m3 * FT3_PER_M3).toFixed(2) : m3.toFixed(4);
