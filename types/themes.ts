import { z } from 'zod';

export const ThemeScopeTypeEnum = z.enum(['GLOBAL', 'SEASON', 'TOURNAMENT', 'ORGANIZATION', 'TEAM']);

const JsonStringMap = z.record(z.string(), z.string());

export const CreateThemeSchema = z
  .object({
    code: z.string().min(3).max(50),
    name: z.string().min(2).max(100),
    scopeType: ThemeScopeTypeEnum,
    scopeId: z.string().uuid().optional(),
    colors: JsonStringMap.default({}),
    typography: JsonStringMap.default({}),
    assets: JsonStringMap.default({}),
    customCssVars: JsonStringMap.default({}),
    priority: z.number().int().default(0),
    isActive: z.boolean().default(true),
    activeFrom: z.string().datetime().optional(),
    activeUntil: z.string().datetime().nullable().optional(),
  })
  .refine((data) => (data.scopeType === 'GLOBAL' ? !data.scopeId : !!data.scopeId), {
    message: 'scope_type = GLOBAL ต้องไม่มี scopeId ส่วน scope_type อื่นต้องระบุ scopeId เสมอ',
    path: ['scopeId'],
  });

export const UpdateThemeSchema = z
  .object({
    colors: JsonStringMap.optional(),
    typography: JsonStringMap.optional(),
    assets: JsonStringMap.optional(),
    customCssVars: JsonStringMap.optional(),
    isActive: z.boolean().optional(),
    activeFrom: z.string().datetime().optional(),
    activeUntil: z.string().datetime().nullable().optional(),
    priority: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'ต้องระบุอย่างน้อย 1 ฟิลด์ที่ต้องการอัปเดต' });

export type CreateThemeInput = z.infer<typeof CreateThemeSchema>;
export type UpdateThemeInput = z.infer<typeof UpdateThemeSchema>;

export interface BrandThemeRow {
  id: string;
  code: string;
  name: string;
  scope_type: string;
  scope_id: string | null;
  colors: Record<string, string>;
  typography: Record<string, string>;
  assets: Record<string, string>;
  custom_css_vars: Record<string, string>;
  priority: number;
  is_active: boolean;
  active_from: string;
  active_until: string | null;
}
