
import { z } from 'zod';

export const elderlySchema = z.object({
  name: z.string().min(2, '이름은 2글자 이상이어야 합니다.').max(50, '이름은 50글자 이하여야 합니다.'),
  age: z.number()
    .min(50, '나이는 50세 이상이어야 합니다.')
    .max(120, '나이는 120세 이하여야 합니다.')
    .positive('나이는 양수여야 합니다.'),
  phone_number: z.string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678).'),
  address: z.string().optional(),
  guardian_contact: z.string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678).'),
  notes: z.string().max(500, '특이사항은 500자 이하여야 합니다.').optional(),
});

export type ElderlyFormData = z.infer<typeof elderlySchema>;
