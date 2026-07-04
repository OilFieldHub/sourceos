import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from './types';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    return ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user;
  },
);
