import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';

@Catch(HttpException)
export class RpcHttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost): Observable<never> | void {
    if (host.getType() === 'rpc') {
      return throwError(() => exception.getResponse());
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
