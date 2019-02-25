'use strinct'

const { of } = require('rxjs');
const { map } = require('rxjs/operators');
const { CustomError, DefaultError } = require('./customError');

const buildSuccessResponse$ = (rawRespponse) => {
    return of(rawRespponse).pipe(
        map(resp => {
            return {
                data: resp,
                result: {
                    code: 200
                }
            };
        })
    );
};

const buildErrorResponse$ = (errCode, rawRespponse) => {
    return of(rawRespponse).pipe(
        map(resp => {
            return {
                data: resp,
                result: {
                    code: errCode
                }
            };
        })
    );
};

const handleError$ = (err) => {
    console.log('handleError => ', err);
    return of(err).pipe(
        map(err => {
            const exception = { data: null, result: {} };
            const isCustomError = err instanceof CustomError;
            if (!isCustomError) {
                err = new DefaultError(err);
            }else{
                //This kind of errors must restart the backend due that the keycloak token has been invalidated
                if(err.code === 3) {
                    process.exit(1);
                }
            }
            exception.result = {
                code: err.code,
                error: { ...err.getContent() }
            };
            return exception;
        })
    );
}

module.exports = {
    buildSuccessResponse$, 
    handleError$,
    buildErrorResponse$
}