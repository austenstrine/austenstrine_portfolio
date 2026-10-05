import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, isObservable } from 'rxjs';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const result = super.canActivate(context);

    if(typeof result === 'boolean') {
      return result;
    }

    if(isObservable(result)) {
      return new Observable<boolean>((subscriber) => {
        result.subscribe({
          next: (value) => subscriber.next(Boolean(value)),
          error: () => {
            subscriber.next(true);
            subscriber.complete();
          },
          complete: () => subscriber.complete(),
        });
      });
    }

    return result.catch(() => true);
  }

  handleRequest<TUser>(error: Error | null, user: TUser): TUser | undefined {
    if(error || !user) {
      return undefined;
    }
    return user;
  }
}
