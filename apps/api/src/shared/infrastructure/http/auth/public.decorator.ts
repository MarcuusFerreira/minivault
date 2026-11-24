import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'minivault:public';
/** Opens a route to anonymous callers. Every other route requires authentication. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
