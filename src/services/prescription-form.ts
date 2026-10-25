import {EyePrescription} from '../contracts/domain';
import {validatePrescription} from './bao-service';
export function prescriptionFromForm(form:Record<string,string>):EyePrescription|undefined {
  if(form.required!=='yes')return undefined;
  const keys=['sphereRight','sphereLeft','cylinderRight','cylinderLeft','axisRight','axisLeft','pupillaryDistance'] as const;
  if(keys.some(k=>!form[k]?.trim()))throw new Error('Nhập đủ SPH, CYL, AXIS hai mắt và PD.');
  const result={...Object.fromEntries(keys.map(k=>[k,Number(form[k])])),measuredAt:form.measuredAt||'',notes:form.notes||''} as unknown as EyePrescription;
  validatePrescription(result);return result;
}
