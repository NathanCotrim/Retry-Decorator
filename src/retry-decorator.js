// Retry Decorator Implementation =============================================
const { failWhen } = require('./helpers')

    // Helper 
const delay = time =>
    new Promise(resolve =>
        setTimeout(resolve, time)
    )

const calculateBackoff = ({
    minDelay,
    maxDelay,
    factor
}, attempt) => {
    const attemptBackoff = minDelay * factor ** attempt
    const backoff = Math.min
    (attemptBackoff, maxDelay)

    console.log('backoff', backoff);
    return backoff
}

    // Helper
const shouldHalt = (retries, attempt) =>
  attempt >= retries

    // Helper
const invokeAction = (config, action, args, attempt) =>
  action(...args)
    .catch(err =>
      shouldHalt(config.retries, attempt)
        ? Promise.reject(err)
            : delay(calculateBackoff(config, attempt))
                .then(() => invokeAction(config, action, args, attempt + 1))
    )

    // Decorator
const retry = (
  config,
  action
) => (...args) =>
  invokeAction(config, action, args, 0)


// Executing ==================================================================
const maybeWillWork = retry(
    {
        retries: 5,
        maxDelay: 500,
        minDelay: 100,
        factor: 2
    },
  failWhen(.5)
)

console.log('Starting')
maybeWillWork()
  .then(console.log)
  .catch(console.error)