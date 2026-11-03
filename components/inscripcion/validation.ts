import {validStudentCedula} from '@/lib/api/studentProfile';
import {applicantAge} from './applicantValidation';
export const normalizeApplicantName=(value:string)=>value.trim().replace(/\s+/g,' ');
export const normalizeApplicantPhone=(value:string)=>value.trim().replace(/^\+593/,'0');
export function emailError(value:string):string{const email=value.trim().toLowerCase();return email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?'':'Ingresa un correo electrónico válido de hasta 254 caracteres.';}
export function nameError(value:string):string{const name=normalizeApplicantName(value);return [...name].length>=5&&[...name].length<=100&&/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(name)&&name.split(' ').length>=2?'':'Ingresa nombres y apellidos: de 5 a 100 caracteres, solo letras, espacios, apóstrofe o guion.';}
export interface ApplicantValues {cedula:string;nombreCompleto:string;telefono:string;fechaNacimiento:string;representanteNombre:string;representanteCedula:string}
export function validateApplicantValues(v:ApplicantValues,accept:boolean):Record<string,string>{
 const errors:Record<string,string>={},age=applicantAge(v.fechaNacimiento);
 if(!validStudentCedula(v.cedula))errors.cedula='Ingresa una cédula ecuatoriana válida.';
 if(nameError(v.nombreCompleto))errors.nombreCompleto=nameError(v.nombreCompleto);
 if(v.telefono.trim()&&!/^(09\d{8}|0[2-7]\d{7})$/.test(normalizeApplicantPhone(v.telefono)))errors.telefono='Usa un celular de 10 dígitos (09) o convencional de 9 dígitos (02 a 07); se acepta +593.';
 if(!Number.isFinite(age))errors.fechaNacimiento='Ingresa una fecha de nacimiento real.';
 else if(age<0)errors.fechaNacimiento='La fecha de nacimiento no puede ser futura.';
 else if(age<15)errors.fechaNacimiento='Debes tener al menos 15 años. Revisa tu fecha de nacimiento.';
 else if(age>100)errors.fechaNacimiento='La edad máxima es de 100 años cumplidos.';
 if(age>=15&&age<18){
  if(nameError(v.representanteNombre))errors.representanteNombre=nameError(v.representanteNombre);
  if(!validStudentCedula(v.representanteCedula))errors.representanteCedula='Ingresa una cédula ecuatoriana válida.';
  else if(v.representanteCedula===v.cedula)errors.representanteCedula='La cédula del representante debe ser distinta de la del postulante.';
  if(!accept)errors.representanteAcepta='Se requiere autorización del representante legal.';
 }
 return errors;
}
