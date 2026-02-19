export type Sex = "MALE" | "FEMALE";

/** Boer formula — returns lean body mass in kg */
export function calcLBM(
  sex: Sex,
  weightLbs: number,
  heightFt: number,
  heightIn: number,
): number {
  const weightKg = weightLbs * 0.453592;
  const heightCm = (heightFt * 12 + heightIn) * 2.54;
  return sex === "MALE"
    ? 0.407 * weightKg + 0.267 * heightCm - 19.2
    : 0.252 * weightKg + 0.473 * heightCm - 48.3;
}

// Reference LBM: 80 kg male 178 cm → ~61 kg; 65 kg female 165 cm → ~46 kg
const REF_LBM: Record<Sex, number> = { MALE: 61, FEMALE: 46 };

export function scaleDose(
  baseDose: number,
  doseMin: number | null,
  doseMax: number | null,
  userLBM: number,
  sex: Sex,
): number {
  const scaled = baseDose * (userLBM / REF_LBM[sex]);
  const lo = doseMin ?? 0;
  const hi = doseMax ?? Infinity;
  return Math.round(Math.max(lo, Math.min(hi, scaled)));
}

export interface UserBiometrics {
  sex: Sex;
  lbm: number;
}

export function buildBiometrics(
  sex: Sex,
  weightLbs: number,
  heightFt: number,
  heightIn: number,
): UserBiometrics {
  return { sex, lbm: calcLBM(sex, weightLbs, heightFt, heightIn) };
}
